# Beat.Line - Documentation

Bienvenue dans la documentation de Beat.Line, un jeu de rythme ambitieux développé avec les technologies web modernes.

## 1. Présentation

Beat.Line est un jeu de rythme 3D qui s'exécute dans le navigateur. Il utilise **Three.js** pour le rendu graphique et l'**API Web Audio** pour une analyse et une lecture audio précises. Le projet est conçu pour être modulaire et extensible, avec une séparation claire entre les différents systèmes du jeu.

## 2. Fonctionnalités Clés

- **Moteur de Rendu 3D** : Scènes et effets visuels construits avec Three.js.
- **Génération Procédurale** : Capacité à générer des cartes de notes (`charts`) automatiquement à partir de n'importe quel fichier audio MP3.
- **Système de Scènes Modulaire** : Gestionnaire de scènes permettant des transitions fluides entre le menu, le jeu, les résultats, etc.
- **Post-Processing Avancé** : Effets visuels comme le Bloom (lueur néon) et le Glitch pour une esthétique "cyberpunk" prononcée.
- **Visuels Réactifs à la Musique** : Les décors et les pistes réagissent en temps réel à l'intensité de la musique.

## 3. Lancement du Projet

### 3.1 Avec Vite (recommandé)

1. Installer les dépendances :
   - `npm install`
   - `npm install -D vite @playwright/test`
2. Démarrer le serveur de développement :
   - `npm run dev`
3. Ouvrir l'application :
   - par défaut `http://localhost:5173`

### 3.2 Build production

- `npm run build` : génère `dist/`.
- `npm run serve` : prévisualise la build.

## 4. Tests

### 4.1 Tests unitaires

- `npm test` (exécute `js/tests/unitTests.js`)
- Couvre désormais :
  - `ScoreManager`, `CampaignManager`, `LeaderboardManager`
  - `ReplayManager`, `NoteFactory`, `Conductor`, `ProceduralGenerator`
  - un test basique `VRSupport`

### 4.2 Tests E2E Playwright

- `npm run test:e2e`
- Environnement : app démarrée (`npm run dev`)
- Fichier : `e2e/keyboard-overlay.spec.js`
- Vise : navigation clavier, focus tab, overlay accessible, Escape closes.

## 5. Accessibilité et UX

- Navigation clavier dans menu + focus.
- Overlay accessibles (`role=dialog`, `aria-modal`, trap focus, Escape fermera).
- Mode `colorblind`, `focusMode`, `zenMode` implémentés (via le rendu TrackManager et ParticleSystem).

## 6. Sécurité et performance

- CSP meta header ajouté (`index.html`).
- Service worker avec `CACHE_VERSION` + route policy + cache build forcing.
- Vite pour bundling (plus de dépendance CDN runtime pour `three`).

## 7. Audit corrigé (récapitulatif)

### 🔴 Critique
- `NoteFactory` note positions fixes.
- `MenuScene` décomposé en `menu/ProfilePanel`, `PlayPanel`, `ToolsPanel`, `CommunityPanel`, `SystemPanel`.

### ⚠️ Élevé
- `gameOver` dédoublé fixé.
- `MultiplayerManager` safe (conductor check).
- `alert` natifs supprimés.
- Cloud save mock en fallback, endpoint prêt.

### 🟡 Moyen
- Procedural async chunk + WebWorker proposition
- plus de `console.log` nus,
- shaders colorblind avancés,
- `ScoreManager.addBonus` boss
- ID de HUD normalisés.

### ℹ️ Faible
- Vite bundler (fait)
- EventBus (fait)
- CSP (fait)
- Backend leaderboard/multi (structure prête)

## 8. Notes pratiques

- Rendez l’UI [amenable aux tests E2E](#4.2).
- Si vous ajoutez des fichiers MP3, placez-les dans `assets/songs/`.
- Pour le jeu complet, il faut 9 chansons référencées dans `js/utils/songList.js`.

---

Merci d’avoir maintenu Beat.Line propre et testable !