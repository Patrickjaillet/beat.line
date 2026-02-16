import { BaseScene } from './BaseScene.js';
import { vertexShader } from '../shaders/introVertex.js';
import { fragmentShader } from '../shaders/introFragment.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';

export class IntroScene extends BaseScene {
    constructor(game) {
        super(game);
        this.mesh = null;
        this.explosionTriggered = false;
        this.skipButton = null;
    }

    async init() {
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uAudio: { value: 0 }
            }
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);

        this.game.audioManager.playIntroDrone();

        // Skip button
        this.skipButton = document.createElement('button');
        this.skipButton.innerText = 'SKIP >>';
        Object.assign(this.skipButton.style, {
            position: 'absolute', bottom: '30px', right: '30px', padding: '10px 20px', transition: 'background 0.2s, color 0.2s',
            background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #fff',
            cursor: 'pointer', zIndex: '100', fontFamily: 'Orbitron, sans-serif'
        });
        this.skipButton.className = 'interactive'; // Allows pointer events
        this.skipButton.onclick = () => this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        this.skipButton.onmouseover = () => { this.skipButton.style.background = '#fff'; this.skipButton.style.color = '#000'; };
        this.skipButton.onmouseout = () => { this.skipButton.style.background = 'rgba(0,0,0,0.5)'; this.skipButton.style.color = '#fff'; };
        document.getElementById('ui-layer').appendChild(this.skipButton);

        return Promise.resolve();
    }

    update(delta, time) {
        if (this.mesh) {
            this.mesh.material.uniforms.uTime.value = time;
            this.mesh.material.uniforms.uAudio.value = this.game.audioManager.getAverageFrequency();
        }

        if (!this.explosionTriggered && time > 18.0) {
            this.game.audioManager.playExplosionSFX();
            this.explosionTriggered = true;
        }

        // End scene 3 seconds after explosion (18s + 3s)
        if (time > 21.0) this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
    }

    dispose() {
        this.game.audioManager.stopIntroDrone();
        if (this.skipButton) this.skipButton.remove();
        super.dispose();
    }
}