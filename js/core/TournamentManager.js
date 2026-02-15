export class TournamentManager {
    constructor() {
        this.bracket = [];
        this.currentRound = 0;
        this.playerIndex = 0;
        this.generateBracket();
    }

    generateBracket() {
        // 8 Players, Quarter Finals
        this.bracket = [
            { p1: 'Player', p2: 'Bot_Alpha', winner: null, score1: 0, score2: 0 },
            { p1: 'Bot_Beta', p2: 'Bot_Gamma', winner: null, score1: 0, score2: 0 },
            { p1: 'Bot_Delta', p2: 'Bot_Epsilon', winner: null, score1: 0, score2: 0 },
            { p1: 'Bot_Zeta', p2: 'Bot_Eta', winner: null, score1: 0, score2: 0 }
        ];
        this.currentRound = 0; // 0: QF, 1: SF, 2: F
    }

    resolveRound(playerScore) {
        // Resolve Player Match
        const playerMatch = this.bracket.find(m => m.p1 === 'Player' || m.p2 === 'Player');
        if (playerMatch) {
            const opponentScore = Math.floor(playerScore * (0.9 + Math.random() * 0.2)); // Random difficulty
            playerMatch.score1 = playerScore;
            playerMatch.score2 = opponentScore;
            playerMatch.winner = playerScore >= opponentScore ? 'Player' : playerMatch.p2;
        }

        // Resolve Other Matches
        this.bracket.forEach(m => {
            if (m.winner) return;
            m.score1 = Math.floor(100000 + Math.random() * 50000);
            m.score2 = Math.floor(100000 + Math.random() * 50000);
            m.winner = m.score1 >= m.score2 ? m.p1 : m.p2;
        });

        // Generate Next Round if Player won
        if (playerMatch && playerMatch.winner === 'Player' && this.currentRound < 2) {
            this.currentRound++;
            const winners = this.bracket.map(m => m.winner);
            const nextBracket = [];
            for (let i = 0; i < winners.length; i += 2) {
                nextBracket.push({ p1: winners[i], p2: winners[i+1], winner: null, score1: 0, score2: 0 });
            }
            this.bracket = nextBracket;
        }
    }
}