import { BaseScene } from './BaseScene.js';
import { SCENE_NAMES } from '../utils/constants.js';
import { songList } from '../utils/songList.js';
import { Conductor } from '../core/Conductor.js';

export class EditorScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.grid = null;
        this.gridContent = null;
        this.playhead = null;
        this.selectionBox = null;
        this.chartData = { notes: [] };
        this.rows = 200; 
        this.beatDivisions = 4; 
        this.audio = null;
        this.pixelsPerSecond = 80;
        this.conductor = new Conductor(this.game.audioManager);
        this.isPlaying = false;
        this.clipboard = null;
        this.lastPlayheadTime = 0;
        
        // Undo/Redo
        this.history = [];
        this.historyIndex = -1;
        
        // Selection
        this.selection = { active: false, startY: 0, endY: 0, notes: [] };
        this.clickTarget = null;

        // BPM Tapper
        this.bpmTaps = [];
        this.bpmTapperContainer = null;
        this.boundBpmTap = null;
    }

    async init() {
        this.createUI();
        await this.loadAudio();
        this.loadLocal();
        return Promise.resolve();
    }

    createUI() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            background: '#111', overflow: 'hidden', fontFamily: 'monospace', color: '#fff'
        });

        // Toolbar
        const toolbar = document.createElement('div');
        Object.assign(toolbar.style, {
            height: '50px', background: '#222', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px'
        });
        
        const saveBtn = this.createBtn('SAVE', () => this.saveLocal());
        const loadBtn = this.createBtn('LOAD', () => this.loadLocal());
        const playBtn = this.createBtn('PLAY AUDIO', () => this.toggleAudio());
        const copyBtn = this.createBtn('COPY ALL', () => this.copyChart());
        const pasteBtn = this.createBtn('PASTE', () => this.pasteChart());
        const undoBtn = this.createBtn('UNDO', () => this.undo());
        const redoBtn = this.createBtn('REDO', () => this.redo());
        const bpmBtn = this.createBtn('BPM TAPPER', () => this.toggleBpmTapper());
        
        // Snap Select
        const snapLabel = document.createElement('span');
        snapLabel.innerText = "SNAP:";
        snapLabel.style.marginLeft = "10px";
        
        const snapSelect = document.createElement('select');
        snapSelect.id = 'snap-select';
        snapSelect.name = 'snap-select';
        Object.assign(snapSelect.style, {
            background: '#333', color: '#fff', border: '1px solid #555', padding: '5px', cursor: 'pointer'
        });
        [4, 8, 16].forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.innerText = `1/${val}`;
            if (val === this.beatDivisions) opt.selected = true;
            snapSelect.appendChild(opt);
        });
        snapSelect.onchange = (e) => {
            this.beatDivisions = parseInt(e.target.value);
            this.renderGrid();
        };

        const testBtn = this.createBtn('TEST PLAY', () => this.testChart());
        const exitBtn = this.createBtn('EXIT', () => this.game.sceneManager.switchScene(SCENE_NAMES.MENU));
        
        toolbar.append(saveBtn, loadBtn, playBtn, copyBtn, pasteBtn, undoBtn, redoBtn, bpmBtn, snapLabel, snapSelect, testBtn, exitBtn);
        this.container.appendChild(toolbar);

        // Grid
        this.grid = document.createElement('div');
        Object.assign(this.grid.style, {
            position: 'absolute', top: '50px', bottom: '0', left: '50%', transform: 'translateX(-50%)',
            width: '400px', overflowY: 'scroll', background: '#000', border: '1px solid #333'
        });

        // Grid Content Container (for rows)
        this.gridContent = document.createElement('div');
        Object.assign(this.gridContent.style, { position: 'relative', width: '100%' });
        this.grid.appendChild(this.gridContent);
        
        // Selection Logic
        this.grid.addEventListener('mousedown', (e) => {
            this.startSelection(e);
        });
        
        // Playhead
        this.playhead = document.createElement('div');
        Object.assign(this.playhead.style, {
            position: 'absolute', left: '0', width: '100%', height: '2px',
            background: '#ff0000', zIndex: '10', pointerEvents: 'none', top: '0'
        });
        this.grid.appendChild(this.playhead);

        // Selection Box
        this.selectionBox = document.createElement('div');
        Object.assign(this.selectionBox.style, {
            position: 'absolute', left: '0', width: '100%', display: 'none',
            background: 'rgba(0, 255, 0, 0.2)', border: '1px dashed #00ff00', pointerEvents: 'none', zIndex: '5'
        });
        this.grid.appendChild(this.selectionBox);

        this.renderGrid();
        this.container.appendChild(this.grid);
        
        // Global mouse events for drag selection
        window.addEventListener('mousemove', (e) => this.updateSelection(e));
        window.addEventListener('mouseup', (e) => this.endSelection(e));
        document.getElementById('ui-layer').appendChild(this.container);
    }

    createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: '5px 10px', background: '#333', color: '#fff', border: '1px solid #555', cursor: 'pointer'
        });
        btn.onclick = onClick;
        return btn;
    }

    async loadAudio() {
        // Load the first song for editing context
        const song = this.game.selectedSong || songList[0];
        if (song) {
            await this.game.audioManager.loadSong(song.src);
            if (this.game.audioManager.audioBuffer) {
                song.duration = this.game.audioManager.audioBuffer.duration;
            }
            this.renderGrid(); // Refresh grid with waveform
        }
    }

    toggleAudio() {
        if (this.isPlaying) {
            this.conductor.stop();
            this.isPlaying = false;
        } else {
            // Calculate time from scroll position
            const startTime = this.grid.scrollTop / this.pixelsPerSecond;
            this.conductor.start(this.game.selectedSong ? this.game.selectedSong.bpm : 120, 0);
            this.conductor.setTime(startTime);
            this.isPlaying = true;
        }
    }

    playNoteSound() {
        const ctx = this.game.audioManager.ctx;
        if (ctx.state !== 'running') return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    toggleBpmTapper() {
        if (this.bpmTapperContainer) {
            this.bpmTapperContainer.remove();
            this.bpmTapperContainer = null;
            if (this.boundBpmTap) {
                window.removeEventListener('keydown', this.boundBpmTap);
                this.boundBpmTap = null;
            }
            return;
        }

        this.bpmTaps = [];
        this.bpmTapperContainer = document.createElement('div');
        Object.assign(this.bpmTapperContainer.style, {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '300px', background: '#111', border: '2px solid #00f3ff', padding: '20px',
            textAlign: 'center', zIndex: '200', color: '#fff', fontFamily: 'monospace',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
        });

        this.bpmTapperContainer.innerHTML = `
            <h2 style="color:#00f3ff; margin:0 0 10px 0;">BPM TAPPER</h2>
            <p style="color:#aaa; font-size:0.8em;">Press SPACE or Click to Tap</p>
            <div id="bpm-display" style="font-size: 4em; margin: 20px 0; font-weight:bold;">--</div>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="bpm-reset" class="interactive">RESET</button>
                <button id="bpm-apply" class="interactive">APPLY</button>
                <button id="bpm-close" class="interactive">CLOSE</button>
            </div>
        `;

        // Style buttons
        const btns = this.bpmTapperContainer.querySelectorAll('button');
        btns.forEach(btn => {
            Object.assign(btn.style, {
                padding: '8px 15px', background: '#333', color: '#fff', 
                border: '1px solid #555', cursor: 'pointer', fontFamily: 'inherit'
            });
            if (btn.id === 'bpm-apply') {
                btn.style.background = '#00f3ff';
                btn.style.color = '#000';
                btn.style.fontWeight = 'bold';
                btn.style.border = 'none';
            }
        });

        document.getElementById('ui-layer').appendChild(this.bpmTapperContainer);

        this.bpmTapperContainer.querySelector('#bpm-reset').onclick = () => {
            this.bpmTaps = [];
            this.bpmTapperContainer.querySelector('#bpm-display').innerText = '--';
        };

        this.bpmTapperContainer.querySelector('#bpm-apply').onclick = () => {
            const bpmText = this.bpmTapperContainer.querySelector('#bpm-display').innerText;
            if (bpmText !== '--') {
                const bpm = parseInt(bpmText);
                if (this.game.selectedSong) {
                    this.game.selectedSong.bpm = bpm;
                    this.renderGrid(); // Re-render grid with new BPM
                    alert(`BPM updated to ${bpm}`);
                }
            }
            this.toggleBpmTapper();
        };

        this.bpmTapperContainer.querySelector('#bpm-close').onclick = () => this.toggleBpmTapper();

        this.boundBpmTap = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleBpmTap();
            }
        };
        window.addEventListener('keydown', this.boundBpmTap);
        
        this.bpmTapperContainer.addEventListener('mousedown', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                this.handleBpmTap();
            }
        });
    }

    handleBpmTap() {
        const now = performance.now();
        if (this.bpmTaps.length > 0 && now - this.bpmTaps[this.bpmTaps.length - 1] > 2000) {
            this.bpmTaps = []; // Reset if pause > 2s
        }
        
        this.bpmTaps.push(now);
        
        const display = this.bpmTapperContainer.querySelector('#bpm-display');
        
        // Visual flash
        display.style.textShadow = '0 0 20px #fff';
        setTimeout(() => display.style.textShadow = 'none', 100);

        if (this.bpmTaps.length > 1) {
            let intervals = [];
            for (let i = 1; i < this.bpmTaps.length; i++) {
                intervals.push(this.bpmTaps[i] - this.bpmTaps[i-1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const bpm = Math.round(60000 / avgInterval);
            display.innerText = bpm;
        } else {
            display.innerText = '--';
        }
    }

    drawWaveform() {
        if (!this.game.audioManager.audioBuffer) return;
        
        const buffer = this.game.audioManager.audioBuffer;
        const duration = buffer.duration;
        const height = duration * this.pixelsPerSecond;
        const width = 400; // Grid width

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        Object.assign(canvas.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: `${height}px`,
            zIndex: '0', pointerEvents: 'none', opacity: '0.3'
        });

        const ctx = canvas.getContext('2d');
        const data = buffer.getChannelData(0); 
        const step = Math.ceil(data.length / height);
        const amp = width / 2;

        ctx.fillStyle = '#00f3ff';
        
        for (let i = 0; i < height; i++) {
            let min = 1.0;
            let max = -1.0;
            const start = Math.floor(i * step);
            const end = Math.min(start + step, data.length);
            
            for (let j = start; j < end; j++) {
                const datum = data[j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            if (min > max) continue;
            
            const x = width / 2 + min * amp;
            const w = Math.max(1, (max - min) * amp);
            ctx.fillRect(x, i, w, 1);
        }
        
        this.gridContent.appendChild(canvas);
    }

    saveState() {
        // Remove future history if we branch off
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(JSON.stringify(this.chartData));
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.chartData = JSON.parse(this.history[this.historyIndex]);
            this.renderGrid();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.chartData = JSON.parse(this.history[this.historyIndex]);
            this.renderGrid();
        }
    }

    startSelection(e) {
        e.preventDefault(); // Prevent native drag/select
        this.selection.active = true;
        this.selection.startY = e.clientY + this.grid.scrollTop - this.grid.getBoundingClientRect().top;
        this.selection.endY = this.selection.startY;
        this.clickTarget = e.target;
        
        // Reset visual selection box
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.top = `${this.selection.startY}px`;
        this.selectionBox.style.height = '0px';
    }

    updateSelection(e) {
        if (!this.selection.active) return;
        this.selection.endY = e.clientY + this.grid.scrollTop - this.grid.getBoundingClientRect().top;
        
        const minY = Math.min(this.selection.startY, this.selection.endY);
        const height = Math.abs(this.selection.endY - this.selection.startY);
        this.selectionBox.style.top = `${minY}px`;
        this.selectionBox.style.height = `${height}px`;
    }

    endSelection(e) {
        if (!this.selection.active) return;
        this.selection.active = false;
        
        // Check for drag threshold to distinguish click from drag
        if (Math.abs(this.selection.startY - this.selection.endY) < 5) {
            this.selectionBox.style.display = 'none';
            
            // Handle Click manually
            if (this.clickTarget && this.clickTarget.dataset.lane !== undefined) {
                const time = parseFloat(this.clickTarget.dataset.time);
                const lane = parseInt(this.clickTarget.dataset.lane);
                this.toggleNote(time, lane, this.clickTarget);
            }
            this.clickTarget = null;
            return; 
        }
        
        // Calculate selected notes
        const minY = Math.min(this.selection.startY, this.selection.endY);
        const maxY = Math.max(this.selection.startY, this.selection.endY);
        
        const startTime = minY / this.pixelsPerSecond;
        const endTime = maxY / this.pixelsPerSecond;
        
        this.selection.notes = this.chartData.notes.filter(n => n.time >= startTime && n.time <= endTime);
        
        this.selectionBox.style.display = 'none';
        this.renderGrid(); // Update grid to show selected notes (green)
    }

    renderGrid() {
        this.gridContent.innerHTML = '';

        const bpm = this.game.selectedSong ? this.game.selectedSong.bpm : 120;
        const beatDuration = 60 / bpm;
        const stepDuration = beatDuration * (4 / this.beatDivisions); // 1/4 note = 1 beat
        
        const rowHeight = 20;
        this.pixelsPerSecond = rowHeight / stepDuration;

        this.drawWaveform();

        const duration = this.game.selectedSong ? this.game.selectedSong.duration : 180;
        const totalSteps = Math.ceil(duration / stepDuration);
        
        for (let i = 0; i < totalSteps; i++) {
            const row = document.createElement('div');
            row.className = 'grid-row';
            Object.assign(row.style, {
                display: 'flex', height: '20px', borderBottom: i % 4 === 0 ? '1px solid #444' : '1px solid #222'
            });
            
            const time = i * stepDuration;
            
            const label = document.createElement('div');
            label.innerText = time.toFixed(2);
            Object.assign(label.style, { width: '50px', fontSize: '10px', color: '#555', paddingLeft: '5px' });
            row.appendChild(label);

            for (let lane = 0; lane < 4; lane++) {
                const cell = document.createElement('div');
                Object.assign(cell.style, {
                    flex: '1', borderLeft: '1px solid #333', cursor: 'pointer'
                });

                // Add data attributes for click handling
                cell.dataset.time = time;
                cell.dataset.lane = lane;
                
                const isSelected = this.selection.notes.some(n => Math.abs(n.time - time) < 0.01 && n.lane === lane);
                cell.style.background = this.hasNote(time, lane) ? (isSelected ? '#00ff00' : '#00f3ff') : 'transparent';
                
                row.appendChild(cell);
            }
            this.gridContent.appendChild(row);
        }
    }

    hasNote(time, lane) {
        return this.chartData.notes.some(n => Math.abs(n.time - time) < 0.01 && n.lane === lane);
    }

    toggleNote(time, lane, cell) {
        this.saveState(); // Save before modifying
        const index = this.chartData.notes.findIndex(n => Math.abs(n.time - time) < 0.01 && n.lane === lane);
        if (index >= 0) {
            this.chartData.notes.splice(index, 1);
            cell.style.background = 'transparent';
        } else {
            this.chartData.notes.push({ time, lane });
            this.playNoteSound();
            cell.style.background = '#00f3ff';
        }
    }

    saveLocal() {
        localStorage.setItem('customChart', JSON.stringify(this.chartData));
        alert('Saved to Local Storage');
    }

    loadLocal() {
        const data = localStorage.getItem('customChart');
        if (data) {
            this.chartData = JSON.parse(data);
            this.renderGrid();
        }
    }

    copyChart() {
        if (this.selection.notes.length > 0) {
            this.clipboard = JSON.parse(JSON.stringify(this.selection.notes));
            // Normalize times relative to first note
            const firstTime = this.clipboard[0].time;
            this.clipboard.forEach(n => n.time -= firstTime);
        } else {
            this.clipboard = JSON.parse(JSON.stringify(this.chartData.notes));
        }
        alert(`Copied ${this.clipboard.length} notes to clipboard.`);
    }

    pasteChart() {
        if (!this.clipboard) return;
        this.saveState();
        // Paste at current playhead position
        const offset = this.conductor.songPosition;
        const newNotes = this.clipboard.map(n => ({
            time: n.time + offset,
            lane: n.lane,
            duration: n.duration
        }));
        this.chartData.notes.push(...newNotes);
        this.renderGrid();
    }

    testChart() {
        // Use the first song as base for testing, or a default if none
        this.game.selectedSong = songList[0];
        
        // Ensure chart is sorted
        this.chartData.notes.sort((a, b) => a.time - b.time);
        
        // Pass custom chart to GameManager
        this.game.customChart = this.chartData;
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    update(delta) {
        if (this.isPlaying) {
            this.conductor.update();
            const time = this.conductor.songPosition;
            
            const y = time * this.pixelsPerSecond;
            this.playhead.style.top = `${y}px`;
            
            // Auto-scroll to keep playhead centered
            this.grid.scrollTop = y - (this.grid.clientHeight / 2);

            // Check for notes to play sound
            // Simple check: if a note exists between last frame time and current time
            this.chartData.notes.forEach(n => {
                if (n.time > this.lastPlayheadTime && n.time <= time) {
                    this.playNoteSound();
                }
            });
            this.lastPlayheadTime = time;
        }
    }

    dispose() {
        this.conductor.stop();
        if (this.container) this.container.remove();
        if (this.bpmTapperContainer) this.bpmTapperContainer.remove();
        if (this.boundBpmTap) window.removeEventListener('keydown', this.boundBpmTap);
        super.dispose();
    }
}