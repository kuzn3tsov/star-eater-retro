import { CollisionManager } from './physics/collision-manager.js';
import { SVGUtils } from './utils/svg-utils.js';

export class EnemyManager {
    constructor(game, config) {
        this.game = game;
        this.config = config;
        this.enemies = [];
        this.spawnTimer = 0;
        this.enemyElements = new Map();
        this.svgCache = new Map();
        this.targetEnemyCount = 0;
        this.lastRespawnTime = 0;
        this.respawnCooldown = config.enemies.respawnCooldown;
    }

    async initialize() {
        await this.preloadEnemySVGs();
    }

    async preloadEnemySVGs() {
        const enemyTypes = [
            'rammer-teal', 'rammer-silver', 'rammer-blue', 'rammer-pink',
            'shooter-teal', 'shooter-silver', 'shooter-blue', 'shooter-pink'
        ];

        const loadPromises = enemyTypes.map(async (enemyType) => {
            const [category, color] = enemyType.split('-');
            const filename = `enemy-${category}-${color}.svg`;

            try {
                const response = await fetch(`assets/graphics/${filename}`);
                if (response.ok) {
                    const svgText = await response.text();
                    this.svgCache.set(enemyType, svgText);
                    return true;
                } else {
                    console.warn(`Failed to load ${filename}: ${response.status}`);
                    return false;
                }
            } catch (error) {
                console.warn(`Error loading ${filename}:`, error);
                return false;
            }
        });

        const results = await Promise.allSettled(loadPromises);
        const successfulLoads = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log('Enemy SVGs loaded:', successfulLoads, '/', enemyTypes.length);
    }

    update(deltaTime) {
        this.updateEnemies(deltaTime);
        this.handleRespawn(deltaTime);
    }

    updateEnemies(deltaTime) {
        this.enemies.forEach((enemy, index) => {
            const prevX = enemy.x;
            const prevY = enemy.y;

            if (!enemy.freezeTime || enemy.freezeTime <= 0) {
                if (this.game.player.freezeTime <= 0) {
                    this.updateEnemyMovement(enemy, deltaTime);
                }
            }

            if (enemy.x !== prevX || enemy.y !== prevY) {
                const dx = enemy.x - prevX;
                const dy = enemy.y - prevY;
                if (dx !== 0 || dy !== 0) {
                    enemy.angle = Math.atan2(dy, dx);
                }
            }

            this.updateEnemyAttacks(enemy, deltaTime);
            this.updateEnemyElement(enemy);

            if (enemy.health <= 0) {
                this.removeEnemyElement(enemy);
                this.createExplosion(enemy);
                this.enemies.splice(index, 1);

                if (this.game.player && this.game.player.starPowerTime > 0) {
                    this.game.addScore(5);
                } else {
                    this.game.addScore(enemy.points);
                }
            }
        });
    }

    handleRespawn(deltaTime) {
        if (this.enemies.length < this.targetEnemyCount) {
            this.lastRespawnTime += deltaTime;

            if (this.lastRespawnTime >= this.respawnCooldown) {
                this.spawnEnemy();
                this.lastRespawnTime = 0;
                console.log(`Respawning enemy. Current: ${this.enemies.length}, Target: ${this.targetEnemyCount}`);
            }
        }
    }

