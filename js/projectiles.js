import { CollisionManager } from './physics/collision-manager.js';
import { SVGUtils } from './utils/svg-utils.js';

export class ProjectileManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
        this.svgCache = new Map();
        this.projectileElements = new Map();

        // Preload projectile SVGs
        this.preloadProjectileSVGs();
    }

    async preloadProjectileSVGs() {
        const projectileTypes = [
            { type: 'burst', filename: 'projectile-burst.svg' },
            { type: 'meteor', filename: 'projectile-meteor.svg' },
            { type: 'big-meteor', filename: 'projectile-big-meteor.svg' }
        ];

        const loadPromises = projectileTypes.map(async (projectile) => {
            try {
                const response = await fetch(`assets/graphics/${projectile.filename}`);
                if (response.ok) {
                    const svgText = await response.text();
                    this.svgCache.set(projectile.type, svgText);
                    return true;
                } else {
                    console.warn(`Failed to load ${projectile.filename}`);
                    return false;
                }
            } catch (error) {
                console.warn(`Error loading ${projectile.filename}:`, error);
                return false;
            }
        });

        await Promise.allSettled(loadPromises);
        console.log('Projectile SVGs loaded:', this.svgCache.size, '/', projectileTypes.length);
    }

    create(projectileData) {
        const projectile = {
            ...projectileData,
            width: this.getProjectileSize(projectileData.type).width,
            height: this.getProjectileSize(projectileData.type).height,
            lifeTime: this.getProjectileLifetime(projectileData.type),
            angle: projectileData.angle || Math.atan2(projectileData.vy, projectileData.vx)
        };

        this.projectiles.push(projectile);
        this.createProjectileElement(projectile);
    }

    createLaser(laserData) {
        const laser = {
            ...laserData,
            width: laserData.length || 100,
            height: 4,
            lifeTime: 0.1,
            type: 'laser'
        };
        this.projectiles.push(laser);
        this.createLaserElement(laser);
    }

    getProjectileSize(type) {
        const sizes = {
            'burst': { width: 8, height: 8 },
            'meteor': { width: 16, height: 16 },
            'big-meteor': { width: 24, height: 24 },
            'laser': { width: 100, height: 4 }
        };
        return sizes[type] || { width: 8, height: 8 };
    }

    getProjectileLifetime(type) {
        const lifetimes = {
            'burst': 3,
            'meteor': 4,
            'big-meteor': 5,
            'laser': 0.1
        };
        return lifetimes[type] || 3;
    }

    createProjectileElement(projectile) {
        try {
            const element = document.createElement('div');
            element.className = `projectile projectile-${projectile.type}`;

            const size = this.getProjectileSize(projectile.type);
            element.style.cssText = `
                position: absolute;
                width: ${size.width}px;
                height: ${size.height}px;
                left: ${projectile.x - size.width / 2}px;
                top: ${projectile.y - size.height / 2}px;
                z-index: 910;
                pointer-events: none;
                transform-origin: center center;
            `;

            const svgContent = this.svgCache.get(projectile.type) ||
                SVGUtils.createFallbackSVG('projectile', size.width, size.height, projectile.type);
            element.innerHTML = SVGUtils.processSVGContent(svgContent, size.width, size.height);

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(element);
                this.projectileElements.set(projectile, element);
                this.updateProjectileRotation(projectile);
            }
        } catch (error) {
            console.warn('Error creating projectile element:', error);
        }
    }

    createLaserElement(laser) {
        try {
            const element = document.createElement('div');
            element.className = 'projectile projectile-laser';

            element.style.cssText = `
                position: absolute;
                width: ${laser.width}px;
                height: ${laser.height}px;
                left: ${laser.x}px;
                top: ${laser.y - laser.height / 2}px;
                z-index: 910;
                pointer-events: none;
                transform-origin: left center;
                background: linear-gradient(90deg, #ff4444, #ffff00);
                border-radius: 2px;
                box-shadow: 0 0 10px #ff4444;
            `;

            // Rotate laser to match angle
            const degrees = laser.angle * (180 / Math.PI);
            element.style.transform = `rotate(${degrees}deg)`;

            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(element);
                this.projectileElements.set(laser, element);

                // Remove laser after duration
                setTimeout(() => {
                    this.removeProjectileElement(laser);
                }, laser.lifeTime * 1000);
            }
        } catch (error) {
            console.warn('Error creating laser element:', error);
        }
    }

    updateProjectileRotation(projectile) {
        const element = this.projectileElements.get(projectile);
        if (element && projectile.angle !== undefined) {
            const degrees = projectile.angle * (180 / Math.PI);
            element.style.transform = `rotate(${degrees}deg)`;
        }
    }

    removeProjectileElement(projectile) {
        const element = this.projectileElements.get(projectile);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.projectileElements.delete(projectile);
    }

    update(deltaTime) {
        // Use reverse iteration to safely remove elements
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.x += projectile.vx * deltaTime;
            projectile.y += projectile.vy * deltaTime;
            projectile.lifeTime -= deltaTime;

            // Update projectile angle based on velocity
            if (projectile.vx !== 0 || projectile.vy !== 0) {
                projectile.angle = Math.atan2(projectile.vy, projectile.vx);
                this.updateProjectileRotation(projectile);
            }

            // Update DOM position
            this.updateProjectileElement(projectile);

            if (projectile.lifeTime <= 0 ||
                projectile.x < -50 || projectile.x > this.game.canvas.width + 50 ||
                projectile.y < -50 || projectile.y > this.game.canvas.height + 50) {
                this.removeProjectileElement(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateProjectileElement(projectile) {
        const element = this.projectileElements.get(projectile);
        if (element) {
            const size = this.getProjectileSize(projectile.type);

            if (projectile.type === 'laser') {
                // Special handling for laser positioning
                element.style.left = `${projectile.x}px`;
                element.style.top = `${projectile.y - size.height / 2}px`;
            } else {
                // Regular projectile positioning (centered)
                element.style.left = `${projectile.x - size.width / 2}px`;
                element.style.top = `${projectile.y - size.height / 2}px`;
            }
        }
    }

    checkCollisions(enemies, player) {
        // Use reverse iteration to safely remove projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            let collided = false;

            // Check enemy collisions (only for player projectiles)
            if (projectile.source === 'player') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (CollisionManager.checkRectCollision(projectile, enemy)) {
                        enemy.health -= projectile.damage;
                        collided = true;

                        // Create explosion effect
                        if (this.game.particles) {
                            this.game.particles.createExplosion(
                                projectile.x,
                                projectile.y,
                                '#ff4444',
                                2
                            );
                        }
                        break; // Only hit one enemy per projectile
                    }
                }
            }

            // Check player collision if not already collided and is enemy projectile
            if (!collided && player && projectile.source !== 'player' &&
                CollisionManager.checkRectCollision(projectile, player.bounds)) {
                // Check if player is protected
                const isProtected = (this.game.powerups && this.game.powerups.isShieldActive()) ||
                    (player.starPowerTime > 0);

                if (!isProtected) {
                    collided = true;
                    if (!player.takeDamage()) {
                        this.game.lives--;
                        this.game.updateHUD();
                        if (this.game.lives <= 0) {
                            this.game.gameOver();
                        }
                    }
                }
            }

            // Remove projectile if it collided
            if (collided) {
                this.removeProjectileElement(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Fallback rendering if DOM elements fail
        this.projectiles.forEach(projectile => {
            if (!this.projectileElements.get(projectile)) {
                this.drawProjectileFallback(ctx, projectile);
            }
        });
    }

    drawProjectileFallback(ctx, projectile) {
        ctx.save();
        ctx.translate(projectile.x, projectile.y);

        if (projectile.angle) {
            ctx.rotate(projectile.angle);
        }

        const colors = {
            'burst': '#ff4444',
            'meteor': '#8b4513',
            'big-meteor': '#654321',
            'laser': '#ff4444'
        };

        ctx.fillStyle = colors[projectile.type] || '#ff4444';

        if (projectile.type === 'laser') {
            ctx.fillRect(0, -projectile.height / 2, projectile.width, projectile.height);

            // Laser glow
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            ctx.fillRect(0, -projectile.height / 2, projectile.width, projectile.height);
            ctx.shadowBlur = 0;
        } else {
            // Circular projectiles
            ctx.beginPath();
            ctx.arc(0, 0, projectile.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // Projectile glow
            ctx.shadowColor = colors[projectile.type] || '#ff4444';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    clear() {
        this.projectiles.forEach(projectile => {
            this.removeProjectileElement(projectile);
        });
        this.projectiles = [];
        this.projectileElements.clear();
    }
}