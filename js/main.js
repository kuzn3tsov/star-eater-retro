import { GameEngine } from './game-engine.js';

document.addEventListener('DOMContentLoaded', async () => {
    const gameEngine = new GameEngine();
    await gameEngine.initialize();
});