const DEBUG = (typeof window !== 'undefined' && window.BEATLINE_DEBUG) || false;

export class ProceduralGenerator {
    constructor() {}

    async generate(audioBuffer, bpm = 120, difficulty = 'Normal') {
        if (!audioBuffer) return { notes: [] };

        if (DEBUG) console.log(`Début génération : Audio ${audioBuffer.duration}s, BPM ${bpm}`);

        const data = audioBuffer.getChannelData(0); // Canal gauche
        const sampleRate = audioBuffer.sampleRate;
        const notes = [];
        
        const secondsPerBeat = 60 / bpm;
        let quantizeStep = secondsPerBeat / 2;
        let threshold = 0.15;

        if (difficulty === 'Easy') {
            quantizeStep = secondsPerBeat;
            threshold = 0.25;
        } else if (difficulty === 'Hard') {
            quantizeStep = secondsPerBeat / 4;
            threshold = 0.10;
        } else if (difficulty === 'Expert') {
            quantizeStep = secondsPerBeat / 8;
            threshold = 0.08;
        }

        const windowSize = Math.max(1, Math.floor(sampleRate * 0.05));
        let lastQuantizedTime = -1;

        const totalFrames = data.length;
        const framesPerIteration = windowSize * 40; // environ 2s chunks on 44k

        for (let base = 0; base < totalFrames; base += framesPerIteration) {
            const endFrame = Math.min(totalFrames, base + framesPerIteration);
            for (let i = base; i < endFrame; i += windowSize) {
                let sum = 0;
                let count = 0;
                const limit = Math.min(windowSize, totalFrames - i);
                for (let j = 0; j < limit; j++) {
                    const val = data[i + j];
                    sum += val * val;
                    count++;
                }

                if (count === 0) continue;
                const rms = Math.sqrt(sum / count);

                if (rms > threshold) {
                    const rawTime = i / sampleRate;
                    const snappedTime = Math.round(rawTime / quantizeStep) * quantizeStep;

                    if (snappedTime > lastQuantizedTime && snappedTime < audioBuffer.duration) {
                        const pattern = Math.floor(snappedTime * 1000) % 4;
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

            await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (DEBUG) console.log(`Génération terminée : ${notes.length} notes générées sur ${audioBuffer.duration} secondes.`);
        return { notes };
    }
}