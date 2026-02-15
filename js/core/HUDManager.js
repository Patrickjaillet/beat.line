import * as THREE from 'three';

export class HUDManager {
    constructor(game, scoreManager) {
        this.game = game;
        this.scoreManager = scoreManager;
        this.container = null;
        this.scoreEl = null;
        this.comboEl = null;
        this.healthBar = null;
        this.healthFill = null;
        this.healthText = null;
        this.multiplierEl = null;
        this.criticalOverlay = null;
        this.progressFill = null;
        this.timeLabel = null;
        this.keyOverlay = [];
        
        this.displayedScore = 0;
        this.lastCombo = 0;
        this.comboScale = 1.0;
        
        this.currentHealth = 50; // Start visual at 50 to animate to 100
        this.targetHealth = 100;
        this.shakeIntensity = 0;
        
        this.init();
    }

    init() {
        // Attempt to hide legacy UI if present
        const legacyIds = ['score-display', 'combo-display', 'health-bar', 'score-container'];
        legacyIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            pointerEvents: 'none', fontFamily: 'var(--font-family)',
            opacity: '0', transition: 'opacity 1s ease-in'
        });

        // Glassmorphism Style
        const glassStyle = {
            background: 'rgba(20, 20, 30, 0.4)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '15px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
        };

        // Score Panel (Top Left)
        const scorePanel = document.createElement('div');
        Object.assign(scorePanel.style, glassStyle, {
            position: 'absolute', top: '30px', left: '30px',
            display: 'flex', flexDirection: 'column', gap: '5px',
            minWidth: '200px'
        });
        
        const scoreLabel = document.createElement('div');
        scoreLabel.innerText = 'SCORE';
        scoreLabel.style.fontSize = '0.8em';
        scoreLabel.style.color = '#aaa';
        scoreLabel.style.letterSpacing = '2px';
        
        this.scoreEl = document.createElement('div');
        this.scoreEl.style.fontSize = '2.5em';
        this.scoreEl.style.fontWeight = 'bold';
        this.scoreEl.style.color = 'var(--primary-color)';
        this.scoreEl.style.textShadow = '0 0 15px var(--primary-color)';
        this.scoreEl.innerText = '0000000';
        
        this.multiplierEl = document.createElement('div');
        this.multiplierEl.style.fontSize = '1.2em';
        this.multiplierEl.style.color = '#fff';
        this.multiplierEl.style.marginTop = '5px';
        this.multiplierEl.innerText = 'x1';

        scorePanel.appendChild(scoreLabel);
        scorePanel.appendChild(this.scoreEl);
        scorePanel.appendChild(this.multiplierEl);
        this.container.appendChild(scorePanel);

        // Combo Panel (Center)
        this.comboEl = document.createElement('div');
        Object.assign(this.comboEl.style, {
            position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', opacity: '0', transition: 'opacity 0.2s'
        });
        
        // 3D Typography Structure
        this.comboEl.innerHTML = `
            <div id="combo-val" style="
                font-size: 7em; fontWeight: 900; color: #fff; line-height: 1;
                text-shadow: 3px 3px 0px var(--secondary-color), 6px 6px 0px rgba(0,0,0,0.5), 0 0 20px var(--primary-color);
                transform: skew(-10deg); font-family: 'Orbitron', sans-serif;
            ">0</div>
            <div style="
                font-size: 1.5em; letter-spacing: 10px; color: var(--primary-color); font-weight: bold;
                text-shadow: 0 0 10px var(--primary-color); margin-top: -10px;
            ">COMBO</div>
        `;
        this.container.appendChild(this.comboEl);

        // Health Bar (Top Right)
        const healthPanel = document.createElement('div');
        Object.assign(healthPanel.style, glassStyle, {
            position: 'absolute', top: '30px', right: '30px', width: '350px',
            display: 'flex', flexDirection: 'column', gap: '5px'
        });

        const healthLabel = document.createElement('div');
        healthLabel.innerText = 'INTEGRITY';
        healthLabel.style.fontSize = '0.8em';
        healthLabel.style.color = '#aaa';
        healthLabel.style.letterSpacing = '2px';
        healthPanel.appendChild(healthLabel);

        this.healthBar = document.createElement('div');
        Object.assign(this.healthBar.style, {
            width: '100%', height: '25px', background: 'rgba(0,0,0,0.5)',
            borderRadius: '4px', overflow: 'hidden', position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)'
        });

        this.healthFill = document.createElement('div');
        Object.assign(this.healthFill.style, {
            width: '100%', height: '100%', 
            background: 'linear-gradient(90deg, #ff3333, #ffff00, #33ff33)',
            transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', 
            width: '100%',
            boxShadow: '0 0 15px rgba(51, 255, 51, 0.5)'
        });
        
        this.healthText = document.createElement('div');
        Object.assign(this.healthText.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            textAlign: 'center', fontSize: '0.9em', lineHeight: '25px', color: '#fff',
            fontWeight: 'bold', textShadow: '1px 1px 2px #000', mixBlendMode: 'overlay'
        });

        this.healthBar.appendChild(this.healthFill);
        this.healthBar.appendChild(this.healthText);
        healthPanel.appendChild(this.healthBar);
        this.container.appendChild(healthPanel);

        // Critical Health Vignette
        this.criticalOverlay = document.createElement('div');
        Object.assign(this.criticalOverlay.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            background: 'radial-gradient(circle, transparent 50%, rgba(255, 0, 0, 0.6) 100%)',
            opacity: '0', pointerEvents: 'none', zIndex: '-1', transition: 'opacity 0.5s'
        });
        this.container.appendChild(this.criticalOverlay);

        // Progress Bar (Bottom)
        const progressContainer = document.createElement('div');
        Object.assign(progressContainer.style, {
            position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
            width: '60%', height: '4px', background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px', overflow: 'visible'
        });

        this.progressFill = document.createElement('div');
        Object.assign(this.progressFill.style, {
            width: '0%', height: '100%', background: 'var(--primary-color)',
            borderRadius: '2px', boxShadow: '0 0 10px var(--primary-color)',
            position: 'relative'
        });
        
        // Thumb/Glow at the tip
        const thumb = document.createElement('div');
        Object.assign(thumb.style, {
            position: 'absolute', right: '-4px', top: '-3px', width: '10px', height: '10px',
            background: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #fff'
        });
        this.progressFill.appendChild(thumb);

        this.timeLabel = document.createElement('div');
        Object.assign(this.timeLabel.style, {
            position: 'absolute', top: '-25px', width: '100%', textAlign: 'center',
            color: '#aaa', fontSize: '0.8em', letterSpacing: '1px', fontWeight: 'bold',
            textShadow: '1px 1px 2px #000'
        });
        this.timeLabel.innerText = "00:00 / 00:00";

        progressContainer.appendChild(this.progressFill);
        progressContainer.appendChild(this.timeLabel);
        this.container.appendChild(progressContainer);

        // Key Overlay (Bottom Center)
        if (!this.game.isMobile) {
            const keyContainer = document.createElement('div');
            Object.assign(keyContainer.style, {
                position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '10px'
            });

            for (let i = 0; i < 4; i++) {
                const key = document.createElement('div');
                Object.assign(key.style, {
                    width: '50px', height: '50px', border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px', background: 'rgba(0,0,0,0.5)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: '#fff', fontWeight: 'bold', fontSize: '1.2em',
                    transition: 'all 0.05s'
                });
                // Default labels D F J K
                const labels = ['D', 'F', 'J', 'K'];
                key.innerText = labels[i];
                
                this.keyOverlay.push(key);
                keyContainer.appendChild(key);
            }
            this.container.appendChild(keyContainer);
        }

        document.getElementById('ui-layer').appendChild(this.container);
    }

    update(delta, currentTime = 0, totalTime = 1) {
        // Update Score (Rolling)
        this.displayedScore = THREE.MathUtils.lerp(this.displayedScore, this.scoreManager.score, delta * 10);
        this.scoreEl.innerText = Math.round(this.displayedScore).toString().padStart(7, '0');
        this.multiplierEl.innerText = `x${this.scoreManager.multiplier}`;
        this.multiplierEl.style.color = this.scoreManager.multiplier >= 4 ? '#ff00ff' : '#fff';

        // Update Combo
        if (this.scoreManager.combo > this.lastCombo) {
            this.comboScale = 1.3; // Pop effect
            this.lastCombo = this.scoreManager.combo;
        } else if (this.scoreManager.combo < this.lastCombo) {
            this.lastCombo = this.scoreManager.combo;
        }
        
        this.comboScale = THREE.MathUtils.lerp(this.comboScale, 1.0, delta * 10);

        if (this.scoreManager.combo > 5) {
            const comboVal = this.comboEl.querySelector('#combo-val');
            if (comboVal) comboVal.innerText = this.scoreManager.combo;
            this.comboEl.style.opacity = '1';
            this.comboEl.style.transform = `translate(-50%, -50%) scale(${this.comboScale})`;
        } else {
            this.comboEl.style.opacity = '0';
        }

        // Update Health
        const stats = this.scoreManager.getStats ? this.scoreManager.getStats() : { health: this.scoreManager.health || 0 };
        this.targetHealth = stats.health;
        
        // Shake effect on damage
        if (this.targetHealth < this.currentHealth - 1) {
            this.shakeIntensity = 10.0;
            if (this.healthBar.parentElement) {
                this.healthBar.parentElement.animate([
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(-5px)' },
                    { transform: 'translateX(5px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 200 });
            }
        }
        
        this.currentHealth = THREE.MathUtils.lerp(this.currentHealth, this.targetHealth, delta * 5.0);
        
        this.healthFill.style.width = `${Math.max(0, this.currentHealth)}%`;
        this.healthText.innerText = `${Math.round(Math.max(0, this.currentHealth))}%`;

        // Dynamic Color & Glow
        if (this.currentHealth < 30) {
            this.healthFill.style.background = '#ff0000';
            this.healthFill.style.boxShadow = `0 0 20px #ff0000`;
        } else if (this.currentHealth < 60) {
            this.healthFill.style.background = 'linear-gradient(90deg, #ff3333, #ffff00)';
            this.healthFill.style.boxShadow = `0 0 15px #ffff00`;
        } else {
            this.healthFill.style.background = 'linear-gradient(90deg, #ff3333, #ffff00, #33ff33)';
            this.healthFill.style.boxShadow = `0 0 15px #33ff33`;
        }

        // Apply Shake to Health Bar
        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.healthBar.style.transform = `translate(${rx}px, ${ry}px)`;
            this.shakeIntensity -= delta * 20.0;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        } else {
            this.healthBar.style.transform = 'none';
        }

        // Critical Health FX
        if (this.currentHealth < 20 && this.currentHealth > 0) {
            // Pulse opacity
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
            this.criticalOverlay.style.opacity = (0.5 + pulse * 0.5).toString();
            this.game.audioManager.playHeartbeat();
        } else {
            this.criticalOverlay.style.opacity = '0';
            this.game.audioManager.stopHeartbeat();
        }

        // Update Progress Bar
        const progress = Math.min(1, Math.max(0, currentTime / totalTime));
        this.progressFill.style.width = `${progress * 100}%`;
        
        const formatTime = (t) => {
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        this.timeLabel.innerText = `${formatTime(currentTime)} / ${formatTime(totalTime)}`;
    }

    showJudgment(text, color) {
        const el = document.createElement('div');
        el.innerText = text;
        Object.assign(el.style, {
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%) scale(0.5)',
            color: color, fontSize: '3em', fontWeight: 'bold', fontFamily: 'var(--font-family)',
            textShadow: `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
            opacity: '0', pointerEvents: 'none', whiteSpace: 'nowrap'
        });

        this.container.appendChild(el);

        // Animation
        const anim = el.animate([
            { opacity: 0, transform: 'translate(-50%, -50%) scale(0.5)' },
            { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)', offset: 0.2 },
            { opacity: 1, transform: 'translate(-50%, -60%) scale(1.0)', offset: 0.8 },
            { opacity: 0, transform: 'translate(-50%, -70%) scale(0.8)' }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });

        anim.onfinish = () => el.remove();
    }

    showStartSequence() {
        requestAnimationFrame(() => {
            this.container.style.opacity = '1';
        });
    }

    showLevelComplete() {
        return new Promise(resolve => {
            const banner = document.createElement('div');
            Object.assign(banner.style, {
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
                fontSize: '6em', fontWeight: '900', color: '#fff',
                textShadow: '0 0 20px var(--primary-color), 0 0 50px var(--secondary-color), 5px 5px 0px #000',
                fontFamily: 'var(--font-family)', whiteSpace: 'nowrap',
                transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: '2000'
            });
            banner.innerText = "LEVEL COMPLETE";
            this.container.appendChild(banner);
            
            // Animate In
            requestAnimationFrame(() => banner.style.transform = 'translate(-50%, -50%) scale(1)');
            
            // Wait and resolve
            setTimeout(() => resolve(), 2500);
        });
    }

    triggerKey(lane, isDown) {
        if (this.keyOverlay[lane]) {
            const key = this.keyOverlay[lane];
            if (isDown) {
                key.style.background = 'var(--primary-color)';
                key.style.transform = 'scale(0.9)';
                key.style.boxShadow = '0 0 15px var(--primary-color)';
            } else {
                key.style.background = 'rgba(0,0,0,0.5)';
                key.style.transform = 'scale(1.0)';
                key.style.boxShadow = 'none';
            }
        }
    }

    dispose() {
        this.game.audioManager.stopHeartbeat();
        if (this.container) this.container.remove();
    }
}