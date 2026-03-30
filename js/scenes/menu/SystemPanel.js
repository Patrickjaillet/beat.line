import { SCENE_NAMES } from '../../utils/constants.js';

export class SystemPanel {
    constructor(menu) {
        this.menu = menu;
    }

    render(container, L) {
        container.innerHTML = '';
        const m = this.menu;

        const settingsBtn = m.createMenuButton(L.get('SETTINGS'), () => m.game.sceneManager.switchScene(SCENE_NAMES.SETTINGS), '#fff');
        container.appendChild(settingsBtn);

        const vrBtn = m.createMenuButton(L.get('ENTER_VR'), () => m.game.enterVR(), '#00ff00');
        container.appendChild(vrBtn);

        const cloudBtn = m.createMenuButton(L.get('CLOUD_SYNC'), () => m.game.cloudSave(), 'var(--primary-color)');
        container.appendChild(cloudBtn);

        const credBtn = m.createMenuButton(L.get('CREDITS'), () => m.game.sceneManager.switchScene(SCENE_NAMES.CREDITS), '#fff');
        container.appendChild(credBtn);

        if (m.game.replayData) {
            const ghostBtn = m.createMenuButton('GHOST MODE', () => m.startGhostMode(), '#888888');
            container.appendChild(ghostBtn);
        }
    }
}
