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

    triggerGlitch(duration = 200) {
        this.glitchPass.enabled = true;
        setTimeout(() => { this.glitchPass.enabled = false; }, duration);
    }

    update(scene, camera, audioFreq) {
        this.renderPass.scene = scene;
        this.renderPass.camera = camera;
        
        // The base strength is now higher, so we can tone down the audio reaction a bit. Reduced in VR.
        this.bloomPass.strength = (this.renderer.xr.isPresenting ? 0.05 : 0.09) + audioFreq * 0.05;
        this.composer.render();
    }
}
