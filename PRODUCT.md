# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Mixed audience of Quran students and teachers/shaykhs. Students arrive to resume
reading the mushaf, follow their memorisation, and reach scheduled sessions.
Teachers use the same entry points to reach their account, sessions, and student
progress. The home screen serves both without privileging one role.

## Product Purpose

Othman is a Quran learning platform for a kuttab-style cohort: read the mushaf,
meet your shaykh and classmates, and keep a record of memorisation. Success means
a visitor immediately understands that this is a guided learning community, not
an anonymous reader, and can reach reading, meetings, progress, or account in one
step.

## Positioning

The differentiator is the community/cohort around the text: scheduled sessions
with a shaykh, shared learning, and visible progress, alongside a serious mushaf
reader. A generic Quran app could copy the reader but not the class relationship.

## Operating Context

- Arabic-first interface with English fully supported; RTL is the default reading
  direction, LTR must remain coherent.
- Used on phones and the web; the same product adapts to both native and web
  conventions rather than shrinking a desktop site.
- Sessions are scheduled by day; progress is a memorisation heatmap; reading is
  page-by-page with ayah selection.
- The app is still in development; authentication is currently bypassed and
  account data is a local mock. Do not present demo/local data as synchronized
  live account data.

## Capabilities and Constraints

- Existing destinations only: Home, Quran (mushaf reader), Meetings, Account,
  Progress, About, Sign in.
- Meetings and progress are mock/demo data; notes and tafsir are local/live
  content utilities inside the reader.
- No new backends, testimonials, customer logos, benchmarks, pricing, or
  unbuilt feature claims may be introduced on Home.
- Home must remain usable signed out and signed in; a Sign in entry point stays
  available while gating is disabled.
- Must work at 375, 768 and 1024+ px and on native phones.

## Brand Commitments

- Name: Othman / كُتّاب عثمان.
- A recognisably Quranic/kuttab character, not a generic SaaS style.
- Calm, low-stimulation presentation: this is a reading and learning space.
- Bilingual Arabic/English voice; Arabic is not a translation afterthought.

## Evidence on Hand

- The mushaf reader, its page scans and ayah interaction exist in `src/features/quran`.
- The memorisation heatmap and detail sheet exist in `src/features/progress`.
- The meetings calendar and cards exist in `src/features/meetings`.
- The account/profile and About screens exist in `src/app` and `src/features/account`.
- No real cohort photography, testimonials, customer names, or live statistics
  are available; future work must not fabricate them.

## Product Principles

1. Make the cohort visible before the feature list.
2. Treat the Quran with seriousness; the interface recedes around the text.
3. One clear next step for each intent: read, meet, track, account.
4. Calm over spectacle; motion and colour earn their place.
5. Arabic-first, with English treated as a first-class equal.

## Accessibility & Inclusion

- Arabic and English must both read naturally, including RTL/LTR layout.
- Large OS text and long Arabic labels must not clip or hide primary actions.
- Tap targets follow 44 pt / 48 dp guidance.
