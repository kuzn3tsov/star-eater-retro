import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { PowerUpManager } from './powerups.js';
import { CollectibleManager } from './collectables.js';
import { ProjectileManager } from './projectiles.js';
import { ParticleManager } from './particles.js';
import { UIManager } from './ui.js';
import { BossManager } from './bosses.js';

export class GameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'menu';
        this.lastTime = 0;
        this.deltaTime = 0;
        this.animationId = null;

        this.player = null;
        this.enemies = null;
        this.powerups = null;
        this.collectibles = null;
        this.projectiles = null;
        this.particles = null;
        this.ui = null;
        this.boss = null;

        this.score = 0;
        this.highScore = 0;
        this.level = 1;
        this.lives = 3;
        this.playerName = 'PLAYER';

        this.starsCollected = 0;
        this.starsRequired = 10;

        this.toxicClouds = [];

        this.highScores = [];
        this.keys = {};
        this.setupInputHandling();
    }

    setupInputHandling() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.handleKeyUp(e);
        });
    }

    handleKeyDown(e) {
        if (this.gameState !== 'playing') return;

        switch (e.key.toLowerCase()) {
            case 'q':
                if (this.powerups) this.powerups.activateShield();
                break;
            case 'e':
                if (this.powerups) this.powerups.activateIonPulse();
                break;
            case 'r':
                if (this.powerups) this.powerups.activateRadar();
                break;
            case ' ':
                break;
        }
    }

    handleKeyUp(e) {
    }

    async initialize() {
        this.setupCanvas();
        this.loadHighScores();
        this.setupEventListeners();
        await this.waitForGameContainer();

        this.particles = new ParticleManager(this);
        this.projectiles = new ProjectileManager(this);
        this.powerups = new PowerUpManager(this);
        this.collectibles = new CollectibleManager(this);
        this.enemies = new EnemyManager(this);
        this.boss = new BossManager(this);
        this.player = new Player(this);
        this.ui = new UIManager(this);

        await Promise.allSettled([
            this.enemies.initialize(),
            this.boss.initialize(),
            this.collectibles.initialize()
        ]);

        await this.ui.initialize();

        console.log('Game initialized with all managers');
        this.showIntroModal();
        this.gameLoop();
    }

    waitForGameContainer() {
        return new Promise((resolve) => {
            const checkContainer = () => {
                const container = document.getElementById('game-container');
                if (container) {
                    console.log('Game container found');
                    resolve();
                } else {
                    setTimeout(checkContainer, 100);
                }
            };
            checkContainer();
        });
    }

    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = document.getElementById('game-container');
        if (container && this.canvas) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.clearCanvas();
            if (this.player) this.player.reset();
            if (this.particles) this.particles.onResize();
        }
    }

    clearCanvas() {
        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#071018';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    setupEventListeners() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePause());
        }

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }

        const soundBtn = document.getElementById('sound-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => this.toggleSound());
        }

        const infoBtn = document.getElementById('info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showInfoModal());
        }

        const highScoreBtn = document.getElementById('high-score-btn');
        if (highScoreBtn) {
            highScoreBtn.addEventListener('click', () => this.showHighScores());
        }

        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.startGame());
        }

        const restartModalBtn = document.getElementById('restart-modal-btn');
        if (restartModalBtn) {
            restartModalBtn.addEventListener('click', () => this.restartGame());
        }

        const endlessModeBtn = document.getElementById('endless-mode-btn');
        if (endlessModeBtn) {
            endlessModeBtn.addEventListener('click', () => this.startEndlessMode());
        }

        const closeScoresBtn = document.getElementById('close-scores-btn');
        if (closeScoresBtn) {
            closeScoresBtn.addEventListener('click', () => this.hideModal('high-scores-modal'));
        }

        const closeInfoBtn = document.getElementById('close-info-btn');
        if (closeInfoBtn) {
            closeInfoBtn.addEventListener('click', () => this.hideModal('info-modal'));
        }

        const playerNameInput = document.getElementById('player-name-input');
        if (playerNameInput) {
            playerNameInput.addEventListener('input', (e) => {
                this.playerName = e.target.value.toUpperCase() || 'PLAYER';
                const playerNameDisplay = document.getElementById('player-name');
                if (playerNameDisplay) {
                    playerNameDisplay.textContent = this.playerName;
                }
            });
        }
    }

    startGame() {
        this.hideModal('intro-modal');
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.starsCollected = 0;
        this.starsRequired = 10;
        this.resetGame();
        this.updateHUD();
        this.clearCanvas();
        if (this.enemies) this.enemies.spawnEnemies();

        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
    }

    restartGame() {
        console.log('Restarting game');
        this.hideAllModals();
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.starsCollected = 0;
        this.starsRequired = 10;
        this.resetGame();
        this.clearCanvas();
        this.updateHUD();
        this.resetPowerUpIcons();
        if (this.enemies) this.enemies.spawnEnemies();

        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
    }

    resetGame() {
        if (this.player) this.player.reset();
        if (this.enemies) this.enemies.clear();
        if (this.powerups) this.powerups.clear();
        if (this.collectibles) this.collectibles.clear();
        if (this.projectiles) this.projectiles.clear();
        if (this.particles) this.particles.clear();
        if (this.boss) this.boss.clear();

        this.toxicClouds = [];

        this.clearGameContainer();
    }

    clearGameContainer() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        const elementsToRemove = gameContainer.querySelectorAll(
            '.thrust-particle, .shield-effect, .ion-pulse-effect, .enemy, .collectible, ' +
            '.shield-powerup, .ion-pulse-powerup, .radar-ping-powerup, .radar-indicator, ' +
            '.extended-power-unlock-effect, .endless-mode-indicator, .enemy-freeze-effect, ' +
            '.boss-entity, .bomb-warning, .toxic-cloud, .boss-spawn-portal, .boss-defeat-explosion, ' +
            '.projectile, .laser-beam, [style*="animation: textFloat"]'
        );

        elementsToRemove.forEach(element => element.remove());
    }

    resetPowerUpIcons() {
        const powerUpIcons = document.querySelectorAll('.powerup-icon');
        powerUpIcons.forEach(icon => icon.classList.remove('active'));
    }

    startEndlessMode() {
        this.hideModal('victory-modal');
        this.gameState = 'playing';
        if (this.powerups) this.powerups.activateEndlessMode();
        this.resetGame();
        this.updateHUD();

        const endlessIcon = document.getElementById('endless-icon');
        if (endlessIcon) {
            endlessIcon.classList.add('active');
        }

        if (this.enemies) this.enemies.spawnEnemies();
    }

    gameLoop(currentTime = 0) {
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        this.update();
        this.render();
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    update() {
        if (this.gameState !== 'playing') return;

        this.updatePlayerInput();
        if (this.player) this.player.update(this.deltaTime);
        if (this.enemies) this.enemies.update(this.deltaTime);
        if (this.powerups) this.powerups.update(this.deltaTime);
        if (this.collectibles) this.collectibles.update(this.deltaTime);
        if (this.projectiles) this.projectiles.update(this.deltaTime);
        if (this.particles) this.particles.update(this.deltaTime);
        if (this.boss) this.boss.update(this.deltaTime);
        if (this.ui) this.ui.update(this.deltaTime);

        this.checkCollisions();
        this.checkToxicCloudCollisions();
        this.checkLevelProgression();
    }

    updatePlayerInput() {
        if (!this.player) return;

        this.player.velocityX = 0;
        this.player.velocityY = 0;

        if (this.keys['w'] || this.keys['arrowup']) this.player.velocityY = -1;
        if (this.keys['s'] || this.keys['arrowdown']) this.player.velocityY = 1;
        if (this.keys['a'] || this.keys['arrowleft']) this.player.velocityX = -1;
        if (this.keys['d'] || this.keys['arrowright']) this.player.velocityX = 1;

        if (this.player.velocityX !== 0 && this.player.velocityY !== 0) {
            this.player.velocityX *= 0.707;
            this.player.velocityY *= 0.707;
        }
    }

    checkCollisions() {
        if (!this.player || !this.enemies) return;

        this.enemies.getEnemies().forEach((enemy, index) => {
            if (this.checkRectCollision(this.player.bounds, enemy)) {
                if (this.powerups && this.powerups.isShieldActive()) {
                    this.powerups.freezeEnemy(enemy, 2);
                    this.addScore(1);

                    if (this.particles) {
                        this.particles.createExplosion(
                            enemy.x + enemy.width / 2,
                            enemy.y + enemy.height / 2,
                            '#00ffff',
                            3
                        );
                    }
                } else if (this.player.starPowerTime > 0) {
                    this.enemies.createExplosion(enemy);
                    this.enemies.getEnemies().splice(index, 1);
                    this.addScore(5);
                } else {
                    if (!this.player.takeDamage()) {
                        this.lives--;
                        this.updateHUD();
                        if (this.lives <= 0) {
                            this.gameOver();
                        }
                    }
                }
            }
        });

        if (this.projectiles) {
            this.projectiles.checkCollisions(this.enemies.getEnemies(), this.player);
        }

        if (this.boss && this.boss.currentBoss && this.boss.bossActive) {
            if (this.checkRectCollision(this.player.bounds, this.boss.currentBoss)) {
                if (!this.player.takeDamage()) {
                    this.lives--;
                    this.updateHUD();
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
            }
        }
    }

    checkToxicCloudCollisions() {
        if (!this.player || !this.toxicClouds || this.toxicClouds.length === 0) return;

        const playerBounds = this.player.bounds;
        const now = Date.now();

        for (let i = this.toxicClouds.length - 1; i >= 0; i--) {
            const cloud = this.toxicClouds[i];

            if (this.checkRectCollision(playerBounds, cloud)) {
                if (!cloud.lastDamageTime || now - cloud.lastDamageTime > 1000) {
                    if (!this.player.takeDamage()) {
                        this.lives--;
                        this.updateHUD();
                        if (this.lives <= 0) {
                            this.gameOver();
                        }
                    }
                    cloud.lastDamageTime = now;
                }
            }

            cloud.lifeTime -= this.deltaTime;
            if (cloud.lifeTime <= 0) {
                this.toxicClouds.splice(i, 1);
            }
        }
    }

    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    checkLevelProgression() {
        if (this.starsCollected >= this.starsRequired && this.gameState === 'playing') {
            this.levelComplete();
        }
    }

    levelComplete() {
        this.level++;
        this.starsCollected = 0;
        this.updateHUD();

        if (this.level === 60) {
            if (this.powerups) this.powerups.unlockExtendedPower();
        }

        if (this.particles) {
            this.particles.createTextEffect(
                this.canvas.width / 2,
                this.canvas.height / 2,
                `LEVEL ${this.level}`,
                '#ffd700'
            );
        }

        // Clear current level
        if (this.enemies) this.enemies.clear();
        if (this.collectibles) this.collectibles.clear();

        // Handle boss levels
        if ([15, 30, 45, 60, 75].includes(this.level)) {
            setTimeout(() => {
                if (this.gameState === 'playing' && this.boss) {
                    this.startBossFight(this.level);
                }
            }, 1500);
        } else {
            // Regular level - spawn enemies after delay
            setTimeout(() => {
                if (this.gameState === 'playing' && this.enemies) {
                    this.enemies.spawnEnemies();
                }
            }, 1500);
        }
    }

    startBossFight(level) {
        if (this.boss) {
            this.boss.spawnBoss(level);
        }
        if (this.particles) {
            this.particles.createTextEffect(
                this.canvas.width / 2,
                this.canvas.height / 2,
                'BOSS BATTLE!',
                '#ff4444'
            );
        }
        if (this.enemies) this.enemies.clear();
        console.log(`Starting boss fight for level ${level}`);
    }

    render() {
        this.clearCanvas();
        if (this.gameState !== 'playing') return;

        this.drawGrid();
        if (this.particles) this.particles.render(this.ctx);
        if (this.projectiles) this.projectiles.render(this.ctx);
        if (this.enemies) this.enemies.render(this.ctx);
        if (this.collectibles) this.collectibles.render(this.ctx);
        if (this.boss) this.boss.render(this.ctx);
        if (this.player) this.player.render(this.ctx);
    }

    drawGrid() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;

        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    addScore(points) {
        this.score += points;
        this.updateHUD();
        if (this.particles && this.player) {
            this.particles.createTextEffect(
                this.player.center.x,
                this.player.center.y - 30,
                `+${points}`,
                '#00ff00'
            );
        }
    }

    addStar() {
        this.starsCollected++;
        this.updateHUD();

        if (this.particles && this.player) {
            this.particles.createTextEffect(
                this.player.center.x,
                this.player.center.y - 50,
                `${this.starsCollected}/${this.starsRequired}`,
                '#ffd700'
            );
        }
    }

    addLife(lives = 1) {
        this.lives += lives;
        this.updateHUD();
        if (this.particles && this.player) {
            this.particles.createTextEffect(
                this.player.center.x,
                this.player.center.y - 30,
                `+${lives} LIFE`,
                '#ff4444'
            );
        }
    }

    updateHUD() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score.toString().padStart(5, '0');
        }

        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            const topScore = this.getTopScore();
            if (topScore) {
                highScoreElement.textContent = `${topScore.score.toString().padStart(5, '0')} ${topScore.name}`;
            } else {
                highScoreElement.textContent = '00000';
            }
        }

        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.level.toString().padStart(2, '0');
        }

        const livesElement = document.getElementById('lives');
        if (livesElement) {
            livesElement.textContent = this.lives.toString();
        }

        const starsElement = document.getElementById('stars-progress');
        if (starsElement) {
            starsElement.textContent = `${this.starsCollected}/${this.starsRequired}`;
        }

        const progressBar = document.getElementById('stars-progress-bar');
        if (progressBar) {
            const progressPercent = (this.starsCollected / this.starsRequired) * 100;
            progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        this.saveHighScore();

        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = this.score.toString().padStart(5, '0');
        }

        this.showModal('game-over-modal');

        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }

        if (this.particles) {
            this.particles.createExplosion(this.canvas.width / 2, this.canvas.height / 2, '#ff4444', 20);
        }
    }

    victory() {
        this.gameState = 'victory';
        this.saveHighScore();

        const victoryScoreElement = document.getElementById('victory-score');
        if (victoryScoreElement) {
            victoryScoreElement.textContent = this.score.toString().padStart(5, '0');
        }

        this.showModal('victory-modal');

        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }

        if (this.particles) {
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    this.particles.createExplosion(
                        Math.random() * this.canvas.width,
                        Math.random() * this.canvas.height,
                        '#ffd700',
                        5
                    );
                }, i * 100);
            }
        }
    }

    loadHighScores() {
        try {
            const saved = localStorage.getItem('stareater_highscores');
            if (saved) {
                this.highScores = JSON.parse(saved);
            } else {
                this.highScores = [
                    { name: 'ACE', score: 10000 },
                    { name: 'PRO', score: 7500 },
                    { name: 'NEW', score: 5000 },
                    { name: 'ROOKIE', score: 2500 }
                ];
            }
            this.updateHUD();
        } catch (error) {
            console.error('Error loading high scores:', error);
            this.highScores = [];
        }
    }

    saveHighScore() {
        if (this.score > 0) {
            this.highScores.push({
                name: this.playerName,
                score: this.score,
                date: new Date().toISOString()
            });

            this.highScores.sort((a, b) => b.score - a.score);
            this.highScores = this.highScores.slice(0, 10);

            try {
                localStorage.setItem('stareater_highscores', JSON.stringify(this.highScores));
            } catch (error) {
                console.error('Error saving high scores:', error);
            }

            this.updateHUD();

            if (this.score === this.highScores[0].score && this.particles) {
                this.particles.createTextEffect(
                    this.canvas.width / 2,
                    this.canvas.height / 2,
                    'NEW HIGH SCORE!',
                    '#ffd700'
                );
            }
        }
    }

    getTopScore() {
        return this.highScores.length > 0 ? this.highScores[0] : null;
    }

    screenShake(intensity) {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`;
            setTimeout(() => {
                gameContainer.style.transform = 'translate(0, 0)';
            }, 100);
        }
    }

    showIntroModal() {
        this.showModal('intro-modal');
    }

    showInfoModal() {
        this.showModal('info-modal');
    }

    showHighScores() {
        this.populateHighScores();
        this.showModal('high-scores-modal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    populateHighScores() {
        const list = document.getElementById('high-scores-list');
        if (!list) return;

        list.innerHTML = '';

        if (this.highScores.length === 0) {
            list.innerHTML = '<div class="no-scores">No high scores yet!</div>';
            return;
        }

        this.highScores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'high-score-item';
            if (index === 0) {
                item.classList.add('top-score');
            }
            item.innerHTML = `
                <span class="score-rank">${index + 1}.</span>
                <span class="score-name">${score.name}</span>
                <span class="score-value">${score.score.toString().padStart(5, '0')}</span>
            `;
            list.appendChild(item);
        });
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            const playIcon = document.getElementById('play-icon');
            const pauseIcon = document.getElementById('pause-icon');
            if (playIcon && pauseIcon) {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            const playIcon = document.getElementById('play-icon');
            const pauseIcon = document.getElementById('pause-icon');
            if (playIcon && pauseIcon) {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
            }
        }
    }

    toggleSound() {
        const soundOn = document.getElementById('sound-on-icon');
        const soundOff = document.getElementById('sound-off-icon');
        if (soundOn && soundOff) {
            if (soundOn.classList.contains('hidden')) {
                soundOn.classList.remove('hidden');
                soundOff.classList.add('hidden');
            } else {
                soundOn.classList.add('hidden');
                soundOff.classList.remove('hidden');
            }
        }
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.player) {
            this.player.destroy();
        }
        if (this.enemies) this.enemies.clear();
        if (this.powerups) this.powerups.clear();
        if (this.collectibles) this.collectibles.clear();
        if (this.projectiles) this.projectiles.clear();
        if (this.particles) this.particles.clear();
        if (this.boss) this.boss.clear();
        this.clearGameContainer();
    }
}