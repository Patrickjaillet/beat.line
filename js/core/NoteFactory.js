import * as THREE from 'three';

const noteVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const noteFragmentShader = `
uniform vec3 color;
uniform float opacity;
varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec2 a = abs(uv);
    float border = max(a.x, a.y);
    float glow = smoothstep(0.7, 0.95, border);
    vec3 base = color * 0.3;
    vec3 edge = color * 1.5;
    gl_FragColor = vec4(mix(base, edge, glow), opacity);
}
`;

export class NoteFactory {
    constructor(scene, scoreManager, particleSystem, speed = 30, isGhost = false) {
        this.scene = scene;
        this.scoreManager = scoreManager;
        this.particleSystem = particleSystem;
        this.pool = [];
        this.laneMeshes = [];
        this.activeNotes = [];
        this.chart = [];
        this.chartIndex = 0;
        this.noteSpeed = speed; // Units per second
        this.spawnDistance = 60; // Z-distance to spawn
        this.swapFactor = 0;
        this.targetSwap = 0;
        this.isGhost = isGhost;
        this.conductor = null;
        
        // Lane Colors: Left(Pink), Down(Cyan), Up(Cyan), Right(Pink)
        this.colors = this.scoreManager.game.settings.skin.noteColors;
        
        if (this.scoreManager.game.settings.colorblindMode) {
            // High Contrast Blue/Orange Palette
            const orange = 0xffaa00;
            const blue = 0x0088ff;
            this.colors = [orange, blue, blue, orange];
        }
        
        const skin = this.scoreManager.game.settings.noteSkin || 'Cube';
        const size = this.scoreManager.game.settings.noteSize || 1.0;
        if (skin === 'Sphere') this.geometry = new THREE.SphereGeometry(0.3 * size, 16, 16);
        else if (skin === 'Diamond') this.geometry = new THREE.OctahedronGeometry(0.3 * size);
        else this.geometry = new THREE.BoxGeometry(0.8 * size, 0.4 * size, 0.5 * size);
        
        this.expandPool(50);
        this.createLaneVisuals();
    }

    setConductor(conductor) {
        this.conductor = conductor;
    }

