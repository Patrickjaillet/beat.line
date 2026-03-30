import * as THREE from 'three';

export class NoteFactory {
    constructor(scene, scoreManager, particleSystem, speed = 30, isGhost = false) {
        this.scene = scene;
        this.scoreManager = scoreManager;
        this.particleSystem = particleSystem;
        this.pool = [];
        this.activeNotes = [];
        this.noteSpeed = speed;
        this.spawnDistance = 100; // Distance d'apparition (plus loin = on voit mieux venir)

        // --- 3D SHAPE ---
        // Width 1.5, Height 0.5, Depth 0.5
        this.geometry = new THREE.BoxGeometry(1.5, 0.5, 0.5);
        
        // Pivot adjust, so the cube sits ON the floor (y=0) instead of halfway through.
        // For track at y=-1.5, we want notes just above it.
        this.geometry.translate(0, 0, 0); 

        // Couleurs des 4 voies (Rose, Cyan, Cyan, Rose)
        this.colors = [0xff0055, 0x00ffff, 0x00ffff, 0xff0055];
        
        this.expandPool(50);
    }

    expandPool(amount) {
        for (let i = 0; i < amount; i++) {
            // Création du matériau brillant (Néon)
            const material = new THREE.MeshStandardMaterial({
                color: 0x000000,
                emissive: 0xffffff, // Sera changé par la couleur de la voie
                emissiveIntensity: 1.5,
                roughness: 0.1,
                metalness: 0.9
            });

            const mesh = new THREE.Mesh(this.geometry, material);
            mesh.visible = false;
            // Stockage de données utiles pour le jeu
            mesh.userData = { active: false, time: 0, lane: 0, duration: 0, hit: false, holding: false };
            
            this.scene.add(mesh);
            this.pool.push(mesh);
        }
    }

    createNote(lane) {
        let mesh = this.pool.find(n => !n.visible);
        if (!mesh) {
            this.expandPool(10);
            mesh = this.pool[this.pool.length - 1];
        }

        // Réinitialisation de la note
        mesh.visible = true;
        mesh.userData.hit = false;
        mesh.userData.holding = false;
        mesh.userData.lane = lane;
        
        // Couleur selon la voie
        mesh.material.emissive.setHex(this.colors[lane]);

        // Les voies sont à x = -3, -1, 1, 3
        const xPos = (lane - 1.5) * 2.0;

        // On initialise la note en première approximation. La vraie position Z est recalculée
        // immédiatement dans update() selon le temps courant pour éviter toute contradiction.
        mesh.position.set(xPos, -1.0, 0);

        return mesh;
    }

    setChart(chart) {
        this.chart = chart.notes || [];
        // On trie les notes par temps pour être sûr
        this.chart.sort((a, b) => a.time - b.time);
        this.chartIndex = 0;
        
        // Nettoyage des notes existantes
        this.activeNotes.forEach(n => n.visible = false);
        this.activeNotes = [];
    }

    update(songTime, delta) {
        // 1. Faire apparaître les nouvelles notes
        // On regarde vers l'avenir : songTime + temps de trajet
        const timeToReachPlayer = this.spawnDistance / this.noteSpeed;
        const spawnTime = songTime + timeToReachPlayer;

        while (this.chartIndex < this.chart.length && this.chart[this.chartIndex].time <= spawnTime) {
            const noteData = this.chart[this.chartIndex];
            const mesh = this.createNote(noteData.lane);
            
            mesh.userData.time = noteData.time;
            mesh.userData.duration = noteData.duration;
            
            // Calcul cohérent de la position Z basé sur le temps restant jusqu'au hit.
            // Note part de -spawnDistance (loin de la caméra), et se dirige vers 0.
            // timeToReachPlayer = spawnDistance / noteSpeed
            // z = -(noteTime - songTime) * noteSpeed
            // Au spawn (songTime = noteTime - timeToReachPlayer) -> z = -spawnDistance
            // Au moment du hit (songTime = noteTime) -> z = 0.
            mesh.position.z = - (noteData.time - songTime) * this.noteSpeed;

            this.activeNotes.push(mesh);
            this.chartIndex++;
        }

        // 2. Déplacer les notes actives
        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            const note = this.activeNotes[i];

            // On recalcule la position exacte à chaque frame pour rester synchro
            // Si noteTime=5, songTime=0 => Z=-150 ; songTime=5=>Z=0 ; songTime=6=>Z=30.
            note.position.z = - (note.userData.time - songTime) * this.noteSpeed;
            
            // Si la note dépasse la zone de frappe (ratée)
            if (note.position.z > 5) { // Un peu derrière la ligne d'impact
                if (!note.userData.hit) {
                     this.scoreManager.registerMiss();
                }
                note.visible = false;
                this.activeNotes.splice(i, 1);
            }
        }
    }

    triggerLane(lane) {
        // Animation simple quand on appuie sur une touche
        // (Optionnel, peut être géré par TrackManager)
    }

    checkHit(lane, songTime) {
        // Fenêtre de tir (0.15s = 150ms)
        const hitWindow = 0.150;

        for (const note of this.activeNotes) {
            if (!note.visible || note.userData.hit) continue;
            if (note.userData.lane !== lane) continue;

            const timeDiff = note.userData.time - songTime;

            if (Math.abs(timeDiff) < hitWindow) {
                // TOUCHÉ !
                note.userData.hit = true;
                
                // Créer des particules
                this.particleSystem.spawnExplosion(note.position, this.colors[lane]);
                
                // Jugement
                this.scoreManager.judge(timeDiff);

                if (note.userData.duration > 0) {
                    note.userData.holding = true;
                } else {
                    note.visible = false;
                }
                
                return true;
            }
        }
        return false;
    }

    checkRelease(lane, songTime) {
        const note = this.activeNotes.find(n => n.visible && n.userData.holding && n.userData.lane === lane);
        if (note) {
            note.visible = false;
            note.userData.holding = false;
            const endTime = note.userData.time + note.userData.duration;
            this.scoreManager.judge(songTime - endTime);
        }
    }

    spawnComboBurst() {
        if (this.particleSystem && typeof this.particleSystem.spawnComboBurst === 'function') {
            this.particleSystem.spawnComboBurst();
            return;
        }
        // fallback minimal effect
        if (this.particleSystem && typeof this.particleSystem.spawnExplosion === 'function') {
            this.particleSystem.spawnExplosion(new THREE.Vector3(0, 0, 0), 0xffd700);
        }
    }
}