import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { songList } from '../utils/songList.js';
import { SCENE_NAMES } from '../utils/constants.js';
import { c64TronVertex } from '../shaders/c64TronVertex.js';
import { c64TronFragment } from '../shaders/c64TronFragment.js';
import { AvatarManager } from '../core/AvatarManager.js';

export class MenuScene extends BaseScene {
    constructor(game) {
        super(game);
        this.menuContainer = null;
        this.songListContainer = null;
        this.leaderboardContainer = null;
        this.c64Mesh = null;
        this.ticker = null;
        this.avatarManager = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.activeTab = 'PLAY';
        
        // Snake Game State
        this.snakeData = null;
        this.snakeTexture = null;
        this.snake = [];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.moveInterval = 0.1;
        this.gridW = 32;
        this.gridH = 20;
        this.boundSnakeInput = null;
    }

    init() {
        this.scene.background = new THREE.Color(0x050505);
        
        // Initialize Snake Game
        this.initSnakeGame();

        // C64 Retro Screen Background
        // Fullscreen plane
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader: c64TronVertex,
            fragmentShader: c64TronFragment,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uGameTexture: { value: this.snakeTexture }
            }
        });
        
        this.c64Mesh = new THREE.Mesh(geometry, material);
        // We need an orthographic camera or just add it to a scene with identity transform
        // Since BaseScene uses Perspective, let's just put it far back and scale it or use a separate ortho camera.
        // Easier: Attach to camera like UI elements or just scale it up to fill frustum.
        // Let's use the existing camera but position the mesh to fill the view.
        // At z=0 with perspective camera, we need to be careful.
        // Let's just create a temporary Orthographic camera for the background if we wanted perfect pixel match,
        // but scaling a plane at a distance works too.
        // Distance 10, FOV 75. Height = 2 * tan(75/2) * 10 ~= 15.3. Width = 15.3 * aspect.
        
        const dist = 10;
        const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
        const height = 2 * Math.tan(vFOV / 2) * dist;
        const width = height * this.camera.aspect;
        
        this.c64Mesh.geometry = new THREE.PlaneGeometry(width, height);
        this.c64Mesh.position.z = -dist;
        this.camera.add(this.c64Mesh); // Attach to camera so it stays static
        this.scene.add(this.camera); // Ensure camera is in scene

        // Avatar
        this.avatarManager = new AvatarManager(this.scene);
        this.avatarManager.group.position.set(3, -1, 5); // Position to the right
        this.avatarManager.group.rotation.y = -0.5;
        // Sync avatar color with theme
        this.updateAvatarColor();

        this.createUI();
        this.createNewsTicker();
        this.setupDragDrop();
        this.game.audioManager.playHDDNoise();
        
        this.boundSnakeInput = this.handleSnakeInput.bind(this);
        window.addEventListener('keydown', this.boundSnakeInput);
        
        window.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Check Daily Reward
        const reward = this.game.profileManager.checkDailyReward();
        if (reward > 0) {
            this.showDailyRewardModal(reward);
        }
        return Promise.resolve();
    }

    updateAvatarColor() {
        // Get primary color from CSS var
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (this.avatarManager) this.avatarManager.setColor(new THREE.Color(color).getHex());
    }

    initSnakeGame() {
        const size = this.gridW * this.gridH;
        this.snakeData = new Uint8Array(size);
        this.snakeTexture = new THREE.DataTexture(this.snakeData, this.gridW, this.gridH, THREE.RedFormat, THREE.UnsignedByteType);
        this.snakeTexture.magFilter = THREE.NearestFilter;
        this.snakeTexture.minFilter = THREE.NearestFilter;
        
        this.resetSnake();
    }

    resetSnake() {
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.spawnFood();
        this.updateSnakeTexture();
    }

    spawnFood() {
        let valid = false;
        while (!valid) {
            this.food = {
                x: Math.floor(Math.random() * this.gridW),
                y: Math.floor(Math.random() * this.gridH)
            };
            valid = !this.snake.some(s => s.x === this.food.x && s.y === this.food.y);
        }
    }

    handleSnakeInput(e) {
        switch(e.code) {
            case 'ArrowUp': if (this.direction.y === 0) this.nextDirection = { x: 0, y: 1 }; break;
            case 'ArrowDown': if (this.direction.y === 0) this.nextDirection = { x: 0, y: -1 }; break;
            case 'ArrowLeft': if (this.direction.x === 0) this.nextDirection = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (this.direction.x === 0) this.nextDirection = { x: 1, y: 0 }; break;
        }
    }

    updateSnake(time) {
        if (time - this.lastMoveTime > this.moveInterval) {
            this.lastMoveTime = time;
            this.direction = this.nextDirection;
            
            const head = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };
            
            // Wrap around
            if (head.x < 0) head.x = this.gridW - 1;
            if (head.x >= this.gridW) head.x = 0;
            if (head.y < 0) head.y = this.gridH - 1;
            if (head.y >= this.gridH) head.y = 0;
            
            // Collision with self
            if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
                this.resetSnake();
                return;
            }
            
            this.snake.unshift(head);
            
            if (head.x === this.food.x && head.y === this.food.y) {
                this.spawnFood();
                // Speed up slightly
                this.moveInterval = Math.max(0.05, this.moveInterval * 0.98);
            } else {
                this.snake.pop();
            }
            
            this.updateSnakeTexture();
        }
    }

    updateSnakeTexture() {
        this.snakeData.fill(0);
        
        // Draw Snake (Value 128 = 0.5 approx)
        this.snake.forEach(s => {
            const idx = s.y * this.gridW + s.x;
            this.snakeData[idx] = 128; 
        });
        
        // Draw Food (Value 255 = 1.0)
        const fIdx = this.food.y * this.gridW + this.food.x;
        this.snakeData[fIdx] = 255;
        
        this.snakeTexture.needsUpdate = true;
    }

    createUI() {
        this.menuContainer = document.createElement('div');
        Object.assign(this.menuContainer.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', width: this.game.isMobile ? '95%' : '800px',
            display: 'flex', flexDirection: 'column', gap: '15px',
            maxHeight: '80vh', overflowY: 'auto'
        });

        const L = this.game.localization;
        const primaryColor = 'var(--primary-color)';

        // Profile Display
        const profileDisplay = document.createElement('div');
        Object.assign(profileDisplay.style, { 
            position: 'absolute', top: '20px', left: '20px', 
            color: 'var(--primary-color)', fontFamily: 'var(--font-family)',
            display: 'flex', flexDirection: 'column', gap: '5px'
        });
        
        this.profileDisplay = profileDisplay;
        this.updateProfileUI();
        document.getElementById('ui-layer').appendChild(profileDisplay);

        // --- TABS HEADER ---
        const tabsHeader = document.createElement('div');
        Object.assign(tabsHeader.style, {
            display: 'flex', justifyContent: 'space-between', marginBottom: '20px',
            borderBottom: `2px solid ${primaryColor}`
        });

        const tabs = [
            { id: 'PLAY', label: L.get('TAB_PLAY') }
        ];

        if (!this.game.isMobile) {
            tabs.push({ id: 'TOOLS', label: L.get('TAB_TOOLS') });
            tabs.push({ id: 'COMMUNITY', label: L.get('TAB_COMMUNITY') });
        }

        tabs.push({ id: 'SYSTEM', label: L.get('TAB_SYSTEM') });

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.innerText = tab.label;
            btn.className = 'interactive';
            Object.assign(btn.style, {
                flex: '1', padding: '15px', background: 'transparent',
                border: 'none', color: this.activeTab === tab.id ? primaryColor : '#fff',
                cursor: 'pointer', fontFamily: 'var(--font-family)', fontSize: '1.2em',
                fontWeight: 'bold', borderBottom: this.activeTab === tab.id ? `4px solid ${primaryColor}` : 'none',
                transition: 'all 0.2s'
            });
            
            btn.onclick = () => {
                this.activeTab = tab.id;
                this.refreshMenuContent();
            };
            tabsHeader.appendChild(btn);
        });
        this.menuContainer.appendChild(tabsHeader);

        // --- CONTENT CONTAINER ---
        this.contentContainer = document.createElement('div');
        Object.assign(this.contentContainer.style, {
            display: 'flex', flexDirection: 'column', gap: '10px'
        });
        this.menuContainer.appendChild(this.contentContainer);

        document.getElementById('ui-layer').appendChild(this.menuContainer);

        // Leaderboard Container
        this.leaderboardContainer = document.createElement('div');
        Object.assign(this.leaderboardContainer.style, {
            position: 'absolute', top: '50%', right: '50px', transform: 'translateY(-50%)',
            width: '300px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--primary-color)', padding: '20px',
            fontFamily: 'var(--font-family)', color: '#fff', display: 'none'
        });
        document.getElementById('ui-layer').appendChild(this.leaderboardContainer);

        this.refreshMenuContent();
    }

    updateProfileUI() {
        if (!this.profileDisplay) return;
        const data = this.game.profileManager.data;
        const L = this.game.localization;
        
        const xpForNext = data.level * 1000;
        const xpPct = (data.xp / xpForNext) * 100;
        
        const badgesHtml = data.badges ? data.badges.map(b => `<span title="${b.id}" style="margin-left:5px; cursor:help;">${b.icon}</span>`).join('') : '';

        this.profileDisplay.innerHTML = `
            <div style="font-size: 1.5em; text-shadow: var(--text-shadow); display: flex; align-items: center;">
                <span>${data.username}</span>
                <span style="font-size: 0.8em;">${badgesHtml}</span>
            </div>
            <div style="font-size: 1em; color: #fff; display: flex; align-items: center; gap: 10px;">
                <span>${L.get('LEVEL')} ${data.level}</span>
                <span style="color: #ffd700;">${data.credits} CR</span>
            </div>
            <div style="width: 250px; height: 6px; background: #333; border: 1px solid #555; position: relative; margin-top: 2px;">
                <div style="width: ${xpPct}%; height: 100%; background: var(--primary-color); box-shadow: 0 0 5px var(--primary-color); transition: width 0.5s;"></div>
            </div>
        `;
    }

    refreshMenuContent() {
        this.contentContainer.innerHTML = '';
        const L = this.game.localization;

        switch(this.activeTab) {
            case 'PLAY':
                this.renderPlayTab(L);
                break;
            case 'TOOLS':
                this.renderToolsTab(L);
                break;
            case 'COMMUNITY':
                this.renderCommunityTab(L);
                break;
            case 'SYSTEM':
                this.renderSystemTab(L);
                break;
        }
    }

    renderPlayTab(L) {
        // Campaign Button
        const campBtn = this.createMenuButton(L.get('CAMPAIGN'), () => this.game.sceneManager.switchScene(SCENE_NAMES.CAMPAIGN), '#00ff00');
        this.contentContainer.appendChild(campBtn);

        // Daily Challenge Button
        const dailyBtn = this.createMenuButton(L.get('DAILY_CHALLENGE'), () => this.startDailyChallenge(), '#ffaa00');
        this.contentContainer.appendChild(dailyBtn);

        // Daily Quests Button
        const questBtn = this.createMenuButton(L.get('DAILY_QUESTS'), () => this.showQuestsUI(), '#ffaa00', true);
        this.contentContainer.appendChild(questBtn);

        // Multiplayer Button
        const mpBtn = this.createMenuButton(L.get('MULTIPLAYER'), () => this.startMultiplayer(), '#ff5555');
        this.contentContainer.appendChild(mpBtn);

        // Tournament Button
        const tourBtn = this.createMenuButton(L.get('TOURNAMENT'), () => this.game.startTournament(), '#ff00ff');
        this.contentContainer.appendChild(tourBtn);

        // Practice Button
        const pracBtn = this.createMenuButton(L.get('PRACTICE'), () => this.startPractice(), '#ffff00');
        this.contentContainer.appendChild(pracBtn);

        // Tutorial Button
        const tutBtn = this.createMenuButton(L.get('TUTORIAL'), () => this.game.sceneManager.switchScene(SCENE_NAMES.TUTORIAL), 'var(--primary-color)');
        this.contentContainer.appendChild(tutBtn);

        // --- SONG SELECTION (Always visible in Play tab) ---
        const divider = document.createElement('div');
        Object.assign(divider.style, { height: '2px', background: '#333', margin: '10px 0' });
        this.contentContainer.appendChild(divider);

        // Difficulty Selector
        const diffContainer = document.createElement('div');
        diffContainer.style.display = 'flex';
        diffContainer.style.gap = '10px';
        diffContainer.style.justifyContent = 'center';
        
        ['Easy', 'Normal', 'Hard'].forEach(diff => {
            const btn = document.createElement('button');
            btn.innerText = diff;
            btn.className = 'interactive';
            Object.assign(btn.style, {
                flex: '1', padding: '10px', background: 'rgba(0,0,0,0.5)',
                border: '1px solid #333', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-family)'
            });
            btn.onclick = () => {
                this.setDifficulty(diff);
                Array.from(diffContainer.children).forEach(c => c.style.borderColor = '#333');
                btn.style.borderColor = 'var(--primary-color)';
            };
            if (diff === this.game.settings.difficulty) btn.style.borderColor = 'var(--primary-color)';
            diffContainer.appendChild(btn);
        });
        this.contentContainer.appendChild(diffContainer);

        // Modifiers Button
        const modsBtn = document.createElement('button');
        modsBtn.innerText = L.get('GAME_MODIFIERS');
        modsBtn.className = 'interactive';
        Object.assign(modsBtn.style, {
            padding: '10px', background: 'rgba(0,0,0,0.5)',
            border: '1px solid #333', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-family)',
            marginTop: '5px'
        });
        modsBtn.onclick = () => this.createModifiersUI();
        this.contentContainer.appendChild(modsBtn);

        this.songListContainer = document.createElement('div');
        this.contentContainer.appendChild(this.songListContainer);
        this.renderSongList();
    }

    renderToolsTab(L) {
        // Editor Button
        const editorBtn = this.createMenuButton(L.get('EDITOR'), () => this.openEditorSongSelect(), '#888', true);
        this.contentContainer.appendChild(editorBtn);

        // Rhythm Editor Button
        const rhythmBtn = this.createMenuButton(L.get('RHYTHM_EDITOR'), () => this.startRhythmEditor(), 'var(--primary-color)', true);
        this.contentContainer.appendChild(rhythmBtn);

        // Replay Editor Button
        const replayEditBtn = this.createMenuButton(L.get('REPLAY_EDITOR'), () => this.game.sceneManager.switchScene('REPLAY_EDITOR'), '#ff00ff', true);
        this.contentContainer.appendChild(replayEditBtn);

        // Visualizer Button
        const vizBtn = this.createMenuButton(L.get('VISUALIZER'), () => this.startVisualizer(), '#aa00ff');
        this.contentContainer.appendChild(vizBtn);

        // Jukebox Button
        const jukeBtn = this.createMenuButton(L.get('JUKEBOX'), () => this.game.sceneManager.switchScene(SCENE_NAMES.JUKEBOX), 'var(--primary-color)');
        this.contentContainer.appendChild(jukeBtn);

        // Custom Shader Button
        const shaderBtn = this.createMenuButton('LOAD SHADER', () => this.triggerShaderUpload(), '#aa00aa');
        this.contentContainer.appendChild(shaderBtn);

        // Drop Zone Hint
        const dropHint = document.createElement('div');
        dropHint.innerText = 'DROP MP3 TO AUTO-GENERATE | DROP GLSL FOR BG';
        Object.assign(dropHint.style, {
            marginTop: '20px', color: '#555', fontSize: '0.8em', border: '1px dashed #333', padding: '10px', textAlign: 'center'
        });
        this.contentContainer.appendChild(dropHint);
    }

    openEditorSongSelect() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', zIndex: '300', display: 'flex',
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        });

        const container = document.createElement('div');
        Object.assign(container.style, {
            width: '600px', maxHeight: '80%', background: '#111', border: '2px solid #888',
            padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'
        });

        const title = document.createElement('h2');
        title.innerText = "SELECT SONG TO EDIT";
        title.style.color = "#888";
        title.style.textAlign = "center";
        container.appendChild(title);

        songList.forEach(song => {
            const btn = this.createMenuButton(`${song.title} - ${song.artist}`, () => {
                this.game.selectedSong = song;
                this.game.isEditor = true;
                this.game.sceneManager.switchScene(SCENE_NAMES.EDITOR);
                overlay.remove();
            }, '#fff', true);
            container.appendChild(btn);
        });

        const closeBtn = this.createBtn(this.game.localization.get('CLOSE'), () => overlay.remove());
        container.appendChild(closeBtn);

        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    renderCommunityTab(L) {
        // Workshop Button
        const workshopBtn = this.createMenuButton(L.get('WORKSHOP'), () => this.game.sceneManager.switchScene('WORKSHOP'), '#00ffaa');
        this.contentContainer.appendChild(workshopBtn);

        // DLC Button
        const dlcBtn = this.createMenuButton(L.get('DLC_PACKS'), () => this.showDLCUI(), '#ff00ff');
        this.contentContainer.appendChild(dlcBtn);

        // Social Button
        const socialBtn = this.createMenuButton(L.get('SOCIAL'), () => this.showSocialUI(), '#0088ff');
        this.contentContainer.appendChild(socialBtn);

        // Spectator Button
        const specBtn = this.createMenuButton(L.get('SPECTATE'), () => this.startSpectator(), '#aaa');
        this.contentContainer.appendChild(specBtn);
    }

    renderSystemTab(L) {
        // Settings Button
        const settingsBtn = this.createMenuButton(L.get('SETTINGS'), () => this.game.sceneManager.switchScene(SCENE_NAMES.SETTINGS), '#fff');
        this.contentContainer.appendChild(settingsBtn);

        // VR Button
        const vrBtn = this.createMenuButton(L.get('ENTER_VR'), () => this.game.enterVR(), '#00ff00');
        this.contentContainer.appendChild(vrBtn);

        // Cloud Save Button
        const cloudBtn = this.createMenuButton(L.get('CLOUD_SYNC'), () => this.game.cloudSave(), 'var(--primary-color)');
        this.contentContainer.appendChild(cloudBtn);

        // Credits Button
        const credBtn = this.createMenuButton(L.get('CREDITS'), () => this.game.sceneManager.switchScene(SCENE_NAMES.CREDITS), '#fff');
        this.contentContainer.appendChild(credBtn);

        // Ghost Mode Button
        if (this.game.replayData) {
            const ghostBtn = this.createMenuButton('GHOST MODE', () => this.startGhostMode(), '#888888');
            this.contentContainer.appendChild(ghostBtn);
        }
    }

    createMenuButton(text, onClick, color, dashed = false) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'interactive';
        Object.assign(btn.style, {
            padding: '15px', background: 'rgba(0, 0, 0, 0.7)',
            border: dashed ? `1px dashed ${color}` : `1px solid ${color}`,
            borderLeft: dashed ? `1px dashed ${color}` : `4px solid ${color}`,
            color: color, cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'var(--font-family)', fontSize: '1.1em', width: '100%',
            textAlign: 'left', paddingLeft: '20px'
        });
        
        btn.onmouseover = () => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
            btn.style.paddingLeft = '30px'; // Slide effect
        };
        btn.onmouseout = () => {
            btn.style.background = 'rgba(0, 0, 0, 0.7)';
            btn.style.paddingLeft = '20px';
        };
        btn.onclick = onClick;
        return btn;
    }

    renderSongList() {
        this.songListContainer.innerHTML = '';
        songList.forEach(song => {
            const item = document.createElement('div');
            item.className = 'interactive';
            item.innerHTML = `
                <div style="font-size: 1.2em; font-weight: bold;">${song.title}</div>
                <div style="font-size: 0.8em; opacity: 0.8;">${song.artist} // BPM: ${song.bpm}</div>
            `;
            
            Object.assign(item.style, {
                padding: '15px', background: 'rgba(0, 0, 0, 0.7)',
                borderLeft: '4px solid #333', color: '#fff',
                cursor: 'pointer', transition: 'all 0.2s', marginBottom: '5px',
                fontFamily: 'var(--font-family)'
            });
            
            item.onmouseover = () => {
                item.style.background = 'rgba(255, 255, 255, 0.1)';
                item.style.borderLeft = '4px solid var(--primary-color)';
            };
            item.onmouseout = () => {
                item.style.background = 'rgba(0, 0, 0, 0.7)';
                item.style.borderLeft = '4px solid #333';
            };
            item.onclick = () => this.selectSong(song);
            this.songListContainer.appendChild(item);
        });
    }

    setupDragDrop() {
        window.addEventListener('dragover', (e) => e.preventDefault());
        window.addEventListener('drop', (e) => this.handleDrop(e));
    }

    async handleDrop(e) {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const jsonFile = files.find(f => f.name.endsWith('.json'));
        const audioFile = files.find(f => f.type.startsWith('audio/'));
        const shaderFile = files.find(f => f.name.endsWith('.glsl') || f.name.endsWith('.frag'));

        if (jsonFile && audioFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const chart = JSON.parse(ev.target.result);
                const song = {
                    id: 'custom_' + Date.now(),
                    title: jsonFile.name.replace('.json', ''),
                    artist: 'Custom Mod',
                    bpm: 120,
                    difficulty: 'Custom',
                    src: URL.createObjectURL(audioFile),
                    previewStart: 0,
                    duration: 999,
                    chart: chart
                };
                songList.push(song);
                this.renderSongList();
                alert('Custom song loaded!');
            };
            reader.readAsText(jsonFile);
        } else if (audioFile) {
            // Auto-generate chart from MP3
            const url = URL.createObjectURL(audioFile);
            
            // We need to load the audio buffer to analyze it
            await this.game.audioManager.loadSong(url);
            
            const chart = this.game.proceduralGenerator.generate(
                this.game.audioManager.audioBuffer, 
                120, 
                this.game.settings.difficulty
            );
            
            const song = {
                id: 'autogen_' + Date.now(),
                title: audioFile.name.replace(/\.[^/.]+$/, ""),
                artist: 'Procedural AI',
                bpm: 120,
                difficulty: this.game.settings.difficulty,
                src: url,
                previewStart: 0,
                duration: this.game.audioManager.audioBuffer.duration,
                chart: chart
            };
            
            songList.push(song);
            this.renderSongList();
            alert(`Generated chart for ${song.title} (${chart.notes.length} notes)`);
        } else if (shaderFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                // Store shader in game settings or apply immediately if possible
                // For now, we assume it's for the game background
                this.game.customBackgroundShader = ev.target.result;
                alert('Custom Background Shader Loaded! It will be used in-game.');
            };
            reader.readAsText(shaderFile);
        }
    }

    triggerShaderUpload() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.glsl,.frag';
        input.onchange = (e) => this.handleDrop({ preventDefault: () => {}, dataTransfer: { files: e.target.files } });
        input.click();
    }

    createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = 'interactive';
        Object.assign(btn.style, {
            padding: '10px', background: 'transparent',
            border: '1px solid var(--primary-color)', color: 'var(--primary-color)',
            cursor: 'pointer', fontFamily: 'var(--font-family)', fontSize: '1em'
        });
        btn.onclick = onClick;
        return btn;
    }

    createModifiersUI() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', zIndex: '200', display: 'flex',
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        });

        const container = document.createElement('div');
        Object.assign(container.style, {
            width: '500px', background: '#111', border: '2px solid var(--primary-color)',
            padding: '30px', display: 'flex', flexDirection: 'column', gap: '15px',
            boxShadow: '0 0 30px var(--primary-color)'
        });

        const L = this.game.localization;
        container.innerHTML = `<h2 style="color:var(--primary-color); margin:0 0 20px 0; text-align:center;">${L.get('GAME_MODIFIERS')}</h2>`;

        const createToggle = (label, getValue, setValue) => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px', background: '#222', border: '1px solid #333'
            });

            const lbl = document.createElement('span');
            lbl.innerText = label;
            lbl.style.color = '#fff';

            const btn = document.createElement('button');
            const updateBtn = () => {
                const active = getValue();
                btn.innerText = active ? L.get('ON') : L.get('OFF');
                btn.style.color = active ? 'var(--primary-color)' : '#555';
                btn.style.border = `1px solid ${active ? 'var(--primary-color)' : '#555'}`;
                btn.style.background = 'transparent';
                btn.style.padding = '5px 15px';
                btn.style.cursor = 'pointer';
            };
            updateBtn();
            
            btn.onclick = () => { setValue(!getValue()); updateBtn(); };
            
            row.appendChild(lbl);
            row.appendChild(btn);
            return row;
        };

        // Mirror Mode (Sync with settings)
        container.appendChild(createToggle(L.get('MIRROR_MODE'), () => this.game.settings.mirrorMode, (v) => this.game.settings.mirrorMode = v));
        
        // Colorblind Mode
        container.appendChild(createToggle(L.get('COLORBLIND_MODE'), () => this.game.settings.colorblindMode, (v) => this.game.settings.colorblindMode = v));
        
        // Zen Mode
        container.appendChild(createToggle(L.get('ZEN_MODE'), () => this.game.settings.zenMode, (v) => this.game.settings.zenMode = v));

        // Focus Mode
        container.appendChild(createToggle(L.get('FOCUS_MODE'), () => this.game.settings.focusMode, (v) => this.game.settings.focusMode = v));

        // Other Modifiers
        Object.keys(this.game.modifiers).forEach(key => {
            const label = key.replace(/([A-Z])/g, ' $1').toUpperCase(); // camelCase to UPPER CASE
            container.appendChild(createToggle(label, () => this.game.modifiers[key], (v) => this.game.modifiers[key] = v));
        });

        const closeBtn = this.createBtn(L.get('CLOSE'), () => overlay.remove());
        closeBtn.style.marginTop = '20px';
        container.appendChild(closeBtn);

        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    showQuestsUI() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: '300', display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        });

        const L = this.game.localization;
        const box = document.createElement('div');
        Object.assign(box.style, {
            width: '500px', background: '#111', border: '2px solid #ffaa00',
            padding: '20px', fontFamily: 'var(--font-family)', color: '#fff',
            boxShadow: '0 0 30px rgba(255, 170, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px'
        });

        box.innerHTML = `<h2 style="color:#ffaa00; text-align:center; margin-bottom:20px;">${L.get('DAILY_QUESTS')}</h2>`;

        const quests = this.game.profileManager.data.quests || [];

        quests.forEach(q => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333'
            });

            const desc = this.game.questManager.getDesc(q);
            const progress = Math.min(100, Math.floor((q.current / q.target) * 100));

            row.innerHTML = `
                <div style="flex: 1;">
                    <div style="color:var(--primary-color); font-size:1.1em;">${desc}</div>
                    <div style="color:#aaa; font-size:0.8em;">${q.current} / ${q.target}</div>
                    <div style="width: 100%; height: 4px; background: #333; margin-top: 5px;">
                        <div style="width: ${progress}%; height: 100%; background: #ffaa00;"></div>
                    </div>
                </div>
            `;

            const btn = document.createElement('button');
            btn.innerText = q.claimed ? L.get('COMPLETED') : (q.completed ? L.get('CLAIM') : `${q.reward} CR`);
            btn.className = 'interactive';
            Object.assign(btn.style, {
                padding: '8px 15px', background: q.completed && !q.claimed ? '#ffaa00' : 'transparent',
                border: `1px solid ${q.claimed ? '#555' : '#ffaa00'}`, 
                color: q.completed && !q.claimed ? '#000' : (q.claimed ? '#555' : '#ffaa00'),
                cursor: q.completed && !q.claimed ? 'pointer' : 'default', fontFamily: 'inherit',
                marginLeft: '15px', minWidth: '100px'
            });

            if (q.completed && !q.claimed) {
                btn.onclick = () => {
                    q.claimed = true;
                    this.game.profileManager.data.credits += q.reward;
                    this.game.profileManager.save();
                    
                    btn.innerText = L.get('COMPLETED');
                    Object.assign(btn.style, { background: 'transparent', border: '1px solid #555', color: '#555', cursor: 'default' });
                    btn.onclick = null;
                    
                    this.updateProfileUI();
                };
            }

            row.appendChild(btn);
            box.appendChild(row);
        });

        const closeBtn = this.createBtn(L.get('CLOSE'), () => overlay.remove());
        closeBtn.style.marginTop = '20px';
        closeBtn.style.width = '100%';
        box.appendChild(closeBtn);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    showSocialUI() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: '300', display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        });

        const L = this.game.localization;
        const box = document.createElement('div');
        Object.assign(box.style, {
            width: '400px', background: '#111', border: '2px solid #0088ff',
            padding: '20px', fontFamily: 'var(--font-family)', color: '#fff',
            boxShadow: '0 0 30px rgba(0, 136, 255, 0.3)'
        });

        box.innerHTML = `<h2 style="color:#0088ff; text-align:center; margin-bottom:20px;">${L.get('FRIENDS_LIST')}</h2>`;
        
        const friends = [
            { name: 'NeonRider', status: 'Online', color: '#00ff00' },
            { name: 'GlitchQueen', status: 'In Game: Cyber City', color: '#ffff00' },
            { name: 'BitMaster', status: 'Offline', color: '#555' },
            { name: 'SynthWave', status: 'Online', color: '#00ff00' },
            { name: 'RetroBot', status: 'Offline', color: '#555' }
        ];

        friends.forEach(f => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex', justifyContent: 'space-between', padding: '10px',
                borderBottom: '1px solid #333'
            });
            row.innerHTML = `<span>${f.name}</span><span style="color:${f.color}">${f.status}</span>`;
            box.appendChild(row);
        });

        const closeBtn = this.createBtn(L.get('CLOSE'), () => overlay.remove());
        closeBtn.style.marginTop = '20px';
        closeBtn.style.width = '100%';
        box.appendChild(closeBtn);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    showDLCUI() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: '300', display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        });

        const L = this.game.localization;
        const box = document.createElement('div');
        Object.assign(box.style, {
            width: '600px', background: '#111', border: '2px solid #ff00ff',
            padding: '20px', fontFamily: 'var(--font-family)', color: '#fff',
            boxShadow: '0 0 30px rgba(255, 0, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px'
        });

        box.innerHTML = `<h2 style="color:#ff00ff; text-align:center; margin-bottom:20px;">${L.get('DLC_PACKS')}</h2>`;

        // Mock DLC Data
        const packs = [
            { id: 'dlc_neon', name: 'Neon Nights Pack', price: 1000, desc: '3 Songs + Neon Skin' },
            { id: 'dlc_retro', name: 'Retro Wave Pack', price: 1500, desc: '4 Songs + Retro Skin' },
            { id: 'dlc_hard', name: 'Hardcore Pack', price: 2000, desc: '5 Songs + Hardcore Skin' }
        ];

        // Ensure data structure exists
        if (!this.game.profileManager.data.unlockedDLCs) {
            this.game.profileManager.data.unlockedDLCs = [];
        }

        packs.forEach(pack => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333'
            });

            const isOwned = this.game.profileManager.data.unlockedDLCs.includes(pack.id);

            row.innerHTML = `
                <div>
                    <div style="color:var(--primary-color); font-size:1.2em;">${pack.name}</div>
                    <div style="color:#aaa; font-size:0.8em;">${pack.desc}</div>
                </div>
            `;

            const btn = document.createElement('button');
            btn.innerText = isOwned ? L.get('OWNED') : `${L.get('BUY')} (${pack.price} CR)`;
            btn.className = 'interactive';
            Object.assign(btn.style, {
                padding: '8px 15px', background: isOwned ? '#333' : 'transparent',
                border: `1px solid ${isOwned ? '#555' : '#ff00ff'}`, 
                color: isOwned ? '#aaa' : '#ff00ff',
                cursor: isOwned ? 'default' : 'pointer', fontFamily: 'inherit'
            });

            if (!isOwned) {
                btn.onclick = () => {
                    if (this.game.profileManager.data.credits >= pack.price) {
                        this.game.profileManager.data.credits -= pack.price;
                        this.game.profileManager.data.unlockedDLCs.push(pack.id);
                        if (this.game.profileManager.save) this.game.profileManager.save();
                        alert(L.get('PACK_UNLOCKED'));
                        
                        // Update UI
                        btn.innerText = L.get('OWNED');
                        Object.assign(btn.style, { background: '#333', border: '1px solid #555', color: '#aaa', cursor: 'default' });
                        btn.onclick = null;
                        
                        // Update profile display
                        this.updateProfileUI();
                    } else {
                        alert(L.get('NOT_ENOUGH_CREDITS'));
                    }
                };
            }

            row.appendChild(btn);
            box.appendChild(row);
        });

        const closeBtn = this.createBtn(L.get('CLOSE'), () => overlay.remove());
        closeBtn.style.marginTop = '20px';
        closeBtn.style.width = '100%';
        box.appendChild(closeBtn);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    createNewsTicker() {
        this.ticker = document.createElement('div');
        Object.assign(this.ticker.style, {
            position: 'absolute', bottom: '0', left: '0', width: '100%', height: '30px',
            background: 'rgba(0, 20, 0, 0.9)', borderTop: '1px solid var(--secondary-color)',
            overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
            fontFamily: 'monospace', color: 'var(--secondary-color)', fontSize: '14px', zIndex: '10'
        });

        const content = document.createElement('div');
        content.innerText = "BREAKING: SYSTEM BREACH DETECTED IN SECTOR 7 // TOP PLAYER 'CYPHER' REACHES 1,000,000 PTS // NEW SONG PACK 'NEON NIGHTMARE' AVAILABLE // REMINDER: DO NOT TRUST THE AI // DAILY CHALLENGE RESET IN 04:00:00 // ";
        Object.assign(content.style, {
            display: 'inline-block', paddingLeft: '100%', animation: 'ticker 20s linear infinite'
        });

        const style = document.createElement('style');
        style.innerHTML = `@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }`;
        this.ticker.appendChild(style);
        this.ticker.appendChild(content);
        document.getElementById('ui-layer').appendChild(this.ticker);
    }

    showDailyRewardModal(amount) {
        const L = this.game.localization;
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: '300', display: 'flex',
            justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.5s'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            width: '400px', padding: '30px', background: '#111',
            border: '2px solid #ffd700', boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)', fontFamily: 'var(--font-family)',
            textAlign: 'center', fontFamily: 'Orbitron, sans-serif', color: '#fff'
        });

        box.innerHTML = `
            <h2 style="color: #ffd700; margin-bottom: 20px; text-shadow: 0 0 10px #ffd700;">${L.get('DAILY_REWARD')}</h2>
            <div style="font-size: 4em; color: #fff; margin: 20px 0; text-shadow: 0 0 20px #fff;">+${amount}</div>
            <div style="color: #aaa; margin-bottom: 20px;">${L.get('CREDITS_ADDED')}</div>
        `;

        const btn = this.createBtn(L.get('COLLECT'), () => {
            overlay.remove();
            // Update profile display
            this.updateProfileUI();
        });
        Object.assign(btn.style, { width: '100%', fontSize: '1.2em', background: '#ffd700', color: '#000', border: 'none', fontWeight: 'bold' });
        
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    async updateLeaderboard(songId) {
        this.leaderboardContainer.style.display = 'block';
        this.leaderboardContainer.innerHTML = '<div style="text-align:center; color:var(--primary-color); margin-bottom:10px;">TOP SCORES</div>Loading...';
        
        const scores = await this.game.leaderboardManager.getScores(songId);
        
        let html = '<div style="text-align:center; color:var(--primary-color); margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">TOP SCORES</div>';
        if (scores.length === 0) {
            html += '<div style="text-align:center; color:#555;">No scores yet</div>';
        } else {
            scores.forEach((s, i) => {
                html += `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i+1}. ${s.name}</span><span style="color:${s.rank === 'S' ? '#ffd700' : '#fff'}">${s.score}</span></div>`;
            });
        }
        this.leaderboardContainer.innerHTML = html;
    }

    update(delta, time) {
        if (this.c64Mesh) {
            this.c64Mesh.material.uniforms.uTime.value = time;
            this.updateSnake(time);
        }
        if (this.avatarManager) {
            this.avatarManager.update(time, this.mouseX, this.mouseY);
        }
    }

    selectSong(song) {
        this.game.isDailyChallenge = false;
        this.game.isMultiplayer = false;
        this.game.isSpectator = false;
        this.game.isCampaign = false;
        this.game.isReplay = false;
        this.game.isGhostMode = false;
        this.game.isTournament = false;
        this.game.isVisualizer = false;
        if (!this.game.isEditor) this.game.isEditor = false; // Reset unless explicitly set
        this.game.selectedSong = song;
        this.updateLeaderboard(song.id);
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    startDailyChallenge() {
        const randomSong = songList[Math.floor(Math.random() * songList.length)];
        const modifiers = {
            noteSpeed: 25 + Math.random() * 20,
            drainRate: 10 + Math.random() * 20,
            mirrorMode: Math.random() > 0.5
        };
        this.game.selectedSong = randomSong;
        this.game.settings.noteSpeed = modifiers.noteSpeed;
        this.game.settings.drainRate = modifiers.drainRate;
        this.game.settings.mirrorMode = modifiers.mirrorMode;
        this.game.isDailyChallenge = true;
        alert(`DAILY CHALLENGE:\nSong: ${randomSong.title}\nSpeed: ${modifiers.noteSpeed.toFixed(1)}\nDrain: ${modifiers.drainRate.toFixed(1)}\nMirror: ${modifiers.mirrorMode}`);
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    startMultiplayer() {
        this.game.isMultiplayer = true;
        this.game.isReplay = false;
        this.game.selectedSong = songList[0]; // Default to first song for now
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    startVisualizer() {
        this.game.isVisualizer = true;
        this.game.isReplay = false;
        this.game.selectedSong = songList[0];
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    startGhostMode() {
        this.game.isGhostMode = true;
        this.game.isReplay = false;
        this.game.selectedSong = songList[0];
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    startPractice() {
        this.game.isPractice = true;
        this.game.isReplay = false;
        this.game.selectedSong = songList[0];
        this.game.sceneManager.switchScene(SCENE_NAMES.PRACTICE_SETUP);
    }

    startRhythmEditor() {
        this.game.selectedSong = songList[0];
        this.game.sceneManager.switchScene(SCENE_NAMES.RHYTHM_EDITOR);
    }

    startSpectator() {
        this.game.isMultiplayer = true;
        this.game.isSpectator = true;
        this.game.isReplay = false;
        this.game.selectedSong = songList[0];
        this.game.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    setDifficulty(diff) {
        this.game.settings.difficulty = diff;
        if (diff === 'Easy') { this.game.settings.noteSpeed = 20; this.game.settings.drainRate = 10; }
        else if (diff === 'Normal') { this.game.settings.noteSpeed = 30; this.game.settings.drainRate = 15; }
        else if (diff === 'Hard') { this.game.settings.noteSpeed = 45; this.game.settings.drainRate = 25; }
    }

    dispose() {
        if (this.menuContainer) this.menuContainer.remove();
        if (this.leaderboardContainer) this.leaderboardContainer.remove();
        if (this.profileDisplay) this.profileDisplay.remove();
        if (this.ticker) this.ticker.remove();
        this.game.audioManager.stopHDDNoise();
        if (this.avatarManager) this.avatarManager.dispose();
        window.removeEventListener('keydown', this.boundSnakeInput);
        window.removeEventListener('dragover', (e) => e.preventDefault());
        window.removeEventListener('drop', (e) => this.handleDrop(e));
        super.dispose();
    }
}