export class CollectibleManager {
    constructor(game) {
        this.game = game;
        this.collectibles = [];
        this.spawnTimer = 0;
        this.starCombo = 0;
        this.lastStarTime = 0;
        this.collectibleElements = new Map();
        this.svgCache = new Map();
        this.assetsLoaded = false;

        // FIXED: Track consecutive stars for purple star spawn (not combo)
        this.consecutiveStars = 0;
        this.lastStarCollectTime = 0;
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

        // Use Promise.allSettled to avoid blocking on failures
        const results = await Promise.allSettled(loadPromises);
        console.log('SVG assets loaded:', results.filter(r => r.status === 'fulfilled' && r.value).length, '/', svgFiles.length);
    }

    update(deltaTime) {
        this.updateCollectibles(deltaTime);
        this.handleSpawning(deltaTime);
        this.updateCombos(deltaTime);
    }

    updateCollectibles(deltaTime) {
        this.collectibles.forEach((collectible, index) => {
            collectible.lifeTime -= deltaTime;

            if (collectible.lifeTime <= 0) {
                this.removeCollectibleElement(collectible);
                this.collectibles.splice(index, 1);
                return;
            }

            if (this.checkPlayerCollision(collectible)) {
                this.collect(collectible, index);
            } else {
                this.updateCollectibleElement(collectible);
            }
        });
    }

    checkPlayerCollision(collectible) {
        const player = this.game.player;
        if (!player) return false;

        return (
            collectible.x < player.x + player.width &&
            collectible.x + collectible.width > player.x &&
            collectible.y < player.y + player.height &&
            collectible.y + collectible.height > player.y
        );
    }

    collect(collectible, index) {
        this.applyCollectibleEffect(collectible);
        this.createCollectionEffect(collectible);
        this.removeCollectibleElement(collectible);
        this.collectibles.splice(index, 1);

        // FIXED: Track consecutive stars properly for purple star spawn
        if (collectible.type.includes('star')) {
            const now = Date.now();

            // Reset consecutive stars if too much time passed
            if (now - this.lastStarCollectTime > 3000) {
                this.consecutiveStars = 0;
            }

            this.consecutiveStars++;
            this.lastStarCollectTime = now;

            // Update combo for scoring (separate from consecutive tracking)
            this.updateStarCombo();
        } else {
            // Reset consecutive stars when collecting non-star items
            this.consecutiveStars = 0;
        }
    }

    applyCollectibleEffect(collectible) {
        if (!this.game.player) return;

        switch (collectible.type) {
            case 'gold-star':
                this.game.addScore(2);
                // NEW: Track gold stars for level progression
                this.game.addStar();
                break;
            case 'green-star':
                this.game.addScore(1);
                // Freeze all enemies with cumulative time
                this.freezeAllEnemies(3);
                break;
            case 'blue-star':
                // FIXED: No flat points, only points from destroying enemies during power mode
                this.game.player.starPowerTime = 10;
                if (this.game.ui) {
                    this.game.ui.activateStarPower(10);
                }
                break;
            case 'purple-star':
                const enemyCount = this.game.enemies ? this.game.enemies.getEnemies().length : 0;
                this.game.addScore(enemyCount);
                if (this.game.enemies) {
                    this.game.enemies.clear();
                }
                // Reset consecutive stars after purple star
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
                // Use the powerup manager to freeze enemies with cumulative time
                this.game.powerups.freezeEnemy(enemy, duration);
            });

            // Visual feedback
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

        // Combo bonus scoring
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
        // Reset combo if too much time passes
        if (Date.now() - this.lastStarTime > 2000 && this.starCombo > 0) {
            this.starCombo = 0;
        }

        // Reset consecutive stars if too much time passes
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
        if (this.collectibles.length >= 5) return;

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
        const isBossLevel = [15, 30, 45, 60, 75].includes(level);

        const baseWeights = {
            'gold-star': 40, 'green-star': 25, 'blue-star': 15,
            'purple-star': 10, 'red-rocket': 10, 'azure-bomb': 0
        };

        const adjustedWeights = { ...baseWeights };

        // FIXED: Green Star available after level 4 (as specified)
        if (level < 4) {
            adjustedWeights['green-star'] = 0;
        }

        // FIXED: Blue Star available after level 6 AND every 5 levels
        if (level < 6 || (level > 6 && (level - 6) % 5 !== 0)) {
            adjustedWeights['blue-star'] = 0;
        } else {
            // Increase blue star chance when available
            adjustedWeights['blue-star'] = 25;
        }

        // FIXED: Red Rocket available after level 13 AND every 3 levels
        if (level < 13 || (level > 13 && (level - 13) % 3 !== 0)) {
            adjustedWeights['red-rocket'] = 0;
        } else {
            // Increase red rocket chance when available
            adjustedWeights['red-rocket'] = 15;
        }

