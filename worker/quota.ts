import { dailyLimit, ipBucket } from './budget';
import { grantedUses } from './demo-payment';
import type { Env } from './index';
import type { ChatQuota } from '../src/shared';

export async function readQuota(env: Env, ip: string): Promise<ChatQuota> {
  if (!env.DB || !env.IP_HASH_SECRET || env.IP_HASH_SECRET.length < 32) throw Error('not_configured');
  const day = new Date().toISOString().slice(0, 10);
  const bucket = await ipBucket(ip, env.IP_HASH_SECRET, day);
  const [personal, global, extra] = await Promise.all([
    env.DB.prepare('SELECT count FROM request_budget WHERE bucket = ?').bind(bucket).first<{ count: number }>(),
    env.DB.prepare('SELECT count FROM request_budget WHERE bucket = ?').bind(`${day}:global`).first<{ count: number }>(),
    grantedUses(env.DB, bucket, day),
  ]);
  const personalRemaining = Math.max(0, dailyLimit(env.DAILY_IP_LIMIT, 10) + extra - (personal?.count ?? 0));
  const globalRemaining = Math.max(0, dailyLimit(env.DAILY_GLOBAL_LIMIT, 60) - (global?.count ?? 0));
  return {
    remaining: Math.min(personalRemaining, globalRemaining),
    limitedBy: globalRemaining < personalRemaining ? 'service' : 'personal',
    resetsAt: Date.parse(`${day}T00:00:00Z`) + 86400000,
  };
}
