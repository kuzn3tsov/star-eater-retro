export class ParticleManager {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.maxParticles = 500; // Prevent memory leaks
    }

    createExplosion(x, y, color = '#ff4444', count = 10) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;

            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                maxLife: 1,
                color: color,
                size: 3 + Math.random() * 4
            });
        }
    }

    createCollectionEffect(x, y, type) {
        const colors = {
            'collect-effect-gold': '#daa520',
            'collect-effect-green': '#00ff00',
            'collect-effect-blue': '#1e90ff',
            'collect-effect-purple': '#9370db'
        };

        this.createExplosion(x, y, colors[type] || '#daa520', 8);
    }

    createTextEffect(x, y, text, color) {
        // Create DOM element for text effect
        const textElement = document.createElement('div');
        textElement.textContent = text;
        textElement.style.position = 'absolute';
        textElement.style.left = x + 'px';
        textElement.style.top = y + 'px';
        textElement.style.color = color;
        textElement.style.fontFamily = '"Press Start 2P", monospace';
        textElement.style.fontSize = '12px';
        textElement.style.whiteSpace = 'nowrap';
        textElement.style.transform = 'translate(-50%, -50%)';
        textElement.style.animation = 'textFloat 2s ease-out forwards';
        textElement.style.zIndex = '1000';
        textElement.style.pointerEvents = 'none';

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(textElement);

            setTimeout(() => {
                if (textElement.parentNode) {
                    textElement.parentNode.removeChild(textElement);
                }
            }, 2000);
        }
    }

    createIonPulse(x, y) {
        this.createExplosion(x, y, '#00ffff', 20);
    }

    // NEW: Boss spawn effect
    createBossSpawnEffect(x, y, color = '#ff00ff') {
        for (let i = 0; i < 30; i++) {
            if (this.particles.length >= this.maxParticles) break;

            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 2,
                maxLife: 2,
                color: color,
                size: 4 + Math.random() * 6
            });
        }
    }

    // NEW: Toxic cloud effect
    createToxicCloud(x, y) {
        for (let i = 0; i < 15; i++) {
            if (this.particles.length >= this.maxParticles) break;

            this.particles.push({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 3,
                maxLife: 3,
                color: '#00ff00',
                size: 2 + Math.random() * 3
            });
        }
    }

    // NEW: Boss defeat explosion
    createBossDefeatEffect(x, y, color = '#ff4444') {
        for (let i = 0; i < 50; i++) {
            if (this.particles.length >= this.maxParticles) break;

            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.5,
                maxLife: 1.5,
                color: color,
                size: 5 + Math.random() * 8
            });
        }
    }

    update(deltaTime) {
        // Update existing particles
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime;

            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }

    render(ctx) {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    clear() {
        this.particles = [];
        // Also clean up any DOM elements
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const particleElements = gameContainer.querySelectorAll('[style*="animation: textFloat"]');
            particleElements.forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }
    }

    onResize() {
        // Handle canvas resize if needed
    }
}