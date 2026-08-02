import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { nanoid } from 'nanoid';

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 4002;
const REDIS_URL = process.env.REDIS_URL || '';

app.use(cors());
app.use(express.json());

let redis: Redis | null = null;
let notificationQueue: Queue | null = null;

(async () => {
  try {
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true, retryStrategy: () => null });
      await redis.connect();
      notificationQueue = new Queue('notifications', { connection: redis });
      console.log('Notification service: Redis + BullMQ connected');
    }
  } catch { console.log('Notification service: Running without Redis/BullMQ'); }
})();

interface Notification {
  id: string;
  userId: string;
  channel: string;
  template: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
}

const memoryNotifications: Notification[] = [];

app.post('/notifications/send', async (req, res) => {
  const { userId, channel, template, subject, body } = req.body;
  if (!userId || !channel || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const notification: Notification = {
    id: nanoid(),
    userId,
    channel: channel || 'email',
    template: template || 'default',
    subject,
    body,
    status: 'pending',
    createdAt: new Date().toISOString(),
    sentAt: null,
  };

  memoryNotifications.unshift(notification);

  if (notificationQueue) {
    try {
      await notificationQueue.add('send', { notificationId: notification.id, channel, to: userId, subject, body });
      console.log(`Queued notification ${notification.id}`);
    } catch {}
  } else {
    // Simulate immediate delivery
    setTimeout(() => {
      const idx = memoryNotifications.findIndex((n) => n.id === notification.id);
      if (idx !== -1) memoryNotifications[idx]!.status = 'sent';
      if (idx !== -1) memoryNotifications[idx]!.sentAt = new Date().toISOString();
    }, 500);
  }

  res.status(201).json({ success: true, data: notification });
});

app.get('/notifications', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  const userNotifs = memoryNotifications.filter((n) => n.userId === userId);
  res.json({ success: true, data: userNotifs });
});

app.get('/notifications/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total: memoryNotifications.length,
      sent: memoryNotifications.filter((n) => n.status === 'sent').length,
      pending: memoryNotifications.filter((n) => n.status === 'pending').length,
      failed: memoryNotifications.filter((n) => n.status === 'failed').length,
      byChannel: {
        email: memoryNotifications.filter((n) => n.channel === 'email').length,
        sms: memoryNotifications.filter((n) => n.channel === 'sms').length,
        push: memoryNotifications.filter((n) => n.channel === 'push').length,
      },
    },
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

app.listen(PORT, () => console.log(`Notification service running on http://localhost:${PORT}`));
