export class PowerUpManager {
    constructor(game) {
        this.game = game;

        // Power-up states - FIXED: Start with all power-ups locked except those earned from bosses
        this.shieldActive = false;
        this.shieldTime = 0;
        this.shieldCooldown = 0;
        this.ionPulseCooldown = 0;
        this.radarActive = false;
        this.radarCooldown = 0;
        this.endlessMode = false;

        // Extended Power upgrade (passive - no HUD icon needed)
        this.extendedPowerUnlocked = false;

        // FIXED: Power-up unlock states - start all locked, unlock via boss rewards
        this.unlockedPowerUps = {
            shield: false,    // Unlocked after Boss 2 (Skull Reaper)
            ionPulse: false,  // Unlocked after Boss 3 (The Machine)
            radar: false      // Unlocked after Boss 1 (Meteor Commander)
        };

        // DOM elements
        this.shieldElement = null;
    }

    update(deltaTime) {
        this.updatePowerUps(deltaTime);
        this.updateShieldPosition();
        this.updateFrozenEnemies(deltaTime);
        this.checkShieldCollisions();
    }

    updatePowerUps(deltaTime) {
        // Shield duration
        if (this.shieldActive) {
            this.shieldTime -= deltaTime;
            if (this.shieldTime <= 0) {
                this.deactivateShield();
            }
        }

        // Shield cooldown
        if (this.shieldCooldown > 0) {
            this.shieldCooldown -= deltaTime;
        }

        // Ion Pulse cooldown
        if (this.ionPulseCooldown > 0) {
            this.ionPulseCooldown -= deltaTime;
        }

        // Radar cooldown
        if (this.radarCooldown > 0) {
            this.radarCooldown -= deltaTime;
        }
    }

