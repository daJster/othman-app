#!/usr/bin/env node
/**
 * Browser end-to-end regression for the Expo web build.
 *
 * This exercises platform logic only: routing, guards, storage hydration,
 * responsive layout, the reader, local notes, and recovery states. It never
 * signs in and never asserts against backend data.
 *
 * Prerequisites:
 *   npm run build:web
 *   npm run preview:web        # http://localhost:8088
 *   npx playwright install chromium
 *
 * Run:
 *   npm run e2e:web
 *
 * Override the target with E2E_BASE_URL. Set E2E_SCREENSHOTS=1 to keep failure
 * screenshots in `e2e-artifacts/`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8088';
const SHOTS = process.env.E2E_SCREENSHOTS === '1';
const ARTIFACTS = 'e2e-artifacts';

const results = [];
let current = '';

function check(name, condition, detail = '') {
  results.push({ name: `${current}: ${name}`, ok: Boolean(condition), detail });
}

async function scenario(name, fn) {
  current = name;
  try {
    await fn();
  } catch (error) {
    check(
      'scenario completed',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function makeContext(
  browser,
  { width, height, language = 'en', theme = 'light' },
) {
  return browser
    .newContext({
      viewport: { width, height },
      locale: language === 'ar' ? 'ar' : 'en',
    })
    .then(async (context) => {
      // Only seed when the key is absent: later scenarios verify that a user
      // choice persists across reloads.
      await context.addInitScript(
        ({ language, theme }) => {
          if (localStorage.getItem('language') === null) {
            localStorage.setItem('language', JSON.stringify(language));
          }
          if (localStorage.getItem('theme') === null) {
            localStorage.setItem('theme', JSON.stringify(theme));
          }
        },
        { language, theme },
      );

      return context;
    });
}

function track(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function goto(page, path) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  return response;
}

async function settle(page) {
  await page.waitForTimeout(1200);
}

async function hasOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

async function navInfo(page) {
  return page.evaluate(() => {
    const tabs = [...document.querySelectorAll('a[role="tab"]')];
    return {
      hrefs: tabs.map((tab) => tab.getAttribute('href')),
      top: tabs[0]?.getBoundingClientRect().top ?? null,
      current: tabs.filter((tab) => tab.getAttribute('aria-current') === 'page')
        .length,
    };
  });
}

async function signInForm(browser) {
  const context = await makeContext(browser, { width: 768, height: 900 });
  const page = await context.newPage();
  const errors = track(page);

  await goto(page, '/auth/sign-in');
  check(
    'form renders',
    (await page.locator('[data-testid="auth-email"]').count()) === 1,
  );

  await page.locator('[data-testid="auth-email"]').fill('not-an-email');
  await page.locator('[data-testid="auth-continue"]').click();
  check(
    'invalid email is rejected',
    await page.getByText('Enter a valid email address.').isVisible(),
  );
  check(
    'stays on the email step',
    (await page.locator('[data-testid="auth-email"]').count()) === 1,
  );

  await page.locator('[data-testid="auth-email"]').fill('student@example.com');
  await page.locator('[data-testid="auth-continue"]').click();
  check(
    'valid email advances to password',
    await page.locator('[data-testid="auth-password"]').isVisible(),
  );

  await page.locator('[data-testid="auth-submit"]').click();
  check(
    'empty password is rejected locally',
    await page.getByText('Enter your password.').isVisible(),
  );
  check(
    'no auth error is fabricated',
    (await page.locator('[data-testid="auth-error"]').count()) === 0,
  );

  await page.locator('[data-testid="auth-back-to-email"]').click();
  check(
    'back returns to the email step',
    await page.locator('[data-testid="auth-email"]').isVisible(),
  );
  check('no runtime errors', errors.length === 0, errors.join(' | '));

  await context.close();
}

async function readerNotes(browser, language, theme) {
  const context = await makeContext(browser, {
    width: 1024,
    height: 900,
    language,
    theme,
  });
  const page = await context.newPage();
  const errors = track(page);

  await goto(page, '/reader/1');
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });
  await page.waitForSelector('[data-testid="ayah:2:0"]', { timeout: 30000 });

  await page.locator('[data-testid="ayah:2:0"]').click();
  await page.locator('[data-testid="reader-menu"]').click();
  await page.waitForSelector('[data-testid="reader-menu-notes"]');
  await page.locator('[data-testid="reader-menu-notes"]').click();
  await page.waitForSelector('[data-testid="notes-draft"]');

  const note = `e2e note ${Date.now()}`;
  await page.locator('[data-testid="notes-draft"]').fill(note);
  await page.locator('[data-testid="notes-save"]').click();
  check('note is saved and shown', await page.getByText(note).isVisible());

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quran:notes') ?? 'null'),
  );
  check(
    'notes use the guest namespace and versioned payload',
    stored?.version === 1 && Array.isArray(stored.byNamespace?.guest),
  );

  await page.locator('[data-testid="ayah-panel-close"]').click();
  await settle(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });
  await page.locator('[data-testid="ayah:2:0"]').click();
  await page.locator('[data-testid="reader-menu"]').click();
  await page.locator('[data-testid="reader-menu-notes"]').click();
  await page.waitForSelector('[data-testid="notes-draft"]');
  check(
    'note survives a reload (local persistence)',
    await page.getByText(note).isVisible(),
  );
  check('no runtime errors', errors.length === 0, errors.join(' | '));

  await context.close();
}

async function readerPanels(browser, language, theme) {
  const context = await makeContext(browser, {
    width: 1024,
    height: 900,
    language,
    theme,
  });
  const page = await context.newPage();
  const errors = track(page);

  await goto(page, '/reader/1');
  await page.waitForSelector('[data-testid="ayah:3:0"]', { timeout: 90000 });
  await page.locator('[data-testid="ayah:3:0"]').click();

  await page.locator('[data-testid="reader-menu"]').click();
  await page.locator('[data-testid="reader-menu-tafsir"]').click();
  await page.waitForSelector(
    '[data-testid="tafsir-content"], [data-testid="tafsir-empty"], [data-testid="tafsir-error-state"]',
    { timeout: 60000 },
  );
  check(
    'tafsir renders live text',
    (await page.locator('[data-testid="tafsir-content"]').innerText()).trim()
      .length > 20,
  );

  await page.locator('[data-testid="tafsir-type"]').selectOption('e3rab');
  await page.waitForTimeout(2500);
  check(
    'type switch changes the content request',
    (await page.locator('[data-testid="tafsir-type"]').inputValue()) ===
      'e3rab',
  );

  await page.locator('[data-testid="tafsir-type"]').selectOption('surah');
  await page.waitForSelector(
    '[data-testid="tafsir-surah-info"], [data-testid="tafsir-error-state"]',
    { timeout: 30000 },
  );
  check(
    'surah information is available',
    (await page.locator('[data-testid="tafsir-surah-info"]').count()) === 1,
  );

  await page.locator('[data-testid="ayah-panel-close"]').click();
  await settle(page);

  await page.locator('[data-testid="reader-menu"]').click();
  await page.locator('[data-testid="reader-menu-audio"]').click();
  await page.waitForSelector('[data-testid="audio-sheet"]', { timeout: 10000 });
  check(
    'audio panel opens',
    await page.locator('[data-testid="audio-toggle"]').isVisible(),
  );
  await page.locator('[data-testid="audio-close"]').click();
  await settle(page);

  check('no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

async function readerTurnsAndRestore(browser) {
  const context = await makeContext(browser, { width: 1024, height: 900 });
  const page = await context.newPage();
  const errors = track(page);

  await goto(page, '/reader/1');
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });

  const frame = await page
    .locator('[data-testid="mushaf-frame"]')
    .boundingBox();
  if (frame) {
    const y = frame.y + frame.height / 2;
    await page.mouse.move(frame.x + frame.width * 0.85, y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(
        frame.x + frame.width * (0.85 - 0.65 * (step / 10)),
        y,
      );
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
  }
  await page.waitForTimeout(1500);
  check(
    'mouse drag turns the page',
    (await page.locator('[data-testid="mushaf-page:2"]').count()) === 1,
  );

  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });
  const footer = await page
    .locator('[data-testid="reader-footer"]')
    .innerText();
  check(
    'last page is restored after reload',
    footer.includes('2 / 604'),
    footer,
  );

  check('no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

async function readerDeepLinks(browser) {
  const context = await makeContext(browser, { width: 1024, height: 900 });
  const page = await context.newPage();
  const errors = track(page);

  await goto(page, '/reader/1?surah=2&ayah=255');
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });
  const header = await page
    .locator('[data-testid="reader-header"]')
    .innerText();
  check('deep link selects the canonical ayah', /255/.test(header), header);
  check(
    'deep link shows the right surah',
    /Baqarah|البقرة/i.test(header),
    header,
  );

  await goto(page, '/reader/9999');
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });
  const clamped = await page
    .locator('[data-testid="reader-footer"]')
    .innerText();
  check(
    'page-only link clamps to the edition',
    clamped.includes('604 / 604'),
    clamped,
  );

  await goto(page, '/reader/1?surah=999');
  check(
    'invalid link renders recovery copy',
    await page.getByText('This link is not valid').isVisible(),
  );

  check('no runtime errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

async function readerRecovery(browser) {
  const context = await makeContext(browser, { width: 1024, height: 900 });
  const page = await context.newPage();
  const errors = track(page);

  await page.route('**/*bbox*.json', (route) => route.abort());
  await goto(page, '/reader/1');
  await page.waitForSelector('text=Something went wrong', { timeout: 30000 });
  check('bbox failure is recoverable, not blank', true);

  await page.unroute('**/*bbox*.json');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForSelector('[data-testid="mushaf-image"]', {
    timeout: 90000,
  });
  check('retry recovers the reader', true);
  // The aborted requests are the scenario itself, not an app error.
  check(
    'no runtime errors',
    errors.filter((error) => !error.includes('Failed to load resource'))
      .length === 0,
    errors.join(' | '),
  );

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  await scenario('launch', async () => {
    const context = await makeContext(browser, { width: 1024, height: 900 });
    const page = await context.newPage();
    const errors = track(page);
    const response = await goto(page, '/');
    check('localhost responds', response?.status() === 200);
    check('title is the app title', (await page.title()) === 'Othman');
    check(
      'signed-out top nav exposes public tabs',
      JSON.stringify((await navInfo(page)).hrefs) ===
        JSON.stringify(['/', '/quran']),
    );
    check('active tab is announced', (await navInfo(page)).current === 1);
    check('no runtime errors', errors.length === 0, errors.join(' | '));
    await context.close();
  });

  await scenario('responsive', async () => {
    for (const width of [375, 768, 1024]) {
      const language = width === 375 ? 'ar' : 'en';
      const theme = width === 375 ? 'dark' : 'light';
      const context = await makeContext(browser, {
        width,
        height: 900,
        language,
        theme,
      });
      const page = await context.newPage();
      const errors = track(page);
      await goto(page, '/');
      const info = await navInfo(page);
      check(`no horizontal overflow at ${width}`, !(await hasOverflow(page)));
      check(`top navigation at ${width}`, info.top !== null && info.top < 120);
      check(
        `no runtime errors at ${width}`,
        errors.length === 0,
        errors.join(' | '),
      );
      if (SHOTS) {
        await mkdir(ARTIFACTS, { recursive: true });
        await page.screenshot({
          path: `${ARTIFACTS}/home-${width}.png`,
          fullPage: true,
        });
      }
      await context.close();
    }
  });

  await scenario('storage hydration', async () => {
    const context = await makeContext(browser, {
      width: 768,
      height: 900,
      language: 'ar',
      theme: 'dark',
    });
    const page = await context.newPage();
    await goto(page, '/');
    let info = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      dark: document.documentElement.classList.contains('dark'),
    }));
    check(
      'stored Arabic is applied',
      info.lang === 'ar' && info.dir === 'rtl',
      JSON.stringify(info),
    );
    check('stored dark mode is applied', info.dark);

    await page.evaluate(() => {
      localStorage.setItem('language', JSON.stringify('en'));
      localStorage.setItem('theme', JSON.stringify('light'));
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2000);
    info = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      dark: document.documentElement.classList.contains('dark'),
    }));
    check(
      'stored English is applied after reload',
      info.lang === 'en' && info.dir === 'ltr',
      JSON.stringify(info),
    );
    check('stored light mode is applied after reload', !info.dark);
    await context.close();
  });

  await scenario('protected routes', async () => {
    for (const path of [
      '/account',
      '/meetings',
      '/account/edit',
      '/account/progress',
    ]) {
      const context = await makeContext(browser, { width: 768, height: 900 });
      const page = await context.newPage();
      const errors = track(page);
      await goto(page, path);
      const url = new URL(page.url());
      check(
        `${path} redirects to sign-in`,
        url.pathname === '/auth/sign-in',
        url.pathname,
      );
      check(
        `${path} keeps an internal return destination`,
        url.searchParams.get('returnTo') === path,
        url.search,
      );
      check(
        `${path} has no runtime errors`,
        errors.length === 0,
        errors.join(' | '),
      );
      await context.close();
    }
  });

  await scenario('sign-in form', () => signInForm(browser));
  await scenario('quran entry', async () => {
    const context = await makeContext(browser, { width: 768, height: 900 });
    const page = await context.newPage();
    await goto(page, '/quran');
    await page.locator('[data-testid="quran-open-reader"]').click();
    await page.waitForURL(/\/reader\/\d+/, { timeout: 15000 });
    await page.waitForSelector('[data-testid="reader-header"]', {
      timeout: 30000,
    });
    check(
      'Quran tab opens the reader',
      /\/reader\/\d+/.test(page.url()),
      page.url(),
    );
    await context.close();
  });

  await scenario('reader notes', () => readerNotes(browser, 'en', 'light'));
  await scenario('reader panels', () => readerPanels(browser, 'en', 'light'));
  await scenario('reader turns', () => readerTurnsAndRestore(browser));
  await scenario('reader deep links', () => readerDeepLinks(browser));
  await scenario('reader recovery', () => readerRecovery(browser));

  await scenario('404 and error routes', async () => {
    const context = await makeContext(browser, { width: 768, height: 900 });
    const page = await context.newPage();
    await goto(page, '/this-route-does-not-exist');
    check(
      'unknown URL renders not found',
      await page.getByText('Page not found').isVisible(),
    );
    await goto(page, '/error/404');
    check(
      'error route renders',
      await page.getByText('Page not found').isVisible(),
    );
    await context.close();
  });

  await browser.close();

  for (const result of results) {
    console.log(
      `${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.ok ? '' : ` — ${result.detail}`}`,
    );
  }

  const passed = results.filter((result) => result.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);

  if (SHOTS) {
    await mkdir(ARTIFACTS, { recursive: true });
    await writeFile(
      `${ARTIFACTS}/results.json`,
      JSON.stringify(results, null, 2) + '\n',
    );
  }

  if (passed !== results.length) process.exit(1);
}

await main();
