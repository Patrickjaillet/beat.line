import { BaseScene } from './BaseScene.js';
import { Conductor } from '../core/Conductor.js';
import { EVENTS, GAME_STATE } from '../utils/constants.js';
import { NoteFactory } from '../core/NoteFactory.js';
import { InputHandler } from '../core/InputHandler.js';
import { ScoreManager } from '../core/ScoreManager.js';
import { ParticleSystem } from '../core/ParticleSystem.js';
import { BackgroundManager } from '../core/BackgroundManager.js';
import { BossManager } from '../core/BossManager.js';
import { TrackManager } from '../core/TrackManager.js';
import { ReplayManager } from '../core/ReplayManager.js';
import { MultiplayerManager } from '../core/MultiplayerManager.js';
import { ComboFireManager } from '../core/ComboFireManager.js';
import { WarpManager } from '../core/WarpManager.js';
import { HUDManager } from '../core/HUDManager.js';
import * as THREE from 'three';

export class GameScene extends BaseScene {
    constructor(game) {
        super(game);
        this.conductor = new Conductor(this.game.audioManager);
        this.particleSystem = null;
        this.noteFactory = null;
        this.scoreManager = null;
        this.inputHandler = null;
        this.trackManager = null;
        this.backgroundManager = null;
        this.bossManager = null;
        this.comboFireManager = null;
        this.warpManager = null;
        this.replayManager = null;
        this.multiplayerManager = null;
        this.ghostScoreManager = null;
        this.ghostNoteFactory = null;
        this.ghostInputHandler = null;
        this.ghostReplayManager = null;
        this.boundKeyDown = null;
        this.recordedNotes = [];
        this.lastRewindTime = -10;
        this.slowMoActive = false;
        this.slowMoTimer = 0;
        this.slowMoCooldown = 0;
        this.swapTimer = 0;
        this.isSwapped = false;
        this.feverActive = false;
        this.touchLayer = null;
        this.twitchChat = null;
        this.chatTimer = 0;
        this.hudManager = null;
        this.isEnding = false;
    }

    async init() {
        this.scene.background = new THREE.Color(0x000000);
        
        this.setupCamera();
        this.createEnvironment();
        this.initializeSystems();
        this.setupInput();
        this.setupChart();
        this.createTwitchChat();

        if (this.game.selectedSong) {
            await this.loadSong();
        }

        if (this.hudManager) {
            this.hudManager.showStartSequence();
        }

        return Promise.resolve();
    }

    setupCamera() {
        // Gameplay Camera (Angled Top-Down)
        if (this.game.isMobile) {
            // Portrait Mode Adjustment: Higher and further back to see the track
            this.camera.position.set(0, 6, 10);
            this.camera.lookAt(0, 0, -15);
        } else {
            this.camera.position.set(0, 4, 6);
            this.camera.lookAt(0, 0, -10);
        }

        // VR Support
        if (this.game.renderer.xr.isPresenting) {
            const userGroup = new THREE.Group();
            // Position user so the track (starts at 0, goes to -50) is in front
            userGroup.position.set(0, 0, 6);
            
            // In VR, the camera is automatically updated by the headset pose relative to its parent
            userGroup.add(this.camera);
            this.scene.add(userGroup);
            
            this.setupVRControllers(userGroup);
        }
    }

