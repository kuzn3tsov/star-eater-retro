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

            // Focus on input when modal opens
            if (this.modals.welcome?.classList.contains('modal-active')) {
                nameInput.focus();
            }
        }
    }

    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.add('modal-active');
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

    // Add method to update any UI element
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
}