import { BaseScene } from './BaseScene.js';
import { Conductor } from '../core/Conductor.js';
import { EVENTS, GAME_STATE, SCENE_NAMES } from '../utils/constants.js';
import { NoteFactory } from '../core/NoteFactory.js';
import { InputHandler } from '../core/InputHandler.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { ParticleSystem } from '../core/ParticleSystem.js';
import { BackgroundManager } from '../core/BackgroundManager.js';
import { BossManager } from '../core/BossManager.js';
import { TrackManager } from '../core/TrackManager.js';
import { ReplayManager } from '../core/ReplayManager.js';
import { MultiplayerManager } from '../core/MultiplayerManager.js';
import { ComboFireManager } from '../core/ComboFireManager.js';
import { WarpManager } from '../core/WarpManager.js';
import { HUDManager } from '../core/HUDManager.js';
import { ProceduralGenerator } from '../core/ProceduralGenerator.js';
import * as THREE from 'three';

export class GameScene extends BaseScene {
    constructor(game) {
        super(game);
        this.conductor = new Conductor(this.game.audioManager);
        
        // Managers visuels et logiques
        this.particleSystem = null;
        this.noteFactory = null;
        this.scoreManager = null;
        this.inputHandler = null;
        this.trackManager = null;
        this.backgroundManager = null;
        this.bossManager = null;
        this.comboFireManager = null;
        this.warpManager = null;
        this.hudManager = null;
        this.replayManager = null;
        this.multiplayerManager = null;
        
        // Outil de génération
        this.proceduralGenerator = new ProceduralGenerator();

        // État de la scène
        this.isGameRunning = false;
        this.gameOverTriggered = false;
        
        // Caméra cinématique (si besoin)
        this.cameraShake = 0;

        this.boundOnHealthDepleted = () => {
            if (!this.gameOverTriggered && !this.game.modifiers?.noFail) {
                this.gameOverTriggered = true;
                this.game.gameOver(this.scoreManager?.getStats ? this.scoreManager.getStats() : {});
            }
        };

        if (this.game?.eventBus) {
            this.game.eventBus.on('healthDepleted', this.boundOnHealthDepleted);
        }
    }

    async init() {
        // 1. Configuration de la Scène
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.015);

        // Position de la caméra (Vue TPS arrière)
        this.camera.position.set(0, 4, 6);
        this.camera.lookAt(0, 0, -20);

        // 2. Initialisation des Managers Visuels
        this.backgroundManager = new BackgroundManager(this.scene, this.game);
        this.trackManager = new TrackManager(this.scene, this.game);
        this.bossManager = new BossManager(this.scene);
        this.particleSystem = new ParticleSystem(this.scene, this.game);
        this.comboFireManager = new ComboFireManager(this.camera);
        this.warpManager = new WarpManager(this.camera);

        // Appliquer le thème de la chanson si défini
        if (this.game.selectedSong && this.game.selectedSong.theme) {
            this.backgroundManager.setTheme(this.game.selectedSong.theme);
        }

        // 3. Logique de Jeu (Score & Replay)
        this.scoreManager = new ScoreManager(this.game, this.game.settings.drainRate || 15, this.game.isSpectator);
        this.hudManager = new HUDManager(this.game, this.scoreManager, this.particleSystem);
        
        // Gestion Replay / Ghost
        this.replayManager = new ReplayManager();
        if (this.game.isReplay && this.game.replayData) {
            this.replayManager.startPlayback(this.game.replayData);
        } else if (!this.game.isSpectator) {
            this.replayManager.startRecording();
        }

        // Gestion Multijoueur
        if (this.game.isMultiplayer) {
            this.multiplayerManager = new MultiplayerManager(this.game, this.scoreManager);
            this.multiplayerManager.setSpectatorMode(this.game.isSpectator);
            this.multiplayerManager.connect();
        }

