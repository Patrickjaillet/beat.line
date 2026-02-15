import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';
import { vertexShader } from '../shaders/introVertex.js';
import { fragmentShader } from '../shaders/introFragment.js';

export class IntroScene extends BaseScene {
    constructor(game) {
        super(game);
        this.material = null;
        this.skipBtn = null;
        this.duration = 20.0;
        this.skipTime = 4.0;
        this.glitchTriggered = false;
        this.dialogueContainer = null;
    }

    init() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        
        let finalFragment = fragmentShader;
        if (this.game.isMobile) {
            // Adjust FOV and Horizon for Portrait Mode to see more horizontally
            finalFragment = finalFragment.replace('float fov = 0.7;', 'float fov = 1.1;');
            finalFragment = finalFragment.replace('float horizon = -0.05 + camPitch;', 'float horizon = -0.15 + camPitch;');
        }

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader: finalFragment,
            uniforms: {
                uAudio: { value: 0 },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            }
        });

        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);
        
        // Use Orthographic camera for full screen 2D shader
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.createSkipButton();
        this.createStoryUI();
        this.game.audioManager.playIntroDrone();
        return Promise.resolve();
    }

    createSkipButton() {
        this.skipBtn = document.createElement('button');
        this.skipBtn.innerText = 'SKIP >>';
        this.skipBtn.className = 'interactive';
        Object.assign(this.skipBtn.style, {
            position: 'absolute', top: '20px', right: '20px',
            padding: this.game.isMobile ? '15px 25px' : '10px 20px', background: 'transparent',
            border: '1px solid #00f3ff', color: '#00f3ff',
            cursor: 'pointer', display: 'none', fontFamily: 'inherit',
            fontSize: this.game.isMobile ? '1.2em' : '1em', zIndex: '1000'
        });

        this.skipBtn.onclick = () => {
            this.game.triggerGlitch(300);
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        };
        document.getElementById('ui-layer').appendChild(this.skipBtn);
    }

    createStoryUI() {
        this.dialogueContainer = document.createElement('div');
        Object.assign(this.dialogueContainer.style, {
            position: 'absolute', bottom: this.game.isMobile ? '150px' : '100px', left: '50%', transform: 'translateX(-50%)',
            width: this.game.isMobile ? '90%' : '600px', background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #00f3ff',
            padding: '20px', fontFamily: 'Orbitron, monospace', color: '#00f3ff',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)', fontSize: this.game.isMobile ? '1em' : '1.2em',
            textAlign: 'left', pointerEvents: 'none'
        });
        document.getElementById('ui-layer').appendChild(this.dialogueContainer);

        const lines = [
            "SYSTEM INITIALIZED...",
            "USER DETECTED.",
            "SYNCHRONIZING NEURAL LINK...",
            "WELCOME TO THE GRID."
        ];

        let lineIndex = 0;
        const showNextLine = () => {
            if (lineIndex >= lines.length) return;
            
            const p = document.createElement('div');
            p.style.marginBottom = '10px';
            p.style.opacity = '0';
            p.style.transition = 'opacity 0.5s';
            p.innerText = `> ${lines[lineIndex]}`;
            this.dialogueContainer.appendChild(p);
            
            requestAnimationFrame(() => p.style.opacity = '1');
            lineIndex++;
            setTimeout(showNextLine, 1500);
        };
        setTimeout(showNextLine, 1000);
    }

    update(delta, time) {
        if (this.material) {
            this.material.uniforms.uTime.value = time;
            this.material.uniforms.uAudio.value = this.game.audioManager.getAverageFrequency();
        }
        
        if (time > this.skipTime && this.skipBtn.style.display === 'none') {
            this.skipBtn.style.display = 'block';
        }

        if (!this.glitchTriggered && time > this.duration - 0.8) {
            this.glitchTriggered = true;
            this.game.triggerGlitch(800);
        }

        if (time > this.duration) {
            this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        }
    }

    resize(width, height) {
        if (this.material) this.material.uniforms.uResolution.value.set(width, height);
    }

    dispose() {
        this.game.audioManager.stopIntroDrone();
        if (this.skipBtn) this.skipBtn.remove();
        if (this.dialogueContainer) this.dialogueContainer.remove();
        super.dispose();
    }
}