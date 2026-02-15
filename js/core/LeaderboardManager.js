export class LeaderboardManager {
    constructor() {
        this.mockData = {
            'track1': [
                { name: 'NeonRider', score: 150000, rank: 'S' },
                { name: 'Glitch', score: 142000, rank: 'S' },
                { name: 'Guest', score: 120000, rank: 'A' }
            ],
            'track2': [
                { name: 'CyberPunk', score: 300000, rank: 'S' },
                { name: 'ZeroCool', score: 280000, rank: 'S' }
            ],
            'track3': [
                { name: 'TronLive', score: 95000, rank: 'A' },
                { name: 'User1', score: 80000, rank: 'B' }
            ]
        };
    }

    async getScores(songId) {
        // Simulate network delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.mockData[songId] || []);
            }, 300);
        });
    }

    async submitScore(songId, score, name) {
        if (!this.mockData[songId]) this.mockData[songId] = [];
        this.mockData[songId].push({ name, score, rank: score > 100000 ? 'S' : 'A' });
        this.mockData[songId].sort((a, b) => b.score - a.score);
    }
}