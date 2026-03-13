/* ═══════════════════════════════════════════
   state.js — Runtime game state
   Single source of truth for all live data.
   Only game.js should read/write this.
   Depends on: config.js
   ═══════════════════════════════════════════ */

const State = {

  bossIndex:        0,
  bossHp:           0,
  playerHp:         0,
  canAnswer:        false,
  currentQuestion:  null,   // { q, a, w: string[] }
  shuffledAnswers:  [],
  questionPool:     [],     // current batch of AI-generated questions
  poolIndex:        0,      // index of next question to use from pool
  loadingTimer:     null,   // setInterval ref for the loading dots

  /** Reset everything back to a clean slate for a new game */
  reset() {
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
  },

  /** The boss currently being fought */
  get currentBoss() {
    return Config.bosses[this.bossIndex];
  },

  /** True when all questions in the pool have been used */
  get poolExhausted() {
    return this.poolIndex >= this.questionPool.length;
  },
};
