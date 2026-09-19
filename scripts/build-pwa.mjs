import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

async function walk(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(join(directory, entry.name), `${relative}/`));
    else if (!['_headers', 'sw.js'].includes(entry.name)) files.push(relative);
  }
  return files.sort();
}
const files = await walk('dist');
const hash = createHash('sha256');
hash.update(await readFile(new URL(import.meta.url)));
for (const file of files) { hash.update(file); hash.update(await readFile(join('dist', file))); }
const version = hash.digest('hex').slice(0, 16);
const urls = files.map(file => file === 'index.html' ? '/' : `/${file}`);
const sw = `// Generated from the production build. Static application files only.
const CACHE = 'ippo-shell-${version}';
const ASSETS = ${JSON.stringify(urls)};
const STATIC = new Set(ASSETS);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('ippo-shell-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache chat, API/config, POST bodies, Turnstile or third-party responses.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith((async () => (await (await caches.open(CACHE)).match('/')) || fetch(request))());
    return;
  }
  if (STATIC.has(url.pathname) && !url.search) {
    event.respondWith((async () => (await (await caches.open(CACHE)).match(url.pathname)) || fetch(request))());
  }
});
`;
await writeFile('dist/sw.js', sw);
console.log(`PWA shell ${version}: ${urls.length} static files; API and conversations excluded.`);
