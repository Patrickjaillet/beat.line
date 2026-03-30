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
        this.noteFactory = null;
        this.multiplayerManager = null;
        this.hudManager = null;
        this.conductor = null;
        this.accuracyHistory = [];
        this.recentPerformance = [];
        this.isGhost = isGhost;
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

        if (this.combo > 0 && this.combo % 50 === 0 && this.noteFactory) {
            this.noteFactory.spawnComboBurst();
            if (!this.feverActive) this.game.triggerShake(0.5);
        }

        // Boss battle damage interaction
        const activeScene = this.game.sceneManager?.activeScene;
        if (activeScene && activeScene.bossManager?.active) {
            activeScene.bossManager.takeDamage(1);
        }

        if (this.game?.eventBus) {
            this.game.eventBus.emit('scoreUpdated', { score: this.score, combo: this.combo });
            this.game.eventBus.emit('comboUpdated', { combo: this.combo });
        }
        if (this.multiplayerManager && !this.isGhost) this.multiplayerManager.sendUpdate(this.score, this.combo);
        this.game.achievementManager.checkCombo(this.combo);
        this.game.achievementManager.checkScore(this.score);
    }

    get multiplier() {
        const base = 1 + Math.floor(this.combo / 10);
        return base * (this.feverActive ? 2 : 1);
    }

    registerMiss() {
        this.combo = 0;
        this.misses++;
        const time = this.conductor ? this.conductor.songPosition : 0;
        this.accuracyHistory.push({ time: time, diff: null, type: 'miss' });
        this.updateDynamicDifficulty(-1);
        this.deactivateFever();
        this.health = Math.max(0, this.health - this.drainRate);

        if (this.hudManager) this.hudManager.showJudgment('MISS', '#ff0000');
        if (this.game && typeof this.game.triggerGlitch === 'function') this.game.triggerGlitch();
        if (this.game && typeof this.game.triggerShake === 'function') this.game.triggerShake(0.8);

        // Emission d'événements pour dé-couplage et testabilité
        if (this.game?.eventBus) {
            this.game.eventBus.emit('scoreUpdated', { score: this.score, combo: this.combo });
            this.game.eventBus.emit('healthUpdated', { health: this.health });
        }

        if (this.health <= 0 && !this.isGhost && !this.game.modifiers?.noFail) {
            if (this.game?.eventBus) this.game.eventBus.emit('healthDepleted', { score: this.score, combo: this.combo });
        }

        if (this.multiplayerManager && !this.isGhost) this.multiplayerManager.sendUpdate(this.score, this.combo);
    }

    updateDynamicDifficulty(val) {
        if (!this.game || !this.game.settings || !this.game.settings.dynamicDifficulty) return;
        
        this.recentPerformance.push(val);
        if (this.recentPerformance.length > 10) this.recentPerformance.shift();
        
        const avg = this.recentPerformance.reduce((a, b) => a + b, 0) / this.recentPerformance.length;
        
        // Adjust Speed (Clamped 10-50)
        if (avg > 0.8) this.game.settings.noteSpeed = Math.min(50, this.game.settings.noteSpeed + 0.1);
        else if (avg < 0) this.game.settings.noteSpeed = Math.max(10, this.game.settings.noteSpeed - 0.2);
        
    }

    activateFever() {
        this.feverActive = true;
        if (this.game && typeof this.game.setFever === 'function') {
            this.game.setFever(true);
        }
        this.showFeedback('FEVER MODE!', '#ff00ff');
    }

    deactivateFever() {
        if (!this.feverActive) return;
        this.feverActive = false;
        if (this.game && typeof this.game.setFever === 'function') {
            this.game.setFever(false);
        }
    }

    showFeedback(text, color) {
        if (this.hudManager && typeof this.hudManager.showJudgment === 'function') {
            this.hudManager.showJudgment(text, color);
            return;
        }
        if (this.game && typeof this.game.showToast === 'function') {
            this.game.showToast(text, 'info', 800);
        }
    }

    addBonus(points) {
        this.score += points;
        this.updateUI();
        if (this.multiplayerManager && !this.isGhost) this.multiplayerManager.sendUpdate(this.score, this.combo);
        if (this.game && this.game.achievementManager) this.game.achievementManager.checkScore(this.score);
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