        // 4. Chargement Audio et Génération des Notes
        try {
            if (this.game.debug || (typeof window !== 'undefined' && window.BEATLINE_DEBUG)) console.log("Chargement de la musique :", this.game.selectedSong.src);
            await this.game.audioManager.loadSong(this.game.selectedSong.src);

            // --- CORRECTIF IMPORTANT : DURÉE RÉELLE ---
            if (this.game.audioManager.audioBuffer) {
                this.game.selectedSong.duration = this.game.audioManager.audioBuffer.duration;
                if (this.game.debug || (typeof window !== 'undefined' && window.BEATLINE_DEBUG)) console.log("Durée audio mise à jour :", this.game.selectedSong.duration);
            }
            // ------------------------------------------

            // Création de l'usine à notes
            this.noteFactory = new NoteFactory(this.scene, this.scoreManager, this.particleSystem, this.game.settings.noteSpeed || 30);

            // Génération ou Chargement du Chart
            if (this.game.customChart) {
                if (this.game.debug || (typeof window !== 'undefined' && window.BEATLINE_DEBUG)) console.log("Chargement d'un chart personnalisé");
                this.noteFactory.setChart(this.game.customChart);
            } else {
                if (this.game.debug || (typeof window !== 'undefined' && window.BEATLINE_DEBUG)) console.log("Génération procédurale en cours...");
                const difficulty = this.game.settings.difficulty || 'Normal';
                
                // On passe le buffer audio complet au générateur
                const chart = await this.proceduralGenerator.generate(
                    this.game.audioManager.audioBuffer, 
                    this.game.selectedSong.bpm, 
                    difficulty
                );
                this.noteFactory.setChart(chart);
            }

        } catch (error) {
            console.error("Erreur lors du chargement :", error);
            alert("Erreur de chargement audio. Retour au menu.");
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
            return;
        }

        // 5. Gestion des Entrées (Input)
        this.inputHandler = new InputHandler(this.noteFactory, this.conductor, this.game, this.replayManager);
        if (this.inputHandler && this.hudManager && typeof this.inputHandler.setHUDManager === 'function') {
            this.inputHandler.setHUDManager(this.hudManager);
        }

        // 6. Démarrage
        this.isGameRunning = true;
        this.gameOverTriggered = false;
        
        // On lance le conducteur (offset pour la latence audio/visuelle)
        this.conductor.start(this.game.selectedSong.bpm, this.game.settings.offset || 0);
        
        // Affichage du HUD
        if (this.hudManager) {
            this.hudManager.showStartSequence();
        }
        
