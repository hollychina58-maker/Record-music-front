import express, { Router, Request, Response } from 'express';
import { dbGet, dbAll, dbRun, dbBatch } from '../models/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { getPaymentProvider } from '../services/payment/index.js';
import { AlipaySdk } from 'alipay-sdk';

const router = Router();

interface ProductRow { id: number; name: string; type: string; price_cents: number; music_limit: number | null; description: string; }
interface OrderRow { id: number; user_id: number; plan_type: string; amount: number; total_cents: number | null; status: string; payment_provider: string | null; payment_id: string | null; coupon_code: string | null; metadata: string | null; }

router.get('/products', async (_req: Request, res: Response) => {
  const products = await dbAll<ProductRow>('SELECT * FROM products WHERE is_active = 1 ORDER BY price_cents ASC');
  res.json({ success: true, data: products.map((p) => ({
    id: p.id, name: p.name, type: p.type, priceCents: p.price_cents, musicLimit: p.music_limit, description: p.description,
  })) });
});

router.get('/subscription', authMiddleware, async (req: AuthRequest, res: Response) => {
  const sub = await dbGet<any>(`
    SELECT s.*, p.name as plan_name, p.type as plan_type, p.music_limit
    FROM subscriptions s JOIN products p ON s.product_id = p.id
    WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.expires_at DESC LIMIT 1
  `, [req.userId]);

  if (!sub || new Date(sub.expires_at) < new Date()) { res.json({ success: true, data: null }); return; }
  res.json({ success: true, data: { planName: sub.plan_name, planType: sub.plan_type, expiresAt: sub.expires_at, musicRemaining: sub.music_remaining } });
});

router.post('/orders', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, provider = 'paypal', quantity = 1 } = req.body;
    const userId = req.userId!;

    const product = await dbGet<ProductRow>('SELECT * FROM products WHERE id = ? AND is_active = 1', [productId]);
    if (!product) { res.status(400).json({ error: 'Invalid product' }); return; }

    let totalCents = product.price_cents * Math.max(1, parseInt(String(quantity), 10) || 1);
    let isUpgrade = false;

    if (product.type === 'per_use') {
      const unlimitedSub = await dbGet(
        "SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now') AND music_remaining IS NULL",
        [userId]
      );
      if (unlimitedSub) { res.status(400).json({ error: '年度会员无限使用，无需按次购买' }); return; }
    }

    if (product.type !== 'per_use') {
      const activeSub = await dbGet<any>(`
        SELECT s.*, p.name as plan_name, p.type as plan_type, p.price_cents
        FROM subscriptions s JOIN products p ON s.product_id = p.id
        WHERE s.user_id = ? AND s.status = 'active' AND s.expires_at > datetime('now')
        ORDER BY s.expires_at DESC LIMIT 1
      `, [userId]);

      if (activeSub) {
        if (product.type === 'yearly' && activeSub.plan_type === 'monthly') {
          const lastMonthlyOrder = await dbGet<{ total_cents: number | null; amount: number }>(
            "SELECT total_cents, amount FROM orders WHERE user_id = ? AND plan_type IN ('monthly', 'monthly:upgrade') AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
            [userId]
          );
          const paidMonthly = lastMonthlyOrder
            ? (lastMonthlyOrder.total_cents ?? Math.round(lastMonthlyOrder.amount * 100))
            : activeSub.price_cents;
          totalCents = Math.max(0, totalCents - paidMonthly);
          isUpgrade = true;
        } else {
          res.status(400).json({ error: `已有 ${activeSub.plan_name} 订阅（至 ${activeSub.expires_at.slice(0, 10)}），到期后可续费` });
          return;
        }
      }
    }

    let appliedCouponCode: string | null = null;
    if (req.body.couponCode) {
      const coupon = await dbGet<any>(
        "SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (max_uses IS NULL OR used_count < max_uses) AND (valid_from IS NULL OR valid_from <= datetime('now')) AND (valid_until IS NULL OR valid_until >= datetime('now'))",
        [req.body.couponCode]
      );
      if (coupon) {
        const discountPercent = Math.min(99, Math.max(0, coupon.discount_percent || 0));
        if (discountPercent > 0) totalCents = Math.round(totalCents * (100 - discountPercent) / 100);
        if (coupon.discount_cents > 0) totalCents = Math.max(0, totalCents - coupon.discount_cents);
        appliedCouponCode = coupon.code;
      }
    }

    const planType = isUpgrade ? `${product.type}:upgrade` : product.type;
    const purchasedQuantity = product.type === 'per_use' ? Math.max(1, parseInt(String(quantity), 10) || 1) : 1;

    const result = await dbRun(
      `INSERT INTO orders (user_id, plan_type, amount, currency, total_cents, payment_provider, status, coupon_code, metadata)
       VALUES (?, ?, ?, 'CNY', ?, ?, 'pending', ?, ?)`,
      [userId, planType, totalCents / 100, totalCents, provider, appliedCouponCode, JSON.stringify({ quantity: purchasedQuantity })]
    );

    res.json({ success: true, data: { orderId: result.lastInsertRowid, productName: product.name, amountCents: totalCents, provider } });
  } catch (err: any) {
    console.error('[Payment] Create order error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.post('/orders/:id/pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.id);
  const order = await dbGet<OrderRow>('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.userId]);
  if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
  if (order.status !== 'pending') { res.status(400).json({ error: 'Order already processed' }); return; }

  const providerName = order.payment_provider || 'paypal';
  try {
    const provider = getPaymentProvider(providerName);
    const amountCents = order.total_cents ?? Math.round(order.amount * 100);
    const result = await provider.createPayment({ orderId: order.id, amountCents, currency: 'CNY', description: `墨韵 - ${order.plan_type}` });
    await dbRun('UPDATE orders SET payment_id = ? WHERE id = ?', [result.providerOrderId, orderId]);
    res.json({ success: true, data: { redirectUrl: result.redirectUrl, qrCode: result.qrCode, providerOrderId: result.providerOrderId } });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment initiation failed' });
  }
});

