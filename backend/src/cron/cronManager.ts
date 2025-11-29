import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from "../services/mailer";

const prisma = new PrismaClient();

// Enhanced task tracking with status
interface CronTaskInfo {
  task: cron.ScheduledTask;
  schedule: string;
  running: boolean;
  lastRun?: Date;
  description: string;
}

// FIXED: Proper singleton with type safety and memory leak prevention
const getGlobalScheduledTasks = (): Map<string, CronTaskInfo> => {
  const globalKey = '__cron_scheduled_tasks__';
  
  if (!(globalThis as any)[globalKey]) {
    (globalThis as any)[globalKey] = new Map();
    
    // Cleanup on process exit
    process.on('exit', () => {
      const tasks = (globalThis as any)[globalKey] as Map<string, CronTaskInfo>;
      if (tasks) {
        tasks.forEach((taskInfo) => {
          try {
            taskInfo?.task?.stop();
          } catch (err) {
            // Silent cleanup
          }
        });
        tasks.clear();
      }
    });
  }
  
  return (globalThis as any)[globalKey];
};

const scheduledTasks = getGlobalScheduledTasks();

require('dotenv').config();

/**
 * Load and start all cron jobs based on database settings
 */
export async function loadAllCronJobs() {
  console.log('⏰ Loading all cron jobs from settings...');

  // FIXED: Use the improved stop function
  await stopAllCronJobs();

  // Get all cron-related settings
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: [
          'cronEnabled',
          'cronSchedule',
          'cronCutoffHours',
          'subscriptionCronEnabled',
          'subscriptionCronScheduleExpire',
          'subscriptionCronScheduleReminder',
          'deviceCronEnabled',
          'deviceCronSchedule',
          'reportCronEnabled',
          'reportCronScheduleDaily',
          'reportCronScheduleWeekly',
          'emailCronEnabled',
          'emailCronSchedule',
          'maintenanceCronEnabled',
          'maintenanceCronSchedule',
          'healthCronEnabled',
          'healthCronSchedule'
        ]
      }
    }
  });

  const getSetting = (key: string, defaultValue: string) => 
    settings.find(s => s.key === key)?.value ?? defaultValue;

  // Define all cron jobs with their configurations
  const cronJobConfigs = [
    {
      name: 'paymentCleanup',
      enabled: getSetting('cronEnabled', 'true') === 'true',
      schedule: getSetting('cronSchedule', '0 * * * *'),
      description: 'Clean up expired PENDING payments',
      execute: async () => {
        const cutoffHours = parseInt(getSetting('cronCutoffHours', '24'), 10);
        const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);
        const result = await prisma.payment.updateMany({
          where: { status: 'PENDING', createdAt: { lt: cutoff } },
          data: { status: 'FAILED' },
        });
        console.log(`✅ Marked ${result.count} payments as FAILED at ${new Date().toISOString()}`);
      }
    },
    {
      name: 'subscriptionExpire',
      enabled: getSetting('subscriptionCronEnabled', 'true') === 'true',
      schedule: getSetting('subscriptionCronScheduleExpire', '0 9 * * *'),
      description: 'Deactivate expired subscriptions',
      execute: async () => {
        console.log('🔍 Running daily subscription check...');
        await deactivateExpiredSubscriptions();
      }
    },
    {
      name: 'subscriptionReminder',
      enabled: getSetting('subscriptionCronEnabled', 'true') === 'true',
      schedule: getSetting('subscriptionCronScheduleReminder', '0 9 * * *'),
      description: 'Send subscription expiry reminders',
      execute: async () => {
        console.log('📧 Running subscription reminder check...');
        await checkExpiringSubscriptions();
      }
    },
    {
      name: 'maintenance',
      enabled: getSetting('maintenanceCronEnabled', 'true') === 'true',
      schedule: getSetting('maintenanceCronSchedule', '0 * * * *'),
      description: 'Cleanup old payment records',
      execute: async () => {
        console.log('🧹 Running hourly cleanup...');
        await cleanupOldPayments();
      }
    },
    {
      name: 'weeklyStats',
      enabled: getSetting('reportCronEnabled', 'true') === 'true',
      schedule: getSetting('reportCronScheduleWeekly', '0 0 * * 0'),
      description: 'Update system statistics',
      execute: async () => {
        console.log('📊 Running weekly statistics update...');
        await updateSystemStatistics();
      }
    }
  ];

  // Create cron jobs
  let jobsCreated = 0;
  
  for (const config of cronJobConfigs) {
    if (!config.enabled) {
      console.log(`⏰ Skipping disabled cron job: ${config.name}`);
      continue;
    }

    // FIXED: Always remove existing job with this name first
    const existingTask = scheduledTasks.get(config.name);
    if (existingTask) {
      console.log(`🔄 Replacing existing cron job: ${config.name}`);
      try {
        existingTask.task.stop();
      } catch (err) {
        console.warn(`⚠️ Could not stop existing job ${config.name}:`, err);
      }
      scheduledTasks.delete(config.name);
    }

    try {
      // Validate cron schedule
      if (!cron.validate(config.schedule)) {
        console.error(`❌ Invalid cron schedule for ${config.name}: ${config.schedule}`);
        continue;
      }

      const task = cron.schedule(config.schedule, async () => {
        try {
          const taskInfo = scheduledTasks.get(config.name);
          if (taskInfo) {
            taskInfo.lastRun = new Date();
          }
          await config.execute();
        } catch (err) {
          console.error(`❌ ${config.name} cron error:`, err);
        }
      });

      scheduledTasks.set(config.name, {
        task,
        schedule: config.schedule,
        running: true,
        description: config.description
      });

      jobsCreated++;
      console.log(`✅ ${config.description} cron started: ${config.schedule}`);
    } catch (error) {
      console.error(`❌ Failed to create cron job ${config.name}:`, error);
    }
  }

  console.log(`✅ All cron jobs loaded. Created: ${jobsCreated}, Total active: ${scheduledTasks.size}`);
}

