export class BossManager {
    constructor(game) {
        this.game = game;
        this.currentBoss = null;
        this.bossActive = false;
        this.bossSpawnTimer = 0;
        this.bossBombTimer = 0;
        this.bossWarningTimers = [];
        this.bossElement = null;
        this.bossSVGCache = new Map();
    }

    async initialize() {
        await this.preloadBossSVGs();
    }

    async preloadBossSVGs() {
        const bosses = [
            'meteor-commander', 'skull-reaper', 'the-machine', 'biohazard-titan', 'cosmic-horror'
        ];

        const loadPromises = bosses.map(async (bossName) => {
            const filename = `boss-${bossName}.svg`;

            try {
                const response = await fetch(`assets/graphics/${filename}`);
                if (response.ok) {
                    const svgText = await response.text();
                    this.bossSVGCache.set(bossName, svgText);
                    return true;
                }
            } catch (error) {
                console.warn(`Failed to load ${filename}:`, error);
            }
            return false;
        });

        await Promise.allSettled(loadPromises);
        console.log('Boss SVGs loaded:', this.bossSVGCache.size, '/', bosses.length);
    }

    update(deltaTime) {
        if (this.bossActive && this.currentBoss) {
            this.updateBoss(deltaTime);
            this.updateBossAttacks(deltaTime);
            this.updateBossBombs(deltaTime);
            this.updateBossPhases();
        }
    }

    spawnBoss(level) {
        const bossNumber = this.getBossNumber(level);
        if (!bossNumber) return;

        this.currentBoss = this.createBossTemplate(bossNumber);
        this.bossActive = true;
        this.bossBombTimer = 0;

        // Create boss DOM element
        this.createBossElement(this.currentBoss);

        // FIXED: Auto-activate radar if unlocked during boss fights (as specified in design)
        if (this.game.powerups && this.game.powerups.unlockedPowerUps.radar) {
            this.game.powerups.activateBossRadar();
        }

        console.log(`Spawning Boss ${bossNumber}: ${this.currentBoss.name}`);

        // Create boss spawn effect
        this.createBossSpawnEffect();
    }

    getBossNumber(level) {
        const bossLevels = { 15: 1, 30: 2, 45: 3, 60: 4, 75: 5 };
        return bossLevels[level];
    }

    createBossTemplate(bossNumber) {
        const bosses = {
            1: {
                name: "Meteor Commander",
                maxHealth: 20,
                health: 20,
                width: 80,
                height: 80,
                speed: 40,
                reward: "radar",
                attacks: ["meteorSpread"],
                attackCooldown: 2.0,
                attackTimer: 1.0,
                phase: 1,
                color: "#8b4513"
            },
            2: {
                name: "Skull Reaper",
                maxHealth: 50,
                health: 50,
                width: 100,
                height: 100,
                speed: 35,
                reward: "shield",
                attacks: ["bigMeteorSpread"],
                attackCooldown: 1.8,
                attackTimer: 0.9,
                phase: 1,
                color: "#ff4444"
            },
            3: {
                name: "The Machine",
                maxHealth: 100,
                health: 100,
                width: 120,
                height: 120,
                speed: 30,
                reward: "ionPulse",
                attacks: ["rotatingLasers"],
                attackCooldown: 1.5,
                attackTimer: 0.7,
                phase: 1,
                color: "#00ffff"
            },
            4: {
                name: "Biohazard Titan",
                maxHealth: 200,
                health: 200,
                width: 140,
                height: 140,
                speed: 25,
                reward: "extendedPower",
                attacks: ["enemySpawn", "toxicClouds"],
                attackCooldown: 1.2,
                attackTimer: 0.6,
                phase: 1,
                color: "#00ff00"
            },
            5: {
                name: "Cosmic Horror",
                maxHealth: 500,
                health: 500,
                width: 160,
                height: 160,
                speed: 20,
                reward: "endlessMode",
                attacks: ["meteorSpread", "bigMeteorSpread", "rotatingLasers", "enemySpawn", "toxicClouds"],
                attackCooldown: 0.8,
                attackTimer: 0.4,
                phase: 1,
                color: "#ff00ff"
            }
        };

        const boss = bosses[bossNumber];
        if (!boss) return null;

        // Position boss at top center of screen
        boss.x = (this.game.canvas.width - boss.width) / 2;
        boss.y = 50;
        boss.targetX = boss.x;
        boss.targetY = boss.y;

        return boss;
    }