    expandPool(count) {
        for (let i = 0; i < count; i++) {
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(0xffffff) },
                    opacity: { value: 1.0 }
                },
                vertexShader: noteVertexShader,
                fragmentShader: noteFragmentShader,
                transparent: true
            });
            const note = new THREE.Mesh(this.geometry, material);
            note.visible = false;
            this.scene.add(note);
            this.pool.push(note);
        }
    }

    createLaneVisuals() {
        const geometry = new THREE.PlaneGeometry(1, 100);
        for (let i = 0; i < 4; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: this.colors[i],
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(i - 1.5, -0.1, -50);
            mesh.rotation.x = -Math.PI / 2;
            mesh.userData = { hitOpacity: 0 };
            this.scene.add(mesh);
            this.laneMeshes.push(mesh);
        }
    }

    loadChart(chartData) {
        // Deep copy and sort notes by time
        this.chart = JSON.parse(JSON.stringify(chartData.notes)).sort((a, b) => a.time - b.time);
        this.chartIndex = 0;
    }

    spawn(noteData) {
        let note = this.pool.find(n => !n.visible);
        if (!note) {
            this.expandPool(10);
            note = this.pool.find(n => !n.visible);
        }
        
        const dur = noteData.duration || 0;
        // Apply Mirror Mode
        const lane = this.scoreManager.game.settings.mirrorMode ? 3 - noteData.lane : noteData.lane;

        note.visible = true;
        note.material.uniforms.color.value.setHex(this.colors[lane]);
        note.material.uniforms.opacity.value = this.isGhost ? 0.3 : 1.0;
        note.scale.z = dur > 0 ? (dur * this.noteSpeed) / 0.5 : 1;
        note.userData = { ...noteData, lane: lane, hit: false, holding: false, offset: dur / 2 };

        // Pre-calculate visual time for the note (static based on chart stops)
        // If conductor is available, use it. Otherwise fallback to raw time.
        note.userData.visualTime = (this.conductor && typeof this.conductor.getVisualTime === 'function') ? this.conductor.getVisualTime(noteData.time) : noteData.time;

        // Light Cycle Trail
        if (!note.userData.trail) {
            const trailGeo = new THREE.PlaneGeometry(0.6, 10);
            const trailMat = new THREE.MeshBasicMaterial({ color: this.colors[lane], transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
            note.userData.trail = new THREE.Mesh(trailGeo, trailMat);
            note.userData.trail.rotation.x = -Math.PI / 2;
            this.scene.add(note.userData.trail);
        }
        note.userData.trail.material.color.setHex(this.colors[lane]);
        if (this.isGhost) note.userData.trail.material.opacity = 0.1;
        note.userData.trail.visible = true;
        
        note.position.set(lane - 1.5, 0, -this.spawnDistance); // Z updated in loop
        this.activeNotes.push(note);
    }

    setSwapState(swapped) {
        this.targetSwap = swapped ? 1 : 0;
    }

    update(songTime, delta, pulse = 0) {
        const diff = this.targetSwap - this.swapFactor;
        if (Math.abs(diff) > 0.01) this.swapFactor += Math.sign(diff) * delta * 2.0;
        else this.swapFactor = this.targetSwap;

        // Sync speed with settings (for Dynamic Difficulty)
        this.noteSpeed = this.scoreManager.game.settings.noteSpeed;

        // Spawn notes that are within range
        const lookahead = this.spawnDistance / this.noteSpeed;
        while (this.chartIndex < this.chart.length && this.chart[this.chartIndex].time <= songTime + lookahead) {
            this.spawn(this.chart[this.chartIndex]);
            this.chartIndex++;
        }

        // Move active notes
        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            const note = this.activeNotes[i];
            if (!note.visible) {
                if (note.userData.trail) note.userData.trail.visible = false;
                this.activeNotes.splice(i, 1);
                continue;
            }

            // Use Visual Time for positioning (handles Stops)
            const currentVisualTime = (this.conductor && this.conductor.visualPosition !== undefined) ? this.conductor.visualPosition : songTime;
            const noteVisualTime = note.userData.visualTime || note.userData.time;
            
            const t = noteVisualTime + note.userData.offset - currentVisualTime;
            note.position.z = -t * this.noteSpeed;
            
            // Auto-play for Visualizer
            if (this.scoreManager.game.isVisualizer || this.isGhost) {
                if (!note.userData.hit && Math.abs(note.userData.time - songTime) < 0.02) {
                    this.spawnExplosion(note.position, this.colors[note.userData.lane]);
                    if (note.userData.duration) {
                        note.userData.holding = true;
                        note.userData.hit = true;
                        this.scoreManager.judge(0);
                    } else {
                        note.visible = false;
                        note.userData.hit = true;
                        this.scoreManager.judge(0);
                    }
                    this.triggerLane(note.userData.lane);
                }
                if (note.userData.holding && songTime >= note.userData.time + note.userData.duration) {
                    this.checkRelease(note.userData.lane, songTime);
                }
            }

            // Lane Swap Logic
            let lx = note.userData.lane - 1.5;
            if (note.userData.lane === 1) lx = THREE.MathUtils.lerp(-0.5, 0.5, this.swapFactor);
            if (note.userData.lane === 2) lx = THREE.MathUtils.lerp(0.5, -0.5, this.swapFactor);
            note.position.x = lx;

            // Update Trail
            if (note.userData.trail) {
                note.userData.trail.position.set(note.position.x, -0.05, note.position.z + 5);
            }
            
            // Miss logic (passed player)
            const endT = note.userData.time + (note.userData.duration || 0);
            if (songTime > endT + 0.2 && !note.userData.hit && !note.userData.holding) {
                note.visible = false;
                this.scoreManager.registerMiss();
            } else if (note.userData.holding && songTime > endT + 0.2) {
                note.visible = false; // Auto-release if held too long (simplified)
                this.scoreManager.judge(0); // Count as hit
            }
        }

        // Update Lane Visuals
        this.laneMeshes.forEach((mesh, i) => {
            if (mesh.userData.hitOpacity > 0) {
                mesh.userData.hitOpacity -= delta * 3.0;
                if (mesh.userData.hitOpacity < 0) mesh.userData.hitOpacity = 0;
            }
            
            const basePulse = pulse * 0.2; // 20% max opacity from beat
            mesh.material.opacity = Math.max(mesh.userData.hitOpacity, basePulse);

            let lx = i - 1.5;
            if (i === 1) lx = THREE.MathUtils.lerp(-0.5, 0.5, this.swapFactor);
            if (i === 2) lx = THREE.MathUtils.lerp(0.5, -0.5, this.swapFactor);
            mesh.position.x = lx;
        });

        this.particleSystem.update(delta);
    }

    resetToTime(time) {
        // Hide active notes
        this.activeNotes.forEach(n => { n.visible = false; if(n.userData.trail) n.userData.trail.visible = false; });
        this.activeNotes = [];
        
        // Reset index
        this.chartIndex = 0;
        while(this.chartIndex < this.chart.length && this.chart[this.chartIndex].time < time) {
            this.chartIndex++;
        }
    }

    spawnExplosion(pos, color) {
        if (this.isGhost) return; // No particles for ghost
        this.particleSystem.spawnExplosion(pos, color);
    }

    spawnComboBurst() {
        this.particleSystem.spawnComboBurst();
    }

    triggerLane(lane) {
        if (this.laneMeshes[lane]) {
            this.laneMeshes[lane].userData.hitOpacity = 0.6;
        }
    }

    checkHit(lane, songTime) {
        const hitWindow = 0.150; // 150ms window
        const note = this.activeNotes.find(n => n.visible && !n.userData.hit && n.userData.lane === lane && Math.abs(n.userData.time - songTime) < hitWindow);
        if (note) {
            this.spawnExplosion(note.position, this.colors[lane]);
            if (note.userData.duration) {
                note.userData.holding = true;
                note.userData.hit = true; // Mark head as hit
                this.scoreManager.judge(note.userData.time - songTime);
            } else {
                note.visible = false;
                note.userData.hit = true;
                this.scoreManager.judge(note.userData.time - songTime);
            }
            return true;
        }
        return false;
    }

    checkRelease(lane, songTime) {
        const note = this.activeNotes.find(n => n.visible && n.userData.holding && n.userData.lane === lane);
        if (note) {
            note.visible = false;
            note.userData.holding = false;
            const endTime = note.userData.time + note.userData.duration;
            this.scoreManager.judge(endTime - songTime);
        }
    }
}