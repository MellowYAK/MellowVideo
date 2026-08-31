# Mellow Video public API

## Frame audio range and playback

Frames accept `audioSrc`, `audioStart`, `audioEnd`, `audioDuration`, `audioPlayback: 'once' | 'loop'`, `audioLoop`, `audioVolume`, and `audioScope`. `audioEnd` is an absolute source time; `audioDuration` is relative to `audioStart`. At the trim boundary playback stops or returns to `audioStart` according to playback mode.

With `audioControls` enabled, Debug Mode adds live enabled, volume, muted, playback, start, end, timing and preview controls. `getAudioState()` returns configured range plus current, clip and source durations.

This file is the authoritative option catalog for Mellow Video. Features added
to the engine must be documented here, in `GUIDE.md`, and in `CHANGELOG.md`.

## Discovery

~~~js
MellowVideo.VERSION;
MellowVideo.describe();
MellowVideo.describe('agentWindow');
window.MELLOW_VIDEO_MANIFEST;
~~~

`describe()` returns a serializable manifest containing the installed version,
public methods, supported themes, effects, controls and option names.

## Presentation layer

~~~js
const video = new MellowVideo(host, { defaultMode: 'story' });
video.show(scene, { mode: 'cinematic-subtitles', label: 'Chapter 01', key: '1' });
video.clear();
~~~

Modes: `story`, `cinematic-subtitles`, `cyberpunk-title`.

## Agent window

`MellowVideo.agentWindowMarkup(options)` returns HTML for a reusable coding-chat
window.

- Themes: `claude-code`, `vscode`
- Effects: `none`, `prompt-zoom`, `prompt-pan`
- Options: `theme`, `effect`, `duration`, `agent`, `files`, `earlier`,
  `earlierLabel`, `previousReply`, `prompt`, `accepted`, `working`, `footer`

## Optional chapter card / scene 0

`MellowVideo.chapterCardMarkup(options)` returns an optional chapter title card.
Omitting the call means the chapter has no scene 0.

- Themes: `comic-cyber`, `cinematic-dark`
- Effects: `none`, `panel-slam`
- Options: `theme`, `effect`, `duration`, `eyebrow`, `title`, `subtitle`,
  `badge`, `accent`, `contrast`

## FrameTimeline

~~~js
const timeline = MellowVideo.createFrameTimeline(host, {
  selector: '.frame',
  frames: [{ duration: 3000 }, { duration: 5000 }],
  audio,             // optional HTMLAudioElement
  autoplay: true,
  loop: false,
  onChange(frame, timeline) {},
  onComplete(timeline) {}
});
~~~

Controls: `goTo(index)`, `next()`, `previous()`, `play()`, `pause()`,
`setPlaying(boolean)`, `recalculate()`, `setFrameDuration(index, milliseconds)`,
`destroy()`.

Each frame exposes `index`, `duration`, `start` (seconds) and `element`.
Supplying `audio` makes frame navigation seek to `frame.start` automatically.
Selecting a frame remounts its visual node and restarts nested CSS animations
and pseudo-element effects from time zero, so a manual jump looks the same as
automatic playback in browsers that do not expose the Web Animations API.

Frame-scoped audio options are `audio`, `audioSrc`, `audioStart`, `audioVolume`
and `audioScope`. Use `audio: false` on the next frame to stop a previous
frame-owned clip during automatic or manual navigation.

## Audio consent gate

`MellowVideo.requestAudioConsent(options)` creates an iPhone-safe modal before
playback. Options: `language`, `host`, localized `copy` and `onChoice(enabled)`.
The returned `AudioGate` exposes `whenChosen`, `setLanguage(language)`,
`choose(enabled)` and `destroy()`.

## Extension contract

- Add visual skins with `data-agent-theme` or `data-chapter-theme` selectors.
- Add motion presets with `data-agent-effect` or `data-chapter-effect` selectors.
- Add every new public feature to `CAPABILITIES`, this file, `GUIDE.md`, and
  `CHANGELOG.md` in the same change.
- Keep content, presentation, timing and audio separate so components remain
  reusable across sites, comics, slideshows and stories.

## Debug Mode

`MellowVideo.enableDebug(host, options)` creates a non-destructive developer
overlay.

- Options: `timeline`, `chapter`, `label`, `enabled`, `storageKey`, `placement`,
  `controls`, `audioControls`, `promptExport`
- Placements: `fixed` (overlay), `after-host` (document flow below the edited
  frame), and `frame-footer` (inside the host, above its navigation area)
- Readouts: chapter, frame, duration, elapsed, remaining, frame range, total
  position and Play/Pause state
- Control types: `select`, `toggle`, `number`, `action`
- Audio controls add Enabled, Volume, Muted and Preview/Stop actions.
- Methods: `setTimeline(timeline)`, `setEnabled(boolean)`,
  `setTimingVisible(boolean)`, `setControlValue(key, value)`,
  `getControlValues()`, `renderControls(controls)`, `generatePrompt(scope)`,
  `copyPrompt()`, `update()`, `destroy()`
- The toggle preference persists in `localStorage` using `storageKey`.
- The panel is not part of the scene tree and is hidden for print output.
- While Edit Options is open, the top Debug close button closes the editor
  drawer first and restores the normal readout. A second click can then collapse
  the complete Debug panel.

Each control accepts `key`, `label`, `type`, `value` and `onChange(value,
control, debugOverlay)`. Select controls also accept `options`; number controls
accept `min`, `max` and `step`. Option entries may be strings or
`{ value, label }` objects. Controls are deliberately host-owned: they can edit
any scene property, CSS data attribute or timeline value without coupling the
engine to one story. Number controls commit on normal field change or Enter.

### Prompt Export

Set `promptExport: true` to add the built-in scope selector, Generate Prompt,
copy button and output. Supported scopes are `frame`, `chapter` and `moment`.
Pass an object to customize `label`, `generateLabel`, `copyLabel`,
`defaultScope`, `scopes` or `build(context)`. The build context contains
`scope`, the current timeline `state`, live control `values`, `controls`,
`chapter` and the overlay. Without a custom builder, Mellow Video creates a
short reusable prompt containing timing, scope and every live editor setting.
When `audioControls` is enabled, Prompt Export also includes the audio file,
scope, enabled state, start time, live volume and mute state.

The feature is discoverable through `MellowVideo.describe('debugMode')`.
