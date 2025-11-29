import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import PDFDocument from 'pdfkit';
import { InvoiceGenerator } from '../services/invoiceGenerator';
import { sendInvoiceToUser } from '../services/invoiceMailer'; 
import { generateInvoicePDF } from "../services/invoiceTemplete";

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest; // cast once
  const id = authReq.user?.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { name, email } = req.body;

    if (!name && !email) {
      throw createError('At least one field (name or email) is required', 400);
    }

    // If email is being updated, check if it's already taken
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { 
          email,
          NOT: { id: authReq.user!.id }
        }
      });

      if (existingUser) {
        throw createError('Email already in use', 409);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: authReq.user!.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    res.json({ 
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully' 
    });

  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw createError('New password must be at least 6 characters long', 400);
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: authReq.user!.id }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: authReq.user!.id },
      data: { password: hashedNewPassword }
    });

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });

  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    // Get device count
    const deviceCount = await prisma.device.count({
      where: { 
        userId,
        isActive: true 
      }
    });

    // Get payment count
    const paymentCount = await prisma.payment.count({
      where: { userId }
    });

    // Get successful payments total
    const successfulPayments = await prisma.payment.aggregate({
      where: { 
        userId,
        status: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: true
    });

    // Get subscription info
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    const stats = {
      deviceCount,
      totalPayments: paymentCount,
      successfulPayments: successfulPayments._count || 0,
      totalSpent: successfulPayments._sum.amount || 0,
      currentPlan: subscription?.plan.name || 'No Plan',
      subscriptionStatus: subscription?.status || 'INACTIVE',
      memberSince: authReq.user!.createdAt,
    };

    res.json({ stats });

  } catch (error) {
    next(error);
  }
});

// Get user order reports
router.get('/orders', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { page = 1, limit = 20, status, orderType, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: authReq.user!.id };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    
    if (search) {
      where.OR = [
        { orderId: { contains: search as string } },
        { invoiceNumber: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const [orders, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },

        include: {

          plan: { select: { id: true, name: true, deviceLimit: true, durationDays: true } }
        }

      }),
      prisma.payment.count({ where })
    ]);

    // Calculate summary statistics
    const summary = await prisma.payment.aggregate({
      where: { userId: authReq.user!.id },
      _sum: { amount: true },
      _count: {
        _all: true
      }
    });

    const completedOrders = await prisma.payment.count({
      where: { 
        userId: authReq.user!.id,
        status: 'COMPLETED' 
      }
    });

    const failedOrders = await prisma.payment.count({
      where: { 
        userId: authReq.user!.id,
        status: 'FAILED' 
      }
    });

    res.json({ 
      orders,
      summary: {
        totalOrders: summary._count._all || 0,
        totalAmount: summary._sum.amount || 0,
        completedOrders,
        failedOrders,
        successRate: summary._count._all > 0 ? Math.round((completedOrders / summary._count._all) * 100) : 0
      },
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

// Get order details
router.get('/orders/:orderId', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { orderId } = req.params;

    const order = await prisma.payment.findFirst({
      where: { 
        orderId,
        userId: authReq.user!.id 
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        plan: { select: { id: true, name: true, deviceLimit: true, durationDays: true } }
      }
    });

    if (!order) {
      throw createError('Order not found', 404);
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});
router.get('/orders/:orderId/invoice', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { orderId } = req.params;

    // 1. Fetch the payment with related user & plan
    const payment = await prisma.payment.findFirst({
      where: { orderId, userId: authReq.user!.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, deviceLimit: true, durationDays: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // 2. Create invoice data object
    const invoiceData = InvoiceGenerator.createInvoiceData(
      payment,
      payment.user,
      payment.plan
    );
   // 3. Send email **in background**
    sendInvoiceToUser(invoiceData).catch(err => {
      console.error("Failed to send invoice email:", err);
    });

    // 3. Prepare response headers for PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData); 
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoiceData.invoiceNumber}.pdf`);

   
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const { password } = req.body;


    if (!password) {
      throw createError('Password confirmation is required', 400);
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: authReq.user!.id }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw createError('Password is incorrect', 401);
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: authReq.user!.id }
    });

    res.json({ 
      success: true,
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    next(error);
  }
});

export default router;