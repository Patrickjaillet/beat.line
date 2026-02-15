import * as THREE from 'three';
import { warpVertex } from '../shaders/warpVertex.js';
import { warpFragment } from '../shaders/warpFragment.js';

export class WarpManager {
    constructor(camera) {
        this.camera = camera;
        this.mesh = null;
        this.intensity = 0;
        this.init();
    }

    init() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: warpVertex,
            fragmentShader: warpFragment,
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0 }
            },
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 0, -1.05); // Slightly closer than fire
        this.mesh.scale.set(3.5, 2.0, 1.0);
        this.camera.add(this.mesh);
    }

    update(time, active) {
        if (!this.mesh) return;
        this.mesh.material.uniforms.uTime.value = time;
        
        const target = active ? 1.0 : 0.0;
        this.intensity = THREE.MathUtils.lerp(this.intensity, target, 0.1);
        this.mesh.material.uniforms.uIntensity.value = this.intensity;
    }

    dispose() {
        if (this.mesh) {
            this.camera.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
