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

| Token        | Light                 | Dark                  | Job |
| ------------ | --------------------- | --------------------- | --- |
| `background` | white                 | deep green-black      | App ground |
| `foreground` | near-black            | warm ivory            | Text |
| `canopy`     | `#003b24` (deep green) | `#00170b`            | Hero field |
| `parchment`  | `#f8f1e3`             | `#f8f1e3`             | Hero text and primary capsule |
| `brass`      | `#c79e4d`             | `#d7b16a`             | Rings, labels, station nodes |
| `clay`       | `#b25b40`             | `#c97055`             | One accent dot / quiet alert |
| `primary`    | `#007948`             | `#009962`             | In-app action green |
| `secondary`  | pale green            | deep green            | Supporting surfaces |
| `border`     | warm neutral          | 10% ivory             | Hairlines |

Use colour as a field, not a sprinkle: the hero owns canopy; sections own
background; brass is line work; clay appears once per composition.

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
  list is the flexible column; the verse band is `md:w-96`.
- Hero-to-section spacing: `pt-10` mobile, `md:pt-16`; section bottoms `pb-14` /
  `md:pb-20`.
- Station line: 40px node, 1px connector, 28px gap to the reading row. Rows are
  44pt minimum, hairlines not boxes.
- Mobile nav: icon + label, `min-h-11`, compact at 390; labels never wrap the
  bar into a second row. Desktop nav is the same top row.

## Components

- **Hero ring** — concentric brass rings, Arabic حلقة at the centre, three brass
  station dots and one clay dot. Decorative, hidden from assistive tech.
- **Primary capsule** — parchment ground, canopy text, fully rounded; the only
  filled control in the hero.
- **Station row** — brass-outlined circular icon node on a vertical hairline;
  title + muted description; directional chevron. No card, no radius, no shadow.
- **Verse band** — top and bottom hairline, brass overline, centered scripture,
  muted reference. No card.
- **Sign-in** — text link in the circle header while gating is disabled.

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
- Targets ≥ 44 pt / 48 dp. Contrast: parchment on canopy, brass labels on
  canopy, canopy text on parchment.

## Don'ts

- No card grid of equal feature tiles on Home.
- No stock mosque photography or invented cohort imagery.
- No gradient hero, glass panels, hard offset shadows, or colored side borders.
- No second accent colour competing with brass; clay is a single note.
- Do not claim live cohort data, testimonials or metrics that the product does
  not have.
