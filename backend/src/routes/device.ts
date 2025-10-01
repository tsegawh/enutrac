import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { TraccarService } from '../services/traccar';

const router = express.Router();
const prisma = new PrismaClient();
const traccarService = new TraccarService();

// Get user devices
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const devices = await prisma.device.findMany({
      where: { 
        userId: req.user!.id,
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }
    });

 // Get real-time data from Traccar for each device
    const devicesWithTraccarData = await Promise.all(
      devices.map(async (device) => {
        try {
          const traccarData = await traccarService.getDeviceById(device.traccarId);
          const position = await traccarService.getLatestPosition(device.traccarId);

          return {
            ...device,
            traccarData,
            position,
            isOnline: traccarData?.status === 'online',
          };
        } catch (error) {
          console.error(`Error fetching Traccar data for device ${device.id}:`, error);
          return {
            ...device,
            traccarData: null,
            position: null,
            isOnline: false,
          };
        }
      })
    );

    res.json({ devices: devicesWithTraccarData });
  } catch (error) {
    next(error);
  }
});

// Add new device
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { name, uniqueId } = req.body;

    if (!name || !uniqueId) {
      throw createError('Device name and unique ID are required', 400);
    }

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id },
      include: { plan: true }
    });

    if (!subscription) {
      throw createError('No active subscription found', 404);
    }

    // Check if subscription is active
    if (subscription.status !== 'ACTIVE' || subscription.endDate < new Date()) {
      throw createError('Subscription is not active', 403);
    }

    // Count current devices
    const deviceCount = await prisma.device.count({
      where: { 
        userId: req.user!.id,
        isActive: true 
      }
    });

    if (deviceCount >= subscription.plan.deviceLimit) {
      throw createError(
        `Device limit reached. Your ${subscription.plan.name} plan allows ${subscription.plan.deviceLimit} devices.`,
        403
      );
    }

    // Check if device already exists
    const existingDevice = await prisma.device.findUnique({
      where: { uniqueId }
    });

    if (existingDevice) {
      throw createError('Device with this unique ID already exists', 409);
    }

    // Create device in Traccar first
    const traccarDevice = await traccarService.createDevice({
      name,
      uniqueId,
    });

    // Create device in our database
    const device = await prisma.device.create({
      data: {
        userId: req.user!.id,
        traccarId: traccarDevice.id,
        name,
        uniqueId,
      }
    });

    res.status(201).json({ 
      success: true,
      device,
      message: 'Device added successfully' 
    });

  } catch (error) {
    next(error);
  }
});

// Update device
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Find device
    const device = await prisma.device.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      }
    });

    if (!device) {
      throw createError('Device not found', 404);
    }

    // Update device in Traccar
    await traccarService.updateDevice(device.traccarId, { name });

    // Update device in our database
    const updatedDevice = await prisma.device.update({
      where: { id },
      data: { name }
    });

    res.json({ 
      success: true,
      device: updatedDevice,
      message: 'Device updated successfully' 
    });

  } catch (error) {
    next(error);
  }
});

// Delete device
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Find device
    const device = await prisma.device.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      }
    });

    if (!device) {
      throw createError('Device not found', 404);
    }

    // Delete device from Traccar
    try {
      await traccarService.deleteDevice(device.traccarId);
    } catch (error) {
      console.error('Error deleting device from Traccar:', error);
      // Continue with local deletion even if Traccar deletion fails
    }

    // Soft delete device in our database
    await prisma.device.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ 
      success: true,
      message: 'Device deleted successfully' 
    });

  } catch (error) {
    next(error);
  }
});

// Get device positions/history
router.get('/:id/positions', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    // Find device
    const device = await prisma.device.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      }
    });

    if (!device) {
      throw createError('Device not found', 404);
    }

    // Get positions from Traccar
    const positions = await traccarService.getPositions(
      device.traccarId,
      from as string,
      to as string
    );

    res.json({ positions });

  } catch (error) {
    next(error);
  }
});

// Get device reports
router.get('/:id/reports', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    // Find device
    const device = await prisma.device.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      }
    });

    if (!device) {
      throw createError('Device not found', 404);
    }

    // Get positions from Traccar
    const positions = await traccarService.getPositions(
      device.traccarId,
      from as string,
      to as string,
      1000 // Limit for performance
    );

    // Calculate summary statistics
    let totalDistance = 0;
    let maxSpeed = 0;
    let totalTime = 0;
    let movingTime = 0;

    if (positions.length > 1) {
      for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];

        // Calculate distance between points (Haversine formula)
        const distance = calculateDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        );
        totalDistance += distance;

        // Track max speed
        if (curr.speed > maxSpeed) {
          maxSpeed = curr.speed;
        }

        // Calculate time difference
        const timeDiff = new Date(curr.fixTime).getTime() - new Date(prev.fixTime).getTime();
        totalTime += timeDiff;

        // Count as moving time if speed > 5 km/h
        if (curr.speed > 5) {
          movingTime += timeDiff;
        }
      }
    }

    const summary = {
      totalDistance: Math.round(totalDistance * 100) / 100, // km
      maxSpeed: Math.round(maxSpeed * 100) / 100, // km/h
      averageSpeed: totalTime > 0 ? Math.round((totalDistance / (totalTime / 3600000)) * 100) / 100 : 0,
      totalTime: Math.round(totalTime / 60000), // minutes
      movingTime: Math.round(movingTime / 60000), // minutes
      stoppedTime: Math.round((totalTime - movingTime) / 60000), // minutes
      positionCount: positions.length
    };

    res.json({
      summary,
      positions: positions.slice(0, 500), // Limit positions for performance
      device: {
        id: device.id,
        name: device.name,
        uniqueId: device.uniqueId
      }
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to calculate distance between two GPS points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}


export default router;