export class EffectsManager {
    constructor(gameArea) {
        this.gameArea = gameArea;
        this.sounds = {
            collect: null,
            borderBounce: null
        };
        this.initializeSounds();
    }

    initializeSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Star collection sound
            this.sounds.collect = this.createBeepSound(800, 0.1, 'sine');

            // Border bounce sound
            this.sounds.borderBounce = this.createBeepSound(300, 0.2, 'square');

        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    createBeepSound(frequency, duration, type = 'sine') {
        return () => {
            if (!this.audioContext || window.game?.state?.isPaused) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    createExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = `${x - 20}px`;
        explosion.style.top = `${y - 20}px`;
        explosion.innerHTML = '<i class="fa-solid fa-burst"></i>';

        this.gameArea.appendChild(explosion);

        // Remove after animation
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.remove();
            }
        }, 600);
    }

    playCollectSound() {
        if (this.sounds.collect && !window.game?.state?.isPaused) {
            this.sounds.collect();
        }
    }

    playBorderBounceSound() {
        if (this.sounds.borderBounce && !window.game?.state?.isPaused) {
            this.sounds.borderBounce();
        }
    }

    flashGameArea() {
        this.gameArea.classList.add('collect-flash');
        setTimeout(() => {
            this.gameArea.classList.remove('collect-flash');
        }, 300);
    }

    flashBorder() {
        this.gameArea.classList.add('border-collision');
        setTimeout(() => {
            this.gameArea.classList.remove('border-collision');
        }, 300);
    }

    // Stop all sounds when game is paused
    stopAllSounds() {
        if (this.audioContext) {
            this.audioContext.suspend();
        }
    }

    // Resume sounds when game is resumed
    resumeSounds() {
        if (this.audioContext) {
            this.audioContext.resume();
        }
    }
}