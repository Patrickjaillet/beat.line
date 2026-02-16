# Structure du Projet

Le projet est organisé de manière logique pour séparer les différentes préoccupations (logique, styles, ressources).

-   `index.html`: Point d'entrée de l'application. Charge les scripts et définit la structure de base du DOM.
-   `TODO.md`: Fichier de suivi des tâches et de la feuille de route du projet.

-   **/css/**
    -   `style.css`: Contient les styles pour l'interface utilisateur (HUD, menus, overlays).

-   **/js/**
    -   `main.js`: Script principal qui initialise le `GameManager`.
    -   **/core/**: Contient les systèmes centraux et les gestionnaires du jeu.
        -   `GameManager.js`: Le cœur de l'application. Gère la boucle de jeu principale, l'état global et l'initialisation de tous les autres managers.
        -   `SceneManager.js`: Gère le cycle de vie des scènes et les transitions.
        -   `AudioManager.js`: Gère le chargement, la lecture et l'analyse de l'audio.
        -   `NoteFactory.js`: Gère la création, le déplacement et la détection des notes.
        -   `ProceduralGenerator.js`: Algorithme de génération de notes à partir de l'audio.
        -   `EffectsManager.js`: Gère la chaîne de post-processing (Bloom, etc.).
        -   `TrackManager.js`: Gère l'affichage de la piste de jeu.
        -   ...et d'autres managers pour le score, les contrôles, etc.
    -   **/scenes/**: Chaque fichier représente un écran ou un état de jeu (Menu, Jeu, Résultats...).
        -   `BaseScene.js`: Classe de base dont héritent toutes les autres scènes.
        -   `GameScene.js`: La scène principale où se déroule le gameplay.
        -   `MenuScene.js`: La scène du menu principal.
    -   **/shaders/**: Contient les shaders GLSL (Vertex et Fragment) pour les effets visuels personnalisés (piste, fonds, notes...).
    -   **/utils/**: Contient des modules utilitaires et des constantes.
        -   `constants.js`: Constantes globales (états de jeu, noms de scènes).
        -   `songList.js`: Liste des chansons disponibles dans le jeu.
        -   `Localization.js`: Système de gestion des traductions.