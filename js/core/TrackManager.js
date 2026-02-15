import * as THREE from 'three';
import { tronGridVertex } from '../shaders/tronGridVertex.js';
import { tronGridFragment } from '../shaders/tronGridFragment.js';

export class TrackManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.mesh = null;
        this.baseColor = new THREE.Color(this.game.settings.skin.trackColor);
        this.feverColor = new THREE.Color(this.game.settings.skin.feverColor);
        this.currentColor = new THREE.Color(this.game.settings.skin.trackColor);
        this.init();
    }

    init() {
        const geo = new THREE.PlaneGeometry(100, 100);
        const mat = new THREE.ShaderMaterial({
            vertexShader: tronGridVertex,
            fragmentShader: tronGridFragment,
            uniforms: {
                uTime: { value: 0 },
                uBeat: { value: 0 },
                uColor: { value: this.currentColor }
            },
            transparent: true,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.z = -40;
        this.scene.add(this.mesh);
    }

    update(time, beat, isFever) {
        if (this.mesh) {
            this.mesh.material.uniforms.uTime.value = time;
            this.mesh.material.uniforms.uBeat.value = beat;
            const target = isFever ? this.feverColor : this.baseColor;
            this.currentColor.lerp(target, 0.05);
            this.mesh.material.uniforms.uColor.value.copy(this.currentColor);
        }
    }

    dispose() {
        if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
    }
}