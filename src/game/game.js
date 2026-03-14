import { Config, _saveConfig } from '../core/config.js';
import { State } from '../core/state.js';
import { Player } from './player.js';
import { UI } from '../ui/ui.js';
import { AI } from '../ai/ai.js';
import { Presets } from './presets.js';
import { Shop } from '../ui/shop.js';
import { sleep, triggerAnim, cheat, shuffle } from '../core/utils.js';

window.startGame = startGame;
window.restartGame = restartGame;
window.selectAnswer = selectAnswer;
window.cheat = cheat;

/* ═══════════════════════════════════════════
   game.js — Core game logic
   ═══════════════════════════════════════════ */

const Game = {

  start() {
    const bosses = UI.getSelectedBosses();
    if (!bosses.length) { alert('No bosses selected!'); return; }
    State.reset(bosses);
    UI.showBattleScreen();
    UI.updateHUD();
    this._startBoss();
  },

  restart() {
    UI.hideOverlay();
    UI.resetBossFaint();
    const bosses = UI.getSelectedBosses();
    if (!bosses.length) { UI.showScreen('title-screen'); return; }
    State.reset(bosses);
    UI.updateHUD();
    this._startBoss();
  },

  // ── Boss lifecycle ─────────────────────────

  async _startBoss() {
    const boss      = State.currentBoss;
    State.bossHp    = boss.maxHp;
    State.canAnswer = false;
    State.poolIndex = 0;
    State.runNoDamage = true;  // reset per-boss no-damage tracker
    UI.hideAnswers();

    UI.setArenaOverlay(boss.typeBg || 'rgba(100,100,200,0.15)');
    UI.setBossHUD(boss);
    UI.setHpBar('bossHpFill',   'bossHpNumbers',   boss.maxHp,     boss.maxHp);
    UI.setHpBar('playerHpFill', 'playerHpNumbers', State.playerHp, State.maxPlayerHp);
    UI.updateProgressDots(State.bossIndex, State.activeBosses.length);

    const bossEl = UI.setBossSprite(boss);
    UI.animateBossEntry(bossEl);
    await UI.typewrite(boss.intro || `${boss.name} appears!`);
    await sleep(1400);

    State.questionPool = await AI.fetchQuestions(boss);
    if (!State.questionPool || State.questionPool.length === 0) {
      await UI.typewrite('No questions found!\nAdd some in the editor first.');
      return;
    }
    this._askQuestion();
  },

  // ── Question flow ─────────────────────────

  async _askQuestion() {
    if (State.poolExhausted) {
      State.questionPool = await AI.fetchQuestions(State.currentBoss);
      State.poolIndex    = 0;
    }
    const q               = State.questionPool[State.poolIndex++];
    State.currentQuestion = q;
    State.shuffledAnswers = shuffle([q.a, ...q.w]);
    await UI.typewrite(q.q, 22);
    UI.showAnswers(State.shuffledAnswers);
    State.canAnswer = true;
  },

  // ── Answer resolution ─────────────────────

  async resolveAnswer(idx) {
    if (!State.canAnswer) return;
    State.canAnswer = false;
    UI.disableAnswers();

    const chosen  = State.shuffledAnswers[idx];
    const correct = State.currentQuestion.a;
    if (chosen === correct) await this._handleCorrect(idx);
    else                    await this._handleWrong(idx, correct);
  },

  async _handleCorrect(idx) {
    UI.markAnswerCorrect(idx);
    await sleep(300);

    State.runCorrectAnswers++;
    const boss    = State.currentBoss;
    const boosts  = Player.getBoosts();
    const dmg     = Math.round(boss.dmgTaken * boosts.dmgMult);
    State.bossHp  = Math.max(0, State.bossHp - dmg);

    // Coin reward per correct answer
    const coinGain = Math.round(5 * boosts.coinMult);
    Player.awardCoins(coinGain);

    await UI.typewrite(`✓ Correct! +${coinGain}🪙\n${boss.name} took ${dmg} damage!`);
    UI.animateBossHit();
    UI.animateHpBar('bossHpFill', 'bossHpNumbers', State.bossHp, boss.maxHp);
    UI.updateHUD();

    await sleep(1600);

    if (State.bossHp <= 0) await this._bossFainted();
    else { UI.hideAnswers(); this._askQuestion(); }
  },

  async _handleWrong(idx, correct) {
    UI.markAnswerWrong(idx);
    UI.revealCorrectAnswer(State.shuffledAnswers, correct);
    await sleep(300);

    State.runWrongAnswers++;
    State.runNoDamage = false;
    State.runPerfect  = false;

    const boss   = State.currentBoss;
    let dmgTaken = boss.dmgDealt;

    // Shield absorbs damage first
    if (State.shieldHp > 0) {
      const absorbed = Math.min(State.shieldHp, dmgTaken);
      State.shieldHp -= absorbed;
      dmgTaken       -= absorbed;
      if (absorbed > 0) {
        await UI.typewrite(`✗ Wrong! Shield absorbed ${absorbed}!\nAnswer: ${correct}`);
        UI.animateHpBar('playerHpFill', 'playerHpNumbers', State.playerHp, State.maxPlayerHp);
        await sleep(2000);
        if (State.playerHp <= 0) await this._playerFainted();
        else { UI.hideAnswers(); this._askQuestion(); }
        return;
      }
    }

    State.playerHp = Math.max(0, State.playerHp - dmgTaken);
    await UI.typewrite(`✗ Wrong!\nAnswer: ${correct}\nYou took ${dmgTaken} damage!`);
    UI.animatePlayerHit();
    UI.animateHpBar('playerHpFill', 'playerHpNumbers', State.playerHp, State.maxPlayerHp);
    UI.updateHUD();

    await sleep(2000);

    if (State.playerHp <= 0) await this._playerFainted();
    else { UI.hideAnswers(); this._askQuestion(); }
  },

  // ── Win / Lose ────────────────────────────

  async _bossFainted() {
    UI.hideAnswers();
    UI.animateBossFaint();
    await sleep(300);
    await UI.typewrite(State.currentBoss.defeat || `${State.currentBoss.name} fainted!`);

    State.runBossesDefeated++;

    // XP reward per boss
    const boosts  = Player.getBoosts();
    const xpGain  = Math.round(50 * boosts.xpMult);
    const result  = Player.awardXP(xpGain);

    let msg = `+${xpGain} XP earned!`;
    if (result.levelled) msg += `\n⬆ Level Up! Now Lv.${result.newLevel}!`;
    await UI.typewrite(msg);
    UI.updateHUD();
    await sleep(1800);

    // Check quests
    this._checkQuests();

    State.bossIndex++;
    if (State.bossIndex < State.activeBosses.length) {
      await UI.typewrite('A new challenger approaches!');
      await sleep(1400);
      this._startBoss();
    } else {
      // Full run complete
      const coinBonus = Math.round(50 * boosts.coinMult);
      Player.awardCoins(coinBonus);
      const isSingle = State.activeBosses.length === 1;
      UI.showOverlay(
        '🏆 YOU WIN!',
        `${isSingle ? `Defeated ${State.activeBosses[0].name}!` : 'All bosses defeated!'}\n+${coinBonus}🪙 bonus coins!`
      );
    }
  },

  async _playerFainted() {
    UI.hideAnswers();
    await UI.typewrite('You fainted...\nNext time just study mate!');
    await sleep(1800);
    UI.showOverlay('💀 YOU FAINTED', 'Your brain needs more training!');
  },

  // ── Quest checking ────────────────────────

  _checkQuests() {
    if (!Player.questsUnlocked) return;
    for (const quest of Shop.QUESTS) {
      const prog = Player.getQuestProgress(quest.id);
      if (prog.completed) continue;

      let done = false;
      const g  = quest.goal;
      if (g.type === 'defeat_bosses'     && State.runBossesDefeated >= g.count) done = true;
      if (g.type === 'defeat_bosses_run' && State.runBossesDefeated >= g.count) done = true;
      if (g.type === 'correct_answers'   && State.runCorrectAnswers  >= g.count) done = true;
      if (g.type === 'no_damage_boss'    && State.runNoDamage)                   done = true;
      if (g.type === 'defeat_all'        && State.bossIndex >= State.activeBosses.length) done = true;
      if (g.type === 'perfect_run'       && State.runPerfect && State.bossIndex >= State.activeBosses.length) done = true;

      if (done) {
        Player.completeQuest(quest.id);
        Player.awardXP(quest.reward.xp);
        Player.awardCoins(quest.reward.coins);
      }
    }
  },
};

export function startGame()       { Game.start();            }
export function restartGame()     { Game.restart();          }
export function selectAnswer(idx) { Game.resolveAnswer(idx); }