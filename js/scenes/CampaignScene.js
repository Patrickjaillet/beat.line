import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';
import { songList } from '../utils/songList.js';

export class CampaignScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.lines = [];
    }

    init() {
        this.scene.background = new THREE.Color(0x050505);
        this.camera.position.z = 10;
        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            fontFamily: 'Orbitron, sans-serif'
        });

        const title = document.createElement('h1');
        title.innerText = 'CAMPAIGN PROGRESSION';
        Object.assign(title.style, {
            position: 'absolute', top: '20px', width: '100%', textAlign: 'center',
            color: '#00f3ff', textShadow: '0 0 10px #00f3ff', margin: 0
        });
        this.container.appendChild(title);

        const cm = this.game.campaignManager;

        cm.levels.forEach((level, index) => {
            const unlocked = cm.isUnlocked(index);
            const completed = index < cm.progress;
            
            const node = document.createElement('div');
            node.className = 'interactive';
            Object.assign(node.style, {
                position: 'absolute', left: `${level.x}%`, top: `${level.y}%`,
                transform: 'translate(-50%, -50%)', width: '100px', height: '100px',
                border: `2px solid ${unlocked ? (completed ? '#00ff00' : '#00f3ff') : '#555'}`,
                borderRadius: '50%', background: 'rgba(0,0,0,0.8)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                cursor: unlocked ? 'pointer' : 'default', opacity: unlocked ? 1 : 0.5,
                boxShadow: unlocked ? `0 0 20px ${completed ? '#00ff00' : '#00f3ff'}` : 'none'
            });

            node.innerHTML = `
                <div style="font-size: 0.8em; color: #fff;">LVL ${index + 1}</div>
                <div style="font-size: 0.7em; color: #aaa;">${level.title}</div>
                ${completed ? '<div style="color:#00ff00">CLEARED</div>' : ''}
            `;

            if (unlocked) {
                node.onclick = () => this.startLevel(index);
            }

            this.container.appendChild(node);
        });

        document.getElementById('ui-layer').appendChild(this.container);
    }

    startLevel(index) {
        this.game.startCampaignLevel(index);
    }

    dispose() {
        if (this.container) this.container.remove();
        super.dispose();
    }
}