/* ═══════════════════════════════════════════
   player.js — XP, levelling, currency, inventory
   Persists to localStorage. Read/write via Player.*
   ═══════════════════════════════════════════ */

const PLAYER_KEY = 'brainBattle_player';

const XP_PER_LEVEL = [0, 0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
// Level N requires XP_PER_LEVEL[N] total XP. Level 10 = max shown; scales beyond.

const Player = {

  // ── Persistence ───────────────────────────

  _data: null,

  get data() {
    if (!this._data) this._load();
    return this._data;
  },

  _load() {
    try {
      const raw = localStorage.getItem(PLAYER_KEY);
      if (raw) { this._data = JSON.parse(raw); return; }
    } catch(e) {}
    this._data = this._defaults();
  },

  _defaults() {
    return {
      xp:           0,
      level:        1,
      coins:        0,
      inventory:    [],   // array of item ids
      equippedItems:[],   // active boosts
      shopUnlocked: false,
      questsUnlocked: false,
      questProgress: {},  // questId → { completed, claimedAt }
    };
  },

  save() {
    try { localStorage.setItem(PLAYER_KEY, JSON.stringify(this._data)); } catch(e) {}
  },

  // ── XP & Levelling ────────────────────────

  get xp()    { return this.data.xp; },
  get level() { return this.data.level; },
  get coins() { return this.data.coins; },

  xpForLevel(n) {
    if (n <= 1) return 0;
    if (n < XP_PER_LEVEL.length) return XP_PER_LEVEL[n];
    return XP_PER_LEVEL[XP_PER_LEVEL.length - 1] + (n - XP_PER_LEVEL.length + 1) * 800;
  },

  xpForNextLevel() { return this.xpForLevel(this.level + 1); },

  xpProgress() {
    const current  = this.xpForLevel(this.level);
    const next     = this.xpForNextLevel();
    return { current: this.xp - current, needed: next - current };
  },

  /** Award XP, returns { levelled: bool, newLevel: n, coinsAwarded: n } */
  awardXP(amount) {
    this.data.xp += amount;
    let levelled = false;
    while (this.data.xp >= this.xpForNextLevel()) {
      this.data.level++;
      levelled = true;
      // Coin bonus on level-up
      const bonus = this.data.level * 10;
      this.data.coins += bonus;
      // Unlock shop at level 5
      if (this.data.level >= 5 && !this.data.shopUnlocked) {
        this.data.shopUnlocked = true;
      }
    }
    this.save();
    return { levelled, newLevel: this.data.level, coinsAwarded: levelled ? this.data.level * 10 : 0 };
  },

  awardCoins(n) {
    this.data.coins += n;
    this.save();
  },

  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.save();
    return true;
  },

  // ── Inventory ─────────────────────────────

  hasItem(id)   { return this.data.inventory.includes(id); },
  addItem(id)   { if (!this.hasItem(id)) this.data.inventory.push(id); this.save(); },
  removeItem(id){ this.data.inventory = this.data.inventory.filter(i => i !== id); this.save(); },

  isEquipped(id)  { return this.data.equippedItems.includes(id); },

  equip(id) {
    if (!this.hasItem(id) || this.isEquipped(id)) return;
    // Only one item of each category equipped at a time
    const item = Shop.getItem(id);
    if (!item) return;
    // Unequip others of same category
    this.data.equippedItems = this.data.equippedItems.filter(eid => {
      const ei = Shop.getItem(eid);
      return !ei || ei.category !== item.category;
    });
    this.data.equippedItems.push(id);
    this.save();
  },

  unequip(id) {
    this.data.equippedItems = this.data.equippedItems.filter(i => i !== id);
    this.save();
  },

  /** Get the combined stat multipliers from all equipped items */
  getBoosts() {
    const boosts = { hpBonus: 0, dmgMult: 1, xpMult: 1, coinMult: 1, shieldHp: 0 };
    for (const id of this.data.equippedItems) {
      const item = Shop.getItem(id);
      if (!item?.effect) continue;
      if (item.effect.hpBonus)   boosts.hpBonus   += item.effect.hpBonus;
      if (item.effect.dmgMult)   boosts.dmgMult   *= item.effect.dmgMult;
      if (item.effect.xpMult)    boosts.xpMult    *= item.effect.xpMult;
      if (item.effect.coinMult)  boosts.coinMult  *= item.effect.coinMult;
      if (item.effect.shieldHp)  boosts.shieldHp  += item.effect.shieldHp;
    }
    return boosts;
  },

  // ── Quests ────────────────────────────────

  get questsUnlocked() { return this.data.questsUnlocked; },
  set questsUnlocked(v) { this.data.questsUnlocked = v; this.save(); },

  get shopUnlocked() { return this.data.shopUnlocked; },

  getQuestProgress(id) { return this.data.questProgress[id] || { completed: false }; },

  completeQuest(id) {
    if (!this.data.questProgress[id]) this.data.questProgress[id] = {};
    this.data.questProgress[id].completed  = true;
    this.data.questProgress[id].claimedAt  = Date.now();
    this.save();
  },

  resetDailyQuests() {
    // Reset quests daily
    const now = Date.now();
    const DAY = 86400000;
    for (const id of Object.keys(this.data.questProgress)) {
      const p = this.data.questProgress[id];
      if (p.claimedAt && now - p.claimedAt > DAY) {
        delete this.data.questProgress[id];
      }
    }
    this.save();
  },
};