// Collectables Manager Tests
describe('CollectablesManager', function () {
    let collectables;
    let mockGameArea;

    beforeEach(function () {
        // Mock game area
        mockGameArea = {
            children: [],
            appendChild: function (child) {
                this.children.push(child);
                child.parentNode = this;
            },
            removeChild: function (child) {
                const index = this.children.indexOf(child);
                if (index > -1) {
                    this.children.splice(index, 1);
                    child.parentNode = null;
                }
            },
            getBoundingClientRect: function () {
                return { width: 800, height: 600, left: 0, top: 0 };
            }
        };

        collectables = new CollectablesManager(mockGameArea);
    });

    it('should spawn star at specified position', function () {
        const starId = collectables.spawnStar(100, 100);
        expect(collectables.getRemainingCount()).to.equal(1);
        expect(collectables.collectables.has(starId)).to.be.true;
    });

    it('should remove collectable', function () {
        const starId = collectables.spawnStar(100, 100);
        const removed = collectables.removeCollectable(starId);

        expect(removed).to.be.true;
        expect(collectables.getRemainingCount()).to.equal(0);
    });

    it('should find safe position away from borders', function () {
        const safePos = collectables.getSafePosition(400, 300, []);

        expect(safePos.x).to.be.at.least(collectables.MIN_DISTANCE_FROM_BORDER);
        expect(safePos.x).to.be.at.most(800 - collectables.MIN_DISTANCE_FROM_BORDER);
        expect(safePos.y).to.be.at.least(collectables.MIN_DISTANCE_FROM_BORDER);
        expect(safePos.y).to.be.at.most(600 - collectables.MIN_DISTANCE_FROM_BORDER);
    });

    it('should detect collision with player', function () {
        collectables.spawnStar(100, 100);
        const collision = collectables.checkCollision(90, 90, 40);

        expect(collision).to.not.be.null;
        expect(collision.type).to.equal('star');
    });

    it('should not detect collision when player is far', function () {
        collectables.spawnStar(100, 100);
        const collision = collectables.checkCollision(300, 300, 40);

        expect(collision).to.be.null;
    });

    it('should clear all collectables', function () {
        collectables.spawnStar(100, 100);
        collectables.spawnStar(200, 200);

        collectables.clearAll();

        expect(collectables.getRemainingCount()).to.equal(0);
    });
});