# Audit de Code — Beat.Line

> **Date de l'audit :** 30 mars 2026  
> **Version analysée :** 1.0.0 (contenu du `www.zip`)  
> **Portée :** 100 % des fichiers sources (JS, GLSL, HTML, CSS, docs)

---

## Résumé exécutif

Beat.Line est un jeu de rythme 3D en pur JavaScript navigateur, construit sur **Three.js r160** et la **Web Audio API**. L'architecture est globalement saine, modulaire et bien découpée. Les points forts sont la clarté du découpage en scènes/managers, la qualité visuelle (shaders GLSL, post-processing) et l'étendue des fonctionnalités (replay, éditeur, multijoueur, campagne…).

En revanche, plusieurs **bugs fonctionnels**, des **risques de régression** dus à des duplications de logique, des **fuites mémoire potentielles**, des problèmes de **qualité du code** (console.log de production, `alert()` natif, variable morte) et des points de **dette technique** méritent une correction avant un déploiement sérieux.

---

## 1. Structure du projet

```
/
├── assets/songs/          (vide — fichiers MP3 non inclus dans le zip)
├── css/style.css
├── docs/
│   ├── CHANGELOG.md
│   ├── CONTRIBUTING.md
│   ├── CORE_SYSTEMS.md
│   ├── LICENSE (MIT)
│   ├── PROJECT_STRUCTURE.md
│   └── README.md
├── js/
│   ├── core/              (22 managers)
│   ├── scenes/            (14 scènes)
│   ├── shaders/           (12 paires vertex/fragment)
│   ├── tests/unitTests.js
│   ├── utils/             (constants.js, Localization.js, songList.js)
│   └── main.js
├── favicon.ico
├── index.html
├── package.json
├── README.md
└── TODO.md
```

**Observations structurelles :**
- La séparation `core/` / `scenes/` / `shaders/` / `utils/` est cohérente et bien respectée.
- Aucun bundler (Vite, Webpack…) n'est configuré. Three.js est chargé via CDN (`unpkg.com`) et un **import map** dans `index.html`. C'est fonctionnel pour le développement, mais fragile en production (dépendance réseau, pas de cache maîtrisé, pas de tree-shaking).
- Le répertoire `assets/songs/` est vide — la totalité du gameplay est donc inutilisable en l'état sans ajouter manuellement les 9 fichiers MP3 référencés dans `songList.js`.

---

## 2. Bugs fonctionnels

### 2.1 — Variable morte `targetZ` dans `NoteFactory.js` ⚠️ CRITIQUE

**Fichier :** `js/core/NoteFactory.js`, lignes 111–120

```js
// ligne 111 — calculée mais JAMAIS utilisée
const targetZ = (note.userData.time - songTime) * this.noteSpeed;

// ligne 120 — la position réelle est calculée différemment
note.position.z = (songTime - note.userData.time) * this.noteSpeed;
```

`targetZ` est déclarée, commentée « positif : vient vers nous » et abandonnée. La ligne 120 recalcule la position avec une formule opposée. En conséquence, les notes **s'éloignent du joueur** (Z positif croissant) au lieu d'arriver vers lui (Z négatif vers 0). Le jeu est **injouable** tant que ce bug n'est pas corrigé ou que la formule de spawn initial ne compense pas exactement. À corriger :

```js
// Supprimer targetZ, utiliser une seule formule cohérente :
note.position.z = -(note.userData.time - songTime) * this.noteSpeed;
```

---

### 2.2 — Double déclenchement de `gameOver()` ⚠️ ÉLEVÉ

**Fichiers :** `js/core/ScoreManager.js` (l. 149–150) et `js/scenes/GameScene.js` (l. 200–202)

`ScoreManager.registerMiss()` appelle directement `this.game.gameOver()` si la santé tombe à 0. `GameScene.update()` fait la même vérification au tick suivant. Même si `gameOverTriggered` évite la plupart des doublons côté scène, le premier appel vient de `ScoreManager` **sans passer par `gameOverTriggered`**, ce qui peut déclencher deux fois `gameOver()` en cas de miss simultané ou de delta élevé. Il faut centraliser cette logique dans `GameScene` et retirer l'appel direct dans `ScoreManager`.

