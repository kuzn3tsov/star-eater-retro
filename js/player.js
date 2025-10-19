export class Player {
    constructor(game) {
        this.game = game;
        this.width = 48;
        this.height = 48;

        this.thrustParticles = [];
        this.lastLoggedX = 0;
        this.lastLoggedY = 0;
        this.lastLoggedAngle = 0;

        this.starPowerTime = 0;
        this.freezeTime = 0;
        this.damageFlash = 0;

        this.targetX = 0;
        this.targetY = 0;
        this.smoothSpeed = 0.2;

        this.angle = 0;
        this.movementAngle = 0;
        this.rotationSpeed = 0.2;

        this.createPlayerElement();
        this.reset();
        this.loadActualSVG();
    }

    async loadActualSVG() {
        try {
            const response = await fetch('assets/graphics/player-avatar.svg');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const svgText = await response.text();

            if (this.domElement) {
                this.domElement.innerHTML = svgText;
                const svgElement = this.domElement.querySelector('svg');
                if (svgElement) {
                    svgElement.style.width = '100%';
                    svgElement.style.height = '100%';
                    svgElement.style.display = 'block';
                }
                this.updatePlayerAppearance();
            }

        } catch (error) {
            console.error('Failed to load player-avatar.svg:', error);
            this.useFallbackSVG();
        }
    }

    useFallbackSVG() {
        if (!this.domElement) return;

        const fallbackSVG = `
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                <path d="M24 4 L44 24 L34 24 L34 44 L14 44 L14 24 L4 24 Z"
                      fill="#daa520" stroke="#000" stroke-width="2"/>
                <circle cx="24" cy="20" r="6" fill="#00ffff" stroke="#000" stroke-width="1"/>
                <rect x="18" y="38" width="12" height="4" fill="#ff6b00" stroke="#000" stroke-width="1"/>
                <rect x="20" y="42" width="8" height="2" fill="#ff4444" stroke="#000" stroke-width="1"/>
            </svg>
        `;

        this.domElement.innerHTML = fallbackSVG;
        this.updatePlayerAppearance();
    }

    createPlayerElement() {
        if (this.domElement) {
            this.domElement.remove();
        }

        this.domElement = document.createElement('div');
        this.domElement.id = 'player-avatar';
        this.domElement.className = 'player player-normal';

        this.domElement.style.width = this.width + 'px';
        this.domElement.style.height = this.height + 'px';
        this.domElement.style.position = 'absolute';
        this.domElement.style.zIndex = '1000';
        this.domElement.style.pointerEvents = 'none';
        this.domElement.style.transformOrigin = 'center center';

        this.domElement.style.left = '0px';
        this.domElement.style.top = '0px';

        this.domElement.innerHTML = `
            <div style="width:100%;height:100%;background:red;border:4px solid yellow;display:flex;align-items:center;justify-content:center;color:white;font-size:8px;font-weight:bold;">
                PLAYER
            </div>
        `;

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.domElement);
            console.log('Player element created and added to game container');
        } else {
            console.error('Game container not found!');
            document.body.appendChild(this.domElement);
        }
    }

    reset() {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            this.x = (gameContainer.clientWidth - this.width) / 2;
            this.y = (gameContainer.clientHeight - this.height) / 2;
            this.targetX = this.x;
            this.targetY = this.y;
        } else {
            this.x = 400;
            this.y = 300;
            this.targetX = this.x;
            this.targetY = this.y;
        }

        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.angle = 0;
        this.movementAngle = 0;

        this.starPowerTime = 0;
        this.freezeTime = 0;
        this.damageFlash = 0;

        this.thrustParticles.forEach(particle => {
            if (particle.element) particle.element.remove();
        });
        this.thrustParticles = [];

        if (!this.domElement) {
            this.createPlayerElement();
        }

        this.updateDOMPosition();
    }

    update(deltaTime) {
        this.move(deltaTime);
        this.updatePowerUps(deltaTime);
        this.updateVisuals(deltaTime);
        this.keepInBounds();
        this.updateDOMElement();
    }

    move(deltaTime) {
        const prevX = this.x;
        const prevY = this.y;

        this.targetX += this.velocityX * this.speed;
        this.targetY += this.velocityY * this.speed;

        this.x += (this.targetX - this.x) * this.smoothSpeed;
        this.y += (this.targetY - this.y) * this.smoothSpeed;

        const dx = this.x - prevX;
        const dy = this.y - prevY;

        if (dx !== 0 || dy !== 0) {
            this.movementAngle = Math.atan2(dy, dx);
        }

        const targetAngle = this.movementAngle;
        const angleDiff = this.normalizeAngle(targetAngle - this.angle);
        this.angle += angleDiff * this.rotationSpeed;
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    updatePowerUps(deltaTime) {
        if (this.starPowerTime > 0) {
            this.starPowerTime -= deltaTime;
            if (this.starPowerTime <= 0) {
                this.updatePlayerAppearance();
            }
        }

        if (this.freezeTime > 0) {
            this.freezeTime -= deltaTime;
        }

        if (this.damageFlash > 0) {
            this.damageFlash -= deltaTime;
            if (this.damageFlash <= 0) {
                this.updatePlayerAppearance();
            }
        }
    }

    updateVisuals(deltaTime) {
        if ((this.velocityX !== 0 || this.velocityY !== 0) && Math.random() < 0.3) {
            this.createThrustParticle();
        }

        for (let i = this.thrustParticles.length - 1; i >= 0; i--) {
            const particle = this.thrustParticles[i];
            particle.life -= deltaTime;
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.life <= 0) {
                if (particle.element) {
                    particle.element.remove();
                }
                this.thrustParticles.splice(i, 1);
            } else if (particle.element) {
                particle.element.style.left = particle.x + 'px';
                particle.element.style.top = particle.y + 'px';
                particle.element.style.opacity = particle.life / particle.maxLife;
            }
        }
    }

    createThrustParticle() {
        const angle = this.angle + Math.PI;
        const spread = 0.4;
        const particleAngle = angle + (Math.random() - 0.5) * spread;
        const speed = 2 + Math.random() * 2;

        const playerCenterX = this.x + this.width / 2;
        const playerCenterY = this.y + this.height / 2;

        const rearOffsetX = Math.cos(angle) * (this.width / 2 + 40);
        const rearOffsetY = Math.sin(angle) * (this.height / 2 + 40);

        const particleX = playerCenterX + rearOffsetX;
        const particleY = playerCenterY + rearOffsetY;

        const particle = {
            x: particleX,
            y: particleY,
            vx: Math.cos(particleAngle) * speed,
            vy: Math.sin(particleAngle) * speed,
            life: 0.3 + Math.random() * 0.2,
            maxLife: 0.3 + Math.random() * 0.2
        };

        particle.element = document.createElement('div');
        particle.element.className = 'thrust-particle';
        particle.element.style.width = '8px';
        particle.element.style.height = '8px';
        particle.element.style.position = 'absolute';
        particle.element.style.zIndex = '900';
        particle.element.style.left = particle.x + 'px';
        particle.element.style.top = particle.y + 'px';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(particle.element);
            this.thrustParticles.push(particle);
        }
    }

    keepInBounds() {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            this.x = Math.max(0, Math.min(gameContainer.clientWidth - this.width, this.x));
            this.y = Math.max(0, Math.min(gameContainer.clientHeight - this.height, this.y));
            this.targetX = Math.max(0, Math.min(gameContainer.clientWidth - this.width, this.targetX));
            this.targetY = Math.max(0, Math.min(gameContainer.clientHeight - this.height, this.targetY));
        }
    }

    updateDOMElement() {
        if (!this.domElement) {
            this.createPlayerElement();
            return;
        }

        this.updateDOMPosition();
        this.updatePlayerAppearance();
    }

    updateDOMPosition() {
        if (this.domElement) {
            this.domElement.style.left = this.x + 'px';
            this.domElement.style.top = this.y + 'px';

            const degrees = this.angle * (180 / Math.PI);
            this.domElement.style.transform = `rotate(${degrees}deg)`;
            this.domElement.style.transformOrigin = 'center center';

            if (Math.abs(this.angle - this.lastLoggedAngle) > 0.1) {
                console.log(`Player rotation: ${degrees.toFixed(1)}°, Angle: ${this.angle.toFixed(2)}rad`);
                this.lastLoggedAngle = this.angle;
            }
        }
    }

    updatePlayerAppearance() {
        if (!this.domElement) return;

        this.domElement.classList.remove('player-normal', 'player-damage', 'player-power', 'player-shield', 'player-freeze');

        let stateClass = 'player-normal';
        if (this.damageFlash > 0) {
            stateClass = 'player-damage';
        } else if (this.starPowerTime > 0) {
            stateClass = 'player-power';
        } else if (this.game.powerups && this.game.powerups.isShieldActive()) {
            stateClass = 'player-shield';
        } else if (this.freezeTime > 0) {
            stateClass = 'player-freeze';
        }

        this.domElement.classList.add(stateClass);
        this.updateDOMPosition();
    }

    takeDamage() {
        if ((this.game.powerups && this.game.powerups.isShieldActive()) || this.starPowerTime > 0 || this.damageFlash > 0) {
            return true;
        }

        this.damageFlash = 2.0;
        this.updatePlayerAppearance();
        this.game.screenShake(10);
        return false;
    }

    render(ctx) {
        if (!this.domElement) {
            this.drawPlayerFallback(ctx);
        }
    }

    drawPlayerFallback(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.damageFlash > 0 ? '#ff4444' :
            this.starPowerTime > 0 ? '#1e90ff' :
                (this.game.powerups && this.game.powerups.isShieldActive()) ? '#00ff00' : '#daa520';

        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(-this.width / 2, -this.height / 3);
        ctx.lineTo(-this.width / 2, this.height / 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    get center() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    get bounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    destroy() {
        if (this.domElement) {
            this.domElement.remove();
            this.domElement = null;
        }

        this.thrustParticles.forEach(particle => {
            if (particle && particle.element) {
                particle.element.remove();
            }
        });
        this.thrustParticles = [];
    }
}