/* enemies.js
   Spawn, update i logika neprijatelja, te boss sistemi
*/
console.log('enemies.js učitan');

const ALIEN_SIZE = 40;
let aliens = []; // svaki: {x,y,vx,vy,el,hp,type}
let bosses = []; // boss objekti

function spawnAliensByLevel(lvl) {
    // ukloni stare
    aliens.forEach(a => a.el.remove());
    aliens = [];

    // tablica: za prva 12 levela radimo termin po tvojem opisu (pojednostavljeno ali slijedi pattern)
    // Logika: za svakih 3 levela rotacija broja tipova i količina
    let pattern = [];
    if (lvl <= 12) {
        // za prvih 12: build skupova po tvom pravilu: 3 lvl1, zatim sljedeći nivoi povećavaju
        // implementiramo rastuću sekvencu: level n -> spawnCount = 3 + floor((n-1)/1)
        const base = 3;
        const count = Math.min(24, base + Math.floor((lvl - 1) * 1));
        for (let i = 0; i < count; i++) pattern.push(1); // svi tip1 do 12, za jednostavnost
    } else if (lvl === 13) {
        pattern = [1, 2, 3, 4];
    } else if (lvl === 14) {
        pattern = [1, 2, 3, 4, 1, 1];
    } else if (lvl === 15) {
        pattern = [1, 1, 1, 1, 2, 2];
    } else if (lvl >= 16 && lvl < 20) {
        pattern = Array(10).fill(3);
    } else {
        pattern = Array(12).fill(4);
    }

    // kreiraj svemirce iz patterna
    pattern.forEach(type => {
        const el = document.createElement('div');
        el.className = 'alien';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-shuttle-space';
        // boje po tipu
        const colors = { 1: 'Teal', 2: 'SlateGray', 3: 'SkyBlue', 4: 'DeepPink' };
        icon.style.color = colors[type] || 'Teal';
        icon.style.fontSize = '2em';
        el.appendChild(icon);
        const flame = document.createElement('div');
        flame.className = 'alien-flame';
        flame.style.background = `radial-gradient(circle, ${icon.style.color}, transparent)`;
        el.appendChild(flame);

        const x = Math.random() * (gameBounds.width - 80) + GAME_MARGIN;
        const y = Math.random() * (gameBounds.height - 80) + GAME_MARGIN;
        el.style.transform = `translate(${x}px, ${y}px)`;
        document.getElementById('game-area').appendChild(el);

        const speedMap = { 1: 1.5, 2: 2.0, 3: 2.6, 4: 3.2 };
        const speed = speedMap[type] || 1.5;
        const vx = (Math.random() * 2 - 1) * speed;
        const vy = (Math.random() * 2 - 1) * speed;
        const hpMap = { 1: 1, 2: 2, 3: 3, 4: 4 };
        aliens.push({ x, y, vx, vy, el, hp: hpMap[type] || 1, type });
    });

    return aliens;
}

function updateAliens() {
    aliens.forEach((a, i) => {
        a.x += a.vx;
        a.y += a.vy;
        // bounce
        if (a.x <= GAME_MARGIN || a.x >= gameBounds.width - GAME_MARGIN - ALIEN_SIZE) a.vx *= -1;
        if (a.y <= GAME_MARGIN || a.y >= gameBounds.height - GAME_MARGIN - ALIEN_SIZE) a.vy *= -1;
        a.el.style.transform = `translate(${a.x}px, ${a.y}px) rotate(${Math.atan2(a.vy, a.vx) * (180 / Math.PI)}deg)`;
    });
}

// spawn boss (tip 11,21,31,41) - jednostavna implementacija
function spawnBossForLevel(lvl) {
    // ako level odgovara boss nivoima, spawnaj
    const bossesAt = [11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131, 141, 151, 161, 170];
    if (!bossesAt.includes(lvl)) return null;

    // kreiraj boss element
    const el = document.createElement('div');
    el.className = 'boss';
    const icon = document.createElement('i');
    // boss ikone po tvom popisu
    let bossIcon = 'fa-solid fa-skull';
    if (lvl === 11) bossIcon = 'fa-solid fa-skull';
    if (lvl === 21) bossIcon = 'fa-brands fa-optin-monster';
    if (lvl === 31) bossIcon = 'fa-solid fa-robot';
    if (lvl === 41) bossIcon = 'fa-solid fa-biohazard';
    if (lvl === 170) bossIcon = 'fa-solid fa-spaghetti-monster-flying';
    icon.className = bossIcon;
    icon.style.fontSize = '4em';
    icon.style.color = 'Teal';
    el.appendChild(icon);
    document.getElementById('game-area').appendChild(el);

    // postavi na sredinu
    updateGameBounds();
    const x = Math.random() * (gameBounds.width - 200) + 100;
    const y = Math.random() * (gameBounds.height - 200) + 100;
    el.style.transform = `translate(${x}px, ${y}px)`;
    const hpMap = { 11: 10, 21: 20, 31: 30, 41: 40, 170: 500 };
    const hp = hpMap[lvl] || 20;
    const boss = { el, x, y, vx: (Math.random() * 2 - 1) * 1.5, vy: (Math.random() * 2 - 1) * 1.5, hp, lvl };
    bosses.push(boss);
    return boss;
}

function updateBosses(dt) {
    bosses.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        // granice
        if (b.x <= GAME_MARGIN || b.x >= gameBounds.width - GAME_MARGIN - 100) { b.vx *= -1; /* pri odbijanju ubrzaj na 3s */ }
        if (b.y <= GAME_MARGIN || b.y >= gameBounds.height - GAME_MARGIN - 100) { b.vy *= -1; }
        b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
    });
}

// uklanjanje neprijatelja
function removeAlien(index) {
    if (index < 0 || index >= aliens.length) return;
    const a = aliens[index];
    a.el.remove();
    aliens.splice(index, 1);
}

function damageAlien(index, amount) {
    if (index < 0 || index >= aliens.length) return;
    const a = aliens[index];
    a.hp -= amount;
    if (a.hp <= 0) {
        removeAlien(index);
        return true;
    }
    return false;
}

window.spawnAliensByLevel = spawnAliensByLevel;
window.updateAliens = updateAliens;
window.spawnBossForLevel = spawnBossForLevel;
window.updateBosses = updateBosses;
window.removeAlien = removeAlien;
window.damageAlien = damageAlien;
window.aliens = aliens;
window.bosses = bosses;
