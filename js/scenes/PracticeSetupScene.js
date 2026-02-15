import { BaseScene } from './BaseScene.js';
import { SCENE_NAMES } from '../utils/constants.js';
import { songList } from '../utils/songList.js';
import * as THREE from 'three';

export class PracticeSetupScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x050505);
        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '400px', background: 'rgba(0,0,0,0.9)', border: '1px solid #00f3ff', padding: '20px',
            color: '#fff', fontFamily: 'Orbitron, sans-serif', textAlign: 'center'
        });

        this.container.innerHTML = `<h2 style="color:#00f3ff">PRACTICE SETUP</h2>`;

        const createInput = (label, key, min, max, step) => {
            const div = document.createElement('div');
            div.style.margin = '10px 0';
            div.innerHTML = `<div>${label}: <span id="val-${key}">${this.game.practiceSettings[key]}</span></div>`;
            const input = document.createElement('input');
            input.type = 'range'; input.min = min; input.max = max; input.step = step;
            input.value = this.game.practiceSettings[key];
            input.className = 'interactive';
            input.style.width = '100%';
            input.oninput = (e) => {
                this.game.practiceSettings[key] = parseFloat(e.target.value);
                div.querySelector(`#val-${key}`).innerText = this.game.practiceSettings[key];
            };
            div.appendChild(input);
            this.container.appendChild(div);
        };

        const song = this.game.selectedSong || songList[0];
        createInput('START TIME (s)', 'start', 0, song.duration, 1);
        createInput('END TIME (s)', 'end', 0, song.duration, 1);
        createInput('SPEED', 'speed', 0.1, 2.0, 0.1);

        const btn = document.createElement('button');
        btn.innerText = 'START PRACTICE';
        btn.className = 'interactive';
        Object.assign(btn.style, {
            marginTop: '20px', padding: '10px 20px', background: '#00f3ff', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold'
        });
        btn.onclick = () => {
            this.game.isPractice = true;
            this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
        };
        this.container.appendChild(btn);
        document.getElementById('ui-layer').appendChild(this.container);
    }

    dispose() { if (this.container) this.container.remove(); super.dispose(); }
}