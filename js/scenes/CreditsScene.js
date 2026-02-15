import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';

export class CreditsScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.stars = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x000000);
        this.camera.position.z = 5;

        // Starfield
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 2000; i++) {
            vertices.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);

        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '100%', left: '0', width: '100%',
            textAlign: 'center', color: '#fff', fontFamily: 'Orbitron, sans-serif',
            animation: 'scrollCredits 20s linear forwards'
        });

        const content = `
            <h1 style="font-size: 3em; color: #00f3ff; margin-bottom: 50px;">BEAT.LINE</h1>
            <h2>LEAD DEVELOPER</h2><p>Patrick JAILLET</p>
            <h2>GRAPHICS ENGINE</h2><p>Three.js & Custom GLSL</p>
            <h2>AUDIO SYSTEM</h2><p>Web Audio API</p>
            <h2>SPECIAL THANKS</h2><p>The Player (You)</p>
            <br><br><br>
            <p style="color: #aaa;">Thank you for playing!</p>
        `;
        this.container.innerHTML = content;
        document.getElementById('ui-layer').appendChild(this.container);

        const style = document.createElement('style');
        style.innerHTML = `@keyframes scrollCredits { 0% { top: 100%; } 100% { top: -100%; } }`;
        this.container.appendChild(style);

        // Back Button
        const btn = document.createElement('button');
        btn.innerText = 'BACK';
        btn.className = 'interactive';
        Object.assign(btn.style, {
            position: 'absolute', bottom: '20px', right: '20px',
            padding: '10px 20px', background: 'transparent', border: '1px solid #00f3ff', color: '#00f3ff', cursor: 'pointer'
        });
        btn.onclick = () => this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        document.getElementById('ui-layer').appendChild(btn);
        this.backBtn = btn;
    }

    update(delta) {
        if (this.stars) this.stars.rotation.z += delta * 0.05;
    }

    dispose() {
        if (this.container) this.container.remove();
        if (this.backBtn) this.backBtn.remove();
        super.dispose();
    }
}