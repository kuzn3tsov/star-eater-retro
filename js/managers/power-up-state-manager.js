export class PowerUpStateManager {
    constructor() {
        this.states = new Map();
        this.subscribers = [];
        this.initializeDefaultStates();
    }

    initializeDefaultStates() {
        const defaultStates = {
            'shield': { unlocked: false, active: false, cooldown: 0, cooldownDuration: 30 },
            'ionPulse': { unlocked: false, active: false, cooldown: 0, cooldownDuration: 25 },
            'radar': { unlocked: false, active: false, cooldown: 0, cooldownDuration: 45 },
            'starPower': { unlocked: true, active: false, duration: 0, cooldownDuration: 10 },
            'endlessMode': { unlocked: false, active: false }
        };

        Object.entries(defaultStates).forEach(([type, state]) => {
            this.states.set(type, { ...state });
        });
    }

    setState(type, newState) {
        if (!this.states.has(type)) {
            console.warn(`Unknown power-up type: ${type}`);
            return;
        }

        const currentState = this.states.get(type);
        const updatedState = { ...currentState, ...newState };
        this.states.set(type, updatedState);

        this.notifySubscribers(type, updatedState);
    }

    getState(type) {
        return this.states.get(type) || null;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
            this.subscribers.splice(index, 1);
        }
    }

    notifySubscribers(type, state) {
        this.subscribers.forEach(subscriber => {
            try {
                subscriber(type, state);
            } catch (error) {
                console.error('Error in power-up state subscriber:', error);
            }
        });
    }

    unlockPowerUp(type) {
        this.setState(type, { unlocked: true });
    }

    activatePowerUp(type, duration = 0) {
        const updates = { active: true };
        if (duration > 0) {
            updates.duration = duration;
        }
        this.setState(type, updates);
    }

    deactivatePowerUp(type) {
        this.setState(type, { active: false, duration: 0 });
    }

    startCooldown(type, cooldownTime) {
        this.setState(type, { cooldown: cooldownTime });
    }

    updateCooldowns(deltaTime) {
        this.states.forEach((state, type) => {
            if (state.cooldown > 0) {
                const newCooldown = Math.max(0, state.cooldown - deltaTime);
                this.setState(type, { cooldown: newCooldown });
            }
        });
    }

    clear() {
        this.states.forEach((state, type) => {
            this.setState(type, {
                active: false,
                cooldown: 0,
                duration: 0
            });
        });
    }
}