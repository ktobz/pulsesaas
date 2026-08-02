import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { prisma } from '@saas/db';

const app = express();
const PORT = process.env.PAYMENT_PORT || 4004;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' });

app.use(cors());
app.use('/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.post('/payments/create-checkout', async (req, res) => {
  try {
    const { userId, amount, currency = 'usd', successUrl, cancelUrl } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: 'userId and amount required' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: 'SaaS Subscription' },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || 'http://localhost:3000/dashboard?payment=success',
      cancel_url: cancelUrl || 'http://localhost:3000/dashboard?payment=cancelled',
      metadata: { userId },
    });

    const payment = await prisma.payment.create({
      data: {
        userId,
        stripeSessionId: session.id,
        amount,
        currency,
        status: 'pending',
      },
    });

    res.status(201).json({ success: true, data: { payment, checkoutUrl: session.url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/payments/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ success: false, error: 'Webhook secret not configured' });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await prisma.payment.updateMany({
        where: { stripeSessionId: session.id },
        data: { status: 'completed', invoiceUrl: session.invoice as string | null },
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ success: false, error: 'Webhook error' });
  }
});

app.get('/payments', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }

  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: payments });
});

app.listen(PORT, () => {
  console.log(`Payment service running on http://localhost:${PORT}`);
});
