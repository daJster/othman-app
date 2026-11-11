# Design system — Othman

## World

**Halqa study circle, behind glass.** The product is a guided Quran cohort around
a serious mushaf. Deep canopy green, warm parchment, brass hairlines and one
clay note remain the identity. What changed in this pass is the _material_
layer: the surfaces a reader touches are translucent, layered and lit, so the
film, the page scan and the page ground stay faintly visible underneath instead
of being covered by opaque cards.

Mode: **Persuade** on the home surface; **Operate** inside the app.

The rule that keeps this from becoming glassmorphism-as-decoration: **glass is
only used where something is genuinely behind the surface.** Content on a plain
page ground gets a tonal panel, not a blur; the hero, the chrome, the menus and
the sheets get the full material. A card floating over another card is a
stacking error, not a style.

## Material

Four weights, one vocabulary (`src/ui/glass.tsx`, `glass.web.tsx`):

| Weight    | Wash                   | Blur  | Job                                              |
| --------- | ---------------------- | ----- | ------------------------------------------------ |
| `chrome`  | `--color-glass-dim`    | 22 px | Bars and headers that frame the app              |
| `panel`   | `--color-glass`        | 24 px | Content surfaces over atmosphere                 |
| `overlay` | `--color-glass-strong` | 30 px | Menus, dialogs, sheets — must hold text anywhere |
| `chip`    | `--color-glass`        | 16 px | Control-sized accents (active tab, filters)      |

Platform materials, not one fake blur:

- **Web** uses real `backdrop-filter` with a saturation lift. Every filtered
  layer carries its own radius, because Chromium will not clip a backdrop
  filter to an ancestor's curve.
- **iOS** uses the system material through `expo-blur`.
- **Android** uses a tonal glass (wash + top-edge sheen) instead of a blur. The
  platform blur needs a `blurTarget` wired to the exact content behind the
  surface; without it `BlurView` silently degrades to no blur. A tonal surface
  is the honest Material 3 answer and keeps the frame budget.

`prefers-reduced-transparency` is honoured separately from reduced motion: the
material becomes opaque but keeps its shape, hairline and ink.

Radii follow the same module: **12 / 16 / 24 px** for chip / panel / card. A
larger surface gets a larger curve; the pinned hero pill and the hero card
share one radius, so the morph never changes its curve.

## Ratios

Every length is a multiple of one **4 px module**. Named steps live in
`@theme` (`src/global.css`) and in `src/ui/ratio.ts`:

| Token                  | Value   | Job                          |
| ---------------------- | ------- | ---------------------------- |
| `--spacing-gutter`     | 1rem    | Page margin on a phone       |
| `--spacing-gutter-lg`  | 1.25rem | Page margin from `sm` up     |
| `--spacing-panel`      | 1.5rem  | Inside a card or panel       |
| `--spacing-control`    | 2.75rem | 44 pt control floor          |
| `--spacing-control-lg` | 3rem    | 48 dp control floor          |
| `--spacing-section`    | 2.5rem  | Between page sections        |
| `--radius-chip`        | 12 px   | Pills, chips, small controls |
| `--radius-panel`       | 16 px   | Menus, fields, inner panels  |
| `--radius-card`        | 24 px   | Cards, sheets, hero panel    |

Composition is expressed as ratios, not fixed sizes:

- The hero is **88–90 `svh`** on web (a share of the small viewport, so a mobile
  toolbar cannot push the panel below the fold) and a **9:16** window on native.
- The web bar is capped by the same `max-w-6xl` column as the home page.
- The hero panel is a **reading-measure** (`max-w-md`) at the desktop split, not
  a pixel width.
- The pinned pill is **14 modules** tall, **85 modules** wide at most, **4
  modules** from the viewport edge.
- Grids use fractions (`1/7` for a week, `flex-1` for equal cells), and cards
  use `aspectRatio` (the page card is `1 / 1.512`, the history plate `2`).

A raw `p-[23px]` is a decision nobody can reuse. Use `p-panel`, `gap-gutter`,
`min-h-control`, `rounded-card`.

## Palette

All roles are OKLCH tokens in `src/global.css`; no hex or rgb values in
components.

