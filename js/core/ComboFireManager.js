import * as THREE from 'three';
import { fireVertex } from '../shaders/fireVertex.js';
import { fireFragment } from '../shaders/fireFragment.js';

export class ComboFireManager {
    constructor(camera) {
        this.camera = camera;
        this.mesh = null;
        this.intensity = 0;
        this.init();
    }

    init() {
        // Create a plane that covers the camera view
        // Placed slightly in front of the camera (z = -1)
        // For a perspective camera, we need to calculate size based on FOV, but for visual effect, hardcoded scale works if attached to camera.
        const geometry = new THREE.PlaneGeometry(2, 2); // Normalized device coordinates size roughly
        
        const material = new THREE.ShaderMaterial({
            vertexShader: fireVertex,
            fragmentShader: fireFragment,
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0 }
            },
            transparent: true,
            depthTest: false, // Always draw on top
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Mesh(geometry, material);
        // Position in front of camera. 
        // Since we attach to camera, (0,0,-1) is 1 unit in front.
        // We scale it up to cover the view frustum at that distance.
        // Tan(75/2) ~ 0.76. At dist 1, height is ~1.5.
        this.mesh.position.set(0, 0, -1.1);
        this.mesh.scale.set(3.5, 2.0, 1.0); // Wide aspect ratio
        this.camera.add(this.mesh);
    }

    update(time, combo) {
        if (!this.mesh) return;
        this.mesh.material.uniforms.uTime.value = time;
        
        // Target intensity: 0 if combo < 50, ramps up to 1 at combo 150
        const target = THREE.MathUtils.clamp((combo - 50) / 100, 0, 1);
        
        // Smooth transition
        this.intensity = THREE.MathUtils.lerp(this.intensity, target, 0.05);
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