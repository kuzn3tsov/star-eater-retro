import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';
import { HUDManager } from './hud.js';
import { Player } from './player.js';
import { CollectablesManager } from './collectables.js';
import { EffectsManager } from './effects.js';

export class Game {
    constructor() {
        this.storage = new StorageManager();
        this.ui = new UIManager(this.storage);
        this.hud = new HUDManager(this.storage);
        this.player = null;
        this.collectables = null;
        this.effects = null;
        this.gameArea = document.getElementById('game-area');

        this.state = {
            isRunning: false,
            isPaused: false,
            score: 0,
            lives: 3,
            level: 1,
            playerName: 'Guest'
        };

        this.gameLoopId = null;
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
        console.log('Setting up game...');

        // Check if we should show welcome modal
        const playerName = this.storage.getPlayerName();
        if (playerName === 'Guest') {
            this.ui.showModal('welcome');
        } else {
            this.state.playerName = playerName;
            this.updateHUD();
        }

        // Initialize game components
        if (this.gameArea) {
            this.player = new Player(this.gameArea);
            this.collectables = new CollectablesManager(this.gameArea);
            this.effects = new EffectsManager(this.gameArea);
        } else {
            console.error('Game area not found');
            return;
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

        document.addEventListener('showInfo', () => {
            this.ui.showInfo();
        });

        document.addEventListener('soundToggle', (e) => {
            if (this.effects) {
                if (e.detail.isMuted) {
                    this.effects.stopAllSounds();
                } else {
                    this.effects.resumeSounds();
                }
            }
        });

        document.addEventListener('borderCollision', () => {
            this.handleBorderCollision();
        });

        // Prevent arrow key scrolling only when game is running and not paused
        document.addEventListener('keydown', (e) => {
            if (!this.state.isRunning || this.state.isPaused) return;

            const key = e.key?.toLowerCase();
            if ([
                'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
                'w', 'a', 's', 'd'
            ].includes(key)) {
                e.preventDefault();
            }
        });
    }

    start(playerName = null) {
        console.log('Starting game...');

        if (playerName) {
            this.state.playerName = playerName;
            this.storage.savePlayerName(playerName);
        }

        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.score = 0;
        this.state.lives = 3;
        this.state.level = 1;

        if (this.player) {
            this.player.reset();
            this.player.enableControls();
        }

        // Spawn exactly 10 stars for level 1
        if (this.collectables) {
            this.collectables.clearAll();
            this.spawnLevelStars();
        }

        this.updateHUD();
        this.ui.showMobileControls();

        // Start game loop
        this.startGameLoop();

        console.log('Game started! Player:', this.state.playerName);
    }

    spawnLevelStars() {
        // Always spawn exactly 10 stars per level
        const playerPos = this.player ? this.player.getPosition() : { x: 0, y: 0 };

        // Clear ALL existing stars first
        this.collectables.clearAll();

        // Spawn exactly 10 new stars
        this.collectables.spawnRandomStars(10, playerPos.x, playerPos.y);

        console.log(`Spawned 10 stars for level ${this.state.level}`);
    }

    pause() {
        if (this.state.isRunning && !this.state.isPaused) {
            this.state.isPaused = true;
            this.hud.setPausedState(true);

            // Stop game loop
            this.stopGameLoop();

            // Disable player controls
            if (this.player) {
                this.player.disableControls();
            }

            // Stop sounds
            if (this.effects) {
                this.effects.stopAllSounds();
            }

            console.log('Game paused');
        }
    }

    resume() {
        if (this.state.isRunning && this.state.isPaused) {
            this.state.isPaused = false;
            this.hud.setPausedState(false);

            // Enable player controls
            if (this.player) {
                this.player.enableControls();
            }

            // Resume sounds
            if (this.effects) {
                this.effects.resumeSounds();
            }

            // Restart game loop
            this.startGameLoop();

            console.log('Game resumed');
        }
    }

    restart() {
        console.log('Game restarting...');
        this.start(this.state.playerName);
    }

    startGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        const gameLoop = () => {
            if (!this.state.isRunning || this.state.isPaused) return;

            this.update();
            this.gameLoopId = requestAnimationFrame(gameLoop);
        };

        this.gameLoopId = requestAnimationFrame(gameLoop);
    }

    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }

    update() {
        if (!this.state.isRunning || this.state.isPaused) return;

        // Check for collisions with collectables
        if (this.player && this.collectables) {
            const playerPos = this.player.getPosition();
            const collision = this.collectables.checkCollision(playerPos.x, playerPos.y);

            if (collision) {
                this.handleCollectableCollision(collision);
            }
        }

        // Check level completion - exactly 0 stars remaining
        if (this.collectables && this.collectables.getRemainingCount() === 0) {
            this.completeLevel();
        }
    }

    handleCollectableCollision(collision) {
        // Remove collectable
        this.collectables.removeCollectable(collision.id);

        // Add score
        this.state.score += 1;
        this.hud.updateScore(this.state.score);

        // Play effects
        if (this.effects) {
            this.effects.createExplosion(collision.x, collision.y);
            this.effects.playCollectSound();
            this.effects.flashGameArea();
        }

        console.log('Collected star! Score:', this.state.score);
    }

    handleBorderCollision() {
        if (this.effects) {
            this.effects.playBorderBounceSound();
            this.effects.flashBorder();
        }
    }

    completeLevel() {
        console.log(`Level ${this.state.level} completed!`);

        // Advance to next level
        this.state.level++;
        this.hud.updateLevel(this.state.level);

        // Spawn exactly 10 stars for the new level
        this.spawnLevelStars();

        // Save highscore if applicable
        if (this.state.score > 0) {
            this.storage.saveHighscore(this.state.score, this.state.playerName);
            this.hud.updateHighscore(this.state.score);
        }

        console.log(`Advanced to level ${this.state.level}`);
    }

    updateHUD() {
        const highscoreData = this.storage.getHighscore();
        this.hud.updateHUD({
            playerName: this.state.playerName,
            highscore: highscoreData.score,
            score: this.state.score,
            lives: this.state.lives,
            level: this.state.level
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

    // Clean up when game ends
    gameOver() {
        this.state.isRunning = false;
        this.stopGameLoop();

        // Save highscore if applicable
        if (this.state.score > 0) {
            this.storage.saveHighscore(this.state.score, this.state.playerName);
            this.hud.updateHighscore(this.state.score);
        }

        console.log('Game Over! Final score:', this.state.score);
        // You can add game over modal here later
        alert(`Game Over!\nFinal Score: ${this.state.score}\nLevel: ${this.state.level}`);
    }
}

// Initialize game
const game = new Game();

// Make game available globally for debugging
window.game = game;