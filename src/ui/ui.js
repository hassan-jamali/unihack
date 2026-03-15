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
import { Transitions } from '../ui/transitions.js';
import { Pomodoro } from './pomodoro.js';

export const UI = {

  screenHistory: ['title-screen'], // Initialize with title screen

  
  // ── Screens ──────────────────────────────

  async showScreen(id, transition = 'fade') {
    const currentScreen = this.screenHistory[this.screenHistory.length - 1];
    const targetScreen = document.getElementById(id);
    
    if (!targetScreen) return;
    
    // Don't transition if already on this screen
    if (currentScreen === id) return;
    
    // Add to history (but don't duplicate)
    if (this.screenHistory[this.screenHistory.length - 1] !== id) {
      this.screenHistory.push(id);
    }
    
    // Perform transition
    switch (transition) {
      case 'slide-left':
        await Transitions.slideLeft(currentScreen, id);
        break;
      case 'slide-right':
        await Transitions.slideRight(currentScreen, id);
        break;
      case 'slide-up':
        await Transitions.slideUp(currentScreen, id);
        break;
      case 'slide-down':
        await Transitions.slideDown(currentScreen, id);
        break;
      default:
        await Transitions.fade(currentScreen, id);
    }
    
    // Update back button visibility
    this.updateBackButton();
  },
  
  async goBack() {
    // Always go back to title screen
    await this.showScreen('title-screen', 'slide-right');
  },
  
  updateBackButton() {
    const backBtn = document.getElementById('backButton');
    if (!backBtn) return;
    
    // Show back button on all screens except title screen
    const currentScreen = this.screenHistory[this.screenHistory.length - 1];
    if (currentScreen === 'title-screen') {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = 'flex';
    }
  },
  
  showBattleScreen() { 
    this.showScreen('battle-screen', 'slide-left'); 
  },
  
  showTitleScreen()  {
    this.renderBossCards();
    this.updateHUD();
    this.showScreen('title-screen', 'slide-right');
  },

  // ── Global HUD (level/xp/coins shown on title) ──

  updateHUD() {
    const lvl  = Player.level;
    const prog = Player.xpProgress();
    const pct  = Math.min(100, Math.round(prog.current / prog.needed * 100));
    const el   = document.getElementById('hudLevel');
    const bar  = document.getElementById('hudXpFill');
    const coins= document.getElementById('hudCoins');
    const shopCoins = document.getElementById('shopCoinsDisplay');
    const shop = document.getElementById('navShop');
    const quest= document.getElementById('navQuests');
    if (el)    el.textContent   = `LV.${lvl}`;
    if (bar)   bar.style.width  = pct + '%';
    if (coins) coins.textContent= `🪙 ${Player.coins}`;
    if (shopCoins)  shopCoins.textContent = `🪙 ${Player.coins}`;
    if (shop)  shop.style.display = Player.shopUnlocked  ? 'inline-block' : 'none';
    if (quest) quest.style.display= Player.questsUnlocked? 'inline-block' : 'none';
    const pom = document.getElementById('navPomodoro');
    if (pom) pom.style.display = Player.pomodoroUnlocked ? 'inline-block' : 'none';
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
      // Only set image if element is empty (no animation running)
      if (!el.innerHTML || el.innerHTML.trim() === '') {
        el.innerHTML = `<img src="${boss.image}" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(4px 4px 0 rgba(0,0,0,0.6))">`;
      }
    } else {
      // Don't clear if animation system is running
      if (!el.innerHTML || el.innerHTML.trim() === '') {
        el.innerHTML = ''; // Only set empty if already empty
      }
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
    
    let skipped = false;
    let currentText = '';
    
    const skipHandler = (e) => {
      if (!skipped) {
        e.preventDefault();
        e.stopPropagation();
        skipped = true;
        el.textContent = text;
        document.body.style.cursor = 'default';
        document.removeEventListener('click', skipHandler, true);
      }
    };
    
    // Add global click handler to skip animation anywhere on screen
    document.body.style.cursor = 'pointer';
    document.addEventListener('click', skipHandler, true); // Use capture to ensure it fires first
    
    for (const ch of text) {
      if (skipped) break; // Exit loop immediately when skipped
      currentText += ch;
      el.textContent = currentText;
      await sleep(ch === '\n' ? 80 : msPerChar);
    }
    
    // Clean up event listener and reset cursor
    document.removeEventListener('click', skipHandler, true);
    document.body.style.cursor = 'default';
    
    // If skipped, return immediately without any additional delays
    if (skipped) return;
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
          <div class="shop-icon">${item.image ? `<img src="${item.image}" style="width:32px;height:32px;object-fit:contain;">` : item.icon}</div>
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
          <div class="quest-icon">${quest.image ? `<img src="${quest.image}" style="width:28px;height:28px;object-fit:contain;">` : quest.icon}</div>
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
  UI.updateHUD();
  UI.showScreen('shop-screen', 'slide-left');
}

export function openQuests() {
  if (!Player.questsUnlocked) return;
  UI.renderQuests();
  UI.showScreen('quests-screen', 'slide-left');
}

export function openPomodoro() {
  if (!Player.pomodoroUnlocked) return;
  Pomodoro.init();
  UI.showScreen('pomodoro-screen', 'slide-left');
}
window.openPomodoro = openPomodoro;

export function goToTitle() {
  UI.showTitleScreen();
}

export function goBack() {
  UI.goBack();
}
