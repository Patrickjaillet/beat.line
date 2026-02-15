import { BaseScene } from './BaseScene.js';
import { Conductor } from '../core/Conductor.js';
import { SCENE_NAMES, EVENTS } from '../utils/constants.js';
import * as THREE from 'three';

export class RhythmEditorScene extends BaseScene {
    constructor(game) {
        super(game);
        this.conductor = new Conductor(this.game.audioManager);
        this.recordedNotes = [];
        this.ui = null;
        this.visual = null;
    }

    async init() {
        this.scene.background = new THREE.Color(0x111111);
        this.camera.position.z = 5;

        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        this.visual = new THREE.Mesh(geo, mat);
        this.scene.add(this.visual);

        this.createUI();
        
        if (this.game.selectedSong) {
            await this.game.audioManager.loadSong(this.game.selectedSong.src);
            this.conductor.start(this.game.selectedSong.bpm);
        }

        window.addEventListener(EVENTS.KEY_DOWN, (e) => this.onKeyDown(e));
        return Promise.resolve();
    }

    createUI() {
        this.ui = document.createElement('div');
        Object.assign(this.ui.style, {
            position: 'absolute', top: '20px', width: '100%', textAlign: 'center',
            color: '#fff', fontFamily: 'Orbitron, sans-serif', pointerEvents: 'none'
        });
        this.ui.innerHTML = `
            <h1>RHYTHM EDITOR</h1>
            <p>TAP ANY KEY TO RECORD NOTES</p>
            <p>PRESS ENTER TO SAVE (CONSOLE) | ESC TO EXIT</p>
            <div id="note-count" style="font-size: 2em; color: #00f3ff; margin-top: 20px;">0</div>
        `;
        document.getElementById('ui-layer').appendChild(this.ui);
    }

    onKeyDown(e) {
        if (e.code === 'Escape') {
            this.game.audioManager.stopSong();
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
            return;
        }
        if (e.code === 'Enter') {
            console.log("GENERATED CHART:", JSON.stringify({ notes: this.recordedNotes }));
            alert("Chart output to console!");
            return;
        }

        const rawTime = this.conductor.songPosition;
        const bpm = this.game.selectedSong.bpm;
        const step = (60 / bpm) / 4; // 16th notes
        const quantizedTime = Math.round(rawTime / step) * step;
        
        // Simple lane distribution logic (cycle 0-3)
        const lane = this.recordedNotes.length % 4;
        
        this.recordedNotes.push({ time: parseFloat(quantizedTime.toFixed(3)), lane });
        
        this.ui.querySelector('#note-count').innerText = this.recordedNotes.length;
        
        this.visual.scale.setScalar(1.5);
        this.visual.material.color.setHex(0xffffff);
    }

    update(delta) {
        this.conductor.update();
        
        this.visual.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10);
        this.visual.material.color.lerp(new THREE.Color(0x00f3ff), delta * 5);
        this.visual.rotation.x += delta;
        this.visual.rotation.y += delta;
    }

    dispose() {
        if (this.ui) this.ui.remove();
        super.dispose();
    }
}