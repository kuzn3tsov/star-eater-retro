export class Player {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.element = document.getElementById('player');
        this.speed = 5;
        this.position = { x: 0, y: 0 };
        this.isMoving = false;
        this.moveDirection = null;
        this.moveInterval = null;
        this.facing = 'right'; // default direction
        this.borderBuffer = 2; // Buffer to prevent getting stuck

        this.initialize();
        this.bindEvents();
    }

    initialize() {
        if (!this.element || !this.gameArea) {
            console.error('Player element or game area not found');
            return;
        }

        // Center the player in the game area
        const areaRect = this.gameArea.getBoundingClientRect();
        this.position.x = (areaRect.width - 40) / 2;
        this.position.y = (areaRect.height - 40) / 2;

        this.updatePosition();
        this.updateRotation();
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mobile control events with passive listeners
        const controlBtns = document.querySelectorAll('.control-btn');
        controlBtns.forEach(btn => {
            // Use passive: true for touch events to prevent warnings
            btn.addEventListener('mousedown', () => this.handleControlPress(btn.dataset.direction));
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleControlPress(btn.dataset.direction);
            }, { passive: false }); // passive: false since we call preventDefault

            btn.addEventListener('mouseup', () => this.stopMoving());
            btn.addEventListener('mouseleave', () => this.stopMoving());
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopMoving();
            }, { passive: false });
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.stopMoving();
            }, { passive: false });
        });

        // Prevent context menu on mobile controls with passive listener
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
        }
    }

    handleKeyDown(event) {
        // Check if game is paused before handling input
        if (event.repeat || (window.game && window.game.state.isPaused)) return;

        const key = event.key?.toLowerCase();
        if (!key) return;

        switch (key) {
            case 'w':
            case 'arrowup':
                this.startMoving('up');
                break;
            case 's':
            case 'arrowdown':
                this.startMoving('down');
                break;
            case 'a':
            case 'arrowleft':
                this.startMoving('left');
                break;
            case 'd':
            case 'arrowright':
                this.startMoving('right');
                break;
        }
    }

    handleKeyUp(event) {
        // Check if game is paused before handling input
        if (window.game && window.game.state.isPaused) return;

        const key = event.key?.toLowerCase();
        if (!key) return;

        switch (key) {
            case 'w':
            case 's':
            case 'a':
            case 'd':
            case 'arrowup':
            case 'arrowdown':
            case 'arrowleft':
            case 'arrowright':
                this.stopMoving();
                break;
        }
    }

    handleControlPress(direction) {
        // Check if game is paused before handling input
        if (window.game && window.game.state.isPaused) return;
        this.startMoving(direction);
    }

    startMoving(direction) {
        if (this.moveDirection === direction) return;

        this.stopMoving(); // Stop any existing movement

        this.moveDirection = direction;
        this.facing = direction;
        this.isMoving = true;
        this.element.classList.add('moving');
        this.updateRotation();

        // Continuous movement
        this.moveInterval = setInterval(() => {
            this.moveStep(direction);
        }, 16); // ~60fps
    }

    moveStep(direction) {
        const areaRect = this.gameArea.getBoundingClientRect();
        let newX = this.position.x;
        let newY = this.position.y;
        let hitBorder = false;

        switch (direction) {
            case 'up':
                newY = Math.max(this.borderBuffer, this.position.y - this.speed);
                if (newY === this.borderBuffer) hitBorder = true;
                break;
            case 'down':
                newY = Math.min(areaRect.height - 40 - this.borderBuffer, this.position.y + this.speed);
                if (newY === areaRect.height - 40 - this.borderBuffer) hitBorder = true;
                break;
            case 'left':
                newX = Math.max(this.borderBuffer, this.position.x - this.speed);
                if (newX === this.borderBuffer) hitBorder = true;
                break;
            case 'right':
                newX = Math.min(areaRect.width - 40 - this.borderBuffer, this.position.x + this.speed);
                if (newX === areaRect.width - 40 - this.borderBuffer) hitBorder = true;
                break;
        }

        this.position.x = newX;
        this.position.y = newY;
        this.updatePosition();

        // Handle border collision
        if (hitBorder) {
            this.handleBorderCollision();
        }
    }

    handleBorderCollision() {
        // Trigger border collision effects
        document.dispatchEvent(new CustomEvent('borderCollision'));

        // Visual bounce effect
        this.element.classList.add('border-bounce');
        setTimeout(() => {
            this.element.classList.remove('border-bounce');
        }, 300);
    }

    stopMoving() {
        this.isMoving = false;
        this.moveDirection = null;
        this.element.classList.remove('moving');

        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
    }

    updateRotation() {
        // Remove all direction classes
        this.element.classList.remove('facing-up', 'facing-down', 'facing-left', 'facing-right');
        // Add current direction class
        this.element.classList.add(`facing-${this.facing}`);
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

    enableControls() {
        // Controls are enabled by default through event listeners
        console.log('Player controls enabled');
    }

    disableControls() {
        this.stopMoving();
        console.log('Player controls disabled');
    }

    // Clean up method to remove event listeners if needed
    destroy() {
        this.stopMoving();
        // Remove event listeners here if needed
    }
}