import * as THREE from 'three';
import { bossVertex } from '../shaders/bossVertex.js';
import { bossFragment } from '../shaders/bossFragment.js';

export class BossManager {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.obscureMesh = null;
        this.active = false;
        this.attackTimer = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.healthBar = null;
        this.healthFill = null;
        this.hitIntensity = 0;
        this.init();
    }

    init() {
        const geo = new THREE.IcosahedronGeometry(10, 1);
        const mat = new THREE.ShaderMaterial({
            vertexShader: bossVertex,
            fragmentShader: bossFragment,
            uniforms: { 
                uTime: { value: 0 }, 
                uColor: { value: new THREE.Color(0xff0000) },
                uHit: { value: 0 }
            },
            wireframe: true
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(0, 10, -80);
        this.mesh.visible = false;
        this.scene.add(this.mesh);

        const obsGeo = new THREE.PlaneGeometry(20, 20);
        const obsMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 });
        this.obscureMesh = new THREE.Mesh(obsGeo, obsMat);
        this.scene.add(this.obscureMesh);

        this.createUI();
    }

    createUI() {
        this.healthBar = document.createElement('div');
        Object.assign(this.healthBar.style, {
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
            width: '400px', height: '20px', background: '#333', border: '2px solid #ff0000',
            display: 'none', zIndex: '10'
        });

        this.healthFill = document.createElement('div');
        Object.assign(this.healthFill.style, {
            width: '100%', height: '100%', background: '#ff0000', transition: 'width 0.2s'
        });
        this.healthBar.appendChild(this.healthFill);
        document.getElementById('ui-layer').appendChild(this.healthBar);
    }

    activate() {
        if (this.active) return;
        this.active = true;
        this.mesh.visible = true;
        this.healthBar.style.display = 'block';
        this.health = this.maxHealth;
        this.updateHealthUI();
    }

    takeDamage(amount) {
        if (!this.active) return;
        this.health = Math.max(0, this.health - amount);
        this.hitIntensity = 1.0;
        this.updateHealthUI();
    }

    updateHealthUI() {
        const pct = (this.health / this.maxHealth) * 100;
        this.healthFill.style.width = `${pct}%`;
    }

    update(dt, time, camera) {
        if (!this.active) return;
        this.mesh.rotation.y += dt * 0.5;
        this.mesh.material.uniforms.uTime.value = time;
        
        // Hit Flash Decay
        if (this.hitIntensity > 0) {
            this.hitIntensity -= dt * 5.0;
            if (this.hitIntensity < 0) this.hitIntensity = 0;
            this.mesh.material.uniforms.uHit.value = this.hitIntensity;
        }

        this.attackTimer += dt;

        if (this.attackTimer > 15) { // Attack every 15s
            const phase = this.attackTimer - 15;
            if (phase < 3) {
                this.obscureMesh.material.opacity = Math.sin(phase * Math.PI / 3) * 0.9;
                this.obscureMesh.position.copy(camera.position).add(new THREE.Vector3(0, 0, -2));
                this.obscureMesh.quaternion.copy(camera.quaternion);
            } else { this.attackTimer = 0; this.obscureMesh.material.opacity = 0; }
        }
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.obscureMesh);
        this.mesh.geometry.dispose(); this.mesh.material.dispose();
        this.obscureMesh.geometry.dispose(); this.obscureMesh.material.dispose();
        if (this.healthBar) this.healthBar.remove();
    }
}