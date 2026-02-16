import * as THREE from 'three';
import { GAME_STATE, EVENTS, SCENE_NAMES } from '../utils/constants.js';
import { SceneManager } from './SceneManager.js';
import { AudioManager } from './AudioManager.js';
import { EffectsManager } from './EffectsManager.js';
import { CampaignManager } from './CampaignManager.js';
import { LeaderboardManager } from './LeaderboardManager.js';
import { ProfileManager } from './ProfileManager.js';
import { AchievementManager } from './AchievementManager.js';
import { TournamentManager } from './TournamentManager.js';
import { IntroScene } from '../scenes/IntroScene.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { SettingsScene } from '../scenes/SettingsScene.js';
import { ResultsScene } from '../scenes/ResultsScene.js';
import { TutorialScene } from '../scenes/TutorialScene.js';
import { CampaignScene } from '../scenes/CampaignScene.js';
import { EditorScene } from '../scenes/EditorScene.js';
import { CreditsScene } from '../scenes/CreditsScene.js';
import { JukeboxScene } from '../scenes/JukeboxScene.js';
import { PracticeSetupScene } from '../scenes/PracticeSetupScene.js';
import { TournamentScene } from '../scenes/TournamentScene.js';
import { RhythmEditorScene } from '../scenes/RhythmEditorScene.js';
import { SKINS } from './SkinManager.js';
import { songList } from '../utils/songList.js';
import { Localization } from '../utils/Localization.js';
import { GamepadManager } from './GamepadManager.js';
import { ProceduralGenerator } from './ProceduralGenerator.js';
import { CalibrationScene } from '../scenes/CalibrationScene.js';
import { ReplayEditorScene } from '../scenes/ReplayEditorScene.js';
import { WorkshopScene } from '../scenes/WorkshopScene.js';
import { ThemeManager } from './ThemeManager.js';
import { QuestManager } from './QuestManager.js';
import { loadingVertex } from '../shaders/loadingVertex.js';
import { loadingFragment } from '../shaders/loadingFragment.js';

