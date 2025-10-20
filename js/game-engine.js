import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { PowerUpManager } from './powerups.js';
import { CollectibleManager } from './collectables.js';
import { ProjectileManager } from './projectiles.js';
import { ParticleManager } from './particles.js';
import { UIManager } from './ui.js';
import { BossManager } from './bosses.js';
import { CollisionManager } from './physics/collision-manager.js';
import { PowerUpStateManager } from './managers/power-up-state-manager.js';

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
        this.config = null;
        this.lives = 3;
        this.playerName = 'PLAYER';

        this.starsCollected = 0;
        this.starsRequired = 10;

        this.toxicClouds = [];

        this.highScores = [];
        this.keys = {};

        // Sound state - start with sound ON
        this.soundEnabled = true;

        // Boss fight coordination
        this.bossFightInProgress = false;

        // Initialize power-up state manager
        this.powerUpStateManager = new PowerUpStateManager();

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
        await this.loadConfiguration();

        this.setupCanvas();
        await this.loadHighScores();
        this.setupEventListeners();
        await this.waitForGameContainer();

        this.lives = this.config.player.startingLives;
        this.level = this.config.player.startingLevel;
        this.starsRequired = this.config.gameProgression.starsPerLevel;

        console.log('Initializing game managers...');

        // Initialize managers
        this.particles = new ParticleManager(this);
        this.projectiles = new ProjectileManager(this);
        this.powerups = new PowerUpManager(this, this.config, this.powerUpStateManager);
        this.collectibles = new CollectibleManager(this, this.config);
        this.enemies = new EnemyManager(this, this.config);
        this.boss = new BossManager(this, this.config);
        this.player = new Player(this);

        // Initialize UI
        console.log('Creating UIManager...');
        this.ui = new UIManager(this, this.powerUpStateManager);
        console.log('UIManager created:', this.ui);

        await Promise.allSettled([
            this.enemies.initialize(),
            this.boss.initialize(),
            this.collectibles.initialize()
        ]);

        console.log('Calling UI initialize...');

        // Initialize UI with error handling
        if (this.ui && typeof this.ui.initialize === 'function') {
            await this.ui.initialize();
            console.log('UI initialized successfully');
        } else {
            console.error('UIManager initialize method not found!', this.ui);
            // Create fallback UI object
            this.ui = {
                update: () => this.updateHUD(),
                updateHUD: () => this.updateHUD(),
                updatePowerUpState: () => { },
                syncPowerUpStates: () => { }
            };
        }

        // Initialize sound icons after UI is ready
        this.initializeSoundIcons();

        console.log('Game initialized with configuration');
        this.showIntroModal();
        this.gameLoop();
    }

    async loadConfiguration() {
        try {
            const response = await fetch('data/config.json');
            if (response.ok) {
                this.config = await response.json();
                console.log('Game configuration loaded successfully');
            } else {
                throw new Error('Failed to load config file');
            }
        } catch (error) {
            console.error('Error loading configuration, using defaults:', error);
            this.config = {
                player: { startingLives: 3, startingLevel: 1 },
                collectables: {
                    goldStar: { spawnStartLevel: 1, maxSpawned: 5, spawnFrequency: 1, duration: 10 },
                    greenStar: { spawnStartLevel: 4, maxSpawned: 5, spawnFrequency: 1, duration: 8, freezeDuration: 3 },
                    blueStar: { spawnStartLevel: 6, maxSpawned: 5, spawnFrequency: 5, duration: 10, starPowerDuration: 10 },
                    purpleStar: { spawnStartLevel: 1, maxSpawned: 1, spawnFrequency: 1, duration: 6 },
                    redRocket: { spawnStartLevel: 13, maxSpawned: 2, spawnFrequency: 3, duration: 12 },
                    azureBomb: { spawnStartLevel: 15, maxSpawned: 3, spawnFrequency: 1, duration: 8 }
                },
                powerups: {
                    shield: { availableFromLevel: 1, rechargeTime: 30, duration: 10, freezeDuration: 2 },
                    ionPulse: { availableFromLevel: 1, rechargeTime: 25, damage: 1, radius: 225 },
                    radar: { availableFromLevel: 1, rechargeTime: 45, bombWarningTime: 3, duration: 5 },
                    starPower: { availableFromLevel: 1, duration: 10 }
                },
                extendedPower: {
                    radarBoost: { bombWarningTime: 5 },
                    shieldBoost: { duration: 15, freezeDuration: 3, cooldown: 25 },
                    ionPulseBoost: { cooldown: 20, damage: 2, radius: 300 }
                },
                enemies: {
                    respawnCooldown: 30,
                    levelPattern: [3, 6, 10, 3, 6, 10, 3, 4, 6, 10],
                    bossLevels: [15, 30, 45, 60, 75]
                },
                gameProgression: {
                    starsPerLevel: 10,
                    maxLevel: 75
                },
                bosses: {
                    meteorCommander: { level: 15, health: 20, attackCooldown: 2.0, reward: "radar" },
                    skullReaper: { level: 30, health: 50, attackCooldown: 1.8, reward: "shield" },
                    theMachine: { level: 45, health: 100, attackCooldown: 1.5, reward: "ionPulse" },
                    biohazardTitan: { level: 60, health: 200, attackCooldown: 1.2, reward: "extendedPower" },
                    cosmicHorror: { level: 75, health: 500, attackCooldown: 0.8, reward: "endlessMode" }
                }
            };
        }
    }

    async loadHighScores() {
        try {
            const saved = localStorage.getItem('stareater_highscores');
            if (saved) {
                const parsedScores = JSON.parse(saved);
                if (Array.isArray(parsedScores)) {
                    this.highScores = parsedScores;
                    console.log('High scores loaded from localStorage:', this.highScores.length);
                } else {
                    console.warn('Invalid high scores data in localStorage, using defaults');
                    this.highScores = this.getDefaultHighScores();
                    this.saveHighScoresToLocalStorage();
                }
            } else {
                try {
                    const response = await fetch('data/high-scores.json');
                    if (response.ok) {
                        const scoresData = await response.json();
                        this.highScores = Array.isArray(scoresData.highScores) ? scoresData.highScores : [];
                        console.log('High scores loaded from JSON file:', this.highScores.length);
                        this.saveHighScoresToLocalStorage();
                    } else {
                        throw new Error('Failed to load high scores file');
                    }
                } catch (fileError) {
                    console.warn('Could not load high scores from file, using defaults:', fileError);
                    this.highScores = this.getDefaultHighScores();
                    this.saveHighScoresToLocalStorage();
                }
            }

            this.validateHighScores();

        } catch (error) {
            console.error('Error loading high scores:', error);
            this.highScores = this.getDefaultHighScores();
            this.saveHighScoresToLocalStorage();
        }

        this.safeUpdateHUD();
    }

    validateHighScores() {
        if (!Array.isArray(this.highScores)) {
            console.warn('High scores was not an array, resetting to defaults');
            this.highScores = this.getDefaultHighScores();
            return;
        }

        this.highScores = this.highScores.filter(score =>
            score &&
            typeof score === 'object' &&
            typeof score.name === 'string' &&
            typeof score.score === 'number' &&
            score.score >= 0
        ).map(score => ({
            name: score.name || 'UNKNOWN',
            score: Number(score.score) || 0,
            date: score.date || new Date().toISOString()
        }));

        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10);
    }

    getDefaultHighScores() {
        return [
            { name: 'ACE', score: 10000, date: new Date('2024-01-01').toISOString() },
            { name: 'PRO', score: 7500, date: new Date('2024-01-01').toISOString() },
            { name: 'NEW', score: 5000, date: new Date('2024-01-01').toISOString() },
            { name: 'ROOKIE', score: 2500, date: new Date('2024-01-01').toISOString() }
        ];
    }

    saveHighScoresToLocalStorage() {
        try {
            localStorage.setItem('stareater_highscores', JSON.stringify(this.highScores));
        } catch (error) {
            console.error('Error saving high scores to localStorage:', error);
        }
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

    initializeSoundIcons() {
        const soundOn = document.getElementById('sound-on-icon');
        const soundOff = document.getElementById('sound-off-icon');

        if (soundOn && soundOff) {
            if (this.soundEnabled) {
                soundOn.classList.remove('hidden');
                soundOff.classList.add('hidden');
            } else {
                soundOn.classList.add('hidden');
                soundOff.classList.remove('hidden');
            }
        }
    }

    startGame() {
        this.hideModal('intro-modal');
        this.gameState = 'playing';
        this.score = 0;
        this.lives = this.config.player.startingLives;
        this.level = this.config.player.startingLevel;
        this.starsCollected = 0;
        this.starsRequired = this.config.gameProgression.starsPerLevel;
        this.resetGame();
        this.updateHUD();
        this.clearCanvas();
        if (this.enemies) this.enemies.spawnEnemies();

        this.updatePlayPauseIcons(false);
    }

    restartGame() {
        console.log('Restarting game');
        this.hideAllModals();
        this.gameState = 'playing';
        this.score = 0;
        this.lives = this.config.player.startingLives;
        this.level = this.config.player.startingLevel;
        this.starsCollected = 0;
        this.starsRequired = this.config.gameProgression.starsPerLevel;
        this.resetGame();
        this.clearCanvas();
        this.updateHUD();
        this.resetPowerUpIcons();
        if (this.enemies) this.enemies.spawnEnemies();

        this.updatePlayPauseIcons(false);
    }

    resetGame() {
        if (this.player) this.player.reset();
        if (this.enemies) this.enemies.clear();
        if (this.powerups) this.powerups.clear();
        if (this.collectibles) this.collectibles.clear();
        if (this.projectiles) this.projectiles.clear();
        if (this.particles) this.particles.clear();
        if (this.boss) this.boss.clear();

        // Reset boss fight state
        this.bossFightInProgress = false;

        // Clear power-up states
        if (this.powerUpStateManager) {
            this.powerUpStateManager.clear();
        }

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
        this.updatePlayPauseIcons(false);
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

        // Update power-up cooldowns
        if (this.powerUpStateManager) {
            this.powerUpStateManager.updateCooldowns(this.deltaTime);
        }

        this.updatePlayerInput();
        if (this.player) this.player.update(this.deltaTime);
        if (this.enemies) this.enemies.update(this.deltaTime);
        if (this.powerups) this.powerups.update(this.deltaTime);
        if (this.collectibles) this.collectibles.update(this.deltaTime);
        if (this.projectiles) this.projectiles.update(this.deltaTime);
        if (this.particles) this.particles.update(this.deltaTime);
        if (this.boss) this.boss.update(this.deltaTime);
        if (this.ui) this.ui.update(this.deltaTime);

        // Sync star power state with UI when time is running out
        if (this.player && this.player.starPowerTime > 0 && this.player.starPowerTime < 0.1) {
            if (this.ui && this.ui.updatePowerUpState) {
                this.ui.updatePowerUpState('starPower', {
                    active: false,
                    duration: 0
                });
            }
        }

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
            if (CollisionManager.checkRectCollision(this.player.bounds, enemy)) {
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
            if (CollisionManager.checkRectCollision(this.player.bounds, this.boss.currentBoss)) {
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

            if (CollisionManager.checkRectCollision(playerBounds, cloud)) {
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

    checkLevelProgression() {
        if (this.starsCollected >= this.starsRequired && this.gameState === 'playing') {
            this.levelComplete();
        }
    }

    levelComplete() {
        // Prevent multiple level completions
        if (this.bossFightInProgress) return;

        this.level++;
        this.starsCollected = 0;
        this.updateHUD();

        if (this.level === 60) {
            if (this.powerups) {
                this.powerups.unlockExtendedPower();
            }
        }

        if (this.powerups) {
            this.powerups.checkPowerUpAvailability();
        }

        if (this.particles) {
            this.particles.createTextEffect(
                this.canvas.width / 2,
                this.canvas.height / 2,
                `LEVEL ${this.level}`,
                '#ffd700'
            );
        }

        if (this.config.enemies.bossLevels.includes(this.level)) {
            setTimeout(() => {
                if (this.gameState === 'playing' && this.boss) {
                    this.startBossFight(this.level);
                }
            }, 1500);
        } else {
            setTimeout(() => {
                if (this.gameState === 'playing' && this.enemies) {
                    this.enemies.spawnEnemies();
                }
            }, 1500);
        }
    }

    startBossFight(level) {
        // Prevent multiple boss fight initializations
        if (this.bossFightInProgress) return;

        this.bossFightInProgress = true;

        if (this.boss) {
            this.boss.spawnBoss(level);

            // Single coordinated radar activation
            const bossLevelsWithRadar = [30, 45, 60, 75];
            if (bossLevelsWithRadar.includes(level) && this.powerups) {
                this.powerups.activateBossRadar();
            }
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

    safeUpdateHUD() {
        try {
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.textContent = this.score.toString().padStart(5, '0');
            }

            const highScoreElement = document.getElementById('high-score');
            if (highScoreElement) {
                const topScore = this.getTopScore();
                if (topScore && typeof topScore.score === 'number') {
                    highScoreElement.textContent = `${topScore.score.toString().padStart(5, '0')} ${topScore.name || 'UNKNOWN'}`;
                } else {
                    highScoreElement.textContent = '00000';
                }
            }

            const levelElement = document.getElementById('level');
            if (levelElement) {
                levelElement.textContent = (this.level || 1).toString().padStart(2, '0');
            }

            const livesElement = document.getElementById('lives');
            if (livesElement) {
                livesElement.textContent = (this.lives || 3).toString();
            }

            const starsElement = document.getElementById('stars-progress');
            if (starsElement) {
                starsElement.textContent = `${this.starsCollected || 0}/${this.starsRequired || 10}`;
            }

            const progressBar = document.getElementById('stars-progress-bar');
            if (progressBar) {
                const progressPercent = ((this.starsCollected || 0) / (this.starsRequired || 10)) * 100;
                progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
            }
        } catch (error) {
            console.warn('Error in safe HUD update:', error);
        }
    }

    updateHUD() {
        this.safeUpdateHUD();
    }

    gameOver() {
        this.gameState = 'gameover';
        this.bossFightInProgress = false;
        this.saveHighScore();

        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = this.score.toString().padStart(5, '0');
        }

        this.showModal('game-over-modal');
        this.updatePlayPauseIcons(true);

        if (this.particles) {
            this.particles.createExplosion(this.canvas.width / 2, this.canvas.height / 2, '#ff4444', 20);
        }
    }

    victory() {
        this.gameState = 'victory';
        this.bossFightInProgress = false;
        this.saveHighScore();

        const victoryScoreElement = document.getElementById('victory-score');
        if (victoryScoreElement) {
            victoryScoreElement.textContent = this.score.toString().padStart(5, '0');
        }

        this.showModal('victory-modal');
        this.updatePlayPauseIcons(true);

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

    saveHighScore() {
        if (this.score > 0) {
            const newScore = {
                name: this.playerName,
                score: this.score,
                date: new Date().toISOString()
            };

            this.highScores.push(newScore);
            this.highScores.sort((a, b) => b.score - a.score);
            this.highScores = this.highScores.slice(0, 10);
            this.saveHighScoresToLocalStorage();

            this.updateHUD();

            if (this.highScores[0] && this.highScores[0].score === this.score && this.particles) {
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
        if (this.highScores.length === 0) return null;

        const topScore = this.highScores[0];
        if (!topScore || typeof topScore.score !== 'number') {
            return null;
        }

        return topScore;
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

            const date = new Date(score.date);
            const formattedDate = date.toLocaleDateString();

            item.innerHTML = `
                <span class="score-rank">${index + 1}.</span>
                <span class="score-name">${score.name || 'UNKNOWN'}</span>
                <span class="score-value">${(score.score || 0).toString().padStart(5, '0')}</span>
                <span class="score-date">${formattedDate}</span>
            `;
            list.appendChild(item);
        });
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.updatePlayPauseIcons(true);
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.updatePlayPauseIcons(false);
        }
    }

    updatePlayPauseIcons(showPlayIcon) {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');

        if (playIcon && pauseIcon) {
            if (showPlayIcon) {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            } else {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
            }
        }
    }

    toggleSound() {
        const soundOn = document.getElementById('sound-on-icon');
        const soundOff = document.getElementById('sound-off-icon');

        if (soundOn && soundOff) {
            this.soundEnabled = !this.soundEnabled;

            if (this.soundEnabled) {
                soundOn.classList.remove('hidden');
                soundOff.classList.add('hidden');
                console.log('Sound turned ON');
            } else {
                soundOn.classList.add('hidden');
                soundOff.classList.remove('hidden');
                console.log('Sound turned OFF');
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