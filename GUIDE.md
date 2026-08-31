# Mellow Video usage guide

## Preload the next frames without a long loading screen

After the audio-consent gesture, preload only the next few frames and music. Keep the loading minimum around 150–200ms and a short timeout. Mark first-visible images with `critical: true`; the loader then waits for `HTMLImageElement.decode()` (up to `criticalTimeoutMs`) instead of advancing to a blank frame. Optional audio may continue warming without blocking the first image. On each frame change, prime the next one or two frames and release queue references several frames behind. Start continuous music at the intended story beat rather than automatically on Frame 00. Prefer WebP/AVIF scene plates sized for their largest rendered viewport rather than multi-megabyte PNG files.

## Keep music playing across frames

Create one background track outside scene rendering and reuse it through the complete chapter or story. Start it only from the audio-consent user gesture. Pause and resume it with the master playback control; do not seek it during frame navigation. Keep frame sounds on a different audio element so both channels can play simultaneously.

## Show an internal thought

Use an HTML thought bubble rather than a speech tail, then apply `anime-thought-zoom` to briefly push toward the subject’s face. Keep intensity near `1`; use `origin` to identify the face location. The preset supplies a quick push, restrained settling motion, and short emphasis lines rather than continuous shaking.

## Animate a speaker naturally

Use `applySpeakerMotion()` when a person in a still image should feel alive while speaking. Prefer `gentle-talk` for breathing, tiny posture shifts and restrained head movement. Use `expressive-talk` only when the scene needs more energy. A feathered `mask` isolates the character and prevents visible hard edges; keep intensity near `1` to avoid a shake effect. Expose preset, intensity and speed through Debug controls so Prompt Export can reproduce the selected look.

## Play once, loop, or trim frame audio

Use `audioPlayback: 'once'` for a one-shot cue or `audioPlayback: 'loop'` for a repeating bed. Trim a long source with `audioStart` and either `audioEnd` or `audioDuration`. The Debug editor previews changes live and displays current playback time, selected clip duration and full file duration. Generate Prompt records the exact configuration so another tool can reproduce it without guessing.

## Load

~~~html
<link rel="stylesheet" href="mellow-video.css">
<script src="mellow-video.js"></script>
~~~

## Initialize

~~~js
const video = new MellowVideo(document.querySelector('.story-frame'));
~~~

## Show cinematic subtitles

~~~js
video.show(scene, {
  mode: 'cinematic-subtitles',
  label: 'Chapter 02 · Scene 01',
  key: '2-1'
});
~~~

## Show a cyberpunk title only

~~~js
video.show(scene, {
  mode: 'cyberpunk-title',
  key: '2-1'
});
~~~

This mode renders only `scene.title`. `scene.body` and the chapter label remain
available in the configuration and DOM, but are intentionally hidden by this
presentation. Switching modes restores them without changing story content.

## Restore the website's original presentation

~~~js
video.clear();
~~~

Set one mode for the complete story:

~~~js
window.MELLOWYAK_VIDEO_CONFIG = {
  mode: 'cyberpunk-title',
  pageTransitions: false
};
~~~

The global mode applies to timed chapters and ordinary frames. To restore the
original website presentation without deleting it, change **mode** to **story**.
For an intentional one-chapter exception, add a **presentation** property to
that chapter's configuration.

Mellow Video never changes story data and never owns the audio element. This
keeps it reusable with cards, slideshows, onboarding and other host layouts.

## Reusable coding-agent window

Build an animated prompt window without tying it to one story:

~~~js
const agentWindow = MellowVideo.agentWindowMarkup({
  theme: 'claude-code', // or 'vscode'
  effect: 'prompt-pan', // 'prompt-zoom' or 'none'
  duration: 5,
  agent: 'AI CODING AGENT',
  files: ['theme.css', 'dashboard.tsx'],
  earlier: 'Make the dashboard cards responsive.',
  previousReply: 'Done. The cards are responsive.',
  prompt: 'Change the website color to emerald green. Keep the layout unchanged.',
  accepted: 'PROMPT ACCEPTED',
  working: 'Reading theme.css…',
  footer: 'Prompt sent'
});

sceneElement.insertAdjacentHTML('beforeend', agentWindow);
~~~

`theme` chooses a ready visual model. `effect` chooses behavior independently.
`prompt-pan` starts close on the complete prompt, moves the camera across it,
then zooms out to reveal the full conversation before Enter and the response.
`prompt-zoom` uses character-by-character typing instead. The effect and theme
are independent, so the same content can look like a VS Code panel, a
Claude-style chat, a comic panel or another future preset. `duration`
synchronizes the focus, typing,
Enter and response animation with the containing frame.

`accepted` localizes the short acknowledgement shown after the animated Enter
press and before `working`. This makes the handoff visible even without audio.

The available built-ins are exposed as `MellowVideo.AGENT_THEMES` and
`MellowVideo.AGENT_EFFECTS`. Add a new skin with
`[data-agent-theme="your-theme"]`; add a new behavior with
`[data-agent-effect="your-effect"]`. This keeps story content separate from
presentation and makes the component portable to another page or project.

## Optional scene 0 chapter card

Use a scene 0 when a chapter needs a short title or idea before its first
content frame. It is optional: omit the call when a chapter should begin
immediately.

~~~js
const sceneZero = MellowVideo.chapterCardMarkup({
  theme: 'comic-cyber', // or 'cinematic-dark'
  effect: 'panel-slam', // or 'none'
  duration: 3,
  eyebrow: 'CHAPTER 01 · SCENE 00',
  title: 'THE EXPECTATION',
  subtitle: 'One prompt — and everything works exactly as expected.',
  badge: '00',
  accent: '#50ead7',
  contrast: '#ff4ea1'
});
~~~

