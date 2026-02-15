export class QuestManager {
    constructor(game) {
        this.game = game;
        this.questTypes = [
            { type: 'score', template: 'QUEST_SCORE', min: 50000, max: 200000, step: 10000, reward: 100 },
            { type: 'combo', template: 'QUEST_COMBO', min: 50, max: 200, step: 10, reward: 150 },
            { type: 'perfect', template: 'QUEST_PERFECT', min: 20, max: 100, step: 5, reward: 200 },
            { type: 'play', template: 'QUEST_PLAY', min: 3, max: 5, step: 1, reward: 300 } // Cumulative
        ];
        this.checkDailyReset();
    }

    checkDailyReset() {
        const profile = this.game.profileManager;
        const today = new Date().toDateString();
        
        if (profile.data.lastQuestDate !== today) {
            profile.data.lastQuestDate = today;
            profile.data.quests = this.generateQuests();
            profile.save();
        }
    }

    generateQuests() {
        const quests = [];
        // Shuffle types and pick 3
        const shuffled = [...this.questTypes].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        selected.forEach((q, i) => {
            const target = Math.floor(Math.random() * ((q.max - q.min) / q.step + 1)) * q.step + q.min;
            quests.push({
                id: i,
                type: q.type,
                template: q.template,
                target: target,
                current: 0,
                completed: false,
                claimed: false,
                reward: q.reward,
                cumulative: q.type === 'play'
            });
        });
        return quests;
    }

    updateProgress(type, value) {
        const profile = this.game.profileManager;
        let changed = false;

        if (!profile.data.quests) return;

        profile.data.quests.forEach(q => {
            if (q.type === type && !q.completed) {
                if (q.cumulative) {
                    q.current += value;
                } else {
                    q.current = Math.max(q.current, value); // High score style
                }

                if (q.current >= q.target) {
                    q.current = q.target;
                    q.completed = true;
                    this.game.achievementManager.showNotification({ title: 'QUEST COMPLETE', desc: this.getDesc(q) });
                }
                changed = true;
            }
        });

        if (changed) profile.save();
    }

    getDesc(quest) {
        const L = this.game.localization;
        return L.get(quest.template).replace('{0}', quest.target);
    }
}