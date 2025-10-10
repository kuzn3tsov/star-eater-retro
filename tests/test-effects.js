// Effects Manager Tests
describe('EffectsManager', function () {
    let effects;
    let mockGameArea;

    beforeEach(function () {
        mockGameArea = {
            children: [],
            appendChild: function (child) {
                this.children.push(child);
            },
            classList: {
                add: function () { },
                remove: function () { }
            }
        };

        effects = new EffectsManager(mockGameArea);
    });

    it('should create explosion element', function () {
        effects.createExplosion(100, 100);
        expect(mockGameArea.children.length).to.equal(1);
    });

    it('should initialize audio context', function () {
        // Mock Web Audio API
        const originalAudioContext = window.AudioContext;
        window.AudioContext = function () {
            return {
                createOscillator: function () {
                    return {
                        connect: function () { },
                        frequency: { value: 0 },
                        type: '',
                        start: function () { },
                        stop: function () { }
                    };
                },
                createGain: function () {
                    return {
                        connect: function () { },
                        gain: {
                            setValueAtTime: function () { },
                            exponentialRampToValueAtTime: function () { }
                        }
                    };
                },
                destination: {},
                currentTime: 0
            };
        };

        effects.initializeSounds();
        expect(effects.audioContext).to.exist;

        // Restore original
        window.AudioContext = originalAudioContext;
    });

    it('should stop all sounds', function () {
        let suspendCalled = false;
        effects.audioContext = {
            suspend: function () {
                suspendCalled = true;
            }
        };

        effects.stopAllSounds();
        expect(suspendCalled).to.be.true;
    });
});