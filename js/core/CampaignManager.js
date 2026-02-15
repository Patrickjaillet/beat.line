import { songList } from '../utils/songList.js';

export class CampaignManager {
    constructor() {
        this.levels = [
            { id: 0, songId: 'track3', difficulty: 'Normal', reqScore: 5000, title: 'INITIATION', x: 20, y: 50 },
            { id: 1, songId: 'track1', difficulty: 'Hard', reqScore: 15000, title: 'NEON RISE', x: 50, y: 50 },
            { id: 2, songId: 'track2', difficulty: 'Expert', reqScore: 30000, title: 'THE CORE', x: 80, y: 50 }
        ];
        this.progress = 0;
    }

    getLevel(index) {
        return this.levels[index];
    }

    checkCompletion(index, stats) {
        if (index === this.progress && stats.score >= this.levels[index].reqScore) {
            this.progress++;
            return true;
        }
        return index < this.progress;
    }

    isUnlocked(index) {
        return index <= this.progress;
    }
}