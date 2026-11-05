# Hero film

The landing hero plays one film behind a frosted panel. It ships as **two
encodes**, one per composition, and both are silent, looping and graded to the
page before they arrive here.

Drop the four files below in this folder, then follow the two steps in
`src/features/home/hero-media.ts` to switch it on. Until then the hero renders
its canopy field — the same state every visitor gets when the film is skipped
for reduced motion, data saving or a blocked autoplay.

| File               | Composition | Use                          |
| ------------------ | ----------- | ---------------------------- |
| `hero-wide.mp4`    | 16:9        | desktop and landscape tablets |
| `hero-tall.mp4`    | 9:16        | phones and portrait tablets   |
| `poster-wide.jpg`  | 16:9        | frame one of `hero-wide`      |
| `poster-tall.jpg`  | 9:16        | frame one of `hero-tall`      |

## One take, not a montage

A loop cannot contain a cut: every seam is a visible jump on a timer. Shoot a
single slow push — mosque interior → architectural inscription → the open
mushaf — and let the camera *find* the inscription rather than cutting to it.
End the move where it began so the loop has no seam.

- Push rate: about 1.05–1.10× across the whole loop. If a viewer can see the
  zoom, it is too fast.
- Length: 8–12 s.
- No golden-hour minaret silhouettes, no drone pull-back over a dome, no bokeh
  spots. Those are the category's stock grammar and the grade cannot rescue
  them.
- The mushaf page must be a real page. Keep it soft enough that no ayah is
  legible if it is not.

## Grade, baked in

Desaturate hard and pull the toes up toward the hero field, so the film's
shadows meet `canopy` instead of ending in a black band. The result should be
almost monochrome, with the warm stone and the page cream doing the only
warming.

Do **not** let the basmalah appear in the footage: the panel already carries it
in Amiri, and two calligraphic focal points compete for the same job.

## Encode

- H.264 / yuv420p, `-movflags +faststart`, no audio track.
- Wide: 1280×720, ≤ 1.8 MB. Tall: 720×1280, ≤ 900 KB.
- 2–3 Mbps is the target. This is deliberately a *low-quality* film: the grade
  and the scrim are designed so the image never has to be sharp.
- Poster: JPEG, quality ~72, ≤ 120 KB, exported from frame one of the matching
  encode so the swap to playback is invisible.
