export class ScoreManager {
    constructor(game, drainRate = 15, isGhost = false) {
        this.game = game;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.perfects = 0;
        this.goods = 0;
        this.misses = 0;
        this.health = 100;
        this.feverActive = false;
        this.drainRate = drainRate;
        this.ui = null;
        this.feedback = null;
        this.healthContainer = null;
        this.healthBar = null;
        this.noteFactory = null;
        this.feedbackEl = null;
        this.feedbackTimeout = null;
        this.multiplayerManager = null;
        this.hudManager = null;
        this.conductor = null;
        this.accuracyHistory = [];
        this.recentPerformance = [];
        this.isGhost = isGhost;
        if (!isGhost) this.createUI();
    }

    createUI() {
        this.ui = document.createElement('div');
        this.ui.className = 'score-container hud-text';
        this.ui.innerHTML = `
            <div class="score-label">Score</div>
            <div class="score-value" id="score">000000</div>
            <div class="combo-container" id="combo-box">
                <div class="combo-value" id="combo">0</div>
                <div class="combo-label">COMBO</div>
            </div>
        `;
        
        this.feedback = document.createElement('div');
        this.feedback.className = 'feedback-container hud-text';
        this.feedback.innerHTML = `<div class="feedback-text" id="feedback-item"></div>`;
        
        this.healthContainer = document.createElement('div');
        this.healthContainer.className = 'health-wrapper';

        this.healthBar = document.createElement('div');
        this.healthBar.className = 'health-fill';

        this.healthContainer.appendChild(this.healthBar);

        document.getElementById('ui-layer').appendChild(this.ui);
        document.getElementById('ui-layer').appendChild(this.feedback);
        document.getElementById('ui-layer').appendChild(this.healthContainer);
        
        this.feedbackEl = this.feedback.querySelector('#feedback-item');
    }

    setNoteFactory(noteFactory) {
        this.noteFactory = noteFactory;
    }

    setConductor(conductor) {
        this.conductor = conductor;
    }

    setMultiplayerManager(mp) {
        this.multiplayerManager = mp;
    }

    setHUDManager(hud) {
        this.hudManager = hud;
    }

    judge(diff) {
        const absDiff = Math.abs(diff);
        const time = this.conductor ? this.conductor.songPosition : 0;
        if (absDiff < 0.05) {
            this.perfects++;
            this.addHit(300);
            if (this.hudManager) this.hudManager.showJudgment('PERFECT', '#00ffff');
            this.accuracyHistory.push({ time, diff, type: 'perfect' });
            this.game.achievementManager.checkJudgment('perfect');
            this.updateDynamicDifficulty(1);
        } else if (absDiff < 0.15) {
            this.goods++;
            this.addHit(100);
            if (this.hudManager) this.hudManager.showJudgment('GOOD', '#00ff00');
            this.accuracyHistory.push({ time, diff, type: 'good' });
            this.updateDynamicDifficulty(0.5);
        } else {
            this.registerMiss();
        }
    }

    addHit(points) {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        
        if (this.combo === 50) this.activateFever();

        let multiplier = 1 + Math.floor(this.combo / 10);
        if (this.feverActive) multiplier *= 2;

        if (this.game.isDailyChallenge) points += 50; // Bonus points for daily challenge

        this.score += points * multiplier;
        this.health = Math.min(100, this.health + 2);
        this.updateHealthUI();

        if (this.combo > 0 && this.combo % 50 === 0 && this.noteFactory) {
            this.noteFactory.spawnComboBurst();
            if (!this.feverActive) this.game.triggerShake(0.5);
        }
        this.updateUI();
        if (this.multiplayerManager && !this.isGhost) this.multiplayerManager.sendUpdate(this.score, this.combo);
        this.game.achievementManager.checkCombo(this.combo);
        this.game.achievementManager.checkScore(this.score);
    }

    registerMiss() {
        this.combo = 0;
        this.misses++;
        const time = this.conductor ? this.conductor.songPosition : 0;
        this.accuracyHistory.push({ time: time, diff: null, type: 'miss' });
        this.updateDynamicDifficulty(-1);
        this.deactivateFever();
        this.health = Math.max(0, this.health - this.drainRate);
        this.updateHealthUI();

        if (this.hudManager) this.hudManager.showJudgment('MISS', '#ff0000');
        this.game.triggerGlitch();
        this.game.triggerShake(0.8);
        this.updateUI();

        if (this.health <= 0 && !this.isGhost) {
            this.game.gameOver(this.getStats());
        }
        if (this.multiplayerManager && !this.isGhost) this.multiplayerManager.sendUpdate(this.score, this.combo);
    }

    updateDynamicDifficulty(val) {
        if (!this.game.settings.dynamicDifficulty) return;
        
        this.recentPerformance.push(val);
        if (this.recentPerformance.length > 10) this.recentPerformance.shift();
        
        const avg = this.recentPerformance.reduce((a, b) => a + b, 0) / this.recentPerformance.length;
        
        // Adjust Speed (Clamped 10-50)
        if (avg > 0.8) this.game.settings.noteSpeed = Math.min(50, this.game.settings.noteSpeed + 0.1);
        else if (avg < 0) this.game.settings.noteSpeed = Math.max(10, this.game.settings.noteSpeed - 0.2);
        
    }

    activateFever() {
        this.feverActive = true;
        this.game.setFever(true);
        this.showFeedback('FEVER MODE!', '#ff00ff');
    }

    deactivateFever() {
        if (!this.feverActive) return;
        this.feverActive = false;
        this.game.setFever(false);
    }

    showFeedback(text, color) {
        if (this.hudManager) return; // Use HUDManager if available
        const el = this.feedbackEl;
        el.innerText = text;
        el.style.color = color;
        
        el.classList.remove('pop');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('pop');
        
        if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => el.classList.remove('pop'), 500);
    }

    updateUI() {
        if (this.isGhost && this.multiplayerManager) { this.multiplayerManager.updateOpponent(this.score, this.combo); return; }
        if (!this.ui) return;
        this.ui.querySelector('#score').innerText = this.score.toString().padStart(6, '0');
        this.ui.querySelector('#combo').innerText = this.combo;
        const comboBox = this.ui.querySelector('#combo-box');
        comboBox.style.opacity = this.combo > 5 ? '1' : '0';
    }

    updateHealthUI() {
        if (this.healthBar) {
            this.healthBar.style.width = `${this.health}%`;
            this.healthBar.className = 'health-fill';
            if (this.health <= 20) this.healthBar.classList.add('danger');
            else if (this.health <= 50) this.healthBar.classList.add('warning');
        }
    }

    getStats() {
        return { 
            score: this.score, 
            maxCombo: this.maxCombo,
            perfects: this.perfects,
            goods: this.goods,
            misses: this.misses,
            accuracyHistory: this.accuracyHistory,
            health: this.health
        };
    }

    dispose() {
        if (this.ui) this.ui.remove();
        if (this.feedback) this.feedback.remove();
        if (this.healthContainer) this.healthContainer.remove();
    }
}