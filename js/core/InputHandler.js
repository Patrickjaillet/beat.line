import { EVENTS } from '../utils/constants.js';

export class InputHandler {
    constructor(noteFactory, conductor, game, replayManager = null) {
        this.noteFactory = noteFactory;
        this.conductor = conductor;
        this.game = game;
        this.replayManager = replayManager;
        this.boundKeyDown = this.onKeyDown.bind(this);
        this.boundKeyUp = this.onKeyUp.bind(this);
        this.editorCallback = null;
        
        window.addEventListener(EVENTS.KEY_DOWN, this.boundKeyDown);
        window.addEventListener(EVENTS.KEY_UP, this.boundKeyUp);
    }

    setEditorCallback(cb) {
        this.editorCallback = cb;
    }

    getLane(code) {
        const bindings = this.game.settings.keyBindings;
        for (const lane in bindings) {
            if (bindings[lane] === code) return parseInt(lane);
        }
        return null;
    }

    onKeyDown(e) {
        if (e.repeat) return;
        this.handleInput(e.code, true);
    }

    onKeyUp(e) {
        this.handleInput(e.code, false);
    }

    handleInput(code, isDown) {
        if (this.replayManager && this.replayManager.isRecording) this.replayManager.recordEvent(this.conductor.songPosition, code, isDown);
        if (this.editorCallback) { this.editorCallback(code, isDown); }
        const lane = this.getLane(code);
        if (lane !== null) {
            let targetLane = lane;
            if (this.noteFactory.swapFactor > 0.5) {
                if (targetLane === 1) targetLane = 2;
                else if (targetLane === 2) targetLane = 1;
            }
            
            if (isDown) {
                this.noteFactory.triggerLane(targetLane);
                const hit = this.noteFactory.checkHit(targetLane, this.conductor.songPosition);
                if (hit) console.log(`HIT Lane ${targetLane}!`);
            } else {
                this.noteFactory.checkRelease(targetLane, this.conductor.songPosition);
            }
        }
    }

    dispose() {
        window.removeEventListener(EVENTS.KEY_DOWN, this.boundKeyDown);
        window.removeEventListener(EVENTS.KEY_UP, this.boundKeyUp);
    }
}