export class GameManager {
    constructor() {
        this.canvas = document.querySelector('#gl-canvas');
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.clock = new THREE.Clock();
        this.currentState = GAME_STATE.BOOT;
        this.sceneManager = null;
        this.audioManager = null;
        this.selectedSong = null;
        this.effectsManager = null;
        this.campaignManager = null;
        this.leaderboardManager = null;
        this.profileManager = null;
        this.achievementManager = null;
        this.tournamentManager = null;
        this.localization = null;
        this.gamepadManager = null;
        this.proceduralGenerator = null;
        this.overlay = null;
        this.themeManager = null;
        this.questManager = null;
        this.shakeIntensity = 0;
        this.settings = { volume: 0.5, offset: 0.0, difficulty: 'Normal', noteSpeed: 30, drainRate: 15, mirrorMode: false, colorblindMode: false, zenMode: false, focusMode: false, language: 'EN', theme: 'CYBER', keyBindings: { 0: 'KeyD', 1: 'KeyF', 2: 'KeyJ', 3: 'KeyK' }, skin: SKINS.TRON, noteSkin: 'Cube', noteSize: 1.0, particleShape: 'Spark', dynamicDifficulty: false };
        this.isDailyChallenge = false;
        this.isEditor = false;
        this.isMultiplayer = false;
        this.isReplay = false;
        this.isSpectator = false;
        this.isCampaign = false;
        this.isVisualizer = false;
        this.isPractice = false;
        this.isGhostMode = false;
        this.isTournament = false;
        this.practiceSettings = { start: 0, end: 30, speed: 1.0 };
        this.lastStats = null;
        this.replayData = null;
        this.multiplayerSocket = null;
        this.currentCampaignLevel = -1;
        this.customChart = null;
        
        this.modifiers = {
            hidden: false,
            sudden: false,
            noFail: false,
            suddenDeath: false,
            perfectOnly: false,
            autoPlay: false
        };
        
        // Loading Screen Scene
        this.loadingScene = null;
        this.loadingCamera = null;
        this.loadingMesh = null;

        this.init();
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, // Optimization: Disable AA when using post-processing
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });
        
        this.renderer.xr.enabled = true;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Optimization: Cap pixel ratio
        
        this.checkWebGPU();
        this.optimizeRenderer();

        this.effectsManager = new EffectsManager(this.renderer, window.innerWidth, window.innerHeight);

        this.campaignManager = new CampaignManager();
        this.leaderboardManager = new LeaderboardManager();
        this.profileManager = new ProfileManager();
        this.achievementManager = new AchievementManager(this);
        this.tournamentManager = new TournamentManager();
        this.sceneManager = new SceneManager(this);
        this.audioManager = new AudioManager();
        this.localization = new Localization(this.settings.language);
        this.gamepadManager = new GamepadManager(this);
        this.proceduralGenerator = new ProceduralGenerator();
        this.themeManager = new ThemeManager(this);
        this.questManager = new QuestManager(this);
        this.themeManager.applyTheme(this.settings.theme);
        
        this.sceneManager.register(SCENE_NAMES.INTRO, IntroScene);
        this.sceneManager.register(SCENE_NAMES.MENU, MenuScene);
        this.sceneManager.register(SCENE_NAMES.GAME, GameScene);
        this.sceneManager.register(SCENE_NAMES.SETTINGS, SettingsScene);
        this.sceneManager.register(SCENE_NAMES.RESULTS, ResultsScene);
        this.sceneManager.register(SCENE_NAMES.TUTORIAL, TutorialScene);
        this.sceneManager.register(SCENE_NAMES.CAMPAIGN, CampaignScene);
        this.sceneManager.register(SCENE_NAMES.EDITOR, EditorScene);
        this.sceneManager.register(SCENE_NAMES.CREDITS, CreditsScene);
        this.sceneManager.register(SCENE_NAMES.JUKEBOX, JukeboxScene);
        this.sceneManager.register(SCENE_NAMES.PRACTICE_SETUP, PracticeSetupScene);
        this.sceneManager.register(SCENE_NAMES.TOURNAMENT, TournamentScene);
        this.sceneManager.register(SCENE_NAMES.RHYTHM_EDITOR, RhythmEditorScene);
        this.sceneManager.register('CALIBRATION', CalibrationScene);
        this.sceneManager.register('REPLAY_EDITOR', ReplayEditorScene);
        this.sceneManager.register('WORKSHOP', WorkshopScene);
        
        // Initialize Loading Screen Shader
        this.loadingScene = new THREE.Scene();
        this.loadingCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geo = new THREE.PlaneGeometry(2, 2);
        const mat = new THREE.ShaderMaterial({
            vertexShader: loadingVertex,
            fragmentShader: loadingFragment,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            }
        });
        this.loadingMesh = new THREE.Mesh(geo, mat);
        this.loadingScene.add(this.loadingMesh);

        const tips = [
            "TIP: Use headphones for the best experience.",
            "TIP: Calibrate audio offset in Settings if rhythm feels off.",
            "TIP: Hold Shift to activate Slow Motion.",
            "TIP: Complete Daily Quests to earn credits.",
            "TIP: Press Backspace to rewind in Practice Mode.",
            "TIP: Fever Mode doubles your score multiplier.",
            "TIP: Check the Workshop for community charts."
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        this.createOverlay('BEAT.LINE', [
            { 
                text: 'INITIALIZE SYSTEM', 
                action: () => {
                    if (this.isMobile) this.enterFullScreen();
                    this.audioManager.resume().then(() => {
                        this.removeOverlay();
                        this.currentState = GAME_STATE.INTRO;
                        this.sceneManager.switchScene(SCENE_NAMES.INTRO);
                    });
                }
            }
        ], `<div style="font-size: 1.2em; margin-top: 10px; color: #fff; text-shadow: 0 0 10px #fff;">CLICK TO START AUDIO ENGINE</div>
            <div style="position: absolute; bottom: 50px; width: 100%; text-align: center; color: #00f3ff; font-family: 'Orbitron', sans-serif; font-size: 1em; text-shadow: 0 0 5px #00f3ff; opacity: 0.8; animation: tipPulse 3s infinite;">${randomTip}</div>
            <style>@keyframes tipPulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }</style>`, true);
        window.addEventListener(EVENTS.WINDOW_RESIZE, () => this.onResize());
        
        this.startLoop();
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.effectsManager.resize(width, height);
        this.sceneManager.resize(width, height);
        if (this.loadingMesh) {
            this.loadingMesh.material.uniforms.uResolution.value.set(width, height);
        }
    }

    applySkin() {
        const s = this.settings.skin;
        if (this.effectsManager) {
            this.effectsManager.bloomPass.strength = s.bloom.strength;
            this.effectsManager.bloomPass.radius = s.bloom.radius;
            this.effectsManager.bloomPass.threshold = s.bloom.threshold;
        }
    }

    setFever(active) {
        if (this.sceneManager.activeScene && this.sceneManager.activeScene.setFever) {
            this.sceneManager.activeScene.setFever(active);
        }
    }

    triggerGlitch(duration) {
        this.effectsManager.triggerGlitch(duration);
    }

    triggerShake(amount) {
        this.shakeIntensity = Math.max(this.shakeIntensity, amount);
    }

    togglePause(conductor) {
        if (this.currentState === GAME_STATE.PLAYING) {
            this.currentState = GAME_STATE.PAUSED;
            conductor.pause();
            this.createOverlay('PAUSED', [
                { text: 'RESUME', action: () => this.togglePause(conductor) },
                { text: 'QUIT', action: () => {
                    this.audioManager.resume();
                    this.sceneManager.switchScene(SCENE_NAMES.MENU);
                }}
            ]);
        } else if (this.currentState === GAME_STATE.PAUSED) {
            this.currentState = GAME_STATE.PLAYING;
            conductor.resume();
            this.removeOverlay();
        }
    }

    gameOver(stats) {
        if (stats.health <= 0) {
            this.audioManager.playGameOverSFX();
        }

        this.currentState = GAME_STATE.GAMEOVER;
        if (this.isCampaign) {
            const passed = this.campaignManager.checkCompletion(this.currentCampaignLevel, stats);
            if (passed) alert("LEVEL CLEARED! NEXT LEVEL UNLOCKED.");
            else alert("LEVEL FAILED. TRY AGAIN.");
            this.sceneManager.switchScene(SCENE_NAMES.CAMPAIGN);
            return;
        }
        if (this.isTournament) {
            this.tournamentManager.resolveRound(stats.score);
            this.sceneManager.switchScene(SCENE_NAMES.TOURNAMENT);
            return;
        }
        if (this.isVisualizer) {
            this.sceneManager.switchScene(SCENE_NAMES.MENU);
            return;
        }
        if (this.selectedSong) {
            this.profileManager.updateStats(stats, this.selectedSong.id);
            this.leaderboardManager.submitScore(this.selectedSong.id, stats.score, this.profileManager.data.username);
            if (stats.health > 0) this.achievementManager.unlock('first_clear');
            
            // XP & Badges
            const xpEarned = Math.floor(stats.score / 100);
            const leveledUp = this.profileManager.addXP(xpEarned);
            if (leveledUp) alert(`LEVEL UP! You are now Level ${this.profileManager.data.level}`);
            
            const newBadge = this.profileManager.checkBadges();
            if (newBadge) alert("NEW BADGE UNLOCKED!");
            
            // Update Quests
            this.questManager.updateProgress('score', stats.score);
            this.questManager.updateProgress('combo', stats.maxCombo);
            this.questManager.updateProgress('perfect', stats.perfects);
            this.questManager.updateProgress('play', 1);
        }
        this.lastStats = stats;
        this.sceneManager.switchScene(SCENE_NAMES.RESULTS);
    }

    startCampaignLevel(index) {
        const level = this.campaignManager.getLevel(index);
        this.isCampaign = true;
        this.currentCampaignLevel = index;
        this.selectedSong = songList.find(s => s.id === level.songId);
        this.settings.difficulty = level.difficulty;
        this.sceneManager.switchScene(SCENE_NAMES.GAME);
    }

    startTournament() {
        this.isTournament = true;
        this.sceneManager.switchScene(SCENE_NAMES.TOURNAMENT);
    }

    enterFullScreen() {
        const el = document.documentElement;
        const rfs = el.requestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (rfs) {
            rfs.call(el).catch(e => console.log("Fullscreen blocked", e));
        }
    }

    createOverlay(title, buttons, extraHtml = '', transparent = false) {
        this.removeOverlay();
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            background: transparent ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', zIndex: '100', color: '#fff', backdropFilter: transparent ? 'none' : 'blur(5px)'
        });
        
        const css = `
            <style>
                @keyframes neon-pulse {
                    0% { box-shadow: 0 0 5px #00f3ff, inset 0 0 5px #00f3ff; text-shadow: 0 0 5px #00f3ff; }
                    50% { box-shadow: 0 0 25px #00f3ff, inset 0 0 10px #00f3ff; text-shadow: 0 0 20px #00f3ff; }
                    100% { box-shadow: 0 0 5px #00f3ff, inset 0 0 5px #00f3ff; text-shadow: 0 0 5px #00f3ff; }
                }
                @keyframes scan-shine {
                    0% { left: -100%; }
                    20% { left: 100%; }
                    100% { left: 100%; }
                }
                .init-btn {
                    position: relative;
                    overflow: hidden;
                    animation: neon-pulse 2s infinite;
                    transition: all 0.3s;
                }
                .init-btn:hover {
                    background-color: #00f3ff !important;
                    color: #000 !important;
                    box-shadow: 0 0 50px #00f3ff;
                    transform: scale(1.05);
                    font-weight: bold;
                }
                .init-btn::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%;
                    width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
                    animation: scan-shine 3s infinite;
                }
            </style>
        `;

        let html = `${css}<h1 style="font-size: 4em; text-shadow: 0 0 20px #00f3ff; margin: 0;">${title}</h1>${extraHtml}<div style="margin-top: 40px; display: flex; gap: 20px;">`;
        this.overlay.innerHTML = html + '</div>';
        
        const btnContainer = this.overlay.lastChild;
        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.innerText = btn.text;
            b.setAttribute('data-text', btn.text);
            Object.assign(b.style, { 
                padding: '15px 40px', background: 'rgba(0, 243, 255, 0.1)', 
                border: '2px solid #00f3ff', color: '#00f3ff', fontSize: '1.5em', 
                cursor: 'pointer', fontFamily: 'inherit', textShadow: '0 0 10px #00f3ff', boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)' 
            });
            
            if (btn.text === 'INITIALIZE SYSTEM') {
                b.classList.add('init-btn');
                b.onmouseover = () => this.audioManager.playPowerUpSFX();
            }

            b.onclick = () => { if(btn.text === 'QUIT' || btn.text === 'BACK TO MENU') this.removeOverlay(); btn.action(); };
            btnContainer.appendChild(b);
        });
        document.body.appendChild(this.overlay);
    }

    removeOverlay() {
        if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    }

    async enterVR() {
        if (navigator.xr) {
            if (await navigator.xr.isSessionSupported('immersive-vr')) {
                const session = await navigator.xr.requestSession('immersive-vr', {
                    optionalFeatures: ['local-floor', 'bounded-floor']
                });
                this.renderer.xr.setSession(session);
            } else {
                alert("VR not supported on this device.");
            }
        } else {
            alert("WebXR not found.");
        }
    }

    async checkWebGPU() {
        if ('gpu' in navigator) {
            try {
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) {
                    console.log("WebGPU Hardware Acceleration: Available");
                }
            } catch (e) {
                console.warn("WebGPU not supported:", e);
            }
        }
    }

    optimizeRenderer() {
        this.renderer.debug.checkShaderErrors = false;
        this.renderer.shadowMap.enabled = false;
        
        const dummyScene = new THREE.Scene();
        const dummyCamera = new THREE.PerspectiveCamera();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        dummyScene.add(mesh);
        this.renderer.compile(dummyScene, dummyCamera);
    }

    async cloudSave() {
        // Create UI Overlay
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', zIndex: '2000', display: 'flex',
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            fontFamily: 'Orbitron, sans-serif', color: '#00f3ff',
            backdropFilter: 'blur(5px)'
        });
        
        const spinner = document.createElement('div');
        Object.assign(spinner.style, {
            width: '60px', height: '60px', border: '4px solid #333',
            borderTop: '4px solid #00f3ff', borderRadius: '50%',
            animation: 'spin 1s linear infinite', marginBottom: '30px',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
        });
        
        const style = document.createElement('style');
        style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        overlay.appendChild(style);
        
        const text = document.createElement('div');
        text.innerText = 'CONNECTING TO CLOUD SERVER...';
        text.style.textShadow = '0 0 10px #00f3ff';
        text.style.fontSize = '1.2em';
        
        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);

        // Simulation Sequence
        await new Promise(r => setTimeout(r, 800)); // Connect delay
        text.innerText = 'UPLOADING PROFILE DATA...';
        
        await new Promise(r => setTimeout(r, 1500)); // Upload delay
        
        // Actual Save (Force local save)
        if (this.profileManager && this.profileManager.save) this.profileManager.save();
        localStorage.setItem('beatline_last_cloud_sync', Date.now());
        
        text.innerText = 'SYNC COMPLETE';
        text.style.color = '#00ff00';
        spinner.style.borderTopColor = '#00ff00';
        spinner.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.2)';
        
        await new Promise(r => setTimeout(r, 1000)); // Success delay
        overlay.remove();
    }

    startLoop() {
        this.renderer.setAnimationLoop(() => this.render());
    }

    render() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        if (this.currentState === GAME_STATE.BOOT && this.loadingScene) {
            this.loadingMesh.material.uniforms.uTime.value = time;
            this.renderer.render(this.loadingScene, this.loadingCamera);
            return;
        }

        this.sceneManager.update(delta, time);
        
        const activeScene = this.sceneManager.activeScene;
        if (activeScene && activeScene.scene && activeScene.camera) {
            // Camera Shake Logic
            let originalPos = null;
            if (this.shakeIntensity > 0) {
                originalPos = activeScene.camera.position.clone();
                const shake = this.shakeIntensity * 0.5;
                activeScene.camera.position.x += (Math.random() - 0.5) * shake;
                activeScene.camera.position.y += (Math.random() - 0.5) * shake;
                activeScene.camera.position.z += (Math.random() - 0.5) * shake;
                
                this.shakeIntensity -= delta * 2.0;
                if (this.shakeIntensity < 0) this.shakeIntensity = 0;
            }

            const freq = this.audioManager ? this.audioManager.getAverageFrequency() : 0;
            this.effectsManager.update(activeScene.scene, activeScene.camera, freq);

            if (originalPos) activeScene.camera.position.copy(originalPos);
        }
    }
}
