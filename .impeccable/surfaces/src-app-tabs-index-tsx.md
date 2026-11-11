---
version: 1
slug: "src-app-tabs-index-tsx"
primary_target: "src/app/(tabs)/index.tsx"
related_targets: []
---

## Scope

The Home tab / landing page for Othman, on web and native. This is a visual
world for the landing surface that replaced the first halqa ring; it keeps every
existing destination and does not add product capabilities.

## Visitor mode

Persuade. A first-time visitor should understand the cohort promise and choose
one entry point within the first viewport.

## Audience, job, action

Mixed Quran students and teachers/shaykhs arriving to resume reading, reach a
scheduled session, or check their circle. Primary action: continue into the
mushaf; secondary: sign in, meet, account.

## Chosen direction

**The study circle behind a window.** A single graded film — one slow push
through mosque, inscription and open mushaf — holds the first viewport behind one
frosted panel. The four ways back into the circle continue on a brass station
line below it. The hero is monochrome; brass begins below the fold.

Memorable moment: the film's push settles on the open mushaf as the panel's
basmalah resolves — the page and the screen hold the same text at different
scales.

## Direction contract

THESIS: The landing page is a study circle seen through a window, not a feature
catalogue: one film and one panel carry the reading and the people around it, and
the category's card grid is refused.

OWN-WORLD: A graded, near-monochrome film over deep canopy; parchment type on one
frosted panel; brass hairline and station nodes begin below the fold, with one
clay note. Quranic calligraphy is an object inside the world, not decoration.
Type: Quran face for sacred text, Naskh for Arabic UI, Inter for Latin labels;
the tagline is the only display line.

STORY: The visitor understands that Othman is a guided Quran cohort around a
serious mushaf, then continues reading, meets the circle, or signs in.

FIRST VIEWPORT: Full-bleed film; one frosted panel at the inline start on desktop
(bottom-anchored on the phone) holding the basmalah, wordmark, the tagline and a
parchment CTA, with a muted cohort line behind a hairline. Dust drifts through the
uncovered film. Nothing in the hero is brass.

FORM: Grounded direction 4 of 7, the halqa/study-circle world, re-opened as a
window; seed:2f8109a46a34992f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.

## Unresolved

No real cohort photography or testimonials are available, so the page uses
typographic and filmed atmosphere only. The film's two encodes are not committed
yet: until `src/features/home/hero-media.ts` returns a film, the hero shows its
dust field, which is also the reduced-motion and failed-autoplay state.
