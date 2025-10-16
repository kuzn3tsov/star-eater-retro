# star-eater-retro
Top-down arcade game in retro 80's style

# STAR EATER - GAME DESIGN DOCUMENT
**Version 2.1**

**Author:** Lem Treursić  
**Contact:** lem.treursic@gmail.com  
**Date:** [Current Date]

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Technology and Assets](#2-technology-and-assets)
3. [HUD (Heads-Up Display)](#3-hud-heads-up-display)
4. [Visual and Audio Design](#4-visual-and-audio-design)
5. [Modals](#5-modals)
6. [Player](#6-player)
7. [Collectibles and Power-ups](#7-collectibles-and-power-ups)
8. [Enemies](#8-enemies)
9. [Level and Enemy Spawn Logic](#9-level-and-enemy-spawn-logic)
10. [Testing and Quality Assurance](#10-testing-and-quality-assurance)
11. [Future Expansion](#11-future-expansion)

---

## 1. OVERVIEW

**Star Eater** is a retro-style arcade space survival and collection game. The player controls a small spaceship inside a closed arena, collecting stars and avoiding or defeating alien enemies.

Gameplay features progressive difficulty with structured enemy introduction, dynamic levels, collectible power-ups, and unique boss battles with phase-based mechanics.

**Design Philosophy:** Retro-futuristic - 80s arcade inspiration with modern smooth animations, Font Awesome icons, and neon gradients.

---

## 2. TECHNOLOGY AND ASSETS

### Core Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML, CSS, React.js |
| **Font** | Press Start 2P by CodeMan38 |
| **Icons** | Font Awesome 6.6.0 |
| **Audio** | Synthwave loops & SFX |
| **Data Storage** | Local Storage, JSON files |

### Project Structure

- **./**
  - `index.html`
  - `favicon.ico`
- **./css/**
  - `main.css`
  - `game.css`
  - `ui.css`
- **./js/**
  - `game-engine.js`
  - `player.js`
  - `enemies.js`
  - `powerups.js`
- **./data/**
  - `levels.json`
  - `high-scores.json`
  - `config.json`
- **./tests/**
  - `test-suite.html`
  - `test-suite.css`
  - `test-suite.js`
  - `unit-test-*.js`
  - `integration-test-*.js`

## 3. HUD (HEADS-UP DISPLAY)

### Layout Structure

**First Row:**
- **Left:** "Star Eater" (Game Title)
- **Right:** High Score Display (`fa-trophy` + value + player name)  
  *Click to show top 10 scores modal*

**Second Row - Dynamic Status & Controls:**

| Left Status Area | Right Control Area |
|------------------|-------------------|
| • Player Name | • Play/Pause (`fa-play`/`fa-pause`) |
| • Score (`fa-star`) | • Restart (`fa-repeat`) |
| • Level (`fa-earth-americas`) | • Sound Toggle (`fa-volume-high`/`fa-volume-off`) |
| • Lives (`fa-shuttle-space`) | • Info (`fa-circle-info`) |
| • Radar (`fa-location-crosshairs`)* | |
| • Blue Power (`fa-bolt`)* | |
| • Shield (`fa-shield`)* | |
| • Ion Pulse (`fa-bullseye`)* | |
| • Endless Mode (`fa-infinity`)* | |

> *Note: * indicates conditional visibility*  
> **Radar:** Visible only after unlocking. Shows automatic bomb detection on boss levels.

---

## 4. VISUAL AND AUDIO DESIGN

### Visual Style

| Element | Specification |
|---------|---------------|
| **Background** | Retro grid space (#071018 → #0b0f14 gradient) |
| **UI Glow** | Neon borders with #0ff glow effect |
| **Primary Font** | 'Press Start 2P' |
| **Color Palette** | Primary: Cyan (#0ff)<br>Accent: Gold (#daa520)<br>Enemies: Teal, SlateGray, SkyBlue, DeepPink |

### Audio Design

| Type | Description |
|------|-------------|
| **Background Music** | Looping synthwave track |
| **Sound Effects** | Explosions, lasers, power-ups, UI interactions, radar pings |
| **Boss Music** | Intensified variations of main theme |

### Visual Effects
- Parallax starfield background
- Particle systems for collections/explosions
- Player glow effects (color-coded to power-ups)
- Screen shake on player damage
- Animated rocket flame trail
- **Radar ping animation** (concentric circles at bomb spawn locations)

---

## 5. MODALS

| Modal Type | Trigger | Purpose | Key Content |
|------------|---------|---------|-------------|
| **Intro Modal** | Game load | Welcome & setup | Player name input, Start button |
| **High Score** | Click trophy | Display rankings | Top 10 scores table |
| **Rules** | Info button | Instructions | Controls, power-ups, objectives, ability descriptions |
| **Game Over** | Player death | Failure state | Final score, Restart option |
| **The End** | Mega Boss defeat | Victory cinematic | Score, Endless Mode unlock |

---

## 6. PLAYER

### Visual Representation

| Attribute | Specification |
|-----------|---------------|
| **Icon** | `fa-shuttle-space` |
| **Color** | Goldenrod |
| **Size** | 48x48px |
| **Movement** | Smooth acceleration/deceleration |

### Controls

| Key | Action |
|-----|--------|
| **WASD** | Move ship |
| **Q** | Activate Shield |
| **E** | Activate Ion Pulse |

### Visual Feedback States

| State | Visual Effect |
|-------|--------------|
| **Normal** | Standard goldenrod color |
| **Damage** | Shake + red glow (1s) |
| **Blue Power** | Blue glow |
| **Shield Active** | Green glow |
| **Ion Pulse** | White flash + expanding circle |
| **Radar Ping** | Concentric circles at bomb locations |

---

## 7. COLLECTIBLES AND POWER-UPS

### Star Types

| Star Type | Icon | Color | Behavior | Points | Spawn Condition |
|-----------|------|-------|----------|---------|-----------------|
| **Yellow** | `fa-star` | Goldenrod | Basic collectible | +2 | 10 per level |
| **Green** | `fa-star` | DarkSeaGreen | Freeze enemies 3s | +1 | After L4 (1-2/level) |
| **Blue** | `fa-star` | CornflowerBlue | Power Mode 10s | +5/enemy | After L6, every 5 levels |
| **Purple** | `fa-star` | DarkOrchid | Destroy all enemies | +5/enemy | Random after 5 stars |

### Special Collectibles

| Item | Icon | Color | Behavior | Spawn |
|------|------|-------|----------|-------|
| **Red Rocket** | `fa-shuttle-space` | DarkRed | +1 Life | After L13, every 3 levels |
| **Bomb** | `fa-bomb` | White | Boss damage +1 | Boss levels only |

### Boss Rewards (Unlocked Abilities)

| Ability | Activation | Effect | Source | Upgrade with Extended Power |
|---------|------------|--------|--------|----------------------------|
| **Radar** | **Automatic** | **Shows ping 3 seconds before bombs spawn on boss levels** | Boss 1 | **5 seconds warning** before bomb spawn |
| **Shield** | Press Q | Protect 10s + enemy knockback | Boss 2 | 15s duration |
| **Ion Pulse** | Press E | Wave attack, 10 boss damage, 25s cooldown | Boss 3 | 20s cooldown |
| **Extended Power** | Passive | Improves all previous abilities | Boss 4 | - |

---

## 8. ENEMIES

### Enemy Categories & Progression

| Category | Levels | Types | Behavior |
|----------|---------|-------|----------|
| **Rammers** | 1-14 | 1-4 | Direct contact damage |
| **Shooters** | 15-29 | 5-8 | Projectile attacks |
| **Beam Shooters** | 30-44 | 9-12 | Fast laser beams |
| **Destroyers** | 45-59 | 13-16 | Mixed attacks |

### Enemy Type Specifications

| Type | Icon | Color | Attack Speed | Special Behavior |
|------|------|-------|-------------|------------------|
| 1,5,9,13 | `fa-plane`/`fa-jet-fighter`/`fa-space-awesome`/`fa-rocket` | Teal | 15s | Slow, random movements |
| 2,6,10,14 | [same progression] | SlateGray | 12s | Speed alternates |
| 3,7,11,15 | [same progression] | SkyBlue | 9s | Aggressive movement |
| 4,8,12,16 | [same progression] | DeepPink | 5s | Tracks player |

### Boss Specifications

| Boss | Icon | Color | HP | Reward | Key Attacks |
|------|------|-------|----|--------|-------------|
| **Meteor Commander** | `fa-mosquito` | Teal | 20 | **Radar** | Mini-meteors |
| **Skull Reaper** | `fa-skull` | SlateGray | 50 | Shield | Spread meteors |
| **The Machine** | `fa-robot` | SkyBlue | 100 | Ion Pulse | Rotating lasers |
| **Biohazard Titan** | `fa-biohazard` | DeepPink | 200 | Extended Power | Enemy summons |
| **Cosmic Horror** | `fa-spaghetti-monster-flying` | Cycling | 500 | Endless Mode | All combined |

> *All bosses feature 3-phase combat based on HP thresholds*

### Boss Fighting Logic
- **Radar functionality:** Automatically activates on all boss levels after unlocking
- **Bomb spawns:** 3 bombs spawn simultaneously every 5 seconds at random positions
- **Radar warning:** Visual ping appears 3 seconds (5s with upgrade) before bomb spawns
- **Bomb collection:** Player collects bombs to damage boss (+1 damage per bomb)
- **Bomb duration:** Bombs remain on screen for 3 seconds before fading out

---

## 9. LEVEL AND ENEMY SPAWN LOGIC

### Level Progression Table

| Level Range | Enemy Types | Count Progression | Boss | Notes |
|-------------|-------------|-------------------|------|-------|
| **1-14** | Rammers (1-4) | 3,6,10,3,6,10,3,4,6,10,3,4,6,10 | - | Learn avoidance |
| **15** | - | - | **Boss 1** | **Radar unlock** |
| **16-29** | Shooters (5-8) | 3,6,10,3,6,10,3,4,6,10,3,4,6,10 | - | Projectile patterns |
| **30** | - | - | Boss 2 | Shield unlock |
| **31-44** | Beam Shooters (9-12) | 3,6,10,3,6,10,3,4,6,10,3,4,6,10 | - | Fast beam attacks |
| **45** | - | - | Boss 3 | Ion Pulse unlock |
| **46-59** | Destroyers (13-16) | 3,6,10,3,6,10,3,4,6,10,3,4,6,10 | - | Mixed elite enemies |
| **60** | - | - | Boss 4 | Extended Power |
| **61-74** | Mixed (5-16) | Increasing difficulty | - | High-tier focus |
| **75** | - | - | Mega Boss | Endless Mode unlock |
| **76+** | All types | Exponential increase | Random | Endless Mode |

> **Note:** Radar is automatically active on all boss levels (15, 30, 45, 60, 75) once unlocked.

---

## 10. TESTING AND QUALITY ASSURANCE

### Test Categories

| Test Type | Location | Coverage |
|-----------|----------|----------|
| **Unit Tests** | `./tests/unit-test-*.js` | Player, enemies, power-ups, bosses, radar system |
| **Integration Tests** | `./tests/integration-test-*.js` | Collisions, game states, radar timing, bomb spawns |
| **Test Suite** | `test-suite.html` | Visual test runner |

### Radar-Specific Tests
- **Timing accuracy:** Radar pings appear exactly 3 seconds before bomb spawns
- **Visual feedback:** Ping animations are clear and visible
- **Upgrade functionality:** Extended Power increases warning to 5 seconds
- **Boss level activation:** Radar only active on appropriate levels

### Performance Targets
- **Frame Rate:** Consistent 60 FPS
- **DOM Optimization:** Minimal reflows
- **Memory:** Efficient object pooling
- **Loop Optimization:** `requestAnimationFrame` based
- **Radar Performance:** Smooth ping animations without frame drops

---

## 11. FUTURE EXPANSION

### Planned Features

| Priority | Feature | Description |
|----------|---------|-------------|
| **High** | 2-Player Co-op | Shared arena gameplay |
| **High** | Custom Skins | Unlockable ship appearances |
| **Medium** | Daily Challenges | Timed mode with modifiers |
| **Medium** | Online Leaderboards | JSON-based global scores |

### Nice-to-Have Ideas
- **Boss Rush Mode** - Consecutive boss battles
- **Power-up Combos** - Special combined effects
- **Environmental Hazards** - Asteroids, black holes
- **Adaptive Music** - Dynamic intensity based on gameplay
- **Radar Upgrades** - Additional functionality in endless mode

---

## DOCUMENT REVISION HISTORY

- **v2.1** (Current): Corrected Radar to automatic bomb detection system
- **v2.0**: Major rebalancing, category-based enemy introduction, phased boss fights  
- **v1.0**: Initial Game Design Document creation

## KEY RADAR SYSTEM CLARIFICATIONS

- Radar is a **passive, automatic ability** that activates on all boss levels once unlocked
- Provides **visual pings 3 seconds before bombs spawn** (5 seconds with Extended Power upgrade)
- No player activation required - it's always active during boss fights
- Essential for strategic bomb collection and boss damage optimization

---

**STAR EATER GAME DESIGN DOCUMENT v2.1**  
*Designed by Lem Treursić | lem.treursic@gmail.com*
