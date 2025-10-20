export class UIManager {
    constructor(game, powerUpStateManager) {
        this.game = game;
        this.config = game.config;
        this.powerUpStateManager = powerUpStateManager;

        this.iconCache = new Map();
        this.blinkTimers = new Map();
        this.cooldownTimers = new Map();
        this.activePowerTimers = new Map();
        this.updateIntervals = new Map();

        // Subscribe to power-up state changes
        if (this.powerUpStateManager) {
            this.powerUpStateManager.subscribe((type, state) => this.onPowerUpStateChange(type, state));
        }
    }

    onPowerUpStateChange(type, state) {
        this.updatePowerUpIcon(type);
    }

    async initialize() {
        console.log('UIManager initialize called');
        await this.loadIcons();
        this.setupPowerUpIcons();
        this.updateHUD();
        this.startPowerUpSync();
        console.log('UIManager initialize completed');
    }

    async loadIcons() {
        const icons = {
            'score': 'hud-player-score.svg',
            'level': 'hud-player-level.svg',
            'lives': 'hud-player-life.svg',
            'endless': 'hud-player-endless-mode.svg',
            'radar': 'hud-player-radar.svg',
            'freeze': 'hud-player-freeze.svg',
            'star-power': 'hud-player-star-power.svg',
            'shield': 'hud-player-shield.svg',
            'ion-pulse': 'hud-player-ion-pulse.svg'
        };

        for (const [name, filename] of Object.entries(icons)) {
            try {
                const response = await fetch(`assets/graphics/${filename}`);
                if (response.ok) {
                    const svgText = await response.text();
                    this.iconCache.set(name, svgText);
                } else {
                    console.warn(`Failed to load icon: ${filename}`);
                    this.iconCache.set(name, this.createFallbackIcon(name));
                }
            } catch (error) {
                console.error(`Error loading icon ${filename}:`, error);
                this.iconCache.set(name, this.createFallbackIcon(name));
            }
        }
    }

    createFallbackIcon(name) {
        const colors = {
            'shield': '#00ff00',
            'ion-pulse': '#00ffff',
            'radar': '#ffa500',
            'star-power': '#1e90ff',
            'endless': '#ff4444'
        };
        const color = colors[name] || '#daa520';
        return `
            <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="${color}" opacity="0.3"/>
                <text x="8" y="12" text-anchor="middle" font-size="10" fill="white">${name.charAt(0).toUpperCase()}</text>
            </svg>
        `;
    }

    setupPowerUpIcons() {
        const powerupsContainer = document.querySelector('.powerups');
        if (!powerupsContainer) return;

        powerupsContainer.innerHTML = '';

        const powerUps = [
            { id: 'shield', type: 'shield', title: 'Shield (Q) - 30s cooldown', color: '#00ff00' },
            { id: 'ionPulse', type: 'ionPulse', title: 'Ion Pulse (E) - 25s cooldown', color: '#00ffff' },
            { id: 'radar', type: 'radar', title: 'Radar (R) - 45s cooldown', color: '#ffa500' },
            { id: 'starPower', type: 'starPower', title: 'Star Power - Invincibility', color: '#1e90ff' },
            { id: 'endlessMode', type: 'endlessMode', title: 'Endless Mode', color: '#ff4444' }
        ];

        powerUps.forEach(powerUp => {
            const iconContainer = document.createElement('div');
            iconContainer.className = 'powerup-container';
            iconContainer.style.position = 'relative';
            iconContainer.style.display = 'inline-block';

            const icon = document.createElement('div');
            icon.id = powerUp.id;
            icon.className = 'powerup-icon';
            const iconName = powerUp.type === 'ionPulse' ? 'ion-pulse' :
                powerUp.type === 'starPower' ? 'star-power' :
                    powerUp.type === 'endlessMode' ? 'endless' : powerUp.type;
            icon.innerHTML = this.iconCache.get(iconName) || this.createFallbackIcon(iconName);
            icon.title = powerUp.title;

            const cooldownTimer = document.createElement('div');
            cooldownTimer.className = 'cooldown-timer';
            cooldownTimer.id = `${powerUp.id}-timer`;
            cooldownTimer.style.cssText = `
                position: absolute;
                top: -12px;
                right: -12px;
                background: ${powerUp.color};
                color: #000;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 8px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 5px ${powerUp.color};
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 1001;
            `;

            const activeTimer = document.createElement('div');
            activeTimer.className = 'active-timer';
            activeTimer.id = `${powerUp.id}-active-timer`;
            activeTimer.style.cssText = `
                position: absolute;
                top: -4px;
                right: -12px;
                background: ${powerUp.color};
                color: #000;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 8px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 5px ${powerUp.color};
                opacity: 0;
                transition: opacity 0.3s;
                z-index: 1001;
                white-space: nowrap;
            `;

            iconContainer.appendChild(icon);
            iconContainer.appendChild(cooldownTimer);
            iconContainer.appendChild(activeTimer);
            powerupsContainer.appendChild(iconContainer);

            this.cooldownTimers.set(powerUp.type, cooldownTimer);
            this.activePowerTimers.set(powerUp.type, activeTimer);

            // Call updatePowerUpIcon method
            this.updatePowerUpIcon(powerUp.type);
        });
    }

    startPowerUpSync() {
        this.stopPowerUpSync();

        const syncInterval = setInterval(() => {
            this.syncPowerUpStates();
        }, 100);

        this.updateIntervals.set('sync', syncInterval);
    }

    stopPowerUpSync() {
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals.clear();
    }

    syncPowerUpStates() {
        if (!this.game.powerups) return;

        // Get states from power-up state manager
        ['shield', 'ionPulse', 'radar', 'starPower', 'endlessMode'].forEach(type => {
            if (this.powerUpStateManager) {
                const state = this.powerUpStateManager.getState(type);
                if (state) {
                    this.updatePowerUpIcon(type);
                }
            }
        });

        // Sync star power with player state
        if (this.game.player) {
            const isActive = this.game.player.starPowerTime > 0;
            this.updateActiveTimer('starPower', isActive ? this.game.player.starPowerTime : 0);
        }
    }

    updateAllPowerUpIcons() {
        ['shield', 'ionPulse', 'radar', 'starPower', 'endlessMode'].forEach(type => {
            this.updatePowerUpIcon(type);
        });
    }

    updatePowerUpIcon(powerUpType) {
        if (!this.powerUpStateManager) return;

        const state = this.powerUpStateManager.getState(powerUpType);
        if (!state) {
            console.warn(`No state found for power-up: ${powerUpType}`);
            return;
        }

        const icon = document.getElementById(powerUpType);
        if (!icon) {
            console.warn(`Icon element not found: ${powerUpType}`);
            return;
        }

        if (state.unlocked) {
            icon.classList.add('unlocked');
        } else {
            icon.classList.remove('unlocked', 'active', 'cooldown', 'blink', 'ready-glow');
            icon.style.opacity = '0.3';
            icon.style.filter = 'none';
            return;
        }

        this.updateCooldownTimer(powerUpType, state.cooldown || 0);

        if (powerUpType === 'starPower') {
            this.updateActiveTimer('starPower', state.duration || 0);
        }

        icon.classList.remove('active', 'cooldown', 'blink', 'ready-glow');

        if (icon.classList.contains('blink')) {
            icon.style.opacity = '1';
            return;
        }

        if (state.cooldown > 0) {
            icon.classList.add('cooldown');
            icon.style.opacity = '0.3';
            icon.style.filter = 'none';
        } else if (state.active && state.duration > 0) {
            icon.classList.add('active');
            icon.style.opacity = '1';

            const glowColors = {
                'shield': '#00ff00',
                'ionPulse': '#00ffff',
                'radar': '#ffa500',
                'starPower': '#1e90ff',
                'endlessMode': '#ff4444'
            };
            icon.style.filter = `drop-shadow(0 0 8px ${glowColors[powerUpType] || '#00ff00'})`;
        } else {
            // Star power should be DIM (opacity 0.3) when not active
            if (powerUpType === 'starPower') {
                icon.style.opacity = '0.3'; // Changed from 1 to 0.3
                icon.style.filter = 'none';
                icon.classList.remove('ready-glow');
            } else {
                // Other power-ups get subtle glow when ready
                icon.classList.add('ready-glow');
                icon.style.opacity = '1';

                const readyGlowColors = {
                    'shield': 'var(--neon-cyan)',
                    'ionPulse': '#00ffff',
                    'radar': '#ffa500',
                    'starPower': '#1e90ff',
                    'endlessMode': '#ff4444'
                };
                icon.style.filter = `drop-shadow(0 0 3px ${readyGlowColors[powerUpType] || 'var(--neon-cyan)'})`;
            }
        }

        if (powerUpType === 'starPower' && state.active && state.duration > 0) {
            icon.classList.add('blue-star-active');
        } else {
            icon.classList.remove('blue-star-active');
        }
    }

    updateCooldownTimer(powerUpType, cooldown) {
        const timer = this.cooldownTimers.get(powerUpType);
        if (!timer) return;

        if (cooldown > 0) {
            timer.textContent = Math.ceil(cooldown).toString();
            timer.style.opacity = '1';

            if (cooldown < 3) {
                timer.style.animation = 'pulse 0.5s infinite';
            } else {
                timer.style.animation = 'none';
            }
        } else {
            timer.style.opacity = '0';
            timer.style.animation = 'none';
        }
    }

    updateActiveTimer(powerUpType, duration) {
        const timer = this.activePowerTimers.get(powerUpType);
        if (!timer) return;

        if (duration > 0) {
            timer.textContent = Math.ceil(duration).toString();
            timer.style.opacity = '1';

            if (duration < 3) {
                timer.style.animation = 'pulse 0.5s infinite';
            } else {
                timer.style.animation = 'none';
            }
        } else {
            timer.style.opacity = '0';
            timer.style.animation = 'none';
        }
    }

    updatePowerUpState(powerUpType, state) {
        // This method is now handled by the state manager subscription
        this.updatePowerUpIcon(powerUpType);
    }

    unlockPowerUp(powerUpType) {
        // This method is now handled by the state manager subscription
        this.updatePowerUpIcon(powerUpType);
    }

    startCooldown(powerUpType) {
        this.updatePowerUpIcon(powerUpType);
    }

    checkForCooldownFinish(powerUpType) {
        const checkInterval = setInterval(() => {
            if (!this.powerUpStateManager) {
                clearInterval(checkInterval);
                return;
            }

            const state = this.powerUpStateManager.getState(powerUpType);
            if (!state) {
                clearInterval(checkInterval);
                return;
            }

            if (state.cooldown <= 0) {
                clearInterval(checkInterval);
                this.startReadyBlink(powerUpType);
            }
        }, 100);
    }

    startReadyBlink(powerUpType) {
        const icon = document.getElementById(powerUpType);
        if (!icon) return;

        if (this.blinkTimers.has(powerUpType)) {
            clearTimeout(this.blinkTimers.get(powerUpType));
        }

        icon.classList.remove('active', 'cooldown', 'ready-glow');
        icon.classList.add('blink');
        icon.style.opacity = '1';

        const blinkTimer = setTimeout(() => {
            icon.classList.remove('blink');
            this.updatePowerUpIcon(powerUpType);
            this.blinkTimers.delete(powerUpType);
        }, 3000);

        this.blinkTimers.set(powerUpType, blinkTimer);
    }

    activatePowerUp(powerUpType, duration = 0) {
        if (duration > 0) {
            const icon = document.getElementById(powerUpType);
            if (icon) {
                icon.classList.add('active');
                this.updatePowerUpIcon(powerUpType);

                setTimeout(() => {
                    this.updatePowerUpIcon(powerUpType);
                }, duration * 1000);
            }
        }
    }

    activateStarPower(duration) {
        const icon = document.getElementById('starPower');
        if (icon) {
            icon.classList.add('active');
            this.updatePowerUpIcon('starPower');
        }
    }

    updateHUD() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.game.score.toString().padStart(5, '0');
        }

        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.game.level.toString().padStart(2, '0');
        }

        const livesElement = document.getElementById('lives');
        if (livesElement) {
            livesElement.textContent = this.game.lives.toString();
        }

        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            const topScore = this.game.getTopScore();
            if (topScore) {
                highScoreElement.textContent = `${topScore.score.toString().padStart(5, '0')} ${topScore.name}`;
            } else {
                highScoreElement.textContent = '00000';
            }
        }
    }

    update(deltaTime) {
        this.updateHUD();
        this.syncPowerUpStates();
    }

    destroy() {
        this.stopPowerUpSync();
        this.blinkTimers.forEach(timer => clearTimeout(timer));
        this.blinkTimers.clear();
    }
}