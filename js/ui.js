import { StorageManager } from './storage.js';

export class UIManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.modals = {};
        this.initializeModals();
        this.bindEvents();
    }

    initializeModals() {
        this.modals.welcome = document.getElementById('welcome-modal');
        this.modals.info = document.getElementById('info-modal');
        this.modals.highscores = document.getElementById('highscores-modal');
    }

    bindEvents() {
        // Welcome modal events
        const startBtn = document.getElementById('start-game-btn');
        const nameInput = document.getElementById('player-name-input');

        if (startBtn && nameInput) {
            startBtn.addEventListener('click', () => {
                const playerName = nameInput.value.trim() || 'Guest';
                this.startGame(playerName);
            });

            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    startBtn.click();
                }
            });

            // Focus on input when modal opens, but only if it's visible
            if (this.modals.welcome?.classList.contains('modal-active')) {
                // Use setTimeout to ensure modal is fully rendered
                setTimeout(() => {
                    nameInput.focus();
                }, 100);
            }
        }

        // Info modal events
        const closeInfoBtn = document.getElementById('close-info-btn');
        if (closeInfoBtn) {
            closeInfoBtn.addEventListener('click', () => {
                this.hideModal('info');
            });
        }

        // Highscores modal events
        const closeHighscoresBtn = document.getElementById('close-highscores-btn');
        if (closeHighscoresBtn) {
            closeHighscoresBtn.addEventListener('click', () => {
                this.hideModal('highscores');
            });
        }

        // Highscore button event
        const highscoreBtn = document.getElementById('highscore-btn');
        if (highscoreBtn) {
            highscoreBtn.addEventListener('click', () => {
                this.showHighscores();
            });
        }

        // Prevent keyboard events from propagating to game when modals are open
        this.preventGameInputWhenModalOpen();
    }

    preventGameInputWhenModalOpen() {
        // Stop keyboard events from reaching game when any modal is open
        document.addEventListener('keydown', (e) => {
            const anyModalOpen = Object.values(this.modals).some(modal =>
                modal && modal.classList.contains('modal-active')
            );

            if (anyModalOpen) {
                e.stopPropagation();
            }
        }, true); // Use capture phase to stop events early
    }

    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.add('modal-active');

            // Focus management for accessibility
            if (modalName === 'welcome') {
                setTimeout(() => {
                    const nameInput = document.getElementById('player-name-input');
                    if (nameInput) nameInput.focus();
                }, 100);
            }
        }
    }

    hideModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.remove('modal-active');
        }
    }

    startGame(playerName) {
        this.hideModal('welcome');
        // Dispatch custom event that game.js will listen for
        const event = new CustomEvent('gameStart', {
            detail: { playerName }
        });
        document.dispatchEvent(event);
    }

    showInfo() {
        this.showModal('info');
    }

    showHighscores() {
        const highscores = this.storage.getHighscores();
        this.populateHighscoresList(highscores);
        this.showModal('highscores');
    }

    populateHighscoresList(highscores) {
        const listElement = document.getElementById('highscores-list');
        if (!listElement) return;

        if (highscores.length === 0) {
            listElement.innerHTML = '<p style="text-align: center; color: #888;">No high scores yet!</p>';
            return;
        }

        listElement.innerHTML = highscores.map((score, index) => `
            <div class="highscore-item ${index === 0 ? 'first-place' : ''}">
                <span class="highscore-rank">${index + 1}.</span>
                <span class="highscore-score">${score.score}</span>
                <span class="highscore-name">${score.playerName}</span>
                <span class="highscore-date">${new Date(score.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    }

    showMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls && window.innerWidth <= 768) {
            mobileControls.style.display = 'block';
        }
    }

    hideMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.style.display = 'none';
        }
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
}