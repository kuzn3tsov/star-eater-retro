# Star Eater – Phase & File-Based Task Checklist

## Phase 1: Project Setup

### General Setup
- [x] Initialize project with Vite or Create React App
- [x] Install React, React-DOM
- [x] Optionally install Howler.js for audio
- [x] Create directory structure:
  - [x] `assets/graphics/`
  - [x] `assets/sounds/`
  - [x] `css/`
  - [x] `js/`
  - [x] `data/`
  - [x] `tests/`
  - [x] `index.html`
  - [x] `favicon.ico`

### Files
#### `game-engine.js`
- [ ] Set up main game loop
- [ ] Handle level transitions
- [ ] Manage game states (start, pause, end)

#### `storage.js`
- [ ] Implement LocalStorage for scores and config

#### `levels.js`
- [ ] Define level progression logic

---

## 🎮 Phase 2: Gameplay Systems

### Files
#### `player.js`
- [ ] WASD movement with acceleration
- [ ] Prevent edge crossing
- [ ] Visual glow effects for damage and power-ups
- [ ] Implement Q (Shield) and E (Ion Pulse) controls

#### `powerups.js`
- [ ] Set power-up durations and cooldowns
- [ ] Modify enemy AI states on activation

#### `ui.js`
- [ ] Display player score, level, lives
- [ ] Show active power-up icons

#### `modals.js`
- [ ] Create Intro modal for player name input

---

## 👾 Phase 3: Enemy & Boss AI

### Files
#### `enemies.js`
- [ ] Implement FSM: Wander, Engage, Evade
- [ ] Scale aggression, speed, spawn density by level

#### `bosses.js`
- [ ] Define boss phases and attack logic
- [ ] Spawn bombs every 5s with 3s duration
- [ ] Calculate HP scaling

#### `game-engine.js`
- [ ] Integrate targeting logic:
## 🧠 Phase 4: UI & HUD (SVG-Only)

### Files

#### `ui.js`
- [ ] Render top bar with:
  - [ ] `hud-top-rocket.svg`
  - [ ] `hud-top-star.svg`
  - [ ] `hud-top-highscore.svg`
- [ ] Render status icons:
  - [ ] `hud-player-score.svg`
  - [ ] `hud-player-level.svg`
  - [ ] `hud-player-life.svg`
  - [ ] Conditional: radar, shield, ion pulse, power mode, endless mode
- [ ] Render control buttons:
  - [ ] `hud-controls-play.svg`
  - [ ] `hud-controls-pause.svg`
  - [ ] `hud-controls-restart.svg`
  - [ ] `hud-controls-sound-on.svg`
  - [ ] `hud-controls-sound-off.svg`
  - [ ] `hud-controls-info.svg`

#### `modals.js`
- [ ] Create modals:
  - [ ] Info
  - [ ] High Score
  - [ ] Game Over
  - [ ] The End

---

## 🎨 Phase 5: Visual & Audio Design

### Files

#### `ui.js`
- [ ] Apply retro grid gradient background
- [ ] Add parallax stars and particles
- [ ] Implement screen shake effect
- [ ] Animate flame trail behind player
- [ ] Add radar ping visuals

#### `player.js`
- [ ] Trigger flame trail animation

#### `powerups.js`
- [ ] Visual effects on pickup

#### `bosses.js`
- [ ] Boss music variations

#### `audio.js` (if separate)
- [ ] Loop synthwave background music
- [ ] Add SFX for player, enemy, boss, UI

---

## 🧪 Phase 6: Testing & Optimization

### Files

#### `tests/unit/player.test.js`
- [ ] Test movement and collisions
- [ ] Test power-up timing

#### `tests/unit/ui.test.js`
- [ ] Test HUD updates

#### `tests/integration/game.test.js`
- [ ] Validate module interactions
- [ ] Test input compatibility
- [ ] Verify radar timing accuracy

#### `game-engine.js`
- [ ] Optimize for 60 FPS
- [ ] Ensure <0.5ms collision detection
- [ ] Implement object pooling
- [ ] Use `requestAnimationFrame` loop

---

## 🌌 Phase 7: Expansion & Polish

### Files

#### `levels.js`
- [ ] Unlock Endless Mode after Level 75
- [ ] Implement exponential difficulty scaling

#### `modals.js`
- [ ] Add cinematic sequence for The End

#### `features.js` (optional)
- [ ] Plan:
  - [ ] 2-Player Co-op
  - [ ] Online Leaderboards
  - [ ] Daily Challenges
  - [ ] Custom Skins
  - [ ] Boss Rush Mode
  - [ ] Adaptive Music

