export class Conductor {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.bpm = 120;
        this.crotchet = 60 / this.bpm; // Duration of a beat in seconds
        this.songPosition = 0;
        this.dspSongTime = 0;
        this.offset = 0; // Latency offset
        this.isPlaying = false;
        this.playbackRate = 1.0;
    }

    start(bpm, offset = 0) {
        this.bpm = bpm;
        this.crotchet = 60 / bpm;
        this.offset = offset;
        this.dspSongTime = this.audioManager.ctx.currentTime;
        this.playbackRate = 1.0;
        this.isPlaying = true;
        this.audioManager.playSong(offset);
    }

    setTime(time) {
        this.audioManager.stopSong();
        this.audioManager.playSong(time);
        this.dspSongTime = this.audioManager.ctx.currentTime - time - this.offset;
        this.songPosition = time;
    }

    setPlaybackRate(rate) {
        if (Math.abs(rate - this.playbackRate) < 0.01) return;

        // Recalculate anchor time to maintain continuous song position across rate changes
        const currentTime = this.audioManager.ctx.currentTime;
        const currentSongPos = (currentTime - this.dspSongTime) * this.playbackRate;
        
        this.playbackRate = rate;
        this.audioManager.setPlaybackRate(rate);
        
        this.dspSongTime = currentTime - (currentSongPos / rate);
    }

    pause() {
        this.isPlaying = false;
        this.audioManager.ctx.suspend();
    }

    resume() {
        this.isPlaying = true;
        this.audioManager.ctx.resume();
    }

    update() {
        if (!this.isPlaying) return;
        this.songPosition = (this.audioManager.ctx.currentTime - this.dspSongTime) * this.playbackRate - this.offset;
    }

    getBeat() {
        return this.songPosition / this.crotchet;
    }
}