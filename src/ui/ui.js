/* ═══════════════════════════════════════════
   ui.js — All DOM reads and writes
   ═══════════════════════════════════════════ */

import { Config } from '../core/config.js';
import { Player } from '../game/player.js';
import { State } from '../core/state.js';
import { Presets } from '../game/presets.js';
import { Shop } from './shop.js';
import { triggerAnim, sleep } from '../core/utils.js';
import { Multiplayer } from '../multiplayer/server.js';

export const UI = {


  
  // ── Screens ──────────────────────────────

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },
  showBattleScreen() { 
    this.showScreen('battle-screen'); 
  },
  showTitleScreen()  {
    this.renderBossCards();
    this.updateHUD();
    this.showScreen('title-screen');
  },

  // ── Global HUD (level/xp/coins shown on title) ──

  updateHUD() {
    const lvl  = Player.level;
    const prog = Player.xpProgress();
    const pct  = Math.min(100, Math.round(prog.current / prog.needed * 100));
    const el   = document.getElementById('hudLevel');
    const bar  = document.getElementById('hudXpFill');
    const coins= document.getElementById('hudCoins');
    const shop = document.getElementById('navShop');
    const quest= document.getElementById('navQuests');
    if (el)    el.textContent   = `LV.${lvl}`;
    if (bar)   bar.style.width  = pct + '%';
    if (coins) coins.textContent= `🪙 ${Player.coins}`;
    if (shop)  shop.style.display = Player.shopUnlocked  ? 'inline-block' : 'none';
    if (quest) quest.style.display= Player.questsUnlocked? 'inline-block' : 'none';
    const gb = document.getElementById('gameboy');
    if (gb) gb.style.display = Player.gameboyUnlocked ? 'inline-block' : 'none';
  },

  // ── Arena ─────────────────────────────────

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

  animateBossEntry(el)  { triggerAnim(el, 'anim-slide', 600); },
  animateBossHit()      { triggerAnim(document.getElementById('bossSprite'), 'anim-boss-hit', 500); },
  animatePlayerHit()    { triggerAnim(document.getElementById('playerSprite'), 'anim-shake', 400); },
  animateBossFaint()    { document.getElementById('bossSprite').classList.add('anim-faint'); },
  resetBossFaint() {
    const el = document.getElementById('bossSprite');
    el.classList.remove('anim-faint');
    el.style.opacity   = '1';
    el.style.transform = '';
  },

  // ── HUD ───────────────────────────────────

  setBossHUD(boss) {
    document.getElementById('bossName').textContent = boss.name;
    const badge            = document.getElementById('typeBadge');
    badge.textContent      = boss.type;
    badge.style.background = boss.typeColor || '#aaa';
    badge.style.color      = '#000';
  },

  setHpBar(fillId, numbersId, current, max) {
    const pct  = Math.max(0, current / max) * 100;
    const fill = document.getElementById(fillId);
    fill.style.width      = pct + '%';
    fill.style.background = this._hpColor(pct);
    document.getElementById(numbersId).textContent = `${Math.max(0, current)} / ${max}`;
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

  updateProgressDots(bossIndex, total) {
    const html = Array.from({ length: total }, (_, i) => {
      let cls = 'boss-dot';
      if      (i < bossIndex)   cls += ' done';
      else if (i === bossIndex) cls += ' current';
      return `<div class="${cls}"></div>`;
    }).join('');
    document.getElementById('bossDots').innerHTML = html;
    document.getElementById('statusText').textContent = `Boss ${bossIndex + 1} of ${total}`;
  },

  // ── Dialogue ──────────────────────────────

  async typewrite(text, msPerChar = 28) {
    this.hideAnswers();
    const el = document.getElementById('dialogueText');
    el.textContent = '';
    for (const ch of text) {
      el.textContent += ch;
      await sleep(ch === '\n' ? 80 : msPerChar);
    }
  },

  // ── Answers ───────────────────────────────

  showAnswers(answers) {
    document.getElementById('answersArea').classList.add('visible');
    answers.forEach((text, i) => {
      const btn     = document.getElementById('btn' + i);
      btn.textContent = text;
      btn.disabled    = false;
      btn.className   = 'answer-btn';
    });
  },
  hideAnswers()      { document.getElementById('answersArea').classList.remove('visible'); },
  disableAnswers()   { for (let i = 0; i < 4; i++) document.getElementById('btn' + i).disabled = true; },
  markAnswerCorrect(idx) { document.getElementById('btn' + idx).classList.add('correct'); },
  markAnswerWrong(idx)   { document.getElementById('btn' + idx).classList.add('wrong'); },
  revealCorrectAnswer(shuffled, correctText) {
    shuffled.forEach((a, i) => { if (a === correctText) this.markAnswerCorrect(i); });
  },

  // ── Overlay ───────────────────────────────

  showOverlay(title, subtitle) {
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlaySub').textContent   = subtitle;
    document.getElementById('battleOverlay').classList.add('visible');
  },
  hideOverlay() { document.getElementById('battleOverlay').classList.remove('visible'); },

  // ── Title: boss cards ─────────────────────

  renderBossCards() {
    const container = document.getElementById('bossCardsContainer');
    container.innerHTML = '';

    // Combine presets + custom bosses
    const all = [...Presets, ...Config.bosses];

    if (all.length === 0) {
      container.innerHTML = `<div class="boss-empty-state">No bosses yet.<br>Add one in ⚙ Config!</div>`;
      document.getElementById('selectedBossIndex').value = 'all';
      return;
    }

    all.forEach((boss, i) => {
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
        ${boss.preset ? '<div class="boss-preset-badge">PRESET</div>' : ''}
      `;
      card.addEventListener('click', () => this._selectBoss(card, i));
      container.appendChild(card);
    });

    const allCard = document.createElement('div');
    allCard.className = 'boss-card boss-card-all selected';
    allCard.dataset.index = 'all';
    allCard.innerHTML = `
      <span class="boss-icon">⚡</span>
      <div class="boss-card-name">All<br>Bosses</div>
      <div class="boss-type" style="background:#e94560;color:#fff">FULL RUN</div>
      <div class="boss-card-hp">${all.map(() => `<div class="hp-pip" style="background:#e94560"></div>`).join('')}</div>
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
    const all = [...Presets, ...Config.bosses];
    if (val === 'all') return all;
    const idx = parseInt(val);
    return all[idx] ? [all[idx]] : all;
  },

  // ── Shop screen ───────────────────────────

  renderShop() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    grid.innerHTML = Shop.ITEMS.map(item => {
      const owned    = Player.hasItem(item.id);
      const equipped = Player.isEquipped(item.id);
      return `
        <div class="shop-card rarity-${item.rarity} ${owned ? 'owned' : ''}">
          <div class="shop-icon">${item.icon}</div>
          <div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
          <div class="shop-rarity ${item.rarity}">${item.rarity}</div>
          ${owned
            ? `<button class="shop-btn ${equipped ? 'equipped' : ''}" onclick="ShopUI.toggleEquip('${item.id}')">
                ${equipped ? '✓ Equipped' : 'Equip'}
               </button>`
            : `<button class="shop-btn buy" onclick="ShopUI.buy('${item.id}')">
                🪙 ${item.price}
               </button>`
          }
        </div>
      `;
    }).join('');
  },

  // ── Quest screen ──────────────────────────

  renderQuests() {
    const list = document.getElementById('questList');
    if (!list) return;
    Player.resetDailyQuests();
    list.innerHTML = Shop.QUESTS.map(quest => {
      const prog = Player.getQuestProgress(quest.id);
      const done = prog.completed;
      return `
        <div class="quest-item diff-${quest.diff} ${done ? 'completed' : ''}">
          <div class="quest-icon">${quest.icon}</div>
          <div class="quest-info">
            <div class="quest-name">${quest.name}</div>
            <div class="quest-desc">${quest.desc}</div>
            <div class="quest-reward">+${quest.reward.xp} XP  🪙 ${quest.reward.coins}</div>
          </div>
          <div class="quest-diff-badge ${quest.diff}">${quest.diff}</div>
          ${done ? '<div class="quest-check">✓</div>' : ''}
        </div>
      `;
    }).join('');
  },
};

// ── Shop interaction ──────────────────────

export const ShopUI = {
  buy(id) {
    const result = Shop.purchase(id);
    const el = document.getElementById('shopStatus');
    if (el) {
      el.textContent = result.msg;
      el.className   = 'shop-status ' + (result.ok ? 'success' : 'error');
      setTimeout(() => { el.textContent = ''; el.className = 'shop-status'; }, 2500);
    }
    UI.updateHUD();
    UI.renderShop();
  },
  toggleEquip(id) {
    if (Player.isEquipped(id)) Player.unequip(id);
    else                       Player.equip(id);
    UI.renderShop();
  },
};

export function openMultiplayer() {
  UI.showScreen('multiplayer-screen');
  const root = document.getElementById('mp-root');
  if (!root._mounted) {
    Multiplayer.mount(root);
    root._mounted = true;
  }
  Multiplayer._requestRoomList();
}
window.openMultiplayer = openMultiplayer;

export function openShop() {
  if (!Player.shopUnlocked) return;
  UI.renderShop();
  UI.showScreen('shop-screen');
}
export function openQuests() {
  if (!Player.questsUnlocked) return;
  UI.renderQuests();
  UI.showScreen('quests-screen');
}
export function goToTitle() {
  UI.showTitleScreen();
}
