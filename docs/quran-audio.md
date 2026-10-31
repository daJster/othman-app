# Quran audio (P6.1)

Selected-ayah recitation in the reader: one player, one source identity, one
advance rule. The panel is a `BottomSheet`; playback is owned by `ReaderScreen`,
so closing the panel never stops the recitation.

## Source identity

`shaykhAudioUrl(reciter, absoluteAyah)` builds the URL from the reciter's
directory and the **absolute** ayah number (1–6236). The selected ayah's
absolute number comes from the bbox row the tap landed on
(`resolveSelectedAyah`), never from the local ayah key: on a page that crosses a
surah boundary the key repeats.

`useAyahAudio` creates **one** `useAudioPlayer(null)` for the lifetime of the
reader. Changing the ayah or the reciter calls `player.replace({ uri })`; it
does not create a second player. `useAudioPlayerStatus` is the only clock the
UI reads.

## Auto-advance and wrap

`stepAyah(current, direction, ayahCountOf, wrap)` in
`src/core/domain/quran/audio.ts` is the single step rule:

- inside a surah: ayah ± 1;
- at a surah boundary with wrap off: `null` (stop, never request an
  out-of-range ayah);
- with wrap on: first ayah of the next surah / last ayah of the previous
  surah, and 114:last ↔ 1:1.

`adjacentAyahNumbers` is **not** used for advancing: it returns the previous
ayah plus three forward neighbours because it exists for prefetching. Treating
its output as "next" would skip two ayat. `shaykhPrefetchUrls` is likewise not
used here.

Completion is guarded twice in `useAyahAudio`:

- `armed` becomes true only after the _current_ source reports a loaded,
  unfinished status, so a late `didJustFinish` from a replaced source is
  ignored;
- `finishedFor` records which source already advanced, so repeated
  `didJustFinish` frames advance at most once.

Auto-read starts a newly loaded source and is what turns completion into
advancement. A user pause is not overridden.

## Prefetch and failures

`useAudioPrefetch` prefetches exactly the item auto-advance will select, and
clears it on cleanup. The web implementation of `preload` /
`clearPreloadedSource` returns `void` despite promise typings, so both are
wrapped in `Promise.resolve` before `.catch`.

A transport error surfaces in the panel with a retry that replaces the same
source (a new playback generation). Buffering is shown separately; a failed
source is never rendered as a silent empty player.

## Controls

- Play/pause and previous/next ayah are RN buttons (same on all targets).
- Seek, reciter, auto-read, and wrap are `@expo/ui` `Slider`/`Picker`/`Switch`
  inside one `Host` + `Column`; native controls cannot be mounted directly in an
  RN view.
- Previous/next are disabled at a boundary rather than hidden, so the row does
  not reflow under a thumb and assistive technology can report "disabled".
- Reciter, auto-read, and wrap are session state, not persisted: they reset when
  the reader is left. The edition remains the persisted reading preference.

## Session policy

`src/platform/audio/index.ts` applies the installed `AudioMode` once per
process:

```ts
{
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
}
```

The installer's prose said `staysActiveInBackground`; that field does not exist
in `expo-audio` 57. The supported field is `shouldPlayInBackground`.
`doNotMix` requests audio focus, so a call or another player interrupts
recitation. The app does not auto-resume after an interruption; resuming is a
user action.

`app.config.ts` enables the `expo-audio` plugin for playback only:
`microphonePermission: false`, `recordAudioAndroid: false`,
`enableBackgroundPlayback: true`. No microphone permission is requested.

## Limitations

- Lock-screen / control-center controls are out of scope for v1 and are not
  claimed by the UI.
- Silent-mode, interruption, background/foreground, and web playback smoke
  evidence require devices and a deployed host; see the blocked items in
  `openspec/changes/complete-expo-migration/tasks.md` (group 9 / group 17).
