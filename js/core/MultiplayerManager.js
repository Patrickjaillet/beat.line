const DEBUG = (typeof window !== 'undefined' && window.BEATLINE_DEBUG) || false;

export class MultiplayerManager {
    constructor(game, scoreManager) {
        this.game = game;
        this.scoreManager = scoreManager;
        this.conductor = null;
        this.socket = null;
        this.opponentScore = 0;
        this.opponentCombo = 0;
        this.ui = null;
        this.isSpectator = false;
    }

    connect() {
        const backendUrl = this.game.settings.multiplayerServerUrl;

        if (backendUrl) {
            try {
                this.socket = new WebSocket(backendUrl);
                this.socket.onopen = () => {
                    if (DEBUG) console.log('Connected to real multiplayer server:', backendUrl);
                };
                this.socket.onmessage = (evt) => {
                    const data = JSON.parse(evt.data);
                    this.updateOpponent(data.score || 0, data.combo || 0);
                };
                this.socket.onclose = () => {
                    console.warn('Multiplayer socket closed, switching to local mock');
                    this.socket = null;
                };
                this.socket.onerror = (err) => {
                    console.error('Multiplayer socket error', err);
                };
            } catch (e) {
                console.warn('Real multiplayer unavailable, using mock fallback', e);
                this.socket = null;
            }
        }

        if (!this.socket) {
            this.socket = {
                send: (data) => {
                    setTimeout(() => {
                        if (Math.random() > 0.1) return;
                        const parsed = JSON.parse(data);
                        if (this.isSpectator) {
                            this.updateSpectatorUI(parsed.score * 1.1, parsed.score * 0.9);
                        } else {
                            this.updateOpponent(parsed.score * 0.9, parsed.combo);
                        }
                    }, 100);
                },
                close: () => {}
            };
        }

        this.createUI();
    }

    setSpectatorMode(enabled) {
        this.isSpectator = enabled;
    }

    setConductor(conductor) {
        this.conductor = conductor;
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
            const songTime = this.conductor?.songPosition ?? (this.game?.conductor?.songPosition ?? 0);
            const spectatorScore = Math.max(score, Math.floor(songTime * 1000));
            if (this.socket) this.socket.send(JSON.stringify({ score: spectatorScore, combo: 0 }));
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