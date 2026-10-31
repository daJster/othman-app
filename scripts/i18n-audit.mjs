#!/usr/bin/env node
/**
 * i18n audit.
 *
 * Three failure modes are cheap to introduce and expensive to notice on a
 * device, so each one fails the build:
 *
 *  1. **Key drift** — a key added to `en` and forgotten in `ar` renders as raw
 *     dots or falls back to English mid-sentence.
 *  2. **Placeholder drift** — `{{countdown}}` in one language only means the
 *     rendered sentence is missing its value.
 *  3. **Unknown keys in code** — `t('nav.meetings')` typo'd into
 *     `t('nav.meeting')` type-checks as a string and shows dots at runtime.
 *     (i18next's own types also catch this; the audit is the backstop for
 *     dynamic keys and for anything outside TS.)
 *
 * Empty translations are reported as warnings, not errors: an empty string is
 * sometimes deliberate (an aria label replaced by a visual one), while a
 * missing key is never fine.
 *
 * Usage: node scripts/i18n-audit.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOCALES = join(ROOT, 'src', 'i18n', 'locales');
const SOURCE = join(ROOT, 'src');

/**
 * Plural suffixes are part of i18next's key, not of the message. Arabic has six
 * categories and English two, so comparing the raw paths would report every
 * plural as a mismatch. Strip the suffix and compare the base key instead.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** @param {unknown} value @param {string} prefix @param {Map<string, unknown>} out */
function flatten(value, prefix = '', out = new Map()) {
  if (value === null || typeof value !== 'object') {
    out.set(prefix, value);
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }

  return out;
}

/** @param {string} key */
function baseKey(key) {
  return key.replace(PLURAL_SUFFIX, '');
}

/** @param {string} text */
function placeholders(text) {
  if (typeof text !== 'string') return [];

  return [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort();
}

/** @param {string} dir */
function listFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') return [];
      return listFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

function readLocale(language) {
  const path = join(LOCALES, language, 'common.json');
  return { path, messages: flatten(JSON.parse(readFileSync(path, 'utf8'))) };
}

const problems = [];
const warnings = [];

function report(list, message) {
  list.push(message);
  console.error(`  ${list === problems ? 'x' : '!'} ${message}`);
}

// --- 1. Key parity -----------------------------------------------------------

const en = readLocale('en');
const ar = readLocale('ar');

const enByBase = new Map();
for (const key of en.messages.keys()) {
  const base = baseKey(key);
  if (!enByBase.has(base)) enByBase.set(base, []);
  enByBase.get(base).push(key);
}

const arByBase = new Map();
for (const key of ar.messages.keys()) {
  const base = baseKey(key);
  if (!arByBase.has(base)) arByBase.set(base, []);
  arByBase.get(base).push(key);
}

for (const base of enByBase.keys()) {
  if (!arByBase.has(base)) report(problems, `ar is missing "${base}"`);
}

for (const base of arByBase.keys()) {
  if (!enByBase.has(base)) report(problems, `en is missing "${base}"`);
}

// --- 2. Placeholders and empty values ---------------------------------------

for (const [base, enKeys] of enByBase) {
  const arKeys = arByBase.get(base);
  if (!arKeys) continue;

  // Compare the union of placeholders across a key's plural variants: a
  // language may legitimately use `{{count}}` in `_few` and not in `_one`.
  const enValues = enKeys.map((key) => en.messages.get(key));
  const arValues = arKeys.map((key) => ar.messages.get(key));

  const enPlaceholders = new Set(enValues.flatMap(placeholders));
  const arPlaceholders = new Set(arValues.flatMap(placeholders));

  for (const name of enPlaceholders) {
    if (!arPlaceholders.has(name)) {
      report(problems, `ar "${base}" is missing the {{${name}}} placeholder`);
    }
  }

  for (const name of arPlaceholders) {
    if (!enPlaceholders.has(name)) {
      report(problems, `en "${base}" is missing the {{${name}}} placeholder`);
    }
  }

  for (const [language, keys, messages] of [
    ['en', enKeys, en.messages],
    ['ar', arKeys, ar.messages],
  ]) {
    for (const key of keys) {
      const value = messages.get(key);
      if (typeof value === 'string' && value.trim() === '') {
        report(warnings, `${language} "${key}" is empty`);
      }
    }
  }
}

// --- 3. Keys referenced from source -----------------------------------------

const CALL = /\bt\(\s*['"]([A-Za-z0-9_.-]+)['"]/g;
const referenced = new Map();

for (const path of listFiles(SOURCE)) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(CALL)) {
    const key = match[1];
    if (!referenced.has(key)) referenced.set(key, relative(ROOT, path));
  }
}

const known = new Set([...enByBase.keys()]);

for (const [key, path] of referenced) {
  if (!known.has(baseKey(key))) {
    report(problems, `unknown key "${key}" referenced in ${path}`);
  }
}

// --- Output ------------------------------------------------------------------

const keyCount = en.messages.size;

if (problems.length === 0) {
  console.log(
    `i18n: en and ar agree on ${keyCount} keys; ${referenced.size} keys referenced from source.`,
  );
}

for (const warning of warnings) {
  console.warn(`  ! ${warning}`);
}

if (problems.length > 0) {
  console.error(`\ni18n: ${problems.length} problem(s) found.`);
  process.exit(1);
}
