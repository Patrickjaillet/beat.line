import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.pool = [];
        this.activeParticles = [];
        // Sparks: Elongated planes
        this.geometry = new THREE.PlaneGeometry(0.1, 0.5);
        this.shapeGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        this.expandPool(100);

        // Shockwaves: Rings
        this.ringPool = [];
        this.activeRings = [];
        this.ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
        this.expandRingPool(20);
    }

    getTextureForShape(shape) {
        if (!this.textures) this.textures = {};
        if (this.textures[shape]) return this.textures[shape];

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';

        if (shape === 'Star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * 0.0174533) * 32 + 32, -Math.sin((18 + i * 72) * 0.0174533) * 32 + 32);
                ctx.lineTo(Math.cos((54 + i * 72) * 0.0174533) * 16 + 32, -Math.sin((54 + i * 72) * 0.0174533) * 16 + 32);
            }
            ctx.closePath();
            ctx.fill();
        } else if (shape === 'Heart') {
            ctx.beginPath();
            ctx.moveTo(32, 50);
            ctx.bezierCurveTo(32, 47, 10, 35, 10, 20);
            ctx.bezierCurveTo(10, 5, 30, 5, 32, 20);
            ctx.bezierCurveTo(34, 5, 54, 5, 54, 20);
            ctx.bezierCurveTo(54, 35, 32, 47, 32, 50);
            ctx.fill();
        } else if (shape === 'Note') {
            ctx.font = '48px Arial';
            ctx.fillText('♪', 10, 50);
        }

        const texture = new THREE.CanvasTexture(canvas);
        this.textures[shape] = texture;
        return texture;
    }

    expandPool(count) {
        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });
            const p = new THREE.Mesh(this.geometry, material);
            p.visible = false;
            this.scene.add(p);
            this.pool.push(p);
        }
    }

    expandRingPool(count) {
        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 1, 
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(this.ringGeometry, material);
            mesh.visible = false;
            this.scene.add(mesh);
            this.ringPool.push(mesh);
        }
    }

    getFreeParticle() {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].visible) return this.pool[i];
        }
        this.expandPool(20);
        return this.pool[this.pool.length - 20];
    }

    getFreeRing() {
        for (let i = 0; i < this.ringPool.length; i++) {
            if (!this.ringPool[i].visible) return this.ringPool[i];
        }
        this.expandRingPool(10);
        return this.ringPool[this.ringPool.length - 10];
    }

    spawnExplosion(pos, color) {
        // 1. Shockwave Ring
        const ring = this.getFreeRing();
        if (ring) {
            ring.visible = true;
            ring.position.copy(pos);
            ring.rotation.set(0, 0, 0); // Face Z axis
            ring.material.color.setHex(color);
            ring.material.opacity = 0.8;
            ring.scale.setScalar(1.0);
            ring.userData = { life: 0.3, maxLife: 0.3 };
            this.activeRings.push(ring);
        }

        // 2. Sparks
        const shape = this.game ? (this.game.settings.particleShape || 'Spark') : 'Spark';
        let useTexture = false;
        let texture = null;

        if (shape !== 'Spark') {
            useTexture = true;
            texture = this.getTextureForShape(shape);
        }

        for (let i = 0; i < 12; i++) {
            const p = this.getFreeParticle();
            p.visible = true;
            p.position.copy(pos);
            p.material.color.setHex(color);
            
            if (useTexture) {
                p.geometry = this.shapeGeometry;
                p.material.map = texture;
                p.material.alphaTest = 0.5;
            } else {
                p.geometry = this.geometry;
                p.material.map = null;
                p.material.alphaTest = 0;
            }

            const speed = 5 + Math.random() * 5;
            const angle = Math.random() * Math.PI * 2;
            const zSpread = (Math.random() - 0.5) * 5;

            p.userData = {
                vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, zSpread),
                life: 0.4 + Math.random() * 0.4,
                gravity: -15.0, // Strong gravity for sparks
                isShape: useTexture
            };
            
            if (!useTexture) {
                p.lookAt(p.position.clone().add(p.userData.vel));
            } else {
                p.rotation.set(0, 0, Math.random() * Math.PI * 2);
            }
            
            this.activeParticles.push(p);
        }
    }

    spawnComboBurst() {
        for (let i = 0; i < 30; i++) {
            const p = this.getFreeParticle();
            p.visible = true;
            p.position.set(0, 0, 0);
            p.material.color.setHex(0xffd700);
            p.scale.setScalar(2.0);
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            p.userData = {
                vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * 5),
                life: 1.5,
                gravity: -5.0
            };
            this.activeParticles.push(p);
        }
    }

    update(delta) {
        let i = 0;
        while (i < this.activeParticles.length) {
            const p = this.activeParticles[i];
            p.userData.life -= delta * 3.0;
            
            if (p.userData.gravity) {
                p.userData.vel.y += p.userData.gravity * delta;
            }

            p.position.addScaledVector(p.userData.vel, delta);
            
            // Scale length based on speed/life, width shrinks
            if (p.userData.isShape) {
                p.scale.setScalar(Math.max(0.1, p.userData.life));
                p.rotation.z += delta * 5.0; // Spin shapes
            } else {
                p.scale.set(Math.max(0.1, p.userData.life), 1.0, 1.0);
                p.lookAt(p.position.clone().add(p.userData.vel));
            }
            
            if (p.userData.life <= 0) {
                p.visible = false;
                this.activeParticles[i] = this.activeParticles[this.activeParticles.length - 1];
                this.activeParticles.pop();
            } else {
                i++;
            }
        }

        // Update Rings
        i = 0;
        while (i < this.activeRings.length) {
            const r = this.activeRings[i];
            r.userData.life -= delta;
            
            const progress = 1.0 - (r.userData.life / r.userData.maxLife);
            const scale = 1.0 + progress * 4.0; // Expand 4x
            r.scale.setScalar(scale);
            r.material.opacity = r.userData.life / r.userData.maxLife;
            
            if (r.userData.life <= 0) {
                r.visible = false;
                this.activeRings[i] = this.activeRings[this.activeRings.length - 1];
                this.activeRings.pop();
            } else {
                i++;
            }
        }
    }

    dispose() {
        // Clean up pools by removing from scene
        this.pool.forEach(p => {
            if (p.parent) this.scene.remove(p);
            p.material.dispose();
        });
        this.ringPool.forEach(r => {
            if (r.parent) this.scene.remove(r);
            r.material.dispose();
        });

        // Dispose of shared geometries
        this.geometry.dispose();
        this.shapeGeometry.dispose();
        this.ringGeometry.dispose();

        // Clear arrays
        this.pool = [];
        this.activeParticles = [];
        this.ringPool = [];
        this.activeRings = [];

        // Clean up ambient particles if they exist
        if (this.ambientParticles) {
            this.scene.remove(this.ambientParticles);
            this.ambientParticles.geometry.dispose();
            this.ambientParticles.material.dispose();
            this.ambientParticles = null;
        }

        // Clean up cached canvas textures
        if (this.textures) Object.values(this.textures).forEach(texture => texture.dispose());
    }
}