| Token          | Light                  | Dark                       | Job                                      |
| -------------- | ---------------------- | -------------------------- | ---------------------------------------- |
| `background`   | warm paper             | `#040906` near-black green | App ground                               |
| `foreground`   | near-black             | warm ivory                 | Text                                     |
| `canopy`       | `#003b24` (deep green) | `#082b1b` lifted green     | Hero field                               |
| `parchment`    | `#f8f1e3`              | `#f8f1e3`                  | Hero text and primary capsule            |
| `brass`        | `#c79e4d`              | `#d7b16a`                  | Rings, hairlines, station nodes          |
| `brass-ink`    | `#7a5d28` (text-safe)  | `#e5be77`                  | Brass-coloured **text** on a page ground |
| `clay`         | `#b25b40`              | `#c97055`                  | One accent dot / quiet alert             |
| `primary`      | `#007948`              | `#009962`                  | In-app action green                      |
| `card`         | white                  | `#0a1710` soft green       | Opaque grouped surfaces                  |
| `glass`        | white 72%              | lifted green 68%           | Panel material                           |
| `glass-strong` | white 88%              | lifted green 86%           | Overlay material                         |
| `glass-dim`    | paper 62%              | green-black 62%            | Chrome material                          |
| `glass-edge`   | warm dark 16%          | ivory 12%                  | Material hairline                        |
| `glass-line`   | white 72%              | ivory 14%                  | Lit top edge                             |
| `secondary`    | pale green             | `#0d1c14`                  | Supporting surfaces                      |
| `border`       | warm neutral           | 10% ivory                  | Page hairlines                           |
| `success`      | deep green text-safe   | light green text-safe      | Positive status text                     |
| `info`         | deep blue text-safe    | light blue text-safe       | Informational status text                |

Use colour as a field, not a sprinkle: the hero owns canopy; sections own
background; brass is line work; clay appears once per composition. `brass` is
reserved for line work and for text **on canopy**; on a page ground use
`brass-ink`, which clears 4.5:1 at overline sizes in both themes. Status colours
are semantic roles: a new status uses a role, never a raw Tailwind palette name.

## Type

- **Quran text** — `font-quran` (Amiri Quran). Sacred text only; never UI copy.
- **Arabic UI** — `font-arabic` (IBM Plex Sans Arabic, falling back to Noto
  Naskh); `Text family="auto"` resolves it.
- **Latin UI** — `font-ui` (Inter).
- Display: `text-3xl`/`text-4xl` mobile, `md:text-6xl` hero. Tracking never
  tighter than `-0.03em`; overline labels use `tracking-[0.3em]`.
- Leading follows size: `leading-tight` on titles, `leading-snug` on headings
  and subtitles, `leading-relaxed`/`leading-loose` for body and scripture. No
  fixed `lineHeight`; OS text scaling must still work.
- Reading measure: `max-w-md` for body prose, `max-w-xl` for tagline and verse.

## Layout

- Hero: full-bleed `bg-canopy`, `rounded-b-card`, centred basmalah above a
  two-column split at `md`. The film fills the box; the panel is bottom-anchored
  on a phone and sits at the physical start on desktop.
- Lower page: `max-w-6xl`, one column below `md`, two above. The circle list is
  capped at `max-w-xl`; the verse band shares the heading's top edge.
- **One page grid**: nav and page content share the same gutter and column.
  Home and the web bar are `max-w-6xl`; Quran and Account are `max-w-3xl`
  centred; Meetings is `max-w-3xl` centred. Nothing stretches past those widths
  at 1440.
- Hero-to-section spacing: `pt-section`; section bottoms `pb-section`.
- Station line: 40 px node, 1 px connector, 16 px gap. Rows are 44 pt minimum,
  hairlines not boxes.

## Components

- **Web bar** — one floating glass bar inside the page grid: brand, three
  destinations, then the state controls at the trailing edge. The active
  destination is a `chip`-weight brass wash, not an underline. It is a
  `navigation` landmark of real `<a href>` links; the active one carries
  `aria-current="page"`.
- **Native bar** — the platform's own tab bar (`NativeTabs`), tinted from the
  same tokens. Do not replace it with a JS bar: the OS owns blur, haptics and
  "tap active tab to scroll to top".
- **Hero panel** — the `panel` weight over the film; parchment-adjacent white
  wash so canopy ink stays above 4.5:1 over the darkest frame. One filled
  capsule (parchment/canopy), the bell at the trailing edge.
- **Pinned pill** — the morphing card's compact face: wordmark, the next thing,
  chevron. It reports state (next session, next exam, or the page you left), it
  does not repeat the CTA.
