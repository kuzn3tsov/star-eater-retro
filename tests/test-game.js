// Game Tests
describe('Game', () => {
    let game;

    beforeEach(() => {
        // Create minimal DOM for game
        document.body.innerHTML = `
            <div id="game-area"></div>
            <div id="player"></div>
            <div id="welcome-modal"></div>
            <div id="mobile-controls"></div>
        `;

        game = new Game();
    });

    test('should initialize with default state', () => {
        expect(game.state.isRunning).toBe(false);
        expect(game.state.isPaused).toBe(false);
        expect(game.state.score).toBe(0);
        expect(game.state.lives).toBe(3);
    });

    test('should start game with player name', () => {
        game.start('TestPlayer');
        
        expect(game.state.isRunning).toBe(true);
        expect(game.state.playerName).toBe('TestPlayer');
        expect(game.state.score).toBe(0);
        expect(game.state.lives).toBe(3);
    });

    test('should pause and resume game', () => {
        game.start('TestPlayer');
        
        game.pause();
        expect(game.state.isPaused).toBe(true);
        
        game.resume();
        expect(game.state.isPaused).toBe(false);
    });
});