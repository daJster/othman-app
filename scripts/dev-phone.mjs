#!/usr/bin/env node
/**
 * Android dev loop for the local emulator (or a USB device).
 *
 * Metro already serves both the web bundle and the native dev client from one
 * port. This script handles the native half so an agent can drive it without
 * an interactive terminal:
 *
 *   node scripts/dev-phone.mjs connect   adb reverse + open the dev client
 *   node scripts/dev-phone.mjs shot      screenshot to .expo/shots/
 *   node scripts/dev-phone.mjs reload    restart the activity (fresh bundle)
 *   node scripts/dev-phone.mjs logs      last lines of the app's logcat
 *   node scripts/dev-phone.mjs info      device + app install state
 *
 * The dev client must be installed first (`npm run android:build`), and Metro
 * must be running (`npm start`).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_ID = 'com.kuttab.othman';
const SCHEME = 'othman';
const DEFAULT_PORT = 8081;

const root = resolve(process.cwd());
const shotDir = join(root, '.expo', 'shots');

/**
 * Resolve `adb` from the environment, `android/local.properties`, or the
 * standard per-user SDK install. Falls back to PATH so a system install works.
 */
function findAdb() {
  const candidates = [];
  for (const key of ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) {
    if (process.env[key])
      candidates.push(join(process.env[key], 'platform-tools'));
  }

  const localProperties = join(root, 'android', 'local.properties');
  if (existsSync(localProperties)) {
    const line = readFileSync(localProperties, 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.startsWith('sdk.dir='));
    if (line) {
      const sdk = line
        .slice('sdk.dir='.length)
        .replace(/\\\\/g, '\\')
        .replace(/\\:/g, ':');
      candidates.push(join(sdk, 'platform-tools'));
    }
  }

  if (process.env.LOCALAPPDATA) {
    candidates.push(
      join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools'),
    );
  }
  candidates.push('/usr/local/share/android-sdk/platform-tools');

  for (const dir of candidates) {
    const exe = join(dir, process.platform === 'win32' ? 'adb.exe' : 'adb');
    if (existsSync(exe)) return exe;
  }
  return 'adb';
}

const adb = findAdb();

function run(args, options = {}) {
  return execFileSync(adb, args, { encoding: 'utf8', ...options }).trim();
}

function tryRun(args) {
  try {
    return run(args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return error.stderr?.toString().trim() ?? '';
  }
}

/** First connected device in `device` state. */
function pickDevice() {
  const output = run(['devices']);
  const devices = output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('\tdevice') || /\sdevice$/.test(line))
    .map((line) => line.split(/\s+/)[0]);

  if (devices.length === 0) {
    throw new Error(
      'No Android device/emulator in "device" state. Start the emulator, then retry.',
    );
  }
  return devices[0];
}

function deviceArgs(serial) {
  return ['-s', serial];
}

function isInstalled(serial) {
  const packages = run([
    ...deviceArgs(serial),
    'shell',
    'pm',
    'list',
    'packages',
  ]);
  return packages
    .split(/\r?\n/)
    .some((line) => line.trim() === `package:${APP_ID}`);
}

function launchUrl(port) {
  const metro = encodeURIComponent(`http://localhost:${port}`);
  return `${SCHEME}://expo-development-client/?url=${metro}`;
}

function connect(port) {
  const serial = pickDevice();
  run([...deviceArgs(serial), 'reverse', `tcp:${port}`, `tcp:${port}`]);

  if (!isInstalled(serial)) {
    console.error(
      `Dev client ${APP_ID} is not installed on ${serial}.\n` +
        'Run `npm run android:build` once (the first build downloads Gradle deps).',
    );
    process.exit(1);
  }

  tryRun([...deviceArgs(serial), 'shell', 'am', 'force-stop', APP_ID]);
  const result = tryRun([
    ...deviceArgs(serial),
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    launchUrl(port),
    APP_ID,
  ]);

  if (/Error|Exception/i.test(result)) {
    console.error(result);
    process.exit(1);
  }

  console.log(`${serial} -> Metro at http://localhost:${port} (${APP_ID})`);
}

function shot(name) {
  const serial = pickDevice();
  mkdirSync(shotDir, { recursive: true });
  const file = join(shotDir, `${name ?? `phone-${Date.now()}`}.png`);
  const png = execFileSync(
    adb,
    [...deviceArgs(serial), 'exec-out', 'screencap', '-p'],
    {
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  writeFileSync(file, png);
  console.log(file);
}

function reload(port) {
  const serial = pickDevice();
  tryRun([...deviceArgs(serial), 'shell', 'am', 'force-stop', APP_ID]);
  tryRun([
    ...deviceArgs(serial),
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    launchUrl(port),
    APP_ID,
  ]);
  console.log(`reloaded ${APP_ID} on ${serial}`);
}

function logs(lines) {
  const serial = pickDevice();
  const pid = tryRun([...deviceArgs(serial), 'shell', 'pidof', APP_ID]);
  if (!pid) {
    console.error(`${APP_ID} is not running. Run \`npm run phone\` first.`);
    process.exit(1);
  }
  const output = run([
    ...deviceArgs(serial),
    'logcat',
    '-d',
    '--pid',
    pid,
    '-t',
    String(lines),
  ]);
  console.log(output);
}

function info() {
  const serial = pickDevice();
  const model = tryRun([
    ...deviceArgs(serial),
    'shell',
    'getprop',
    'ro.product.model',
  ]);
  const sdk = tryRun([
    ...deviceArgs(serial),
    'shell',
    'getprop',
    'ro.build.version.sdk',
  ]);
  console.log(`device   ${serial} (${model}, API ${sdk})`);
  console.log(
    `app      ${isInstalled(serial) ? 'installed' : 'not installed'}`,
  );
  console.log(`adb      ${adb}`);
  console.log(`scheme   ${SCHEME}`);
}

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const command = process.argv[2] ?? 'connect';
const port = Number(argValue('--port', DEFAULT_PORT));

try {
  switch (command) {
    case 'connect':
    case 'start':
      connect(port);
      break;
    case 'shot':
      shot(process.argv[3]);
      break;
    case 'reload':
      reload(port);
      break;
    case 'logs':
      logs(Number(argValue('--lines', 200)));
      break;
    case 'info':
      info();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (error) {
  console.error(error.message ?? error);
  process.exit(1);
}