    updateShieldPosition() {
        if (this.shieldActive && this.shieldElement && this.game.player) {
            const player = this.game.player;

            // Position shield centered on player
            this.shieldElement.style.left = (player.x - 24) + 'px';
            this.shieldElement.style.top = (player.y - 24) + 'px';

            // Rotate shield with player
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
                        this.freezeEnemy(enemy, 2);

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

    // SHIELD POWER-UP
    activateShield() {
        if (this.unlockedPowerUps.shield && this.shieldCooldown <= 0 && !this.shieldActive) {
            this.shieldActive = true;
            this.shieldTime = this.extendedPowerUnlocked ? 15 : 10;
            this.shieldCooldown = 30;

            this.createShieldEffect();

            // Update UI - show active state and start cooldown
            if (this.game.ui) {
                this.game.ui.activatePowerUp('shield', this.shieldTime);
                this.game.ui.startCooldown('shield');
            }

            this.freezeEnemiesInRadius(48);

            return true;
        }
        return false;
    }

    deactivateShield() {
        this.shieldActive = false;
        this.shieldTime = 0;
        this.removeShieldEffect();
    }

    createShieldEffect() {
        this.shieldElement = document.createElement('div');
        this.shieldElement.className = 'shield-powerup';
        this.shieldElement.style.width = '96px';
        this.shieldElement.style.height = '96px';
        this.shieldElement.style.position = 'absolute';
        this.shieldElement.style.zIndex = '950';
        this.shieldElement.style.pointerEvents = 'none';
        this.shieldElement.style.transformOrigin = 'center center';
        this.shieldElement.style.transition = 'none';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer && this.game.player) {
            gameContainer.appendChild(this.shieldElement);
            this.updateShieldPosition();
        }
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
                const dx = enemy.x - playerCenter.x;
                const dy = enemy.y - playerCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < radius) {
                    this.freezeEnemy(enemy, 2);
                }
            });
        }
    }

    freezeEnemy(enemy, duration) {
        // If enemy is already frozen, add to existing freeze time
        if (enemy.freezeTime && enemy.freezeTime > 0) {
            enemy.freezeTime += duration;
            console.log(`Extended freeze time for enemy: ${enemy.freezeTime.toFixed(1)}s`);
        } else {
            // New freeze
            enemy.originalSpeed = enemy.speed;
            enemy.originalBehavior = enemy.behavior;

            enemy.speed = 0;
            enemy.behavior = 'frozen';
            enemy.freezeTime = duration;

            this.createFreezeEffect(enemy);
            console.log(`Froze enemy: ${duration}s`);
        }

        // Update freeze effect visual
        this.updateFreezeEffect(enemy);
    }

    updateFreezeEffect(enemy) {
        // Remove existing freeze effect if any
        if (enemy.freezeEffect) {
            enemy.freezeEffect.remove();
        }

        // Create new freeze effect
        this.createFreezeEffect(enemy);
    }

    createFreezeEffect(enemy) {
        const freezeEffect = document.createElement('div');
        freezeEffect.className = 'enemy-freeze-effect';
        freezeEffect.style.position = 'absolute';
        freezeEffect.style.left = (enemy.x - 5) + 'px';
        freezeEffect.style.top = (enemy.y - 5) + 'px';
        freezeEffect.style.width = (enemy.width + 10) + 'px';
        freezeEffect.style.height = (enemy.height + 10) + 'px';
        freezeEffect.style.border = '2px solid #00ffff';
        freezeEffect.style.borderRadius = '4px';
        freezeEffect.style.boxShadow = '0 0 15px #00ffff';
        freezeEffect.style.pointerEvents = 'none';
        freezeEffect.style.zIndex = '945';
        freezeEffect.style.animation = 'freezePulse 1s ease-in-out infinite';

        // Add freeze timer text
        const timerText = document.createElement('div');
        timerText.className = 'freeze-timer';
        timerText.style.cssText = `
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ffff;
            font-size: 8px;
            font-weight: bold;
            text-shadow: 0 0 3px #000;
            font-family: 'Press Start 2P', monospace;
            white-space: nowrap;
        `;
        timerText.textContent = Math.ceil(enemy.freezeTime) + 's';
        freezeEffect.appendChild(timerText);

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(freezeEffect);
            enemy.freezeEffect = freezeEffect;

            // Update timer text periodically
            const updateTimer = setInterval(() => {
                if (enemy.freezeTime > 0 && timerText.parentNode) {
                    timerText.textContent = Math.ceil(enemy.freezeTime) + 's';
                } else {
                    clearInterval(updateTimer);
                }
            }, 100);

            // Auto-remove when freeze time expires
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
            enemy.behavior = enemy.originalBehavior;
            delete enemy.originalSpeed;
            delete enemy.originalBehavior;
        }

        // Remove freeze effect
        if (enemy.freezeEffect) {
            enemy.freezeEffect.remove();
            delete enemy.freezeEffect;
        }

        enemy.freezeTime = 0;
    }

    isShieldActive() {
        return this.shieldActive;
    }

    // ION PULSE POWER-UP
    activateIonPulse() {
        if (this.unlockedPowerUps.ionPulse && this.ionPulseCooldown <= 0) {
            this.ionPulseCooldown = this.extendedPowerUnlocked ? 20 : 25;

            this.createIonPulseEffect();
            const enemiesKilled = this.damageEnemiesInRadius(225);

            // Update UI - start cooldown
            if (this.game.ui) {
                this.game.ui.startCooldown('ionPulse');
            }

            return true;
        }
        return false;
    }

    createIonPulseEffect() {
        const pulse = document.createElement('div');
        pulse.className = 'ion-pulse-powerup';
        pulse.style.width = '450px';
        pulse.style.height = '450px';
        pulse.style.position = 'absolute';
        pulse.style.zIndex = '940';

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

            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const dx = enemy.x - playerCenter.x;
                const dy = enemy.y - playerCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < radius) {
                    this.game.enemies.createExplosion(enemy);
                    enemies.splice(i, 1);
                    enemiesKilled++;
                }
            }

            if (enemiesKilled > 0) {
                this.game.addScore(enemiesKilled * 5);
            }
        }
        return enemiesKilled;
    }

    // RADAR POWER-UP
    activateRadar() {
        if (this.unlockedPowerUps.radar && this.radarCooldown <= 0) {
            this.radarActive = true;
            this.radarCooldown = 45;

            this.createRadarPing();
            this.revealCollectibles();

            // Update UI - show active state and start cooldown
            if (this.game.ui) {
                this.game.ui.activatePowerUp('radar', 5);
                this.game.ui.startCooldown('radar');
            }

            setTimeout(() => this.radarActive = false, 5000);
            return true;
        }
        return false;
    }

    createRadarPing() {
        const ping = document.createElement('div');
        ping.className = 'radar-ping-powerup';
        ping.style.position = 'absolute';
        ping.style.zIndex = '930';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer && this.game.player) {
            const playerCenter = this.game.player.center;
            ping.style.left = (playerCenter.x - 150) + 'px';
            ping.style.top = (playerCenter.y - 150) + 'px';

            gameContainer.appendChild(ping);
            setTimeout(() => ping.remove(), 3000);
        }
    }

    revealCollectibles() {
        if (this.game.collectibles) {
            this.game.collectibles.getCollectibles().forEach(collectible => {
                const indicator = document.createElement('div');
                indicator.className = 'radar-indicator';
                indicator.style.position = 'absolute';
                indicator.style.zIndex = '920';
                indicator.style.left = (collectible.x + collectible.width / 2 - 5) + 'px';
                indicator.style.top = (collectible.y + collectible.height / 2 - 5) + 'px';

                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    gameContainer.appendChild(indicator);
                    setTimeout(() => indicator.remove(), 5000);
                }
            });
        }
    }

    // EXTENDED POWER UPGRADE
    unlockExtendedPower() {
        this.extendedPowerUnlocked = true;
        console.log('Extended Power unlocked! Upgrades: Shield 15s, Ion Pulse 20s cooldown, Radar 5s warning');

        this.createExtendedPowerUnlockEffect();
        return true;
    }

    createExtendedPowerUnlockEffect() {
        const effect = document.createElement('div');
        effect.className = 'extended-power-unlock-effect';
        effect.textContent = 'EXTENDED POWER UNLOCKED!';
        effect.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff00ff;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px #ff00ff, 0 0 20px #ff00ff;
            z-index: 1001;
            pointer-events: none;
            animation: extendedPowerText 3s ease-out forwards;
            font-family: "Press Start 2P", monospace;
        `;

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
        return this.extendedPowerUnlocked ? 5 : 3;
    }

    // ENDLESS MODE
    activateEndlessMode() {
        this.endlessMode = true;
        this.game.level = 76;

        const indicator = document.createElement('div');
        indicator.className = 'endless-mode-indicator';
        indicator.textContent = 'ENDLESS MODE';
        indicator.style.position = 'fixed';
        indicator.style.zIndex = '1001';
        document.getElementById('game-container').appendChild(indicator);

        if (this.game.ui) {
            this.game.ui.updatePowerUpState('endless', { active: true });
        }
    }

    // POWER-UP UNLOCKING
    unlockPowerUp(powerUpType) {
        if (this.unlockedPowerUps.hasOwnProperty(powerUpType)) {
            this.unlockedPowerUps[powerUpType] = true;
            if (this.game.ui) {
                this.game.ui.unlockPowerUp(powerUpType);
            }
            return true;
        }
        return false;
    }

    // NEW: Auto-activate radar during boss fights as specified in design
    activateBossRadar() {
        if (this.unlockedPowerUps.radar) {
            this.radarActive = true;
            console.log('Radar auto-activated for boss fight');
        }
    }

    clear() {
        this.shieldActive = false;
        this.shieldTime = 0;
        this.shieldCooldown = 0;
        this.ionPulseCooldown = 0;
        this.radarActive = false;
        this.radarCooldown = 0;
        this.endlessMode = false;

        document.querySelectorAll('.shield-powerup, .ion-pulse-powerup, .radar-ping-powerup, .radar-indicator, .extended-power-unlock-effect, .endless-mode-indicator, .enemy-freeze-effect').forEach(el => el.remove());
        this.shieldElement = null;
    }
}