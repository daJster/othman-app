#!/usr/bin/env node
/**
 * Static-export regression check (P8.1).
 *
 * Run after `npm run build:web`. It fails when the export is missing a required
 * route, ships the frozen legacy app or a service worker, or when the Firebase
 * hosting rules stop serving generated routes before the SPA fallback.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const dist = join(root, 'dist');
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function ok(message) {
  notes.push(message);
}

function mustFile(relative) {
  const path = join(dist, relative);
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`missing exported file: dist/${relative}`);
    return false;
  }
  ok(`route: ${relative}`);
  return true;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(dist)) {
  fail('dist/ is missing; run `npm run build:web`');
} else {
  [
    'index.html',
    'quran.html',
    'about.html',
    'account.html',
    'meetings.html',
    'auth/sign-in.html',
    'account/edit.html',
    'account/progress.html',
    'reader/[page].html',
  ].forEach(mustFile);

  const files = walk(dist);
  const relative = files.map((path) =>
    path.slice(root.length + 1).split(sep).join('/'),
  );

  const js = relative.filter((path) => path.includes('_expo/static/js/web/'));
  if (js.length === 0) fail('no web JS bundle under dist/_expo/static/js/web');

  const css = relative.filter((path) => path.endsWith('.css'));
  if (css.length === 0) fail('no exported CSS');

  const fonts = relative.filter((path) => path.endsWith('.ttf'));
  if (fonts.length < 3) {
    fail(`expected 3 bundled fonts, found ${fonts.length}`);
  }

  if (relative.some((path) => path.includes('othman-web'))) {
    fail('frozen legacy app leaked into dist/');
  }

  if (
    relative.some((path) =>
      /(^|\/)(sw|service-worker)\.js$|workbox/i.test(path),
    )
  ) {
    fail('service-worker/PWA asset found in dist/');
  }

  const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
  if (!indexHtml.includes('id="root"')) {
    fail('index.html has no root mount node');
  }

  const firebase = JSON.parse(
    readFileSync(join(root, 'firebase.json'), 'utf8'),
  );
  const hosting = firebase.hosting;
  if (!hosting) fail('firebase.json has no hosting block');
  else {
    if (hosting.public !== 'dist') fail('hosting.public must be "dist"');
    if (hosting.cleanUrls !== true) {
      fail('hosting.cleanUrls must be true for generated *.html routes');
    }

    const rewrites = hosting.rewrites ?? [];
    const reader = rewrites.find(
      (rule) => rule.source === '/reader/:page',
    );
    if (!reader || reader.destination !== '/reader/[page].html') {
      fail('missing /reader/:page → reader/[page].html rewrite');
    }

    const fallback = rewrites.at(-1);
    if (!fallback || fallback.source !== '**' || fallback.destination !== '/index.html') {
      fail('catch-all rewrite to /index.html must be last');
    }
    ok(`hosting: ${hosting.public}, cleanUrls, ${rewrites.length} rewrites`);
  }
}

for (const line of notes) console.log(`✓ ${line}`);
for (const line of failures) console.error(`✗ ${line}`);

if (failures.length > 0) {
  console.error(`\nWeb export check failed (${failures.length}).`);
  process.exit(1);
}

console.log('\nWeb export check passed.');
