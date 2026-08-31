# Mellow Video

Mellow Video is a dependency-free presentation layer for timed visual stories.
It coordinates reusable frame timing, presentation, navigation and optional
frame-scoped audio while the host application remains in control.

Current version: **0.11.0**

## Camera motion and thoughts

`applyCameraMotion()` adds reusable cinematic focus moves such as `anime-thought-zoom` and `slow-focus-push`. Configure selector, intensity, duration, and transform origin. `styleThoughtBubble()` converts an HTML caption into a thought bubble while keeping all localized text sharp and accessible.

## Speaker motion

Create subtle, reusable character movement without shaking the whole scene:

~~~js
const motion = MellowVideo.applySpeakerMotion(frame, {
  selector: '.character-image', preset: 'gentle-talk',
  intensity: 1, speed: 1,
  mask: 'radial-gradient(ellipse at 42% 58%, #000 30%, transparent 62%)',
  origin: '42% 58%'
});
~~~

Presets are `none`, `gentle-talk`, and `expressive-talk`. The effect clones only the selected visual layer and supports a feathered mask, so captions and surrounding UI remain stable.

## Audio clips

Each frame can choose whether audio plays once or loops and can trim a reusable segment from a longer source:

~~~js
{ audio: true, audioSrc: 'audio/scene.mp3', audioStart: 4.2,
  audioEnd: 9.7, audioPlayback: 'loop', audioVolume: 0.35,
  audioScope: 'frame' }
~~~

Use `audioDuration` instead of `audioEnd` for a relative clip length. Debug Mode exposes playback, start, end, volume, mute, preview and a live `played / clip · file` readout. Prompt Export records every value.

## Clone

~~~shell
gh repo clone MellowYAK/MellowVideo
~~~

Or use `git clone https://github.com/MellowYAK/MellowVideo.git` without the
GitHub CLI.

## Included presentation modes

- **story** — preserve the host website's existing title, body and speech bubble.
- **cinematic-subtitles** — replace the visible copy with animated film-style
  captions and letterbox bars.
- **cyberpunk-title** — show only the active slide title in a neon cyberpunk
  panel. The label and body remain in the story data but are not displayed.
- **agent-window** — a reusable coding-chat component for product demos,
  comics and cinematic explainers. Choose a `claude-code` or `vscode` skin and
  optional `prompt-zoom` focus effect.
- **chapter-card / scene 0** — an optional animated title card before a chapter.
  It can introduce an idea such as “The Expectation” without becoming a normal
  content scene. Ready themes include `comic-cyber` and `cinematic-dark`.
- **FrameTimeline** — frame-level playback and navigation inside a chapter.
  It owns frame durations, Next/Previous, Play/Pause and optional audio seeking,
  so navigation does not have to jump an entire chapter.
- **Debug Mode** — an optional compact development overlay showing the current
  chapter/frame, frame duration, elapsed and remaining time, exact time range,
  total position and play state. Its optional `EDIT OPTIONS` area becomes a
  small live editor made from reusable Select, Toggle and Number controls.
  It can be fixed over the page, placed after the host, or anchored in the
  host's footer gap between the visual and navigation. It can be collapsed
  without changing playback.
- **Prompt Export** — the Debug Dashboard can generate and copy a reusable
  model prompt from the current live settings. Export only the current frame,
  the complete chapter, or the exact timeline moment.
- **Frame audio** — attach a source, start time, volume and scope to an
  individual frame. Debug Mode can enable, mute, change volume and preview it.
- **Audio consent gate** — an EN/RU-ready, iPhone-safe choice shown before a
  sequence begins, allowing sound or silent playback from a browser-approved
  user gesture.

The original host markup is preserved, so changing modes is reversible.

## Global mode

MellowYAK selects one presentation mode globally:

~~~js
window.MELLOWYAK_VIDEO_CONFIG = {
  mode: 'cyberpunk-title',
  pageTransitions: false
};
~~~

This affects sequenced chapters and ordinary story frames. Use
**mode: 'cinematic-subtitles'** for title plus body, or set **mode: 'story'**
to restore the original host presentation globally.
A chapter may still provide its own **presentation** value when a deliberate
exception is needed.

See [GUIDE.md](GUIDE.md) for integration and [CHANGELOG.md](CHANGELOG.md) for
release history.

## Discover features programmatically

Tools do not need to guess which options exist:

~~~js
MellowVideo.describe();                // complete versioned manifest
MellowVideo.describe('frameTimeline'); // one capability
window.MELLOW_VIDEO_MANIFEST;           // global read-only snapshot
~~~

See [API.md](API.md) for the complete public API and option catalog.
