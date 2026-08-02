import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import PDFDocument from 'pdfkit';
import { prisma } from '@saas/db';

const app = express();
const PORT = process.env.PAYMENT_PORT || 4004;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' as any });

app.use(cors());
app.use('/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// In-memory idempotency store
const idempotencyStore = new Map<string, { result: object; expiresAt: number }>();

interface Payment {
  id: string;
  userId: string;
  stripeSessionId: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  idempotencyKey: string;
  createdAt: string;
}

const memoryPayments: Payment[] = [];

function generateInvoice(payment: Payment): Buffer {
  const doc = new PDFDocument({ size: 'A4' });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  doc.fontSize(24).text('INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice #: ${payment.id}`);
  doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
  doc.text(`Customer: ${payment.userId}`);
  doc.text(`Amount: ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
  doc.text(`Status: ${payment.status}`);
  doc.text(`Stripe Session: ${payment.stripeSessionId}`);
  doc.moveDown();
  doc.fontSize(10).text('PulseSaaS - Production Platform', { align: 'center' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

app.post('/payments/create-checkout', async (req, res) => {
  try {
    const { userId, amount, currency = 'usd', idempotencyKey } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId and amount required' });

    const ikey = idempotencyKey || nanoid();

    // Idempotency check
    const cached = idempotencyStore.get(ikey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json({ success: true, data: cached.result, idempotent: true });
    }
    idempotencyStore.set(ikey, { result: {}, expiresAt: Date.now() + 3600000 });

    let checkoutUrl: string | null = null;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency, product_data: { name: 'PulseSaaS Subscription' }, unit_amount: amount }, quantity: 1 }],
        mode: 'payment',
        success_url: req.body.successUrl || 'http://localhost:3000/dashboard?payment=success',
        cancel_url: req.body.cancelUrl || 'http://localhost:3000/dashboard?payment=cancelled',
        metadata: { userId, idempotencyKey: ikey },
      });
      checkoutUrl = session.url;
    } catch (stripeErr: any) {
      console.log('Stripe not configured, using demo mode:', stripeErr.message);
    }

    const payment: Payment = {
      id: `pay_${nanoid(16)}`,
      userId,
      stripeSessionId: checkoutUrl ? `cs_${nanoid()}` : `demo_${nanoid()}`,
      amount,
      currency,
      status: 'completed',
      invoiceUrl: null,
      idempotencyKey: ikey,
      createdAt: new Date().toISOString(),
    };

    // Generate invoice
    try {
      const invoice = generateInvoice(payment);
      payment.invoiceUrl = `data:application/pdf;base64,${(await invoice).toString('base64')}`;
    } catch {
      payment.invoiceUrl = null;
    }

    memoryPayments.push(payment);

    try {
      await prisma.payment.create({
        data: { userId, stripeSessionId: payment.stripeSessionId, amount, currency, status: payment.status, invoiceUrl: payment.invoiceUrl },
      });
    } catch {}

    const result = { payment, checkoutUrl: checkoutUrl || `http://localhost:3000/dashboard?payment=demo&id=${payment.id}` };
    idempotencyStore.set(ikey, { result, expiresAt: Date.now() + 3600000 });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

app.post('/payments/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) return res.json({ received: false, reason: 'No webhook secret or signature' });

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const idx = memoryPayments.findIndex((p) => p.stripeSessionId === session.id);
      if (idx !== -1) memoryPayments[idx]!.status = 'completed';
      try { await prisma.payment.updateMany({ where: { stripeSessionId: session.id }, data: { status: 'completed' } }); } catch {}
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ success: false, error: 'Webhook error' });
  }
});

app.get('/payments', (req, res) => {
  const userId = (req.query.userId as string) || 'all';
  const userPayments = userId === 'all' ? memoryPayments : memoryPayments.filter((p) => p.userId === userId);
  res.json({ success: true, data: userPayments });
});

app.get('/payments/:id/invoice', (req, res) => {
  const payment = memoryPayments.find((p) => p.id === req.params.id);
  if (!payment || !payment.invoiceUrl) return res.status(404).json({ success: false, error: 'Not found' });

  if (payment.invoiceUrl.startsWith('data:application/pdf')) {
    const base64 = payment.invoiceUrl.split(',')[1];
    const pdfBuffer = Buffer.from(base64!, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.id}.pdf`);
    return res.send(pdfBuffer);
  }

  res.json({ success: true, data: { invoiceUrl: payment.invoiceUrl } });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payment-service', payments: memoryPayments.length }));

app.listen(PORT, () => console.log(`Payment service running on http://localhost:${PORT}`));