        return Promise.resolve();
    }

    update(delta, time) {
        if (!this.isGameRunning) return;

        // 1. Update audio & timing
        this.conductor.update();
        const songTime = this.conductor.songPosition;

        // Handle replay input (if playing back a replay)
        if (this.game.isReplay) {
            this.replayManager.update(songTime, this.inputHandler);
        }

        // 2. Mise à jour des éléments visuels
        // Notes
        if (this.noteFactory) this.noteFactory.update(songTime, delta);
        
        // Environnement (Background, Track, Boss)
        const kick = this.game.audioManager.getAverageFrequency(); // Récupère l'intensité des basses
        const isFever = this.scoreManager.combo > 50; // Mode Fever si combo > 50
        
        if (this.backgroundManager) {
            if (!this.game.settings.focusMode) this.backgroundManager.update(time, kick, isFever);
            else this.backgroundManager.update(time, 0, false);
        }
        if (this.trackManager) this.trackManager.update(time, kick, isFever);
        if (this.bossManager) this.bossManager.update(delta, time, this.camera);
        
        // Effets de Caméra (Warp, Feu, Particules)
        if (!this.game.settings.focusMode) {
            if (this.particleSystem) this.particleSystem.update(delta);
            if (this.comboFireManager) this.comboFireManager.update(time, this.scoreManager.combo);
            if (this.warpManager) this.warpManager.update(time, isFever);
        } else {
            if (this.particleSystem) this.particleSystem.update(delta * 0.5);
        }
        
        // Interface (HUD)
        if (this.hudManager) this.hudManager.update(delta, songTime, this.game.selectedSong?.duration || 1);
        if (this.scoreManager) this.scoreManager.updateHealthUI(); // Si barre de vie

        // 3. Vérification de fin de partie
        // A. Boss Battle Activation
        if (this.bossManager && !this.bossManager.active && this.scoreManager.score >= 20000) {
            this.bossManager.activate();
            this.game.createOverlay('BOSS BATTLE', [{ text: 'FIGHT', action: () => this.game.removeOverlay() }], '<div style="margin-top:10px; font-size:1.1em; color:#00ff00;">Le boss est activé !</div>', true);
        }

        // A.1 Boss défait
        if (this.bossManager && this.bossManager.active && this.bossManager.health <= 0) {
            this.bossManager.active = false;
            this.bossManager.mesh.visible = false;
            this.bossManager.healthBar.style.display = 'none';
            this.game.createOverlay('BOSS DEFEAT', [{ text: 'CONTINUE', action: () => this.game.removeOverlay() }], '<div style="margin-top:10px; font-size:1.1em; color:#00ff00;">Boss vaincu, +2000 pts</div>', true);
            if (this.scoreManager && typeof this.scoreManager.addBonus === 'function') {
                this.scoreManager.addBonus(2000);
            } else if (this.scoreManager) {
                this.scoreManager.score += 2000;
                this.scoreManager.updateUI();
            }
        }

        // A.2 Game Over (Plus de vie)
        if (this.scoreManager.health <= 0 && !this.gameOverTriggered && !this.game.modifiers?.noFail) {
            this.gameOverTriggered = true;
            this.game.gameOver(this.scoreManager.getStats());
            return;
        }

        // B. Victoire (Fin de la chanson + petit délai)
        if (songTime > this.game.selectedSong.duration + 2.0 && !this.gameOverTriggered) {
            this.finishLevel();
        }
    }

    finishLevel() {
        this.gameOverTriggered = true;
        this.isGameRunning = false;
        
        if (this.game.debug || (typeof window !== 'undefined' && window.BEATLINE_DEBUG)) console.log("Niveau terminé !");
        
        // Sauvegarde du replay si ce n'était pas déjà un replay
        if (!this.game.isReplay && !this.game.isSpectator) {
            this.game.replayData = this.replayManager.recording;
        }

        // Affichage "LEVEL COMPLETE" puis transition vers les résultats
        const onComplete = () => {
            this.game.lastStats = this.scoreManager.getStats();
            this.game.sceneManager.switchScene(SCENE_NAMES.RESULTS);
        };

        if (this.hudManager) {
            this.hudManager.showLevelComplete().then(onComplete);
        } else {
            onComplete();
        }
    }

    resize(width, height) {
        super.resize(width, height);
        if (this.backgroundManager) this.backgroundManager.resize(width, height);
        if (this.game.effectsManager) this.game.effectsManager.resize(width, height);
    }

    dispose() {
        this.isGameRunning = false;
        
        // Arrêt Audio
        this.game.audioManager.stopSong();
        
        // Nettoyage des événements
        if (this.inputHandler) {
            window.removeEventListener(EVENTS.KEY_DOWN, this.inputHandler.boundKeyDown);
            window.removeEventListener(EVENTS.KEY_UP, this.inputHandler.boundKeyUp);
        }

        // Nettoyage des événements GameBus
        if (this.game?.eventBus) {
            this.game.eventBus.off('healthDepleted', this.boundOnHealthDepleted);
        }

        // Nettoyage des Managers
        if (this.particleSystem) this.particleSystem.dispose();
        if (this.scoreManager) this.scoreManager.dispose();
        if (this.backgroundManager) this.backgroundManager.dispose();
        if (this.bossManager) this.bossManager.dispose();
        if (this.trackManager) this.trackManager.dispose();
        if (this.comboFireManager) this.comboFireManager.dispose();
        if (this.warpManager) this.warpManager.dispose();
        if (this.hudManager) {
             if(this.hudManager.container) this.hudManager.container.remove();
        }

        // Nettoyage de la scène Three.js
        super.dispose();
    }
}