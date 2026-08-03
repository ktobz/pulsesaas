import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  createLogger, requestId, requestLogger, healthCheckMiddleware,
  livenessProbe, readinessProbe, gracefulShutdown, errorHandler,
  notFound, localRateLimiter, corsOptions, validateBody,
} from '@saas/robustness';

const app = express();
const PORT = Number(process.env.URL_SHORTENER_PORT) || 4005;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const logger = createLogger('url-shortener');

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestId());
app.use(requestLogger(logger));
app.use(localRateLimiter({ maxRequests: 200 }));

interface Url {
  id: string; userId: string; originalUrl: string; shortCode: string;
  clicks: number; expiresAt: string | null; createdAt: string;
  meta?: Record<string, string>;
}

const memoryUrls: Url[] = [];

const shortenSchema = z.object({
  originalUrl: z.string().url(),
  customCode: z.string().optional(),
  expiresInDays: z.number().positive().optional(),
  userId: z.string().default('anonymous'),
});

app.post('/shorten', validateBody(shortenSchema), (req, res) => {
  const { originalUrl, customCode, expiresInDays, userId } = req.body as z.infer<typeof shortenSchema>;

  let shortCode = customCode || nanoid(8);
  if (memoryUrls.find((u) => u.shortCode === shortCode)) {
    if (customCode) return res.status(409).json({ success: false, error: 'Code taken' });
    shortCode = nanoid(10);
  }

  const url: Url = {
    id: nanoid(), userId, originalUrl, shortCode, clicks: 0,
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
    createdAt: new Date().toISOString(),
    meta: { userAgent: req.headers['user-agent'] || '', ip: (req.headers['x-forwarded-for'] as string) || '' },
  };

  memoryUrls.unshift(url);
  logger.info('URL shortened', { shortCode, originalUrl: originalUrl.slice(0, 80) });
  res.status(201).json({ success: true, data: { ...url, shortUrl: `${BASE_URL}/${shortCode}` } });
});

app.get('/health', healthCheckMiddleware());
app.get('/live', livenessProbe());
app.get('/ready', readinessProbe());

app.get('/:code', (req, res) => {
  const url = memoryUrls.find((u) => u.shortCode === req.params.code);
  if (!url) return res.status(404).json({ success: false, error: 'Not found' });
  if (url.expiresAt && new Date(url.expiresAt) < new Date()) return res.status(410).json({ success: false, error: 'Expired' });
  url.clicks++;
  if (url.meta) { url.meta.lastClickAt = new Date().toISOString(); url.meta.lastClickIp = (req.headers['x-forwarded-for'] as string) || ''; }
  return res.redirect(301, url.originalUrl);
});

app.get('/api/urls/:code/stats', (req, res) => {
  const url = memoryUrls.find((u) => u.shortCode === req.params.code);
  if (!url) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: { shortCode: url.shortCode, originalUrl: url.originalUrl, clicks: url.clicks, createdAt: url.createdAt, expiresAt: url.expiresAt, meta: url.meta } });
});

app.get('/api/urls', (_req, res) => res.json({ success: true, data: memoryUrls }));
app.use(notFound());
app.use(errorHandler(logger));

const server = app.listen(PORT, () => logger.info(`URL shortener running on port ${PORT}`));
gracefulShutdown(server);
