import { Worker, Queue, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import { Resend } from 'resend';
import { prisma } from '@saas/db';

const REDIS_URL = process.env.REDIS_URL || '';
let connection: Redis | null = null;

(async () => {
  try {
    if (REDIS_URL) {
      connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true, retryStrategy: () => null });
      await connection.connect();
    }
  } catch { console.log('Job worker: Redis unavailable, running in no-op mode'); }
})();

let worker: Worker | null = null;

if (connection) {
  const scheduler = new QueueScheduler('notifications', { connection });
  worker = new Worker(
    'notifications',
    async (job) => {
      const { notificationId, channel, to, subject, body } = job.data as {
        notificationId: string;
        channel: string;
        to: string;
        subject: string;
        body: string;
      };

      console.log(`Processing notification ${notificationId} via ${channel} to ${to}`);

      try {
        if (channel === 'email') {
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            const resend = new Resend(resendKey);
            const result = await resend.emails.send({
              from: process.env.FROM_EMAIL || 'noreply@pulsesaas.com',
              to,
              subject,
              html: body,
            });
            if (result.error) throw result.error;
          } else {
            console.log(`[SIMULATED] Email sent to ${to}: ${subject}`);
          }
        }

        try { await prisma.notification.update({ where: { id: notificationId }, data: { status: 'sent', sentAt: new Date() } }); } catch {}
        console.log(`Sent notification ${notificationId}`);
      } catch (err) {
        console.error(`Failed notification ${notificationId}:`, err);
        try { await prisma.notification.update({ where: { id: notificationId }, data: { status: 'failed' } }); } catch {}
        if (job.attemptsMade < 3) throw err;
      }
    },
    {
      connection,
      concurrency: 10,
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5000 },
    }
  );

  console.log('Job worker started — processing BullMQ notifications queue');
} else {
  console.log('Job worker running in no-op mode — no Redis/queue available');
}

process.on('SIGTERM', async () => {
  await worker?.close();
  await connection?.quit();
});
