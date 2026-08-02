import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
const PORT = process.env.URL_SHORTENER_PORT || 4005;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

interface Url {
  id: string;
  userId: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  expiresAt: string | null;
  createdAt: string;
  meta?: Record<string, string>;
}

const memoryUrls: Url[] = [];

app.post('/shorten', (req, res) => {
  const { originalUrl, customCode, expiresInDays, userId } = req.body;
  if (!originalUrl) return res.status(400).json({ success: false, error: 'originalUrl required' });

  let shortCode = customCode || nanoid(8);
  if (memoryUrls.find((u) => u.shortCode === shortCode)) {
    if (customCode) return res.status(409).json({ success: false, error: 'Custom code already taken' });
    shortCode = nanoid(10);
  }

  const url: Url = {
    id: nanoid(),
    userId: userId || 'anonymous',
    originalUrl,
    shortCode,
    clicks: 0,
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
    createdAt: new Date().toISOString(),
    meta: {
      userAgent: req.headers['user-agent'] || '',
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
    },
  };

  memoryUrls.unshift(url);
  res.status(201).json({ success: true, data: { ...url, shortUrl: `${BASE_URL}/${shortCode}` } });
});

app.get('/:code', (req, res) => {
  const url = memoryUrls.find((u) => u.shortCode === req.params.code);
  if (!url) return res.status(404).json({ success: false, error: 'Not found' });
  if (url.expiresAt && new Date(url.expiresAt) < new Date()) return res.status(410).json({ success: false, error: 'Expired' });

  url.clicks++;
  if (url.meta) {
    url.meta.lastClickAt = new Date().toISOString();
    url.meta.lastClickIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  }

  return res.redirect(301, url.originalUrl);
});

app.get('/api/urls/:code/stats', (req, res) => {
  const url = memoryUrls.find((u) => u.shortCode === req.params.code);
  if (!url) return res.status(404).json({ success: false, error: 'Not found' });

  res.json({
    success: true,
    data: {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      clicks: url.clicks,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      meta: url.meta,
    },
  });
});

app.get('/api/urls', (_req, res) => {
  res.json({ success: true, data: memoryUrls });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'url-shortener', urls: memoryUrls.length }));

app.listen(PORT, () => console.log(`URL shortener running on http://localhost:${PORT}`));
