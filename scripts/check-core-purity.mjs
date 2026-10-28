#!/usr/bin/env node
/**
 * Core purity check.
 *
 * `src/core` is the platform-agnostic layer: pure TypeScript, no React, no
 * react-native, no expo, no DOM, and — the part ESLint cannot see — no
 * Tailwind class strings. A class name in core/ means a visual decision leaked
 * out of the UI layer, and it would silently break the moment the styling
 * system changes.
 *
 * ESLint already blocks the imports and the DOM globals; this script covers the
 * class literals and points at the exact file:line.
 *
 * Heuristic on purpose: it inspects string/template literals only, so comments
 * and identifiers cannot trip it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_DIR = join(ROOT, 'src', 'core');

/** `bg-…`, `text-…`, `p-4`, `dark:…`, … — the utility prefixes core must not use. */
const CLASS_PATTERN =
  /(?:^|\s)(?:[a-z-]+:)*(?:bg|text|border|ring|shadow|outline|fill|stroke|from|via|to|px|py|pt|pb|pl|pr|ps|pe|p|mx|my|mt|mb|ml|mr|ms|me|m|gap|space|size|w|h|min-w|max-w|min-h|max-h|flex|grid|rounded|font|leading|tracking|opacity|z|inset|top|right|bottom|left|items|justify|self|overflow|absolute|relative|static|fixed|hidden|block|inline)-[a-z0-9[]/;

const LITERAL_PATTERN =
  /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

const failures = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      check(path);
    }
  }
}

function check(path) {
  const source = readFileSync(path, 'utf8');
  const lines = source.split('\n');

  lines.forEach((line, index) => {
    const literals = line.match(LITERAL_PATTERN);
    if (literals?.some((literal) => CLASS_PATTERN.test(literal.slice(1, -1)))) {
      failures.push({
        path: relative(ROOT, path),
        line: index + 1,
        message: `Tailwind class literal in core/: ${literals.join(', ')}`,
      });
    }

    if (/\bclassName\b/.test(line)) {
      failures.push({
        path: relative(ROOT, path),
        line: index + 1,
        message: 'core/ must not deal in `className` — that is a UI concern.',
      });
    }
  });
}

try {
  walk(CORE_DIR);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('core purity: no src/core directory yet — nothing to check.');
  process.exit(0);
}

if (failures.length === 0) {
  console.log('core purity: ok');
  process.exit(0);
}

for (const failure of failures) {
  console.error(`${failure.path}:${failure.line}  ${failure.message}`);
}
console.error(`\ncore purity: ${failures.length} violation(s).`);
process.exit(1);