/**
 * Stop all cron jobs - IMPROVED VERSION
 */
export function stopAllCronJobs(): Promise<void> {
  return new Promise((resolve) => {
    console.log("🛑 Stopping all cron jobs...");
    
    let stoppedCount = 0;
    let totalTasks = 0;
    
    // FIXED: Create a copy of keys to avoid modification during iteration
    const taskNames = Array.from(scheduledTasks.keys());
    totalTasks = taskNames.length;
    
    if (totalTasks === 0) {
      console.log("✅ No cron jobs to stop");
      resolve();
      return;
    }

    taskNames.forEach((name) => {
      try {
        const taskInfo = scheduledTasks.get(name);
        
        // FIXED: Better validation of task object
        if (taskInfo && taskInfo.task && typeof taskInfo.task.stop === 'function') {
          taskInfo.task.stop();
          taskInfo.running = false;
          stoppedCount++;
          console.log(`✅ Stopped cron job: ${name}`);
        } else {
          console.warn(`⚠️ Invalid task info for "${name}", removing from registry`);
        }
        
        // Always remove from map regardless of stop success
        scheduledTasks.delete(name);
        
      } catch (err) {
        console.error(`❌ Error stopping cron job "${name}":`, err);
        // Still remove from map even if stop failed
        scheduledTasks.delete(name);
      }
    });

    console.log(`🛑 Stopped ${stoppedCount}/${totalTasks} cron jobs`);
    resolve();
  });
}

/**
 * Get status of all cron jobs - IMPROVED
 */
export function getCronJobsStatus() {
  const status: Record<string, { 
    schedule: string; 
    running: boolean; 
    lastRun?: string;
    description: string;
    valid: boolean;
  }> = {};
  
  scheduledTasks.forEach((taskInfo, name) => {
    const isValid = !!(taskInfo && taskInfo.task && typeof taskInfo.task.stop === 'function');
    
    status[name] = {
      schedule: taskInfo.schedule,
      running: isValid && taskInfo.running,
      lastRun: taskInfo.lastRun?.toISOString(),
      description: taskInfo.description,
      valid: isValid
    };
  });

  return status;
}

/**
 * Debug function to inspect cron jobs
 */
export function debugCronJobs() {
  console.log('🔍 Cron Jobs Debug Info:');
  console.log(`Total jobs in registry: ${scheduledTasks.size}`);
  
  scheduledTasks.forEach((taskInfo, name) => {
    console.log(`Job: ${name}`);
    console.log(`  Key Type: ${typeof name}`);
    console.log(`  Key Value: ${name}`);
    console.log(`  Has task: ${!!taskInfo.task}`);
    console.log(`  Task type: ${typeof taskInfo.task}`);
    console.log(`  Has stop function: ${!!(taskInfo.task && typeof taskInfo.task.stop === 'function')}`);
    console.log(`  Running: ${taskInfo.running}`);
    console.log(`  Description: ${taskInfo.description}`);
    console.log('---');
  });
}

/**
 * Clean up corrupted jobs
 */
