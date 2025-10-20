import { CollisionManager } from './physics/collision-manager.js';
import { SVGUtils } from './utils/svg-utils.js';

export class CollectibleManager {
    constructor(game, config) {
        this.game = game;
        this.config = config;
        this.collectibles = [];
        this.spawnTimer = 0;
        this.starCombo = 0;
        this.lastStarTime = 0;
        this.collectibleElements = new Map();
        this.svgCache = new Map();
        this.assetsLoaded = false;

        this.consecutiveStars = 0;
        this.lastStarCollectTime = 0;

        // Consistent type mapping
        this.typeConfigMap = {
            'gold-star': 'goldStar',
            'green-star': 'greenStar',
            'blue-star': 'blueStar',
            'purple-star': 'purpleStar',
            'red-rocket': 'redRocket',
            'azure-bomb': 'azureBomb'
        };
    }

    async initialize() {
        try {
            await this.preloadSVGAssets();
            this.assetsLoaded = true;
        } catch (error) {
            console.warn('SVG preloading failed, using fallback graphics:', error);
            this.assetsLoaded = false;
        }
    }

    async preloadSVGAssets() {
        const svgFiles = [
            'collectable-gold-star.svg',
            'collectable-green-star.svg',
            'collectable-blue-star.svg',
            'collectable-purple-star.svg',
            'collectable-red-rocket.svg',
            'collectable-azure-bomb.svg'
        ];

        const loadPromises = svgFiles.map(async (filename) => {
            try {
                const response = await fetch(`assets/graphics/${filename}`);
                if (response.ok) {
                    const svgText = await response.text();
                    this.svgCache.set(filename, svgText);
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
        console.log('SVG assets loaded:', results.filter(r => r.status === 'fulfilled' && r.value).length, '/', svgFiles.length);
    }

    update(deltaTime) {
        this.updateCollectibles(deltaTime);
        this.handleSpawning(deltaTime);
        this.updateCombos(deltaTime);
    }

    updateCollectibles(deltaTime) {
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            collectible.lifeTime -= deltaTime;

            if (collectible.lifeTime <= 0) {
                this.removeCollectibleElement(collectible);
                this.collectibles.splice(i, 1);
                continue;
            }

            if (this.checkPlayerCollision(collectible)) {
                this.collect(collectible, i);
                // Don't continue processing this collectible as it's been removed
                continue;
            }

            this.updateCollectibleElement(collectible);
        }
    }

    checkPlayerCollision(collectible) {
        const player = this.game.player;
        if (!player) return false;

        return CollisionManager.checkRectCollision(collectible, player.bounds);
    }

    collect(collectible, index) {
        this.applyCollectibleEffect(collectible);
        this.createCollectionEffect(collectible);
        this.removeCollectibleElement(collectible);
        this.collectibles.splice(index, 1);

        if (collectible.type.includes('star')) {
            const now = Date.now();

            if (now - this.lastStarCollectTime > 3000) {
                this.consecutiveStars = 0;
            }

            this.consecutiveStars++;
            this.lastStarCollectTime = now;

            this.updateStarCombo();
        } else {
            this.consecutiveStars = 0;
        }
    }

    applyCollectibleEffect(collectible) {
        if (!this.game.player) return;

        const configKey = this.typeConfigMap[collectible.type];
        if (!configKey) {
            console.warn(`Unknown collectible type: ${collectible.type}`);
            return;
        }

        const typeConfig = this.config.collectables[configKey];
        if (!typeConfig) {
            console.warn(`No config found for collectible type: ${collectible.type}`);
            return;
        }

        switch (collectible.type) {
            case 'gold-star':
                this.game.addScore(2);
                this.game.addStar();
                break;
            case 'green-star':
                this.game.addScore(1);
                this.freezeAllEnemies(typeConfig.freezeDuration);
                break;
            case 'blue-star':
                this.game.addScore(2);
                // Activate star power on player
                this.game.player.starPowerTime = typeConfig.starPowerDuration;

                // Update state manager
                if (this.game.powerUpStateManager) {
                    this.game.powerUpStateManager.activatePowerUp('starPower', typeConfig.starPowerDuration);
                }
                break;
            case 'purple-star':
                const enemyCount = this.game.enemies ? this.game.enemies.getEnemies().length : 0;
                this.game.addScore(enemyCount);
                if (this.game.enemies) {
                    this.game.enemies.clear();
                }
                this.consecutiveStars = 0;
                break;
            case 'red-rocket':
                this.game.addLife(1);
                break;
            case 'azure-bomb':
                if (this.game.boss) {
                    this.game.boss.takeDamage(1);
                }
                break;
        }
    }

    freezeAllEnemies(duration) {
        if (this.game.enemies && this.game.powerups) {
            const enemies = this.game.enemies.getEnemies();
            enemies.forEach(enemy => {
                this.game.powerups.freezeEnemy(enemy, duration);
            });

            if (this.game.particles) {
                this.game.particles.createTextEffect(
                    this.game.player.center.x,
                    this.game.player.center.y - 50,
                    'FREEZE!',
                    '#00ffff'
                );
            }
        }
    }

    createCollectionEffect(collectible) {
        if (!this.game.particles) return;

        const effects = {
            'gold-star': 'collect-effect-gold',
            'green-star': 'collect-effect-green',
            'blue-star': 'collect-effect-blue',
            'purple-star': 'collect-effect-purple',
            'red-rocket': 'collect-effect-gold',
            'azure-bomb': 'collect-effect-blue'
        };

        this.game.particles.createCollectionEffect(
            collectible.x + collectible.width / 2,
            collectible.y + collectible.height / 2,
            effects[collectible.type] || 'collect-effect-gold'
        );
    }

    updateStarCombo() {
        const now = Date.now();
        if (now - this.lastStarTime < 2000) {
            this.starCombo++;
        } else {
            this.starCombo = 1;
        }
        this.lastStarTime = now;

        if (this.starCombo >= 5) {
            this.game.addScore(this.starCombo * 2);
            this.createComboEffect();
        }
    }

    createComboEffect() {
        if (!this.game.particles || !this.game.player) return;

        this.game.particles.createTextEffect(
            this.game.player.center.x,
            this.game.player.center.y - 50,
            `COMBO x${this.starCombo}!`,
            '#ffd700'
        );
    }

    updateCombos(deltaTime) {
        if (Date.now() - this.lastStarTime > 2000 && this.starCombo > 0) {
            this.starCombo = 0;
        }

        if (Date.now() - this.lastStarCollectTime > 3000 && this.consecutiveStars > 0) {
            this.consecutiveStars = 0;
        }
    }

    handleSpawning(deltaTime) {
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
            this.spawnCollectible();
            this.spawnTimer = this.getSpawnCooldown();
        }
    }

    spawnCollectible() {
        const config = this.config.collectables;
        const maxCollectibles = Math.max(
            config.goldStar.maxSpawned,
            config.greenStar.maxSpawned,
            config.blueStar.maxSpawned,
            config.purpleStar.maxSpawned,
            config.redRocket.maxSpawned,
            config.azureBomb.maxSpawned
        );

        if (this.collectibles.length >= maxCollectibles) return;

        const type = this.getRandomCollectibleType();
        const collectible = {
            ...this.getCollectibleTemplate(type),
            x: Math.random() * (this.game.canvas.width - 30),
            y: Math.random() * (this.game.canvas.height - 30),
        };

        this.collectibles.push(collectible);
        this.createCollectibleElement(collectible);
    }

    getRandomCollectibleType() {
        const level = this.game.level || 1;
        const isBossLevel = this.config.enemies.bossLevels.includes(level);
        const config = this.config.collectables;

        // Base weights for normal levels
        const baseWeights = {
            'gold-star': 40,
            'green-star': 0,
            'blue-star': 0,
            'purple-star': 0,
            'red-rocket': 0,
            'azure-bomb': 0
        };

        // Apply level-based availability
        if (level >= config.greenStar.spawnStartLevel) {
            baseWeights['green-star'] = 25;
        }

        if (level >= config.blueStar.spawnStartLevel &&
            (level - config.blueStar.spawnStartLevel) % config.blueStar.spawnFrequency === 0) {
            baseWeights['blue-star'] = 15;
        }

        if (level >= config.purpleStar.spawnStartLevel && this.consecutiveStars >= config.purpleStar.comboRequirement) {
            baseWeights['purple-star'] = 20;
        }

        if (level >= config.redRocket.spawnStartLevel &&
            (level - config.redRocket.spawnStartLevel) % config.redRocket.spawnFrequency === 0) {
            baseWeights['red-rocket'] = 15;
        }

        // Boss level adjustments
        if (isBossLevel) {
            baseWeights['azure-bomb'] = 40;
            baseWeights['gold-star'] = 30;
            // Reduce or remove other stars on boss levels
            baseWeights['green-star'] = Math.max(0, baseWeights['green-star'] - 10);
            baseWeights['blue-star'] = Math.max(0, baseWeights['blue-star'] - 5);
            baseWeights['purple-star'] = Math.max(0, baseWeights['purple-star'] - 5);
            baseWeights['red-rocket'] = Math.max(0, baseWeights['red-rocket'] - 5);
        }

        // Normalize weights for non-boss levels
        if (!isBossLevel) {
            // Ensure gold star always has some weight
            if (Object.values(baseWeights).filter(w => w > 0).length === 0) {
                baseWeights['gold-star'] = 100;
            }
        }

        const totalWeight = Object.values(baseWeights).reduce((sum, weight) => sum + weight, 0);

        // If total weight is 0 (shouldn't happen), default to gold star
        if (totalWeight === 0) {
            return 'gold-star';
        }

        // Create weighted array
        const validTypes = Object.entries(baseWeights)
            .filter(([_, weight]) => weight > 0)
            .flatMap(([type, weight]) => Array(Math.max(1, Math.floor(weight))).fill(type));

        return validTypes.length > 0 ? validTypes[Math.floor(Math.random() * validTypes.length)] : 'gold-star';
    }

    getCollectibleTemplate(type) {
        // Use consistent type mapping
        const configKey = this.typeConfigMap[type];
        if (!configKey) {
            console.warn(`Unknown collectible type in template: ${type}`);
            return this.getDefaultTemplate(type);
        }

        const typeConfig = this.config.collectables[configKey];
        if (!typeConfig) {
            console.warn(`No config found for collectible type in template: ${type}`);
            return this.getDefaultTemplate(type);
        }

        const templates = {
            'gold-star': { width: 24, height: 24, lifeTime: typeConfig.duration, svg: 'collectable-gold-star.svg' },
            'green-star': { width: 24, height: 24, lifeTime: typeConfig.duration, svg: 'collectable-green-star.svg' },
            'blue-star': { width: 24, height: 24, lifeTime: typeConfig.duration, svg: 'collectable-blue-star.svg' },
            'purple-star': { width: 24, height: 24, lifeTime: typeConfig.duration, svg: 'collectable-purple-star.svg' },
            'red-rocket': { width: 20, height: 32, lifeTime: typeConfig.duration, svg: 'collectable-red-rocket.svg' },
            'azure-bomb': { width: 20, height: 20, lifeTime: typeConfig.duration, svg: 'collectable-azure-bomb.svg' }
        };

        return { type, ...(templates[type] || this.getDefaultTemplate(type)) };
    }

    getDefaultTemplate(type) {
        return { width: 24, height: 24, lifeTime: 10, svg: 'collectable-gold-star.svg' };
    }

    getSpawnCooldown() {
        const level = this.game.level || 1;
        return Math.max(0.5, 2.5 - level * 0.05);
    }

    createCollectibleElement(collectible) {
        try {
            const element = document.createElement('div');
            element.className = `collectible ${collectible.type}`;
            element.style.cssText = `
                position: absolute;
                width: ${collectible.width}px;
                height: ${collectible.height}px;
                left: ${collectible.x}px;
                top: ${collectible.y}px;
                z-index: 10;
                pointer-events: none;
                overflow: hidden;
            `;

            const svgContent = this.svgCache.get(collectible.svg) ||
                SVGUtils.createFallbackSVG('collectible', collectible.width, collectible.height, collectible.type);
            element.innerHTML = SVGUtils.processSVGContent(svgContent, collectible.width, collectible.height);

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(element);
                this.collectibleElements.set(collectible, element);
            }
        } catch (error) {
            console.warn('Error creating collectible element:', error);
        }
    }

    updateCollectibleElement(collectible) {
        const element = this.collectibleElements.get(collectible);
        if (element) {
            element.style.left = `${collectible.x}px`;
            element.style.top = `${collectible.y}px`;
        }
    }

    removeCollectibleElement(collectible) {
        const element = this.collectibleElements.get(collectible);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.collectibleElements.delete(collectible);
    }

    render(ctx) {
        this.collectibles.forEach(collectible => {
            if (!this.collectibleElements.get(collectible)) {
                this.drawCollectibleFallback(ctx, collectible);
            }
        });
    }

    drawCollectibleFallback(ctx, collectible) {
        try {
            ctx.save();
            ctx.translate(collectible.x + collectible.width / 2, collectible.y + collectible.height / 2);

            const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
            ctx.scale(pulse, pulse);

            const colors = {
                'gold-star': '#daa520', 'green-star': '#00ff00', 'blue-star': '#1e90ff',
                'purple-star': '#9370db', 'red-rocket': '#ff4444', 'azure-bomb': '#00ffff'
            };

            ctx.fillStyle = colors[collectible.type] || '#daa520';

            if (collectible.type.includes('star')) {
                this.drawStar(ctx, collectible);
            } else if (collectible.type === 'red-rocket') {
                this.drawRocket(ctx, collectible);
            } else if (collectible.type === 'azure-bomb') {
                this.drawBomb(ctx, collectible);
            }

            ctx.restore();
        } catch (error) {
            console.warn('Error in fallback collectible rendering:', error);
        }
    }

    drawStar(ctx, collectible) {
        const spikes = 5;
        const outerRadius = collectible.width / 2;
        const innerRadius = outerRadius / 2;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawRocket(ctx, collectible) {
        ctx.fillRect(-collectible.width / 3, -collectible.height / 2,
            collectible.width / 1.5, collectible.height);

        ctx.beginPath();
        ctx.moveTo(-collectible.width / 3, -collectible.height / 2);
        ctx.lineTo(collectible.width / 3, -collectible.height / 2);
        ctx.lineTo(0, -collectible.height / 2 - 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(-collectible.width / 3, collectible.height / 2 - 4, collectible.width / 3, 6);
        ctx.fillRect(0, collectible.height / 2 - 4, collectible.width / 3, 6);
    }

    drawBomb(ctx, collectible) {
        ctx.beginPath();
        ctx.arc(0, 0, collectible.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-2, -collectible.height / 2, 4, 8);
    }

    getCollectibles() {
        return this.collectibles;
    }

    clear() {
        this.collectibles.forEach(collectible => {
            this.removeCollectibleElement(collectible);
        });
        this.collectibles = [];
        this.consecutiveStars = 0;
        this.starCombo = 0;
        this.lastStarCollectTime = 0;
    }
}