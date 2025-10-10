export class StorageManager {
    constructor() {
        this.storage = window.localStorage;
    }

    setItem(key, value) {
        try {
            this.storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            const item = this.storage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage error:', error);
            return defaultValue;
        }
    }

    removeItem(key) {
        try {
            this.storage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            return false;
        }
    }

    // Player specific methods
    savePlayerName(name) {
        return this.setItem('playerName', name);
    }

    getPlayerName() {
        return this.getItem('playerName', 'Guest');
    }

    saveHighscore(score, playerName = null) {
        const currentHighscore = this.getHighscore();
        if (score > currentHighscore.score) {
            const highscoreData = {
                score: score,
                playerName: playerName || this.getPlayerName(),
                date: new Date().toISOString()
            };
            this.setItem('highscore', highscoreData);
            this.addToHighscoresList(highscoreData);
            return true;
        }
        return false;
    }

    getHighscore() {
        return this.getItem('highscore', { score: 0, playerName: 'Guest', date: new Date().toISOString() });
    }

    addToHighscoresList(scoreData) {
        const highscores = this.getHighscores();
        highscores.push(scoreData);

        // Sort by score descending and keep top 10
        highscores.sort((a, b) => b.score - a.score);
        const topScores = highscores.slice(0, 10);

        this.setItem('highscores', topScores);
        return topScores;
    }

    getHighscores() {
        return this.getItem('highscores', []);
    }

    clearHighscores() {
        this.removeItem('highscores');
        this.removeItem('highscore');
    }
}