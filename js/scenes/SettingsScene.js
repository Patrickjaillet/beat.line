import { BaseScene } from './BaseScene.js';
import * as THREE from 'three';
import { SCENE_NAMES } from '../utils/constants.js';
import { SKINS } from '../core/SkinManager.js';
import { THEMES } from '../core/ThemeManager.js';

export class SettingsScene extends BaseScene {
    constructor(game) {
        super(game);
        this.container = null;
        this.bgMesh = null;
        this.activeTab = 'GENERAL';
    }

    init() {
        this.scene.background = new THREE.Color(0x050505);
        
        // Reuse 3D Background
        const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.1 // Keep default color for background mesh
        });
        this.bgMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.bgMesh);
        this.camera.position.z = 30;

        this.createUI();
        return Promise.resolve();
    }

    createUI() {
        if (this.container) this.container.innerHTML = ''; else {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', width: this.game.isMobile ? '95%' : '800px',
            display: 'flex', flexDirection: 'column', gap: '30px',
            color: '#fff', fontFamily: 'var(--font-family)'
        });
        }

        const L = this.game.localization;
        const primaryColor = 'var(--primary-color)';

        // Header
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.innerHTML = `<h1 style="font-size: 3em; margin: 0; text-shadow: var(--text-shadow); color: var(--primary-color);">${L.get('SETTINGS')}</h1><div style="color:#ffd700">CREDITS: ${this.game.profileManager.data.credits}</div>`;
        this.container.appendChild(header);

        // Tabs
        const tabsHeader = document.createElement('div');
        Object.assign(tabsHeader.style, {
            display: 'flex', justifyContent: 'space-between', marginBottom: '10px',
            borderBottom: `2px solid ${primaryColor}`
        });

        const tabs = [
            { id: 'GENERAL', label: L.get('TAB_GENERAL') },
            { id: 'AUDIO', label: L.get('TAB_AUDIO') },
            { id: 'GAMEPLAY', label: L.get('TAB_GAMEPLAY') },
            { id: 'APPEARANCE', label: L.get('TAB_APPEARANCE') }
        ];

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
                this.refreshContent();
            };
            tabsHeader.appendChild(btn);
        });
        this.container.appendChild(tabsHeader);

        this.contentContainer = document.createElement('div');
        this.contentContainer.style.display = 'flex';
        this.contentContainer.style.flexDirection = 'column';
        this.contentContainer.style.gap = '20px';
        this.container.appendChild(this.contentContainer);

        // Back Button
        const backBtn = document.createElement('button');
        backBtn.innerText = L.get('BACK');
        backBtn.className = 'interactive';
        Object.assign(backBtn.style, {
            padding: '15px', background: 'transparent',
            border: '2px solid var(--primary-color)', color: 'var(--primary-color)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.5em',
            marginTop: '20px', width: '100%'
        });
        backBtn.onclick = () => this.game.sceneManager.switchScene(SCENE_NAMES.MENU);
        this.container.appendChild(backBtn);

        document.getElementById('ui-layer').appendChild(this.container);
        this.refreshContent();
    }

    refreshContent() {
        this.contentContainer.innerHTML = '';
        const L = this.game.localization;

        switch(this.activeTab) {
            case 'GENERAL':
                this.renderGeneralTab(L);
                break;
            case 'AUDIO':
                this.renderAudioTab(L);
                break;
            case 'GAMEPLAY':
                this.renderGameplayTab(L);
                break;
            case 'APPEARANCE':
                this.renderAppearanceTab(L);
                break;
        }
    }

    renderGeneralTab(L) {
        // Username Input
        const userGroup = document.createElement('div');
        userGroup.style.display = 'flex';
        userGroup.style.flexDirection = 'column';
        userGroup.style.gap = '10px';
        userGroup.innerHTML = `<div style="font-size: 1.2em;">${L.get('USERNAME')}:</div>`;
        
        const userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.value = this.game.profileManager.data.username;
        userInput.className = 'interactive';
        Object.assign(userInput.style, { padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--primary-color)', color: '#fff', fontFamily: 'inherit', textAlign: 'center' });
        userInput.onchange = (e) => this.game.profileManager.setUsername(e.target.value);
        userGroup.appendChild(userInput);
        this.contentContainer.appendChild(userGroup);

        // Language Selector
        const langBtn = document.createElement('button');
        langBtn.innerText = `${L.get('LANGUAGE')}: ${this.game.settings.language}`;
        langBtn.className = 'interactive';
        Object.assign(langBtn.style, {
            padding: '10px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px'
        });
        langBtn.onclick = () => {
            const langs = ['EN', 'FR', 'JP'];
            const next = langs[(langs.indexOf(this.game.settings.language) + 1) % langs.length];
            this.game.settings.language = next;
            this.game.localization.setLanguage(next);
            this.createUI(); // Refresh UI
        };
        this.contentContainer.appendChild(langBtn);

        // Theme Selector
        const themeBtn = document.createElement('button');
        themeBtn.innerText = `${L.get('THEME')}: ${this.game.settings.theme}`;
        themeBtn.className = 'interactive';
        Object.assign(themeBtn.style, {
            padding: '10px', background: 'transparent', border: '1px solid var(--secondary-color)', color: 'var(--secondary-color)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px'
        });
        themeBtn.onclick = () => {
            const themes = Object.keys(THEMES);
            const next = themes[(themes.indexOf(this.game.settings.theme) + 1) % themes.length];
            this.game.settings.theme = next;
            this.game.themeManager.applyTheme(next);
            themeBtn.innerText = `${L.get('THEME')}: ${this.game.settings.theme}`;
            this.createUI(); // Refresh UI to apply new fonts/colors
        };
        this.contentContainer.appendChild(themeBtn);
    }

    renderAudioTab(L) {
        // Volume Control
        const volGroup = this.createSlider(L.get('GLOBAL_VOLUME'), 0, 1, 0.1, this.game.settings.volume, (val) => {
            this.game.settings.volume = parseFloat(val);
            this.game.audioManager.setVolume(this.game.settings.volume);
        });
        this.contentContainer.appendChild(volGroup);

        // Offset Control
        const offsetGroup = this.createSlider(L.get('AUDIO_OFFSET') + ' (s)', -0.5, 0.5, 0.01, this.game.settings.offset, (val) => {
            this.game.settings.offset = parseFloat(val);
        });
        this.contentContainer.appendChild(offsetGroup);

        // Calibration Wizard Button
        const calibBtn = document.createElement('button');
        calibBtn.innerText = L.get('CALIBRATION');
        calibBtn.className = 'interactive';
        Object.assign(calibBtn.style, {
            padding: '10px', background: 'transparent', border: '1px solid #ffff00', color: '#ffff00', 
            cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px', width: '100%'
        });
        calibBtn.onclick = () => this.game.sceneManager.switchScene('CALIBRATION');
        this.contentContainer.appendChild(calibBtn);
    }

    renderGameplayTab(L) {
        // Keybindings
        const keyGroup = document.createElement('div');
        keyGroup.style.display = 'flex';
        keyGroup.style.gap = '10px';
        keyGroup.style.justifyContent = 'center';
        
        for (let i = 0; i < 4; i++) {
            const btn = document.createElement('button');
            btn.innerText = this.game.settings.keyBindings[i];
            btn.className = 'interactive';
            Object.assign(btn.style, {
                padding: '10px', background: 'rgba(0,0,0,0.5)',
                border: '1px solid #333', color: '#fff', cursor: 'pointer', fontFamily: 'inherit'
            });
            btn.onclick = () => {
                btn.innerText = '...';
                const handler = (e) => { this.game.settings.keyBindings[i] = e.code; btn.innerText = e.code; window.removeEventListener('keydown', handler); };
                window.addEventListener('keydown', handler, { once: true });
            };
            keyGroup.appendChild(btn);
        }
        this.contentContainer.appendChild(keyGroup);

        // Dynamic Difficulty Toggle
        const ddBtn = document.createElement('button');
        ddBtn.innerText = `${L.get('DYNAMIC_DIFFICULTY')}: ${this.game.settings.dynamicDifficulty ? L.get('ON') : L.get('OFF')}`;
        ddBtn.className = 'interactive';
        Object.assign(ddBtn.style, {
            padding: '10px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px'
        });
        ddBtn.onclick = () => {
            this.game.settings.dynamicDifficulty = !this.game.settings.dynamicDifficulty;
            ddBtn.innerText = `${L.get('DYNAMIC_DIFFICULTY')}: ${this.game.settings.dynamicDifficulty ? L.get('ON') : L.get('OFF')}`;
        };
        this.contentContainer.appendChild(ddBtn);
    }

    renderAppearanceTab(L) {
        // Skin Selector
        const skinGroup = document.createElement('div');
        skinGroup.style.display = 'flex';
        skinGroup.style.gap = '10px';
        skinGroup.style.justifyContent = 'center';
        skinGroup.style.marginTop = '20px';

        Object.keys(SKINS).forEach(key => {
            const skin = SKINS[key];
            const isUnlocked = this.game.profileManager.data.unlockedSkins.includes(key);
            const btn = document.createElement('button');
            btn.innerText = isUnlocked ? skin.name : `${skin.name} (${skin.cost})`;
            btn.className = 'interactive';
            Object.assign(btn.style, {
                padding: '10px', background: this.game.settings.skin.name === key ? '#00f3ff' : (isUnlocked ? 'rgba(0,0,0,0.5)' : '#330000'),
                border: '1px solid #333', color: this.game.settings.skin.name === key ? '#000' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
                opacity: isUnlocked ? 1 : 0.7
            });
            btn.onclick = () => { 
                if (isUnlocked) {
                    this.game.settings.skin = skin; this.game.applySkin(); this.createUI();
                } else if (this.game.profileManager.unlockSkin(key, skin.cost)) {
                    this.createUI();
                } else alert('Not enough credits!');
            };
            skinGroup.appendChild(btn);
        });
        this.contentContainer.appendChild(skinGroup);

        // Note Skin Selector
        const noteSkinBtn = document.createElement('button');
        noteSkinBtn.innerText = `${L.get('NOTE_SKIN')}: ${this.game.settings.noteSkin}`;
        noteSkinBtn.className = 'interactive';
        Object.assign(noteSkinBtn.style, {
            padding: '10px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px'
        });
        noteSkinBtn.onclick = () => {
            const skins = ['Cube', 'Sphere', 'Diamond'];
            const nextIndex = (skins.indexOf(this.game.settings.noteSkin) + 1) % skins.length;
            this.game.settings.noteSkin = skins[nextIndex];
            noteSkinBtn.innerText = `${L.get('NOTE_SKIN')}: ${this.game.settings.noteSkin}`;
        };
        this.contentContainer.appendChild(noteSkinBtn);

        // Note Size Slider
        const sizeGroup = this.createSlider(L.get('NOTE_SIZE'), 0.5, 2.0, 0.1, this.game.settings.noteSize || 1.0, (val) => {
            this.game.settings.noteSize = parseFloat(val);
        });
        this.contentContainer.appendChild(sizeGroup);

        // Particle Shape Selector
        const particleBtn = document.createElement('button');
        particleBtn.innerText = `${L.get('PARTICLE_SHAPE')}: ${this.game.settings.particleShape || 'Spark'}`;
        particleBtn.className = 'interactive';
        Object.assign(particleBtn.style, {
            padding: '10px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px'
        });
        particleBtn.onclick = () => {
            const shapes = ['Spark', 'Star', 'Heart', 'Note'];
            const nextIndex = (shapes.indexOf(this.game.settings.particleShape || 'Spark') + 1) % shapes.length;
            this.game.settings.particleShape = shapes[nextIndex];
            particleBtn.innerText = `${L.get('PARTICLE_SHAPE')}: ${this.game.settings.particleShape}`;
        };
        this.contentContainer.appendChild(particleBtn);
    }

    createSlider(label, min, max, step, value, onChange) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '10px';

        const labelEl = document.createElement('div');
        labelEl.innerText = `${label}: `;
        labelEl.style.fontSize = '1.2em';
        
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;
        input.className = 'interactive';
        input.style.width = '100%';
        input.style.accentColor = 'var(--primary-color)';

        input.oninput = (e) => {
            labelEl.innerText = `: ${e.target.value}`;
            onChange(e.target.value);
        };

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        return wrapper;
    }

    update(delta, time) {
        if (this.bgMesh) {
            this.bgMesh.rotation.x = time * 0.2;
            this.bgMesh.rotation.y = time * 0.1;
        }
    }

    dispose() {
        if (this.container) this.container.remove();
        super.dispose();
    }
}
