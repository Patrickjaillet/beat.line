export class ProceduralGenerator {
    constructor() {}

    generate(audioBuffer, bpm = 120, difficulty = 'Normal') {
        if (!audioBuffer) return { notes: [] };

        console.log(`Début génération : Audio ${audioBuffer.duration}s, BPM ${bpm}`);

        const data = audioBuffer.getChannelData(0); // Canal gauche
        const sampleRate = audioBuffer.sampleRate;
        const notes = [];
        
        // 1. Définir la grille rythmique (Snap Grid)
        // On veut aligner les notes sur les noires (1 temps) ou les croches (1/2 temps)
        const secondsPerBeat = 60 / bpm;
        let quantizeStep = secondsPerBeat / 2; // Par défaut : croche (1/2 temps)
        let threshold = 0.15; // Seuil de volume (0 à 1)

        // Ajustement selon difficulté
        if (difficulty === 'Easy') {
            quantizeStep = secondsPerBeat; // Une note par temps max
            threshold = 0.25; // Il faut un son plus fort pour déclencher
        } else if (difficulty === 'Hard') {
            quantizeStep = secondsPerBeat / 4; // Double-croche (1/4 temps)
            threshold = 0.10;
        }

        // Fenêtre d'analyse (environ 0.05s)
        const windowSize = Math.floor(sampleRate * 0.05);
        let maxVolumeInWindow = 0;
        
        // Pour éviter les doublons sur le même temps musical
        let lastQuantizedTime = -1;

        // 2. Parcourir TOUT le fichier audio
        for (let i = 0; i < data.length; i += windowSize) {
            
            // Calculer le volume moyen (RMS) sur cette petite fenêtre
            let sum = 0;
            let count = 0;
            for (let j = 0; j < windowSize && (i + j) < data.length; j++) {
                let val = data[i + j];
                sum += val * val;
                count++;
            }
            const rms = Math.sqrt(sum / count);

            // 3. Détection de pic (Beat)
            if (rms > threshold) {
                // Temps brut en secondes
                const rawTime = i / sampleRate;

                // QUANTIZATION : On force le temps à tomber pile sur la grille
                // Ex: si rawTime = 1.12s et step = 0.5s -> on arrondit à 1.0s
                const snappedTime = Math.round(rawTime / quantizeStep) * quantizeStep;

                // Si ce temps est valide et qu'on n'a pas déjà mis une note ici
                if (snappedTime > lastQuantizedTime && snappedTime < audioBuffer.duration) {
                    
                    // Choix de la ligne (Lane) déterministe
                    // On utilise le temps pour créer un motif qui se répète pas au hasard
                    const pattern = Math.floor(snappedTime * 1000) % 4; 
                    
                    // Petite variation pour éviter que ce soit trop linéaire
                    let lane = 0;
                    if (pattern === 0) lane = 1;
                    else if (pattern === 1) lane = 2;
                    else if (pattern === 2) lane = 0;
                    else lane = 3;

                    notes.push({
                        time: parseFloat(snappedTime.toFixed(3)),
                        lane: lane,
                        duration: 0
                    });

                    lastQuantizedTime = snappedTime;
                }
            }
        }
        
        console.log(`Génération terminée : ${notes.length} notes générées sur ${audioBuffer.duration} secondes.`);
        return { notes: notes };
    }
}