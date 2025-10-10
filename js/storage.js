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

    saveHighscore(score) {
        const currentHighscore = this.getHighscore();
        if (score > currentHighscore) {
            return this.setItem('highscore', score);
        }
        return false;
    }

    getHighscore() {
        return this.getItem('highscore', 0);
    }
}