    updateEnemyMovement(enemy, deltaTime) {
        if (enemy.freezeTime && enemy.freezeTime > 0) {
            return;
        }

        const dx = this.game.player.center.x - enemy.x;
        const dy = this.game.player.center.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const speed = enemy.speed * deltaTime;

            switch (enemy.type) {
                case 'teal':
                    if (Math.random() < 0.02) {
                        enemy.targetX = Math.random() * this.game.canvas.width;
                        enemy.targetY = Math.random() * this.game.canvas.height;
                    }

                    const tdx = enemy.targetX - enemy.x;
                    const tdy = enemy.targetY - enemy.y;
                    const tdist = Math.sqrt(tdx * tdx + tdy * tdy);

                    if (tdist > 0) {
                        enemy.x += (tdx / tdist) * speed * 0.5;
                        enemy.y += (tdy / tdist) * speed * 0.5;
                    }
                    break;

                case 'silver':
                    if (Math.random() < 0.01) {
                        enemy.speedState = !enemy.speedState;
                    }
                    const currentSpeed = enemy.speedState ? speed * 1.5 : speed * 0.7;

                    enemy.x += (dx / distance) * currentSpeed;
                    enemy.y += (dy / distance) * currentSpeed;
                    break;

                case 'blue':
                    enemy.x += (dx / distance) * speed * 1.2;
                    enemy.y += (dy / distance) * speed * 1.2;
                    break;

                case 'pink':
                    const playerVelX = this.game.player.velocityX * this.game.player.speed;
                    const playerVelY = this.game.player.velocityY * this.game.player.speed;
                    const predictiveX = this.game.player.center.x + playerVelX * 0.5;
                    const predictiveY = this.game.player.center.y + playerVelY * 0.5;

                    const pdx = predictiveX - (enemy.x + enemy.width / 2);
                    const pdy = predictiveY - (enemy.y + enemy.height / 2);
                    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

                    if (pdist > 0) {
                        enemy.x += (pdx / pdist) * speed;
                        enemy.y += (pdy / pdist) * speed;
                    }
                    break;
            }

            switch (enemy.category) {
                case 'shooter':
                    const idealDistance = 200;
                    if (distance < idealDistance) {
                        enemy.x -= (dx / distance) * speed * 0.5;
                        enemy.y -= (dy / distance) * speed * 0.5;
                    }
                    break;

                case 'beam-shooter':
                    const beamDistance = 150;
                    if (distance < beamDistance) {
                        enemy.x -= (dx / distance) * speed * 0.7;
                        enemy.y -= (dy / distance) * speed * 0.7;
                    } else {
                        const strafeAngle = Math.atan2(dy, dx) + Math.PI / 2;
                        enemy.x += Math.cos(strafeAngle) * speed * 0.3;
                        enemy.y += Math.sin(strafeAngle) * speed * 0.3;
                    }
                    break;

                case 'destroyer':
                    if (Math.random() < 0.005) {
                        enemy.chargeTimer = 1.0;
                    }

                    if (enemy.chargeTimer > 0) {
                        enemy.x += (dx / distance) * speed * 2.0;
                        enemy.y += (dy / distance) * speed * 2.0;
                        enemy.chargeTimer -= deltaTime;
                    } else {
                        enemy.x += (dx / distance) * speed * 0.8;
                        enemy.y += (dy / distance) * speed * 0.8;
                    }
                    break;
            }
        }

