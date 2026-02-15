export class ProceduralGenerator {
    constructor() {}

    generate(audioBuffer, bpm = 120, difficulty = 'Normal') {
        if (!audioBuffer) return { notes: [] };

        const data = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const notes = [];
        
        // Analysis parameters based on difficulty
        let threshold = 1.5; // Energy threshold relative to average
        let minStep = 0.2; // Minimum time between notes (seconds)
        
        if (difficulty === 'Easy') { threshold = 1.8; minStep = 0.4; }
        else if (difficulty === 'Hard') { threshold = 1.3; minStep = 0.15; }
        
        // Window size for RMS calculation (approx 50ms)
        const windowSize = Math.floor(sampleRate * 0.05);
        let movingAvg = 0;
        let lastNoteTime = -minStep;

        // Iterate through audio data
        for (let i = 0; i < data.length; i += windowSize) {
            let sum = 0;
            // Calculate RMS (Root Mean Square) for this window
            for (let j = 0; j < windowSize && i + j < data.length; j++) {
                sum += data[i + j] * data[i + j];
            }
            const rms = Math.sqrt(sum / windowSize);
            
            // Beat Detection Logic
            // If local energy is significantly higher than moving average
            if (rms > movingAvg * threshold && rms > 0.05) {
                const time = i / sampleRate;
                
                if (time - lastNoteTime >= minStep) {
                    // Map lane based on time (pseudo-random but deterministic)
                    const lane = Math.floor((time * 1000) % 4);
                    
                    notes.push({ time: parseFloat(time.toFixed(3)), lane: lane, duration: 0 });
                    lastNoteTime = time;
                }
            }
            
            // Update moving average (decay)
            movingAvg = movingAvg * 0.95 + rms * 0.05;
        }
        
        return { notes };
    }
}