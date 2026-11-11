---
target: resume band
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\elkar\\work\\othman\\othman-app\\src\\features\\quran\\components\\resume-band.tsx"
target_fingerprint: "sha256:ccdf626d1883c4a4ee5cb44568bc5e2a1df5ededd01acea83ec16910789342ae"
target_path: "C:\\Users\\elkar\\work\\othman\\othman-app\\src\\features\\quran\\components\\resume-band.tsx"
timestamp: 2026-11-05T10-47-12Z
slug: src-features-quran-components-resume-band-tsx
---
# Critique — ResumeBand / ReadingSessionCard (`src/features/quran/components/resume-band.tsx`)

Method: design review only (detector not applicable, native platform)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state while the scan/catalog loads; the fallback swaps silently |
| 2 | Match System / Real World | 3 | Surah name, page, relative day read naturally; overline plural slightly off |
| 3 | User Control and Freedom | 3 | One tap opens the exact position; exit is the tab bar |
| 4 | Consistency and Standards | 2 | Image card breaks the page's hairline-band grammar; stale 3-card remnants in comments |
| 5 | Error Prevention | 3 | Catalog/edition fallbacks; honest seed label; no invented position |
| 6 | Recognition Rather Than Recall | 3 | Single visible action; "Sample history" unexplained |
| 7 | Flexibility and Efficiency | 2 | One rigid path; no accelerators, acceptable for the surface |
| 8 | Aesthetic and Minimalist | 2 | 653 px card owns the first viewport; 5 stacked text elements around one action |
| 9 | Error Recovery | 3 | Invalid links get ErrorState+retry; missing scan degrades to canopy |
| 10 | Help and Documentation | 2 | No contextual help; sample caption assumes understanding |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

The composition is authored for this product, not interchangeable: a real mushaf scan (not stock), the catalog as the single source of surah names, and an honest demo-seed label are all Othman-specific decisions. The weak spot is the card idiom itself — a tall poster tile with scrimmed caption text is the category's default "continue reading" card. The world around it (hairline bands, brass hairline, no shadow) is specific; the card's shape is not.

Deterministic scan: not applicable (native platform).

## Overall Impression

The resume job is unmistakable and one tap restores the exact position — the core interaction is right. But the presentation spends 653 px of an 844 px phone (77% of the first viewport) on a single action, and the scan that justifies that size is decorative: the card would work identically over canopy. The biggest opportunity is making the card earn its height or giving most of it back.

## What's Working

- **Exact-position resume.** The card carries page + surah + ayah and `openEntry` restores all three; the router contract (`surah` only sent with `ayah`) is respected. This is the correct job for this surface.
- **Honest demo data.** The seed is labelled "Sample history" and never presented as the reader's position; the catalog fallback names the number instead of a gap.
- **Stable layout under load.** `aspectRatio` reserves the space, so the scan popping in causes no shift; reduced motion disables the entrance; the whole card is one accessible stop with a composed label.

## Priority Issues

- **[P0] The card is 653 px tall on a 844 px phone.** What: at 390 px wide the `max-w-[300px]` + 9:16 ratio yields a 300×533 plate plus overline, padding and caption. Why it matters: the resume module owns the entire first viewport; hizb, activity, history and story are all below the fold, and the page reads as "one poster" rather than a dashboard. Fix: either shrink the plate (e.g. a 4:5 or 1:1 crop, or cap the height and let the scan cover-crop), or switch to a compact resume row (scan thumbnail at reading size + text beside it) and reserve the tall plate for a context where it is the content. Suggested command: `$impeccable layout`.
- **[P1] Stale three-card remnants.** What: the card comment still says "The other two sit on an ordinary border", the test header says "the three newest sessions in one row", the overline reads "Recent readings" (plural) over one card, and the `latest` prop/`dataSet` is now always true. Why it matters: the next editor will re-add the row the user just deleted, or wire dead props. Fix: rewrite the two comments, singular overline ("Resume reading"), remove the `latest` prop or keep it only as the brass-border switch with a comment saying so. Suggested command: `$impeccable clarify`.
- **[P1] Five stacked text elements around one action.** What: overline ("Recent readings") + surah (24px) + page (14px) + date (12px) + caption ("Sample history"). Why it matters: the eye scans five left-aligned lines to find one tap target; the date line duplicates what the page line already implies for today's entry. Fix: fold the overline into the section rhythm (the band already separates by hairline), and merge date into the page line ("Page 604 · Yesterday"). Suggested command: `$impeccable distill`.
- **[P2] Fixed-ratio card + variable text can overflow.** What: height is locked by `aspectRatio: 9/16` while the surah name wraps freely and OS text scaling applies. Why it matters: a long surah name at large text size outgrows the scrim and clips against the card edge. Fix: cap the title to 2 lines with an ellipsis, or size the card from content with a minimum ratio instead of a locked one. Suggested command: `$impeccable adapt`.
- **[P2] Empty state renders a bare overline.** What: with zero entries the band shows "Recent readings" and nothing else — no card, no copy, no CTA. Why it matters: a first-run reader who cleared the log meets a labelled void. Fix: an empty-state line ("Your last page will appear here") or hide the band until the first entry exists. Suggested command: `$impeccable onboard`.

## Persona Red Flags

**Casey (distracted mobile user):** the resume card fills the thumb zone well and one tap resumes — good. But the page is ~1700 px tall, so hizb and activity need two full swipes to reach; state survives interruption via the log — good. Red flag: on a slow connection the 604-page scan loads late and the card sits as a dark canopy slab with white text — readable, but the "photo" promise arrives late.

**Jordan (confused first-timer):** "Sample history" appears with no explanation of what a sample is or how to replace it with real history — Jordan will wonder whether the app is already tracking someone else. The overline "Recent readings" over a single card reads as a broken list. No visible help anywhere on the band.

**Sam (screen-reader user):** the single composed label ("Page 604 · An-Nas · Yesterday") and `accessible={false}` scan are correct; the card is one stop. Red flag to verify on device: parchment-on-scrim contrast at the gradient's top edge (42% location), where text never actually sits — fine in practice, but worth a contrast read at the lowest text position.

## Minor Observations

- `useIsWide` mock remains in the resume-band test though the band no longer branches on width.
- Brass `border-brass/60` on an image card vs the page's hairline system: the highlight reads, but it is the only colored border on the surface.
- `key={latest.day}` on a single child is harmless but pointless.
- The 390 px screenshot shows the card's bottom text sitting close to the hairline; `p-4` + caption leaves little air under the date line.

## Questions to Consider

- What if the scan were a 96–120 px thumbnail beside the text instead of a full-bleed backdrop — would the card lose anything the reader actually uses?
- Does this surface need to show the page at all, or only name it? The tap target is the position, not the picture.
- What would a confident single-action version look like: one line naming the place, one button opening it, nothing else?
