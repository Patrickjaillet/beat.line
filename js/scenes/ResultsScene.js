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

        const totalNotes = (stats.perfects || 0) + (stats.goods || 0) + (stats.misses || 0);
        const accuracy = totalNotes > 0 ? ((stats.perfects || 0) + (stats.goods || 0) * 0.5) / totalNotes : 0;

        let rank = 'F';
        if (accuracy >= 0.95) rank = 'S';
        else if (accuracy >= 0.85) rank = 'A';
        else if (accuracy >= 0.7) rank = 'B';
        else if (accuracy >= 0.5) rank = 'C';
        else if (accuracy >= 0.3) rank = 'D';

        const rankColor = rank === 'S' ? '#ffd700' : rank === 'A' ? '#00f3ff' : rank === 'B' ? '#00ff00' : rank === 'C' ? '#ffcc00' : '#ff0055';

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
            <div style="font-size: 1em; color: #fff; opacity: 0.8;">Accuracy: ${Math.round(accuracy * 100)}% (${totalNotes} notes)</div>
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

        const retryBtn = document.createElement('button');
        retryBtn.innerText = 'RETRY';
        retryBtn.className = 'interactive';
        Object.assign(retryBtn.style, {
            padding: '15px', background: 'transparent',
            border: `2px solid #00ff00`, color: '#00ff00',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.5em'
        });
        retryBtn.onclick = () => {
            this.game.isReplay = false;
            this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
        };
        this.container.appendChild(retryBtn);

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

        // Draw axes
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 10); ctx.lineTo(40, h - 20); // Y axis
        ctx.lineTo(w - 10, h - 20); // X axis
        ctx.stroke();

        // Axes labels
        ctx.fillStyle = '#ccc';
        ctx.font = '12px Arial';
        ctx.fillText('Time →', w - 50, h - 5);
        ctx.save();
        ctx.translate(10, 30);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Timing Precision (±s)', 0, 0);
        ctx.restore();

        // Y ticks
        for (let i = -2; i <= 2; i++) {
            const y = midY + (i * (h / 2 / 2));
            const label = `${(i * 0.05).toFixed(2)}`;
            ctx.strokeStyle = '#444';
            ctx.beginPath(); ctx.moveTo(36, y); ctx.lineTo(44, y); ctx.stroke();
            ctx.fillText(label, 5, y + 4);
        }

        // X ticks
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const x = 40 + ((w - 50) / steps) * i;
            const timeLabel = ((maxTime / steps) * i).toFixed(1);
            ctx.strokeStyle = '#444';
            ctx.beginPath(); ctx.moveTo(x, h - 20); ctx.lineTo(x, h - 16); ctx.stroke();
            ctx.fillText(`${timeLabel}s`, x - 8, h - 2);
        }

        // Plot points
        history.forEach(hit => {
            const x = 40 + (hit.time / maxTime) * (w - 50);
            if (hit.type === 'miss') {
                ctx.fillStyle = '#ff0055';
                ctx.fillRect(x - 2, h - 20 - 10, 4, 10);
            } else {
                const y = midY - (hit.diff / range) * (h / 2);
                ctx.fillStyle = hit.type === 'perfect' ? '#00ffff' : '#00ff00';
                ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
            }
        });

        // Legend
        ctx.fillStyle = '#fff';
        ctx.fillRect(w - 140, 10, 130, 58);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(w - 140, 10, 130, 58);
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(w - 130, 20, 10, 10); ctx.fillStyle = '#fff'; ctx.fillText('Perfect', w - 112, 30);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(w - 130, 36, 10, 10); ctx.fillStyle = '#fff'; ctx.fillText('Good', w - 112, 46);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(w - 130, 52, 10, 10); ctx.fillStyle = '#fff'; ctx.fillText('Miss', w - 112, 62);
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