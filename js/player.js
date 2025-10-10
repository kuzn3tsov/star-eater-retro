export class Player {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.element = document.getElementById('player');
        this.speed = 5;
        this.position = { x: 0, y: 0 };
        this.isMoving = false;
        this.moveDirection = null;
        this.moveInterval = null;

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
        this.position.x = (areaRect.width - 30) / 2;
        this.position.y = (areaRect.height - 30) / 2;

        this.updatePosition();
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mobile control events
        const controlBtns = document.querySelectorAll('.control-btn');
        controlBtns.forEach(btn => {
            btn.addEventListener('mousedown', () => this.handleControlPress(btn.dataset.direction));
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleControlPress(btn.dataset.direction);
            });

            btn.addEventListener('mouseup', () => this.stopMoving());
            btn.addEventListener('mouseleave', () => this.stopMoving());
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopMoving();
            });
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.stopMoving();
            });
        });

        // Prevent context menu on mobile controls
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    handleKeyDown(event) {
        if (event.repeat) return;

        switch (event.key.toLowerCase()) {
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
        switch (event.key.toLowerCase()) {
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
        this.startMoving(direction);
    }

    startMoving(direction) {
        if (this.moveDirection === direction) return;

        this.stopMoving(); // Stop any existing movement

        this.moveDirection = direction;
        this.isMoving = true;
        this.element.classList.add('moving');

        // Continuous movement
        this.moveInterval = setInterval(() => {
            this.moveStep(direction);
        }, 16); // ~60fps
    }

    moveStep(direction) {
        const areaRect = this.gameArea.getBoundingClientRect();

        switch (direction) {
            case 'up':
                this.position.y = Math.max(0, this.position.y - this.speed);
                break;
            case 'down':
                this.position.y = Math.min(areaRect.height - 30, this.position.y + this.speed);
                break;
            case 'left':
                this.position.x = Math.max(0, this.position.x - this.speed);
                break;
            case 'right':
                this.position.x = Math.min(areaRect.width - 30, this.position.x + this.speed);
                break;
        }

        this.updatePosition();
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

    getPosition() {
        return { ...this.position };
    }

    setPosition(x, y) {
        const areaRect = this.gameArea.getBoundingClientRect();
        this.position.x = Math.max(0, Math.min(areaRect.width - 30, x));
        this.position.y = Math.max(0, Math.min(areaRect.height - 30, y));
        this.updatePosition();
    }

    reset() {
        this.initialize();
        this.stopMoving();
    }

    // Clean up method to remove event listeners if needed
    destroy() {
        this.stopMoving();
        // Remove event listeners here if needed
    }
}