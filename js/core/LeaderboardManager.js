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
        this.load();
    }

    load() {
        const stored = localStorage.getItem('beatline_leaderboard');
        if (stored) {
            try {
                this.mockData = { ...this.mockData, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('Failed to parse leaderboard stored data', e);
            }
        }
    }

    save() {
        localStorage.setItem('beatline_leaderboard', JSON.stringify(this.mockData));
    }

    async getScores(songId) {
        const endpoint = window.BEATLINE_SETTINGS?.leaderboardEndpoint;
        if (endpoint) {
            try {
                const res = await fetch(`${endpoint}/scores?songId=${encodeURIComponent(songId)}`);
                if (res.ok) {
                    const json = await res.json();
                    return Array.isArray(json) ? json : [];
                }
            } catch (err) {
                console.warn('Leaderboard endpoint unreachable, using local fallback', err);
            }
        }

        // Simulate local response delay for mock behavior
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.mockData[songId] || []);
            }, 150);
        });
    }

    async submitScore(songId, score, name) {
        if (!this.mockData[songId]) this.mockData[songId] = [];
        this.mockData[songId].push({ name, score, rank: score > 100000 ? 'S' : 'A' });
        this.mockData[songId].sort((a, b) => b.score - a.score);
        this.save();

        // If real backend exists, send to it too (fallback via settings)
        const mpdUrl = window.BEATLINE_SETTINGS?.leaderboardEndpoint;
        if (mpdUrl) {
            fetch(`${mpdUrl}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songId, score, name })
            }).catch(() => {});
        }

        return this.mockData[songId];
    }
}