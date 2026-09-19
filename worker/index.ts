import { MAX_CONTEXT_CHARACTERS, MAX_MESSAGE_LENGTH } from '../src/shared';
import type { Locale } from '../src/shared';
import { demoReply, extractMissionReply, parseChatRequest, systemPrompt } from './policy';
import { dailyLimit, ipBucket, reserve } from './budget';

export interface Env {
  ASSETS: Fetcher;
  CHAT_MODE?: string;
  AI?: { run(model: string, inputs: Record<string, unknown>): Promise<unknown> };
  DB?: D1Database;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  IP_HASH_SECRET?: string;
  DAILY_GLOBAL_LIMIT?: string;
  DAILY_IP_LIMIT?: string;
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extra } });
}
const errors = {
  invalid_request: ['入力内容を確認して、もう一度お試しください。', '입력 내용을 확인하고 다시 시도해 주세요.'],
  consent_required: ['AIへの送信には同意が必要です。', 'AI 전송에 동의가 필요해요.'],
  forbidden: ['このページからもう一度お試しください。', '앱 화면에서 다시 시도해 주세요.'],
  verification_required: ['確認を完了してから送信してください。', '사람 확인을 마친 뒤 전송해 주세요.'],
  not_configured: ['AIの準備中です。小さな一歩は引き続き使えます。', 'AI 연결을 준비 중이에요. 작은 미션은 계속 이용할 수 있어요.'],
  daily_limit: ['今日のAI利用枠に達しました。午前9時以降にまたお話しできます。', '오늘 AI 이용 한도에 도달했어요. 오전 9시 이후 다시 대화할 수 있어요.'],
  provider_unavailable: ['今はAIにつながりません。少し時間をおいてお試しください。', '지금은 AI에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.'],
} as const;
function fail(code: keyof typeof errors, status: number, locale: Locale = 'ja', extra?: Record<string, string>): Response {
  return json({ code, error: errors[code][locale === 'ko' ? 1 : 0] }, status, extra);
}

async function boundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new Error('too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname === '/api/config' && request.method === 'GET') {
      return json({ mode: env.CHAT_MODE === 'live' ? 'live' : 'demo', turnstileSiteKey: env.TURNSTILE_SITE_KEY || null, maxMessageLength: MAX_MESSAGE_LENGTH, maxContextCharacters: MAX_CONTEXT_CHARACTERS });
    }
    if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true, service: 'ippo', mode: env.CHAT_MODE === 'live' ? 'live' : 'demo' });
    if (url.pathname !== '/api/chat') return json({ code: 'not_found' }, 404);
    if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405, { Allow: 'POST' });
    if (request.headers.get('Origin') !== url.origin) return fail('forbidden', 403);
    if (request.headers.get('Content-Type')?.toLowerCase().split(';')[0].trim() !== 'application/json') return fail('invalid_request', 415);
    let raw: unknown;
    try { raw = await boundedJson(request); } catch { return fail('invalid_request', 400); }
    const locale = (raw as { locale?: string } | null)?.locale === 'ko' ? 'ko' : 'ja';
    if ((raw as { consent?: unknown } | null)?.consent !== true) return fail('consent_required', 400, locale);
    const body = parseChatRequest(raw);
    if (!body) return fail('invalid_request', 400, locale);
    if (env.CHAT_MODE !== 'live') return json({ mode: 'demo', message: demoReply(locale) });
    if (!env.AI || !env.DB || !env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY || !env.IP_HASH_SECRET || env.IP_HASH_SECRET.length < 32) return fail('not_configured', 503, locale);
    // CF-Connecting-IP is supplied by the Cloudflare edge, never by the client payload.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip || !body.turnstileToken) return fail('verification_required', 403, locale);
    try {
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken, remoteip: ip }),
        signal: AbortSignal.timeout(8000),
      });
      if (!verification.ok) return fail('verification_required', 403, locale);
      const result = await verification.json() as { success?: boolean; hostname?: string; action?: string };
      if (result.success !== true || result.hostname !== url.hostname || result.action !== 'chat') return fail('verification_required', 403, locale);
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const midnight = Date.parse(`${day}T00:00:00Z`);
      const expiresAt = Math.floor(midnight / 1000) + 2 * 86400;
      const personal = await reserve(env.DB, await ipBucket(ip, env.IP_HASH_SECRET, day), dailyLimit(env.DAILY_IP_LIMIT, 10), expiresAt);
      const global = personal && await reserve(env.DB, `${day}:global`, dailyLimit(env.DAILY_GLOBAL_LIMIT, 60), expiresAt);
      if (!global) return fail('daily_limit', 429, locale, { 'Retry-After': String(Math.ceil((midnight + 86400000 - now.getTime()) / 1000)) });
      const reply = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
        messages: [{ role: 'system', content: systemPrompt(body) }, ...body.messages], max_tokens: 384, temperature: 0.6,
      });
      const answer = extractMissionReply(reply, body.allowMission === true);
      return answer ? json({ mode: 'live', ...answer }) : fail('provider_unavailable', 503, locale);
    } catch {
      // Never log prompts, provider error payloads, IP addresses or tokens.
      // Quota/db/provider failures fail closed; never switch to an unbounded provider.
      return fail('provider_unavailable', 503, locale);
    }
  },
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    if (env.DB) await env.DB.prepare('DELETE FROM request_budget WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)).run();
  },
};
