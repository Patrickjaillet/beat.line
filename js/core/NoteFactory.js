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

        // --- FORME 3D ---
        // Largeur 1.5, Hauteur 0.5, Profondeur 0.5
        this.geometry = new THREE.BoxGeometry(1.5, 0.5, 0.5);
        
        // Ajustement du pivot pour que le cube soit posé SUR le sol (y=0) et pas à moitié dedans
        // Si ta piste est à y=-1.5, on veut que les notes soient un peu au dessus
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

        // Positionnement initial (Loin au fond)
        // Les voies sont à x = -3, -1, 1, 3
        const xPos = (lane - 1.5) * 2.0; 
        
        mesh.position.set(xPos, -1.0, -this.spawnDistance); // y = -1.0 pour être juste au dessus de la piste (-1.5)
        
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
            
            // Calcul précis de la position Z basé sur le temps
            // Z = (Temps Note - Temps Chanson) * Vitesse
            // Si la note est à 10s et la chanson à 5s, diff = 5s * 30 speed = 150 units loin
            mesh.position.z = (noteData.time - songTime) * -this.noteSpeed; // Négatif car on regarde vers -Z

            this.activeNotes.push(mesh);
            this.chartIndex++;
        }

        // 2. Déplacer les notes actives
        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            const note = this.activeNotes[i];
            
            // On recalcule la position exacte à chaque frame pour rester synchro
            const targetZ = (note.userData.time - songTime) * this.noteSpeed; // Positif : vient vers nous (0)
            
            // NOTE: Dans Three.js, "devant" la caméra est +Z, mais souvent on fait venir de -Z vers +Z ou l'inverse.
            // Dans ton code original, tu semblais faire venir de -Z vers 0.
            // Corrigeons pour que Z=0 soit le point d'impact (la caméra) et elles viennent de loin (-100).
            
            // Si spawnDistance est 100, et noteSpeed 30.
            // Une note à 5s, chanson à 0s -> Z = -150.
            // Chanson à 5s -> Z = 0.
            note.position.z = (songTime - note.userData.time) * this.noteSpeed; 
            
            // Si la note dépasse la caméra (ratée)
            if (note.position.z > 5) { // Un peu derrière la caméra
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
}