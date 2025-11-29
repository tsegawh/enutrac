import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Public stats for homepage
router.get('/', async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalDevices = await prisma.device.count({ where: { isActive: true } });

    res.json({
      stats: {
        activeUsers: totalUsers,
        activeDevices: totalDevices,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
