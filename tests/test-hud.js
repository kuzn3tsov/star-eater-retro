// HUD Manager Tests
describe('HUDManager', () => {
    let storage, hud;

    beforeEach(() => {
        storage = new StorageManager();
        localStorage.clear();
        
        // Create minimal DOM for HUD
        document.body.innerHTML = `
            <div id="player-name-display"></div>
            <div id="highscore-display"></div>
            <div id="score-display"></div>
            <div id="lives-display"></div>
        `;

        hud = new HUDManager(storage);
    });

    test('should update HUD with provided data', () => {
        hud.updateHUD({
            playerName: 'TestPlayer',
            highscore: 1000,
            score: 500,
            lives: 3
        });

        expect(document.getElementById('player-name-display').textContent).toBe('TestPlayer');
        expect(document.getElementById('highscore-display').textContent).toBe('1000');
        expect(document.getElementById('score-display').textContent).toBe('500');
        expect(document.getElementById('lives-display').textContent).toBe('3');
    });

    test('should update score individually', () => {
        hud.updateScore(250);
        expect(document.getElementById('score-display').textContent).toBe('250');
    });

    test('should update lives individually', () => {
        hud.updateLives(2);
        expect(document.getElementById('lives-display').textContent).toBe('2');
    });
});