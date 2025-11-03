import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let scheduledTask: cron.ScheduledTask | null = null;

export async function loadCronJob() {
  const settings = await prisma.settings.findMany({
  where: { key: { in: ['cronEnabled', 'cronSchedule', 'cronCutoffHours'] } },
});

const get = (key: string, def: string) =>
  settings.find((s) => s.key === key)?.value ?? def;

const enabled = get('cronEnabled', 'true') === 'true';
const schedule = get('cronSchedule', '0 * * * *');
const cutoffHours = parseInt(get('cronCutoffHours', '24'), 10);

  console.log(`🔹 Cron settings loaded from DB: enabled=${enabled}, schedule="${schedule}", cutoffHours=${cutoffHours}`);

  // Stop previous task if running
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('🛑 Previous cron job stopped');
  }

  if (!enabled) {
    console.log('⚙️ Cron jobs are disabled in settings');
    return;
  }

  console.log(`🕒 Starting cron job on schedule "${schedule}"`);

  scheduledTask = cron.schedule(schedule, async () => {
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - cutoffHours * 60 * 60 * 1000);

      const result = await prisma.payment.updateMany({
        where: { status: 'PENDING', createdAt: { lt: cutoff } },
        data: { status: 'FAILED' },
      });

      console.log(`✅ Marked ${result.count} payments as FAILED at ${now.toISOString()}`);
    } catch (err) {
      console.error('❌ Cron job error:', err);
    }
  });
}
