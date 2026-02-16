export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.audioBuffer = null;
        this.source = null;
        this.introOsc = null;
        this.introGain = null;
        this.hddSource = null;
        this.hddGain = null;
        this.hddInterval = null;
        this.heartbeatInterval = null;
        
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
    }

    setVolume(value) {
        this.masterGain.gain.value = value;
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            return this.ctx.resume();
        }
        return Promise.resolve();
    }

    async loadSong(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load audio file: ${url} (Status: ${response.status}). Please verify the file exists in assets/songs/.`);
        }
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    }

    playSong(offset = 0) {
        if (this.source) this.source.stop();
        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.masterGain);
        this.source.start(0, offset);
    }

    setPlaybackRate(rate) {
        if (this.source && this.source.playbackRate) {
            this.source.playbackRate.value = rate;
        }
    }

    stopSong() {
        if (this.source) this.source.stop();
    }

    playIntroDrone() {
        if (this.ctx.state !== 'running') return;
        
        this.stopIntroDrone();
        
        this.introOsc = this.ctx.createOscillator();
        this.introGain = this.ctx.createGain();
        
        this.introOsc.type = 'sawtooth';
        this.introOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.introOsc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 20);
        
        this.introGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        this.introGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 20); // Fade out
        
        this.introOsc.connect(this.introGain);
        this.introGain.connect(this.masterGain);
        this.introOsc.start();
        this.introOsc.stop(this.ctx.currentTime + 20);
    }

    stopIntroDrone() {
        if (this.introOsc) {
            try { this.introOsc.stop(); } catch(e) {} // Ignore if already stopped
            this.introOsc.disconnect();
            this.introOsc = null;
        }
        if (this.introGain) {
            this.introGain.disconnect();
            this.introGain = null;
        }
    }

    playGameOverSFX() {
        if (this.ctx.state !== 'running') return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.8);
        
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
    }

    playPowerUpSFX() {
        if (this.ctx.state !== 'running') return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playExplosionSFX() {
        if (this.ctx.state !== 'running') return;

        // Low-frequency boom (noise)
        const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(400, this.ctx.currentTime);
        lowpass.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1.0);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

        noiseSource.connect(lowpass);
        lowpass.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noiseSource.start();
        noiseSource.stop(this.ctx.currentTime + 1.5);

        // High-frequency crack (oscillator)
        const crackOsc = this.ctx.createOscillator();
        crackOsc.type = 'sawtooth';
        crackOsc.frequency.setValueAtTime(2000, this.ctx.currentTime);
        crackOsc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.1);

        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        crackGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

        crackOsc.connect(crackGain);
        crackGain.connect(this.masterGain);
        crackOsc.start();
        crackOsc.stop(this.ctx.currentTime + 0.2);
    }

    getAverageFrequency() {
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for(let i = 0; i < this.bufferLength; i++) sum += this.dataArray[i];
        return sum / this.bufferLength / 255.0;
    }

    playHDDNoise() {
        if (this.ctx.state !== 'running' || this.hddSource) return;

        // Create noise buffer
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        this.hddSource = this.ctx.createBufferSource();
        this.hddSource.buffer = buffer;
        this.hddSource.loop = true;

        // Filter for mechanical sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;

        this.hddGain = this.ctx.createGain();
        this.hddGain.gain.value = 0; // Start silent

        this.hddSource.connect(filter);
        filter.connect(this.hddGain);
        this.hddGain.connect(this.masterGain);
        this.hddSource.start();

        // Simulate seeking/scratching randomly
        this.hddInterval = setInterval(() => {
            if (!this.hddGain) return;
            // Random bursts of sound
            const val = Math.random() > 0.85 ? (Math.random() * 0.03 + 0.01) : 0;
            this.hddGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.02);
            // Pitch variation
            this.hddSource.playbackRate.setTargetAtTime(0.8 + Math.random() * 0.4, this.ctx.currentTime, 0.05);
        }, 100);
    }

    stopHDDNoise() {
        if (this.hddSource) {
            try { this.hddSource.stop(); } catch(e) {}
            this.hddSource.disconnect();
            this.hddSource = null;
        }
        if (this.hddGain) {
            this.hddGain.disconnect();
            this.hddGain = null;
        }
        if (this.hddInterval) {
            clearInterval(this.hddInterval);
            this.hddInterval = null;
        }
    }

    playHeartbeat() {
        if (this.heartbeatInterval || this.ctx.state !== 'running') return;
        
        const playBeat = (vol, decay) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = 50; // Low thud
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + decay);
        };

        // Initial beat
        playBeat(0.8, 0.15);
        setTimeout(() => playBeat(0.6, 0.15), 150); // Second part of heartbeat (lub-dub)

        this.heartbeatInterval = setInterval(() => {
            if (this.ctx.state !== 'running') return;
            playBeat(0.8, 0.15);
            setTimeout(() => playBeat(0.6, 0.15), 150);
        }, 1000); // 60 BPM
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}