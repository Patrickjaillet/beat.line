import { BaseScene } from './BaseScene.js';
import { SCENE_NAMES } from '../utils/constants.js';
import { songList } from '../utils/songList.js';
import * as THREE from 'three';

export class WorkshopScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.listContainer = null;
        // Mock Data for Workshop
        this.mockCharts = [
            { id: 'w1', title: 'Neon Nights', artist: 'CyberPunk', bpm: 140, difficulty: 'Hard', author: 'User123', rating: 4.8 },
            { id: 'w2', title: 'Glitch Storm', artist: 'The Glitch', bpm: 175, difficulty: 'Expert', author: 'SpeedDemon', rating: 4.9 },
            { id: 'w3', title: 'Chill Waves', artist: 'LoFi Girl', bpm: 90, difficulty: 'Easy', author: 'Relaxo', rating: 4.5 },
            { id: 'w4', title: 'Retro Run', artist: 'SynthWave', bpm: 128, difficulty: 'Normal', author: 'RetroFan', rating: 4.2 },
            { id: 'w5', title: 'Bass Drop', artist: 'DubStep King', bpm: 150, difficulty: 'Hard', author: 'BassHead', rating: 4.7 }
        ];
    }

    init() {
        this.scene.background = new THREE.Color(0x050510);
        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '50px',
            color: '#fff', fontFamily: 'var(--font-family)'
        });

        const L = this.game.localization;

        // Header
        const header = document.createElement('h1');
        header.innerText = L.get('WORKSHOP');
        header.style.color = 'var(--primary-color)';
        header.style.textShadow = 'var(--text-shadow)';
        header.style.fontSize = '3em';
        this.container.appendChild(header);

        // Search Bar
        const searchInput = document.createElement('input');
        searchInput.placeholder = L.get('SEARCH') + '...';
        searchInput.className = 'interactive';
        Object.assign(searchInput.style, {
            padding: '10px', width: '400px', background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--primary-color)', color: '#fff', fontFamily: 'inherit',
            marginBottom: '20px', fontSize: '1.2em'
        });
        searchInput.oninput = (e) => this.renderList(e.target.value);
        this.container.appendChild(searchInput);

        // List Container
        this.listContainer = document.createElement('div');
        Object.assign(this.listContainer.style, {
            width: '80%', maxWidth: '800px', height: '60%', overflowY: 'auto',
            border: '1px solid #333', background: 'rgba(0,0,0,0.8)', padding: '10px'
        });
        this.container.appendChild(this.listContainer);

        // Back Button
        const backBtn = document.createElement('button');
        backBtn.innerText = L.get('BACK');
        backBtn.className = 'interactive';
        Object.assign(backBtn.style, {
            marginTop: '20px', padding: '10px 30px', background: 'transparent',
            border: '1px solid var(--secondary-color)', color: 'var(--secondary-color)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.2em'
        });
        backBtn.onclick = () => this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        this.container.appendChild(backBtn);

        document.getElementById('ui-layer').appendChild(this.container);
        this.renderList();
    }

    renderList(filter = '') {
        this.listContainer.innerHTML = '';
        const L = this.game.localization;
        
        const filtered = this.mockCharts.filter(c => 
            c.title.toLowerCase().includes(filter.toLowerCase()) || 
            c.artist.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(chart => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '15px', borderBottom: '1px solid #333', transition: 'background 0.2s'
            });
            row.onmouseover = () => row.style.background = 'rgba(255,255,255,0.05)';
            row.onmouseout = () => row.style.background = 'transparent';

            const info = document.createElement('div');
            info.innerHTML = `
                <div style="font-size: 1.2em; color: var(--primary-color);">${chart.title}</div>
                <div style="font-size: 0.9em; color: #aaa;">${chart.artist} // ${chart.bpm} BPM // ${chart.difficulty}</div>
                <div style="font-size: 0.8em; color: #888;">${L.get('AUTHOR')}: ${chart.author} | ${L.get('RATING')}: ${chart.rating}/5</div>
            `;

            const downloadBtn = document.createElement('button');
            downloadBtn.innerText = L.get('DOWNLOAD');
            downloadBtn.className = 'interactive';
            Object.assign(downloadBtn.style, {
                padding: '8px 15px', background: 'transparent',
                border: '1px solid #00ff00', color: '#00ff00',
                cursor: 'pointer', fontFamily: 'inherit'
            });
            
            downloadBtn.onclick = () => {
                this.downloadChart(chart);
                downloadBtn.innerText = 'INSTALLED';
                downloadBtn.disabled = true;
                downloadBtn.style.borderColor = '#555';
                downloadBtn.style.color = '#555';
            };

            // Check if already installed (mock check by title)
            if (songList.some(s => s.title === chart.title)) {
                downloadBtn.innerText = 'INSTALLED';
                downloadBtn.disabled = true;
                downloadBtn.style.borderColor = '#555';
                downloadBtn.style.color = '#555';
            }

            row.appendChild(info);
            row.appendChild(downloadBtn);
            this.listContainer.appendChild(row);
        });
    }

    downloadChart(chartData) {
        // Mock download: Create a song entry
        const newSong = {
            id: 'workshop_' + chartData.id,
            title: chartData.title,
            artist: chartData.artist,
            bpm: chartData.bpm,
            difficulty: chartData.difficulty,
            src: 'assets/songs/demo.mp3', // Placeholder audio
            previewStart: 0,
            duration: 120,
            chart: { notes: [] }
        };
        
        // Generate dummy chart
        for(let i=0; i<50; i++) {
            newSong.chart.notes.push({
                time: 2.0 + i * (60/chartData.bpm),
                lane: Math.floor(Math.random()*4),
                duration: 0
            });
        }

        songList.push(newSong);
        alert(`Downloaded ${chartData.title}!`);
    }

    dispose() {
        if (this.container) this.container.remove();
        super.dispose();
    }
}