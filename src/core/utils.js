/* ═══════════════════════════════════════════
   utils.js — Pure utility functions
   No dependencies. No side effects.
   ═══════════════════════════════════════════ */

// Player and UI are injected lazily to break circular dependency
let _Player, _UI;
export function _initCheats(player, ui) { _Player = player; _UI = ui; }

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function triggerAnim(el, cls, duration) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}

/* ════════════════════════════════════════
   DEV CHEATS — type in browser console
   ════════════════════════════════════════
   cheat.xp(500)        — give yourself XP
   cheat.coins(200)     — give yourself coins
   cheat.level(5)       — set level directly
   cheat.unlockShop()   — unlock the shop now
   cheat.unlockQuests() — unlock quests now
   cheat.unlockGameboy()— unlock gameboy now
   cheat.reset()        — wipe all player data
   ════════════════════════════════════════ */
export const cheat = {
  xp(amount = 100) {
    const r = _Player.awardXP(amount);
    _UI.updateHUD();
    console.log(`+${amount} XP → Level ${r.newLevel}${r.levelled ? ' (LEVEL UP!)' : ''}`);
  },
  coins(amount = 100) {
    _Player.awardCoins(amount);
    _UI.updateHUD();
    console.log(`+${amount} coins → Total: ${_Player.coins}`);
  },
  level(n) {
    _Player.data.level = n;
    _Player.data.xp    = _Player.xpForLevel(n);
    if (n >= 5) _Player.data.shopUnlocked = true;
    _Player.save();
    _UI.updateHUD();
    console.log(`Set to Level ${n}`);
  },
  unlockShop() {
    _Player.data.shopUnlocked = true;
    _Player.save();
    _UI.updateHUD();
    console.log('Shop unlocked!');
  },
  unlockGameboy() {
    _Player.data.gameboyUnlocked = true;
    _Player.save();
    _UI.updateHUD();
    console.log('Game Boy mode unlocked!');
  },
  unlockQuests() {
    _Player.data.questsUnlocked = true;
    _Player.save();
    _UI.updateHUD();
    console.log('Quests unlocked!');
  },
  reset() {
    localStorage.removeItem('brainBattle_player');
    _Player._data = null;
    _UI.updateHUD();
    console.log('Player data reset.');
  },
  unlockPomodoro() {
  _Player.data.pomodoroUnlocked = true;
  _Player.save();
  _UI.updateHUD();
  console.log('Pomodoro unlocked!');
  },
  status() {
    console.table({
      level:  _Player.level,
      xp:     _Player.xp,
      coins:  _Player.coins,
      shop:   _Player.shopUnlocked,
      quests: _Player.questsUnlocked,
      items:  _Player.data.inventory.join(', ') || 'none',
    });
  },
};