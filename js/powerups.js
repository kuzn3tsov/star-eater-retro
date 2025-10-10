/* powerups.js
   Spawn pravila za powerupove i aktivacije
*/
console.log('powerups.js učitan');

let collectibles = []; // svaki: {x,y,el,type}
let bluePowerDuration = 15000; // 15s u ms
let greenFreezeDuration = 2000; // 2s

function spawnPowerups(level) {
    // ukloni stare
    collectibles.forEach(c => c.el.remove());
    collectibles = [];

    // 10 žutih uvijek
    for (let i = 0; i < 10; i++) spawnItem('yellow');

    // zelene 1-3
    const gcount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < gcount; i++) spawnItem('green');

    // heart (rocket) od lvl5 svaka 3 levela
    if (level >= 5 && ((level - 5) % 3 === 0)) spawnItem('heart');

    // plava: prvi na 10 pa svakih 5 levela
    if (level >= 10 && ((level - 10) % 5 === 0)) spawnItem('blue');

    // ljubičasta: prvi na 15 pa svakih 10 levela
    if (level >= 15 && ((level - 15) % 10 === 0)) spawnItem('purple');

    // bijela bomba: samo na boss levelima (spawnBossForLevel će također biti pozvana)
    if ([11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131, 141, 151, 161, 170].includes(level)) {
        // spawn bijele bombe svake 10s - ali ovdje samo inicijalno jedan objekt
        spawnItem('whiteBomb', true);
    }

    return collectibles;
}

function spawnItem(type, sticky = false) {
    const el = document.createElement('div');
    el.className = 'collectible ' + type;
    const icon = document.createElement('i');
    let cls = 'fa-solid fa-star';
    let color = 'goldenrod';
    switch (type) {
        case 'yellow': cls = 'fa-solid fa-star'; color = 'goldenrod'; break;
        case 'green': cls = 'fa-solid fa-star'; color = 'DarkSeaGreen'; break;
        case 'blue': cls = 'fa-solid fa-star'; color = 'CornflowerBlue'; break;
        case 'purple': cls = 'fa-solid fa-star'; color = 'BlueViolet'; break;
        case 'heart': cls = 'fa-solid fa-rocket'; color = 'darkred'; break;
        case 'whiteBomb': cls = 'fa-solid fa-bomb'; color = 'white'; break;
    }
    icon.className = cls;
    icon.style.color = color;
    el.appendChild(icon);

    // pozicija
    const x = Math.random() * (gameBounds.width - 60) + GAME_MARGIN;
    const y = Math.random() * (gameBounds.height - 60) + GAME_MARGIN;
    el.style.transform = `translate(${x}px, ${y}px)`;
    document.getElementById('game-area').appendChild(el);

    collectibles.push({ x, y, el, type, sticky });
    return el;
}

function activatePower(type) {
    if (type === 'green') {
        // freeze enemies na 2s
        window.aliensFrozen = true;
        setTimeout(() => { window.aliensFrozen = false; }, greenFreezeDuration);
    } else if (type === 'blue') {
        // give player permanent kill power for duration
        playerState.powerTimeLeft = bluePowerDuration;
        // HUD će čitati playerState.powerTimeLeft
    } else if (type === 'purple') {
        // teleport all enemies offscreen (move to next level)
        window.aliens.forEach(a => a.el.remove());
        window.aliens.length = 0;
    } else if (type === 'heart') {
        playerState.lives++;
        updateHUD();
    } else if (type === 'whiteBomb') {
        // used only on boss levels: damage boss by 1 when collected
        const boss = (window.bosses && window.bosses[0]) ? window.bosses[0] : null;
        if (boss) { boss.hp = Math.max(0, boss.hp - 1); if (boss.hp === 0) { boss.el.remove(); window.bosses.shift(); } }
    }
}

function checkCollectibleCollision(px, py) {
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        const dx = px - c.x;
        const dy = py - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 36) {
            // preuzmi
            c.el.remove();
            collectibles.splice(i, 1);
            activatePower(c.type);
            // bodovi za zute i plave i purple effects
            if (c.type === 'yellow') { playerState.score += 2; } // žute daju 2 po tvojoj izmjeni
            if (c.type === 'blue') { /* plavi daje snagu i kasnije +5 po ubijenom */ }
            if (c.type === 'purple') { /* eksplozivno brise aliene, dodaj bodove po uništenom 1 */ }
            updateHUD();
        }
    }
}

window.spawnPowerups = spawnPowerups;
window.checkCollectibleCollision = checkCollectibleCollision;
window.collectibles = collectibles;
window.activatePower = activatePower;
