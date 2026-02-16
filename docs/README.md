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

Pour lancer Beat.Line, vous devez servir les fichiers via un serveur web local.

1.  Assurez-vous d'avoir un environnement de serveur web (par exemple WAMP, XAMPP, ou le module `http-server` de Node.js). Les chemins de fichiers (`c:\UniServerZ\www\...`) suggèrent que vous utilisez déjà une solution de ce type.
2.  Placez les fichiers du projet à la racine de votre serveur web.
3.  Ouvrez votre navigateur et accédez à l'adresse de votre serveur local (ex: `http://localhost/`).