    createBossElement(boss) {
        try {
            this.bossElement = document.createElement('div');
            const bossClass = `boss-entity boss-${boss.name.toLowerCase().replace(' ', '-')}`;
            this.bossElement.className = bossClass;

            this.bossElement.style.cssText = `
                position: absolute;
                width: ${boss.width}px;
                height: ${boss.height}px;
                left: ${boss.x}px;
                top: ${boss.y}px;
                z-index: 980;
                pointer-events: none;
                transform-origin: center center;
            `;

            // Use cached SVG or create fallback
            const bossKey = boss.name.toLowerCase().replace(' ', '-');
            const svgContent = this.bossSVGCache.get(bossKey) || this.createBossFallbackSVG(boss);
            this.bossElement.innerHTML = this.processBossSVGContent(svgContent, boss.width, boss.height);

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(this.bossElement);
            }
        } catch (error) {
            console.warn('Error creating boss element:', error);
        }
    }

    processBossSVGContent(svgContent, width, height) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = doc.querySelector('svg');

            if (svgElement) {
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

                // Ensure viewBox is set for proper scaling
                if (!svgElement.getAttribute('viewBox')) {
                    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
                }

                return svgElement.outerHTML;
            }
        } catch (error) {
            console.warn('Error processing boss SVG content:', error);
        }

        return svgContent;
    }

    createBossFallbackSVG(boss) {
        const symbols = {
            'Meteor Commander': '☄️',
            'Skull Reaper': '💀',
            'The Machine': '⚙️',
            'Biohazard Titan': '☣️',
            'Cosmic Horror': '👁️'
        };

        const symbol = symbols[boss.name] || '👑';

        return `
            <svg width="${boss.width}" height="${boss.height}" viewBox="0 0 ${boss.width} ${boss.height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${boss.width}" height="${boss.height}" fill="${boss.color}" opacity="0.8"/>
                <text x="${boss.width / 2}" y="${boss.height / 2}" text-anchor="middle" dy="0.3em" font-size="24" fill="white">${symbol}</text>
            </svg>
        `;
    }

    updateBoss(deltaTime) {
        if (!this.currentBoss) return;

        // Boss movement - slow patrol pattern
        this.currentBoss.targetX += Math.sin(Date.now() * 0.001) * 0.5;
        this.currentBoss.targetX = Math.max(100, Math.min(this.game.canvas.width - this.currentBoss.width - 100, this.currentBoss.targetX));

        this.currentBoss.x += (this.currentBoss.targetX - this.currentBoss.x) * 0.05;
        this.currentBoss.y += (this.currentBoss.targetY - this.currentBoss.y) * 0.05;

        // Update attack timers
        this.currentBoss.attackTimer -= deltaTime;
    }

    updateBossElement() {
        if (this.bossElement && this.currentBoss) {
            this.bossElement.style.left = `${this.currentBoss.x}px`;
            this.bossElement.style.top = `${this.currentBoss.y}px`;

            // Update damage state
            if (this.currentBoss.health < this.currentBoss.maxHealth * 0.33) {
                this.bossElement.classList.add('boss-phase-transition');
            } else {
                this.bossElement.classList.remove('boss-phase-transition');
            }
        }
    }

    updateBossAttacks(deltaTime) {
        if (this.currentBoss.attackTimer <= 0) {
            this.executeBossAttack(this.currentBoss);
            this.currentBoss.attackTimer = this.currentBoss.attackCooldown * (this.currentBoss.phase === 3 ? 0.5 : this.currentBoss.phase === 2 ? 0.75 : 1);
        }
    }

    executeBossAttack(boss) {
        if (!boss.attacks) return;

        boss.attacks.forEach(attackType => {
            switch (attackType) {
                case 'meteorSpread':
                    this.meteorSpreadAttack(boss);
                    break;
                case 'bigMeteorSpread':
                    this.bigMeteorSpreadAttack(boss);
                    break;
                case 'rotatingLasers':
                    this.rotatingLasersAttack(boss);
                    break;
                case 'enemySpawn':
                    this.enemySpawnAttack(boss);
                    break;
                case 'toxicClouds':
                    this.toxicCloudsAttack(boss);
                    break;
            }
        });
    }

    meteorSpreadAttack(boss) {
        const spreadCount = boss.phase === 1 ? 5 : boss.phase === 2 ? 8 : 12;
        for (let i = 0; i < spreadCount; i++) {
            const angle = (Math.PI * 2 * i / spreadCount) + (Math.random() * 0.5 - 0.25);
            setTimeout(() => {
                if (this.game.projectiles) {
                    this.game.projectiles.create({
                        x: boss.x + boss.width / 2,
                        y: boss.y + boss.height / 2,
                        vx: Math.cos(angle) * 150,
                        vy: Math.sin(angle) * 150,
                        type: 'meteor',
                        damage: 1
                    });
                }
            }, i * 100);
        }
    }

    bigMeteorSpreadAttack(boss) {
        const spreadCount = boss.phase === 1 ? 3 : boss.phase === 2 ? 5 : 7;
        for (let i = 0; i < spreadCount; i++) {
            const angle = (Math.PI * 2 * i / spreadCount) + (Math.random() * 0.3 - 0.15);
            setTimeout(() => {
                if (this.game.projectiles && this.game.player) {
                    // Target player position
                    const playerCenter = this.game.player.center;
                    const dx = playerCenter.x - (boss.x + boss.width / 2);
                    const dy = playerCenter.y - (boss.y + boss.height / 2);
                    const targetAngle = Math.atan2(dy, dx);

                    this.game.projectiles.create({
                        x: boss.x + boss.width / 2,
                        y: boss.y + boss.height / 2,
                        vx: Math.cos(targetAngle) * 120,
                        vy: Math.sin(targetAngle) * 120,
                        type: 'big-meteor',
                        damage: 2
                    });
                }
            }, i * 200);
        }
    }

    rotatingLasersAttack(boss) {
        const laserCount = boss.phase === 1 ? 3 : boss.phase === 2 ? 4 : 6;
        const startAngle = Date.now() * 0.001;

        for (let i = 0; i < laserCount; i++) {
            const angle = startAngle + (Math.PI * 2 * i / laserCount);
            if (this.game.projectiles) {
                this.game.projectiles.createLaser({
                    x: boss.x + boss.width / 2,
                    y: boss.y + boss.height / 2,
                    angle: angle,
                    length: 400,
                    damage: 1,
                    speed: 50, // Slow rotation
                    duration: 3.0 // Longer duration
                });
            }
        }
    }

    enemySpawnAttack(boss) {
        const spawnCount = boss.phase === 1 ? 2 : boss.phase === 2 ? 3 : 5;
        for (let i = 0; i < spawnCount; i++) {
            setTimeout(() => {
                if (this.game.enemies && this.game.enemies.getEnemies) {
                    const enemyType = ['teal', 'silver', 'blue', 'pink'][Math.floor(Math.random() * 4)];
                    const enemyCategory = ['rammer', 'shooter'][Math.floor(Math.random() * 2)];
                    const enemyKey = `${enemyCategory}-${enemyType}`;

                    const enemy = {
                        ...this.game.enemies.getEnemyTemplate(enemyKey),
                        x: boss.x + Math.random() * boss.width - 20,
                        y: boss.y + boss.height + 10,
                        category: enemyCategory,
                        type: enemyType
                    };

                    this.game.enemies.getEnemies().push(enemy);
                    this.game.enemies.createEnemyElement(enemy);
                }
            }, i * 500);
        }
    }

    toxicCloudsAttack(boss) {
        const cloudCount = boss.phase === 1 ? 2 : boss.phase === 2 ? 3 : 4;
        for (let i = 0; i < cloudCount; i++) {
            setTimeout(() => {
                const cloudX = Math.random() * this.game.canvas.width;
                const cloudY = Math.random() * this.game.canvas.height;

                this.createToxicCloud(cloudX, cloudY);
            }, i * 800);
        }
    }

    createToxicCloud(x, y) {
        // Create toxic cloud that damages player if they enter
        const cloud = {
            x: x - 40,
            y: y - 40,
            width: 80,
            height: 80,
            lifeTime: 5.0,
            damage: 0.5 // Damage per second
        };

        // Visual effect - FIXED: Use the correct method name
        if (this.game.particles) {
            this.game.particles.createToxicCloud(x, y);
        }

        // Store cloud for collision detection - use game's toxicClouds array
        if (this.game.toxicClouds) {
            this.game.toxicClouds.push(cloud);
        }

        // Auto-remove
        setTimeout(() => {
            if (this.game.toxicClouds) {
                const index = this.game.toxicClouds.indexOf(cloud);
                if (index > -1) this.game.toxicClouds.splice(index, 1);
            }
        }, cloud.lifeTime * 1000);
    }

    updateBossPhases() {
        if (!this.currentBoss) return;

        const healthPercent = this.currentBoss.health / this.currentBoss.maxHealth;
        let newPhase = 1;

        if (healthPercent <= 0.33) newPhase = 3;
        else if (healthPercent <= 0.66) newPhase = 2;

        if (newPhase !== this.currentBoss.phase) {
            this.currentBoss.phase = newPhase;
            console.log(`Boss ${this.currentBoss.name} entering Phase ${newPhase}!`);

            // Phase transition effect
            this.createPhaseTransitionEffect();
        }
    }

    updateBossBombs(deltaTime) {
        if (!this.bossActive) return;

        this.bossBombTimer += deltaTime;

        // Spawn bombs every 5 seconds
        if (this.bossBombTimer >= 5.0) {
            this.spawnBossBombs();
            this.bossBombTimer = 0;
        }
    }

    spawnBossBombs() {
        const bombCount = 3;
        const warningTime = this.game.powerups ? this.game.powerups.getBombSpawnWarningTime() : 3;

        for (let i = 0; i < bombCount; i++) {
            const bombX = 50 + Math.random() * (this.game.canvas.width - 100);
            const bombY = 100 + Math.random() * (this.game.canvas.height - 200);

            // Create warning effect first
            this.createBombWarning(bombX, bombY, warningTime);

            // Spawn bomb after warning
            setTimeout(() => {
                this.spawnSingleBomb(bombX, bombY);
            }, warningTime * 1000);
        }
    }

    createBombWarning(x, y, warningTime) {
        const warning = document.createElement('div');
        warning.className = 'bomb-warning';
        warning.style.cssText = `
            position: absolute;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border: 2px dashed #00ffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 930;
            animation: bombWarningPulse ${warningTime}s ease-out forwards;
        `;

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(warning);
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, warningTime * 1000);
        }
    }

    spawnSingleBomb(x, y) {
        if (!this.game.collectibles) return;

        const bomb = {
            type: 'azure-bomb',
            x: x - 10,
            y: y - 10,
            width: 20,
            height: 20,
            lifeTime: 3.0, // Bombs last 3 seconds
            svg: 'collectable-azure-bomb.svg'
        };

        // Use collectible system to create the bomb
        this.game.collectibles.collectibles.push(bomb);
        this.game.collectibles.createCollectibleElement(bomb);

        // Auto-remove if not collected
        setTimeout(() => {
            const index = this.game.collectibles.collectibles.indexOf(bomb);
            if (index > -1) {
                this.game.collectibles.removeCollectibleElement(bomb);
                this.game.collectibles.collectibles.splice(index, 1);
            }
        }, bomb.lifeTime * 1000);
    }

    createBossSpawnEffect() {
        if (!this.currentBoss || !this.game.particles) return;

        // FIXED: Use the correct method name
        this.game.particles.createBossSpawnEffect(
            this.currentBoss.x + this.currentBoss.width / 2,
            this.currentBoss.y + this.currentBoss.height / 2,
            this.currentBoss.color
        );
    }

    createPhaseTransitionEffect() {
        if (!this.currentBoss || !this.game.particles) return;

        this.game.particles.createTextEffect(
            this.game.canvas.width / 2,
            this.game.canvas.height / 2,
            `PHASE ${this.currentBoss.phase}!`,
            '#ff4444'
        );

        // Screen shake for phase transition
        if (this.game.screenShake) {
            this.game.screenShake(15);
        }
    }

    // NEW METHOD: Add this to fix the collectible damage issue
    takeDamage(damage) {
        this.damageBoss(damage);
    }

    damageBoss(damage) {
        if (!this.currentBoss || !this.bossActive) return;

        this.currentBoss.health -= damage;

        // Visual feedback
        this.createBossDamageEffect();

        // Check for boss defeat
        if (this.currentBoss.health <= 0) {
            this.defeatBoss();
        }
    }

    createBossDamageEffect() {
        if (!this.currentBoss) return;

        // Flash effect
        if (this.bossElement) {
            this.bossElement.classList.add('boss-damage');
            setTimeout(() => {
                if (this.bossElement) {
                    this.bossElement.classList.remove('boss-damage');
                }
            }, 200);
        }

        // Damage numbers
        if (this.game.particles) {
            this.game.particles.createTextEffect(
                this.currentBoss.x + this.currentBoss.width / 2,
                this.currentBoss.y - 30,
                '-1',
                '#ff4444'
            );
        }
    }

    defeatBoss() {
        console.log(`Boss ${this.currentBoss.name} defeated!`);

        // Reward player
        this.giveBossReward();

        // Victory effects
        this.createBossDefeatEffect();

        // Clear boss state
        this.bossActive = false;
        this.removeBossElement();
        this.currentBoss = null;

        // Advance level after short delay
        setTimeout(() => {
            if (this.game.levelComplete) {
                this.game.levelComplete();
            }
        }, 3000);
    }

    giveBossReward() {
        if (!this.currentBoss || !this.game.powerups) return;

        switch (this.currentBoss.reward) {
            case 'radar':
                this.game.powerups.unlockPowerUp('radar');
                // Auto-activate radar for future boss fights
                this.game.powerups.activateBossRadar();
                break;
            case 'shield':
                this.game.powerups.unlockPowerUp('shield');  // Now properly unlocks
                break;
            case 'ionPulse':
                this.game.powerups.unlockPowerUp('ionPulse'); // Now properly unlocks
                break;
            case 'extendedPower':
                this.game.powerups.unlockExtendedPower();
                break;
            case 'endlessMode':
                // Endless mode activation
                break;
        }

        // Score reward
        if (this.game.addScore) {
            this.game.addScore(this.currentBoss.maxHealth * 10);
        }
    }

    createBossDefeatEffect() {
        if (!this.currentBoss || !this.game.particles) return;

        // Big explosion - FIXED: Use createExplosion for now, or implement createBossDefeatEffect
        this.game.particles.createExplosion(
            this.currentBoss.x + this.currentBoss.width / 2,
            this.currentBoss.y + this.currentBoss.height / 2,
            this.currentBoss.color,
            20 // More particles for boss defeat
        );

        // Victory text
        this.game.particles.createTextEffect(
            this.game.canvas.width / 2,
            this.game.canvas.height / 2,
            'BOSS DEFEATED!',
            '#ffd700'
        );
    }

    removeBossElement() {
        if (this.bossElement && this.bossElement.parentNode) {
            this.bossElement.parentNode.removeChild(this.bossElement);
        }
        this.bossElement = null;
    }

    render(ctx) {
        if (!this.bossActive || !this.currentBoss) return;

        this.updateBossElement();
        this.drawBossHealthBar(ctx);

        // Fallback rendering if DOM element fails
        if (!this.bossElement) {
            this.drawBossFallback(ctx);
        }
    }

    drawBossFallback(ctx) {
        if (!this.currentBoss) return;

        ctx.save();
        ctx.translate(this.currentBoss.x + this.currentBoss.width / 2, this.currentBoss.y + this.currentBoss.height / 2);

        // Boss color
        ctx.fillStyle = this.currentBoss.color;

        // Draw boss as colored rectangle (fallback if SVG not loaded)
        ctx.fillRect(-this.currentBoss.width / 2, -this.currentBoss.height / 2, this.currentBoss.width, this.currentBoss.height);

        // Boss glow effect
        ctx.shadowColor = this.currentBoss.color;
        ctx.shadowBlur = 20;
        ctx.fillRect(-this.currentBoss.width / 2, -this.currentBoss.height / 2, this.currentBoss.width, this.currentBoss.height);
        ctx.shadowBlur = 0;

        // Boss name
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentBoss.name, 0, -this.currentBoss.height / 2 - 15);

        ctx.restore();
    }

    drawBossHealthBar(ctx) {
        if (!this.currentBoss || !this.game.canvas) return;

        const barWidth = 200;
        const barHeight = 20;
        const x = (this.game.canvas.width - barWidth) / 2;
        const y = 20;

        const healthPercent = this.currentBoss.health / this.currentBoss.maxHealth;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Health
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff4444';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Phase indicators
        const phaseWidth = barWidth / 3;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + phaseWidth, y, 1, barHeight);
        ctx.strokeRect(x + phaseWidth * 2, y, 1, barHeight);
    }

    clear() {
        this.removeBossElement();
        this.currentBoss = null;
        this.bossActive = false;
        this.bossSpawnTimer = 0;
        this.bossBombTimer = 0;
        this.bossWarningTimers = [];
    }
}