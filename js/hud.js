import { StorageManager } from './storage.js';

export class HUDManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.isPaused = false;
        this.isMuted = false;
        this.bindEvents();
        this.updateHUD();
    }

    bindEvents() {
        const pauseBtn = document.getElementById('pause-btn');
        const restartBtn = document.getElementById('restart-btn');
        const infoBtn = document.getElementById('info-btn');
        const muteBtn = document.getElementById('mute-btn');

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showInfo());
        }
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        const icon = pauseBtn.querySelector('i');

        if (this.isPaused) {
            icon.className = 'fa-solid fa-play';
            pauseBtn.title = 'Play';
            document.dispatchEvent(new CustomEvent('gamePause'));
        } else {
            icon.className = 'fa-solid fa-pause';
            pauseBtn.title = 'Pause';
            document.dispatchEvent(new CustomEvent('gameResume'));
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const muteBtn = document.getElementById('mute-btn');
        const icon = muteBtn.querySelector('i');

        if (this.isMuted) {
            icon.className = 'fa-solid fa-volume-mute';
            muteBtn.title = 'Unmute';
        } else {
            icon.className = 'fa-solid fa-volume-high';
            muteBtn.title = 'Mute';
        }

        document.dispatchEvent(new CustomEvent('soundToggle', {
            detail: { isMuted: this.isMuted }
        }));
    }

    restartGame() {
        document.dispatchEvent(new CustomEvent('gameRestart'));
    }

    showInfo() {
        document.dispatchEvent(new CustomEvent('showInfo'));
    }

    updateHUD(data = {}) {
        const playerName = data.playerName || this.storage.getPlayerName();
        const highscoreData = this.storage.getHighscore();
        const highscore = data.highscore !== undefined ? data.highscore : highscoreData.score;
        const score = data.score || 0;
        const lives = data.lives || 3;
        const level = data.level || 1;

        this.updateElement('player-name-display', playerName);
        this.updateElement('highscore-display', highscore);
        this.updateElement('score-display', score);
        this.updateElement('lives-display', lives);
        this.updateElement('level-display', level);
    }

    updateScore(score) {
        this.updateElement('score-display', score);
    }

    updateLives(lives) {
        this.updateElement('lives-display', lives);
    }

    updateLevel(level) {
        this.updateElement('level-display', level);
    }

    updateHighscore(highscore) {
        this.updateElement('highscore-display', highscore);
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    setPausedState(isPaused) {
        this.isPaused = isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        const icon = pauseBtn.querySelector('i');

        if (isPaused) {
            icon.className = 'fa-solid fa-play';
            pauseBtn.title = 'Play';
        } else {
            icon.className = 'fa-solid fa-pause';
            pauseBtn.title = 'Pause';
        }
    }
}