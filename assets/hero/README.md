# Hero film

The landing hero plays four seconds of the film behind a frosted panel on every
screen.

| File               | Length | Size    | Use                         |
| ------------------ | ------ | ------- | --------------------------- |
| `hero-wide.mp4`    | 4.0 s  | ~0.5 MB | every screen, cover-cropped |
| `poster-wide.jpeg` | —      | ~50 KB  | graded frame one            |

## Four seconds, two shots

The shipping cut is the master's opening window (`0.05`–`4.05`s): the open
mushaf, then the Kaaba. It plays straight and loops back to the page. No
ping-pong, no reversed motion — a loop that runs backwards reads as an effect,
and the hero is not an effect.

That window crosses the master's first cut at 2.2 s, which a longer montage
would not survive. Four seconds is the compromise the surface asked for: long
enough to establish the book, short enough that the page is not waiting on a
film.

Do not reintroduce the full nine-second montage. It is travel footage, and the
hero is not a destination.

- Push rate: about 1.05–1.10× across the loop. If a viewer can see the zoom, it
  is too fast.
- No golden-hour minaret silhouettes, no drone pull-back over a dome, no bokeh
  spots. Those are the category's stock grammar and the grade cannot rescue
  them.
- The mushaf page must be a real page. Keep it soft enough that no ayah is
  legible if it is not.

## Grade, baked in

Desaturate hard (`saturation 0.45`) and pull the shadows up toward the hero
field (`brightness -0.015`, `contrast 1.05`), with a gentle vignette
(`angle=PI/5`). The shadows should meet `canopy` instead of ending in a black
band. The result is almost monochrome, with the warm stone and the page cream
doing the only warming.

Do **not** let the basmalah appear in the footage: the panel already carries it
in Amiri, and two calligraphic focal points compete for the same job.

## Recipe

```bash
winget install Gyan.FFmpeg              # once
node scripts/encode-hero.mjs <master> --trim 0.05:4.05
```

The script applies the grade above, cuts the window, encodes H.264 / yuv420p at
1280×720 with `+faststart` and no audio, writes the poster from the graded first
frame, and fails the run if the video exceeds the **3 MB** budget. Pass a _copy_
as the master; the script writes `hero-wide.mp4` in place.

`--loop start:end` still exists (trim + reverse + concat) for a master that is
one continuous push. It is not the shipping path: see above.

Bitrate note: a 4 s, low-detail, desaturated window lands near 0.5 MB at CRF 24.
The old 11.3 MB encode was 10 Mbps of 720p montage — that was the page's whole
performance problem, not a quality requirement.

## Why it plays when it does

- The poster paints first and owns the first frame.
- Playback starts on idle (web) or immediately after mount (native), never
  during the first layout.
- Offscreen or backgrounded pauses it; a manual pause is respected.
- Reduced motion never autoplays: the poster is the whole hero and the play
  control is the opt-in.
