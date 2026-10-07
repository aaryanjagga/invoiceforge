// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import pg from "pg";
dotenv.config({ override: true });
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
var createDbPool = () => {
  const DEFAULT_DB_URL = "postgresql://postgres.ebkorrlmqyxnhmtgixvn:%40Aaryanjagga122510030607@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";
  const dbUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;
  try {
    const url = new URL(dbUrl);
    return new pg.Pool({
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, "") || "postgres",
      ssl: { rejectUnauthorized: false }
    });
  } catch (_e) {
    return new pg.Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
  }
};
var pool = createDbPool();
var getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes("your_key_id") || keySecret.includes("your_key_secret")) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};
app.get("/api/subscription/config", (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const isConfigured = Boolean(
    keyId && process.env.RAZORPAY_KEY_SECRET && !keyId.includes("your_key_id") && !process.env.RAZORPAY_KEY_SECRET.includes("your_key_secret")
  );
  res.json({
    keyId: isConfigured ? keyId : "",
    isConfigured,
    planAmount: 99,
    currency: "INR"
  });
});
app.get("/api/subscription/status/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  try {
    const subRes = await pool.query(
      `SELECT plan, subscription_status, subscription_started_at, subscription_expires_at, razorpay_order_id 
       FROM public.subscriptions 
       WHERE user_id = $1`,
      [userId]
    );
    let plan = "free";
    let status = "free";
    let startedAt = null;
    let expiresAt = null;
    if (subRes.rows.length > 0) {
      const row = subRes.rows[0];
      plan = row.plan || "free";
      status = row.subscription_status || "free";
      startedAt = row.subscription_started_at;
      expiresAt = row.subscription_expires_at;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        plan = "free";
        status = "expired";
        await pool.query(
          `UPDATE public.subscriptions 
           SET plan = 'free', subscription_status = 'expired', updated_at = NOW() 
           WHERE user_id = $1`,
          [userId]
        );
      }
    } else {
      try {
        await pool.query(
          `INSERT INTO public.subscriptions (user_id, plan, subscription_status) 
           VALUES ($1, 'free', 'free') 
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );
      } catch (insertErr) {
        console.warn("Could not auto-insert subscription:", insertErr.message);
      }
    }
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM public.invoices i
       JOIN public.businesses b ON i.business_id = b.id
       WHERE b.owner_id = $1
       AND i.created_at >= date_trunc('month', timezone('utc', now()))`,
      [userId]
    );
    const monthlyUsage = Number(countRes.rows[0]?.count) || 0;
    const isPro = plan === "pro" && status === "pro";
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
      expiresAt
    });
  } catch (err) {
    console.error("Error fetching subscription status:", err.message);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});
