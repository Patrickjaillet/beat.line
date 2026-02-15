export const THEMES = {
    CYBER: {
        name: 'CYBER',
        primary: '#00f3ff',
        secondary: '#ff00ff',
        bg: '#050505',
        font: 'Orbitron, sans-serif',
        shadow: '0 0 10px #00f3ff'
    },
    RETRO: {
        name: 'RETRO',
        primary: '#ffcc00',
        secondary: '#ff0055',
        bg: '#220033',
        font: 'monospace',
        shadow: '2px 2px 0px #ff0055'
    },
    ZEN: {
        name: 'ZEN',
        primary: '#ffffff',
        secondary: '#aaaaaa',
        bg: '#333333',
        font: 'Arial, sans-serif',
        shadow: 'none'
    },
    MATRIX: {
        name: 'MATRIX',
        primary: '#00ff00',
        secondary: '#003300',
        bg: '#000000',
        font: 'Courier New, monospace',
        shadow: '0 0 5px #00ff00'
    }
};

export class ThemeManager {
    constructor(game) {
        this.game = game;
        this.currentTheme = 'CYBER';
    }

    applyTheme(themeName) {
        const theme = THEMES[themeName] || THEMES.CYBER;
        this.currentTheme = themeName;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--secondary-color', theme.secondary);
        root.style.setProperty('--bg-color', theme.bg);
        root.style.setProperty('--font-family', theme.font);
        root.style.setProperty('--text-shadow', theme.shadow);
    }
}