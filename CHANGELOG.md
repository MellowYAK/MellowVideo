# Changelog

## [0.9.0] - 2026-08-31

### Added

- Per-frame `audioPlayback` (`once` or `loop`).
- Reusable `audioEnd` and `audioDuration` trimming.
- Live audio start/end/playback controls and current/clip/file timing readout.
- Prompt Export metadata for playback mode, trim range, clip length and source duration.

## [0.8.0] - 2026-08-31

### Added

- Frame-scoped audio sources, start times, volume and scope metadata.
- Automatic audio stop when the next frame declares `audio: false`.
- Reusable localized `requestAudioConsent()` gate for iPhone playback unlock.
- Debug controls for audio Enabled, Volume, Muted and Preview/Stop.
- Prompt Export audio metadata: file, scope, state, start, volume and mute.
- Reusable Action control type for live editor commands.

## [0.7.2] - 2026-08-31

### Fixed

- Closing the open Edit Options drawer now returns to the normal frame-footer
  readout instead of collapsing Debug Mode into the right-side chip.
- The complete Debug panel collapses only when its editor drawer is already closed.

## [0.7.1] - 2026-08-31

### Fixed

- Mobile Edit Options now uses a scrollable half-screen drawer, keeping the
  live scene preview visible while preventing controls and Prompt Export from
  being clipped.

## [0.7.0] - 2026-08-31

### Added

- Live Debug Dashboard prompt export with Generate and Copy actions.
- Export scopes for current frame, complete chapter and exact timeline moment.
- Default prompt builder containing live control values, frame duration and range.
- Custom `promptExport.build(context)` hook for project-specific wording.
- Public `getControlValues()`, `generatePrompt()` and `copyPrompt()` APIs.

### Fixed

- Expanded mobile Edit Options now becomes a scrollable editor drawer instead
  of being clipped behind the navigation controls.

## [0.6.3] - 2026-08-31

### Added

- `placement: 'frame-footer'` for keeping Debug Mode visible inside a
  full-screen story without covering its main visual card.

### Changed

- The How It Works editor now places Debug Mode above mobile navigation instead
  of below the viewport fold.

## [0.6.2] - 2026-08-31

### Added

- `placement: 'after-host'` for a Debug Dashboard below the edited frame.
- `fixed` and `after-host` placement discovery in the public capability manifest.

### Changed

- The How It Works editor now keeps the full iPhone frame unobstructed and puts
  Debug Mode below it in document flow.

## [0.6.1] - 2026-08-31

### Added

- Optional `EDIT OPTIONS` mini editor inside Debug Mode.
- Reusable Select, Toggle and Number controls with host-defined live callbacks.
- `setFrameDuration()` and `recalculate()` for live frame timing edits.
- Runtime helpers for synchronizing control values and hiding timing readouts.
- Enter-key commit for live Number controls.

### Changed

- Debug controls stay collapsed until requested, keeping the playback view clear.
- Capability discovery now lists editor control types and timeline editing APIs.

## [0.6.0] - 2026-08-31

### Added

- Global optional Debug Mode through `MellowVideo.enableDebug()`.
- Live frame duration, elapsed/remaining time, range, total position and state.
- Compact persistent toggle that does not alter the story or exported output.
- Debug capability metadata in `MellowVideo.describe()`.

## [0.5.0] - 2026-08-31

### Added

- `FrameTimeline` for navigation between internal frames instead of chapters.
- Automatic frame start-time calculation from frame durations.
- Optional audio seeking on frame navigation.
- Frame-level play, pause, next, previous and `goTo()` APIs.
- Versioned `MellowVideo.describe()` capability manifest and global
  `MELLOW_VIDEO_MANIFEST` discovery object.

### Fixed

- Nested transitions now run once per frame visit, preventing the completed
  green state from flashing back to orange.
- Frame animations, including pseudo-element wipes, restart from time zero when
  `goTo()`, `next()` or `previous()` selects a frame.
- Frame nodes remount on selection as a cross-browser animation reset fallback.
- Agent windows expose a localized `accepted` state with a visible Enter-key
  press before the working response begins.

## [0.4.0] - 2026-08-31

### Added

- Optional scene 0 chapter-title component through `chapterCardMarkup()`.
- Ready `comic-cyber` and `cinematic-dark` chapter-card themes.
- `panel-slam` comic entrance effect.
- Configurable eyebrow, title, subtitle, badge, accent, contrast and duration.

## [0.3.0] - 2026-08-31

### Added

- Reusable `agentWindowMarkup()` component for cinematic coding-agent scenes.
- Ready `claude-code` and `vscode` themes.
- Selectable `prompt-zoom` effect with duration control.
- `prompt-pan` camera effect that presents a complete readable prompt, pans
  across it, then reveals the entire chat window.
- Character-by-character prompt, Enter key and working-state hooks.

## [0.2.0] - 2026-08-30

### Added

- `cyberpunk-title` presentation mode with a neon title panel, scan-line
  texture and responsive title animation.
- Title-only rendering that preserves the scene label and body in the data and
  DOM while hiding them visually.

### Fixed

- Kept desktop story navigation below the cyberpunk title panel without changing the mobile control layout.

## [Unreleased]

### Added

- Global presentation configuration for sequenced and ordinary frames.
- Optional global page-transition switch.

## [0.1.1] - 2026-08-30

### Fixed

- Increased mobile subtitle clearance above navigation and iPhone safe areas.

## [0.1.0] - 2026-08-30

### Added

- Initial standalone presentation library.
- Reversible story and cinematic-subtitles modes.
- Animated chapter label, title and subtitle.
- Responsive layout for narrow mobile screens and safe areas.
- Reduced-motion support.
