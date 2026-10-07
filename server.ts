import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import Razorpay from 'razorpay';
import pg from 'pg';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Setup JSON parser while preserving raw body for Razorpay webhook verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// PostgreSQL connection pool for secure server-side database updates
const createDbPool = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  try {
    const url = new URL(dbUrl);
    return new pg.Pool({
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, '') || 'postgres',
      ssl: { rejectUnauthorized: false },
    });
  } catch (_e) {
    return new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });
  }
};

const pool = createDbPool();

// Helper to get or initialize Razorpay instance
const getRazorpayInstance = (): Razorpay | null => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (
    !keyId ||
    !keySecret ||
    keyId.includes('your_key_id') ||
    keySecret.includes('your_key_secret')
  ) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/* ==========================================================================
   API ROUTES FOR SUBSCRIPTIONS & RAZORPAY
   ========================================================================== */

/**
 * GET /api/subscription/config
 * Returns public safe configuration (Public Key ID only - never the secret)
 */
app.get('/api/subscription/config', (_req: Request, res: Response) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const isConfigured = Boolean(
    keyId &&
      process.env.RAZORPAY_KEY_SECRET &&
      !keyId.includes('your_key_id') &&
      !process.env.RAZORPAY_KEY_SECRET.includes('your_key_secret')
  );

  res.json({
    keyId: isConfigured ? keyId : '',
    isConfigured,
    planAmount: 99,
    currency: 'INR',
  });
});

/**
 * GET /api/subscription/status/:userId
 * Retrieves user's subscription state and monthly invoice usage count
 */
