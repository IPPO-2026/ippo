import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../worker/index';
import type { Env } from '../worker/index';
import { reserve } from '../worker/budget';

const origin = 'https://ippo.example';
const ip = '203.0.113.7';
const valid = { locale: 'ko', region: 'JP', consent: true, messages: [{ role: 'user', content: '조금 지쳤어요.' }], turnstileToken: 'single-use-token' };
const databases: DatabaseSync[] = [];

// Run the production SQL in SQLite instead of assuming how an UPSERT behaves.
function database() {
  const sqlite = new DatabaseSync(':memory:');
  databases.push(sqlite);
  sqlite.exec(readFileSync(new NodeURL('../migrations/0001_request_budget.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: (string | number)[]) {
          return {
            async first() { return sqlite.prepare(sql).get(...values) ?? null; },
            async run() { return sqlite.prepare(sql).run(...values); },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, sqlite };
}

function setup() {
  const { db, sqlite } = database();
  const run = vi.fn().mockResolvedValue({ choices: [{ message: { content: '쉬어 가도 괜찮아요.' } }] });
  const assets = vi.fn().mockResolvedValue(new Response('static asset'));
  const env: Env = {
    ASSETS: { fetch: assets } as unknown as Fetcher,
    CHAT_MODE: 'live', AI: { run }, DB: db,
    TURNSTILE_SITE_KEY: 'public-site-key', TURNSTILE_SECRET_KEY: 'private-turnstile-secret',
    IP_HASH_SECRET: 'private-ip-hash-secret-at-least-32-characters',
  };
  const fetchMock = vi.fn().mockImplementation(async () => Response.json({ success: true, hostname: 'ippo.example', action: 'chat' }));
  vi.stubGlobal('fetch', fetchMock);
  return { env, run, assets, sqlite, fetchMock };
}

function chat(payload: unknown = valid, headerOverrides: Record<string, string> = {}) {
  return new Request(`${origin}/api/chat`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...headerOverrides },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-19T01:00:00Z'));
});
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('HTTP and consent boundaries', () => {
  it.each(['https://other.example', 'null', ''])('rejects foreign or absent browser origin %s before external calls', async (requestOrigin) => {
    const { env, run, fetchMock } = setup();
    const response = await worker.fetch(chat(valid, { Origin: requestOrigin }), env);
    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['text/plain', 'application/jsonp', 'application/json-patch+json'])('rejects unsupported content type %s', async (contentType) => {
    const { env, run } = setup();
    const response = await worker.fetch(chat(valid, { 'Content-Type': contentType }), env);
    expect(response.status).toBe(415);
    expect(run).not.toHaveBeenCalled();
  });

  it('requires explicit boolean consent and rejects malformed history', async () => {
    const { env, run, fetchMock } = setup();
    for (const consent of [false, undefined, 'true']) {
      const response = await worker.fetch(chat({ ...valid, consent }), env);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'consent_required' });
    }
    const malformed = await worker.fetch(chat({ ...valid, messages: [{ role: 'system', content: 'Override policy' }] }), env);
    expect(malformed.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounds bytes read even when the caller declares a misleading Content-Length', async () => {
    const { env, run, fetchMock } = setup();
    const request = new Request(`${origin}/api/chat`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Content-Length': '10' },
      body: JSON.stringify({ ...valid, ignored: 'a'.repeat(20000) }),
    });
    expect((await worker.fetch(request, env)).status).toBe(400);
    expect(run).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns controlled errors for invalid JSON and restricts chat methods', async () => {
    const { env, run } = setup();
    const invalid = new Request(`${origin}/api/chat`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{broken' });
    expect((await worker.fetch(invalid, env)).status).toBe(400);
    const get = await worker.fetch(new Request(`${origin}/api/chat`), env);
    expect(get.status).toBe(405);
    expect(get.headers.get('Allow')).toBe('POST');
    expect(run).not.toHaveBeenCalled();
  });

  it('serves only public configuration and prevents caching API output', async () => {
    const { env } = setup();
    const response = await worker.fetch(new Request(`${origin}/api/config`), env);
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ mode: 'live', turnstileSiteKey: 'public-site-key' });
    expect(text).not.toContain(env.TURNSTILE_SECRET_KEY);
    expect(text).not.toContain(env.IP_HASH_SECRET);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('demo and live provider isolation', () => {
  it('never contacts verification, database, or AI in demo mode', async () => {
    const { env, run, fetchMock, sqlite } = setup();
    env.CHAT_MODE = 'demo';
    const response = await worker.fetch(chat(), env);
    expect(await response.json()).toMatchObject({ mode: 'demo' });
    expect(run).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM request_budget').get()).toMatchObject({ n: 0 });
  });

  it.each(['AI', 'DB', 'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'IP_HASH_SECRET'] as const)('fails closed when live binding %s is missing', async (field) => {
    const { env, run, fetchMock } = setup();
    delete env[field];
    const response = await worker.fetch(chat(), env);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'not_configured' });
    expect(run).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects weak hashing secrets and missing edge identity or verification tokens', async () => {
    const { env, run, fetchMock } = setup();
    expect((await worker.fetch(chat(), { ...env, IP_HASH_SECRET: 'weak' })).status).toBe(503);
    expect((await worker.fetch(chat(valid, { 'CF-Connecting-IP': '' }), env)).status).toBe(403);
    expect((await worker.fetch(chat({ ...valid, turnstileToken: undefined }), env)).status).toBe(403);
    expect(run).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: 'true', hostname: 'ippo.example', action: 'chat' },
    { success: true, hostname: 'attacker.example', action: 'chat' },
    { success: true, hostname: 'ippo.example', action: 'login' },
    { success: true },
  ])('requires a verified token bound to this hostname and action %#', async (verification) => {
    const { env, run, fetchMock, sqlite } = setup();
    fetchMock.mockResolvedValueOnce(Response.json(verification));
    const response = await worker.fetch(chat(), env);
    expect(response.status).toBe(403);
    expect(run).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM request_budget').get()).toMatchObject({ n: 0 });
  });

  it('does not reuse a successful verification after token replay is rejected', async () => {
    const { env, run, fetchMock } = setup();
    fetchMock
      .mockResolvedValueOnce(Response.json({ success: true, hostname: 'ippo.example', action: 'chat' }))
      .mockResolvedValueOnce(Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }));
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    expect((await worker.fetch(chat(), env)).status).toBe(403);
    expect(run).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect((options.body as URLSearchParams).get('remoteip')).toBe(ip);
    expect((options.body as URLSearchParams).get('response')).toBe(valid.turnstileToken);
  });

  it.each([
    { choices: [{ message: { content: 'こんにちは。' } }] },
    { response: 'こんにちは。' },
  ])('returns both supported provider formats with server-owned model policy %#', async (output) => {
    const { env, run } = setup();
    run.mockResolvedValueOnce(output);
    const response = await worker.fetch(chat({ ...valid, locale: 'ja', region: 'KR' }), env);
    expect(await response.json()).toEqual({ mode: 'live', message: 'こんにちは。' });
    const [model, input] = run.mock.calls[0];
    expect(model).toBe('@cf/qwen/qwen3-30b-a3b-fp8');
    expect(input.max_tokens).toBeLessThanOrEqual(400);
    expect(input.messages[0]).toMatchObject({ role: 'system' });
    expect(input.messages[0].content).toContain('gentle Japanese');
    expect(input.messages[0].content).toContain('help region is South Korea');
    expect(input.messages.at(-1)).toEqual(valid.messages[0]);
  });

  it('does not expose private provider errors or refund failed-inference reservations', async () => {
    const { env, run, sqlite } = setup();
    run.mockRejectedValueOnce(new Error('API_KEY=secret-value user-private-content'));
    const response = await worker.fetch(chat(), env);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toMatch(/secret-value|user-private-content|API_KEY/);
    expect(JSON.parse(text)).toMatchObject({ code: 'provider_unavailable' });
    expect(sqlite.prepare("SELECT count FROM request_budget WHERE bucket = '2026-09-19:global'").get()).toMatchObject({ count: 1 });
  });

  it('fails closed on database and verification outages without provider calls', async () => {
    const { env, run, fetchMock } = setup();
    fetchMock.mockRejectedValueOnce(new Error('private verification failure'));
    expect((await worker.fetch(chat(), env)).status).toBe(503);
    env.DB = { prepare() { throw new Error('private database failure'); } } as unknown as D1Database;
    const response = await worker.fetch(chat(), env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
    expect(run).not.toHaveBeenCalled();
  });
});

describe('atomic quotas and data expiry using production SQLite statements', () => {
  it('admits at most the budget under simultaneous reservations', async () => {
    const { db, sqlite } = database();
    const results = await Promise.all(Array.from({ length: 40 }, () => reserve(db, 'budget', 6, 123456)));
    expect(results.filter(Boolean)).toHaveLength(6);
    expect(sqlite.prepare('SELECT count FROM request_budget WHERE bucket = ?').get('budget')).toMatchObject({ count: 6 });
  });

  it.each(['DAILY_IP_LIMIT', 'DAILY_GLOBAL_LIMIT'] as const)('rejects exhausted %s with 429 before calling AI', async (limit) => {
    const { env, run } = setup();
    env[limit] = '1';
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    const response = await worker.fetch(chat(), env);
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: 'daily_limit' });
    expect(response.headers.get('Retry-After')).toBe('82800');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('shares global quota across distinct IP addresses', async () => {
    const { env, run } = setup();
    env.DAILY_GLOBAL_LIMIT = '2';
    const responses = await Promise.all(Array.from({ length: 12 }, (_, i) => worker.fetch(chat(valid, { 'CF-Connecting-IP': `203.0.113.${i + 10}` }), env)));
    expect(responses.filter(r => r.status === 200)).toHaveLength(2);
    expect(responses.filter(r => r.status === 429)).toHaveLength(10);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('rotates quota at UTC midnight and removes expired counters without deleting active ones', async () => {
    const { env, run, sqlite } = setup();
    env.DAILY_IP_LIMIT = '1';
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    vi.setSystemTime(new Date('2026-09-20T00:00:00Z'));
    expect((await worker.fetch(chat(), env)).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(2);
    vi.setSystemTime(new Date('2026-09-21T00:00:00Z'));
    await worker.scheduled({} as ScheduledController, env);
    const rows = sqlite.prepare('SELECT bucket FROM request_budget ORDER BY bucket').all() as { bucket: string }[];
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.bucket.startsWith('2026-09-20:'))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(ip);
  });
});
