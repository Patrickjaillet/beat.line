export class MultiplayerManager {
    constructor(game, scoreManager) {
        this.game = game;
        this.scoreManager = scoreManager;
        this.socket = null;
        this.opponentScore = 0;
        this.opponentCombo = 0;
        this.ui = null;
        this.isSpectator = false;
    }

    connect() {
        // Mock WebSocket for demonstration
        this.socket = {
            send: (data) => {
                // Simulate receiving data back with a delay
                setTimeout(() => {
                    if (Math.random() > 0.1) return; // Simulate packet loss/irregular updates
                    const parsed = JSON.parse(data);
                    if (this.isSpectator) {
                        // In spectator mode, simulate two players
                        this.updateSpectatorUI(parsed.score * 1.1, parsed.score * 0.9);
                    } else {
                        // Mock opponent performing slightly worse
                        this.updateOpponent(parsed.score * 0.9, parsed.combo); 
                    }
                }, 100);
            },
            close: () => {}
        };
        this.createUI();
    }

    setSpectatorMode(enabled) {
        this.isSpectator = enabled;
    }

    createUI() {
        this.ui = document.createElement('div');
        Object.assign(this.ui.style, {
            position: 'absolute', top: '100px', right: '20px',
            color: '#ff5555', fontFamily: 'Orbitron, sans-serif',
            textAlign: 'right', pointerEvents: 'none'
        });
        
        if (this.isSpectator) {
            this.ui.innerHTML = `<div>SPECTATING</div><div style="color:#00f3ff">P1: <span id="p1-score">0</span></div><div style="color:#ff5555">P2: <span id="p2-score">0</span></div>`;
        } else {
            this.ui.innerHTML = `<div>OPPONENT</div><div id="mp-score">0</div><div id="mp-combo">COMBO: 0</div>`;
        }
        document.getElementById('ui-layer').appendChild(this.ui);
    }

    sendUpdate(score, combo) {
        if (this.isSpectator) {
            // Simulate receiving data by "sending" dummy data to our mock socket
            if (this.socket) this.socket.send(JSON.stringify({ score: this.game.conductor.songPosition * 1000, combo: 0 }));
            return;
        }
        if (this.socket) this.socket.send(JSON.stringify({ score, combo }));
    }

    updateOpponent(score, combo) {
        this.opponentScore = Math.floor(score);
        this.opponentCombo = combo;
        if (this.ui) {
            this.ui.querySelector('#mp-score').innerText = this.opponentScore.toString().padStart(6, '0');
            this.ui.querySelector('#mp-combo').innerText = `COMBO: ${this.opponentCombo}`;
        }
    }

    updateSpectatorUI(p1, p2) {
        if (this.ui && this.isSpectator) {
            this.ui.querySelector('#p1-score').innerText = Math.floor(p1).toString().padStart(6, '0');
            this.ui.querySelector('#p2-score').innerText = Math.floor(p2).toString().padStart(6, '0');
        }
    }

    dispose() {
        if (this.socket) this.socket.close();
        if (this.ui) this.ui.remove();
    }
}