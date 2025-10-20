import { CollisionManager } from './physics/collision-manager.js';

export class PowerUpManager {
    constructor(game, config, powerUpStateManager) {
        this.game = game;
        this.config = config;
        this.powerUpStateManager = powerUpStateManager;

        this.shieldActive = false;
        this.shieldTime = 0;
        this.shieldCooldown = 0;
        this.ionPulseCooldown = 0;
        this.radarActive = false;
        this.radarCooldown = 0;
        this.radarTime = 0;
        this.endlessMode = false;

        this.extendedPowerUnlocked = false;
        this.bossRadarInterval = null;

        // Initialize all power-ups as locked, they'll be unlocked by bosses
        this.unlockedPowerUps = {
            shield: false,  // Unlocked by boss 2 (level 30)
            ionPulse: false, // Unlocked by boss 3 (level 45)
            radar: false    // Unlocked by boss 1 (level 15)
        };

        this.shieldElement = null;
        this.frozenEnemies = new Map();

        // Subscribe to power-up state changes
        if (this.powerUpStateManager) {
            this.powerUpStateManager.subscribe((type, state) => this.onPowerUpStateChange(type, state));
        }
    }

    onPowerUpStateChange(type, state) {
        // Sync internal state with state manager
        switch (type) {
            case 'shield':
                this.unlockedPowerUps.shield = state.unlocked;
                break;
            case 'ionPulse':
                this.unlockedPowerUps.ionPulse = state.unlocked;
                break;
            case 'radar':
                this.unlockedPowerUps.radar = state.unlocked;
                break;
        }
    }

    // Check power-up availability based on level progression
    checkPowerUpAvailability() {
        const level = this.game.level || 1;
        const config = this.config.powerups;

        // Unlock power-ups based on level progression (backup in case boss rewards fail)
        if (!this.unlockedPowerUps.radar && level >= config.radar.availableFromLevel) {
            this.unlockPowerUp('radar');
            console.log('Radar unlocked by level progression');
        }

        if (!this.unlockedPowerUps.shield && level >= config.shield.availableFromLevel) {
            this.unlockPowerUp('shield');
            console.log('Shield unlocked by level progression');
        }

        if (!this.unlockedPowerUps.ionPulse && level >= config.ionPulse.availableFromLevel) {
            this.unlockPowerUp('ionPulse');
            console.log('Ion Pulse unlocked by level progression');
        }
    }

    update(deltaTime) {
        this.checkPowerUpAvailability(); // Check for level-based unlocks
        this.updatePowerUps(deltaTime);
        this.updateShieldPosition();
        this.updateFrozenEnemies(deltaTime);
        this.checkShieldCollisions();
    }

    updatePowerUps(deltaTime) {
        if (this.shieldActive) {
            this.shieldTime -= deltaTime;
            if (this.shieldTime <= 0) {
                this.deactivateShield();
            }
        }

        if (this.shieldCooldown > 0) {
            this.shieldCooldown -= deltaTime;
        }

        if (this.ionPulseCooldown > 0) {
            this.ionPulseCooldown -= deltaTime;
        }

        if (this.radarActive && !this.isBossLevelWithAutoRadar()) {
            this.radarTime -= deltaTime;
            if (this.radarTime <= 0) {
                this.radarActive = false;
                // Clear boss radar interval if active
                if (this.bossRadarInterval) {
                    clearInterval(this.bossRadarInterval);
                    this.bossRadarInterval = null;
                }
            }
        }

        if (this.radarCooldown > 0) {
            this.radarCooldown -= deltaTime;
        }
    }

    isBossLevelWithAutoRadar() {
        const level = this.game.level || 1;
        const bossLevelsWithRadar = [30, 45, 60, 75];
        return bossLevelsWithRadar.includes(level) && this.game.boss && this.game.boss.bossActive;
    }

