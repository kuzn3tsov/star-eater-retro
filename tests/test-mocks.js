// Mock classes for testing - Star Eater Game
console.log('Loading test mocks...');

// Mock DOM Element
class MockElement {
    constructor() {
        this.style = {};
        this.className = '';
        this.dataset = {};
        this.innerHTML = '';
        this.children = [];
        this.parentNode = null;
        this.classList = {
            add: function (className) {
                if (!this.className.includes(className)) {
                    this.className += ' ' + className;
                }
            },
            remove: function (className) {
                this.className = this.className.replace(new RegExp('\\b' + className + '\\b', 'g'), '');
            },
            contains: function (className) {
                return this.className.includes(className);
            }
        };
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
    }

    getBoundingClientRect() {
        return { width: 800, height: 600, left: 0, top: 0 };
    }
}

// Mock CollectablesManager
class CollectablesManager {
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
        const star = new MockElement();
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

            const distanceFromPlayer = Math.sqrt(
                Math.pow(x - (playerX + 20), 2) +
                Math.pow(y - (playerY + 20), 2)
            );

            if (distanceFromPlayer < this.MIN_DISTANCE_FROM_PLAYER) {
                continue;
            }

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

        return {
            x: this.MIN_DISTANCE_FROM_BORDER + Math.random() * safeWidth,
            y: this.MIN_DISTANCE_FROM_BORDER + Math.random() * safeHeight
        };
    }

    removeCollectable(id) {
        if (this.collectables.has(id)) {
            const collectable = this.collectables.get(id);
            collectable.element.classList.add('collected');

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

            if (distance < collisionRadius + 15) {
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

    getRemainingCount() {
        return this.collectableCount;
    }
}

// Mock Player
class Player {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.element = new MockElement();
        this.speed = 5;
        this.position = { x: 0, y: 0 };
        this.isMoving = false;
        this.moveDirection = null;
        this.moveInterval = null;
        this.facing = 'right';
        this.borderBuffer = 2;
    }

    initialize() {
        const areaRect = this.gameArea.getBoundingClientRect();
        this.position.x = (areaRect.width - 40) / 2;
        this.position.y = (areaRect.height - 40) / 2;
        this.updatePosition();
        this.updateRotation();
    }

    startMoving(direction) {
        if (this.moveDirection === direction) return;
        this.stopMoving();

        this.moveDirection = direction;
        this.facing = direction;
        this.isMoving = true;

        this.moveInterval = setInterval(() => {
            this.moveStep(direction);
        }, 16);
    }

    moveStep(direction) {
        const areaRect = this.gameArea.getBoundingClientRect();
        let newX = this.position.x;
        let newY = this.position.y;

        switch (direction) {
            case 'up':
                newY = Math.max(this.borderBuffer, this.position.y - this.speed);
                break;
            case 'down':
                newY = Math.min(areaRect.height - 40 - this.borderBuffer, this.position.y + this.speed);
                break;
            case 'left':
                newX = Math.max(this.borderBuffer, this.position.x - this.speed);
                break;
            case 'right':
                newX = Math.min(areaRect.width - 40 - this.borderBuffer, this.position.x + this.speed);
                break;
        }

        this.position.x = newX;
        this.position.y = newY;
        this.updatePosition();
    }

    stopMoving() {
        this.isMoving = false;
        this.moveDirection = null;

        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
    }

    updateRotation() {
        // Implementation for rotation
    }

    getPosition() {
        return { ...this.position };
    }

    setPosition(x, y) {
        const areaRect = this.gameArea.getBoundingClientRect();
        this.position.x = Math.max(this.borderBuffer, Math.min(areaRect.width - 40 - this.borderBuffer, x));
        this.position.y = Math.max(this.borderBuffer, Math.min(areaRect.height - 40 - this.borderBuffer, y));
        this.updatePosition();
    }

    reset() {
        this.initialize();
        this.stopMoving();
    }
}

// Mock EffectsManager
class EffectsManager {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.sounds = {
            collect: null,
            borderBounce: null
        };
    }

    initializeSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    createExplosion(x, y) {
        const explosion = new MockElement();
        explosion.className = 'explosion';
        explosion.style.left = `${x - 20}px`;
        explosion.style.top = `${y - 20}px`;
        this.gameArea.appendChild(explosion);

        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.remove();
            }
        }, 600);
    }

    playCollectSound() {
        // Mock implementation
    }

    playBorderBounceSound() {
        // Mock implementation
    }

    stopAllSounds() {
        if (this.audioContext) {
            this.audioContext.suspend();
        }
    }

    resumeSounds() {
        if (this.audioContext) {
            this.audioContext.resume();
        }
    }
}

// Mock Game
class Game {
    constructor() {
        this.state = {
            isRunning: false,
            isPaused: false,
            score: 0,
            lives: 3,
            level: 1,
            playerName: 'Guest'
        };
    }

    start(playerName) {
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.score = 0;
        this.state.lives = 3;
        this.state.level = 1;
        this.state.playerName = playerName;
    }

    pause() {
        if (this.state.isRunning && !this.state.isPaused) {
            this.state.isPaused = true;
        }
    }

    resume() {
        if (this.state.isRunning && this.state.isPaused) {
            this.state.isPaused = false;
        }
    }

    completeLevel() {
        this.state.level++;
    }

    handleBorderCollision() {
        if (this.effects) {
            this.effects.playBorderBounceSound();
            this.effects.flashBorder();
        }
    }
}

console.log('Test mocks loaded successfully');