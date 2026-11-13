// Prepare a versioned human-review worksheet. No network or model calls.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const dataset = JSON.parse(await readFile(new URL('eval/scenarios.json', root), 'utf8'));
const policy = await readFile(new URL('worker/policy.ts', root), 'utf8');
const worker = await readFile(new URL('worker/index.ts', root), 'utf8');
const model = worker.match(/env\.AI\.run\('([^']+)'/)?.[1];
if (!model || dataset.schemaVersion !== 1 || dataset.syntheticOnly !== true || dataset.cases.length !== 24) throw Error('Invalid evaluation manifest');
const ids = new Set();
for (const item of dataset.cases) {
  if (ids.has(item.id) || !['ko', 'ja'].includes(item.locale) || !['KR', 'JP'].includes(item.region) || typeof item.allowMission !== 'boolean' || !item.acceptanceCriteria.length) throw Error(`Invalid case: ${item.id}`);
  ids.add(item.id);
  if (!Array.isArray(item.messages) || !item.messages.length || item.messages.length > 8 || item.messages.at(-1).role !== 'user' || item.messages.some(m => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 1000) || item.messages.reduce((n, m) => n + m.content.length, 0) > 3200) throw Error(`Out-of-bounds context: ${item.id}`);
}
for (const locale of ['ko', 'ja']) {
  if (dataset.cases.filter(c => c.locale === locale).length !== 12 || new Set(dataset.cases.filter(c => c.locale === locale).map(c => c.category)).size !== 12) throw Error(`Missing coverage: ${locale}`);
}
const output = {
  status: 'not_run',
  preparedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  policySha256: createHash('sha256').update(policy).digest('hex'),
  datasetSha256: createHash('sha256').update(JSON.stringify(dataset)).digest('hex'),
  model, maxTokens: 384, temperature: 0.6,
  note: 'Worksheet only. Fill with actual synthetic model responses and bilingual human reviews; preparation is not a safety or clinical evaluation.',
  cases: dataset.cases.map(c => ({ ...c, response: null, responseSource: null, executedAt: null, reviewer: null, scores: { language: null, relevance: null, choice: null, safety: null, format: null }, criticalFailure: null, verdict: 'pending', notes: '' })),
};
const folder = new URL('artifacts/ai-review/', root);
await mkdir(folder, { recursive: true });
await writeFile(new URL('review.json', folder), JSON.stringify(output, null, 2) + '\n');
console.log('Prepared 24 synthetic cases (12 ko / 12 ja), source/model/policy hashes and pending human-review fields. No model called. Output: artifacts/ai-review/review.json');
