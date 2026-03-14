/* ═══════════════════════════════════════════
   state.js — Runtime game state
   ═══════════════════════════════════════════ */

import { Config } from './config.js';
import { Player } from '../game/player.js';

export const State = {
  bossIndex:       0,
  bossHp:          0,
  playerHp:        0,
  maxPlayerHp:     100,
  canAnswer:       false,
  currentQuestion: null,
  shuffledAnswers: [],
  questionPool:    [],
  poolIndex:       0,
  loadingTimer:    null,
  activeBosses:    [],

  // Quest tracking (reset each run)
  runBossesDefeated:  0,
  runCorrectAnswers:  0,
  runWrongAnswers:    0,
  runNoDamage:        true,
  runPerfect:         true,
  shieldHp:           0,

  reset(bossList) {
    if (this.loadingTimer) clearInterval(this.loadingTimer);
    this.bossIndex         = 0;
    this.bossHp            = 0;
    this.canAnswer         = false;
    this.currentQuestion   = null;
    this.shuffledAnswers   = [];
    this.questionPool      = [];
    this.poolIndex         = 0;
    this.loadingTimer      = null;
    this.activeBosses      = bossList || [];
    this.runBossesDefeated = 0;
    this.runCorrectAnswers = 0;
    this.runWrongAnswers   = 0;
    this.runNoDamage       = true;
    this.runPerfect        = true;

    const boosts      = Player.getBoosts();
    this.maxPlayerHp  = Config.player.maxHp + boosts.hpBonus;
    this.playerHp     = this.maxPlayerHp;
    this.shieldHp     = boosts.shieldHp;
  },

  get currentBoss()  { return this.activeBosses[this.bossIndex]; },
  get poolExhausted(){ return this.poolIndex >= this.questionPool.length; },
};