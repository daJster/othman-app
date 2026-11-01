# Design system — Othman

## World

**Halqa study circle.** The product is a guided Quran cohort around a serious
mushaf. The home surface is a circle, not a feature catalogue: a brass-ring
diagram at the hero, and a single station line that carries the four
destinations. Deep canopy green, warm parchment, brass hairlines and one clay
note. Calm, text-first, Arabic-first.

Mode: **Persuade** on the home surface; **Operate** inside the app.

## Palette

All roles are OKLCH tokens in `src/global.css`; no hex or rgb values in
components.

| Token          | Light                  | Dark                       | Job                                      |
| -------------- | ---------------------- | -------------------------- | ---------------------------------------- |
| `background`   | white                  | `#040906` near-black green | App ground                               |
| `foreground`   | near-black             | warm ivory                 | Text                                     |
| `canopy`       | `#003b24` (deep green) | `#082b1b` lifted green     | Hero field                               |
| `parchment`    | `#f8f1e3`              | `#f8f1e3`                  | Hero text and primary capsule            |
| `brass`        | `#c79e4d`              | `#d7b16a`                  | Rings, hairlines, station nodes          |
| `brass-ink`    | `#7a5d28` (text-safe)  | `#e5be77`                  | Brass-coloured **text** on a page ground |
| `clay`         | `#b25b40`              | `#c97055`                  | One accent dot / quiet alert             |
| `primary`      | `#007948`              | `#009962`                  | In-app action green                      |
| `card`         | white                  | `#0a1710` soft green       | Grouped surfaces (calendar)              |
| `secondary`    | pale green             | `#0d1c14`                  | Supporting surfaces                      |
| `border`       | warm neutral           | 10% ivory                  | Hairlines                                |
| `success`      | deep green text-safe   | light green text-safe      | Positive status text                     |
| `success-soft` | pale green             | deep green                 | Positive status surface                  |
| `success-line` | green hairline         | green hairline             | Positive status border                   |
| `info`         | deep blue text-safe    | light blue text-safe       | Informational status text                |
| `info-soft`    | pale blue              | deep blue                  | Informational status surface             |
| `info-line`    | blue hairline          | blue hairline              | Informational status border              |

Use colour as a field, not a sprinkle: the hero owns canopy; sections own
background; brass is line work; clay appears once per composition. `brass` is
reserved for line work and for text **on canopy**; on a page ground use
`brass-ink`, which clears 4.5:1 at overline sizes in both themes. Status colours
are semantic roles: a new status uses a role, never a raw Tailwind palette name.

## Type

- **Quran text** — `font-quran` (Amiri Quran). Sacred text only; never UI copy.
- **Arabic UI** — `font-arabic` (Noto Naskh); `Text family="auto"` resolves it.
- **Latin UI** — `font-ui` (Inter).
- Display: `text-3xl`/`text-4xl` mobile, `md:text-6xl` hero. Tracking never
  tighter than `-0.03em`; overline labels use `tracking-[0.3em]`.
- Reading measure: `max-w-md` for body prose, `max-w-xl` for tagline, 2xl–3xl
  centered verse. No fixed `lineHeight`; use `leading-relaxed`/`leading-loose`
  so OS text scaling works.

## Layout

- Hero: full-bleed `bg-canopy`, `rounded-b-[2.5rem]`, centered basmalah above a
  two-column split at `md`. Copy and ring are 50/50 with a 4rem gap; the ring is
  `aspect-square`, 20rem mobile / 24rem desktop.
- Lower page: `max-w-6xl`, one column below `md`, two columns above. The circle
  list is capped at `md:max-w-md`; the verse band is `md:w-96` and shares the
  heading's top edge.
- **One page grid**: nav and page content share the same gutter. The web navbar
  row is `max-w-6xl`; Home is `max-w-6xl`; Quran and Account are `max-w-3xl`
  centred; Meetings is `max-w-3xl` centred. Nothing stretches past those widths
  at 1440.
- Hero-to-section spacing: `pt-10` mobile, `md:pt-16`; section bottoms `pb-14` /
  `md:pb-20`.
- Station line: 40px node, 1px connector, 28px gap to the reading row. Rows are
  44pt minimum, hairlines not boxes.
- Mobile nav: icon + label, `min-h-11`, compact at 390; labels never wrap the
  bar into a second row. Desktop nav is the same top row, tabs packed at the
  inline start inside the page grid.

## Components

- **Hero ring** — concentric brass rings, Arabic حلقة at the centre, three brass
  station dots and one clay dot. Decorative, hidden from assistive tech.
- **Primary capsule** — parchment ground, canopy text, fully rounded; the only
  filled control in the hero.
- **Station row** — brass-outlined circular icon node on a vertical hairline;
  title + muted description; directional chevron. No card, no radius, no shadow.
- **Verse band** — top and bottom hairline, brass overline, centered scripture,
  muted reference. No card.
- **Sign-in** — a measured `max-w-md` column on every viewport: wordmark and
  close in one row, title as the page's single heading, Google CTA with the
  four-colour mark, then email → password with a `1 / 2` / `2 / 2` step marker.
  Password reveal at the inline end, `aria-invalid` on failed fields, and the
  server error directly under the step it belongs to. No canopy panel: the
  wordmark carries identity and the form stays plain.
