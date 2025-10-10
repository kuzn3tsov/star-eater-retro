export class CollectablesManager {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.collectables = new Map();
        this.collectableCount = 0;
        this.MIN_DISTANCE_FROM_BORDER = 20;
        this.MIN_DISTANCE_BETWEEN_STARS = 60;
        this.MIN_DISTANCE_FROM_PLAYER = 80;
    }

    spawnStar(x, y) {
        const id = `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const star = document.createElement('div');
        star.className = 'collectable star animated';
        star.innerHTML = '<i class="fa-solid fa-star"></i>';
        star.style.left = `${x}px`;
        star.style.top = `${y}px`;
        star.dataset.id = id;

        this.gameArea.appendChild(star);
        this.collectables.set(id, { element: star, type: 'star', x, y });
        this.collectableCount++;

        return id;
    }

    getSafePosition(playerX, playerY, existingStars = [], maxAttempts = 50) {
        const areaRect = this.gameArea.getBoundingClientRect();
        const safeWidth = areaRect.width - (this.MIN_DISTANCE_FROM_BORDER * 2);
        const safeHeight = areaRect.height - (this.MIN_DISTANCE_FROM_BORDER * 2);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = this.MIN_DISTANCE_FROM_BORDER + Math.random() * safeWidth;
            const y = this.MIN_DISTANCE_FROM_BORDER + Math.random() * safeHeight;

            // Check distance from player
            const distanceFromPlayer = Math.sqrt(
                Math.pow(x - (playerX + 20), 2) +
                Math.pow(y - (playerY + 20), 2)
            );

            if (distanceFromPlayer < this.MIN_DISTANCE_FROM_PLAYER) {
                continue;
            }

            // Check distance from other stars
            let tooClose = false;
            for (const star of existingStars) {
                const distance = Math.sqrt(
                    Math.pow(x - star.x, 2) +
                    Math.pow(y - star.y, 2)
                );

                if (distance < this.MIN_DISTANCE_BETWEEN_STARS) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                return { x, y };
            }
        }

        // If no safe position found after max attempts, return a random position
        return {
            x: this.MIN_DISTANCE_FROM_BORDER + Math.random() * safeWidth,
            y: this.MIN_DISTANCE_FROM_BORDER + Math.random() * safeHeight
        };
    }

    removeCollectable(id) {
        if (this.collectables.has(id)) {
            const collectable = this.collectables.get(id);
            collectable.element.classList.add('collected');

            // Remove from DOM after animation
            setTimeout(() => {
                if (collectable.element.parentNode) {
                    collectable.element.remove();
                }
                this.collectables.delete(id);
                this.collectableCount--;
            }, 300);

            return true;
        }
        return false;
    }

    checkCollision(playerX, playerY, playerSize = 40) {
        const collisionRadius = playerSize / 2;

        for (const [id, collectable] of this.collectables) {
            const starRect = collectable.element.getBoundingClientRect();
            const areaRect = this.gameArea.getBoundingClientRect();

            const starX = starRect.left - areaRect.left + starRect.width / 2;
            const starY = starRect.top - areaRect.top + starRect.height / 2;

            const distance = Math.sqrt(
                Math.pow(playerX + playerSize / 2 - starX, 2) +
                Math.pow(playerY + playerSize / 2 - starY, 2)
            );

            if (distance < collisionRadius + 15) { // 15 is star radius
                return { id, type: collectable.type, x: starX, y: starY };
            }
        }
        return null;
    }

    clearAll() {
        this.collectables.forEach((collectable, id) => {
            if (collectable.element.parentNode) {
                collectable.element.remove();
            }
        });
        this.collectables.clear();
        this.collectableCount = 0;
    }

    spawnRandomStars(count = 10, playerX = 0, playerY = 0) {
        // Start with empty array for collision checking
        const existingStars = [];

        const stars = [];

        for (let i = 0; i < count; i++) {
            const safePos = this.getSafePosition(playerX, playerY, existingStars);
            const id = this.spawnStar(safePos.x, safePos.y);
            stars.push(id);
            // Add to existingStars for collision checking with next stars
            existingStars.push(safePos);
        }

        console.log(`Spawned ${stars.length} stars, total stars now: ${this.collectableCount}`);
        return stars;
    }

    getRemainingCount() {
        return this.collectableCount;
    }
}