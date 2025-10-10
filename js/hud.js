import { StorageManager } from './storage.js';

export class HUDManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.isPaused = false;
        this.bindEvents();
        this.updateHUD();
    }

    bindEvents() {
        const pauseBtn = document.getElementById('pause-btn');
        const restartBtn = document.getElementById('restart-btn');
        const infoBtn = document.getElementById('info-btn');

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showInfo());
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');

        if (this.isPaused) {
            pauseBtn.textContent = '▶️';
            pauseBtn.title = 'Play';
            document.dispatchEvent(new CustomEvent('gamePause'));
        } else {
            pauseBtn.textContent = '⏸️';
            pauseBtn.title = 'Pause';
            document.dispatchEvent(new CustomEvent('gameResume'));
        }
    }

    restartGame() {
        document.dispatchEvent(new CustomEvent('gameRestart'));
    }

    showInfo() {
        // You can implement info modal later
        console.log('Show game info');
        // For now, just show an alert
        alert('Star Eater Game\nUse WASD or Arrow Keys to move\nEat stars to score points!');
    }

    updateHUD(data = {}) {
        const playerName = data.playerName || this.storage.getPlayerName();
        const highscore = data.highscore !== undefined ? data.highscore : this.storage.getHighscore();
        const score = data.score || 0;
        const lives = data.lives || 3;

        this.updateElement('player-name-display', playerName);
        this.updateElement('highscore-display', highscore);
        this.updateElement('score-display', score);
        this.updateElement('lives-display', lives);
    }

    updateScore(score) {
        this.updateElement('score-display', score);
    }

    updateLives(lives) {
        this.updateElement('lives-display', lives);
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
}