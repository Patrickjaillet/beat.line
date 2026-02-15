# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Mobile Experience:** Dedicated portrait mode, touch controls, haptic feedback, and UI adaptations.
- **Progression System:** XP, Leveling, and Badges for player profile.
- **Editor Tools:** Undo/Redo, Copy/Paste, Snap to Grid, BPM Tapper, and Waveform visualization.
- **Settings & Menu:** Tabbed navigation for better organization.
- **Ambient Particles:** Dust, snow, and rain effects that react to the music theme.
- **Dynamic Background Color:** Background pulse based on bass frequency.
- **Start/End Transitions:** Cinematic HUD fade-in and "Level Complete" animations.
- **Combo Typography:** Custom 3D font for combo counter with scaling animations.
- **Critical Health FX:** Screen-space red vignette and heartbeat sound when low HP.
- **Score Rolling:** Lerp animation for score numbers.
- **Key Overlay:** On-screen mechanical key visualization.
- **Progress Bar:** Linear progress bar with song time indicators.
- **Lane Lighting:** Emissive pulses on track lanes.
- **Judgment VFX:** Particle explosions and neon glow for judgments.
- **Dynamic Health Bar:** Gradient colors and shake effects.
- **HUD Glassmorphism:** Redesigned UI with blur and transparency.
- **Daily Quests:** System for daily objectives and rewards.
- **DLC Packs:** Simulated store for song packs.
- **Workshop:** Browser for user-created charts.
- **Theme System:** Customizable menu colors and fonts.
- **3D Avatar:** Interactive avatar in the menu.
- **Replay Editor:** Tool to cut and edit replays.
- **Calibration Wizard:** Tool to set audio/video offset.
- **Focus Mode:** Gameplay modifier to darken background.
- **Zen Mode:** Gameplay modifier to hide UI.

### Changed
- Refactored `GameManager` to support new scenes and managers.
- Updated `MenuScene` with tabbed navigation.
- Updated `SettingsScene` with tabbed navigation.
- Improved `EditorScene` with BPM Tapper, Waveform visualization, and Drag Selection.

### Fixed
- Fixed audio duration issue in GameScene.
- Fixed mouse interaction issues in Level Editor.