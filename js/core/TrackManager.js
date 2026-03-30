import * as THREE from 'three';
import { tronGridVertex } from '../shaders/tronGridVertex.js';
import { tronGridFragment } from '../shaders/tronGridFragment.js';
import { laneLineVertex } from '../shaders/laneLineVertex.js';
import { laneLineFragment } from '../shaders/laneLineFragment.js';

export class TrackManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.mesh = null;
        this.laneLines = [];
        this.baseColor = new THREE.Color(this.game.settings.skin.trackColor);
        this.feverColor = new THREE.Color(this.game.settings.skin.feverColor);
        this.currentColor = new THREE.Color(this.game.settings.skin.trackColor);
        this.lanePositions = [-3, -1, 1, 3];
        this.laneWidth = 2.0;
        this.init();
    }

    init() {
        const geometry = new THREE.PlaneGeometry(50, 100, 1, 1);
        const material = new THREE.ShaderMaterial({
            vertexShader: tronGridVertex,
            fragmentShader: tronGridFragment,
            uniforms: {
                uTime: { value: 0 },
                uBeat: { value: 0 },
                uColor: { value: this.currentColor },
                uColorblind: { value: this.game.settings.colorblindMode ? 1.0 : 0.0 }
            },
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false // Prevent transparent grid from hiding notes behind it
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -1.5;
        this.mesh.position.z = -50;
        this.mesh.renderOrder = 0; // Render grid first
        this.scene.add(this.mesh);

        // Add 4 distinct lane lines on top of the grid
        // Shared material usage with simple uniform updates (fewer shader programs)
        const sharedLineMaterial = new THREE.ShaderMaterial({
            vertexShader: laneLineVertex,
            fragmentShader: laneLineFragment,
            uniforms: {
                uColor: { value: new THREE.Color(this.baseColor) },
                uOpacity: { value: 0.6 },
                uColorblind: { value: this.game.settings.colorblindMode ? 1.0 : 0.0 }
            },
            blending: THREE.NormalBlending,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false // Prevent transparent lanes from hiding notes
        });
        const lineGeometry = new THREE.PlaneGeometry(this.laneWidth, 100);

        for (const xPos of this.lanePositions) {
            const line = new THREE.Mesh(lineGeometry, sharedLineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.position.set(xPos, -1.495, -50); // Slightly above the main grid
            line.renderOrder = 1; // Render lanes on top of grid
            this.scene.add(line);
            this.laneLines.push(line);
        }

        // Keep single ref for uniform updates
        this.laneMaterial = sharedLineMaterial;
    }

    update(time, pulse, isFever, swapFactor = 0) {
        if (this.mesh) {
            this.mesh.material.uniforms.uTime.value = time;
            this.mesh.material.uniforms.uBeat.value = pulse;

            let target = isFever ? this.feverColor : this.baseColor;
            if (this.game.settings.colorblindMode) {
                target = new THREE.Color('#ffff00');
                this.mesh.material.uniforms.uColor.value.copy(target);
            } else {
                this.currentColor.lerp(target, 0.05);
                this.mesh.material.uniforms.uColor.value.copy(this.currentColor);
            }

            if (this.game.settings.zenMode) {
                this.mesh.material.opacity = 0.2;
            } else {
                this.mesh.material.opacity = 1.0;
            }
        }

        if (this.laneMaterial) {
            this.laneMaterial.uniforms.uColor.value.copy(this.currentColor);
            this.laneMaterial.uniforms.uOpacity.value = 0.6 + pulse * 0.2;
            this.laneMaterial.uniforms.uColorblind.value = this.game.settings.colorblindMode ? 1.0 : 0.0;
        }

        // Handle lane swapping visual position
        this.laneLines.forEach((line, i) => {
            let lx = this.lanePositions[i];
            if (i === 1) lx = THREE.MathUtils.lerp(this.lanePositions[1], this.lanePositions[2], swapFactor);
            if (i === 2) lx = THREE.MathUtils.lerp(this.lanePositions[2], this.lanePositions[1], swapFactor);
            line.position.x = lx;
        });
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        this.laneLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.laneLines = [];
    }
}