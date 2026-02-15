import { BaseScene } from './BaseScene.js';
import { BackgroundManager } from '../core/BackgroundManager.js';
import { SCENE_NAMES } from '../utils/constants.js';
import { songList } from '../utils/songList.js';
import * as THREE from 'three';

export class JukeboxScene extends BaseScene {
    constructor(game) {
        super(game);
        this.backgroundManager = null;
        this.currentSongIndex = 0;
        this.ui = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x000000);
        this.camera.position.z = 10;
        this.backgroundManager = new BackgroundManager(this.scene, this.game);
        this.createUI();
        this.playSong(0);
        return Promise.resolve();
    }

    createUI() {
        this.ui = document.createElement('div');
        Object.assign(this.ui.style, {
            position: 'absolute', bottom: '50px', width: '100%', textAlign: 'center',
            fontFamily: 'Orbitron, sans-serif', color: '#fff'
        });

        this.info = document.createElement('div');
        this.info.style.fontSize = '2em';
        this.info.style.marginBottom = '20px';
        this.ui.appendChild(this.info);

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.justifyContent = 'center';
        controls.style.gap = '20px';

        ['PREV', 'BACK', 'NEXT'].forEach(text => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.className = 'interactive';
            Object.assign(btn.style, {
                padding: '10px 30px', background: 'transparent', border: '1px solid #00f3ff',
                color: '#00f3ff', cursor: 'pointer', fontFamily: 'inherit'
            });
            btn.onclick = () => this.handleInput(text);
            controls.appendChild(btn);
        });
        this.ui.appendChild(controls);
        document.getElementById('ui-layer').appendChild(this.ui);
    }

    handleInput(action) {
        if (action === 'BACK') {
            this.game.audioManager.stopSong();
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        } else if (action === 'NEXT') {
            this.playSong((this.currentSongIndex + 1) % songList.length);
        } else if (action === 'PREV') {
            this.playSong((this.currentSongIndex - 1 + songList.length) % songList.length);
        }
    }

    async playSong(index) {
        this.currentSongIndex = index;
        const song = songList[index];
        this.info.innerText = `${song.title} - ${song.artist}`;
        await this.game.audioManager.loadSong(song.src);
        this.game.audioManager.playSong(0);
    }

    update(delta, time) {
        const freq = this.game.audioManager.getAverageFrequency();
        this.backgroundManager.update(time, freq, false);
    }

    dispose() { if (this.ui) this.ui.remove(); if (this.backgroundManager) this.backgroundManager.dispose(); this.game.audioManager.stopSong(); super.dispose(); }
}