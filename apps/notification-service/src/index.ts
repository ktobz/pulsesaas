import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Resend } from 'resend';
import { prisma } from '@saas/db';
import type { SendNotificationInput } from '@saas/shared';

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 4002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const notificationQueue = new Queue('notifications', { connection });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.use(cors());
app.use(express.json());

app.post('/notifications/send', async (req, res) => {
  try {
    const input = req.body as SendNotificationInput;
    if (!input.userId || !input.channel || !input.subject || !input.body) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        template: input.template || 'default',
        subject: input.subject,
        body: input.body,
        status: 'pending',
        meta: input.meta as object,
      },
    });

    await notificationQueue.add('send', {
      notificationId: notification.id,
      channel: input.channel,
      to: user.email,
      subject: input.subject,
      body: input.body,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

app.listen(PORT, () => {
  console.log(`Notification service running on http://localhost:${PORT}`);
});