---

### 2.3 — Accès à `this.game.conductor` depuis `MultiplayerManager` ⚠️ ÉLEVÉ

**Fichier :** `js/core/MultiplayerManager.js`, ligne 81

```js
if (this.socket) this.socket.send(JSON.stringify({
    score: this.game.conductor.songPosition * 1000, combo: 0
}));
```

`GameManager` n'a pas de propriété `conductor` — celle-ci appartient à `GameScene`. En mode spectateur, ce code lève une exception `Cannot read properties of undefined (reading 'songPosition')` à chaque appel de `sendUpdate()`.

---

### 2.4 — Spawn Z incohérent entre `createNote()` et `update()` — **NoteFactory**  ⚠️ MOYEN

**Fichier :** `js/core/NoteFactory.js`, lignes 55–58 et 100

`createNote()` place la note à `z = -spawnDistance` (fixe = -100). Mais dans la boucle de spawn de `update()`, la position est immédiatement recalculée à la ligne 100 :

```js
mesh.position.z = (noteData.time - songTime) * -this.noteSpeed;
```

La position initiale définie dans `createNote()` est donc **écrasée une ligne plus bas**, rendant inutile cette initialisation. C'est redondant et source de confusion pour la maintenance.

---

### 2.5 — Accumulation du score du boss hors `ScoreManager` ⚠️ MOYEN

**Fichier :** `js/scenes/GameScene.js`, ligne 196

```js
this.scoreManager.score += 2000;
```