        // FIXED: Purple star spawn based on CONSECUTIVE stars (5 consecutive stars)
        if (this.consecutiveStars >= 5) {
            adjustedWeights['purple-star'] = 50; // High chance when conditions met
            // Don't reset consecutive stars here - reset after collection
        } else {
            adjustedWeights['purple-star'] = 5; // Base low chance
        }

        if (isBossLevel && this.game.boss) {
            // Boss level adjustments
            adjustedWeights['azure-bomb'] = 30;
            adjustedWeights['gold-star'] = 25;
            adjustedWeights['green-star'] = 15;
            adjustedWeights['blue-star'] = 10;
            adjustedWeights['purple-star'] = 5;
            adjustedWeights['red-rocket'] = 5;
        }

        // Normalize weights to ensure total is reasonable
        const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
        if (totalWeight === 0) {
            // Fallback to gold stars if no other types are available
            adjustedWeights['gold-star'] = 100;
        }

        const validTypes = Object.entries(adjustedWeights)
            .filter(([_, weight]) => weight > 0)
            .flatMap(([type, weight]) => Array(weight).fill(type));

        return validTypes.length > 0 ? validTypes[Math.floor(Math.random() * validTypes.length)] : 'gold-star';
    }

    getCollectibleTemplate(type) {
        const templates = {
            'gold-star': { width: 24, height: 24, lifeTime: 10, svg: 'collectable-gold-star.svg' },
            'green-star': { width: 24, height: 24, lifeTime: 8, svg: 'collectable-green-star.svg' },
            'blue-star': { width: 24, height: 24, lifeTime: 8, svg: 'collectable-blue-star.svg' },
            'purple-star': { width: 24, height: 24, lifeTime: 6, svg: 'collectable-purple-star.svg' },
            'red-rocket': { width: 20, height: 32, lifeTime: 12, svg: 'collectable-red-rocket.svg' },
            'azure-bomb': { width: 20, height: 20, lifeTime: 8, svg: 'collectable-azure-bomb.svg' }
        };

        return { type, ...templates[type] };
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

            // Use cached SVG or create fallback immediately (no async)
            const svgContent = this.svgCache.get(collectible.svg) || this.createFallbackSVG(collectible);
            element.innerHTML = this.processSVGContent(svgContent);

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(element);
                this.collectibleElements.set(collectible, element);
            }
        } catch (error) {
            console.warn('Error creating collectible element:', error);
        }
    }

    processSVGContent(svgContent) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = doc.querySelector('svg');

            if (svgElement) {
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

                if (!svgElement.getAttribute('viewBox')) {
                    svgElement.setAttribute('viewBox', '0 0 24 24');
                }

                return svgElement.outerHTML;
            }
        } catch (error) {
            console.warn('Error processing SVG content:', error);
        }

        return svgContent; // Return original if processing fails
    }

    createFallbackSVG(collectible) {
        const colors = {
            'gold-star': '#daa520', 'green-star': '#00ff00', 'blue-star': '#1e90ff',
            'purple-star': '#9370db', 'red-rocket': '#ff4444', 'azure-bomb': '#00ffff'
        };

        const color = colors[collectible.type] || '#daa520';

        if (collectible.type.includes('star')) {
            return `
                <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2 L14.5 8.5 L21.5 9.5 L16 14 L17.5 21 L12 17 L6.5 21 L8 14 L2.5 9.5 L9.5 8.5 Z"
                          fill="${color}"/>
                </svg>
            `;
        } else if (collectible.type === 'red-rocket') {
            return `
                <svg width="100%" height="100%" viewBox="0 0 20 32" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="0" width="8" height="24" fill="${color}"/>
                    <polygon points="10,0 20,8 0,8" fill="${color}"/>
                    <rect x="4" y="24" width="4" height="6" fill="#8b4513"/>
                    <rect x="12" y="24" width="4" height="6" fill="#8b4513"/>
                </svg>
            `;
        } else if (collectible.type === 'azure-bomb') {
            return `
                <svg width="100%" height="100%" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" fill="${color}"/>
                    <rect x="9" y="2" width="2" height="6" fill="#8b4513"/>
                    <circle cx="10" cy="4" r="1" fill="#ffff00"/>
                </svg>
            `;
        }

        return '<div style="width:100%;height:100%;background:red;"></div>'; // Ultimate fallback
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
        // Fallback canvas rendering if DOM elements fail
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

            // FIXED: Octal literal replaced with decimal
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
        // Reset tracking variables
        this.consecutiveStars = 0;
        this.starCombo = 0;
        this.lastStarCollectTime = 0;
    }
}