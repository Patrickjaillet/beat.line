import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';

export class CalibrationScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.beatTimer = 0;
        this.beatInterval = 0.5; // 120 BPM
        this.lastBeatTime = 0;
        this.taps = [];
        this.visualCircle = null;
        this.audioContext = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x111111);
        this.audioContext = this.game.audioManager.ctx;

        this.createUI();
        this.createVisuals();
        
        this.boundKeyDown = (e) => {
            if (e.code === 'Space' || e.code === 'KeyD' || e.code === 'KeyF' || e.code === 'KeyJ' || e.code === 'KeyK') {
                this.recordTap();
            }
            if (e.code === 'Escape') {
                this.game.sceneManager.switchScene(SCENE_NAMES.SETTINGS);
            }
        };
        window.addEventListener('keydown', this.boundKeyDown);

        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', color: '#fff', fontFamily: 'Orbitron, sans-serif'
        });

        this.container.innerHTML = `
            <h1>AUDIO CALIBRATION</h1>
            <p>Press SPACE or any key to the beat.</p>
            <div id="calib-offset" style="font-size: 2em; color: #00f3ff; margin: 20px;">0 ms</div>
            <button id="calib-save" class="interactive" style="padding: 10px 20px; background: transparent; border: 1px solid #00f3ff; color: #00f3ff; cursor: pointer;">SAVE & EXIT</button>
        `;
        
        document.getElementById('ui-layer').appendChild(this.container);
        
        document.getElementById('calib-save').onclick = () => {
            this.game.sceneManager.switchScene(SCENE_NAMES.SETTINGS);
        };
    }

    createVisuals() {
        const geometry = new THREE.RingGeometry(1, 1.1, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.visualCircle = new THREE.Mesh(geometry, material);
        this.scene.add(this.visualCircle);
    }

    playBeat() {
        // Audio Beep
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);

        // Visual Flash
        this.visualCircle.scale.setScalar(1.5);
        this.visualCircle.material.color.setHex(0x00f3ff);
    }

    recordTap() {
        const now = this.audioContext.currentTime;
        // Calculate difference from nearest beat
        const diff = now - this.lastBeatTime;
        // If diff is large (missed beat), ignore or adjust logic. 
        // Simple logic: diff should be small relative to beatInterval.
        // We want offset = inputTime - expectedTime.
        // expectedTime is lastBeatTime.
        
        let offset = diff;
        if (offset > this.beatInterval / 2) offset -= this.beatInterval; // Early tap for next beat

        this.taps.push(offset);
        if (this.taps.length > 10) this.taps.shift();

        const avg = this.taps.reduce((a, b) => a + b, 0) / this.taps.length;
        this.game.settings.offset = -avg; // Negative because if we tap late (positive diff), we need to delay audio (negative offset) or advance chart.
        // Actually: Audio Offset usually means: Chart Time = Audio Time + Offset.
        
        document.getElementById('calib-offset').innerText = `${(this.game.settings.offset * 1000).toFixed(0)} ms`;
    }

    update(delta, time) {
        this.beatTimer += delta;
        if (this.beatTimer >= this.beatInterval) {
            this.beatTimer -= this.beatInterval;
            this.lastBeatTime = this.audioContext.currentTime;
            this.playBeat();
        }

        // Visual decay
        this.visualCircle.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10);
        this.visualCircle.material.color.lerp(new THREE.Color(0xffffff), delta * 10);
    }

    dispose() {
        if (this.container) this.container.remove();
        window.removeEventListener('keydown', this.boundKeyDown);
        super.dispose();
    }
}