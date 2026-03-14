/* ═══════════════════════════════════════════
   There is a lot of things going on in this file
   ═══════════════════════════════════════════ */

const Game = {

  // ── Entry points ──────────────────────────────────────

  /** Called by the Start button on the title screen */
  start() {
    State.reset();
    UI.showBattleScreen();
    this._startBoss();
  },

  /** Called by the Play Again button on the overlay */
  restart() {
    UI.hideOverlay();
    UI.resetBossFaint();
    State.reset();
    this._startBoss();
  },

  // ── Boss lifecycle ────────────────────────────────────

  /**
   * Sets up a new boss fight:
   * 1. Populates HUD immediately
   * 2. Animates boss entrance and plays intro dialogue
   * 3. THEN fetches AI questions (loading dots appear here)
   * 4. Starts questioning once questions are ready
   */
  async _startBoss() {
    const boss      = State.currentBoss;
    State.bossHp    = boss.maxHp;
    State.canAnswer = false;
    State.poolIndex = 0;
    UI.hideAnswers();

    // Populate the HUD immediately
    UI.setArenaOverlay(boss.typeBg);
    UI.setBossHUD(boss);
    UI.setHpBar('bossHpFill',   'bossHpNumbers',   boss.maxHp,     boss.maxHp);
    UI.setHpBar('playerHpFill', 'playerHpNumbers', State.playerHp, Config.player.maxHp);
    UI.updateProgressDots(State.bossIndex, Config.bosses.length);

    // Animate boss entrance and play intro — no API call yet
    const bossEl = UI.setBossSprite(boss.emoji);
    UI.animateBossEntry(bossEl);
    await UI.typewrite(boss.intro);
    await sleep(1400);

    // NOW fetch questions — loading dots appear in the dialogue box
    State.questionPool = await AI.fetchQuestions(boss);
    this._askQuestion();
  },

  // ── Question flow ─────────────────────────────────────

  /** Pull the next question from the pool, refetch from AI if exhausted */
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

  /**
   * Entry point from index.html: onclick="selectAnswer(i)"
   * Delegates to correct or wrong handler based on the choice.
   */
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
    await UI.typewrite(State.currentBoss.defeat);
    await sleep(2000);

    State.bossIndex++;

    if (State.bossIndex < Config.bosses.length) {
      await UI.typewrite('A new challenger approaches!');
      await sleep(1400);
      this._startBoss();
    } else {
      UI.showOverlay('🏆 YOU WIN!', 'You defeated all 4 bosses!\nBrain Battle Champion!');
    }
  },

  async _playerFainted() {
    UI.hideAnswers();
    await UI.typewrite('You fainted...\nNext time just study mate!');
    await sleep(1800);
    UI.showOverlay('💀 YOU FAINTED', 'Your brain needs more training!');
  },
};


/* ─────────────────────────────────────────────────────
   GLOBAL BINDINGS
   Only these three functions are global — they're called
   from onclick attributes in index.html.
   Everything else is encapsulated in the modules above.
   ───────────────────────────────────────────────────── */
function startGame()       { Game.start();            }
function restartGame()     { Game.restart();          }
function selectAnswer(idx) { Game.resolveAnswer(idx); }