/* ═══════════════════════════════════════════
   ui.js — All DOM reads and writes
   ═══════════════════════════════════════════ */

const UI = {

  // ── Screens ──────────────────────────────────────────

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  showBattleScreen() { this.showScreen('battle-screen'); },
  showTitleScreen()  { this.showScreen('title-screen');  },

  // ── Arena ────────────────────────────────────────────

  setArenaOverlay(color) {
    document.getElementById('typeOverlay').style.background = color;
  },

  setBossSprite(boss) {
    const el = document.getElementById('bossSprite');
    el.style.opacity   = '1';
    el.style.transform = '';
    if (boss.image) {
      el.innerHTML = `<img src="${boss.image}" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(4px 4px 0 rgba(0,0,0,0.6))">`;
    } else {
      el.innerHTML = boss.emoji || '❓';
    }
    return el;
  },

  animateBossEntry(el) { triggerAnim(el, 'anim-slide', 600); },
  animateBossHit()     { triggerAnim(document.getElementById('bossSprite'), 'anim-boss-hit', 500); },
  animatePlayerHit()   { triggerAnim(document.getElementById('playerSprite'), 'anim-shake', 400); },

  animateBossFaint() {
    document.getElementById('bossSprite').classList.add('anim-faint');
  },

  resetBossFaint() {
    const el = document.getElementById('bossSprite');
    el.classList.remove('anim-faint');
    el.style.opacity   = '1';
    el.style.transform = '';
  },

  // ── HUD ──────────────────────────────────────────────

  setBossHUD(boss) {
    document.getElementById('bossName').textContent = boss.name;
    const badge            = document.getElementById('typeBadge');
    badge.textContent      = boss.type;
    badge.style.background = boss.typeColor;
    badge.style.color      = '#000';
  },

  setHpBar(fillId, numbersId, current, max) {
    const pct  = Math.max(0, current / max) * 100;
    const fill = document.getElementById(fillId);
    fill.style.width      = pct + '%';
    fill.style.background = this._hpColor(pct);
    document.getElementById(numbersId).textContent =
      `${Math.max(0, current)} / ${max}`;
  },

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
      if      (i < bossIndex)   cls += ' done';
      else if (i === bossIndex) cls += ' current';
      return `<div class="${cls}"></div>`;
    }).join('');

    document.getElementById('bossDots').innerHTML = html;
    document.getElementById('statusText').textContent =
      `Boss ${bossIndex + 1} of ${total}`;
  },

  // ── Dialogue ─────────────────────────────────────────

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
      const btn     = document.getElementById('btn' + i);
      btn.textContent = text;
      btn.disabled    = false;
      btn.className   = 'answer-btn';
    });
  },

  hideAnswers() {
    document.getElementById('answersArea').classList.remove('visible');
  },

  disableAnswers() {
    for (let i = 0; i < 4; i++)
      document.getElementById('btn' + i).disabled = true;
  },

  markAnswerCorrect(idx) { document.getElementById('btn' + idx).classList.add('correct'); },
  markAnswerWrong(idx)   { document.getElementById('btn' + idx).classList.add('wrong'); },

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

  // ── Title screen boss cards ───────────────────────────

  renderBossCards() {
    const container = document.getElementById('bossCardsContainer');
    container.innerHTML = '';

    if (Config.bosses.length === 0) {
      container.innerHTML = `<div class="boss-empty-state">No bosses yet.<br>Add one in ⚙ Config!</div>`;
      document.getElementById('selectedBossIndex').value = 'all';
      return;
    }

    Config.bosses.forEach((boss, i) => {
      const hpPips = Array.from({ length: Math.ceil(boss.maxHp / 25) }, () =>
        `<div class="hp-pip" style="background:${boss.typeColor || '#aaa'}"></div>`
      ).join('');

      const iconHtml = boss.image
        ? `<img class="boss-icon" src="${boss.image}" alt="${boss.name}">`
        : `<span class="boss-icon">${boss.emoji || '❓'}</span>`;

      const card = document.createElement('div');
      card.className = 'boss-card';
      card.style.borderColor = boss.typeColor || '#aaa';
      card.dataset.index = i;
      card.innerHTML = `
        ${iconHtml}
        <div class="boss-card-name">${boss.name.replace(' ', '<br>')}</div>
        <div class="boss-type" style="background:${boss.typeColor || '#aaa'}">${boss.type}</div>
        <div class="boss-card-hp">${hpPips}</div>
        <div class="boss-card-diff">${boss.difficulty || 'medium'}</div>
      `;
      card.addEventListener('click', () => this._selectBoss(card, i));
      container.appendChild(card);
    });

    /* "All bosses" card */
    const allCard = document.createElement('div');
    allCard.className = 'boss-card boss-card-all selected';
    allCard.dataset.index = 'all';
    allCard.innerHTML = `
      <span class="boss-icon">⚡</span>
      <div class="boss-card-name">All<br>Bosses</div>
      <div class="boss-type" style="background:#e94560;color:#fff">FULL RUN</div>
      <div class="boss-card-hp">
        ${Config.bosses.map(() => `<div class="hp-pip" style="background:#e94560"></div>`).join('')}
      </div>
      <div class="boss-card-diff">marathon</div>
    `;
    allCard.addEventListener('click', () => this._selectBoss(allCard, 'all'));
    container.appendChild(allCard);

    document.getElementById('selectedBossIndex').value = 'all';
  },

  _selectBoss(card, index) {
    document.querySelectorAll('.boss-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    document.getElementById('selectedBossIndex').value = index;
  },

  getSelectedBosses() {
    const val = document.getElementById('selectedBossIndex').value;
    if (val === 'all') return [...Config.bosses];
    const idx = parseInt(val);
    const boss = Config.bosses[idx];
    if (!boss) return [...Config.bosses]; // fallback to all if something went wrong
    return [boss];
  },
};