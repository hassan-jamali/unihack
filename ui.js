/* ═══════════════════════════════════════════
   ui.js — All DOM reads and writes
   Nothing here contains game logic.
   If an element is renamed in index.html,
   this is the only file that needs updating.
   Depends on: utils.js
   ═══════════════════════════════════════════ */

const UI = {

  // ── Screens ──────────────────────────────────────────

  showBattleScreen() {
    document.getElementById('title-screen').classList.remove('active');
    document.getElementById('battle-screen').classList.add('active');
  },

  // ── Arena ────────────────────────────────────────────

  setArenaOverlay(color) {
    document.getElementById('typeOverlay').style.background = color;
  },

  /** Set the boss emoji/sprite and return the element */
  setBossSprite(emoji) {
    const el = document.getElementById('bossSprite');
    el.style.opacity   = '1';
    el.style.transform = '';
    el.textContent     = emoji;
    return el;
  },

  animateBossEntry(el) {
    triggerAnim(el, 'anim-slide', 600);
  },

  animateBossHit() {
    triggerAnim(document.getElementById('bossSprite'), 'anim-boss-hit', 500);
  },

  animateBossFaint() {
    document.getElementById('bossSprite').classList.add('anim-faint');
  },

  resetBossFaint() {
    document.getElementById('bossSprite').classList.remove('anim-faint');
  },

  animatePlayerHit() {
    triggerAnim(document.getElementById('playerSprite'), 'anim-shake', 400);
  },

  // ── HUD ──────────────────────────────────────────────

  setBossHUD(boss) {
    document.getElementById('bossName').textContent = boss.name;
    const badge            = document.getElementById('typeBadge');
    badge.textContent      = boss.type;
    badge.style.background = boss.typeColor;
    badge.style.color      = '#000';
  },

  /** Instantly set an HP bar (used on battle start / reset) */
  setHpBar(fillId, numbersId, current, max) {
    const pct  = Math.max(0, current / max) * 100;
    const fill = document.getElementById(fillId);
    fill.style.width      = pct + '%';
    fill.style.background = this._hpColor(pct);
    document.getElementById(numbersId).textContent =
      `${Math.max(0, current)} / ${max}`;
  },

  /** Smoothly animate an HP bar to a new value */
  animateHpBar(fillId, numbersId, target, max) {
    const fill      = document.getElementById(fillId);
    const numEl     = document.getElementById(numbersId);
    const startPct  = parseFloat(fill.style.width) || 100;
    const endPct    = Math.max(0, target / max) * 100;
    const duration  = 500;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = startPct + (endPct - startPct) * eased;
      fill.style.width      = current + '%';
      fill.style.background = this._hpColor(current);
      numEl.textContent     = `${Math.max(0, target)} / ${max}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  _hpColor(pct) {
    if (pct > 50) return 'var(--hp-green)';
    if (pct > 25) return 'var(--hp-yellow)';
    return 'var(--hp-red)';
  },

  // ── Progress dots ─────────────────────────────────────

  updateProgressDots(bossIndex, total) {
    const html = Array.from({ length: total }, (_, i) => {
      let cls = 'boss-dot';
      if      (i < bossIndex)  cls += ' done';
      else if (i === bossIndex) cls += ' current';
      return `<div class="${cls}"></div>`;
    }).join('');

    document.getElementById('bossDots').innerHTML = html;
    document.getElementById('statusText').textContent =
      `Boss ${bossIndex + 1} of ${total}`;
  },

  // ── Dialogue ─────────────────────────────────────────

  /** Type text into the dialogue box one character at a time */
  async typewrite(text, msPerChar = 28) {
    this.hideAnswers();
    const el = document.getElementById('dialogueText');
    el.textContent = '';
    for (const ch of text) {
      el.textContent += ch;
      await sleep(ch === '\n' ? 80 : msPerChar);
    }
  },

  // ── Answer buttons ────────────────────────────────────

  showAnswers(answers) {
    document.getElementById('answersArea').classList.add('visible');
    answers.forEach((text, i) => {
      const btn       = document.getElementById('btn' + i);
      btn.textContent = text;
      btn.disabled    = false;
      btn.className   = 'answer-btn';
    });
  },

  hideAnswers() {
    document.getElementById('answersArea').classList.remove('visible');
  },

  disableAnswers() {
    for (let i = 0; i < 4; i++) {
      document.getElementById('btn' + i).disabled = true;
    }
  },

  markAnswerCorrect(idx) {
    document.getElementById('btn' + idx).classList.add('correct');
  },

  markAnswerWrong(idx) {
    document.getElementById('btn' + idx).classList.add('wrong');
  },

  /** Highlight whichever button holds the correct answer text */
  revealCorrectAnswer(shuffled, correctText) {
    shuffled.forEach((answer, i) => {
      if (answer === correctText) this.markAnswerCorrect(i);
    });
  },

  // ── Win / Lose overlay ────────────────────────────────

  showOverlay(title, subtitle) {
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlaySub').textContent   = subtitle;
    document.getElementById('battleOverlay').classList.add('visible');
  },

  hideOverlay() {
    document.getElementById('battleOverlay').classList.remove('visible');
  },
};
