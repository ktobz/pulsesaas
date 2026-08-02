import { Worker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import { Resend } from 'resend';
import { prisma } from '@saas/db';
import { createLogger, CircuitBreaker, withRetry } from '@saas/robustness';

const logger = createLogger('job-worker');
const REDIS_URL = process.env.REDIS_URL || '';
let connection: Redis | null = null;

(async () => {
  try {
    if (REDIS_URL) {
      connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true, retryStrategy: () => null });
      await connection.connect();
      logger.info('Redis connected');
    }
  } catch { logger.warn('Redis unavailable, running in no-op mode'); }
})();

const emailBreaker = new CircuitBreaker('email-send', { failureThreshold: 5, resetTimeoutMs: 60000 });

if (connection) {
  const scheduler = new QueueScheduler('notifications', { connection });
  const worker = new Worker(
    'notifications',
    async (job) => {
      const { notificationId, channel, to, subject, body } = job.data as {
        notificationId: string; channel: string; to: string; subject: string; body: string;
      };

      logger.info('Processing notification', { id: notificationId, channel });

      try {
        if (channel === 'email') {
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            await emailBreaker.execute(async () => {
              const resend = new Resend(resendKey);
              const result = await resend.emails.send({
                from: process.env.FROM_EMAIL || 'noreply@pulsesaas.com', to, subject, html: body,
              });
              if (result.error) throw result.error;
            });
          } else {
            logger.info('Simulated email', { to, subject });
          }
        }

        try { await withRetry(() => prisma.notification.update({ where: { id: notificationId }, data: { status: 'sent', sentAt: new Date() } }), { maxRetries: 2 }); } catch {}
        logger.info('Notification sent', { id: notificationId });
      } catch (err) {
        logger.error('Notification failed', { id: notificationId, error: (err as Error).message });
        try { await prisma.notification.update({ where: { id: notificationId }, data: { status: 'failed' } }); } catch {}

        if (job.attemptsMade < 3) throw err;
        logger.warn('Notification dead-lettered after 3 attempts', { id: notificationId });
      }
    },
    {
      connection, concurrency: 10, attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5000 },
    }
  );

  worker.on('completed', (job) => logger.info('Job completed', { id: job.id }));
  worker.on('failed', (job, err) => logger.error('Job failed', { id: job?.id, error: err.message }));

  logger.info('BullMQ worker started');
} else {
  logger.info('Running in no-op mode — no Redis');
  setInterval(() => logger.debug('Worker heartbeat — idle'), 60000);
}

process.on('SIGTERM', async () => { logger.info('Worker shutting down'); await connection?.quit(); });
