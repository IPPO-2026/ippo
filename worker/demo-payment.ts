import { ipBucket } from './budget';
import type { Env } from './index';

const DEMO_AMOUNT = 1000;
const EXTRA_USES = 10;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (text.length > 4096) return null;
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function paymentKeyHash(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`payment:${value}`));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function paymentReady(env: Env): env is Env & {
  DB: D1Database;
  IP_HASH_SECRET: string;
  TOSS_TEST_SECRET_KEY: string;
} {
  return Boolean(
    env.DB &&
      env.IP_HASH_SECRET &&
      env.IP_HASH_SECRET.length >= 32 &&
      env.TOSS_TEST_SECRET_KEY,
  );
}

export async function grantedUses(
  db: D1Database,
  bucket: string,
  day: string,
): Promise<number> {
  const row = await db
    .prepare(
      'SELECT COALESCE(SUM(extra_uses), 0) AS uses FROM demo_payment_grants WHERE ip_bucket = ? AND day = ?',
    )
    .bind(bucket, day)
    .first<{ uses: number }>();
  return Math.min(Number(row?.uses) || 0, EXTRA_USES);
}

export async function createDemoOrder(
  request: Request,
  env: Env,
  ip: string,
): Promise<Response> {
  const body = await readJson(request);
  if (!body || (body.locale !== 'ko' && body.locale !== 'ja')) {
    return json({ code: 'invalid_request' }, 400);
  }
  if (!paymentReady(env)) return json({ code: 'payment_unavailable' }, 503);

  const now = Math.floor(Date.now() / 1000);
  const day = new Date(now * 1000).toISOString().slice(0, 10);
  const bucket = await ipBucket(ip, env.IP_HASH_SECRET, day);
  if (await grantedUses(env.DB, bucket, day)) {
    return json({ code: 'topup_already_used' }, 409);
  }

  const pending = await env.DB
    .prepare(
      `SELECT order_id FROM demo_payment_orders
       WHERE ip_bucket = ? AND expires_at > ? AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(bucket, now)
    .first<{ order_id: string }>();
  if (pending) {
    return json({ orderId: pending.order_id, amount: DEMO_AMOUNT, extraUses: EXTRA_USES });
  }

  const orderId = `IPPO_DEMO_${crypto.randomUUID().replaceAll('-', '')}`;
  await env.DB
    .prepare(
      `INSERT INTO demo_payment_orders
       (order_id, ip_bucket, amount, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(orderId, bucket, DEMO_AMOUNT, now, now + 3600)
    .run();
  return json({ orderId, amount: DEMO_AMOUNT, extraUses: EXTRA_USES });
}

export async function confirmDemoPayment(
  request: Request,
  env: Env,
  ip: string,
): Promise<Response> {
  const body = await readJson(request);
  const paymentKey = body?.paymentKey;
  const orderId = body?.orderId;
  const amount = body?.amount;
  if (
    typeof paymentKey !== 'string' ||
    paymentKey.length < 10 ||
    paymentKey.length > 200 ||
    typeof orderId !== 'string' ||
    !/^IPPO_DEMO_[A-Za-z0-9_-]{16,54}$/.test(orderId) ||
    amount !== DEMO_AMOUNT
  ) {
    return json({ code: 'invalid_payment' }, 400);
  }
  if (!paymentReady(env)) return json({ code: 'payment_unavailable' }, 503);

  const now = Math.floor(Date.now() / 1000);
  const day = new Date(now * 1000).toISOString().slice(0, 10);
  const bucket = await ipBucket(ip, env.IP_HASH_SECRET, day);
  const existing = await env.DB
    .prepare(
      'SELECT extra_uses FROM demo_payment_grants WHERE order_id = ? AND ip_bucket = ? AND day = ?',
    )
    .bind(orderId, bucket, day)
    .first<{ extra_uses: number }>();
  if (existing) return json({ granted: true, extraUses: existing.extra_uses });

  const order = await env.DB
    .prepare(
      `SELECT amount FROM demo_payment_orders
       WHERE order_id = ? AND ip_bucket = ? AND amount = ?
         AND expires_at > ? AND used_at IS NULL`,
    )
    .bind(orderId, bucket, DEMO_AMOUNT, now)
    .first<{ amount: number }>();
  if (!order) return json({ code: 'invalid_payment' }, 400);

  let approval: Response;
  try {
    approval = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${env.TOSS_TEST_SECRET_KEY}:`)}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': orderId,
      },
      body: JSON.stringify({ paymentKey, orderId, amount: DEMO_AMOUNT }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return json({ code: 'payment_unavailable' }, 503);
  }
  if (!approval.ok) return json({ code: 'payment_failed' }, 400);

  const approved = await approval.json() as {
    paymentKey?: unknown;
    orderId?: unknown;
    totalAmount?: unknown;
    status?: unknown;
  };
  if (
    approved.paymentKey !== paymentKey ||
    approved.orderId !== orderId ||
    approved.totalAmount !== DEMO_AMOUNT ||
    approved.status !== 'DONE'
  ) {
    return json({ code: 'payment_failed' }, 400);
  }

  const grant = await env.DB
    .prepare(
      `INSERT INTO demo_payment_grants
       (payment_key_hash, order_id, ip_bucket, day, extra_uses, created_at, expires_at)
       SELECT ?, order_id, ip_bucket, ?, ?, ?, ?
       FROM demo_payment_orders
       WHERE order_id = ? AND ip_bucket = ? AND used_at IS NULL
       ON CONFLICT DO NOTHING
       RETURNING extra_uses`,
    )
    .bind(
      await paymentKeyHash(paymentKey, env.IP_HASH_SECRET),
      day,
      EXTRA_USES,
      now,
      now + 2 * 86400,
      orderId,
      bucket,
    )
    .first<{ extra_uses: number }>();
  if (grant) {
    await env.DB
      .prepare('UPDATE demo_payment_orders SET used_at = ? WHERE order_id = ? AND used_at IS NULL')
      .bind(now, orderId)
      .run();
    return json({ granted: true, extraUses: grant.extra_uses });
  }

  const raced = await env.DB
    .prepare(
      'SELECT extra_uses FROM demo_payment_grants WHERE order_id = ? AND ip_bucket = ? AND day = ?',
    )
    .bind(orderId, bucket, day)
    .first<{ extra_uses: number }>();
  return raced
    ? json({ granted: true, extraUses: raced.extra_uses })
    : json({ code: 'topup_already_used' }, 409);
}
