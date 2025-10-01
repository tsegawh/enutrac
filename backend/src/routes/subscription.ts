import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Get all subscription plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// Get current user subscription
router.get('/current', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
  where: { userId: req.user!.id, status: 'ACTIVE' },
  include: {
    plan: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      }
    }
  },
  orderBy: { endDate: 'desc' } // latest subscription
});

if (!subscription) {
  // Optionally return null instead of throwing
  return res.json({ subscription: null });
}


    // Check if subscription is expired
    const now = new Date();
    const isExpired = subscription.endDate < now;

    if (isExpired && subscription.status === 'ACTIVE') {
      // Update subscription status to expired
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' }
      });
      subscription.status = 'EXPIRED';
    }

    // Calculate days remaining
    const daysRemaining = Math.max(0, Math.ceil(
      (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    res.json({ 
      subscription: {
        ...subscription,
        daysRemaining,
        isExpired
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get subscription usage stats
router.get('/usage', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id },
      include: { plan: true }
    });

    // If no subscription, create free subscription
    if (!subscription) {
      const freePlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'Free' }
      });

      if (freePlan) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + freePlan.durationDays);

        subscription = await prisma.subscription.create({
          data: {
            userId: req.user!.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            endDate,
          },
          include: { plan: true }
        });
      } else {
        return res.json({ 
          usage: {
            devicesUsed: 0,
            deviceLimit: 0,
            canAddDevice: false,
            utilizationPercentage: 0
          }
        });
      }
    }

    // Count user's devices
    const deviceCount = await prisma.device.count({
      where: { 
        userId: req.user!.id,
        isActive: true 
      }
    });

    const usage = {
      devicesUsed: deviceCount,
      deviceLimit: subscription.plan.deviceLimit,
      canAddDevice: deviceCount < subscription.plan.deviceLimit,
      utilizationPercentage: Math.round((deviceCount / subscription.plan.deviceLimit) * 100)
    };

    res.json({ usage });
  } catch (error) {
    next(error);
  }
});

// Upgrade subscription (initiate payment)
router.post('/upgrade', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      throw createError('Plan ID is required', 400);
    }

    // Get target plan
    const targetPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!targetPlan) {
      throw createError('Subscription plan not found', 404);
    }

    // Get current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id },
      include: { plan: true }
    });

    if (!currentSubscription) {
      throw createError('No current subscription found', 404);
    }

    // Check if it's actually an upgrade
    if (targetPlan.price <= currentSubscription.plan.price) {
      throw createError('Can only upgrade to a higher tier plan', 400);
    }

    // For free plans, upgrade immediately
    if (targetPlan.price === 0) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + targetPlan.durationDays);

      await prisma.subscription.update({
        where: { userId: req.user!.id },
        data: {
          planId: targetPlan.id,
          status: 'ACTIVE',
          endDate,
        }
      });

      return res.json({ 
        success: true, 
        message: 'Subscription upgraded successfully',
        requiresPayment: false 
      });
    }

    // For paid plans, return payment required
    res.json({ 
      success: true,
      requiresPayment: true,
      plan: targetPlan,
      message: 'Payment required for upgrade'
    });

  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id }
    });

    if (!subscription) {
      throw createError('No active subscription found', 404);
    }

    // Update subscription status to cancelled
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED' }
    });

    res.json({ 
      success: true, 
      message: 'Subscription cancelled successfully' 
    });
  } catch (error) {
    next(error);
  }
});

export default router;