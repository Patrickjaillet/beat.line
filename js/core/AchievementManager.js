export class AchievementManager {
    constructor(game) {
        this.game = game;
        this.definitions = [
            { id: 'first_clear', title: 'First Blood', desc: 'Clear your first song' },
            { id: 'combo_50', title: 'Flow State', desc: 'Reach 50 Combo' },
            { id: 'combo_100', title: 'Unstoppable', desc: 'Reach 100 Combo' },
            { id: 'score_100k', title: 'High Roller', desc: 'Score 100,000 points in one game' },
            { id: 'perfect_start', title: 'Sharp Shooter', desc: 'Get a Perfect judgment' }
        ];
        this.ui = null;
        this.createUI();
    }

    createUI() {
        this.ui = document.createElement('div');
        Object.assign(this.ui.style, {
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            width: '400px', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: '1000'
        });
        document.getElementById('ui-layer').appendChild(this.ui);
    }

    unlock(id) {
        const profile = this.game.profileManager;
        if (profile.data.achievements && profile.data.achievements.includes(id)) return;

        if (!profile.data.achievements) profile.data.achievements = [];
        profile.data.achievements.push(id);
        profile.save();

        const def = this.definitions.find(d => d.id === id);
        if (def) this.showNotification(def);
    }

    showNotification(def) {
        const el = document.createElement('div');
        Object.assign(el.style, {
            background: 'rgba(0, 243, 255, 0.8)', color: '#000', padding: '15px',
            border: '2px solid #fff', fontFamily: 'Orbitron, sans-serif',
            boxShadow: '0 0 20px #00f3ff', opacity: '0', transition: 'opacity 0.5s',
            textAlign: 'center'
        });
        el.innerHTML = `<div style="font-weight:bold">${def.title}</div><div style="font-size:0.8em">${def.desc}</div>`;
        
        this.ui.appendChild(el);
        requestAnimationFrame(() => el.style.opacity = '1');
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 500);
        }, 3000);
    }

    checkCombo(combo) { if (combo >= 50) this.unlock('combo_50'); if (combo >= 100) this.unlock('combo_100'); }
    checkScore(score) { if (score >= 100000) this.unlock('score_100k'); }
    checkJudgment(type) { if (type === 'perfect') this.unlock('perfect_start'); }
}