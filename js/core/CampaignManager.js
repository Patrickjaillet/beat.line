import { songList } from '../utils/songList.js';

export class CampaignManager {
    constructor(profileManager = null) {
        this.levels = [
            { id: 0, songId: 'track3', difficulty: 'Normal', reqScore: 5000, title: 'INITIATION', x: 20, y: 50 },
            { id: 1, songId: 'track1', difficulty: 'Hard', reqScore: 15000, title: 'NEON RISE', x: 50, y: 50 },
            { id: 2, songId: 'track2', difficulty: 'Expert', reqScore: 30000, title: 'THE CORE', x: 80, y: 50 }
        ];
        this.progress = 0;
        this.profileManager = profileManager;

        if (this.profileManager && this.profileManager.data) {
            this.progress = this.profileManager.data.campaignProgress || 0;
        }
    }

    getLevel(index) {
        return this.levels[index];
    }

    setProfileManager(profileManager) {
        this.profileManager = profileManager;
        this.progress = this.profileManager?.data?.campaignProgress || this.progress;
    }

    checkCompletion(index, stats) {
        if (index === this.progress && stats.score >= this.levels[index].reqScore) {
            this.progress++;
            if (this.profileManager && this.profileManager.data) {
                this.profileManager.data.campaignProgress = this.progress;
                this.profileManager.save();
            }
            return true;
        }
        if (index < this.progress) return true;
        return false;
    }

    isUnlocked(index) {
        return index <= this.progress;
    }
}