export function cleanupCorruptedJobs(): number {
  let cleanedCount = 0;
  const corruptedKeys: string[] = [];
  
  scheduledTasks.forEach((taskInfo, key) => {
    // Check if key looks like a UUID (corrupted)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    const hasValidTask = taskInfo && taskInfo.task && typeof taskInfo.task.stop === 'function';
    
    if (isUUID || !hasValidTask) {
      corruptedKeys.push(key);
    }
  });
  
  corruptedKeys.forEach(key => {
    try {
      const taskInfo = scheduledTasks.get(key);
      if (taskInfo?.task) {
        taskInfo.task.stop();
      }
    } catch (err) {
      // Ignore errors during cleanup
    } finally {
      scheduledTasks.delete(key);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} corrupted cron jobs`);
  }
  
  return cleanedCount;
}

// Rest of your functions (deactivateExpiredSubscriptions, checkExpiringSubscriptions, etc.) remain the same...
/**
 * Manually run a specific cron job
 */
export async function runCronJobManually(jobName: string) {
  try {
    console.log(`🔧 Manually triggering cron job: ${jobName}`);
    
    switch (jobName) {
      case 'paymentCleanup':
        // Execute payment cleanup logic
        const settings = await prisma.settings.findMany({
          where: { key: 'cronCutoffHours' }
        });
        const cutoffHours = parseInt(settings.find(s => s.key === 'cronCutoffHours')?.value || '24', 10);
        const now = new Date();
        const cutoff = new Date(now.getTime() - cutoffHours * 60 * 60 * 1000);
        const result = await prisma.payment.updateMany({
          where: { status: 'PENDING', createdAt: { lt: cutoff } },
          data: { status: 'FAILED' },
        });
        
        // Update last run time
        const taskInfo = scheduledTasks.get('paymentCleanup');
        if (taskInfo) {
          taskInfo.lastRun = new Date();
        }
        
        console.log(`✅ Manually marked ${result.count} payments as FAILED`);
        return { success: true, message: `Marked ${result.count} payments as FAILED` };

      case 'subscriptionExpire':
        const expiredCount = await deactivateExpiredSubscriptions();
        
        // Update last run time
        const expireTaskInfo = scheduledTasks.get('subscriptionExpire');
        if (expireTaskInfo) {
          expireTaskInfo.lastRun = new Date();
        }
        
        return { success: true, message: `Deactivated ${expiredCount} expired subscriptions` };

      case 'subscriptionReminder':
        await checkExpiringSubscriptions();
        
        // Update last run time
        const reminderTaskInfo = scheduledTasks.get('subscriptionReminder');
        if (reminderTaskInfo) {
          reminderTaskInfo.lastRun = new Date();
        }
        
        return { success: true, message: 'Subscription reminders processed' };

      case 'maintenance':
        await cleanupOldPayments();
        
        // Update last run time
        const maintenanceTaskInfo = scheduledTasks.get('maintenance');
        if (maintenanceTaskInfo) {
          maintenanceTaskInfo.lastRun = new Date();
        }
        
        return { success: true, message: 'Maintenance cleanup completed' };

      case 'weeklyStats':
        await updateSystemStatistics();
        
        // Update last run time
        const statsTaskInfo = scheduledTasks.get('weeklyStats');
        if (statsTaskInfo) {
          statsTaskInfo.lastRun = new Date();
        }
        
        return { success: true, message: 'System statistics updated' };

      default:
        return { success: false, message: `Unknown job: ${jobName}` };
    }
  } catch (error) {
    console.error(`❌ Error manually running cron job ${jobName}:`, error);
    return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
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

    return expiringSubscriptions.length;
  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
    return 0;
  }
}

/**
 * Deactivate expired subscriptions
 */
async function deactivateExpiredSubscriptions(): Promise<number> {
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

    return expiredSubscriptions.count;
  } catch (error) {
    console.error('❌ Error deactivating expired subscriptions:', error);
    return 0;
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
        
        <p>Best regards,<br>Traccar Subscription Team</p>
      </div>
    `;

   

await sendEmail({
  from: process.env.EMAIL_FROM || "noreply@.com",
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

    return deletedPayments.count;
  } catch (error) {
    console.error('❌ Error cleaning up old payments:', error);
    return 0;
  }
}

/**
 * Update system statistics (for admin dashboard)
 */
export async function updateSystemStatistics() {
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
    return stats;

  } catch (error) {
    console.error('❌ Error updating system statistics:', error);
    return null;
  }
}

/**
 * Send test email (for admin testing)
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    await sendEmail({
      to,
      subject: "Test Email - Enutrac",
      html: `
        <h2>Test Email</h2>
        <p>If you received this, the mail system is working.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    });
    return true;
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return false;
  }
}