        enemy.x = Math.max(0, Math.min(this.game.canvas.width - enemy.width, enemy.x));
        enemy.y = Math.max(0, Math.min(this.game.canvas.height - enemy.height, enemy.y));
    }

    updateEnemyAttacks(enemy, deltaTime) {
        enemy.attackTimer -= deltaTime;

        if (enemy.attackTimer <= 0) {
            this.executeEnemyAttack(enemy);
            enemy.attackTimer = enemy.attackCooldown;
        }
    }

    executeEnemyAttack(enemy) {
        switch (enemy.category) {
            case 'shooter':
                this.createProjectile(enemy, 'burst');
                break;
            case 'beam-shooter':
                this.createLaserBeam(enemy);
                break;
            case 'destroyer':
                if (Math.random() < 0.3) {
                    this.createProjectile(enemy, 'big-meteor');
                } else {
                    this.createProjectile(enemy, 'burst');
                }
                if (Math.random() < 0.2) {
                    setTimeout(() => this.createProjectile(enemy, 'burst'), 300);
                    setTimeout(() => this.createProjectile(enemy, 'burst'), 600);
                }
                break;
        }
    }

    createProjectile(enemy, projectileType) {
        const dx = this.game.player.center.x - enemy.x;
        const dy = this.game.player.center.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.game.projectiles.create({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: (dx / distance) * 200,
                vy: (dy / distance) * 200,
                type: projectileType,
                damage: enemy.damage,
                source: 'enemy' // Specify this is an enemy projectile
            });
        }
    }

    createLaserBeam(enemy) {
        const angle = Math.atan2(
            this.game.player.center.y - enemy.y,
            this.game.player.center.x - enemy.x
        );

        this.game.projectiles.createLaser({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            angle: angle,
            length: 300,
            damage: enemy.damage * 1.5,
            speed: 400,
            source: 'enemy'
        });
    }

    spawnEnemies() {
        this.enemies = [];
        this.clearEnemyElements();

        this.targetEnemyCount = this.getMaxEnemies();
        console.log(`Spawning ${this.targetEnemyCount} enemies for level ${this.game.level}`);

        for (let i = 0; i < this.targetEnemyCount; i++) {
            this.spawnEnemy();
        }

        this.lastRespawnTime = 0;
    }

    spawnEnemy() {
        const level = this.game.level;
        const enemyCategory = this.getEnemyCategoryForLevel(level);
        const enemyType = this.getEnemyTypeForCategory(enemyCategory, level);

        const enemyKey = `${enemyCategory}-${enemyType}`;
        const enemy = {
            ...this.getEnemyTemplate(enemyKey),
            x: Math.random() * (this.game.canvas.width - 40),
            y: Math.random() * (this.game.canvas.height - 40),
            category: enemyCategory,
            type: enemyType,
            angle: 0
        };

        if (enemyType === 'silver') {
            enemy.speedState = Math.random() > 0.5;
        }

        this.enemies.push(enemy);
        this.createEnemyElement(enemy);
    }

    getEnemyTypeForCategory(category, level) {
        // For levels 1-14: Rammer progression
        if (level <= 14 && category === 'rammer') {
            if (level <= 3) return 'teal';
            if (level <= 6) return 'silver';
            if (level <= 10) return 'blue';
            return 'pink';
        }

        // For levels 16-29: Shooter progression (skip level 15 - boss)
        if (level >= 16 && level <= 29 && category === 'shooter') {
            const shooterLevel = level - 15;
            if (shooterLevel <= 3) return 'teal';
            if (shooterLevel <= 6) return 'silver';
            if (shooterLevel <= 10) return 'blue';
            return 'pink';
        }

        // For levels 31-44: Beam-shooter progression (skip level 30 - boss)
        if (level >= 31 && level <= 44 && category === 'beam-shooter') {
            const beamLevel = level - 30;
            if (beamLevel <= 3) return 'teal';
            if (beamLevel <= 6) return 'silver';
            if (beamLevel <= 10) return 'blue';
            return 'pink';
        }

        // For levels 46-59: Destroyer progression (skip level 45 - boss)
        if (level >= 46 && level <= 59 && category === 'destroyer') {
            const destroyerLevel = level - 45;
            if (destroyerLevel <= 3) return 'teal';
            if (destroyerLevel <= 6) return 'silver';
            if (destroyerLevel <= 10) return 'blue';
            return 'pink';
        }

        // For mixed levels (61-74) and endless mode: random types with weights
        const types = ['teal', 'silver', 'blue', 'pink'];
        const weights = {
            'rammer': [35, 25, 20, 20],
            'shooter': [20, 25, 30, 25],
            'beam-shooter': [15, 25, 25, 35],
            'destroyer': [20, 20, 30, 30]
        };

        const weightArray = weights[category] || [25, 25, 25, 25];
        const random = Math.random() * 100;
        let cumulative = 0;

        for (let i = 0; i < types.length; i++) {
            cumulative += weightArray[i];
            if (random <= cumulative) {
                return types[i];
            }
        }

        return types[0];
    }

    createEnemyElement(enemy) {
        try {
            const element = document.createElement('div');
            const enemyClass = `enemy enemy-${enemy.category} enemy-${enemy.type}`;
            element.className = enemyClass;

            element.style.cssText = `
                position: absolute;
                width: ${enemy.width}px;
                height: ${enemy.height}px;
                left: ${enemy.x}px;
                top: ${enemy.y}px;
                z-index: 920;
                pointer-events: none;
                transform-origin: center center;
            `;

            const svgContent = this.svgCache.get(`${enemy.category}-${enemy.type}`) ||
                SVGUtils.createFallbackSVG('enemy', enemy.width, enemy.height, enemy.type, enemy.category);
            element.innerHTML = SVGUtils.processSVGContent(svgContent, enemy.width, enemy.height);

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(element);
                this.enemyElements.set(enemy, element);
                this.updateEnemyElementRotation(enemy);
            }
        } catch (error) {
            console.warn('Error creating enemy element:', error);
        }
    }

    updateEnemyElement(enemy) {
        const element = this.enemyElements.get(enemy);
        if (element) {
            element.style.left = `${enemy.x}px`;
            element.style.top = `${enemy.y}px`;
            this.updateEnemyElementRotation(enemy);

            if (enemy.freezeTime > 0) {
                element.classList.add('enemy-frozen');
            } else {
                element.classList.remove('enemy-frozen');
            }
        }
    }

    updateEnemyElementRotation(enemy) {
        const element = this.enemyElements.get(enemy);
        if (element) {
            const degrees = enemy.angle * (180 / Math.PI);
            element.style.transform = `rotate(${degrees}deg)`;
        }
    }

    removeEnemyElement(enemy) {
        const element = this.enemyElements.get(enemy);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.enemyElements.delete(enemy);
    }

    clearEnemyElements() {
        this.enemyElements.forEach((element, enemy) => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        this.enemyElements.clear();
    }

    getEnemyCategoryForLevel(level) {
        // Levels 1-14: Rammer only
        if (level <= 14) return 'rammer';
        // Levels 15-29: Shooter only
        if (level <= 29) return 'shooter';
        // Levels 30-44: Beam-shooter only
        if (level <= 44) return 'beam-shooter';
        // Levels 45-59: Destroyer only
        if (level <= 59) return 'destroyer';
        // Levels 61-74: Mixed types
        if (level <= 74) {
            const mixedTypes = ['rammer', 'shooter', 'beam-shooter', 'destroyer'];
            return mixedTypes[Math.floor(Math.random() * mixedTypes.length)];
        }
        // Endless mode: All types
        const allTypes = ['rammer', 'shooter', 'beam-shooter', 'destroyer'];
        return allTypes[Math.floor(Math.random() * allTypes.length)];
    }

    getMaxEnemies() {
        const level = this.game.level;

        // Use level pattern from config
        const pattern = this.config.enemies.levelPattern;
        const baseCount = pattern[(level - 1) % pattern.length];

        // Boss levels have 0 regular enemies
        if (this.config.enemies.bossLevels.includes(level)) {
            return 0;
        }

        return baseCount;
    }

    getEnemyTemplate(enemyKey) {
        const templates = {
            'rammer-teal': {
                width: 32, height: 32, health: 1, maxHealth: 1, damage: 1, points: 10,
                speed: 70, attackCooldown: 999, attackTimer: 1,
                color: '#20b2aa', freezeTime: 0
            },
            'rammer-silver': {
                width: 30, height: 30, health: 1, maxHealth: 1, damage: 1, points: 12,
                speed: 80, attackCooldown: 999, attackTimer: 1,
                color: '#c0c0c0', freezeTime: 0
            },
            'rammer-blue': {
                width: 34, height: 34, health: 1, maxHealth: 1, damage: 1, points: 15,
                speed: 90, attackCooldown: 999, attackTimer: 1,
                color: '#1e90ff', freezeTime: 0
            },
            'rammer-pink': {
                width: 32, height: 32, health: 1, maxHealth: 1, damage: 1, points: 18,
                speed: 85, attackCooldown: 999, attackTimer: 1,
                color: '#ff69b4', freezeTime: 0
            },
            'shooter-teal': {
                width: 34, height: 34, health: 1, maxHealth: 1, damage: 1, points: 25,
                speed: 50, attackCooldown: 2.0, attackTimer: 1,
                color: '#20b2aa', freezeTime: 0
            },
            'shooter-silver': {
                width: 32, height: 32, health: 1, maxHealth: 1, damage: 1, points: 28,
                speed: 55, attackCooldown: 1.8, attackTimer: 0.9,
                color: '#c0c0c0', freezeTime: 0
            },
            'shooter-blue': {
                width: 36, height: 36, health: 1, maxHealth: 1, damage: 1, points: 32,
                speed: 60, attackCooldown: 1.6, attackTimer: 0.8,
                color: '#1e90ff', freezeTime: 0
            },
            'shooter-pink': {
                width: 34, height: 34, health: 1, maxHealth: 1, damage: 1, points: 35,
                speed: 58, attackCooldown: 1.5, attackTimer: 0.7,
                color: '#ff69b4', freezeTime: 0
            },
            'beam-shooter-teal': {
                width: 36, height: 36, health: 2, maxHealth: 2, damage: 2, points: 45,
                speed: 45, attackCooldown: 3.0, attackTimer: 1.5,
                color: '#20b2aa', freezeTime: 0
            },
            'beam-shooter-silver': {
                width: 34, height: 34, health: 2, maxHealth: 2, damage: 2, points: 48,
                speed: 50, attackCooldown: 2.8, attackTimer: 1.4,
                color: '#c0c0c0', freezeTime: 0
            },
            'beam-shooter-blue': {
                width: 38, height: 38, health: 2, maxHealth: 2, damage: 2, points: 52,
                speed: 52, attackCooldown: 2.6, attackTimer: 1.3,
                color: '#1e90ff', freezeTime: 0
            },
            'beam-shooter-pink': {
                width: 36, height: 36, health: 2, maxHealth: 2, damage: 2, points: 55,
                speed: 48, attackCooldown: 2.4, attackTimer: 1.2,
                color: '#ff69b4', freezeTime: 0
            },
            'destroyer-teal': {
                width: 42, height: 42, health: 3, maxHealth: 3, damage: 2, points: 70,
                speed: 40, attackCooldown: 2.0, attackTimer: 1.0,
                color: '#20b2aa', freezeTime: 0, chargeTimer: 0
            },
            'destroyer-silver': {
                width: 40, height: 40, health: 3, maxHealth: 3, damage: 2, points: 75,
                speed: 42, attackCooldown: 1.8, attackTimer: 0.9,
                color: '#c0c0c0', freezeTime: 0, chargeTimer: 0
            },
            'destroyer-blue': {
                width: 44, height: 44, health: 4, maxHealth: 4, damage: 3, points: 80,
                speed: 44, attackCooldown: 1.6, attackTimer: 0.8,
                color: '#1e90ff', freezeTime: 0, chargeTimer: 0
            },
            'destroyer-pink': {
                width: 42, height: 42, health: 4, maxHealth: 4, damage: 3, points: 85,
                speed: 46, attackCooldown: 1.5, attackTimer: 0.7,
                color: '#ff69b4', freezeTime: 0, chargeTimer: 0
            }
        };

        return templates[enemyKey] || templates['rammer-teal'];
    }

    createExplosion(enemy) {
        this.game.particles.createExplosion(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            enemy.color
        );
    }

    render(ctx) {
        this.enemies.forEach(enemy => {
            if (!this.enemyElements.get(enemy)) {
                this.drawEnemyFallback(ctx, enemy);
            }
        });
    }

    drawEnemyFallback(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.rotate(enemy.angle);

        const isFrozen = enemy.freezeTime && enemy.freezeTime > 0;
        if (isFrozen) {
            ctx.fillStyle = '#00ffff';
        } else {
            ctx.fillStyle = enemy.color;
        }

        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);

        if (isFrozen) {
            ctx.shadowColor = '#00ffff';
        } else {
            ctx.shadowColor = enemy.color;
        }
        ctx.shadowBlur = 10;
        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        ctx.shadowBlur = 0;

        if (enemy.health > 1) {
            const barWidth = enemy.width;
            const barHeight = 4;
            const healthPercent = enemy.health / enemy.maxHealth;

            ctx.fillStyle = '#ff4444';
            ctx.fillRect(-barWidth / 2, -enemy.height / 2 - 8, barWidth, barHeight);

            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-barWidth / 2, -enemy.height / 2 - 8, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
    }

    getEnemies() {
        return this.enemies;
    }

    clear() {
        this.enemies.forEach(enemy => {
            this.removeEnemyElement(enemy);
        });
        this.enemies = [];
        this.targetEnemyCount = 0;
        this.lastRespawnTime = 0;
    }
}