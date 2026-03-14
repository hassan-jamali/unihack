/* ═══════════════════════════════════════════
   gameboy-shell.js
   Power switch + physical button wiring for
   the BrainBoy shell. Runs after all game
   scripts have loaded.
   ═══════════════════════════════════════════ */

import { UI, goToTitle } from '../ui/ui.js';
import { startGame, restartGame } from '../game/game.js';
import { Player } from '../game/player.js';
import { Config } from '../core/config.js';

/* ─────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────── */

/** Returns the id of whichever .screen is currently active, or null. */
function gbActiveScreen() {
  const s = document.querySelector('.screen.active');
  return s ? s.id : null;
}

/** Cycle focus through enabled answer buttons. */
function gbFocusAnswer(delta) {
  const area = document.getElementById('answersArea');
  if (!area || !area.classList.contains('visible')) return;
  const btns = Array.from(area.querySelectorAll('.answer-btn:not([disabled])'));
  if (!btns.length) return;
  const focused = document.activeElement;
  let idx = btns.indexOf(focused);
  if (idx === -1) idx = 0;
  else idx = (idx + delta + btns.length) % btns.length;
  btns[idx].focus();
}

/* ─────────────────────────────────────────
   POWER SWITCH
   ───────────────────────────────────────── */

let gbPowered = true;
let gbScreenBeforeOff = null;

function gbTogglePower() {
  const track   = document.getElementById('gbPowerTrack');
  const led     = document.getElementById('gbLed');
  const offScreen = document.getElementById('gbOffScreen');
  const flicker   = document.getElementById('gbOffFlicker');
  const gc        = document.querySelector('.game-container');

  if (gbPowered) {
    /* ── POWER OFF ── */
    gbPowered = false;

    // Remember active screen so we can restore it on power-on
    const active = document.querySelector('.screen.active');
    gbScreenBeforeOff = active ? active.id : 'title-screen';

    // Slide thumb down, kill LED
    track.className = 'gb-power-track off';
    led.style.background = '#2a2a28';
    led.style.boxShadow  = 'none';

    // CRT flicker animation — restart it each time
    flicker.style.animation = 'none';
    void flicker.offsetWidth; // force reflow
    flicker.style.animation  = '';

    // Hide all screens
    document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));

    // Show black off-screen after flicker starts
    setTimeout(() => { offScreen.style.display = 'flex'; }, 50);

  } else {
    /* ── POWER ON ── */
    gbPowered = true;

    // Hide off-screen, restore LED & thumb
    offScreen.style.display = 'none';
    track.className         = 'gb-power-track on';
    led.style.background    = '';
    led.style.boxShadow     = '';

    // Brief power-on flash
    gc.style.animation = 'none';
    void gc.offsetWidth;
    gc.style.animation = 'gbPowerOn 0.35s ease forwards';
    setTimeout(() => { gc.style.animation = ''; }, 400);

    // Restore whichever screen was active before
    const target = document.getElementById(gbScreenBeforeOff || 'title-screen');
    if (target) target.classList.add('active');
  }
}

/* ─────────────────────────────────────────
   A BUTTON  —  Confirm / Select
   ───────────────────────────────────────── */

function gbPressA() {
  if (!gbPowered) return;
  const screen = gbActiveScreen();

  if (screen === 'title-screen') {
    startGame();
    return;
  }

  if (screen === 'battle-screen') {
    const area = document.getElementById('answersArea');
    if (area && area.classList.contains('visible')) {
      // Click whatever answer button is focused; if none, focus+click first
      const focused = area.querySelector('.answer-btn:focus:not([disabled])');
      const btns    = area.querySelectorAll('.answer-btn:not([disabled])');
      if (focused) {
        focused.click();
      } else if (btns.length) {
        btns[0].focus();
        btns[0].click();
      }
    } else {
      // Overlay visible → restart
      const overlay = document.getElementById('battleOverlay');
      if (overlay && overlay.classList.contains('visible')) {
        restartGame();
      }
    }
    return;
  }
}

/* ─────────────────────────────────────────
   B BUTTON  —  Back / Cancel
   ───────────────────────────────────────── */

function gbPressB() {
  if (!gbPowered) return;
  const screen = gbActiveScreen();

  if (screen === 'battle-screen') {
    const overlay = document.getElementById('battleOverlay');
    if (overlay && overlay.classList.contains('visible')) {
      goToTitle();
    } else {
      // Cycle to next answer option (useful when D-pad isn't used)
      gbFocusAnswer(1);
    }
    return;
  }

  if (screen === 'shop-screen' || screen === 'quests-screen' || screen === 'editor-screen') {
    goToTitle();
    return;
  }
}