Le bonus de 2 000 pts à la défaite du boss est ajouté directement sur la propriété `score` en contournant `addHit()`. L'interface n'est pas mise à jour (pas d'appel à `updateUI()`), le combo n'est pas modifié, et ce score échappe à toute logique de multiplicateur, d'achievement ou de synchronisation multijoueur.

---

### 2.6 — Fuites mémoire potentielles dans `EffectsManager.triggerGlitch()` ⚠️ MOYEN

**Fichier :** `js/core/EffectsManager.js`, ligne 48

```js
triggerGlitch(duration = 200) {
    this.glitchPass.enabled = true;
    setTimeout(() => { this.glitchPass.enabled = false; }, duration);
}
```

Si la scène est détruite (dispose) avant que le `setTimeout` s'exécute, `this.glitchPass` peut être `null` ou l'objet détaché, provoquant une erreur silencieuse. Il faut vérifier l'existence de `this.glitchPass` dans le callback.

---

### 2.7 — Objets Three.js non disposés dans `optimizeRenderer()` ℹ️ FAIBLE

**Fichier :** `js/core/GameManager.js`, lignes 418–422

```js
const dummyScene = new THREE.Scene();
const dummyCamera = new THREE.PerspectiveCamera();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(...));
dummyScene.add(mesh);
this.renderer.compile(dummyScene, dummyCamera);
// Aucun dispose() sur geo, mat, scene
```

La géométrie et le matériau du mesh factice ne sont jamais libérés (`.dispose()`). Mineure au démarrage, mais reflète un pattern à éviter.

---

## 3. Qualité du code

### 3.1 — `alert()` natif utilisé dans la logique de jeu 🔴 À CORRIGER

**Fichier :** `js/core/GameManager.js`

```js
// lignes 253–254
if (passed) alert("LEVEL CLEARED! NEXT LEVEL UNLOCKED.");
else alert("LEVEL FAILED. TRY AGAIN.");

// ligne 275
if (leveledUp) alert(`LEVEL UP! You are now Level ${this.profileManager.data.level}`);

// ligne 278
if (newBadge) alert("NEW BADGE UNLOCKED!");

// lignes 394, 397
alert("VR not supported on this device.");
alert("WebXR not found.");
```

`alert()` bloque le thread UI, suspend la boucle de rendu et offre une UX catastrophique. Ces notifications doivent toutes utiliser le système `createOverlay()` ou `AchievementManager.showNotification()` déjà disponibles dans le projet.

---

### 3.2 — `console.log()` de debug en production 🟡 À NETTOYER

Plusieurs `console.log()` sont laissés dans le code de production :

| Fichier | Ligne | Message |
|---|---|---|
| `GameManager.js` | 308 | `"Fullscreen blocked"` |
| `GameManager.js` | 406 | `"WebGPU Hardware Acceleration: Available"` |
| `MultiplayerManager.js` | 19 | `"Connected to real multiplayer server"` |
| `GamepadManager.js` | 9, 17 | Gamepad connect/disconnect |
| `ProceduralGenerator.js` | 7, 82 | Début/fin de génération |
| `GameScene.js` | (plusieurs) | Chargement, durée, génération, fin de niveau |

Ces logs doivent être supprimés ou conditionnés à un flag `DEBUG`.

---

### 3.3 — Langues mélangées dans les commentaires 🟡

Le code mélange commentaires en **français** (NoteFactory, GameScene, ProceduralGenerator, BackgroundManager) et en **anglais** (GameManager, ScoreManager, HUDManager). À unifier pour faciliter la contribution.

---

### 3.4 — `innerHTML` avec données potentiellement non sanitisées 🟡

**Fichier :** `js/core/AchievementManager.js`, ligne 44

```js
el.innerHTML = `<div style="font-weight:bold">${def.title}</div>
               <div style="font-size:0.8em">${def.desc}</div>`;
```

`def.title` et `def.desc` sont ici des constantes internes, donc sans risque immédiat. Mais dans `MenuScene.js`, des données utilisateur (ex. `profileManager.data.username`) sont parfois interpolées directement dans `innerHTML` sans encodage. Si le champ `username` contient du HTML ou du JavaScript, cela constitue un vecteur XSS. Recommandé : utiliser `textContent` pour les données dynamiques.

---

### 3.5 — ID HTML dupliqués potentiels entre scènes 🟡

`ScoreManager` crée des éléments avec `id="score"`, `id="combo"`, `id="feedback-item"`. `HUDManager` crée son propre DOM parallèle et tente d'en masquer d'autres via `legacyIds`. Les deux managers sont instanciés simultanément dans `GameScene`. L'existence de deux éléments `#score` dans le DOM est invalide en HTML et `querySelector('#score')` ne retournera que le premier trouvé, rendant l'un des deux silencieux.

---

### 3.6 — CSS `style.css` très minimal — variables CSS incomplètes 🟡

**Fichier :** `css/style.css`

Le fichier ne définit que 3 variables CSS (`--primary-color`, `--bg-color`, `--font-main`) mais le code JS utilise abondamment `--secondary-color`, `--font-family`, `--text-shadow` qui sont définies **uniquement via `ThemeManager.applyTheme()`**. Si `applyTheme()` n'est pas appelé (scénario d'erreur), tous ces éléments UI s'affichent sans style. Il faut définir des valeurs par défaut dans `:root` dans le CSS.

---

### 3.7 — `cloudSave()` simule une connexion factice 🟡

**Fichier :** `js/core/GameManager.js`, lignes 430–490

La sauvegarde cloud affiche un spinner animé avec les textes `"CONNECTING TO CLOUD SERVER..."` puis `"UPLOADING PROFILE DATA..."`, mais ces délais (800ms + 1500ms) sont de pures `await setTimeout` sans aucune opération réseau réelle. La requête `fetch()` n'est tentée que si `this.settings.cloudSaveEndpoint` existe, ce qui n'est jamais défini. Un utilisateur croira sincèrement que ses données sont synchronisées dans le cloud alors qu'elles sont uniquement sauvegardées en `localStorage`. C'est **trompeur** et doit être corrigé (texte honnête ou endpoint implémenté).

---

### 3.8 — `ProceduralGenerator` n'a pas de mode `'Expert'` géré 🟡

**Fichier :** `js/core/ProceduralGenerator.js`, lignes 13–21

```js
if (difficulty === 'Easy') { ... }
else if (difficulty === 'Hard') { ... }
// Pas de 'Expert' — tombe sur les valeurs par défaut (Normal)
```

`songList.js` définit plusieurs tracks avec `difficulty: 'Expert'`, et la campagne utilise aussi `'Expert'`. Pourtant le générateur traite `'Expert'` identiquement à `'Normal'`. Il faut ajouter une branche `Expert` (seuil plus bas, grille plus fine).

