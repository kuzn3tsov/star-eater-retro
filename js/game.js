import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';
import { HUDManager } from './hud.js';
import { Player } from './player.js';

export class Game {
    constructor() {
        this.storage = new StorageManager();
        this.ui = new UIManager(this.storage);
        this.hud = new HUDManager(this.storage);
        this.player = null;
        this.gameArea = document.getElementById('game-area');

        this.state = {
            isRunning: false,
            isPaused: false,
            score: 0,
            lives: 3,
            playerName: 'Guest'
        };

        this.initialize();
    }

    initialize() {
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupGame());
        } else {
            this.setupGame();
        }
    }

    setupGame() {
        // Check if we should show welcome modal
        const playerName = this.storage.getPlayerName();
        if (playerName === 'Guest') {
            this.ui.showModal('welcome');
        } else {
            this.state.playerName = playerName;
            this.updateHUD();
        }

        // Initialize player
        if (this.gameArea) {
            this.player = new Player(this.gameArea);
        } else {
            console.error('Game area not found');
        }

        // Set up event listeners
        this.bindEvents();

        // Set up window resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Initial mobile controls check
        this.handleResize();

        console.log('Game initialized successfully');
    }

    bindEvents() {
        // Game control events from HUD and UI
        document.addEventListener('gameStart', (e) => {
            this.start(e.detail.playerName);
        });

        document.addEventListener('gamePause', () => {
            this.pause();
        });

        document.addEventListener('gameResume', () => {
            this.resume();
        });

        document.addEventListener('gameRestart', () => {
            this.restart();
        });

        // Prevent arrow key scrolling
        window.addEventListener('keydown', (e) => {
            if ([
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'
            ].includes(e.key)) {
                if (this.state.isRunning && !this.state.isPaused) {
                    e.preventDefault();
                }
            }
        });
    }

    start(playerName = null) {
        if (playerName) {
            this.state.playerName = playerName;
            this.storage.savePlayerName(playerName);
        }

        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.score = 0;
        this.state.lives = 3;

        if (this.player) {
            this.player.reset();
        }

        this.updateHUD();
        this.ui.showMobileControls();

        console.log('Game started! Player:', this.state.playerName);
    }

    pause() {
        if (this.state.isRunning && !this.state.isPaused) {
            this.state.isPaused = true;
            console.log('Game paused');
        }
    }

    resume() {
        if (this.state.isRunning && this.state.isPaused) {
            this.state.isPaused = false;
            console.log('Game resumed');
        }
    }

    restart() {
        console.log('Game restarting...');
        this.start(this.state.playerName);
    }

    updateHUD() {
        this.hud.updateHUD({
            playerName: this.state.playerName,
            highscore: this.storage.getHighscore(),
            score: this.state.score,
            lives: this.state.lives
        });
    }

    handleResize() {
        // Adjust UI for mobile/desktop
        if (window.innerWidth <= 768) {
            this.ui.showMobileControls();
        } else {
            this.ui.hideMobileControls();
        }

        // Re-center player if game is running
        if (this.state.isRunning && this.player) {
            this.player.initialize();
        }
    }

    // Add score method for future use
    addScore(points) {
        this.state.score += points;
        this.hud.updateScore(this.state.score);

        // Update highscore if needed
        if (this.state.score > this.storage.getHighscore()) {
            this.storage.saveHighscore(this.state.score);
            this.hud.updateHUD({ highscore: this.state.score });
        }
    }

    // Lose life method for future use
    loseLife() {
        this.state.lives--;
        this.hud.updateLives(this.state.lives);

        if (this.state.lives <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.state.isRunning = false;
        console.log('Game Over! Final score:', this.state.score);
        // You can add game over modal here later
        alert(`Game Over!\nFinal Score: ${this.state.score}`);
    }
}

// Initialize game
const game = new Game();

// Make game available globally for debugging
window.game = game;