#!/usr/bin/env node
/**
 * Re-encode the hero film from a master into the shipping pair.
 *
 * The README in `assets/hero` describes the grade; this script is the machine
 * that applies it. Run it whenever the master changes:
 *
 *   node scripts/encode-hero.mjs <master.mp4>
 *
 * What it does:
 *
 *  - desaturates and pulls the shadows toward `canopy`, so the film is nearly
 *    monochrome and its darkest frame meets the hero field instead of ending in
 *    black (the panel's glass is calibrated against that);
 *  - encodes H.264 / yuv420p at 1280x720, `+faststart`, no audio track, and a
 *    CRF that keeps the slow push from banding;
 *  - writes `hero-wide.mp4` and `poster-wide.jpeg`, the poster taken from the
 *    graded first frame so the swap to playback is invisible;
 *  - refuses to finish if the result is over the budget, because an 11 MB hero
 *    is what made the page slow in the first place.
 *
 * The master must not be the output file: ffmpeg reads and writes at once and
 * would corrupt it. Pass a copy.
 *
 * `ffmpeg` must be on PATH (`winget install Gyan.FFmpeg` on Windows).
 */

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SIZE_BUDGET_MB = 3;
const CRF = 24;
const SATURATION = 0.45;
const CONTRAST = 1.05;
const BRIGHTNESS = -0.015;

const root = resolve(process.cwd());
const heroDir = join(root, 'assets', 'hero');
const video = join(heroDir, 'hero-wide.mp4');
const poster = join(heroDir, 'poster-wide.jpeg');
const input = process.argv[2] ? resolve(process.argv[2]) : null;

if (!input) {
  console.error('usage: node scripts/encode-hero.mjs <master.mp4>');
  process.exit(1);
}

if (input === video) {
  console.error('the master must be a copy; this script writes hero-wide.mp4');
  process.exit(1);
}

const grade = [
  `eq=saturation=${SATURATION}:contrast=${CONTRAST}:brightness=${BRIGHTNESS}`,
  // A gentle vignette keeps the eye on the panel without adding a frame.
  'vignette=angle=PI/5',
  'scale=1280:720:flags=lanczos',
].join(',');

/**
 * Optional trims.
 *
 * `--trim start:end` takes one window and plays it straight — the shipping
 * default. `--loop start:end` additionally reverses and concatenates that
 * window into a seamless ping-pong; kept for masters that are a single static
 * push, but a normal loop reads more honestly and is what ships.
 */
const trimArg = process.argv.indexOf('--trim');
const trim =
  trimArg === -1 ? null : (process.argv[trimArg + 1] ?? '').split(':');

const loopArg = process.argv.indexOf('--loop');
const loop =
  loopArg === -1 ? null : (process.argv[loopArg + 1] ?? '').split(':');

const window = loop ?? trim;

const filter = loop
  ? [
      `[0:v]trim=start=${loop[0]}:end=${loop[1]},setpts=PTS-STARTPTS,split[a][b]`,
      `[b]reverse[r]`,
      `[a][r]concat=n=2:v=1:a=0,${grade}[v]`,
    ].join(';')
  : trim
    ? `[0:v]trim=start=${trim[0]}:end=${trim[1]},setpts=PTS-STARTPTS,${grade}[v]`
    : `[0:v]${grade}[v]`;

function ffmpeg(args) {
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
}

console.log(
  `grading ${input}${
    window ? ` (${loop ? 'ping-pong' : 'trim'} ${window[0]}–${window[1]}s)` : ''
  }\n     → ${video}`,
);

ffmpeg([
  '-y',
  '-i',
  input,
  '-filter_complex',
  filter,
  '-map',
  '[v]',
  '-an',
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  String(CRF),
  '-profile:v',
  'high',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  video,
]);

console.log('extracting the poster from the graded first frame');

ffmpeg([
  '-y',
  '-i',
  video,
  '-frames:v',
  '1',
  '-update',
  '1',
  '-q:v',
  '4',
  poster,
]);

const videoMb = statSync(video).size / (1024 * 1024);
const posterKb = statSync(poster).size / 1024;

console.log(
  `hero-wide.mp4 ${videoMb.toFixed(2)} MB · poster ${posterKb.toFixed(0)} KB`,
);

if (videoMb > SIZE_BUDGET_MB) {
  console.error(
    `over budget: ${videoMb.toFixed(2)} MB > ${SIZE_BUDGET_MB} MB. Raise CRF.`,
  );
  process.exit(1);
}
