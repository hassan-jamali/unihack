/* ═══════════════════════════════════════════
   state.js — Runtime game state
   Single source of truth for all live data.
   Only game.js should read/write this.
   Depends on: config.js
   ═══════════════════════════════════════════ */

const State = {
  bossIndex:       0,
  bossHp:          0,
  playerHp:        0,
  canAnswer:       false,
  currentQuestion: null,
  shuffledAnswers: [],
  questionPool:    [],
  poolIndex:       0,
  loadingTimer:    null,

  /** bosses being fought in this run (may be a subset if user chose one boss) */
  activeBosses: [],

  reset(bossList) {
    if (this.loadingTimer) clearInterval(this.loadingTimer);
    this.bossIndex       = 0;
    this.bossHp          = 0;
    this.playerHp        = Config.player.maxHp;
    this.canAnswer       = false;
    this.currentQuestion = null;
    this.shuffledAnswers = [];
    this.questionPool    = [];
    this.poolIndex       = 0;
    this.loadingTimer    = null;
    this.activeBosses    = bossList || [...Config.bosses];
  },

  get currentBoss() {
    return this.activeBosses[this.bossIndex];
  },

  get poolExhausted() {
    return this.poolIndex >= this.questionPool.length;
  },
};