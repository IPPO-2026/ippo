import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('dist-pages', { recursive: true, force: true });
await mkdir('dist-pages');
await cp('dist', 'dist-pages', { recursive: true });
await cp('pages/_worker.js', 'dist-pages/_worker.js');
await writeFile('dist-pages/_routes.json', JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
