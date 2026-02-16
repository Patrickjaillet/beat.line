# Beat.Line Project Tracker

## ✅ Phase 1: Core Architecture (Done)
- [x] Define Directory Structure
- [x] Create index.html with Import Maps
- [x] Create Main Entry Point (main.js)
- [x] Implement Basic GameManager Singleton
- [x] Implement SceneManager for transitions
- [x] Create BaseScene class

## ✅ Phase 2: Visuals & Intro (Done)
- [x] Implement IntroScene with GLSL Shader
- [x] Create Intro Fragment Shader (Abstract Art)
- [x] Add Skip Button Logic
- [x] Implement Audio Analysis (FFT) hook

## ✅ Phase 3: Menu & Song Selection (Done)
- [x] Create MenuScene with 3D Background
- [x] Implement SongList Data Structure
- [x] Build DOM UI for Song Selection (Basic Menu)

## ✅ Phase 4: Gameplay Engine (Done)
- [x] Implement Conductor (Timing Logic)
- [x] Create Note Factory (Pooling System)
- [x] Implement Input Handler (4 Keys)
- [x] Add Score & Combo System

## ✅ Phase 5: Core Polish (Done)
- [x] Add Post-Processing (Bloom, Glitch) (Refactored to EffectsManager)
- [x] Optimize Performance (Object Pooling) (Refactored to ParticleSystem)
- [x] Implement Pause Functionality
- [x] Implement Game Over State
- [x] Fix Audio Context Autoplay Policy

## 🎯 Phase 6: Core Refactoring (In Progress)
- [x] Create EffectsManager (Post-Processing Pipeline)
- [x] Create ParticleSystem (Dedicated Pooling)
- [x] Create BackgroundManager (Dynamic Shaders)
- [x] Refactor GameManager (Delegate Graphics)
- [x] Refactor NoteFactory (Delegate Particles)
- [x] Refactor GameScene (Integration)

## 🎯 Phase 7: Visual Polish (Next)
- [x] **Create Tron Grid Shaders (Procedural Glow)**
- [x] **Tune Post-Processing for High Contrast Neon**
- [x] **Refactor Environment for Dark PBR/Emissive Look**
- [x] **HUD Glassmorphism:** Redesign score/combo panels with blur and transparency.
- [x] **Dynamic Health Bar:** Gradient colors (Green->Red) and shake effects on damage.
- [x] **Judgment VFX:** Particle explosions and neon glow for judgment text (Perfect/Good).
- [x] **Lane Lighting:** Emissive pulses on track lanes synchronized with the beat.
- [x] **Progress Bar:** Sleek linear progress bar with song time indicators.
- [x] **Key Overlay:** On-screen mechanical key visualization for input feedback.
- [x] **Score Rolling:** Lerp animation for score numbers (odometer effect).
- [x] **Critical Health FX:** Screen-space red vignette and heartbeat sound when low HP.
- [x] **Start/End Transitions:** Cinematic HUD fade-in and "Level Complete" animations.
- [x] **Ambient Particles:** Dust, snow, rain reacting to music theme.
- [x] **Dynamic Background Color:** Background pulse based on bass frequency.

## 💡 Backlog: Advanced Gameplay & Features
- [ ] **Replay System:**
    - [x] Implement ReplayManager (Recording/Playback)
    - [ ] Implement Replay Editor (Cut and edit replays)
- [ ] **Level Editor:**
    - [x] Basic note placement
    - [ ] Undo/Redo, Copy/Paste, Snap to Grid
    - [ ] BPM Tapper, Waveform visualization
- [ ] **Gameplay Modifiers:**
    - [x] "Lane Swap" Mechanic
    - [ ] "Mirror Mode"
    - [ ] "Slow Motion" Power-up
    - [ ] "Fever Mode"
    - [ ] "Hidden", "Sudden", "No Fail", "Perfect Only"
    - [ ] "Focus Mode" (Darken background)
    - [ ] "Zen Mode" (Hide UI)
- [ ] **Game Modes:**
    - [ ] "Boss Battle" Mode
    - [ ] "Tutorial" Scene
    - [ ] "Campaign Mode" / "Story Mode"
    - [ ] "Visualizer Mode"
    - [ ] "Jukebox Mode"
    - [ ] "Practice Mode"
    - [ ] "Ghost Mode" (vs. replay)
- [ ] **Procedural Generation:**
    - [x] AI-generated charts from any MP3 file (Initial Implementation)
    - [x] Improve algorithm based on difficulty

## 💡 Backlog: Systems & Community
- [ ] **Player Profile & Progression:**
    - [ ] Profile System (XP, Leveling, Badges)
    - [ ] Achievement System
    - [ ] Daily Quests & Rewards
    - [ ] Global Leaderboard
    - [ ] Cloud Save (Firebase/AWS)
- [ ] **Customization:**
    - [ ] Custom Keybinding Menu
    - [ ] Note Skin Selector
    - [ ] Theme System (Menu colors/fonts)
    - [ ] 3D Avatar in menu
- [ ] **Multiplayer:**
    - [ ] "Tournament Mode"
    - [ ] "Spectator Mode"
    - [ ] Real-time Multiplayer (WebSocket, Node.js)
    - [ ] Social Features (Friends, Challenges)
- [ ] **Community & Content:**
    - [ ] "Workshop" for user-created charts
    - [ ] "Mod Support" (Drag & Drop)
    - [ ] DLC Packs (Simulated)
- [ ] **Settings & Accessibility:**
    - [ ] Calibration Wizard (Audio/Video offset)
    - [ ] Gamepad Support & Vibration
    - [ ] Localization (EN, FR, JP, KR)
    - [ ] Accessibility (Colorblind modes, etc.)

## 💡 Backlog: Platform & Integration
- [ ] **VR Support:** WebXR integration.
- [ ] **Mobile Support:** Touch controls, haptic feedback, responsive UI.
- [ ] **Twitch Integration:** Chat commands influence gameplay.
- [ ] **Optimization:** WebGPU renderer backend.
- [ ] **PWA Support:** Installable app with offline mode.
