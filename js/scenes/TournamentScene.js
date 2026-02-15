import { BaseScene } from './BaseScene.js';
import { SCENE_NAMES } from '../utils/constants.js';
import { songList } from '../utils/songList.js';
import * as THREE from 'three';

export class TournamentScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x050505);
        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            fontFamily: 'Orbitron, sans-serif', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
        });

        const title = document.createElement('h1');
        title.innerText = `TOURNAMENT - ROUND ${this.game.tournamentManager.currentRound + 1}`;
        Object.assign(title.style, { color: '#00f3ff', textShadow: '0 0 10px #00f3ff' });
        this.container.appendChild(title);

        const bracketDiv = document.createElement('div');
        Object.assign(bracketDiv.style, {
            display: 'flex', gap: '20px', marginTop: '20px'
        });

        this.game.tournamentManager.bracket.forEach(match => {
            const matchDiv = document.createElement('div');
            Object.assign(matchDiv.style, {
                border: '1px solid #555', padding: '20px', background: 'rgba(0,0,0,0.8)', width: '200px'
            });
            
            const p1Style = match.winner === match.p1 ? 'color:#00ff00' : (match.winner ? 'color:#555' : 'color:#fff');
            const p2Style = match.winner === match.p2 ? 'color:#00ff00' : (match.winner ? 'color:#555' : 'color:#fff');

            matchDiv.innerHTML = `
                <div style="${p1Style}">${match.p1} <span style="float:right">${match.score1 || '-'}</span></div>
                <div style="border-top:1px solid #333; margin:5px 0"></div>
                <div style="${p2Style}">${match.p2} <span style="float:right">${match.score2 || '-'}</span></div>
            `;
            bracketDiv.appendChild(matchDiv);
        });
        this.container.appendChild(bracketDiv);

        const playerMatch = this.game.tournamentManager.bracket.find(m => m.p1 === 'Player' || m.p2 === 'Player');
        
        if (playerMatch && !playerMatch.winner) {
            const btn = document.createElement('button');
            btn.innerText = 'START MATCH';
            btn.className = 'interactive';
            Object.assign(btn.style, {
                marginTop: '40px', padding: '15px 40px', background: '#00f3ff', color: '#000',
                border: 'none', cursor: 'pointer', fontSize: '1.5em', fontWeight: 'bold'
            });
            btn.onclick = () => {
                this.game.selectedSong = songList[this.game.tournamentManager.currentRound % songList.length];
                this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
            };
            this.container.appendChild(btn);
        }

        document.getElementById('ui-layer').appendChild(this.container);
    }

    dispose() { if (this.container) this.container.remove(); super.dispose(); }
}