// Game Logic Tests
describe('Game', function () {
    let game;

    beforeEach(function () {
        // Mock dependencies
        const mockStorage = {
            getPlayerName: function () { return 'TestPlayer'; },
            savePlayerName: function () { },
            getHighscore: function () { return { score: 0 }; },
            saveHighscore: function () { }
        };

        const mockUI = {
            showModal: function () { },
            hideModal: function () { },
            showMobileControls: function () { },
            hideMobileControls: function () { },
            updateElement: function () { }
        };

        const mockHUD = {
            updateHUD: function () { },
            updateScore: function () { },
            updateLevel: function () { },
            updateHighscore: function () { },
            setPausedState: function () { }
        };

        game = new Game();
        game.storage = mockStorage;
        game.ui = mockUI;
        game.hud = mockHUD;
        game.state.isRunning = true;
    });

    it('should start game with player name', function () {
        game.start('TestPlayer');

        expect(game.state.isRunning).to.be.true;
        expect(game.state.playerName).to.equal('TestPlayer');
        expect(game.state.score).to.equal(0);
        expect(game.state.lives).to.equal(3);
        expect(game.state.level).to.equal(1);
    });

    it('should pause and resume game', function () {
        game.start('TestPlayer');

        game.pause();
        expect(game.state.isPaused).to.be.true;

        game.resume();
        expect(game.state.isPaused).to.be.false;
    });

    it('should complete level when all stars collected', function () {
        game.start('TestPlayer');
        const initialLevel = game.state.level;

        // Mock collectables manager
        game.collectables = {
            getRemainingCount: function () { return 0; },
            clearAll: function () { },
            spawnRandomStars: function () { }
        };

        game.completeLevel();

        expect(game.state.level).to.equal(initialLevel + 1);
    });

    it('should handle border collision', function () {
        game.start('TestPlayer');

        let bounceSoundCalled = false;
        let borderFlashCalled = false;

        game.effects = {
            playBorderBounceSound: function () {
                bounceSoundCalled = true;
            },
            flashBorder: function () {
                borderFlashCalled = true;
            }
        };

        game.handleBorderCollision();

        expect(bounceSoundCalled).to.be.true;
        expect(borderFlashCalled).to.be.true;
    });
});