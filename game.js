/* ═══════════════════════════════════════════
   game.js — Core game logic
   ═══════════════════════════════════════════ */

const Game = {

  // ── Entry points ──────────────────────────────────────

  start() {
    const bosses = UI.getSelectedBosses();
    State.reset(bosses);
    UI.showBattleScreen();
    this._startBoss();
  },

  restart() {
    UI.hideOverlay();
    UI.resetBossFaint();
    const bosses = UI.getSelectedBosses();
    State.reset(bosses);
    this._startBoss();
  },

  // ── Boss lifecycle ─────────────────────────────────────

  async _startBoss() {
    const boss      = State.currentBoss;
    State.bossHp    = boss.maxHp;
    State.canAnswer = false;
    State.poolIndex = 0;
    UI.hideAnswers();

    UI.setArenaOverlay(boss.typeBg || 'rgba(100,100,200,0.15)');
    UI.setBossHUD(boss);
    UI.setHpBar('bossHpFill',   'bossHpNumbers',   boss.maxHp,     boss.maxHp);
    UI.setHpBar('playerHpFill', 'playerHpNumbers', State.playerHp, Config.player.maxHp);
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

  // ── Question flow ─────────────────────────────────────

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

  // ── Answer resolution ─────────────────────────────────

  async resolveAnswer(idx) {
    if (!State.canAnswer) return;
    State.canAnswer = false;
    UI.disableAnswers();

    const chosen  = State.shuffledAnswers[idx];
    const correct = State.currentQuestion.a;

    if (chosen === correct) {
      await this._handleCorrect(idx);
    } else {
      await this._handleWrong(idx, correct);
    }
  },

  async _handleCorrect(idx) {
    UI.markAnswerCorrect(idx);
    await sleep(300);

    const boss   = State.currentBoss;
    State.bossHp = Math.max(0, State.bossHp - boss.dmgTaken);

    await UI.typewrite(`✓ Correct!\n${boss.name} took ${boss.dmgTaken} damage!`);
    UI.animateBossHit();
    UI.animateHpBar('bossHpFill', 'bossHpNumbers', State.bossHp, boss.maxHp);

    await sleep(1600);

    if (State.bossHp <= 0) {
      await this._bossFainted();
    } else {
      UI.hideAnswers();
      this._askQuestion();
    }
  },

  async _handleWrong(idx, correct) {
    UI.markAnswerWrong(idx);
    UI.revealCorrectAnswer(State.shuffledAnswers, correct);
    await sleep(300);

    const boss     = State.currentBoss;
    State.playerHp = Math.max(0, State.playerHp - boss.dmgDealt);

    await UI.typewrite(`✗ Wrong!\nAnswer: ${correct}\nYou took ${boss.dmgDealt} damage!`);
    UI.animatePlayerHit();
    UI.animateHpBar('playerHpFill', 'playerHpNumbers', State.playerHp, Config.player.maxHp);

    await sleep(2000);

    if (State.playerHp <= 0) {
      await this._playerFainted();
    } else {
      UI.hideAnswers();
      this._askQuestion();
    }
  },

  // ── Win / Lose ────────────────────────────────────────

  async _bossFainted() {
    UI.hideAnswers();
    UI.animateBossFaint();
    await sleep(300);
    await UI.typewrite(State.currentBoss.defeat || `${State.currentBoss.name} fainted!`);
    await sleep(2000);

    State.bossIndex++;

    if (State.bossIndex < State.activeBosses.length) {
      await UI.typewrite('A new challenger approaches!');
      await sleep(1400);
      this._startBoss();
    } else {
      const isSingleBoss = State.activeBosses.length === 1;
      const subtitle = isSingleBoss
        ? `You defeated ${State.activeBosses[0].name}!\nKnowledge is power!`
        : 'You defeated all bosses!\nBrain Battle Champion!';
      UI.showOverlay('🏆 YOU WIN!', subtitle);
    }
  },

  async _playerFainted() {
    UI.hideAnswers();
    await UI.typewrite('You fainted...\nNext time just study mate!');
    await sleep(1800);
    UI.showOverlay('💀 YOU FAINTED', 'Your brain needs more training!');
  },
};

/* ── Global bindings (called from HTML onclick) ── */
function startGame()       { Game.start();            }
function restartGame()     { Game.restart();          }
function selectAnswer(idx) { Game.resolveAnswer(idx); }