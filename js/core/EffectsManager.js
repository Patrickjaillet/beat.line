import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

export class EffectsManager {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.composer = new EffectComposer(renderer);
        this.renderPass = new RenderPass(new THREE.Scene(), new THREE.Camera());
        this.bloomPass = null;
        this.glitchPass = null;
        this.filmPass = null;
        
        this.init(width, height);
    }

    init(width, height) {
        this.composer.addPass(this.renderPass);

        // High Contrast Neon Tuning: High strength, low threshold for intense glow
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), 0.09, 0.5, 0.1);
        this.bloomBaseStrength = this.bloomPass.strength;
        this.composer.addPass(this.bloomPass);

        this.filmPass = new FilmPass(0.5, 0.1, 1024, false); // Digital noise
        this.composer.addPass(this.filmPass);

        this.glitchPass = new GlitchPass();
        this.glitchPass.enabled = false;
        this.composer.addPass(this.glitchPass);
    }

    resize(width, height) {
        this.composer.setSize(width, height);
        this.bloomPass.resolution.set(width / 2, height / 2);
    }

    setBloomBaseStrength(strength) {
        this.bloomBaseStrength = strength;
        if (this.bloomPass) this.bloomPass.strength = strength;
    }

    triggerGlitch(duration = 200) {
        if (!this.glitchPass) return;
        this.glitchPass.enabled = true;
        setTimeout(() => {
            if (this.glitchPass) {
                this.glitchPass.enabled = false;
            }
        }, duration);
    }

    update(scene, camera, audioFreq) {
        this.renderPass.scene = scene;
        this.renderPass.camera = camera;

        // Keep the skin-set base value, then add subtle audio-reactive modulation.
        const base = this.renderer.xr.isPresenting ? (this.bloomBaseStrength || 0.05) : (this.bloomBaseStrength || 0.09);
        this.bloomPass.strength = Math.max(0, base + (audioFreq * 0.05));

        this.composer.render();
    }
}
