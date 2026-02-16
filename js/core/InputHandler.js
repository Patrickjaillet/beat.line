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
        const lane = this.getLane(code);
        if (lane !== null) {
            if (this.editorCallback) { this.editorCallback(code, isDown); return; }

            if (isDown) {
                this.noteFactory.triggerLane(lane);
                this.noteFactory.checkHit(lane, this.conductor.songPosition);
            } else {
                this.noteFactory.checkRelease(lane, this.conductor.songPosition);
            }
        }
    }

    dispose() {
        window.removeEventListener(EVENTS.KEY_DOWN, this.boundKeyDown);
        window.removeEventListener(EVENTS.KEY_UP, this.boundKeyUp);
    }
}