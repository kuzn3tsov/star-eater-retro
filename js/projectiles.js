export class ProjectileManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
    }

    create(projectileData) {
        this.projectiles.push({
            ...projectileData,
            width: 8,
            height: 8,
            lifeTime: 5
        });
    }

    createLaser(laserData) {
        // Create laser beam
        const laser = {
            ...laserData,
            width: laserData.length || 100,
            height: 4,
            lifeTime: 0.1
        };
        this.projectiles.push(laser);
    }

    update(deltaTime) {
        this.projectiles.forEach((projectile, index) => {
            projectile.x += projectile.vx * deltaTime;
            projectile.y += projectile.vy * deltaTime;
            projectile.lifeTime -= deltaTime;

            if (projectile.lifeTime <= 0 ||
                projectile.x < 0 || projectile.x > this.game.canvas.width ||
                projectile.y < 0 || projectile.y > this.game.canvas.height) {
                this.projectiles.splice(index, 1);
            }
        });
    }

    checkCollisions(enemies, player) {
        this.projectiles.forEach((projectile, projIndex) => {
            // Check enemy collisions
            enemies.forEach((enemy, enemyIndex) => {
                if (this.checkRectCollision(projectile, enemy)) {
                    enemy.health -= projectile.damage;
                    this.projectiles.splice(projIndex, 1);
                    this.game.particles.createExplosion(projectile.x, projectile.y, '#ff4444');
                }
            });

            // Check player collisions
            if (this.checkRectCollision(projectile, player.bounds) &&
                !this.game.powerups.isShieldActive() && !player.starPowerTime > 0) {
                this.projectiles.splice(projIndex, 1);
                if (!player.takeDamage()) {
                    this.game.lives--;
                    this.game.updateHUD();
                    if (this.game.lives <= 0) {
                        this.game.gameOver();
                    }
                }
            }
        });
    }

    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    render(ctx) {
        this.projectiles.forEach(projectile => {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.width / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    clear() {
        this.projectiles = [];
    }
}