---

## 4. Architecture et dette technique

### 4.1 — `GameManager` sur-chargé (532 lignes) 🟡

`GameManager` cumule : initialisation du renderer, logique de loading screen, gestion des overlays UI, logique de game over, progression XP/badges, cloud save, VR, et détection WebGPU. Ces responsabilités devraient être distribuées (ex. un `UIOverlayManager`, un `ProgressionService`).

### 4.2 — `MenuScene.js` monolithique (1 119 lignes) 🔴

`MenuScene` est le fichier le plus long du projet. Il gère en un seul fichier : le menu principal, la sélection de chansons, les modificateurs, les quêtes journalières, la liste d'amis, les DLC, les avatars 3D, le jukebox, le classement, et l'interface de profil. Ce fichier devrait être découpé en sous-composants ou sous-scènes.

### 4.3 — Absence de système d'événements centralisé 🟡

La communication inter-managers se fait par **couplage direct** (ex. `GameScene` appelle `this.game.gameOver()`, `ScoreManager` appelle `this.game.triggerGlitch()`). Un EventBus léger réduirait les couplages et faciliterait les tests.

### 4.4 — Leaderboard entièrement local (mock) 🟡

**Fichier :** `js/core/LeaderboardManager.js`

Le classement est simulé avec des données mockées et `localStorage`. L'endpoint `BEATLINE_SETTINGS.leaderboardEndpoint` n'est jamais configuré dans le projet. Aucune implémentation réseau réelle n'existe. Ce système est présenté comme un classement global mais n'est que local. La feature est en l'état **non fonctionnelle** pour son objectif déclaré.

### 4.5 — Multiplayer sans backend ⚠️

**Fichier :** `js/core/MultiplayerManager.js`

Le mode multijoueur utilise un mock WebSocket par défaut (simule un adversaire via `setTimeout` et `Math.random()`). `this.game.settings.multiplayerServerUrl` n'est jamais défini. Le mode multijoueur est donc **une démo UI** et non une fonctionnalité fonctionnelle.

### 4.6 — `ReplayManager` : playback ne filtre pas les keydown répétés 🟡

**Fichier :** `js/core/ReplayManager.js`

`update()` appelle `inputHandler.onKeyDown({ code })` directement, sans passer par `handleInput()` qui filtre `e.repeat`. Les replays avec des notes longues tenues peuvent se déclencher plusieurs fois.

### 4.7 — `ProceduralGenerator` bloque le thread principal 🟡

**Fichier :** `js/core/ProceduralGenerator.js`

La génération itère sur l'intégralité du `Float32Array` audio (potentiellement plusieurs millions de samples) de manière **synchrone** dans le thread principal. Sur un fichier de 2–3 minutes, cela peut geler l'UI pendant 50–200ms. Solution : utiliser un `Web Worker` ou `AudioContext.decodeAudioData` en mémoire partagée.

### 4.8 — Aucun CSP (Content Security Policy) défini 🟡

**Fichier :** `index.html`

Aucune directive `Content-Security-Policy` n'est présente dans le `<head>`. Combiné aux nombreux `innerHTML` avec données interpolées, cela laisse la porte ouverte à des attaques XSS si des données utilisateur mal filtrées sont un jour injectées (ex. pseudo réseau, noms de charts workshop).

---

## 5. Tests

**Fichier :** `js/tests/unitTests.js`

### Points positifs
- Des stubs DOM et `localStorage` sont correctement mis en place pour Node.js.
- Les tests de `ScoreManager`, `CampaignManager`, et `LeaderboardManager` couvrent les cas nominaux et le cas `noFail`.
- Le test `testReplayManager()` couvre l'enregistrement et la lecture.

### Points manquants
- Aucun test sur `NoteFactory` (le module le plus critique, et celui qui contient le bug §2.1).
- Aucun test sur `Conductor` (timing).
- Aucun test sur `ProceduralGenerator` (vérification du nombre de notes, absence de doublons).
- `testVRSupport()` ne fait que vérifier l'existence de méthodes — ce n'est pas un test fonctionnel.
- Les tests ne sont pas intégrés à un framework (Jest, Vitest) et doivent être lancés manuellement via `node js/tests/unitTests.js`. Aucune intégration CI n'est en place.
- L'import dynamique `await import('../core/ReplayManager.js')` dans `testReplayManager` peut échouer selon la version de Node.js utilisée si le projet n'est pas servi en ESM strict.

