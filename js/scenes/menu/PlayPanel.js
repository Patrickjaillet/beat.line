import { songList } from '../../utils/songList.js';
import { SCENE_NAMES } from '../../utils/constants.js';

export class PlayPanel {
    constructor(menu) {
        this.menu = menu;
    }

    render(container, L) {
        container.innerHTML = '';
        const m = this.menu;

        const campBtn = m.createMenuButton(L.get('CAMPAIGN'), () => m.game.sceneManager.switchScene(SCENE_NAMES.CAMPAIGN), '#00ff00');
        container.appendChild(campBtn);

        const dailyBtn = m.createMenuButton(L.get('DAILY_CHALLENGE'), () => m.startDailyChallenge(), '#ffaa00');
        container.appendChild(dailyBtn);

        const questBtn = m.createMenuButton(L.get('DAILY_QUESTS'), () => m.showQuestsUI(), '#ffaa00', true);
        container.appendChild(questBtn);

        const mpBtn = m.createMenuButton(L.get('MULTIPLAYER'), () => m.startMultiplayer(), '#ff5555');
        container.appendChild(mpBtn);

        const tourBtn = m.createMenuButton(L.get('TOURNAMENT'), () => m.game.startTournament(), '#ff00ff');
        container.appendChild(tourBtn);

        const pracBtn = m.createMenuButton(L.get('PRACTICE'), () => m.startPractice(), '#ffff00');
        container.appendChild(pracBtn);

        const tutBtn = m.createMenuButton(L.get('TUTORIAL'), () => m.game.sceneManager.switchScene(SCENE_NAMES.TUTORIAL), 'var(--primary-color)');
        container.appendChild(tutBtn);

        const divider = document.createElement('div');
        Object.assign(divider.style, { height: '2px', background: '#333', margin: '10px 0' });
        container.appendChild(divider);

        const diffContainer = document.createElement('div');
        Object.assign(diffContainer.style, { display: 'flex', gap: '10px', justifyContent: 'center' });

        ['Easy', 'Normal', 'Hard'].forEach(diff => {
            const btn = document.createElement('button');
            btn.innerText = diff;
            btn.className = 'interactive';
            Object.assign(btn.style, {
                flex: '1', padding: '10px', background: 'rgba(0,0,0,0.5)',
                border: '1px solid #333', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-family)'
            });
            btn.onclick = () => {
                m.setDifficulty(diff);
                Array.from(diffContainer.children).forEach(c => c.style.borderColor = '#333');
                btn.style.borderColor = 'var(--primary-color)';
            };
            if (diff === m.game.settings.difficulty) btn.style.borderColor = 'var(--primary-color)';
            diffContainer.appendChild(btn);
        });

        container.appendChild(diffContainer);

        const modsBtn = document.createElement('button');
        modsBtn.innerText = L.get('GAME_MODIFIERS');
        modsBtn.className = 'interactive';
        Object.assign(modsBtn.style, {
            padding: '10px', background: 'rgba(0,0,0,0.5)',
            border: '1px solid #333', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-family)',
            marginTop: '5px'
        });
        modsBtn.onclick = () => m.createModifiersUI();
        container.appendChild(modsBtn);

        m.songListContainer = document.createElement('div');
        container.appendChild(m.songListContainer);
        m.renderSongList();
    }
}
