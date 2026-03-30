export class CommunityPanel {
    constructor(menu) {
        this.menu = menu;
    }

    render(container, L) {
        container.innerHTML = '';
        const m = this.menu;

        const workshopBtn = m.createMenuButton(L.get('WORKSHOP'), () => m.game.sceneManager.switchScene('WORKSHOP'), '#00ffaa');
        container.appendChild(workshopBtn);

        const dlcBtn = m.createMenuButton(L.get('DLC_PACKS'), () => m.showDLCUI(), '#ff00ff');
        container.appendChild(dlcBtn);

        const socialBtn = m.createMenuButton(L.get('SOCIAL'), () => m.showSocialUI(), '#0088ff');
        container.appendChild(socialBtn);

        const specBtn = m.createMenuButton(L.get('SPECTATE'), () => m.startSpectator(), '#aaa');
        container.appendChild(specBtn);
    }
}
