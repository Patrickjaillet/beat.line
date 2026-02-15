import * as THREE from 'three';
import { cityVertex } from '../shaders/cityVertex.js';
import { cityFragment } from '../shaders/cityFragment.js';
import { monolithVertex } from '../shaders/monolithVertex.js';
import { monolithFragment } from '../shaders/monolithFragment.js';
import { gameBgVertex } from '../shaders/gameBgVertex.js';
import { gameBgFragment } from '../shaders/gameBgFragment.js';

export class BackgroundManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.mesh = null;
        this.monoliths = [];
        this.baseColor = new THREE.Color();
        this.particles = null;
        this.particleSystemData = { type: 'NONE', speed: 0, count: 0 };
        this.init();
    }

    init() {
        this.setTheme('CITY');
    }

    createParticleTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        if (type === 'RAIN') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(14, 0, 4, 32); // Long streak
        } else if (type === 'SNOW') {
            const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();
        } else { // DUST
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(16, 16, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    setTheme(themeName) {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }

        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }

        let geometry, material;

        switch (themeName) {
            case 'MONOLITH':
                geometry = new THREE.PlaneGeometry(100, 60);
                material = new THREE.ShaderMaterial({
                    vertexShader: monolithVertex,
                    fragmentShader: monolithFragment,
                    uniforms: {
                        uTime: { value: 0 },
                        uBass: { value: 0 },
                        uColor: { value: new THREE.Color(this.game.settings.skin.bgColor) },
                        uIntensity: { value: 0 }
                    },
                    side: THREE.DoubleSide,
                    transparent: true
                });
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.set(0, 10, -40);
                this.setupParticles('RAIN', 2000, 0x00ff00, 80); // Digital Rain
                break;

            case 'SPACE':
                geometry = new THREE.SphereGeometry(80, 32, 32);
                material = new THREE.ShaderMaterial({
                    vertexShader: gameBgVertex,
                    fragmentShader: gameBgFragment,
                    uniforms: {
                        uTime: { value: 0 },
                        uColor: { value: new THREE.Color(this.game.settings.skin.bgColor) },
                        uIntensity: { value: 0 }
                    },
                    side: THREE.BackSide
                });
                this.mesh = new THREE.Mesh(geometry, material);
                this.setupParticles('DUST', 1000, 0xffffff, 5); // Space Dust
                break;

            case 'CITY':
            default:
                geometry = new THREE.CylinderGeometry(60, 60, 30, 32, 1, true);
                material = new THREE.ShaderMaterial({
                    vertexShader: cityVertex,
                    fragmentShader: cityFragment,
                    uniforms: {
                        uTime: { value: 0 },
                        uColor: { value: new THREE.Color(this.game.settings.skin.bgColor) },
                        uIntensity: { value: 0 }
                    },
                    side: THREE.BackSide
                });
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.y = 5;
                this.setupParticles('RAIN', 1500, 0xaaaaaa, 60); // Acid Rain
                break;
        }

        this.baseColor.set(this.game.settings.skin.bgColor);
        this.scene.add(this.mesh);
    }

    setupParticles(type, count, color, speed) {
        this.particleSystemData = { type, speed, count };
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            vertices.push((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60 + 20, (Math.random() - 0.5) * 100 - 20);
            velocities.push(0, -Math.random(), 0);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: type === 'RAIN' ? 0.8 : 0.5,
            map: this.createParticleTexture(type),
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    update(time, beat, isFever) {
        if (this.mesh) {
            if (this.mesh.material.uniforms.uTime) this.mesh.material.uniforms.uTime.value = time;
            
            // Get Audio Intensity (Bass)
            const freq = this.game.audioManager.getAverageFrequency(); // 0.0 to 1.0
            
            const hue = isFever ? 0.8 : (time * 0.02) % 1.0; // Magenta for fever
            const sat = isFever ? 1.0 : 0.8;
            
            // Dynamic Color Pulse based on Audio
            const targetColor = new THREE.Color().setHSL(hue, sat, 0.5 + freq * 0.3); // Lightness boost on beat
            
            if (this.mesh.material.uniforms.uColor) {
                this.mesh.material.uniforms.uColor.value.lerp(targetColor, 0.1);
            }

            if (this.mesh.material.uniforms.uBass) {
                this.mesh.material.uniforms.uBass.value = freq;
            }
            
            if (this.mesh.material.uniforms.uIntensity) {
                this.mesh.material.uniforms.uIntensity.value = freq;
            }
        }

        // Update Particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            const speed = this.particleSystemData.speed * (isFever ? 2.0 : 1.0);
            
            for (let i = 0; i < this.particleSystemData.count; i++) {
                // Move down
                positions[i * 3 + 1] -= speed * 0.016; // Approx delta
                
                // Reset if below floor
                if (positions[i * 3 + 1] < -10) {
                    positions[i * 3 + 1] = 50;
                }
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    setCustomShader(fragmentShader) {
        if (!this.mesh) return;
        
        // Create new material with custom shader
        const newMaterial = new THREE.ShaderMaterial({
            vertexShader: cityVertex, // Keep default vertex shader
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(this.game.settings.skin.bgColor) }, 
                uIntensity: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            side: THREE.BackSide
        });

        this.mesh.material.dispose();
        this.mesh.material = newMaterial;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.scene.remove(this.mesh);
        }
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        this.monoliths = [];
    }
}