---

## 6. Performance

| Point | Fichier | Sévérité |
|---|---|---|
| Pixel ratio plafonné à 1.5 | `GameManager.js` | ✅ Bonne pratique |
| AA désactivé (post-processing) | `GameManager.js` | ✅ Bonne pratique |
| Object pooling notes & particules | `NoteFactory.js`, `ParticleSystem.js` | ✅ Bonne pratique |
| `renderer.debug.checkShaderErrors = false` | `GameManager.js` | ✅ OK en production |
| Bloom résolution à la moitié | `EffectsManager.js` | ✅ Bonne pratique |
| Génération procédurale synchrone sur thread principal | `ProceduralGenerator.js` | ⚠️ Risque de freeze |
| `ParticleSystem` crée des `CanvasTexture` à la demande | `ParticleSystem.js` | 🟡 Pré-générer au démarrage |
| `TrackManager` clone un `ShaderMaterial` par lane (4×) | `TrackManager.js` | 🟡 Acceptable mais surveiller |
| Three.js via CDN `unpkg` sans cache service worker | `index.html` | 🟡 Latence au premier chargement |

---

## 7. Accessibilité et UX

- Pas de support clavier dans les menus (navigation à la souris uniquement dans `MenuScene`).
- Le mode daltonien (`colorblindMode`) est présent dans les settings mais **aucune implémentation visuelle** ne l'utilise dans les shaders ou les matériaux.
- `focusMode` et `zenMode` sont des flags dans `GameManager.settings` mais ne sont activés nulle part dans le code de rendu.
- Les overlays (`createOverlay()`) ne sont pas accessibles : pas de `aria-*`, pas de focus trap, pas de fermeture à la touche `Escape`.
- La police **Orbitron** est chargée depuis Google Fonts (`css/style.css`) — cela peut poser des problèmes RGPD en Europe sans consentement explicite.

---

## 8. Récapitulatif des priorités

### 🔴 Critique (bloquant pour le jeu)
1. **`NoteFactory.js` — Variable `targetZ` morte et formule de position incohérente** → le jeu est injouable.
2. **`MenuScene.js` — 1 119 lignes monolithiques** → maintenabilité quasi nulle.

### ⚠️ Élevé (bugs ou UX sévèrement dégradée)
3. Double déclenchement de `gameOver()` (`ScoreManager` + `GameScene`).
4. Accès `this.game.conductor` inexistant dans `MultiplayerManager`.
5. Tous les `alert()` natifs dans `GameManager` (campagne, XP, VR).
6. `cloudSave()` simulé présentée comme une vraie sauvegarde cloud.

### 🟡 Moyen (dette technique / qualité)
7. Ajout d'une branche `'Expert'` dans `ProceduralGenerator`.
8. Nettoyer tous les `console.log()` de production.
9. Uniformiser la langue des commentaires (FR ou EN).
10. Sanitiser les interpolations `innerHTML` avec données utilisateur.
11. IDs HTML dupliqués (`#score`, `#combo`) entre `ScoreManager` et `HUDManager`.
12. Variables CSS manquantes dans `:root` de `style.css`.
13. Bonus boss non passé par `ScoreManager.addHit()`.
14. `ProceduralGenerator` synchrone → migrer en Web Worker.
15. Ajouter tests unitaires sur `NoteFactory` et `Conductor`.

### ℹ️ Faible (améliorations futures)
16. Bundler (Vite) pour ne plus dépendre de CDN en production.
17. EventBus pour découpler les managers.
18. CSP header pour se protéger contre le XSS.
19. Implémentation réelle du backend leaderboard et multijoueur.
20. Implémentation effective des modes daltonien, focus, zen.

---

*Audit réalisé par analyse statique complète du code source — 102 fichiers, ~8 500 lignes de JavaScript.*
