import * as THREE from 'three';
import { shibuyaNightVertex } from '../shaders/shibuyaNightVertex.js';
import { shibuyaNightFragment } from '../shaders/shibuyaNightFragment.js';
import { sakuraTempleVertex } from '../shaders/sakuraTempleVertex.js';
import { sakuraTempleFragment } from '../shaders/sakuraTempleFragment.js';

export class BackgroundManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.mesh = null;
        this.currentTheme = null;
        this.shaders = {
            SHIBUYA: {
                vertex: shibuyaNightVertex,
                fragment: shibuyaNightFragment
            },
            SAKURA: {
                vertex: sakuraTempleVertex,
                fragment: sakuraTempleFragment
            }
        };
        this.init();
    }

    init() {
        // Set a default theme. This will be called again from GameScene with the song's theme.
        this.setTheme('SHIBUYA');
    }

    setTheme(themeName) {
        if (this.currentTheme === themeName && this.mesh) return;

        this.dispose();

        const theme = this.shaders[themeName] ? themeName : 'SHIBUYA';
        const shaderInfo = this.shaders[theme];
        this.currentTheme = theme;

        const geometry = new THREE.SphereGeometry(100, 64, 32);
        const material = new THREE.ShaderMaterial({
            vertexShader: shaderInfo.vertex,
            fragmentShader: shaderInfo.fragment,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uKick: { value: 0 },
                uColor: { value: new THREE.Color(this.game.settings.skin.trackColor) }
            },
            side: THREE.BackSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.renderOrder = -1; // Ensure background is drawn first
        this.scene.add(this.mesh);
    }

    update(time, beat, isFever) {
        if (this.mesh) {
            const kick = this.game.audioManager.getAverageFrequency();
            this.mesh.material.uniforms.uTime.value = time;
            this.mesh.material.uniforms.uKick.value = kick;

            const targetColor = isFever ? new THREE.Color(this.game.settings.skin.feverColor) : new THREE.Color(this.game.settings.skin.trackColor);
            this.mesh.material.uniforms.uColor.value.lerp(targetColor, 0.05);
        }
    }

    resize(width, height) {
        if (this.mesh) {
            this.mesh.material.uniforms.uResolution.value.set(width, height);
        }
    }

    setCustomShader(fragmentShader) {
        console.warn("setCustomShader is deprecated. Use themes instead.");
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}
