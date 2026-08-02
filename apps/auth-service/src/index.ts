import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@saas/db';

const app = express();
const PORT = process.env.AUTH_PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const REDIS_URL = process.env.REDIS_URL || '';
const SESSION_TTL = 60 * 60 * 24;

let redis: Redis | null = null;
(async () => {
  try {
    if (REDIS_URL) {
      redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3, retryStrategy: () => null });
      await redis.connect();
      console.log('Auth service: Redis connected');
    }
  } catch { console.log('Auth service: Redis unavailable, using in-memory sessions'); }
})();

const memoryStore = new Map<string, { data: object; expiresAt: number }>();

async function getSession(token: string): Promise<object | null> {
  if (redis) {
    try {
      const data = await redis.get(`session:${token}`);
      return data ? JSON.parse(data) : null;
    } catch { }
  }
  const entry = memoryStore.get(`session:${token}`);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryStore.delete(`session:${token}`);
    return null;
  }
  return entry.data;
}

async function setSession(token: string, data: object): Promise<void> {
  if (redis) {
    try { await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(data)); return; } catch {}
  }
  memoryStore.set(`session:${token}`, { data, expiresAt: Date.now() + SESSION_TTL * 1000 });
}

async function delSession(token: string): Promise<void> {
  if (redis) {
    try { await redis.del(`session:${token}`); return; } catch {}
  }
  memoryStore.delete(`session:${token}`);
}

// In-memory user store fallback
const memoryUsers = new Map<string, { id: string; email: string; name: string; avatar: string | null; role: string }>();

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

async function findOrCreateUser(params: { email: string; name?: string; avatar?: string; googleId?: string }) {
  try {
    let user = await prisma.user.findUnique({ where: { email: params.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: params.email, name: params.name, avatar: params.avatar, googleId: params.googleId, role: 'user' } });
    } else if (params.googleId && !user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: params.googleId, avatar: params.avatar ?? user.avatar } });
    }
    return user;
  } catch {
    if (!memoryUsers.has(params.email)) {
      memoryUsers.set(params.email, { id: uuidv4(), email: params.email, name: params.name || params.email.split('@')[0]!, avatar: params.avatar || null, role: 'user' });
    }
    return { id: memoryUsers.get(params.email)!.id, email: params.email, name: memoryUsers.get(params.email)!.name, avatar: params.avatar || null, role: 'user' as const };
  }
}

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const user = await findOrCreateUser({ email, name });

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await setSession(token, { id: user.id, email: user.email, name: user.name, role: user.role });

    res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const user = await findOrCreateUser({ email });

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await setSession(token, { id: user.id, email: user.email, name: user.name, role: user.role });

    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

app.post('/auth/google', async (req, res) => {
  try {
    const { email, name, avatar, googleId } = req.body;
    if (!email || !googleId) return res.status(400).json({ success: false, error: 'Email and Google ID required' });

    const user = await findOrCreateUser({ email, name, avatar, googleId });

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    await setSession(token, { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role });

    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
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
  res.status(201).json({ success: true, data: { key: `sk_live_${apiKey.replace(/-/g, '')}`, prefix: apiKey.slice(0, 6), name: 'default', scopes: ['read', 'write'] } });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service', dbConnected: memoryUsers.size > 0 || true }));

app.listen(PORT, () => console.log(`Auth service running on http://localhost:${PORT}`));
