export class SceneManager {
    constructor(game) {
        this.game = game;
        this.scenes = {};
        this.currentScene = null;
        this.overlay = null;
        this.isTransitioning = false;
        this.createTransitionOverlay();
    }

    createTransitionOverlay() {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: '#000', zIndex: '9999', transform: 'translateX(-105%)',
            borderRight: '4px solid #00f3ff',
            boxShadow: '5px 0 50px rgba(0, 243, 255, 0.6)',
            pointerEvents: 'none'
        });
        document.body.appendChild(this.overlay);
    }

    register(key, SceneClass) {
        this.scenes[key] = SceneClass;
    }

    async switchScene(key) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Wipe In
        await this.runTransition('in');

        if (this.currentScene) {
            this.currentScene.dispose();
            this.currentScene = null;
        }

        const SceneClass = this.scenes[key];
        if (SceneClass) {
            this.currentScene = new SceneClass(this.game);
            await this.currentScene.init();
        }

        // Wipe Out
        await this.runTransition('out');
        this.isTransitioning = false;
    }

    runTransition(dir) {
        return new Promise(resolve => {
            this.overlay.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
            this.overlay.style.pointerEvents = 'auto';
            
            if (dir === 'in') {
                this.overlay.style.transform = 'translateX(0%)';
                setTimeout(resolve, 400);
            } else {
                this.overlay.style.transform = 'translateX(105%)';
                setTimeout(() => {
                    this.overlay.style.transition = 'none';
                    this.overlay.style.transform = 'translateX(-105%)';
                    this.overlay.style.pointerEvents = 'none';
                    resolve();
                }, 400);
            }
        });
    }

    update(delta, time) {
        if (this.currentScene) {
            this.currentScene.update(delta, time);
        }
    }

    resize(width, height) {
        if (this.currentScene) {
            this.currentScene.resize(width, height);
        }
    }

    get activeScene() {
        return this.currentScene;
    }
}