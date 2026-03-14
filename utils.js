/* ═══════════════════════════════════════════
   utils.js — Pure utility functions
   No dependencies. No side effects.
   ═══════════════════════════════════════════ */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function triggerAnim(el, cls, duration) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), duration);
}

/* ════════════════════════════════════════
   DEV CHEATS — type in browser console
   ════════════════════════════════════════
   cheat.xp(500)       — give yourself XP
   cheat.coins(200)    — give yourself coins
   cheat.level(5)      — set level directly
   cheat.unlockShop()  — unlock the shop now
   cheat.unlockQuests()— unlock quests now
   cheat.reset()       — wipe all player data
   ════════════════════════════════════════ */
const cheat = {
  xp(amount = 100) {
    const r = Player.awardXP(amount);
    UI.updateHUD();
    console.log(`+${amount} XP → Level ${r.newLevel}${r.levelled ? ' (LEVEL UP!)' : ''}`);
  },
  coins(amount = 100) {
    Player.awardCoins(amount);
    UI.updateHUD();
    console.log(`+${amount} coins → Total: ${Player.coins}`);
  },
  level(n) {
    Player.data.level = n;
    Player.data.xp    = Player.xpForLevel(n);
    if (n >= 5) Player.data.shopUnlocked = true;
    Player.save();
    UI.updateHUD();
    console.log(`Set to Level ${n}`);
  },
  unlockShop() {
    Player.data.shopUnlocked = true;
    Player.save();
    UI.updateHUD();
    console.log('Shop unlocked!');
  },
  unlockQuests() {
    Player.data.questsUnlocked = true;
    Player.save();
    UI.updateHUD();
    console.log('Quests unlocked!');
  },
  reset() {
    localStorage.removeItem('brainBattle_player');
    Player._data = null;
    UI.updateHUD();
    console.log('Player data reset.');
  },
  status() {
    console.table({
      level:  Player.level,
      xp:     Player.xp,
      coins:  Player.coins,
      shop:   Player.shopUnlocked,
      quests: Player.questsUnlocked,
      items:  Player.data.inventory.join(', ') || 'none',
    });
  },
};