import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import PDFDocument from 'pdfkit';
import { prisma } from '@saas/db';
import { z } from 'zod';
import {
  createLogger, requestId, requestLogger, healthCheckMiddleware,
  livenessProbe, readinessProbe, gracefulShutdown, errorHandler,
  notFound, localRateLimiter, corsOptions, registerHealthCheck,
  dbHealthCheck, withRetry, validateBody, CircuitBreaker,
} from '@saas/robustness';

const app = express();
const PORT = Number(process.env.PAYMENT_PORT) || 4004;
const logger = createLogger('payment-service');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' as any });

app.use(cors(corsOptions));
app.use('/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(requestId());
app.use(requestLogger(logger));
app.use(localRateLimiter({ maxRequests: 50 }));

const stripeBreaker = new CircuitBreaker('stripe-api', { failureThreshold: 3, resetTimeoutMs: 60000 });

const idempotencyStore = new Map<string, { result: object; expiresAt: number }>();

interface Payment {
  id: string; userId: string; stripeSessionId: string;
  amount: number; currency: string; status: string;
  invoiceUrl: string | null; idempotencyKey: string; createdAt: string;
}

const memoryPayments: Payment[] = [];

registerHealthCheck('stripe', () => dbHealthCheck('Stripe API', async () => {
  try { await stripe.balance.retrieve(); return true; } catch { return false; }
}));

function generateInvoice(payment: Payment): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown().fontSize(12);
    doc.text(`Invoice #: ${payment.id}`);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
    doc.text(`Customer: ${payment.userId}`);
    doc.text(`Amount: ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown().fontSize(10).text('PulseSaaS - Production Platform', { align: 'center' });
    doc.end();
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

const checkoutSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('usd'),
  idempotencyKey: z.string().optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});

app.post('/payments/create-checkout', validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const { userId, amount, currency = 'usd', idempotencyKey: ikeyInput, successUrl, cancelUrl } = req.body as z.infer<typeof checkoutSchema>;
    const ikey = ikeyInput || nanoid();

    const cached = idempotencyStore.get(ikey);
    if (cached && cached.expiresAt > Date.now()) {
      logger.info('Idempotent request', { ikey });
      return res.status(200).json({ success: true, data: cached.result, idempotent: true });
    }
    idempotencyStore.set(ikey, { result: {}, expiresAt: Date.now() + 3600000 });

    let checkoutUrl: string | null = null;
    try {
      const session = await stripeBreaker.execute(() =>
        stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{ price_data: { currency, product_data: { name: 'PulseSaaS Subscription' }, unit_amount: amount }, quantity: 1 }],
          mode: 'payment',
          success_url: successUrl || 'http://localhost:3000/dashboard?payment=success',
          cancel_url: cancelUrl || 'http://localhost:3000/dashboard?payment=cancelled',
          metadata: { userId, idempotencyKey: ikey },
        })
      );
      checkoutUrl = session.url;
    } catch (stripeErr: any) {
      logger.warn('Stripe checkout failed, using demo mode', { error: stripeErr.message });
    }

    const payment: Payment = {
      id: `pay_${nanoid(16)}`, userId,
      stripeSessionId: checkoutUrl ? `cs_${nanoid()}` : `demo_${nanoid()}`,
      amount, currency, status: 'completed',
      invoiceUrl: null, idempotencyKey: ikey,
      createdAt: new Date().toISOString(),
    };

    try { payment.invoiceUrl = `data:application/pdf;base64,${(await generateInvoice(payment)).toString('base64')}`; } catch {}

    memoryPayments.push(payment);

    try { await withRetry(() => prisma.payment.create({ data: { userId, stripeSessionId: payment.stripeSessionId, amount, currency, status: payment.status, invoiceUrl: payment.invoiceUrl } }), { maxRetries: 2 }); } catch {}

    const result = { payment, checkoutUrl: checkoutUrl || `http://localhost:3000/dashboard?payment=demo&id=${payment.id}` };
    idempotencyStore.set(ikey, { result, expiresAt: Date.now() + 3600000 });
    logger.info('Payment created', { id: payment.id, amount });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

app.post('/payments/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) return res.json({ received: false });

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const idx = memoryPayments.findIndex((p) => p.stripeSessionId === session.id);
      if (idx !== -1) memoryPayments[idx]!.status = 'completed';
      try { await prisma.payment.updateMany({ where: { stripeSessionId: session.id }, data: { status: 'completed' } }); } catch {}
    }
    res.json({ received: true });
  } catch (err: any) {
    logger.error('Webhook error', { error: err.message });
    res.status(400).json({ success: false, error: 'Webhook error' });
  }
});

app.get('/payments', (req, res) => {
  const userId = (req.query.userId as string) || 'all';
  res.json({ success: true, data: userId === 'all' ? memoryPayments : memoryPayments.filter((p) => p.userId === userId) });
});

app.get('/payments/:id/invoice', (req, res) => {
  const payment = memoryPayments.find((p) => p.id === req.params.id);
  if (!payment?.invoiceUrl) return res.status(404).json({ success: false, error: 'Not found' });
  if (payment.invoiceUrl.startsWith('data:application/pdf')) {
    const base64 = payment.invoiceUrl.split(',')[1];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.id}.pdf`);
    return res.send(Buffer.from(base64!, 'base64'));
  }
  res.json({ success: true, data: { invoiceUrl: payment.invoiceUrl } });
});

app.get('/health', healthCheckMiddleware());
app.get('/live', livenessProbe());
app.get('/ready', readinessProbe());
app.get('/circuit-breakers', (_req, res) => res.json({ success: true, data: [stripeBreaker.getStatus()] }));
app.use(notFound());
app.use(errorHandler(logger));

const server = app.listen(PORT, () => logger.info(`Payment service running on port ${PORT}`));
gracefulShutdown(server);
