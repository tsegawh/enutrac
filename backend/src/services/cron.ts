import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

/**
 * Background Jobs Service
 * 
 * Handles:
 * - Daily subscription expiry checks
 * - Email reminders for expiring subscriptions
 * - Automatic subscription deactivation
 * - Cleanup tasks
 */

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Start all background jobs
 */
export function startCronJobs() {
  console.log('⏰ Starting background jobs...');

  // Daily subscription check at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔍 Running daily subscription check...');
    await checkExpiringSubscriptions();
    await deactivateExpiredSubscriptions();
  });

  // Hourly cleanup tasks
  cron.schedule('0 * * * *', async () => {
    console.log('🧹 Running hourly cleanup...');
    await cleanupOldPayments();
  });

  // Weekly statistics update (Sundays at midnight)
  cron.schedule('0 0 * * 0', async () => {
    console.log('📊 Running weekly statistics update...');
    await updateSystemStatistics();
  });

  console.log('✅ Background jobs started successfully');
}

/**
 * Check for subscriptions expiring in the next 7 days and send reminders
 */
async function checkExpiringSubscriptions() {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: sevenDaysFromNow,
          gte: new Date(), // Not already expired
        },
      },
      include: {
        user: true,
        plan: true,
      },
    });

    console.log(`📧 Found ${expiringSubscriptions.length} expiring subscriptions`);

    for (const subscription of expiringSubscriptions) {
      await sendExpiryReminderEmail(subscription);
    }

  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
  }
}

/**
 * Deactivate expired subscriptions
 */
async function deactivateExpiredSubscriptions() {
  try {
    const now = new Date();

    const expiredSubscriptions = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (expiredSubscriptions.count > 0) {
      console.log(`⏰ Deactivated ${expiredSubscriptions.count} expired subscriptions`);
    }

  } catch (error) {
    console.error('❌ Error deactivating expired subscriptions:', error);
  }
}

/**
 * Send expiry reminder email
 */
async function sendExpiryReminderEmail(subscription: any) {
  try {
    const daysUntilExpiry = Math.ceil(
      (subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Subscription Expiry Reminder</h2>
        
        <p>Dear ${subscription.user.name},</p>
        
        <p>Your <strong>${subscription.plan.name}</strong> subscription will expire in <strong>${daysUntilExpiry} day(s)</strong>.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Subscription Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Plan:</strong> ${subscription.plan.name}</li>
            <li><strong>Device Limit:</strong> ${subscription.plan.deviceLimit} devices</li>
            <li><strong>Expiry Date:</strong> ${subscription.endDate.toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>To continue using our GPS tracking service without interruption, please upgrade your subscription before it expires.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Upgrade Now
          </a>
        </div>
        
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>Traccar Subscription Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@traccarsubscriptions.com',
      to: subscription.user.email,
      subject: `Subscription Expiry Reminder - ${daysUntilExpiry} day(s) remaining`,
      html: emailHtml,
    });

    console.log(`📧 Reminder email sent to ${subscription.user.email}`);

  } catch (error) {
    console.error(`❌ Error sending reminder email to ${subscription.user.email}:`, error);
  }
}

/**
 * Cleanup old payment records (keep last 6 months)
 */
async function cleanupOldPayments() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const deletedPayments = await prisma.payment.deleteMany({
      where: {
        createdAt: {
          lt: sixMonthsAgo,
        },
        status: {
          in: ['FAILED', 'CANCELLED'],
        },
      },
    });

    if (deletedPayments.count > 0) {
      console.log(`🧹 Cleaned up ${deletedPayments.count} old payment records`);
    }

  } catch (error) {
    console.error('❌ Error cleaning up old payments:', error);
  }
}

/**
 * Update system statistics (for admin dashboard)
 */
async function updateSystemStatistics() {
  try {
    const stats = {
      totalUsers: await prisma.user.count(),
      activeSubscriptions: await prisma.subscription.count({
        where: { status: 'ACTIVE' }
      }),
      totalDevices: await prisma.device.count({
        where: { isActive: true }
      }),
      totalRevenue: await prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
    };

    // Store stats in settings table for quick access
    await prisma.settings.upsert({
      where: { key: 'SYSTEM_STATS' },
      update: { value: JSON.stringify(stats) },
      create: { key: 'SYSTEM_STATS', value: JSON.stringify(stats) },
    });

    console.log('📊 System statistics updated:', stats);

  } catch (error) {
    console.error('❌ Error updating system statistics:', error);
  }
}

/**
 * Send test email (for admin testing)
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@traccarsubscriptions.com',
      to,
      subject: 'Test Email - Traccar Subscription System',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from the Traccar Subscription System.</p>
        <p>If you received this email, the email configuration is working correctly.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
    });

    return true;
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return false;
  }
}