    setupVRControllers(userGroup) {
        const controller1 = this.game.renderer.xr.getController(0);
        const controller2 = this.game.renderer.xr.getController(1);
        
        // Simple mapping: Triggers simulate keys
        const onSelectStart = (event) => {
            // Map Right Controller (usually index 0) to Lane 2 (KeyJ)
            // Map Left Controller (usually index 1) to Lane 1 (KeyF)
            const isRight = event.target === controller1;
            const code = isRight ? 'KeyJ' : 'KeyF';
            window.dispatchEvent(new KeyboardEvent('keydown', { code: code }));
            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: code })), 50);
        };

        controller1.addEventListener('selectstart', onSelectStart);
        controller2.addEventListener('selectstart', onSelectStart);
        
        userGroup.add(controller1);
        userGroup.add(controller2);
        
        // Visual Ray
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
        const line = new THREE.Line(geometry);
        line.scale.z = 5;
        
        controller1.add(line.clone());
        controller2.add(line.clone());
    }

    createEnvironment() {
        this.trackManager = new TrackManager(this.scene, this.game);
        this.backgroundManager = new BackgroundManager(this.scene, this.game);
        this.comboFireManager = new ComboFireManager(this.camera);
        this.warpManager = new WarpManager(this.camera);

        if (this.game.customBackgroundShader) {
            this.backgroundManager.setCustomShader(this.game.customBackgroundShader);
        } else if (this.game.selectedSong && this.game.selectedSong.theme) {
            this.backgroundManager.setTheme(this.game.selectedSong.theme);
        }
    }

    initializeSystems() {
        this.particleSystem = new ParticleSystem(this.scene, this.game);
        this.scoreManager = new ScoreManager(this.game, this.game.settings.drainRate);
        this.replayManager = new ReplayManager();
        this.noteFactory = new NoteFactory(this.scene, this.scoreManager, this.particleSystem, this.game.settings.noteSpeed);
        this.inputHandler = new InputHandler(this.noteFactory, this.conductor, this.game, this.replayManager);
        this.bossManager = new BossManager(this.scene);
        this.scoreManager.setConductor(this.conductor);
        this.scoreManager.setNoteFactory(this.noteFactory);
        this.noteFactory.setConductor(this.conductor);
        this.hudManager = new HUDManager(this.game, this.scoreManager);
        this.scoreManager.setHUDManager(this.hudManager);

        // Hook ParticleSystem to damage Boss on explosion (Note Hit)
        const originalSpawn = this.particleSystem.spawnExplosion.bind(this.particleSystem);
        this.particleSystem.spawnExplosion = (pos, color) => {
            originalSpawn(pos, color);
            if (this.bossManager.active) this.bossManager.takeDamage(2);
        };

        // Hook ScoreManager for Twitch Chat Reactions
        const originalJudge = this.scoreManager.judge.bind(this.scoreManager);
        this.scoreManager.judge = (diff) => {
            originalJudge(diff);
            if (this.scoreManager.combo > 0 && this.scoreManager.combo % 50 === 0) {
                this.triggerChatReaction('combo');
                this.game.gamepadManager.vibrate(200, 0.5, 0.5); // Haptic on combo milestone
            }
        };

        const originalMiss = this.scoreManager.registerMiss.bind(this.scoreManager);
        this.scoreManager.registerMiss = () => {
            originalMiss();
            this.triggerChatReaction('miss');
            this.game.gamepadManager.vibrate(300, 1.0, 1.0); // Strong haptic on miss
        };

        if (this.game.isMultiplayer) {
            this.multiplayerManager = new MultiplayerManager(this.game, this.scoreManager);
            if (this.game.isSpectator) this.multiplayerManager.setSpectatorMode(true);
            this.multiplayerManager.connect();
            this.scoreManager.setMultiplayerManager(this.multiplayerManager);
        }

        if (this.game.isReplay && this.game.replayData) {
            this.replayManager.startPlayback(this.game.replayData);
        } else {
            this.replayManager.startRecording();
        }

        if (this.game.isGhostMode && this.game.replayData) {
            this.ghostScoreManager = new ScoreManager(this.game, 0, true);
            this.ghostScoreManager.setConductor(this.conductor);
            this.ghostNoteFactory = new NoteFactory(this.scene, this.ghostScoreManager, this.particleSystem, this.game.settings.noteSpeed, true);
            this.ghostScoreManager.setNoteFactory(this.ghostNoteFactory);
            this.ghostNoteFactory.setConductor(this.conductor);
            this.ghostReplayManager = new ReplayManager();
            this.ghostReplayManager.startPlayback(this.game.replayData);
            this.ghostInputHandler = new InputHandler(this.ghostNoteFactory, this.conductor, this.game, null);
            if (!this.multiplayerManager) this.multiplayerManager = new MultiplayerManager(this.game, this.scoreManager);
            this.multiplayerManager.createUI(); // Ensure UI exists
            this.ghostScoreManager.setMultiplayerManager(this.multiplayerManager);
        }
    }

    setupInput() {
        if (this.game.isSpectator) return; // Disable input for spectator

        if (this.game.isMobile) this.setupTouchControls();

        this.boundKeyDown = (e) => {
            if (e.code === 'Escape') this.game.togglePause(this.conductor);
            
            // Rewind Mechanic (Backspace)
            if (e.code === 'Backspace' && this.conductor.songPosition - this.lastRewindTime > 5) {
                const newTime = Math.max(0, this.conductor.songPosition - 3.0);
                this.conductor.setTime(newTime);
                this.noteFactory.resetToTime(newTime);
                this.lastRewindTime = newTime;
                this.game.triggerGlitch(); // Visual feedback
            }

            // Slow Motion Power-up (Shift)
            if (e.key === 'Shift' && this.slowMoCooldown <= 0 && !this.slowMoActive) {
                this.slowMoActive = true;
                this.slowMoTimer = 3.0; // 3 seconds duration
            }
        };
        window.addEventListener(EVENTS.KEY_DOWN, this.boundKeyDown);
    }

    setupTouchControls() {
        this.touchLayer = document.createElement('div');
        Object.assign(this.touchLayer.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            zIndex: '999', display: 'flex' // Increased zIndex to be on top of everything
        });

        const keys = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
        
        keys.forEach((code, index) => {
            const zone = document.createElement('div');
            Object.assign(zone.style, {
                flex: '1', height: '100%', 
                touchAction: 'none', // Prevent scrolling
                webkitTapHighlightColor: 'transparent',
                borderRight: index < 3 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                position: 'relative'
            });

            // Visual Indicator
            const indicator = document.createElement('div');
            Object.assign(indicator.style, {
                position: 'absolute', bottom: '20px', left: '10%', width: '80%', height: '20%',
                border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.2)', pointerEvents: 'none', transition: 'all 0.1s'
            });
            zone.appendChild(indicator);

            const laneIndex = keys.indexOf(code);

            zone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.inputHandler.handleInput(code, true); // Direct call
                indicator.style.background = 'rgba(0, 243, 255, 0.3)';
                indicator.style.borderColor = '#00f3ff';
                indicator.style.boxShadow = '0 0 20px #00f3ff';
                if (this.hudManager) this.hudManager.triggerKey(laneIndex, true);
            });

            zone.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.inputHandler.handleInput(code, false); // Direct call
                indicator.style.background = 'rgba(0, 0, 0, 0.2)';
                indicator.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                indicator.style.boxShadow = 'none';
            });
            
            zone.addEventListener('touchcancel', (e) => { 
                e.preventDefault(); 
                this.inputHandler.handleInput(code, false); // Direct call
                indicator.style.background = 'rgba(0, 0, 0, 0.2)';
                indicator.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                indicator.style.boxShadow = 'none';
                if (this.hudManager) this.hudManager.triggerKey(laneIndex, false);
            });

            this.touchLayer.appendChild(zone);
        });

        document.getElementById('ui-layer').appendChild(this.touchLayer);
    }

    createTwitchChat() {
        this.twitchChat = document.createElement('div');
        Object.assign(this.twitchChat.style, {
            position: 'absolute', bottom: '20px', right: '20px',
            width: '250px', height: '300px', overflowY: 'hidden',
            background: 'rgba(0, 0, 0, 0.5)', border: '1px solid #333',
            fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#fff',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '10px', pointerEvents: 'none', zIndex: '50'
        });
        document.getElementById('ui-layer').appendChild(this.twitchChat);
        this.addChatMessage('System', 'Connected to chat...', '#00ff00');

        // Zen Mode: Hide Chat
        if (this.game.settings.zenMode || this.game.isMobile) {
            this.twitchChat.style.display = 'none';
        }
    }

    addChatMessage(user, text, color = '#fff') {
        if (!this.twitchChat) return;
        const msg = document.createElement('div');
        msg.style.marginBottom = '4px';
        msg.style.textShadow = '1px 1px 0 #000';
        msg.innerHTML = `<span style="color:${color}; font-weight:bold;">${user}:</span> ${text}`;
        this.twitchChat.appendChild(msg);
        if (this.twitchChat.children.length > 15) {
            this.twitchChat.removeChild(this.twitchChat.firstChild);
        }
    }

    triggerChatReaction(type) {
        const users = ['NeonRider', 'Glitch', 'CyberPunk', 'TronLive', 'BeatMaster', 'PixelGod'];
        const user = users[Math.floor(Math.random() * users.length)];
        const color = `hsl(${Math.random() * 360}, 100%, 70%)`;
        
        let msgs = [];
        if (type === 'combo') msgs = ['POG', 'Insane!', 'Go go go!', '🔥🔥🔥', 'Unreal!', 'Combo!!'];
        if (type === 'miss') msgs = ['F', 'RIP', 'LUL', 'Choke', 'Noooo', 'Reset?'];
        
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        this.addChatMessage(user, msg, color);
    }

    setupChart() {
        if (this.game.customChart) {
            this.noteFactory.loadChart(this.game.customChart);
            this.game.customChart = null;
        } else if (this.game.selectedSong && this.game.selectedSong.chart) {
            this.noteFactory.loadChart(this.game.selectedSong.chart);
        } else if (this.game.isEditor) {
            this.recordedNotes = [];
            this.inputHandler.setEditorCallback((code, isDown) => {
                if (!isDown) return;
                const keyMap = { 'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3 };
                if (keyMap.hasOwnProperty(code) && this.hudManager) {
                    this.hudManager.triggerKey(keyMap[code], true);
                    setTimeout(() => this.hudManager.triggerKey(keyMap[code], false), 100);
                }
                
                if (keyMap.hasOwnProperty(code)) {
                    const note = { time: parseFloat(this.conductor.songPosition.toFixed(3)), lane: keyMap[code] };
                    this.recordedNotes.push(note);
                    console.log(`Recorded:`, note);
                }
            });
        } else {
            // Mock Chart Data
            const mockChart = { notes: [] };
            for (let i = 0; i < 50; i++) {
                mockChart.notes.push({
                    time: 2.0 + (i * 0.5), // Note every 0.5s starting at 2s
                    lane: Math.floor(Math.random() * 4),
                    duration: Math.random() > 0.8 ? 1.0 : 0 // 20% chance of hold note
                });
            }
            this.noteFactory.loadChart(mockChart);
        }

        // Hook Input Handler for Key Overlay
        const originalHandleInput = this.inputHandler.handleInput.bind(this.inputHandler);
        this.inputHandler.handleInput = (code, isDown) => {
            originalHandleInput(code, isDown);
            const keyMap = { 'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3 };
            if (keyMap.hasOwnProperty(code) && this.hudManager) {
                this.hudManager.triggerKey(keyMap[code], isDown);
            }
        };

        if (this.ghostNoteFactory) {
            this.ghostNoteFactory.loadChart(this.noteFactory.chart); // Load same chart
        }
    }

    setFever(active) {
        this.feverActive = active;
    }

    async loadSong() {
        try {
            await this.game.audioManager.loadSong(this.game.selectedSong.src);
            
            // Update duration to match actual audio buffer duration
            if (this.game.audioManager.audioBuffer) {
                this.game.selectedSong.duration = this.game.audioManager.audioBuffer.duration;
            }

            // Extract timing points from chart if available
            const timingPoints = this.game.selectedSong.chart ? this.game.selectedSong.chart.timingPoints : [];
            this.conductor.start(this.game.selectedSong.bpm, this.game.settings.offset, timingPoints);
            
            if (this.game.isPractice) {
                this.conductor.setTime(this.game.practiceSettings.start);
                this.conductor.setPlaybackRate(this.game.practiceSettings.speed);
            }
            this.game.currentState = GAME_STATE.PLAYING;
        } catch (e) {
            console.error("Failed to start game:", e);
        }
    }

    update(delta, time) {
        if (this.game.currentState !== GAME_STATE.PLAYING) return;

        // Poll Gamepad Input
        this.game.gamepadManager.update();

        // Handle Slow Motion
        if (this.slowMoActive) {
            this.conductor.setPlaybackRate(0.5);
            this.slowMoTimer -= delta; // Delta is real-time, so timer counts down in real-time
            if (this.slowMoTimer <= 0) {
                this.slowMoActive = false;
                this.conductor.setPlaybackRate(1.0);
                this.slowMoCooldown = 10.0; // 10 seconds cooldown
            }
        } else {
            if (this.slowMoCooldown > 0) {
                this.slowMoCooldown -= delta;
            }
        }

        this.conductor.update();

        if (this.game.isPractice) {
            if (this.conductor.songPosition >= this.game.practiceSettings.end) {
                this.conductor.setTime(this.game.practiceSettings.start);
                this.noteFactory.resetToTime(this.game.practiceSettings.start);
            }
        }
        
        if (this.game.isSpectator && this.multiplayerManager) {
            // Keep sending dummy updates to trigger the mock socket response for spectator UI
            this.multiplayerManager.sendUpdate(0, 0);
        }

        if (this.game.isReplay) this.replayManager.update(this.conductor.songPosition, this.inputHandler);

        if (this.game.isGhostMode && this.ghostReplayManager) {
            this.ghostReplayManager.update(this.conductor.songPosition, this.ghostInputHandler);
            this.ghostNoteFactory.update(this.conductor.songPosition, delta);
        }
        
        if (time > 10 && !this.bossManager.active) this.bossManager.activate();
        this.bossManager.update(delta, time, this.camera);

        this.swapTimer += delta;
        if (this.swapTimer > 10.0) {
            this.isSwapped = !this.isSwapped;
            this.noteFactory.setSwapState(this.isSwapped);
            this.swapTimer = 0;
        }

        // Update Shaders
        const beat = this.conductor.getBeat();
        const pulse = Math.pow(Math.sin(beat * Math.PI), 2.0); // Sharp pulse
        
        this.noteFactory.update(this.conductor.songPosition, delta, pulse);
        
        this.trackManager.update(time, pulse, this.feverActive);
        this.backgroundManager.update(time, beat, this.feverActive);
        this.comboFireManager.update(time, this.scoreManager.combo);
        this.warpManager.update(time, this.slowMoActive);
        
        if (this.hudManager) this.hudManager.update(delta, this.conductor.songPosition, this.game.selectedSong ? this.game.selectedSong.duration : 1);

        // Focus Mode: Darken Background
        if (this.game.settings.focusMode && this.backgroundManager.mesh) {
            this.backgroundManager.mesh.material.uniforms.uColor.value.multiplyScalar(0.3);
        }

        // Zen Mode: Hide Boss UI
        if (this.game.settings.zenMode && this.bossManager.healthBar) {
            this.bossManager.healthBar.style.display = 'none';
        }
        if (this.game.settings.zenMode && this.hudManager && this.hudManager.container) {
            this.hudManager.container.style.display = 'none';
        }

        // Random Twitch Chat
        this.chatTimer += delta;
        if (this.chatTimer > 2.0 + Math.random() * 3.0) {
            this.chatTimer = 0;
            const users = ['Viewer1', 'Guest', 'Bot', 'Fan123', 'Lurker'];
            const msgs = ['Hype', 'Nice music', '!sr', 'Hello', 'PogChamp', 'Lag?', 'What song?', 'Cool visuals'];
            this.addChatMessage(users[Math.floor(Math.random()*users.length)], msgs[Math.floor(Math.random()*msgs.length)], '#aaa');
        }

        // Check Song End
        if (!this.isEnding && this.game.selectedSong && this.conductor.songPosition > this.game.selectedSong.duration) {
            this.isEnding = true;
            if (this.game.isEditor) {
                console.log("CHART JSON OUTPUT:", JSON.stringify({ notes: this.recordedNotes }));
                alert("Song ended. Check console for JSON output.");
            }
            if (!this.game.isReplay) this.game.replayData = this.replayManager.recording;
            
            // Trigger Level Complete Animation then Game Over
            const onComplete = () => this.game.gameOver(this.scoreManager.getStats());
            if (this.hudManager) this.hudManager.showLevelComplete().then(onComplete);
            else onComplete();
        }
    }

    dispose() {
        this.game.audioManager.stopSong();
        window.removeEventListener(EVENTS.KEY_DOWN, this.boundKeyDown);
        if (this.touchLayer) this.touchLayer.remove();
        if (this.twitchChat) this.twitchChat.remove();
        if (this.inputHandler) this.inputHandler.dispose();
        if (this.scoreManager) this.scoreManager.dispose();
        if (this.backgroundManager) this.backgroundManager.dispose();
        if (this.bossManager) this.bossManager.dispose();
        if (this.trackManager) this.trackManager.dispose();
        if (this.comboFireManager) this.comboFireManager.dispose();
        if (this.warpManager) this.warpManager.dispose();
        if (this.multiplayerManager) this.multiplayerManager.dispose();
        if (this.ghostInputHandler) this.ghostInputHandler.dispose();
        if (this.hudManager) this.hudManager.dispose();
        super.dispose();
    }
}