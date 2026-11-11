---
target: the home / landing page
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\elkar\\work\\othman\\othman-app\\src\\app\\(tabs)\\index.tsx"
target_fingerprint: "sha256:221261d7b0e89fdf6f4be65fe24e92f7c1ed798dbbedc410484dd7e2cabdd780"
target_path: "C:\\Users\\elkar\\work\\othman\\othman-app\\src\\app\\(tabs)\\index.tsx"
timestamp: 2026-11-08T13-31-42Z
slug: src-app-tabs-index-tsx
---
# Critique — Home / landing page

Method: design review only (detector not applicable, adaptive platform).

Target: `src/app/(tabs)/index.tsx` (rendered web at 375 / 768 / 1440, Android emulator at 393×852).
Mode: Persuade.

## Design Health Score

| #   | Heuristic                        | Score | Key Issue                                                                                                         |
| --- | -------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of System Status      | 2     | Nothing on the page says what is next or where the user left off; no data states exist because no data is loaded. |
| 2   | Match System / Real World        | 2     | "حلقتك — Your circle" heads a list of app destinations, not a circle: no session, no shaykh, no classmates.       |
| 3   | User Control and Freedom         | 2     | Film pause is not remembered; on web PageDown / Space / arrows cannot scroll the page at all.                     |
| 4   | Consistency and Standards        | 3     | Token and type discipline is strong; Home repeats the four navigation destinations verbatim.                      |
| 5   | Error Prevention                 | 3     | Little to get wrong; film errors fall back to the poster.                                                         |
| 6   | Recognition Rather Than Recall   | 2     | Reading page, next session, and unread notices all require a trip to another tab.                                 |
| 7   | Flexibility and Efficiency       | n/a   | Persuade surface.                                                                                                 |
| 8   | Aesthetic and Minimalist Design  | 3     | Hero is composed; desktop leaves 144px gutters and an empty band under the fold.                                  |
| 9   | Error Recovery                   | 3     | Poster fallback is well built; no other recoverable state exists.                                                 |
| 10  | Help and Documentation           | n/a   | Persuade surface.                                                                                                 |
|     | **Total**                        | **20/32** | **Acceptable (62.5%)**                                                                                        |

## Design Specificity Verdict

The first viewport is authored: a film, one frosted panel, a card that leaves the
page and pins itself. Nothing about it is a SaaS template. The second half is not:
a heading, four link rows, and a verse band — a layout any Islamic app could
ship unchanged, and one that never proves the cohort the product is positioned
on. The page is specific above the fold and category-interchangeable below it.

## Overall Impression

The craft in the hero is real and the morph is the best thing in the product. But
the page is a beautifully made door with nothing behind it: everything the
positioning promises — sessions, a shaykh, progress — lives in other tabs, and
Home neither shows nor links to it in a way that proves it. The single biggest
opportunity is to let the hero's own pin gesture carry the circle's state, so the
thing that already delights becomes the thing that informs.

## What's Working

1. **The card morph.** Full panel → pinned pill, driven by one spring
   (damping 19, stiffness 140), with a 100 ms anticipation lift and a 460 ms
   sheen. It has a beginning, a settle, and a reason. It is also the only
   motion on the page that expresses the product idea (the window receding as
   you enter).
2. **The film pipeline's fallbacks.** Poster until first frame, poster retained
   on error, pause when offscreen or backgrounded, video removed from the
   accessibility tree. This is more care than most landing pages take.
3. **Material discipline.** No hex in components, one clay note, brass reserved
   for line work, Amiri for sacred text and Naskh for UI. The type does the
   identity work instead of decoration.

## Priority Issues

### [P0] Web: the page cannot be scrolled with the keyboard

- **What**: The document never scrolls; all content lives in the inner
  `home-scroll` div (`scrollHeight` 1412, `clientHeight` 793). PageDown, Space,
  and arrow keys leave `scrollTop` at 0 — verified in the browser.
- **Why it matters**: A keyboard-only user cannot reach "Your circle" or the
  verse at all. It is also why the page has no visible scrollbar affordance on
  desktop, so even pointer users get no signal that there is more below.
- **Fix**: On web, let the document scroll (hero `min-h-dvh`, page height auto)
  or make the scroll container focusable and labelled
  (`tabIndex={0}` + `role="region"` + `aria-label`) so keys reach it. Keep the
  scroll handler; only the scroll owner changes.
