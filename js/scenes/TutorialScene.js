import { BaseScene } from './BaseScene.js';
import { Conductor } from '../core/Conductor.js';
import { NoteFactory } from '../core/NoteFactory.js';
import { InputHandler } from '../core/InputHandler.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { ParticleSystem } from '../core/ParticleSystem.js';
import { TrackManager } from '../core/TrackManager.js';
import { SCENE_NAMES, EVENTS } from '../utils/constants.js';
import * as THREE from 'three';

export class TutorialScene extends BaseScene {
    constructor(game) {
        super(game);
        this.conductor = new Conductor(this.game.audioManager);
        this.trackManager = null;
        this.noteFactory = null;
        this.scoreManager = null;
        this.inputHandler = null;
        this.particleSystem = null;
        this.overlay = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x000000);
        this.camera.position.set(0, 4, 6);
        this.camera.lookAt(0, 0, -10);

        this.trackManager = new TrackManager(this.scene, this.game);
        this.particleSystem = new ParticleSystem(this.scene);
        this.scoreManager = new ScoreManager(this.game);
        this.noteFactory = new NoteFactory(this.scene, this.scoreManager, this.particleSystem, 20);
        this.inputHandler = new InputHandler(this.noteFactory, this.conductor, this.game);
        this.scoreManager.setConductor(this.conductor);
        this.scoreManager.setNoteFactory(this.noteFactory);

        this.createOverlay();
        
        // Tutorial Chart
        const chart = { notes: [
            { time: 4, lane: 1 }, { time: 5, lane: 2 }, // Taps
            { time: 9, lane: 0, duration: 2 }, // Hold
            { time: 14, lane: 3 }, { time: 15, lane: 0 } // Swaps
        ]};
        this.noteFactory.loadChart(chart);
        this.conductor.start(120);

        return Promise.resolve();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'absolute', top: '20%', width: '100%', textAlign: 'center',
            color: '#fff', fontSize: '2em', textShadow: '0 0 10px #00f3ff',
            fontFamily: 'Orbitron, sans-serif', pointerEvents: 'none'
        });
        document.getElementById('ui-layer').appendChild(this.overlay);
    }

    update(delta, time) {
        this.conductor.update();
        this.noteFactory.update(this.conductor.songPosition, delta);
        if (this.trackManager) this.trackManager.update(time, 0, false);

        const t = this.conductor.songPosition;
        if (t < 3) this.overlay.innerText = this.game.isMobile ? "WELCOME TO THE GRID\nTAP TO HIT" : "WELCOME TO THE GRID\nPRESS D, F, J, K TO HIT";
        else if (t < 6) this.overlay.innerText = "TIMING IS EVERYTHING";
        else if (t < 8) this.overlay.innerText = "HOLD NOTES:\nKEEP KEY PRESSED";
        else if (t < 12) this.overlay.innerText = "WATCH FOR LANE SWAPS";
        else if (t < 16) this.overlay.innerText = "GOOD LUCK";
        else {
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        }

        // Force swap for demo
        if (t > 13 && t < 16) this.noteFactory.setSwapState(true);
    }

    dispose() {
        if (this.overlay) this.overlay.remove();
        if (this.inputHandler) this.inputHandler.dispose();
        if (this.scoreManager) this.scoreManager.dispose();
        if (this.trackManager) this.trackManager.dispose();
        super.dispose();
    }
}