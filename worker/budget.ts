export async function ipBucket(ip: string, secret: string, day: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${day}:${ip}`));
  return `${day}:ip:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
}

// Atomic conditional UPSERT prevents simultaneous requests from exceeding a bucket.
// A rejected global reservation may consume an IP slot; failed inference is not refunded.
export async function reserve(db: D1Database, bucket: string, limit: number, expiresAt: number): Promise<boolean> {
  const row = await db.prepare(`INSERT INTO request_budget (bucket, count, expires_at)
    VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1
    WHERE count < ? RETURNING count`).bind(bucket, expiresAt, limit).first<{ count: number }>();
  return row !== null;
}

export function dailyLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : fallback;
}
