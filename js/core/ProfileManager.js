export class ProfileManager {
    constructor() {
        this.data = {
            username: 'Player' + Math.floor(Math.random() * 1000),
            totalScore: 0,
            totalGames: 0,
            highScores: {},
            credits: 0,
            lastLogin: null,
            unlockedSkins: ['TRON'],
            achievements: [],
            quests: [],
            lastQuestDate: null,
            xp: 0,
            level: 1,
            badges: []
        };
        this.load();
    }

    load() {
        const stored = localStorage.getItem('beatline_profile');
        if (stored) {
            this.data = { ...this.data, ...JSON.parse(stored) };
        }
    }

    save() {
        localStorage.setItem('beatline_profile', JSON.stringify(this.data));
    }

    setUsername(name) {
        this.data.username = name;
        this.save();
    }

    updateStats(stats, songId) {
        this.data.totalScore += stats.score;
        this.data.totalGames++;
        
        if (songId) {
            const currentHigh = this.data.highScores[songId] || 0;
            if (stats.score > currentHigh) {
                this.data.highScores[songId] = stats.score;
            }
        }
        this.save();
    }

    checkDailyReward() {
        const today = new Date().toDateString();
        if (this.data.lastLogin !== today) {
            this.data.lastLogin = today;
            this.data.credits += 100;
            this.save();
            return 100;
        }
        return 0;
    }

    unlockSkin(skinName, cost) {
        if (this.data.credits >= cost && !this.data.unlockedSkins.includes(skinName)) {
            this.data.credits -= cost;
            this.data.unlockedSkins.push(skinName);
            this.save();
            return true;
        }
        return false;
    }

    getHighScore(songId) {
        return this.data.highScores[songId] || 0;
    }

    addXP(amount) {
        this.data.xp += amount;
        // Level up logic: Next level requires Level * 1000 XP
        let xpForNext = this.data.level * 1000;
        let leveledUp = false;
        
        while (this.data.xp >= xpForNext) {
            this.data.xp -= xpForNext;
            this.data.level++;
            xpForNext = this.data.level * 1000;
            leveledUp = true;
        }
        this.save();
        return leveledUp;
    }

    checkBadges() {
        const badgesDef = [
            { id: 'ROOKIE', condition: () => this.data.totalGames >= 1, icon: '🔰' },
            { id: 'VETERAN', condition: () => this.data.totalGames >= 50, icon: '🎖️' },
            { id: 'MILLIONAIRE', condition: () => this.data.totalScore >= 1000000, icon: '💎' },
            { id: 'COLLECTOR', condition: () => this.data.unlockedSkins.length >= 3, icon: '🎒' }
        ];

        let newBadge = false;
        badgesDef.forEach(b => {
            if (!this.data.badges.find(existing => existing.id === b.id) && b.condition()) {
                this.data.badges.push({ id: b.id, icon: b.icon });
                newBadge = true;
            }
        });
        if (newBadge) this.save();
        return newBadge;
    }
}