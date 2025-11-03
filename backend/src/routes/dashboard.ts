import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { HttpStatusCode } from 'axios';
import { STATUS_CODES } from 'http';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
     const authReq = req as AuthRequest;
    if (!authReq.user) return next(createError('Unauthorized', 401 ));

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      include: {
        subscription: { include: { plan: true } },
        devices: true,
      },
    });

    if (!user) return next(createError( 'User not found',401));

    // Prepare user stats
    const userStats = {
      devicesUsed: user.devices.length,
      deviceLimit: user.subscription?.plan?.deviceLimit || 0,
      utilizationPercentage: user.subscription?.plan
        ? Math.round((user.devices.length / user.subscription.plan.deviceLimit) * 100)
        : 0,
      canAddDevice: user.subscription?.plan
        ? user.devices.length < user.subscription.plan.deviceLimit
        : false,
    };

    // Prepare admin stats only if user is ADMIN
    let adminStats = null;
    if (authReq.user.role === 'ADMIN') {
      const [usersCount, devicesCount, subscriptionsCount] = await Promise.all([
        prisma.user.count(),
        prisma.device.count(),
        prisma.subscription.count(),
      ]);
      adminStats = {
        users: usersCount,
        devices: devicesCount,
        subscriptions: subscriptionsCount,
      };
    }

    // Return combined response
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
        devices: user.devices,
      },
      usage: userStats,
      stats: adminStats, // only filled for admin
    });
  } catch (err) {
    next(err);
  }
});

export default router;
