export class ReplayManager {
    constructor() {
        this.recording = [];
        this.playbackIndex = 0;
        this.isRecording = false;
        this.isPlaying = false;
    }

    startRecording() {
        this.recording = [];
        this.isRecording = true;
        this.isPlaying = false;
    }

    recordEvent(time, code, isDown) {
        if (!this.isRecording) return;
        this.recording.push({ time, code, isDown });
    }

    startPlayback(data) {
        this.recording = data;
        this.playbackIndex = 0;
        this.isPlaying = true;
        this.isRecording = false;
    }

    update(songTime, inputHandler) {
        if (!this.isPlaying) return;

        while (this.playbackIndex < this.recording.length && this.recording[this.playbackIndex].time <= songTime) {
            const event = this.recording[this.playbackIndex];
            // Replay should bypass DOM event repeat filtering and call input workflow directly
            if (inputHandler && typeof inputHandler.handleInput === 'function') {
                inputHandler.handleInput(event.code, event.isDown);
            } else if (event.isDown) {
                inputHandler.onKeyDown({ code: event.code, repeat: false });
            } else {
                inputHandler.onKeyUp({ code: event.code });
            }
            this.playbackIndex++;
        }
    }
}