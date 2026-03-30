import { SCENE_NAMES } from '../../utils/constants.js';

export class ToolsPanel {
    constructor(menu) {
        this.menu = menu;
    }

    render(container, L) {
        container.innerHTML = '';
        const m = this.menu;

        const editorBtn = m.createMenuButton(L.get('EDITOR'), () => m.openEditorSongSelect(), '#888', true);
        container.appendChild(editorBtn);

        const rhythmBtn = m.createMenuButton(L.get('RHYTHM_EDITOR'), () => m.startRhythmEditor(), 'var(--primary-color)', true);
        container.appendChild(rhythmBtn);

        const replayEditBtn = m.createMenuButton(L.get('REPLAY_EDITOR'), () => m.game.sceneManager.switchScene('REPLAY_EDITOR'), '#ff00ff', true);
        container.appendChild(replayEditBtn);

        const vizBtn = m.createMenuButton(L.get('VISUALIZER'), () => m.startVisualizer(), '#aa00ff');
        container.appendChild(vizBtn);

        const jukeBtn = m.createMenuButton(L.get('JUKEBOX'), () => m.game.sceneManager.switchScene(SCENE_NAMES.JUKEBOX), 'var(--primary-color)');
        container.appendChild(jukeBtn);

        const shaderBtn = m.createMenuButton('LOAD SHADER', () => m.triggerShaderUpload(), '#aa00aa');
        container.appendChild(shaderBtn);

        const dropHint = document.createElement('div');
        dropHint.innerText = 'DROP MP3 TO AUTO-GENERATE | DROP GLSL FOR BG';
        Object.assign(dropHint.style, {
            marginTop: '20px', color: '#555', fontSize: '0.8em', border: '1px dashed #333', padding: '10px', textAlign: 'center'
        });
        container.appendChild(dropHint);
    }
}
