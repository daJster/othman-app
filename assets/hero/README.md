# Hero film

The landing hero plays one film behind a frosted panel. It ships as **one
H.264 encode** used on every screen: the phone, the tablet and the web.

| File               | Composition | Use                         |
| ------------------ | ----------- | --------------------------- |
| `hero-wide.mp4`    | 16:9        | every screen, cover-cropped |
| `poster-wide.jpeg` | 16:9        | frame one of the same film  |

The hero cover-crops the frame, so a portrait phone sees the centre of the
same push. One file means one download, one cache entry, and no source swap
when the window changes shape. The poster is the instant-paint layer under
the player and the whole hero when playback fails.

Drop the two files in this folder; `src/features/home/hero-media.ts` is the
only place that names them.

## One take, not a montage

A loop cannot contain a cut: every seam is a visible jump on a timer. Shoot a
single slow push — mosque interior → architectural inscription → the open
mushaf — and let the camera _find_ the inscription rather than cutting to it.
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

- H.264 / yuv420p, `-movflags +faststart`, no audio track. `faststart` puts the
  index at the front, which is what lets the browser start playing before the
  whole file has arrived.
- 1280×720. Keep the bitrate high enough that the slow push does not band; the
  current file is around 10 Mbps. It is cached under a hashed name and Firebase
  Hosting serves `/_expo/static/**` and `/assets/**` as immutable for a year,
  so only the first visit pays for it.
- Poster: JPEG, quality ~72, exported from frame one of the same encode so the
  swap to playback is invisible.
