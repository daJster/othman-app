#!/usr/bin/env node
/**
 * Local preview for the static Expo web export.
 *
 * It mirrors the Firebase Hosting rules in `firebase.json`: real generated
 * route files first (including the dynamic reader shell), then the SPA
 * fallback. That makes it possible to prove direct navigation and refresh
 * before a deploy, without a Firebase login.
 *
 * Usage: `npm run preview:web` (defaults to http://localhost:8088).
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? process.argv[2] ?? 8088);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function fileAt(pathname) {
  const candidate = normalize(join(root, pathname));

  if (!candidate.startsWith(root)) return null;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;

  return candidate;
}

function resolveRequest(pathname) {
  // Firebase `cleanUrls: true` maps `/quran` to `quran.html`.
  const direct = fileAt(pathname);
  if (direct) return direct;

  if (!extname(pathname)) {
    const clean = fileAt(`${pathname}.html`);
    if (clean) return clean;
  }

  // Dynamic reader shell: `/reader/12` → `reader/[page].html`.
  if (pathname.startsWith('/reader/')) {
    const shell = fileAt('/reader/[page].html');
    if (shell) return shell;
  }

  return fileAt('/index.html');
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const file = resolveRequest(pathname);

  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found. Run `npm run build:web` first.');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, () => {
  console.log(`Web preview: http://localhost:${port}`);
  console.log(`Serving:     ${root}`);
});
