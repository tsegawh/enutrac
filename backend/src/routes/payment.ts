import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { 
  createTelebirrPayment, 
  verifyTelebirrCallback,
  TelebirrPaymentRequest 
} from '../services/payment';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Telebirr Payment Flow:
 * 1. Frontend sends payment request with planId
 * 2. Backend creates payment record and calls Telebirr API
 * 3. Telebirr returns prepay_id and checkout URL
 * 4. Frontend redirects user to Telebirr checkout
 * 5. User completes payment on Telebirr
 * 6. Telebirr calls our callback endpoint
 * 7. We verify signature and update subscription
 */

// Initiate payment
router.post('/pay', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { planId } = req.body;
    const userId = req.user!.id;

    if (!planId) {
      throw createError('Plan ID is required', 400);
    }

    // Get subscription plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw createError('Subscription plan not found', 404);
    }

    if (plan.price === 0) {
      throw createError('Cannot process payment for free plan', 400);
    }

    


// Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${userId.slice(-6)}`;
    // Create payment record
    const payment = await prisma.payment.create({
  data: {
    userId,
    planId: plan.id,
    orderId,
//subscriptionId: subscription.id,
    amount: plan.price,
    status: 'PENDING',
  }
});


    // Prepare Telebirr payment request
    const paymentRequest: TelebirrPaymentRequest = {
      orderId,
      amount: plan.price,
      userId,
      planId,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
    };

    // Call Telebirr API
    const telebirrResponse = await createTelebirrPayment(paymentRequest);

    // Update payment with prepay_id
    await prisma.payment.update({
      where: { id: payment.id },
      data: { prepayId: telebirrResponse.prepay_id }
    });

    res.json({
      success: true,
      orderId,
      checkoutUrl: telebirrResponse.checkout_url,
      prepayId: telebirrResponse.prepay_id,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Redirect URL handler
 */
router.get("/redirect", async (req, res) => {
  try {
    const { merch_order_id, trade_status } = req.query;

    if (!merch_order_id || !trade_status) {
      return res.status(400).json({ success: false, message: "Missing params" });
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId: merch_order_id as string },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    // Step 2: Find the user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: payment.userId },
      include: { plan: true },
    });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const isSuccess = trade_status === "TRADE_SUCCESS";

    // Optional: fetch days remaining
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Redirect or respond JSON for frontend SPA
    return res.json({
      success: isSuccess,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        daysRemaining,
      },
    });
  } catch (err) {
    console.error("Redirect error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Telebirr payment callback
router.post('/callback', async (req, res, next) => {
  try {
    console.log('📞 Telebirr callback received:', req.body);

    //const { orderId, trade_status, trans_id: transaction_id, total_amount } = req.body;
  const { merch_order_id, trade_status, trans_id, total_amount } = req.body;
const orderId = merch_order_id;   // Use Telebirr’s field
const transaction_id = trans_id;

console.log("Callback body:", req.body);
console.log("Extracted orderId:", orderId);
    // Verify Telebirr signature
    /** const isValid = await verifyTelebirrCallback(req.body);
   if (!isValid) {
      console.error('❌ Invalid Telebirr signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
*/


if (!orderId) {
  console.error("❌ No orderId found in callback payload");
  return res.status(400).json({ error: "Missing orderId" });
}

    // Find payment by orderId
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { user: true },
    });

    if (!payment) {
      console.error('❌ Payment not found:', orderId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    const paymentStatus =
trade_status === "Completed" ? "COMPLETED" : "FAILED";

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatus, telebirrTxId: transaction_id }
    });

    // Only update subscription if payment succeeded
    if (trade_status === 'Completed') {
      console.log('✅ Payment successful, updating subscription');

      // Find user's current subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId: payment.userId },
        include: { plan: true }
      });

      if (!subscription) {
        console.error('❌ No subscription found for user:', payment.userId);
        return res.status(404).json({ error: 'No subscription found' });
      }

      // Find the plan matching the payment amount
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { price: parseFloat(total_amount) }
      });

      if (!plan) {
        console.error('❌ No subscription plan matches payment amount:', total_amount);
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      // Calculate new end date
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.durationDays);

      // Update subscription
      await prisma.subscription.update({
        where: { userId: payment.userId },
        data: {
          planId: plan.id,
          status: 'ACTIVE',
          endDate
        }
      });

      console.log('✅ Subscription updated successfully');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Callback error:', error);
    next(error);
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/status/:orderId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { orderId } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { 
        orderId,
        userId: req.user!.id 
      }
    });

    if (!payment) {
      throw createError('Payment not found', 404);
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

export default router;