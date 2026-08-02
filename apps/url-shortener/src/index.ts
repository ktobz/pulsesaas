import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { prisma } from '@saas/db';

const app = express();
const PORT = process.env.URL_SHORTENER_PORT || 4005;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

app.post('/shorten', async (req, res) => {
  try {
    const { originalUrl, customCode, expiresInDays } = req.body;
    if (!originalUrl) {
      return res.status(400).json({ success: false, error: 'originalUrl required' });
    }

    let shortCode = customCode || nanoid(8);

    if (customCode) {
      const existing = await prisma.url.findUnique({ where: { shortCode } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Custom code already taken' });
      }
    }

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    const url = await prisma.url.create({
      data: {
        userId: req.body.userId || 'anonymous',
        originalUrl,
        shortCode,
        expiresAt,
      },
    });

    res.status(201).json({
      success: true,
      data: { ...url, shortUrl: `${BASE_URL}/${shortCode}` },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/:code', async (req, res) => {
  try {
    const url = await prisma.url.findUnique({
      where: { shortCode: req.params.code },
    });

    if (!url) {
      return res.status(404).json({ success: false, error: 'URL not found' });
    }

    if (url.expiresAt && url.expiresAt < new Date()) {
      return res.status(410).json({ success: false, error: 'URL expired' });
    }

    await prisma.url.update({
      where: { id: url.id },
      data: { clicks: { increment: 1 } },
    });

    return res.redirect(301, url.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/urls/:code/stats', async (req, res) => {
  const url = await prisma.url.findUnique({ where: { shortCode: req.params.code } });
  if (!url) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  res.json({
    success: true,
    data: {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      clicks: url.clicks,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
    },
  });
});

app.listen(PORT, () => {
  console.log(`URL shortener running on http://localhost:${PORT}`);
});