- **Station row** — brass-outlined circular node on a vertical hairline; title +
  muted description; directional chevron. No card, no radius, no shadow.
- **Verse band** — one quiet `panel` surface, brass overline, centred scripture,
  muted reference. It is the page's only scripture, so it keeps a generous
  measure and no action.
- **Destination strip** — the four shortcuts in one chip-radius row; icon over
  label, 56 px targets. It is a shortcut rail, not a second navigation.
- **Account sheet** — one grouped glass panel holding the profile, completeness,
  learning snapshot, preferences and settings rows. Inside it, rows are
  hairline-separated; the last row has no trailing hairline. This is the iOS
  grouped-list grammar, and it avoids stacking five light materials.
- **Meetings** — a glass calendar panel above glass session cards. The calendar
  keeps 44 pt day cells and a solid primary selection; the clock rail stays a
  fixed 80 px so titles start on one line.
- **Progress** — glass cards for the summary, milestones, week strip, trend and
  recent list. Status colour is a semantic triple (text / soft surface / line).
- **Reader chrome** — inset glass rows above and below the mushaf, never an
  overlay. The header owns surah + page; the footer owns page-order arrows and
  the page counter. Page-turn motion stays the one authored moment.
- **Overlays** — `overlay` weight for menus, dialogs, popovers, tooltips and the
  reader sheets. `Select` is the one settings dropdown; the `AlertDialog`
  confirms sign-out; `Collapsible` carries meeting details; `ToggleGroup`
  switches Gregorian/Hijri.
- **Primitive layer** — generic controls are React Native Reusables components
  (Uniwind target) under `src/components/ui`. `src/ui` keeps the app wrappers:
  Arabic fonts, semantic text tones, the 44 pt control floor, Lucide `IconName`
  resolution, `Page`/`Section`/`Screen` vocabulary and the glass material.

## Brand assets

All artwork lives in `assets/brand/` and is resolved by surface, not by filename
(the source files mix conventions): `WORDMARK`, `READER_LOGO`, `AYAH_ORNAMENT`
and `REVELATION_MARK` expose `onLight` / `onDark` members in
`src/features/brand/assets.ts`.

- **Wordmark** — Home hero (`h-11`/`h-12`), web bar (`h-6`) and the sign-in
  header. Sized with an explicit height and width pair; Expo Image collapses
  `width: auto` inside a flex row.
- **Reader emblem** — the reader's loading frame, centred above an indeterminate
  brass bar. The bar is indeterminate on purpose: boot spans a store restore, a
  catalog fetch and bbox downloads, so a percentage would be invented.
- **Ayah medallion** — the Read panel closes the Quran block with the
  `ayah_icon-*` medallion; the ayah-in-surah number sits inside it.
- **Revelation marks** — `madina-*` / `makka-*` beside the ayah count in the
  surah picker; decorative, so never announced.

## Motion

Two authored moments: press feedback (instant, on pointer-down) and the hero
card's morph into the pinned pill. Springs are critically damped by default; the
morph is allowed one small under-damped landing because a gesture preceded it.
Every animation is interruptible and starts from the on-screen value. Reduced
motion crossfades instead of sliding, and the film holds a still frame.

## States and accessibility

- Home is reachable signed out; Sign in is always visible until a session
  exists.
- Stations are anchors on web and router links on native; chevrons mirror in RTL.
- Decorative rings/dots are `accessibilityElementsHidden`.
- Text scales with the OS; no fixed heights, `numberOfLines`, or clipped prose.
- Targets ≥ 44 pt / 48 dp. Contrast: parchment on canopy, brass on canopy,
  `brass-ink` on page grounds; overlay glass clears 4.5:1 on the page ground in
  both schemes; muted text clears 4.5:1 on both `background` and `muted`.
- One physical layout for both languages; only text direction and alignment
  follow the language. The mushaf's reading order is the exception.

## Don'ts

- No card grid of equal feature tiles on Home.
- No stock mosque photography or invented cohort imagery.
- No glass on glass: never place a light translucent surface on another.
- No blur where nothing is behind it — use a tonal panel on a flat page.
- No hard offset shadows or colored side borders. Elevation is a soft, wide
  shadow under a material edge.
- No second accent colour competing with brass; clay is a single note.
- Do not claim live cohort data, testimonials or metrics that the product does
  not have.