- **Web navbar** — page-ground bar, tabs packed at the inline start inside
  `max-w-6xl`. Active tab: 2px brass underline plus `text-foreground`; no filled
  pill, no layout shift. Every tab stays a real `<a href>`. The wordmark sits at
  the start from `sm` up; below that the Home hero carries the brand. Two
  compact dropdowns sit at the trailing edge: Theme (Auto/Light/Dark) and
  Language (AR/EN), each showing its current value and opening a list. Tab
  labels hide below `sm` so the four destinations and both controls fit at 375;
  their `aria-label`s remain.
- **Quran position band** — hairline section with the real page number, surah
  number and `page / 604` progress hairline; the page scan becomes a preview
  when an edition is attached. No card.
- **Account web rows** — app-owned `Text`/`Icon` rows on web (native keeps
  `@expo/ui` List). 56px tall, hairline separated, leading icon at the inline
  start, chevron at the inline end, sign-out destructive.
- **Preferences** — a shared section on Account for every platform: Theme
  (System / Light / Dark) and Language (Arabic / English) as labelled dropdown
  rows. The web navbar exposes the same two settings as compact dropdowns; on
  native, a language change tells the user when `I18nManager` needs a relaunch.
  The reader menu carries the Theme dropdown so a reader can change it without
  leaving the page.
- **Overline labels** — quiet, uppercase in Latin, letter-spaced; never a kicker
  above a heading.
- **Page / Section** - `Page` owns the measured column and gutter (`default`
  48rem, `wide` 72rem); `Section` owns a heading plus its supporting line, at
  page level (h1) or group level (`level={2}`). Screens pass only their vertical
  rhythm; About keeps its full-width list shell.
- **Primitive layer** - generic controls are React Native Reusables components
  (Uniwind target) under `src/components/ui`, not the legacy hand-rolled set.
  `src/ui` keeps the app wrappers: Arabic fonts, semantic text tones, the 44pt
  control floor, Lucide `IconName` resolution and the page/state vocabulary.
- **Settings and overlays** - `Select` is the one settings dropdown; the
  `AlertDialog` confirms sign-out; `Collapsible` carries meeting details;
  `ToggleGroup` switches Gregorian/Hijri; `Popover` powers the web user menu.
  Keep `@expo/ui` for native tabs, native list rows, the native picker and the
  reader bottom sheets.

## Brand assets

All artwork lives in `assets/brand/` and is resolved by surface, not by filename
(the source files mix conventions): `WORDMARK`, `READER_LOGO`, `AYAH_ORNAMENT`
and `REVELATION_MARK` expose `onLight` / `onDark` members in
`src/features/brand/assets.ts`. `BrandMark` derives the ink from the resolved
theme unless a surface pins it (the Home hero is always canopy).

- **Wordmark** — Home hero (`h-16 md:h-20`), web navbar (`h-6` from `sm` up) and
  the sign-in header. Sized with an explicit height and width pair; Expo Image
  collapses `width: auto` inside a flex row.
- **Reader emblem** — the reader's loading frame, centred above an indeterminate
  brass bar. The bar is indeterminate on purpose: boot spans a store restore, a
  catalog fetch and bbox downloads, so a percentage would be invented.
- **Ayah medallion** — the Read panel closes the Quran block with the
  `ayah_icon-*` medallion; the ayah-in-surah number sits inside it in the
  reader's digits.
- **Revelation marks** — `madina-*` / `makka-*` beside the ayah count in the
  surah picker; decorative, so never announced.
- **App icon and manifest** — `icon512_rounded.png` is the app icon and favicon
  source; `icon512_maskable.png`, `icon192.png` and `apple-touch-icon.png` live
  in `public/` with `manifest.json`. `src/app/+html.tsx` links the manifest and
  theme colour; the splash is the reader emblem on canopy.

## Motion

One authored moment is enough: press feedback (`active:opacity-70/80`) and the
reader's page turn elsewhere. Home has no entrance animations, parallax,
gradient text or hover-only affordances. On the web, hover is optional polish;
every action is reachable by touch and keyboard.

## States and accessibility

- Home is reachable signed out; Sign in is always visible until a session exists.
- Stations are anchors on web and router links on native; chevrons mirror in RTL.
- Decorative rings/dots are `accessibilityElementsHidden`.
- Text scales with the OS; no fixed heights, `numberOfLines`, or clipped prose.
- Targets ≥ 44 pt / 48 dp. Contrast: parchment on canopy, brass on canopy,
  `brass-ink` on page grounds; muted text clears 4.5:1 on both `background` and
  `muted` surfaces. Dark-mode `background`/`canopy` are separated enough
  (~1.3:1) that the hero edge reads as a field boundary.

## Don'ts

- No card grid of equal feature tiles on Home.
- No stock mosque photography or invented cohort imagery.
- No gradient hero, glass panels, hard offset shadows, or colored side borders.
- No second accent colour competing with brass; clay is a single note.
- Do not claim live cohort data, testimonials or metrics that the product does
  not have.
