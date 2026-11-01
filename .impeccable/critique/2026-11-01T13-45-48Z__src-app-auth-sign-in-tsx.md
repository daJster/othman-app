---
target: sign-in page
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:C:\\Users\\elkar\\work\\othman\\othman-app\\src\\app\\auth\\sign-in.tsx"
target_fingerprint: "sha256:c072651778d65631706e6f5e368a7a2a840e4259cdb4c33a3dea695092391709"
target_path: "C:\\Users\\elkar\\work\\othman\\othman-app\\src\\app\\auth\\sign-in.tsx"
timestamp: 2026-11-01T13-45-48Z
slug: src-app-auth-sign-in-tsx
---
Method: dual-agent (A: design review · B: detector/browser), sign-in page at 390/768/1440 in en-light and ar-dark. Corrections were implemented in the same pass; this snapshot records the incumbent review.

## Design Health Score (before corrections)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Pending swaps one label; no step indicator; no focus move. |
| 2 | Match System / Real World | 3 | Copy is natural; "Cancel" on a full page has nothing to cancel. |
| 3 | User Control and Freedom | 2 | Only exit is the last control at the bottom. |
| 4 | Consistency and Standards | 2 | Iconless social CTA, no reveal, no heading, ignores the app grid. |
| 5 | Error Prevention | 2 | No password reveal; Enter in email does nothing. |
| 6 | Recognition Rather Than Recall | 2 | Email survives only as an interpolated caption; no step count. |
| 7 | Flexibility and Efficiency | 2 | No autofocus, no Enter-to-continue. |
| 8 | Aesthetic and Minimalist Design | 1 | 1392px control bars; a mobile form stretched. |
| 9 | Error Recovery | 2 | Error detached from the field; retry re-sends the same credentials. |
| 10 | Help and Documentation | 1 | One subtitle line; no support or destination context. |
| **Total** | | **19/40** | **Poor** |

## Design Specificity

1/5. The default shadcn/Next-Auth credential form with the card removed. None of canopy, parchment, brass or clay appears; the only Othman-specific artefacts are the two-step split and the copy. Zero heading elements, no brand, no page grid.

## Priority Issues

- **P0** No measure: the form spans 1392px at 1440 (342 at 390), contradicting the documented page grid.
- **P0** No identity and no heading: no brand, zero h1, the only exit a ghost Cancel at the bottom.
- **P1** The Google button is not Google: no provider mark, geometrically identical to the email field.
- **P1** Silent step transition: no focus move, no Enter-to-continue, email reduced to a muted caption.
- **P1** Errors arrive far from the cause; `aria-invalid` was never emitted; retry re-submits the same credentials.
- **P2** Password cannot be revealed.

## Corrections Applied

- Measured `max-w-md` column on every viewport; the 1440 field is 448px.
- Wordmark lockup and a close control; title is the single h1.
- Google CTA with the four-colour mark and a loading label.
- Step transition focuses the password, Enter advances from email, `1 / 2` and `2 / 2` markers.
- Field errors sit under their field with `role="alert"`, `aria-live="polite"` and `aria-invalid` on the input.
- Password reveal control at the inline end.
- Calm input surface (`bg-secondary`), no change to non-enumeration or `returnTo` behaviour.

Evidence: `.impeccable/review/signin/before-*.png` and `.impeccable/review/brand/signin-*.png`.