async function activateOrder(order: OrderRow): Promise<void> {
  const baseType = order.plan_type.replace(':upgrade', '');
  const product = await dbGet<ProductRow>('SELECT * FROM products WHERE type = ? AND is_active = 1 LIMIT 1', [baseType]);

  const stmts: { sql: string; args?: unknown[] }[] = [
    { sql: "UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [order.id] },
  ];

  if (product) {
    if (product.type === 'per_use') {
      const meta = (() => { try { return JSON.parse(order.metadata || '{}'); } catch { return {}; } })();
      const qty = Math.max(1, parseInt(String(meta.quantity ?? 1), 10));
      stmts.push({ sql: 'UPDATE users SET free_music_count = free_music_count + ? WHERE id = ?', args: [(product.music_limit || 1) * qty, order.user_id] });
    } else {
      const days = product.type === 'yearly' ? 365 : 30;
      const existing = await dbGet('SELECT id FROM subscriptions WHERE user_id = ?', [order.user_id]);
      const userRow = await dbGet<{ free_music_count: number }>('SELECT free_music_count FROM users WHERE id = ?', [order.user_id]);
      const carryOver = Math.max(0, userRow?.free_music_count || 0);
      const musicRemaining = product.music_limit !== null ? (product.music_limit + carryOver) : null;

      if (existing) {
        stmts.push({ sql: `UPDATE subscriptions SET product_id = ?, starts_at = datetime('now'), expires_at = datetime('now', '+${days} days'), music_remaining = ?, status = 'active' WHERE user_id = ?`, args: [product.id, musicRemaining, order.user_id] });
      } else {
        stmts.push({ sql: `INSERT INTO subscriptions (user_id, product_id, starts_at, expires_at, music_remaining) VALUES (?, ?, datetime('now'), datetime('now', '+${days} days'), ?)`, args: [order.user_id, product.id, musicRemaining] });
      }
      stmts.push({ sql: 'UPDATE users SET free_music_count = 0 WHERE id = ?', args: [order.user_id] });
    }
  }

  if (order.coupon_code) {
    stmts.push({ sql: "UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND (max_uses IS NULL OR used_count < max_uses)", args: [order.coupon_code] });
  }

  await dbBatch(stmts);
}

router.post('/orders/:id/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.id);
  const order = await dbGet<OrderRow>('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.userId]);
  if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
  if (order.status === 'completed') { res.json({ success: true, data: { orderId, status: 'completed' } }); return; }
  if (order.status !== 'pending') { res.status(400).json({ error: 'Order already processed' }); return; }
  if (!order.payment_id) { res.status(400).json({ error: 'Payment not initiated' }); return; }

  const providerName = order.payment_provider || 'paypal';
  const provider = getPaymentProvider(providerName);

  try {
    const verified = await provider.verifyPayment(order.payment_id);
    if (verified.verified) {
      await activateOrder(order);
      res.json({ success: true, data: { orderId, status: 'completed' } });
    } else {
      res.status(400).json({ success: false, error: 'Payment not completed', notFound: verified.notFound || false, tradeStatus: verified.status });
    }
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Payment verification failed' });
  }
});

router.post('/alipay/notify', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req: Request, res: Response) => {
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf-8') : '';
  if (!rawBody) { res.status(400).send('fail'); return; }

  try {
    const { appId, privateKey, alipayPublicKey } = {
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
    };
    if (!appId || !privateKey || !alipayPublicKey) { res.status(500).send('fail'); return; }

    const isSandbox = process.env.ALIPAY_SANDBOX === 'true';
    const alipay = new AlipaySdk({
      appId,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      alipayPublicKey: alipayPublicKey.replace(/\\n/g, '\n'),
      gateway: isSandbox ? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do' : 'https://openapi.alipay.com/gateway.do',
      signType: 'RSA2',
      timeout: 15000,
    });

    const params = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;
    const signOk = alipay.checkNotifySignV2(params) || alipay.checkNotifySign(rawBody, true);
    if (!signOk) { res.status(400).send('fail'); return; }

    const { trade_status: tradeStatus, out_trade_no: outTradeNo } = params;
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') { res.send('success'); return; }

    const order = await dbGet<OrderRow>("SELECT * FROM orders WHERE payment_id = ? AND status = 'pending'", [outTradeNo]);
    if (!order) { res.send('success'); return; }

    await activateOrder(order);
    console.log('[Alipay Notify] Order activated:', order.id);
    res.send('success');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    console.error('[Alipay Notify] Error:', message);
    res.status(500).send('fail');
  }
});

export default router;