    updateShieldPosition() {
        if (this.shieldActive && this.shieldElement && this.game.player) {
            const player = this.game.player;

            this.shieldElement.style.left = (player.x - 24) + 'px';
            this.shieldElement.style.top = (player.y - 24) + 'px';

            const degrees = player.angle * (180 / Math.PI);
            this.shieldElement.style.transform = `rotate(${degrees}deg)`;
        }
    }

    updateFrozenEnemies(deltaTime) {
        if (this.game.enemies) {
            const enemies = this.game.enemies.getEnemies();

            enemies.forEach(enemy => {
                if (enemy.freezeTime && enemy.freezeTime > 0) {
                    enemy.freezeTime -= deltaTime;

                    if (enemy.freezeTime <= 0) {
                        this.unfreezeEnemy(enemy);
                    }
                }
            });
        }
    }

    checkShieldCollisions() {
        if (this.shieldActive && this.game.enemies && this.game.player) {
            const playerCenter = this.game.player.center;
            const shieldRadius = 48;
            const enemies = this.game.enemies.getEnemies();

            enemies.forEach(enemy => {
                if (!enemy.freezeTime || enemy.freezeTime <= 0) {
                    const enemyCenterX = enemy.x + enemy.width / 2;
                    const enemyCenterY = enemy.y + enemy.height / 2;

                    const dx = enemyCenterX - playerCenter.x;
                    const dy = enemyCenterY - playerCenter.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < shieldRadius) {
                        const freezeDuration = this.extendedPowerUnlocked ?
                            this.config.extendedPower.shieldBoost.freezeDuration :
                            this.config.powerups.shield.freezeDuration;
                        this.freezeEnemy(enemy, freezeDuration);

                        this.game.addScore(1);
                        if (this.game.particles) {
                            this.game.particles.createExplosion(
                                enemyCenterX,
                                enemyCenterY,
                                '#00ffff',
                                3
                            );
                        }
                    }
                }
            });
        }
    }

    activateShield() {
        if (this.unlockedPowerUps.shield && this.shieldCooldown <= 0 && !this.shieldActive) {
            this.shieldActive = true;

            const shieldConfig = this.config.powerups.shield;
            const extendedConfig = this.config.extendedPower.shieldBoost;

            this.shieldTime = this.extendedPowerUnlocked ? extendedConfig.duration : shieldConfig.duration;
            this.shieldCooldown = this.extendedPowerUnlocked ?
                (extendedConfig.cooldown || shieldConfig.rechargeTime) : shieldConfig.rechargeTime;

            this.createShieldEffect();

            // Update state manager
            if (this.powerUpStateManager) {
                this.powerUpStateManager.activatePowerUp('shield', this.shieldTime);
                this.powerUpStateManager.startCooldown('shield', this.shieldCooldown);
            }

            const freezeRadius = 48;
            this.freezeEnemiesInRadius(freezeRadius);

            console.log('Shield activated for', this.shieldTime, 'seconds');
            return true;
        }
        return false;
    }

    deactivateShield() {
        this.shieldActive = false;
        this.shieldTime = 0;
        this.removeShieldEffect();

        // Update state manager
        if (this.powerUpStateManager) {
            this.powerUpStateManager.deactivatePowerUp('shield');
        }

        console.log('Shield deactivated');
    }

    createShieldEffect() {
        // Create shield as child of player element for proper positioning
        const playerElement = document.getElementById('player-avatar');
        if (!playerElement) return;

        this.shieldElement = document.createElement('div');
        this.shieldElement.className = 'shield-powerup';

        playerElement.appendChild(this.shieldElement);
        this.updateShieldPosition();
    }

    removeShieldEffect() {
        if (this.shieldElement) {
            this.shieldElement.remove();
            this.shieldElement = null;
        }
    }

    freezeEnemiesInRadius(radius) {
        if (this.game.enemies) {
            const playerCenter = this.game.player.center;
            const enemies = this.game.enemies.getEnemies();

            enemies.forEach(enemy => {
                const dx = enemy.x + enemy.width / 2 - playerCenter.x;
                const dy = enemy.y + enemy.height / 2 - playerCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < radius) {
                    const freezeDuration = this.extendedPowerUnlocked ?
                        this.config.extendedPower.shieldBoost.freezeDuration :
                        this.config.powerups.shield.freezeDuration;
                    this.freezeEnemy(enemy, freezeDuration);
                }
            });
        }
    }

    freezeEnemy(enemy, duration) {
        if (enemy.freezeTime && enemy.freezeTime > 0) {
            enemy.freezeTime += duration;
        } else {
            enemy.originalSpeed = enemy.speed;
            enemy.speed = 0;
            enemy.freezeTime = duration;

            this.createFreezeEffect(enemy);
        }

        this.updateFreezeEffect(enemy);
    }

    updateFreezeEffect(enemy) {
        if (enemy.freezeEffect) {
            enemy.freezeEffect.remove();
        }
        this.createFreezeEffect(enemy);
    }

    createFreezeEffect(enemy) {
        const freezeEffect = document.createElement('div');
        freezeEffect.className = 'enemy-freeze-effect';
        freezeEffect.style.left = `${enemy.x - 5}px`;
        freezeEffect.style.top = `${enemy.y - 5}px`;
        freezeEffect.style.width = `${enemy.width + 10}px`;
        freezeEffect.style.height = `${enemy.height + 10}px`;

        const timerText = document.createElement('div');
        timerText.className = 'freeze-timer';
        timerText.textContent = Math.ceil(enemy.freezeTime) + 's';
        freezeEffect.appendChild(timerText);

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(freezeEffect);
            enemy.freezeEffect = freezeEffect;

            const updateTimer = setInterval(() => {
                if (enemy.freezeTime > 0 && timerText.parentNode) {
                    timerText.textContent = Math.ceil(enemy.freezeTime) + 's';
                } else {
                    clearInterval(updateTimer);
                }
            }, 100);

            setTimeout(() => {
                if (freezeEffect.parentNode) {
                    freezeEffect.parentNode.removeChild(freezeEffect);
                }
                clearInterval(updateTimer);
            }, enemy.freezeTime * 1000);
        }
    }

    unfreezeEnemy(enemy) {
        if (enemy.originalSpeed !== undefined) {
            enemy.speed = enemy.originalSpeed;
            delete enemy.originalSpeed;
        }

        if (enemy.freezeEffect) {
            enemy.freezeEffect.remove();
            delete enemy.freezeEffect;
        }

        enemy.freezeTime = 0;
    }

    isShieldActive() {
        return this.shieldActive;
    }

    activateIonPulse() {
        if (this.unlockedPowerUps.ionPulse && this.ionPulseCooldown <= 0) {
            const ionConfig = this.config.powerups.ionPulse;
            const extendedConfig = this.config.extendedPower.ionPulseBoost;

            this.ionPulseCooldown = this.extendedPowerUnlocked ?
                (extendedConfig.cooldown || ionConfig.rechargeTime) : ionConfig.rechargeTime;

            this.createIonPulseEffect();
            const radius = this.extendedPowerUnlocked ? extendedConfig.radius : ionConfig.radius;
            const enemiesKilled = this.damageEnemiesInRadius(radius);

            // Update state manager
            if (this.powerUpStateManager) {
                this.powerUpStateManager.startCooldown('ionPulse', this.ionPulseCooldown);
            }

            console.log('Ion Pulse activated, killed', enemiesKilled, 'enemies');
            return true;
        }
        return false;
    }

    createIonPulseEffect() {
        const pulse = document.createElement('div');
        pulse.className = 'ion-pulse-powerup';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer && this.game.player) {
            const playerCenter = this.game.player.center;
            pulse.style.left = (playerCenter.x - 225) + 'px';
            pulse.style.top = (playerCenter.y - 225) + 'px';

            gameContainer.appendChild(pulse);

            setTimeout(() => {
                if (pulse.parentNode) {
                    pulse.parentNode.removeChild(pulse);
                }
            }, 1000);
        }
    }

    damageEnemiesInRadius(radius) {
        let enemiesKilled = 0;
        if (this.game.enemies) {
            const playerCenter = this.game.player.center;
            const enemies = this.game.enemies.getEnemies();

            const ionConfig = this.config.powerups.ionPulse;
            const extendedConfig = this.config.extendedPower.ionPulseBoost;
            const damage = this.extendedPowerUnlocked ? extendedConfig.damage : ionConfig.damage;

            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const dx = enemy.x + enemy.width / 2 - playerCenter.x;
                const dy = enemy.y + enemy.height / 2 - playerCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < radius) {
                    enemy.health -= damage;
                    if (enemy.health <= 0) {
                        this.game.enemies.createExplosion(enemy);
                        enemies.splice(i, 1);
                        enemiesKilled++;
                    } else {
                        // Visual feedback for damaged enemies
                        if (this.game.particles) {
                            this.game.particles.createExplosion(
                                enemy.x + enemy.width / 2,
                                enemy.y + enemy.height / 2,
                                '#00ffff',
                                2
                            );
                        }
                    }
                }
            }

            if (enemiesKilled > 0) {
                this.game.addScore(enemiesKilled * 5);
            }
        }
        return enemiesKilled;
    }

    // RADAR FUNCTIONALITY
    activateRadar() {
        if (this.unlockedPowerUps.radar && this.radarCooldown <= 0) {
            this.radarActive = true;
            this.radarCooldown = this.config.powerups.radar.rechargeTime;
            this.radarTime = this.config.powerups.radar.duration;

            this.createRadarPing();
            this.revealCollectibles();

            // Update state manager
            if (this.powerUpStateManager) {
                this.powerUpStateManager.activatePowerUp('radar', this.radarTime);
                this.powerUpStateManager.startCooldown('radar', this.radarCooldown);
            }

            console.log('Radar activated for', this.radarTime, 'seconds');
            return true;
        }
        return false;
    }

    activateBossRadar() {
        if (this.unlockedPowerUps.radar && !this.radarActive) {
            this.radarActive = true;
            this.radarTime = 999; // Long duration for boss fights

            // Create continuous radar pings for boss levels
            this.createBossRadarPings();

            // Update state manager
            if (this.powerUpStateManager) {
                this.powerUpStateManager.activatePowerUp('radar', this.radarTime);
            }

            console.log('Boss Radar auto-activated for boss fight');
            return true;
        }
        return false;
    }

    createBossRadarPings() {
        if (!this.radarActive || !this.game.boss || !this.game.boss.currentBoss) return;

        // Clear any existing ping intervals
        if (this.bossRadarInterval) {
            clearInterval(this.bossRadarInterval);
        }

        // Create continuous pings every 2 seconds during boss fight
        this.bossRadarInterval = setInterval(() => {
            if (this.radarActive && this.game.boss && this.game.boss.currentBoss) {
                this.createRadarPing(true);
                this.revealBossCollectibles();
            } else {
                clearInterval(this.bossRadarInterval);
            }
        }, 2000);
    }

    revealBossCollectibles() {
        if (!this.game.collectibles) return;

        // Show all collectibles with radar effect
        this.game.collectibles.getCollectibles().forEach(collectible => {
            this.createRadarIndicator(collectible, true);
        });

        // Show bomb spawn locations 3 seconds before they appear
        this.showBombSpawnPredictions();
    }

    showBombSpawnPredictions() {
        if (!this.game.boss || !this.radarActive) return;

        const warningTime = this.getBombSpawnWarningTime();

        // Predict bomb spawn locations based on boss behavior
        const predictedBombLocations = this.predictBombSpawnLocations();

        predictedBombLocations.forEach((location, index) => {
            setTimeout(() => {
                if (this.radarActive) {
                    this.createBombSpawnWarning(location.x, location.y, warningTime);
                }
            }, index * 500); // Stagger the warnings
        });
    }

    predictBombSpawnLocations() {
        const locations = [];
        const canvas = this.game.canvas;

        if (!canvas) return locations;

        // Predict 3 bomb locations in safe areas (not too close to player or edges)
        for (let i = 0; i < 3; i++) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 10;

            do {
                x = 50 + Math.random() * (canvas.width - 100);
                y = 100 + Math.random() * (canvas.height - 200);
                attempts++;
            } while (this.isLocationTooCloseToPlayer(x, y) && attempts < maxAttempts);

            locations.push({ x, y });
        }

        return locations;
    }

    isLocationTooCloseToPlayer(x, y) {
        if (!this.game.player) return false;

        const playerCenter = this.game.player.center;
        const distance = Math.sqrt(
            Math.pow(x - playerCenter.x, 2) +
            Math.pow(y - playerCenter.y, 2)
        );

        return distance < 100; // Minimum distance from player
    }

    createBombSpawnWarning(x, y, warningTime) {
        const warning = document.createElement('div');
        warning.className = 'bomb-spawn-warning';
        warning.style.cssText = `
            position: absolute;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border: 2px dashed #1e90ff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 935;
            animation: bombWarningPulse ${warningTime}s ease-out forwards;
            box-shadow: 0 0 20px #1e90ff;
        `;

        // Add countdown text
        const countdown = document.createElement('div');
        countdown.className = 'bomb-countdown';
        countdown.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            color: #1e90ff;
            font-size: 10px;
            font-weight: bold;
            font-family: 'Press Start 2P', monospace;
            text-shadow: 0 0 5px #000;
        `;
        countdown.textContent = Math.ceil(warningTime) + 's';
        warning.appendChild(countdown);

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(warning);

            // Update countdown
            let timeLeft = warningTime;
            const countdownInterval = setInterval(() => {
                timeLeft -= 1;
                if (timeLeft > 0) {
                    countdown.textContent = Math.ceil(timeLeft) + 's';
                } else {
                    clearInterval(countdownInterval);
                }
            }, 1000);

            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
                clearInterval(countdownInterval);
            }, warningTime * 1000);
        }
    }

    createRadarPing(isBossRadar = false) {
        const ping = document.createElement('div');
        ping.className = `radar-ping-powerup ${isBossRadar ? 'boss-radar' : ''}`;

        const gameContainer = document.getElementById('game-container');
        if (gameContainer && this.game.player) {
            const playerCenter = this.game.player.center;
            ping.style.left = (playerCenter.x - 150) + 'px';
            ping.style.top = (playerCenter.y - 150) + 'px';
            ping.style.width = '300px';
            ping.style.height = '300px';

            gameContainer.appendChild(ping);
            setTimeout(() => {
                if (ping.parentNode) {
                    ping.parentNode.removeChild(ping);
                }
            }, isBossRadar ? 2000 : 3000);
        }
    }

    revealCollectibles() {
        if (this.game.collectibles) {
            this.game.collectibles.getCollectibles().forEach(collectible => {
                this.createRadarIndicator(collectible, false);
            });
        }
    }

    createRadarIndicator(collectible, isBossRadar = false) {
        const indicator = document.createElement('div');
        indicator.className = `radar-indicator ${isBossRadar ? 'boss-indicator' : ''}`;
        indicator.style.cssText = `
            position: absolute;
            z-index: 920;
            width: 10px;
            height: 10px;
            background: ${isBossRadar ? '#1e90ff' : '#ffa500'};
            border-radius: 50%;
            box-shadow: 0 0 10px ${isBossRadar ? '#1e90ff' : '#ffa500'};
            pointer-events: none;
            animation: radarBlink 1s infinite;
        `;
        indicator.style.left = (collectible.x + collectible.width / 2 - 5) + 'px';
        indicator.style.top = (collectible.y + collectible.height / 2 - 5) + 'px';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(indicator);
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, this.config.powerups.radar.duration * 1000);
        }
    }

    unlockExtendedPower() {
        if (!this.extendedPowerUnlocked) {
            this.extendedPowerUnlocked = true;
            console.log('Extended Power unlocked!');

            this.createExtendedPowerUnlockEffect();
            return true;
        }
        return false;
    }

    createExtendedPowerUnlockEffect() {
        const effect = document.createElement('div');
        effect.className = 'extended-power-unlock-effect';
        effect.textContent = 'EXTENDED POWER UNLOCKED!';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(effect);
            setTimeout(() => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            }, 3000);
        }
    }

    getBombSpawnWarningTime() {
        const radarConfig = this.config.powerups.radar;
        const extendedConfig = this.config.extendedPower.radarBoost;
        return this.extendedPowerUnlocked ? extendedConfig.bombWarningTime : radarConfig.bombWarningTime;
    }

    activateEndlessMode() {
        if (!this.endlessMode) {
            this.endlessMode = true;
            this.game.level = 76;

            const indicator = document.createElement('div');
            indicator.className = 'endless-mode-indicator';
            indicator.textContent = 'ENDLESS MODE';

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(indicator);
            }

            // Update state manager
            if (this.powerUpStateManager) {
                this.powerUpStateManager.setState('endlessMode', {
                    unlocked: true,
                    active: true
                });
            }

            console.log('Endless Mode activated!');
            return true;
        }
        return false;
    }

    unlockPowerUp(powerUpType) {
        if (this.unlockedPowerUps.hasOwnProperty(powerUpType) && !this.unlockedPowerUps[powerUpType]) {
            this.unlockedPowerUps[powerUpType] = true;

            // Update state manager
            if (this.powerUpStateManager) {
                this.powerUpStateManager.unlockPowerUp(powerUpType);
            }

            console.log(`Power-up unlocked: ${powerUpType}`);

            // Visual feedback for unlocking
            if (this.game.particles) {
                this.game.particles.createTextEffect(
                    this.game.canvas.width / 2,
                    this.game.canvas.height / 2 - 50,
                    `${powerUpType.toUpperCase()} UNLOCKED!`,
                    '#00ff00'
                );
            }

            return true;
        }
        return false;
    }

    getPowerUpState(type) {
        const state = {
            unlocked: this.unlockedPowerUps[type] || false,
            cooldown: 0,
            active: false
        };

        switch (type) {
            case 'shield':
                state.cooldown = this.shieldCooldown;
                state.active = this.shieldActive;
                break;
            case 'ionPulse':
                state.cooldown = this.ionPulseCooldown;
                state.active = false; // Instant activation
                break;
            case 'radar':
                state.cooldown = this.radarCooldown;
                state.active = this.radarActive;
                break;
        }

        return state;
    }

    isPowerUpUnlocked(type) {
        return this.unlockedPowerUps[type] || false;
    }

    clear() {
        this.shieldActive = false;
        this.shieldTime = 0;
        this.shieldCooldown = 0;
        this.ionPulseCooldown = 0;
        this.radarActive = false;
        this.radarCooldown = 0;
        this.radarTime = 0;
        this.endlessMode = false;

        // Clear boss radar interval
        if (this.bossRadarInterval) {
            clearInterval(this.bossRadarInterval);
            this.bossRadarInterval = null;
        }

        // Remove all visual effects
        document.querySelectorAll('.shield-powerup, .ion-pulse-powerup, .radar-ping-powerup, .radar-indicator, .extended-power-unlock-effect, .endless-mode-indicator, .enemy-freeze-effect, .bomb-spawn-warning, .bomb-countdown').forEach(el => el.remove());

        this.shieldElement = null;
        this.frozenEnemies.clear();
    }
}