import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@saas/db';
import { RateLimiter, createRateLimiterMiddleware } from '@saas/rate-limiter';

const app = express();
const PORT = process.env.AUTH_PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL = 60 * 60 * 24; // 24 hours

const redis = new Redis(REDIS_URL);
const rateLimiter = new RateLimiter(REDIS_URL);
const rateLimitMiddleware = createRateLimiterMiddleware(rateLimiter, {
  windowMs: 60 * 1000,
  maxRequests: 20,
});

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Rate limiting on auth routes
app.use('/auth', async (req, res, next) => {
  const response = await rateLimitMiddleware(req as unknown as Request);
  if (response) {
    res.status(429).json(await response.json());
    return;
  }
  next();
});

// ── Register ──
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, role: 'user' },
    });

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(user));

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Login ──
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(user));

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Google Login ──
app.post('/auth/google', async (req, res) => {
  try {
    const { email, name, avatar, googleId } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ success: false, error: 'Email and Google ID required' });
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email, name, avatar, googleId, role: 'user' },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatar: avatar ?? user.avatar },
      });
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(user));

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Session ──
app.get('/auth/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    const sessionData = await redis.get(`session:${token}`);
    if (!sessionData) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    const user = JSON.parse(sessionData);
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Logout ──
app.post('/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    await redis.del(`session:${authHeader.slice(7)}`);
  }
  res.json({ success: true, data: null });
});

// ── API Keys ──
app.post('/auth/api-keys', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const sessionData = await redis.get(`session:${token}`);
    if (!sessionData) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    const user = JSON.parse(sessionData);
    const { name, scopes } = req.body;

    const apiKey = uuidv4();
    const prefix = apiKey.slice(0, 6);
    const hash = await bcrypt.hash(apiKey, 8);

    await prisma.apiKey.create({
      data: { userId: user.id, name: name || 'default', keyHash: hash, keyPrefix: prefix, scopes: scopes || ['read'] },
    });

    res.status(201).json({ success: true, data: { key: apiKey, prefix, name, scopes } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
});
