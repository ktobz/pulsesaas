import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@saas/db';
import {
  createLogger, requestId, requestLogger, healthCheckMiddleware,
  livenessProbe, readinessProbe, gracefulShutdown, errorHandler,
  notFound, localRateLimiter, corsOptions, registerHealthCheck,
  dbHealthCheck,
  withRetry, validateBody,
} from '@saas/robustness';
import { z } from 'zod';

const app = express();
const PORT = Number(process.env.AUTH_PORT) || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const REDIS_URL = process.env.REDIS_URL || '';
const SESSION_TTL = 60 * 60 * 24;

const logger = createLogger('auth-service');

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestId());
app.use(requestLogger(logger));
app.use(localRateLimiter({ windowMs: 60000, maxRequests: 200 }));

let redis: Redis | null = null;
(async () => {
  try {
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3, retryStrategy: () => null });
      await redis.connect();
      logger.info('Redis connected');
    }
  } catch { logger.warn('Redis unavailable, using in-memory sessions'); }
})();

registerHealthCheck('redis', () => dbHealthCheck('Redis', async () => {
  if (!redis) throw new Error('Redis not initialized');
  const pong = await withTimeout(Promise.resolve(redis ? redis.ping() : null), 2000);
  return pong === 'PONG';
}));

registerHealthCheck('postgres', () => dbHealthCheck('PostgreSQL', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}));

const memoryStore = new Map<string, { data: object; expiresAt: number }>();

async function getSession(token: string): Promise<object | null> {
  if (redis) {
    try { const data = await redis.get(`session:${token}`); return data ? JSON.parse(data) : null; } catch {}
  }
  const entry = memoryStore.get(`session:${token}`);
  if (!entry || entry.expiresAt < Date.now()) { memoryStore.delete(`session:${token}`); return null; }
  return entry.data;
}

async function setSession(token: string, data: object): Promise<void> {
  if (redis) { try { await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(data)); return; } catch {} }
  memoryStore.set(`session:${token}`, { data, expiresAt: Date.now() + SESSION_TTL * 1000 });
}

async function delSession(token: string): Promise<void> {
  if (redis) { try { await redis.del(`session:${token}`); return; } catch {} }
  memoryStore.delete(`session:${token}`);
}

const memoryUsers = new Map<string, { id: string; email: string; name: string; avatar: string | null; role: string }>();

async function findOrCreateUser(params: { email: string; name?: string; avatar?: string; googleId?: string }) {
  try {
    let user = await withRetry(() => prisma.user.findUnique({ where: { email: params.email } }), { maxRetries: 2 });
    if (!user) {
      user = await withRetry(() => prisma.user.create({ data: { email: params.email, name: params.name, avatar: params.avatar, googleId: params.googleId, role: 'user' } }), { maxRetries: 2 });
    }
    return user;
  } catch {
    if (!memoryUsers.has(params.email)) {
      memoryUsers.set(params.email, { id: uuidv4(), email: params.email, name: params.name || params.email.split('@')[0]!, avatar: params.avatar || null, role: 'user' });
    }
    return memoryUsers.get(params.email)!;
  }
}

const registerSchema = z.object({ email: z.string().email(), password: z.string().min(1), name: z.string().optional() });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const googleSchema = z.object({ email: z.string().email(), name: z.string().optional(), avatar: z.string().optional(), googleId: z.string() });

app.post('/auth/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await findOrCreateUser({ email, name });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await setSession(token, { id: user.id, email: user.email, name: user.name, role: user.role });
    logger.info('User registered', { email });
    res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  } catch (err) { next(err); }
});

app.post('/auth/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await findOrCreateUser({ email });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await setSession(token, { id: user.id, email: user.email, name: user.name, role: user.role });
    logger.info('User logged in', { email });
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  } catch (err) { next(err); }
});

app.post('/auth/google', validateBody(googleSchema), async (req, res, next) => {
  try {
    const { email, name, avatar, googleId } = req.body;
    const user = await findOrCreateUser({ email, name, avatar, googleId });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await setSession(token, { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role });
    logger.info('Google OAuth login', { email });
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role } } });
  } catch (err) { next(err); }
});

app.get('/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  const sessionData = await getSession(authHeader.slice(7));
  if (!sessionData) return res.status(401).json({ success: false, error: 'Invalid session' });
  res.json({ success: true, data: { user: sessionData } });
});

app.post('/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) await delSession(authHeader.slice(7));
  res.json({ success: true, data: null });
});

app.post('/auth/api-keys', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const sessionData = await getSession(authHeader.slice(7));
  if (!sessionData) return res.status(401).json({ success: false, error: 'Invalid session' });
  const apiKey = uuidv4();
  logger.info('API key generated');
  res.status(201).json({ success: true, data: { key: `sk_live_${apiKey.replace(/-/g, '')}`, prefix: apiKey.slice(0, 6), name: 'default', scopes: ['read', 'write'] } });
});

app.get('/health', healthCheckMiddleware());
app.get('/live', livenessProbe());
app.get('/ready', readinessProbe());
app.use(notFound());
app.use(errorHandler(logger));

const server = app.listen(PORT, () => logger.info(`Auth service running on port ${PORT}`));
gracefulShutdown(server);
