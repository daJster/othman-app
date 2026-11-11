#!/usr/bin/env node
/**
 * Runs the mock backend and Metro together.
 *
 * `npm run dev` is the single command a reviewer needs: one process owns the
 * API on :9000, the other owns Metro on :8081 (web + native). The Expo process
 * receives `EXPO_PUBLIC_MOCK_BACKEND=1`, which switches the app's repositories
 * and auth service onto the mock server.
 *
 * If :9000 is already taken, the existing server is reused instead of failing
 * the whole command — a second `npm run dev` during a demo should not kill the
 * first one.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const root = resolve(process.cwd());
const children = new Set();
let shuttingDown = false;

let server = null;

function spawnChild(command, args, env = {}, onExit) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: false,
  });

  children.add(child);
  child.on('exit', (code) => {
    children.delete(child);
    onExit?.(code);

    if (!shuttingDown && onExit === undefined && code !== 0 && code !== null) {
      console.error(`[dev] child exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
}

async function isServerUp(timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://localhost:9000/health');
      if (response.ok) return true;
    } catch {
      // not up yet
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

function stopChild(child) {
  if (!child || child.killed) return;

  if (isWindows && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      shell: false,
    });
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) stopChild(child);

  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// 1. API first, so the first render's health poll can succeed.
server = spawnChild(
  process.execPath,
  ['--env-file-if-exists=.env', 'server/mockServer.ts'],
  {},
  (code) => {
    if (!shuttingDown && code !== 0) {
      console.warn(
        '[dev] the mock server exited — is :9000 already in use? Reusing the existing listener.',
      );
    }
  },
);

if (!(await isServerUp())) {
  console.warn(
    '[dev] the mock server did not answer on :9000 — starting Metro anyway.',
  );
}

// If our child died because the port was already in use, leave the existing
// server alone (it is not in `children` anymore).
if (server.exitCode !== null) {
  console.log('[dev] reusing the mock server already listening on :9000');
  server = null;
}

// 2. Metro. `--web` opens the browser; the default serves web and native.
const expoBin = resolve(root, 'node_modules', 'expo', 'bin', 'cli');
const passthrough = process.argv.slice(2);
const expoArgs = [
  '--max-old-space-size=8192',
  existsSync(expoBin) ? expoBin : 'expo',
  'start',
  ...passthrough,
];

spawnChild(
  process.execPath,
  expoArgs,
  { EXPO_PUBLIC_MOCK_BACKEND: '1' },
  (code) => {
    if (!shuttingDown) shutdown(code ?? 0);
  },
);

console.log('');
console.log('  npm run dev');
console.log('  web    http://localhost:8081');
console.log('  api    http://localhost:9000');
console.log('');
