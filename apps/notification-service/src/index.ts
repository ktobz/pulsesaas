import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  createLogger, requestId, requestLogger, healthCheckMiddleware,
  livenessProbe, readinessProbe, gracefulShutdown, errorHandler,
  notFound, localRateLimiter, corsOptions, registerHealthCheck,
  dbHealthCheck, withTimeout, validateBody,
} from '@saas/robustness';

const app = express();
const PORT = Number(process.env.NOTIFICATION_PORT) || 4002;
const REDIS_URL = process.env.REDIS_URL || '';
const logger = createLogger('notification-service');

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestId());
app.use(requestLogger(logger));
app.use(localRateLimiter({ maxRequests: 100 }));

let redis: Redis | null = null;
let notificationQueue: Queue | null = null;

(async () => {
  try {
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true, retryStrategy: () => null });
      await redis.connect();
      notificationQueue = new Queue('notifications', { connection: redis });
      logger.info('Redis + BullMQ connected');
    }
  } catch { logger.warn('Running without Redis/BullMQ'); }
})();

registerHealthCheck('redis', () => dbHealthCheck('Redis', async () => {
  if (!redis) return false;
  return (await redis.ping()) === 'PONG';
}));

interface Notification {
  id: string; userId: string; channel: string; template: string;
  subject: string; body: string; status: string; createdAt: string; sentAt: string | null;
}

const memoryNotifications: Notification[] = [];

const sendSchema = z.object({
  userId: z.string().min(1),
  channel: z.enum(['email', 'sms', 'push']).default('email'),
  template: z.string().default('default'),
  subject: z.string().min(1),
  body: z.string().min(1),
});

app.post('/notifications/send', validateBody(sendSchema), async (req, res, next) => {
  try {
    const { userId, channel, template, subject, body } = req.body as z.infer<typeof sendSchema>;

    const notification: Notification = {
      id: nanoid(), userId, channel, template, subject, body,
      status: 'pending', createdAt: new Date().toISOString(), sentAt: null,
    };
    memoryNotifications.unshift(notification);

    if (notificationQueue) {
      await notificationQueue.add('send', { notificationId: notification.id, channel, to: userId, subject, body });
    } else {
      setTimeout(() => {
        const idx = memoryNotifications.findIndex((n) => n.id === notification.id);
        if (idx !== -1) { memoryNotifications[idx]!.status = 'sent'; memoryNotifications[idx]!.sentAt = new Date().toISOString(); }
      }, 500);
    }

    logger.info('Notification queued', { id: notification.id, channel });
    res.status(201).json({ success: true, data: notification });
  } catch (err) { next(err); }
});

app.get('/notifications', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  res.json({ success: true, data: memoryNotifications.filter((n) => n.userId === userId) });
});

app.get('/notifications/stats', (_req, res) => {
  const total = memoryNotifications.length;
  res.json({ success: true, data: {
    total,
    sent: memoryNotifications.filter((n) => n.status === 'sent').length,
    pending: memoryNotifications.filter((n) => n.status === 'pending').length,
    failed: memoryNotifications.filter((n) => n.status === 'failed').length,
    byChannel: {
      email: memoryNotifications.filter((n) => n.channel === 'email').length,
      sms: memoryNotifications.filter((n) => n.channel === 'sms').length,
      push: memoryNotifications.filter((n) => n.channel === 'push').length,
    },
  } });
});

app.get('/health', healthCheckMiddleware());
app.get('/live', livenessProbe());
app.get('/ready', readinessProbe());
app.use(notFound());
app.use(errorHandler(logger));

const server = app.listen(PORT, () => logger.info(`Notification service running on port ${PORT}`));
gracefulShutdown(server);
