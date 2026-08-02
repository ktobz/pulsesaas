import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { Resend } from 'resend';
import { prisma } from '@saas/db';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const notificationWorker = new Worker(
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
      if (channel === 'email' && resend) {
        const result = await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@saas.com',
          to,
          subject,
          html: body,
        });

        if (result.error) throw result.error;
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'sent', sentAt: new Date() },
      });

      console.log(`Sent notification ${notificationId}`);
    } catch (err) {
      console.error(`Failed to send notification ${notificationId}:`, err);

      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'failed' },
      });

      const attempts = job.attemptsMade + 1;
      if (attempts < 3) {
        throw err; // Retry
      }
    }
  },
  {
    connection,
    concurrency: 10,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  }
);

console.log('Job worker started. Processing queues...');

process.on('SIGTERM', async () => {
  await notificationWorker.close();
  await connection.quit();
});