/* ─────────────────────────────────────────
   START BUTTON
   ───────────────────────────────────────── */

function gbPressStart() {
  if (!gbPowered) return;
  const screen = gbActiveScreen();

  if (screen === 'title-screen') {
    startGame();
    return;
  }

  if (screen === 'battle-screen') {
    const overlay = document.getElementById('battleOverlay');
    if (overlay && overlay.classList.contains('visible')) {
      restartGame();
    } else {
      goToTitle();
    }
    return;
  }

  // Any other screen → title
  goToTitle();
}

/* ─────────────────────────────────────────
   SELECT BUTTON
   ───────────────────────────────────────── */

function gbPressSelect() {
  if (!gbPowered) return;
  const screen = gbActiveScreen();

  if (screen === 'title-screen') {
    // Cycle to next boss card
    const cards = document.querySelectorAll('.boss-card');
    if (!cards.length) return;
    let cur = -1;
    cards.forEach((c, i) => { if (c.classList.contains('selected')) cur = i; });
    const next = (cur + 1) % cards.length;
    cards[next].click();
    return;
  }

  // Any other screen → back to title
  goToTitle();
}

/* ─────────────────────────────────────────
   D-PAD
   ───────────────────────────────────────── */

function gbDpadPress(dir) {
  if (!gbPowered) return;
  const screen = gbActiveScreen();

  if (screen === 'title-screen') {
    const cards = document.querySelectorAll('.boss-card');
    if (!cards.length) return;
    let cur = -1;
    cards.forEach((c, i) => { if (c.classList.contains('selected')) cur = i; });

    if (dir === 'right') {
      cards[(cur + 1) % cards.length].click();
    } else if (dir === 'left') {
      cards[(cur - 1 + cards.length) % cards.length].click();
    } else if (dir === 'up') {
      startGame();
    }
    return;
  }

  if (screen === 'battle-screen') {
    if (dir === 'right' || dir === 'down') gbFocusAnswer(1);
    if (dir === 'left'  || dir === 'up')   gbFocusAnswer(-1);
    return;
  }
}

/* ─────────────────────────────────────────
   KEYBOARD  —  mirrors the physical buttons
   ───────────────────────────────────────── */

document.addEventListener('keydown', (e) => {
  if (!gbPowered) return;

  switch (e.key) {
    case 'ArrowRight': e.preventDefault(); gbDpadPress('right'); break;
    case 'ArrowLeft':  e.preventDefault(); gbDpadPress('left');  break;
    case 'ArrowUp':    e.preventDefault(); gbDpadPress('up');    break;
    case 'ArrowDown':  e.preventDefault(); gbDpadPress('down');  break;
    case 'z': case 'Z': gbPressA();      break; // A = Z
    case 'x': case 'X': gbPressB();      break; // B = X
    case 'Enter':        gbPressStart();  break; // Start = Enter
    case ' ':            e.preventDefault(); gbPressSelect(); break; // Select = Space
  }
});

/* ─────────────────────────────────────────
   WIRE DOM ELEMENTS
   Runs after the whole document is ready so
   all elements are guaranteed to exist.
   ───────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Game init (your existing modules) ── */
  if (typeof Player   !== 'undefined') Player.resetDailyQuests();
  if (typeof UI       !== 'undefined') UI.renderBossCards();
  if (typeof UI       !== 'undefined') UI.updateHUD();
  const nameEl = document.getElementById('playerHudName');
  if (nameEl && typeof Config !== 'undefined') nameEl.textContent = Config.player.name;

  /* ── Power switch ── */
  document.getElementById('gbPowerSwitch').addEventListener('click', gbTogglePower);

  /* ── A / B buttons ── */
  document.getElementById('gbBtnA').addEventListener('click', gbPressA);
  document.getElementById('gbBtnB').addEventListener('click', gbPressB);

  /* ── START / SELECT ── */
  document.getElementById('gbBtnStart').addEventListener('click',  gbPressStart);
  document.getElementById('gbBtnSelect').addEventListener('click', gbPressSelect);

  /* ── D-pad: four click zones ──
     The cross is made of two overlapping rects (.gb-dpad-h and .gb-dpad-v).
     We use click position relative to the cross centre to determine direction. */
  document.getElementById('gbDpad').addEventListener('click', (e) => {
    const dpad  = e.currentTarget;
    const rect  = dpad.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;
    const dx    = e.clientX - cx;
    const dy    = e.clientY - cy;

    // Determine direction by whichever axis has the larger offset
    if (Math.abs(dx) > Math.abs(dy)) {
      gbDpadPress(dx > 0 ? 'right' : 'left');
    } else {
      gbDpadPress(dy > 0 ? 'down' : 'up');
    }
  });

});