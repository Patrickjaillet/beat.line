export class ProfilePanel {
    constructor(game) {
        this.game = game;
    }

    render(container) {
        if (!container) return;
        const data = this.game.profileManager.data;
        const L = this.game.localization;

        const xpForNext = data.level * 1000;
        const xpPct = Math.min(100, Math.max(0, (data.xp / xpForNext) * 100));

        container.innerHTML = '';

        const topRow = document.createElement('div');
        Object.assign(topRow.style, { fontSize: '1.5em', textShadow: 'var(--text-shadow)', display: 'flex', alignItems: 'center' });

        const usernameSpan = document.createElement('span');
        usernameSpan.textContent = data.username;

        const badgesSpan = document.createElement('span');
        Object.assign(badgesSpan.style, { fontSize: '0.8em', marginLeft: '10px' });
        data.badges?.forEach(b => {
            const bEl = document.createElement('span');
            bEl.title = b.id;
            Object.assign(bEl.style, { marginLeft: '5px', cursor: 'help' });
            bEl.textContent = b.icon;
            badgesSpan.appendChild(bEl);
        });

        topRow.appendChild(usernameSpan);
        topRow.appendChild(badgesSpan);

        const middleRow = document.createElement('div');
        Object.assign(middleRow.style, { fontSize: '1em', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' });

        const levelSpan = document.createElement('span');
        levelSpan.textContent = `${L.get('LEVEL')} ${data.level}`;

        const creditsSpan = document.createElement('span');
        Object.assign(creditsSpan.style, { color: '#ffd700' });
        creditsSpan.textContent = `${data.credits} CR`;

        middleRow.appendChild(levelSpan);
        middleRow.appendChild(creditsSpan);

        const progressBar = document.createElement('div');
        Object.assign(progressBar.style, { width: '250px', height: '6px', background: '#333', border: '1px solid #555', position: 'relative', marginTop: '2px' });

        const progressFill = document.createElement('div');
        Object.assign(progressFill.style, { width: `${xpPct}%`, height: '100%', background: 'var(--primary-color)', boxShadow: '0 0 5px var(--primary-color)', transition: 'width 0.5s' });

        progressBar.appendChild(progressFill);

        container.appendChild(topRow);
        container.appendChild(middleRow);
        container.appendChild(progressBar);
    }
}
