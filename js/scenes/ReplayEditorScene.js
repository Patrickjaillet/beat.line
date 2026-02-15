import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';
import { Conductor } from '../core/Conductor.js';
import { NoteFactory } from '../core/NoteFactory.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { ParticleSystem } from '../core/ParticleSystem.js';

export class ReplayEditorScene extends BaseScene {
    constructor(game) {
        super(game);
        this.conductor = new Conductor(this.game.audioManager);
        this.noteFactory = null;
        this.particleSystem = null;
        this.scoreManager = null;
        this.uiContainer = null;
        this.startTime = 0;
        this.endTime = 0;
        this.isPlaying = false;
    }

    async init() {
        this.scene.background = new THREE.Color(0x111111);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, -10);

        if (!this.game.replayData || !this.game.selectedSong) {
            alert("No replay data available. Play a song first.");
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
            return;
        }

        this.particleSystem = new ParticleSystem(this.scene);
        this.scoreManager = new ScoreManager(this.game, 0);
        this.noteFactory = new NoteFactory(this.scene, this.scoreManager, this.particleSystem, this.game.settings.noteSpeed);
        
        await this.game.audioManager.loadSong(this.game.selectedSong.src);
        this.noteFactory.loadChart(this.game.selectedSong.chart);
        this.endTime = this.game.selectedSong.duration;

        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        this.uiContainer = document.createElement('div');
        Object.assign(this.uiContainer.style, {
            position: 'absolute', bottom: '0', left: '0', width: '100%', height: '150px',
            background: '#222', borderTop: '2px solid #00f3ff', display: 'flex',
            flexDirection: 'column', padding: '10px', color: '#fff', fontFamily: 'monospace'
        });

        // Timeline
        const timeline = document.createElement('input');
        timeline.type = 'range';
        timeline.min = 0;
        timeline.max = this.game.selectedSong.duration;
        timeline.step = 0.1;
        timeline.style.width = '100%';
        timeline.oninput = (e) => {
            this.conductor.setTime(parseFloat(e.target.value));
            this.noteFactory.resetToTime(parseFloat(e.target.value));
        };
        this.timeline = timeline;
        this.uiContainer.appendChild(timeline);

        // Controls
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.marginTop = '10px';
        controls.style.justifyContent = 'center';

        const playBtn = this.createBtn('PLAY/PAUSE', () => this.togglePlay());
        const setStartBtn = this.createBtn('SET START', () => { this.startTime = this.conductor.songPosition; alert(`Start set to ${this.startTime.toFixed(2)}s`); });
        const setEndBtn = this.createBtn('SET END', () => { this.endTime = this.conductor.songPosition; alert(`End set to ${this.endTime.toFixed(2)}s`); });
        const saveBtn = this.createBtn('EXPORT CLIP', () => this.exportClip());
        const exitBtn = this.createBtn('EXIT', () => { this.conductor.stop(); this.game.sceneManager.switchScene(SCENE_NAMES.MENU); });

        controls.append(playBtn, setStartBtn, setEndBtn, saveBtn, exitBtn);
        this.uiContainer.appendChild(controls);

        document.getElementById('ui-layer').appendChild(this.uiContainer);
    }

    createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: '10px 20px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer'
        });
        btn.onclick = onClick;
        return btn;
    }

    togglePlay() {
        if (this.isPlaying) {
            this.conductor.pause();
            this.isPlaying = false;
        } else {
            this.conductor.start(this.game.selectedSong.bpm, this.game.settings.offset);
            this.conductor.setTime(parseFloat(this.timeline.value));
            this.isPlaying = true;
        }
    }

    exportClip() {
        const clip = {
            song: this.game.selectedSong.title,
            start: this.startTime,
            end: this.endTime,
            replayData: this.game.replayData // In a real app, we'd filter events here
        };
        const blob = new Blob([JSON.stringify(clip)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clip_${this.game.selectedSong.title}.json`;
        a.click();
    }

    update(delta, time) {
        if (this.isPlaying) {
            this.conductor.update();
            this.timeline.value = this.conductor.songPosition;
            this.noteFactory.update(this.conductor.songPosition, delta);
            
            if (this.conductor.songPosition >= this.endTime) {
                this.conductor.pause();
                this.isPlaying = false;
            }
        }
    }

    dispose() {
        if (this.uiContainer) this.uiContainer.remove();
        this.conductor.stop();
        super.dispose();
    }
}