The built-ins are listed in `MellowVideo.CHAPTER_CARD_THEMES` and
`MellowVideo.CHAPTER_CARD_EFFECTS`. Themes, effects and content are independent,
so a story can reuse the same title-card behavior with a comic, cinematic or
future custom skin. Add custom variants with `[data-chapter-theme]` and
`[data-chapter-effect]` selectors.

## Frame-level timeline and audio seeking

Use `FrameTimeline` when a chapter contains several internal visual beats. The
right and left controls can then move one frame instead of one chapter.

~~~js
const timeline = MellowVideo.createFrameTimeline(chapterElement, {
  selector: '.cinematic-step',
  frames: [
    { duration: 3000, audio: true, audioSrc: 'audio/scene-00.mp3', audioStart: 0, audioVolume: .35, audioScope: 'frame' },
    { duration: 5000, audio: false },
    { duration: 5000 },
    { duration: 2500 }
  ],
  audio: document.querySelector('audio'), // optional
  autoplay: true,
  loop: false,
  onChange(frame) {
    console.log(frame.index, frame.start);
  }
});

nextButton.onclick = () => timeline.next();
previousButton.onclick = () => timeline.previous();
pauseButton.onclick = () => timeline.pause();
~~~

`frame.start` is calculated automatically from earlier durations. When an audio
element is supplied, `next()`, `previous()` and `goTo()` seek to that exact
position. Nested frame transitions restart once per visit instead of looping
and flashing back to their initial state.

`audio: false` stops a previous frame-owned clip. This keeps a short sound cue
from leaking into the next scene during automatic or manual navigation.

## Ask for audio before playback

Create the gate while the timeline is paused, then start playback from the
visitor's browser-approved choice:

~~~js
const gate = MellowVideo.requestAudioConsent({
  language: 'en',
  onChoice(enabled) {
    timeline.frames[0].audio = enabled;
    audio.muted = !enabled;
    timeline.play();
  }
});

languageButton.onclick = () => gate.setLanguage('ru');
~~~

Enable Audio unlocks mobile Safari playback. Continue without sound uses the
same visual timeline and leaves audio available for later activation.

## Debug Mode

Attach the development overlay to a timeline:

~~~js
const debug = MellowVideo.enableDebug(storyHost, {
  timeline,
  chapter: '01',
  label: 'MELLOW VIDEO',
  enabled: true,
  placement: 'frame-footer', // or 'after-host' / 'fixed'
  audioControls: { audio, scope: 'frame' },
  promptExport: true,
  storageKey: 'my-project-video-debug',
  controls: [
    {
      key: 'agentTheme',
      label: 'AGENT THEME',
      type: 'select',
      value: 'claude-code',
      options: MellowVideo.AGENT_THEMES,
      onChange(value) {
        document.querySelector('.mellow-agent-window').dataset.agentTheme = value;
      }
    },
    {
      key: 'showTitle',
      label: 'SHOW TITLE',
      type: 'toggle',
      value: true,
      onChange(value) {
        document.querySelector('.chapter-title').hidden = !value;
      }
    },
    {
      key: 'frameDuration',
      label: 'FRAME SECONDS',
      type: 'number',
      value: 5,
      min: .1,
      max: 60,
      step: .1,
      onChange(value) {
        timeline.setFrameDuration(timeline.index, value * 1000);
      }
    }
  ]
});
~~~

The overlay shows only editing information: current frame, frame duration,
elapsed and remaining time, the exact frame range, total timeline position and
Play/Pause state. Click `DEBUG ×` to collapse it and `DEBUG` to restore it.
The preference is stored with `storageKey`. Debug Mode is a separate fixed
overlay, is hidden when printing, and does not modify scenes, audio or exports.

Use `placement: 'after-host'` when the whole visual must remain visible while
editing. The dashboard is inserted immediately after `storyHost` and becomes a
normal scrollable block. Use `placement: 'fixed'` for the compact floating
overlay used on larger editing screens.

Use `placement: 'frame-footer'` for full-screen mobile stories that already
reserve a gap above their navigation. The dashboard becomes a child of the host
and is anchored in that footer gap, so it remains visible without requiring the
editor to discover an extra page below the fold. The host must be positioned
(`position: relative`, `absolute`, `fixed` or `sticky`).

Open `EDIT OPTIONS` to use the optional mini editor. Select, Toggle, Number and
Action
are generic control primitives, so a project can expose only the choices useful
for that story: presentation mode, chat skin, animation preset, title visibility,
timing visibility or current frame duration. Keep the list short and group
advanced settings behind the collapsed editor.

`audioControls` adds live Enabled, Volume, Muted and Preview/Stop controls.
Prompt Export automatically records their values with the current frame's
source, start time and scope.

Use `debug.setTimeline(newTimeline)` after replacing a timeline, or
`debug.setControlValue(key, value)` when navigation changes a live value. Use
`debug.setTimingVisible(false)` for a cleaner panel, or `debug.destroy()` when
leaving the editor.

## Generate a reusable editing prompt

`promptExport: true` adds three scopes to Debug Mode:

- `CURRENT FRAME` — includes the selected frame and its duration.
- `WHOLE CHAPTER` — applies the chosen settings to the complete chapter.
- `EXACT MOMENT` — records the current timeline position.

After changing live controls, press **Generate Prompt**. The output contains
the scope, timing and every control value and can be copied directly. Override
the wording without rebuilding the UI:

~~~js
promptExport: {
  defaultScope: 'frame',
  build({ scope, state, values }) {
    return `Edit ${scope} at ${state.start}s with ${JSON.stringify(values)}`;
  }
}
~~~

The export is plain text and does not mutate the sequence. This makes the live
editor useful both for direct visual tuning and for handing exact instructions
to another coding agent later.
