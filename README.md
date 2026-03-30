# Beat.Line

**Beat.Line** is a high-performance, web-based rhythm game built with **Three.js** and **Web Audio API**. It features a cyberpunk aesthetic, procedural generation, and advanced gameplay mechanics inspired by classic arcade rhythm games.

## Features

- **Core Gameplay:** 4-lane rhythm action with taps, holds, and lane swaps.
- **Visuals:** Custom GLSL shaders for backgrounds, notes, and post-processing (Bloom, Glitch).
- **Audio:** Real-time audio analysis (FFT) for visual reactivity.
- **Modes:** Campaign, Arcade, Multiplayer (Simulated), and Level Editor.
- **Customization:** Skin system, themes, and note styles.
- **Accessibility:** Colorblind modes, remappable keys, and dynamic difficulty.
- **Tech:** WebXR support for VR gameplay, Gamepad API support.

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge) with WebGL 2.0 support.
- Node.js (>=18) for local build/test tooling.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/beat-line.git
   ```
2. Navigate to the project directory:
   ```bash
   cd beat-line
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run in development mode with Vite:
   ```bash
   npm run dev
   ```
   - Référence: http://localhost:5173

5. Build for production:
   ```bash
   npm run build
   ```
6. Serve la version build:
   ```bash
   npm run serve
   ```

### Alternative without Node / local server

- Si vous ne voulez pas de Node, servez le dossier `www` depuis n'importe quel serveur HTTP (ex. Apache, Nginx, Live Server).
- Ouvrez `http://localhost:<port>`.

### Tests

- Unit tests : `npm test`.
- End-to-end (E2E) : `npm run test:e2e` (Playwright Chrome, clavier + overlay).
- CI : `.github/workflows/nodejs.yml`.


## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Lane 1 | **D** | D-Pad Left / X |
| Lane 2 | **F** | D-Pad Up / Y |
| Lane 3 | **J** | D-Pad Down / A |
| Lane 4 | **K** | D-Pad Right / B |
| Pause | **ESC** | Start |
| Slow Motion | **Shift** | L1 / R1 |
| Rewind (Practice) | **Backspace** | Select |

## Architecture

The project follows a modular architecture:

- **`js/core/`**: Core systems (GameManager, SceneManager, AudioManager, etc.).
- **`js/scenes/`**: Game states (MenuScene, GameScene, EditorScene, etc.).
- **`js/shaders/`**: Custom GLSL vertex and fragment shaders.
- **`js/utils/`**: Helper functions and constants.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Three.js** community for the amazing library.
- **ShaderToy** for shader inspiration.
