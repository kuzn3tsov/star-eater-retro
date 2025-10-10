// Mock localStorage for testing
class LocalStorageMock {
    constructor() {
        this.store = {};
    }

    clear() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = String(value);
    }

    removeItem(key) {
        delete this.store[key];
    }
}

global.localStorage = new LocalStorageMock();

// Storage Manager Tests
describe('StorageManager', () => {
    let storage;

    beforeEach(() => {
        storage = new StorageManager();
        localStorage.clear();
    });

    test('should set and get item', () => {
        storage.setItem('test', 'value');
        expect(storage.getItem('test')).toBe('value');
    });

    test('should return default value for non-existent item', () => {
        expect(storage.getItem('nonexistent', 'default')).toBe('default');
    });

    test('should remove item', () => {
        storage.setItem('test', 'value');
        storage.removeItem('test');
        expect(storage.getItem('test')).toBeNull();
    });

    test('should save and get player name', () => {
        storage.savePlayerName('TestPlayer');
        expect(storage.getPlayerName()).toBe('TestPlayer');
    });

    test('should save highscore only when higher', () => {
        storage.saveHighscore(100);
        expect(storage.getHighscore()).toBe(100);
        
        storage.saveHighscore(50);
        expect(storage.getHighscore()).toBe(100);
        
        storage.saveHighscore(150);
        expect(storage.getHighscore()).toBe(150);
    });
});