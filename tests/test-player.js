// Player Tests
describe('Player', function () {
    let player;
    let mockGameArea;

    beforeEach(function () {
        mockGameArea = {
            style: { width: '800px', height: '600px' },
            getBoundingClientRect: function () {
                return { width: 800, height: 600, left: 0, top: 0 };
            }
        };

        const playerElement = {
            style: {},
            classList: {
                add: function () { },
                remove: function () { }
            }
        };

        player = new Player(mockGameArea);
        player.element = playerElement;
    });

    it('should initialize in center of game area', function () {
        player.initialize();
        const position = player.getPosition();
        expect(position.x).to.equal(380);
        expect(position.y).to.equal(280);
    });

    it('should move within bounds', function () {
        player.setPosition(100, 100);
        player.moveStep('up');
        expect(player.getPosition().y).to.equal(95);

        player.setPosition(100, player.borderBuffer);
        player.moveStep('up');
        expect(player.getPosition().y).to.equal(player.borderBuffer);
    });

    it('should update rotation when changing direction', function () {
        player.startMoving('up');
        expect(player.facing).to.equal('up');

        player.startMoving('left');
        expect(player.facing).to.equal('left');
    });

    it('should stop moving when requested', function () {
        player.startMoving('right');
        expect(player.isMoving).to.be.true;

        player.stopMoving();
        expect(player.isMoving).to.be.false;
        expect(player.moveDirection).to.be.null;
    });
});