app.post("/api/subscription/create-order", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    res.status(503).json({
      error: "Razorpay keys are not yet configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to activate payments."
    });
    return;
  }
  try {
    const amountInPaise = 99 * 100;
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${userId.slice(0, 4)}`;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId,
        plan: "pro"
      }
    });
    await pool.query(
      `INSERT INTO public.subscription_payments 
         (user_id, razorpay_order_id, amount, currency, status, receipt) 
         VALUES ($1, $2, $3, 'INR', 'pending', $4)`,
      [userId, order.id, 99, receipt]
    ).catch((dbErr) => {
      console.warn("Could not record pending payment in database:", dbErr.message);
    });
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    const errorDescription = err?.error?.description || err?.message || (typeof err === "string" ? err : "Failed to create payment order");
    console.error("Error creating Razorpay order:", errorDescription, err);
    if (err?.statusCode === 401 || String(errorDescription).toLowerCase().includes("authentication failed")) {
      res.status(401).json({
        error: "Razorpay authentication failed (401). The Key ID or Key Secret in your environment is invalid or expired. Please generate a fresh Key in your Razorpay Dashboard (Settings \u2192 API Keys)."
      });
      return;
    }
    res.status(500).json({ error: errorDescription });
  }
});
app.post("/api/create-order", async (req, res) => {
  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    res.status(401).json({ error: "Razorpay keys are not configured or invalid" });
    return;
  }
  try {
    const rawAmount = req.body.amount;
    const amount = Number(rawAmount) || 9900;
    const currency = (req.body.currency || "INR").toUpperCase();
    const receipt = req.body.receipt || `rcpt_${Date.now()}`;
    const notes = req.body.notes || {};
    if (amount < 100) {
      res.status(400).json({ error: "Minimum amount must be at least 100 paise (\u20B91)" });
      return;
    }
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: String(receipt).slice(0, 40),
      notes
    });
    res.json({
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    const errorDescription = err?.error?.description || err?.message || (typeof err === "string" ? err : "Failed to create Razorpay order");
    console.error("Error creating Razorpay order:", errorDescription, err);
    if (err?.statusCode === 401 || String(errorDescription).toLowerCase().includes("authentication failed")) {
      res.status(401).json({
        error: "Razorpay authentication failed (401). The Key ID or Key Secret is invalid or expired. Please generate a fresh Key in your Razorpay Dashboard (Settings \u2192 API Keys)."
      });
      return;
    }
    res.status(500).json({ error: errorDescription });
  }
});
app.post("/api/verify-payment", async (req, res) => {
  const order_id = req.body.razorpay_order_id || req.body.order_id;
  const payment_id = req.body.razorpay_payment_id || req.body.payment_id;
  const signature = req.body.razorpay_signature || req.body.signature;
  const userId = req.body.userId;
  if (!order_id || !payment_id || !signature) {
    res.status(400).json({
      success: false,
      error: "Missing required parameters: order_id, payment_id, and signature are required"
    });
    return;
  }
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({ success: false, error: "Server payment configuration missing" });
    return;
  }
  try {
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${order_id}|${payment_id}`);
    const generatedSignature = hmac.digest("hex");
    const genBuf = Buffer.from(generatedSignature, "utf-8");
    const sigBuf = Buffer.from(signature, "utf-8");
    const isValid = genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);
    if (!isValid) {
      if (userId) {
        await pool.query(`UPDATE public.subscription_payments SET status = 'failed' WHERE razorpay_order_id = $1`, [
          order_id
        ]).catch(() => {
        });
      }
      res.status(400).json({
        success: false,
        error: "Payment verification failed: signature mismatch"
      });
      return;
    }
    if (userId) {
      await pool.query(
        `UPDATE public.subscription_payments 
           SET status = 'captured', razorpay_payment_id = $1, razorpay_signature = $2 
           WHERE razorpay_order_id = $3`,
        [payment_id, signature, order_id]
      ).catch(() => {
      });
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
        [userId, order_id]
      ).catch(() => {
      });
    }
    res.json({
      success: true,
      message: "Payment verified successfully",
      payment_id,
      order_id
    });
  } catch (err) {
    console.error("Error verifying payment:", err.message);
    res.status(500).json({ success: false, error: "Internal server error verifying payment" });
  }
});
app.post("/api/subscription/simulate-test-upgrade", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  try {
    const testOrderId = `test_order_${Date.now()}`;
    const testPaymentId = `test_pay_${Date.now()}`;
    await pool.query(
      `INSERT INTO public.subscription_payments 
         (user_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, receipt) 
         VALUES ($1, $2, $3, 99.0, 'INR', 'captured', 'test_mode')`,
      [userId, testOrderId, testPaymentId]
    ).catch(() => {
    });
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
      [userId, testOrderId]
    );
    res.json({
      success: true,
      message: "Test Pro Plan activated successfully for 30 days."
    });
  } catch (err) {
    console.error("Test upgrade error:", err);
    res.status(500).json({ error: "Failed to activate test subscription" });
  }
});
app.post("/api/subscription/verify-payment", async (req, res) => {
  const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing required payment verification parameters" });
    return;
  }
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({ error: "Server payment configuration missing" });
    return;
  }
  try {
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");
    const genBuf = Buffer.from(generatedSignature, "utf-8");
    const sigBuf = Buffer.from(razorpay_signature, "utf-8");
    const isSignatureValid = genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);
    if (!isSignatureValid) {
      await pool.query(
        `UPDATE public.subscription_payments 
         SET status = 'failed' 
         WHERE razorpay_order_id = $1`,
        [razorpay_order_id]
      );
      res.status(400).json({ error: "Payment signature verification failed" });
      return;
    }
    await pool.query(
      `UPDATE public.subscription_payments 
       SET status = 'captured', razorpay_payment_id = $1, razorpay_signature = $2 
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );
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
    await pool.query(
      `INSERT INTO public.notifications (business_id, user_id, type, title, message)
       SELECT b.id, $1, 'subscription', 'Upgraded to Pro Plan', 'Your InvoiceForge Pro subscription is now active with unlimited invoices.'
       FROM public.businesses b WHERE b.owner_id = $1 LIMIT 1`,
      [userId]
    );
    res.json({
      success: true,
      plan: "pro",
      status: "pro",
      message: "Payment verified successfully! Welcome to InvoiceForge Pro."
    });
  } catch (err) {
    console.error("Error verifying payment:", err.message);
    res.status(500).json({ error: "Server error during payment verification" });
  }
});
app.get("/api/subscription/history/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
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
  } catch (err) {
    console.error("Error fetching payment history:", err.message);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});
app.post("/api/subscription/webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  if (!webhookSecret || !signature) {
    res.status(400).json({ error: "Missing webhook signature or secret configuration" });
    return;
  }
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const expBuf = Buffer.from(expectedSignature, "utf-8");
    const sigBuf = Buffer.from(signature, "utf-8");
    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }
    const event = req.body.event;
    const payload = req.body.payload;
    if (event === "payment.captured" || event === "order.paid") {
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
    } else if (event === "subscription.cancelled" || event === "subscription.halted") {
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
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
var startServer = async () => {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(viteDevServer.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      console.warn(`[InvoiceForge] dist/index.html not found. Building client bundle dynamically...`);
      try {
        const { execSync } = await import("child_process");
        execSync("npx vite build", { stdio: "inherit" });
      } catch (buildErr) {
        console.error("[InvoiceForge] Dynamic build error:", buildErr.message);
      }
    }
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"/><title>Build Required</title></head>
            <body style="font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;padding:40px;text-align:center;">
              <h1 style="color:#6366f1;">InvoiceForge Deployment Initializing</h1>
              <p>The client bundle (<code>dist/index.html</code>) was not found.</p>
              <p>In your Render Web Service settings, please ensure your <strong>Build Command</strong> is set to:<br/><br/>
                 <code style="background:#1e293b;padding:8px 16px;border-radius:8px;color:#38bdf8;">npm install && npm run build</code>
              </p>
            </body>
          </html>
        `);
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InvoiceForge server running on port ${PORT} [${isDev ? "Development" : "Production"}]`);
  });
};
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
