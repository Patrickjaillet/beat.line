import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';

export class ResultsScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.bgMesh = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x050505);
        
        // Reuse 3D Background
        const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.1 
        });
        this.bgMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.bgMesh);
        this.camera.position.z = 30;

        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        const stats = this.game.lastStats || { score: 0, maxCombo: 0, perfects: 0, goods: 0, misses: 0 };
        const rank = stats.score > 5000 ? 'S' : stats.score > 3000 ? 'A' : stats.score > 1000 ? 'B' : 'C';
        const rankColor = rank === 'S' ? '#ffd700' : rank === 'A' ? '#00f3ff' : rank === 'B' ? '#00ff00' : '#ff0055';

        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', width: '600px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            color: '#fff', fontFamily: 'inherit', textAlign: 'center'
        });

        this.container.innerHTML = `
            <h1 style="font-size: 4em; margin: 0; text-shadow: 0 0 20px ${rankColor};">RANK ${rank}</h1>
            <div style="font-size: 2.5em; font-weight: bold; letter-spacing: 2px;">${stats.score.toString().padStart(6, '0')}</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; text-align: left; background: rgba(0,0,0,0.5); padding: 20px; border: 1px solid #333;">
                <div style="color: #00ffff;">PERFECT</div><div style="text-align: right;">${stats.perfects}</div>
                <div style="color: #00ff00;">GOOD</div><div style="text-align: right;">${stats.goods}</div>
                <div style="color: #ff0055;">MISS</div><div style="text-align: right;">${stats.misses}</div>
                <div style="color: #fff; border-top: 1px solid #555; padding-top: 10px; margin-top: 10px;">MAX COMBO</div>
                <div style="text-align: right; border-top: 1px solid #555; padding-top: 10px; margin-top: 10px;">${stats.maxCombo}</div>
            </div>
        `;

        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 150;
        Object.assign(canvas.style, { width: '100%', height: '150px', background: 'rgba(0,0,0,0.3)', border: '1px solid #333', marginBottom: '20px' });
        this.container.appendChild(canvas);
        this.drawGraph(canvas, stats.accuracyHistory);

        const btn = document.createElement('button');
        btn.innerText = 'CONTINUE';
        btn.className = 'interactive';
        Object.assign(btn.style, {
            padding: '15px', background: 'transparent',
            border: `2px solid ${rankColor}`, color: rankColor,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.5em'
        });
        btn.onclick = () => this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        this.container.appendChild(btn);

        if (this.game.replayData) {
            const replayBtn = document.createElement('button');
            replayBtn.innerText = 'WATCH REPLAY';
            replayBtn.className = 'interactive';
            Object.assign(replayBtn.style, {
                padding: '15px', background: 'transparent',
                border: `2px solid #fff`, color: '#fff',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.5em'
            });
            replayBtn.onclick = () => {
                this.game.isReplay = true;
                this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
            };
            this.container.appendChild(replayBtn);
        }

        document.getElementById('ui-layer').appendChild(this.container);
    }

    drawGraph(canvas, history) {
        if (!history || history.length === 0) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const midY = h / 2;
        
        // Draw Center Line
        ctx.strokeStyle = '#555';
        ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();

        const maxTime = history[history.length - 1].time;
        const range = 0.2; // +/- 0.2s range

        history.forEach(hit => {
            const x = (hit.time / maxTime) * w;
            if (hit.type === 'miss') {
                ctx.fillStyle = '#ff0055';
                ctx.fillRect(x - 1, 0, 2, h);
            } else {
                const y = midY - (hit.diff / range) * (h / 2);
                ctx.fillStyle = hit.type === 'perfect' ? '#00ffff' : '#00ff00';
                ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    update(delta, time) {
        if (this.bgMesh) {
            this.bgMesh.rotation.x = time * 0.2;
            this.bgMesh.rotation.y = time * 0.1;
        }
    }

    dispose() {
        if (this.container) this.container.remove();
        super.dispose();
    }
}