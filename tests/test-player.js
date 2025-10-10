// Player Tests
describe('Player', () => {
    let gameArea, player;

    beforeEach(() => {
        // Create mock game area
        gameArea = document.createElement('div');
        gameArea.style.width = '800px';
        gameArea.style.height = '600px';
        document.body.appendChild(gameArea);

        // Create player element
        const playerElement = document.createElement('div');
        playerElement.id = 'player';
        gameArea.appendChild(playerElement);

        player = new Player(gameArea);
    });

    afterEach(() => {
        document.body.removeChild(gameArea);
    });

    test('should initialize in center of game area', () => {
        const position = player.getPosition();
        expect(position.x).toBe(385); // (800 - 30) / 2
        expect(position.y).toBe(285); // (600 - 30) / 2
    });

    test('should move up within bounds', () => {
        player.setPosition(100, 100);
        player.move('up');
        expect(player.getPosition().y).toBe(95);
        
        player.setPosition(100, 0);
        player.move('up');
        expect(player.getPosition().y).toBe(0);
    });

    test('should move down within bounds', () => {
        player.setPosition(100, 100);
        player.move('down');
        expect(player.getPosition().y).toBe(105);
        
        player.setPosition(100, 570); // 600 - 30 = 570
        player.move('down');
        expect(player.getPosition().y).toBe(570);
    });

    test('should set position within bounds', () => {
        player.setPosition(-100, -100);
        expect(player.getPosition().x).toBe(0);
        expect(player.getPosition().y).toBe(0);
        
        player.setPosition(1000, 1000);
        expect(player.getPosition().x).toBe(770); // 800 - 30
        expect(player.getPosition().y).toBe(570); // 600 - 30
    });
});