import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { TraccarService } from '../services/traccar';
import PDFDocument from 'pdfkit';
import { InvoiceGenerator } from '../services/invoiceGenerator';

import { loadCronJob } from '../cron/expirePendingPayments'; // 
import { sendInvoiceEmail } from '../services/mailer'; // your email file
const router = express.Router();
const prisma = new PrismaClient();
const traccarService = new TraccarService();

// Apply admin middleware to all routes
router.use(authenticateToken,requireAdmin);

// Get dashboard statistics
// Dashboard statistics
router.get('/stats', async (req, res , next) => {
  
  try {
    
    const [
      totalUsers,
      activeSubscriptions,
      totalDevices,
      totalRevenue,
      expiringSubscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.device.count({ where: { isActive: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.subscription.count({ 
        where: { 
          status: 'ACTIVE', 
          endDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } 
        } 
      })
    ]);

    res.json({
      stats: {
        totalUsers,
        activeSubscriptions,
        totalDevices,
        totalRevenue: totalRevenue._sum.amount || 0,
        expiringSubscriptions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all users with subscriptions
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search ? {
      OR: [
        { name: { contains: search as string } },
        { email: { contains: search as string } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          subscription: {
            include: { plan: true }
          },
          _count: {
            select: { devices: true, payments: true }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({ 
      users, 
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all subscriptions
router.get('/subscriptions', async (req, res, next) => {
  try {
    const { status, expiring } = req.query;

    let where: any = {};

    if (status) {
      where.status = status;
    }

    if (expiring === 'true') {
      where.endDate = {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      };
      where.status = 'ACTIVE';
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        plan: true
      },
      orderBy: { endDate: 'asc' }
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});


// GET /api/admin/devices
router.get('/devices', async (req, res, next) => {
  try {
    const { userId } = req.query;

    const where = userId ? { userId: userId as string } : {};

    const devices = await prisma.device.findMany({
      where: {
        ...where,
        isActive: true
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ devices });
  } catch (error) {
    next(error);
  }
});


// Delete device (admin)
router.delete('/devices/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id }
    });

    if (!device) {
      throw createError('Device not found', 404);
    }

    // Delete from Traccar
    try {
      await traccarService.deleteDevice(device.traccarId);
    } catch (error) {
      console.error('Error deleting device from Traccar:', error);
    }

    // Soft delete in database
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

// Get system settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.settings.findMany();
    
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    res.json({ settings: settingsObj });
  } catch (error) {
    next(error);
  }
});

// Update system settings
router.put('/settings', async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      throw createError('Settings object is required', 400);
    }

    // Update each setting
 
    for (const [key, value] of Object.entries(settings)) {
      // Skip functions
      //if (typeof value === 'function') continue;
if (value === undefined || typeof value === 'function') continue;

      let storedValue: string;

      if (typeof value === 'object') {
        // Serialize objects/arrays to JSON
        storedValue = JSON.stringify(value);
      } else {
        // Convert booleans/numbers/strings to string
        storedValue = value.toString();
      }

      await prisma.settings.upsert({
        where: { key },
        update: { value: storedValue },
        create: { key, value: storedValue },
      });
    }

    // Reload cron job after saving
    await loadCronJob();

    res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    next(error);
  }
});
router.get('/cron-settings', async (req, res, next) => {
  try {
    const keys = [
      'cronEnabled', 'cronSchedule', 'cronCutoffHours',
      'subscriptionCronEnabled', 'subscriptionCronScheduleExpire', 'subscriptionCronScheduleReminder',
      'deviceCronEnabled', 'deviceCronSchedule',
      'reportCronEnabled', 'reportCronScheduleDaily', 'reportCronScheduleWeekly',
      'emailCronEnabled', 'emailCronSchedule',
      'maintenanceCronEnabled', 'maintenanceCronSchedule',
      'healthCronEnabled', 'healthCronSchedule'
    ];

    const settings = await prisma.settings.findMany({ where: { key: { in: keys } } });

    const data: Record<string, string> = {};
    settings.forEach(s => data[s.key] = s.value);

    res.json({ success: true, settings: data });
  } catch (err) {
    next(err);
  }
});

// Update cron settings
router.put('/cron-settings', async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') throw new Error('Settings object is required');

    for (const [key, value] of Object.entries(settings)) {
     if (value === undefined || value === null) continue;
      await prisma.settings.upsert({
        where: { key },
        update: { value: value.toString() }, // ensure string
        create: { key, value: value.toString() }
      });
    }

    await loadCronJob(); // reload cron jobs dynamically

    res.json({ success: true, message: 'Cron settings updated successfully' });
  } catch (err) {
    next(err);
  }
});


// Get payment transactions
router.get('/payments', async (req, res, next) => {
  try {
    const { status, userId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

// Send reminder emails for expiring subscriptions
router.post('/send-reminders', async (req, res, next) => {
  try {
    // Get subscriptions expiring in the next 7 days
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          gte: new Date()
        }
      },
      include: {
        user: true,
        plan: true
      }
    });

    // TODO: Implement email sending logic here
   
     for (const sub of expiringSubscriptions) {
      await sendInvoiceEmail(
        sub.user.email,
        'Subscription Expiring Soon',
        `<p>Hi ${sub.user.name},</p>
         <p>Your <strong>${sub.plan.name}</strong> subscription expires on ${sub.endDate.toDateString()}.</p>
         <p>Please renew to continue using our service.</p>`
      );
    }
    res.json({ 
      success: true,
      message: `Reminder emails sent to ${expiringSubscriptions.length} users`,
      count: expiringSubscriptions.length
    });
  } catch (error) {
    next(error);
  }
});

// Test Traccar connection
router.post('/test-traccar', async (req, res, next) => {
  try {
    const traccarService = new TraccarService();
    const isConnected = await traccarService.testConnection();
    
    if (isConnected) {
      const serverInfo = await traccarService.getServerInfo();
      res.json({ 
        success: true, 
        message: 'Traccar connection successful',
        serverInfo 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Failed to connect to Traccar server' 
      });
    }
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Traccar connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
router.get('/devices/:id/positions', authenticateToken, async (req, res, next) => {
  try {
    
    const { id } = req.params;
    const { from, to } = req.query;

    // Find device
    const device = await prisma.device.findFirst({
      where: { 
        id,
        // No userId filter for admins
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


// GET /api/admin/devices/:id/reports
router.get('/devices/:id/reports', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { from, to } = req.query;

    console.log(`Fetching admin reports for device ID: ${id}`);
    console.log(`Authenticated user ID: ${authReq.user!.id}`);

    const device = await prisma.device.findFirst({
      where: { 
        id,
        // No userId filter for admins
      }
    });

    console.log(`Device query result:`, device);

    if (!device) {
      throw createError('Device not found', 404); // Likely line ~341
    }

  // Get positions from Traccar
    const positions = await traccarService.getPositions(
      device.traccarId,
      from as string,
      to as string,
      1000 // Limit for performance
    );

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

        if (curr.speed > maxSpeed) {
          maxSpeed = curr.speed;
        }

        const timeDiff = new Date(curr.fixTime).getTime() - new Date(prev.fixTime).getTime();
        totalTime += timeDiff;

        if (curr.speed > 5) {
          movingTime += timeDiff;
        }
      }
    }

    const summary = {
      totalDistance: Math.round(totalDistance * 100) / 100,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      averageSpeed: totalTime > 0 ? Math.round((totalDistance / (totalTime / 3600000)) * 100) / 100 : 0,
      totalTime: Math.round(totalTime / 60000),
      movingTime: Math.round(movingTime / 60000),
      stoppedTime: Math.round((totalTime - movingTime) / 60000),
      positionCount: positions.length
    };

    res.json({
      summary,
      positions: positions.slice(0, 500),
      device: {
        id: device.id,
        name: device.name,
        uniqueId: device.uniqueId
      }
    });
  } catch (error) {
    console.error(`Error in /admin/devices/:id/reports for ID :`, error);
    next(error);
  }
});

// Get order reports with advanced filtering
router.get('/orders', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      userId, 
      from, 
      to,
      search 
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    if (search) {
      where.OR = [
        { orderId: { contains: search as string } },
        { user: { name: { contains: search as string } } },
        { user: { email: { contains: search as string } } }
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
      plan: { select: { id: true, name: true, deviceLimit: true, durationDays: true } }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    // Calculate summary statistics
    const [totalRevenue, completedOrders, failedOrders, pendingOrders] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } })
    ]);

    const totalStats = await prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true }
    });

    const summary = {
      totalRevenue: totalRevenue._sum.amount || 0,
      completedOrders,
      failedOrders,
      pendingOrders,
      averageOrderValue: totalStats._count._all > 0 ? (totalStats._sum.amount || 0) / totalStats._count._all : 0
    };

    res.json({ 
      orders,
      summary,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});
// admin router (already has authenticateToken & requireAdmin)
router.get('/orders/:orderId/invoice', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Fetch the payment for ANY user
    const payment = await prisma.payment.findFirst({
      where: { orderId },   // ✅ no userId restriction
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, deviceLimit: true, durationDays: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoiceData = InvoiceGenerator.createInvoiceData(
      payment,
      payment.user,
      payment.plan
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice_${invoiceData.invoiceNumber}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ----- PDF HEADER -----
    doc.fontSize(22).text('INVOICE', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice Number: ${invoiceData.invoiceNumber}`);
    doc.text(`Invoice Date: ${invoiceData.createdAt.toDateString()}`);
    doc.text(`Order ID: ${invoiceData.orderId}`).moveDown();

    // ----- CUSTOMER INFO -----
    doc.fontSize(14).text('Billed To:');
    doc.fontSize(12)
      .text(`Name: ${invoiceData.customer.name}`)
      .text(`Email: ${invoiceData.customer.email}`)
      .moveDown();

    // ----- ORDER DETAILS -----
    doc.fontSize(14).text('Order Details:');
    doc.fontSize(12)
      .text(`Description: ${invoiceData.description || 'N/A'}`)
      .text(`Plan: ${invoiceData.plan ? invoiceData.plan.name : 'N/A'}`)
      .text(`Device Limit: ${invoiceData.plan?.deviceLimit || '-'}`)
      .text(`Duration: ${invoiceData.plan?.durationDays || '-'} days`)
      .moveDown();

    // ----- AMOUNT -----
    doc.fontSize(14).text('Payment Summary:');
    doc.fontSize(12)
      .text(`Amount: ${invoiceData.amount} ${invoiceData.currency}`)
      .text(`Status: ${invoiceData.status}`)
      .moveDown();

    doc.text('Thank you for your business!', { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
});


// Define calculateDistance function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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