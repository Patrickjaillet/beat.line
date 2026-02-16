# Description des Systèmes Centraux

Cette section détaille le rôle des principaux gestionnaires (`Managers`) situés dans le dossier `/js/core/`.

### GameManager.js

C'est le chef d'orchestre du jeu. Il est responsable de :
- L'initialisation du moteur de rendu Three.js (`WebGLRenderer`) et du `EffectComposer`.
- La création de tous les autres gestionnaires (scènes, audio, contrôles...).
- La gestion de la boucle de jeu principale (`render loop`) qui met à jour et dessine la scène active à chaque frame.
- La gestion des états globaux du jeu (ex: `PAUSED`, `PLAYING`).

### SceneManager.js

Ce gestionnaire s'occupe du cycle de vie des scènes.
- Il enregistre toutes les scènes disponibles dans le jeu.
- Il gère les transitions fluides (effet de "wipe") entre les scènes, en s'assurant que l'ancienne scène est correctement nettoyée (`dispose`) avant d'initialiser la nouvelle.

### AudioManager.js

Utilise l'API Web Audio pour toutes les opérations sonores.
- Charge les fichiers audio de manière asynchrone.
- Décode l'audio dans un `AudioBuffer` pour une lecture précise.
- Fournit des données d'analyse en temps réel (comme `getAverageFrequency()`) utilisées par les shaders et les effets visuels pour réagir à la musique.
- Gère la lecture, la pause et l'arrêt des sons.

### NoteFactory.js

C'est l'usine à notes. Son rôle est de :
- Gérer un "pool" d'objets `Mesh` pour optimiser les performances en réutilisant les notes au lieu de les créer/détruire constamment.
- Lire une carte de notes (`chart`) et faire apparaître les notes au bon moment en fonction de la position dans la chanson.
- Mettre à jour la position des notes à chaque frame pour les faire défiler vers le joueur.
- Gérer la logique de détection des coups (`checkHit`) et des relâchements (`checkRelease`) en collaboration avec `InputHandler`.

### ProceduralGenerator.js

C'est le cœur de la génération automatique de niveaux.
- Il prend un `AudioBuffer` en entrée.
- Il analyse l'énergie du signal audio en utilisant une **moyenne mobile** pour détecter les pics (temps forts).
- Il applique une **quantization** pour s'assurer que les notes générées sont parfaitement synchronisées sur la grille rythmique (noires, croches...) définie par le BPM.
- Il génère un `chart` (une liste de notes avec leur temps et leur piste) qui peut ensuite être utilisé par `NoteFactory`.