app.get('/api/subscription/status/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  try {
    // 1. Fetch current subscription
    const subRes = await pool.query(
      `SELECT plan, subscription_status, subscription_started_at, subscription_expires_at, razorpay_order_id 
       FROM public.subscriptions 
       WHERE user_id = $1`,
      [userId]
    );

    let plan = 'free';
    let status = 'free';
    let startedAt = null;
    let expiresAt = null;

    if (subRes.rows.length > 0) {
      const row = subRes.rows[0];
      plan = row.plan || 'free';
      status = row.subscription_status || 'free';
      startedAt = row.subscription_started_at;
      expiresAt = row.subscription_expires_at;

      // Check for expiration
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        plan = 'free';
        status = 'expired';
        // Auto-update expired status in database
        await pool.query(
          `UPDATE public.subscriptions 
           SET plan = 'free', subscription_status = 'expired', updated_at = NOW() 
           WHERE user_id = $1`,
          [userId]
        );
      }
    } else {
      // Auto-insert default free subscription
      try {
        await pool.query(
          `INSERT INTO public.subscriptions (user_id, plan, subscription_status) 
           VALUES ($1, 'free', 'free') 
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );
      } catch (insertErr: any) {
        // Safe ignore if user is not yet committed in auth.users
        console.warn('Could not auto-insert subscription:', insertErr.message);
      }
    }

    // 2. Count invoices created in current calendar month
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM public.invoices i
       JOIN public.businesses b ON i.business_id = b.id
       WHERE b.owner_id = $1
       AND i.created_at >= date_trunc('month', timezone('utc', now()))`,
      [userId]
    );

    const monthlyUsage = Number(countRes.rows[0]?.count) || 0;
    const isPro = plan === 'pro' && status === 'pro';
    const maxInvoices = isPro ? null : 5;
    const canCreateInvoice = isPro || monthlyUsage < 5;

    res.json({
      userId,
      plan,
      status,
      isPro,
      monthlyUsage,
      maxInvoices,
      canCreateInvoice,
      startedAt,
      expiresAt,
    });
  } catch (err: any) {
    console.error('Error fetching subscription status:', err.message);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * POST /api/subscription/create-order
 * Creates a server-side verified Razorpay Order for Pro upgrade (₹99)
 */
app.post('/api/subscription/create-order', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    res.status(503).json({
      error:
        'Razorpay keys are not yet configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to activate payments.',
    });
    return;
  }

  try {
    const amountInPaise = 99 * 100; // ₹99 = 9900 paise
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${userId.slice(0, 4)}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        plan: 'pro',
      },
    });

    // Record order creation in payment audit log
    await pool.query(
      `INSERT INTO public.subscription_payments 
       (user_id, razorpay_order_id, amount, currency, status, receipt) 
       VALUES ($1, $2, $3, 'INR', 'pending', $4)`,
      [userId, order.id, 99.0, receipt]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

/**
 * POST /api/subscription/verify-payment
 * Cryptographically verifies Razorpay payment signature before granting Pro status
 */
app.post('/api/subscription/verify-payment', async (req: Request, res: Response) => {
  const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing required payment verification parameters' });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({ error: 'Server payment configuration missing' });
    return;
  }

  try {
    // 1. Generate expected HMAC SHA256 signature
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    // 2. Constant-time signature comparison to prevent timing attacks
    const genBuf = Buffer.from(generatedSignature, 'utf-8');
    const sigBuf = Buffer.from(razorpay_signature, 'utf-8');
    const isSignatureValid =
      genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);

    if (!isSignatureValid) {
      await pool.query(
        `UPDATE public.subscription_payments 
         SET status = 'failed' 
         WHERE razorpay_order_id = $1`,
        [razorpay_order_id]
      );
      res.status(400).json({ error: 'Payment signature verification failed' });
      return;
    }

    // 3. Signature is verified! Update payment record
    await pool.query(
      `UPDATE public.subscription_payments 
       SET status = 'captured', razorpay_payment_id = $1, razorpay_signature = $2 
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // 4. Upgrade user's subscription to Pro for 30 days
    await pool.query(
      `INSERT INTO public.subscriptions 
       (user_id, plan, subscription_status, subscription_started_at, subscription_expires_at, razorpay_order_id, updated_at) 
       VALUES ($1, 'pro', 'pro', NOW(), NOW() + INTERVAL '30 days', $2, NOW()) 
       ON CONFLICT (user_id) DO UPDATE SET 
         plan = 'pro', 
         subscription_status = 'pro', 
         subscription_started_at = NOW(), 
         subscription_expires_at = NOW() + INTERVAL '30 days', 
         razorpay_order_id = $2, 
         updated_at = NOW()`,
      [userId, razorpay_order_id]
    );

    // 5. Create notification for user
    await pool.query(
      `INSERT INTO public.notifications (business_id, user_id, type, title, message)
       SELECT b.id, $1, 'subscription', 'Upgraded to Pro Plan', 'Your InvoiceForge Pro subscription is now active with unlimited invoices.'
       FROM public.businesses b WHERE b.owner_id = $1 LIMIT 1`,
      [userId]
    );

    res.json({
      success: true,
      plan: 'pro',
      status: 'pro',
      message: 'Payment verified successfully! Welcome to InvoiceForge Pro.',
    });
  } catch (err: any) {
    console.error('Error verifying payment:', err.message);
    res.status(500).json({ error: 'Server error during payment verification' });
  }
});

/**
 * GET /api/subscription/history/:userId
 * Retrieves user's payment records securely without sensitive credentials
 */
app.get('/api/subscription/history/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  try {
    const historyRes = await pool.query(
      `SELECT id, razorpay_order_id, razorpay_payment_id, razorpay_subscription_id, amount, currency, status, receipt, created_at
       FROM public.subscription_payments
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ payments: historyRes.rows });
  } catch (err: any) {
    console.error('Error fetching payment history:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * POST /api/subscription/webhook
 * Handles Razorpay webhook events securely (order.paid, payment.captured, etc.)
 */
app.post('/api/subscription/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!webhookSecret || !signature) {
    res.status(400).json({ error: 'Missing webhook signature or secret configuration' });
    return;
  }

  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf-8');
    const sigBuf = Buffer.from(signature, 'utf-8');

    if (
      expBuf.length !== sigBuf.length ||
      !crypto.timingSafeEqual(expBuf, sigBuf)
    ) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const notes = paymentEntity?.notes || {};
      const userId = notes.userId;

      if (userId && orderId) {
        await pool.query(
          `INSERT INTO public.subscriptions 
           (user_id, plan, subscription_status, subscription_started_at, subscription_expires_at, razorpay_order_id, updated_at) 
           VALUES ($1, 'pro', 'pro', NOW(), NOW() + INTERVAL '30 days', $2, NOW()) 
           ON CONFLICT (user_id) DO UPDATE SET 
             plan = 'pro', 
             subscription_status = 'pro', 
             subscription_started_at = NOW(), 
             subscription_expires_at = NOW() + INTERVAL '30 days', 
             razorpay_order_id = $2, 
             updated_at = NOW()`,
          [userId, orderId]
        );
      }
    } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const subscriptionEntity = payload.subscription?.entity;
      const subId = subscriptionEntity?.id;
      if (subId) {
        await pool.query(
          `UPDATE public.subscriptions 
           SET plan = 'free', subscription_status = 'cancelled', updated_at = NOW() 
           WHERE razorpay_subscription_id = $1`,
          [subId]
        );
      }
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook processing error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/* ==========================================================================
   VITE DEV / PRODUCTION STATIC SERVER
   ========================================================================== */

const startServer = async () => {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await import('vite');
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteDevServer.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoiceForge server running on port ${PORT} [${isDev ? 'Development' : 'Production'}]`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