- **Suggested command**: `$impeccable adapt`

### [P1] "Your circle" is a menu, not a circle

- **What**: The heading promises the cohort; the four rows are Quran, Meetings,
  Account, About — the same destinations as the nav. No next halqa, no exam, no
  announcement, no reading position. The hero CTA is a hard-coded `/quran`, not
  the page the user is on.
- **Why it matters**: The one thing that differentiates Othman from a Quran app
  is invisible on the screen that has to prove it. A returning student cannot
  answer "what's next?" without leaving Home.
- **Fix**: Keep the hero; replace two of the four rows with dated circle content
  (next session, next exam / latest notice) and make the CTA resume the real
  page from `reader-store`. Demote the duplicate destinations.
- **Suggested command**: `$impeccable shape`

### [P1] The film is 11.3 MiB on every viewport and starts before the page is readable

- **What**: One 1280×720 encode (`hero-wide.mp4`, 11.5 MB) is fetched at 375,
  768 and 1440 alike, autoplaying immediately; the poster is only 62 KB but is
  replaced as soon as the first frame lands.
- **Why it matters**: On a phone this is most of the page's bytes and the main
  reason the hero feels slow to settle. It also ignores Save-Data and reduced
  motion.
- **Fix**: Two encodes (phone portrait crop ~2.5 MB, desktop ~4 MB), start
  playback after the poster paints and on idle, and ship the poster alone when
  reduced motion or Save-Data is set.
- **Suggested command**: `$impeccable optimize`

### [P2] Desktop turns the "window" into a banner

- **What**: At 1440 the hero is a 1152×780 rounded card inset 144 px, with a
  bright, saturated mosque shot behind a small 432×278 panel; below it a second
  band starts after 120 px of page ground.
- **Why it matters**: The direction's thesis is a graded, near-monochrome film
  over deep canopy with parchment on one panel. The shipped film is vivid blue
  daylight, so the panel reads as a caption on a stock photo rather than a
  window into the circle.
- **Fix**: Either grade toward canopy/parchment or choose the encode that holds
  the open mushaf for the first two seconds; let the hero be full-bleed at
  `md+` so the panel sits inside the world, not on a card of it.
- **Suggested command**: `$impeccable polish`

### [P2] Reduced motion is ignored exactly where it matters

- **What**: `hero-morph.tsx` passes `ReduceMotion.Never` on every animation and
  `hero-film.tsx` never reads the preference; only the dust motes honour it.
- **Why it matters**: A user who asked the OS for less motion still gets an
  autoplaying video and a spring-driven pin. This is both an accessibility
  failure and, on low-end phones, a jank source.
- **Fix**: Morph collapses to a 160 ms crossfade, film holds the poster, rail
  reveals become instant.
- **Suggested command**: `$impeccable animate`

## Persona Red Flags

**Jordan (first-timer)**: Reads "حلقتك" and expects a teacher and a time, finds
four settings-shaped rows; no name, no "next session", no explanation of what a
حلقة is. Leaves without understanding the product is a class.

**Casey (mobile, interrupted)**: The hero is 100% of an 844 px screen; the only
action is "متابعة القراءة". Nothing to return to — no "next session at 18:00",
no unread marker — so re-entry has no hook. 11 MB of film on cellular.

**Sam (keyboard / screen reader)**: Cannot scroll past the hero with the
keyboard. The hidden `h1` has no `aria-level`. When pinned, the pill's CTA sits
after all page content in DOM order. Film toggle exposes no pressed state.

## Minor Observations

- The compact CTA is ~40 px tall inside a 56 px pill — under the 44 pt floor.
- `importantForAccessibility` leaks to the DOM on web, producing a React warning
  toast that covers the CTA in dev.
- The station hairline is nearly invisible at 10% brass.
- `home.explore.title` is a dead locale key in both languages.
- "Verse of the Day" is a fixed Al-Isra 9 line; it does not rotate.
- Home, Meetings and Progress use demo data that reads corporate and dated;
  none of it reached Home, which is why nothing contradicts yet.

## Questions to Consider

- If the film were a still frame, would the page still say "kuttab"?
- What would this page look like if it had to show the one thing due in the next
  hour?
- Is "your circle" a place you navigate to, or a thing that happens to you?
- Should the pinned pill be a status line rather than a repeat of the CTA?
