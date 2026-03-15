/* ═══════════════════════════════════════════
   pomodoro.js — Pomodoro timer logic
   ═══════════════════════════════════════════ */

const CIRCUMFERENCE = 2 * Math.PI * 88; // ~553

const DEFAULT_DURATIONS = {
  focus: 25 * 60,
  break:  5 * 60,
  long:  15 * 60,
};

const SESSIONS_BEFORE_LONG = 4;

export const Pomodoro = {
  _mode: 'focus',
  _durations: { ...DEFAULT_DURATIONS },
  _remaining: DEFAULT_DURATIONS.focus,
  _interval: null,
  _running: false,
  _session: 1,
  _completedFocus: 0,
    _doneGuard: false,
  // ── Public API ────────────────────────────

  init() {
    this._render();
    this._renderDots();
  },

  setMode(mode) {
    if (this._running) this._pause();
    this._mode = mode;
    this._remaining = this._durations[mode];
    document.querySelectorAll('.pom-mode-tab').forEach(t => t.classList.remove('active'));
    const tabMap = { focus: 'pomTabFocus', break: 'pomTabBreak', long: 'pomTabLong' };
    document.getElementById(tabMap[mode])?.classList.add('active');
    this._render();
  },

  toggle() {
    this._running ? this._pause() : this._start();
  },

  reset() {
    this._pause();
    this._remaining = this._durations[this._mode];
    this._render();
  },

skip() {
  this._pause();
  this._remaining = 0;
  this._render();
  this._done();
},

  applySettings() {
    const focusVal = parseInt(document.getElementById('pomSetFocus')?.value);
    const breakVal = parseInt(document.getElementById('pomSetBreak')?.value);
    const longVal  = parseInt(document.getElementById('pomSetLong')?.value);
    const status   = document.getElementById('pomSettingsStatus');

    // Validate
    if (isNaN(focusVal) || focusVal < 1 || focusVal > 120) {
      this._settingsStatus('Focus must be 1–120 min', true); return;
    }
    if (isNaN(breakVal) || breakVal < 1 || breakVal > 60) {
      this._settingsStatus('Short break must be 1–60 min', true); return;
    }
    if (isNaN(longVal) || longVal < 1 || longVal > 60) {
      this._settingsStatus('Long break must be 1–60 min', true); return;
    }
    if (breakVal >= focusVal) {
      this._settingsStatus('Short break must be less than focus time', true); return;
    }
    if (longVal <= breakVal) {
      this._settingsStatus('Long break must be longer than short break', true); return;
    }

    // Apply
    if (this._running) this._pause();
    this._durations.focus = focusVal * 60;
    this._durations.break = breakVal * 60;
    this._durations.long  = longVal  * 60;
    this._remaining = this._durations[this._mode];
    this._render();
    this._settingsStatus('✓ Applied!', false);
  },

  // ── Internal ──────────────────────────────

  _start() {
    this._running = true;
    const btn = document.getElementById('pomPlayBtn');
    if (btn) { btn.textContent = '⏸ PAUSE'; btn.classList.add('running'); }
    this._interval = setInterval(() => {
      if (this._remaining > 0) {
        this._remaining--;
        this._render();
      } else {
        this._done();
      }
    }, 1000);
  },

  _pause() {
    this._running = false;
    clearInterval(this._interval);
    const btn = document.getElementById('pomPlayBtn');
    if (btn) { btn.textContent = '▶ START'; btn.classList.remove('running'); }
  },

_done() {
  if (this._doneGuard) return;
  this._doneGuard = true;
  this._pause();
  
  if (this._mode === 'focus') {
    this._completedFocus++;
    this._session++;
    this._renderDots();
    const goLong = this._completedFocus % SESSIONS_BEFORE_LONG === 0;
    setTimeout(() => { this._doneGuard = false; this.setMode(goLong ? 'long' : 'break'); }, 800);
  } else {
    setTimeout(() => { this._doneGuard = false; this.setMode('focus'); }, 800);
  }
  this._flashDone();
},

  _flashDone() {
    const el = document.getElementById('pomTimer');
    if (!el) return;
    let t = 0;
    const iv = setInterval(() => {
      el.textContent = t % 2 === 0 ? '✓ DONE' : '';
      if (++t >= 6) clearInterval(iv);
    }, 300);
  },

  _render() {
    const mins = String(Math.floor(this._remaining / 60)).padStart(2, '0');
    const secs = String(this._remaining % 60).padStart(2, '0');
    const timerEl  = document.getElementById('pomTimer');
    const ringEl   = document.getElementById('pomRingFill');
    const labelEl  = document.getElementById('pomSessionLabel');
    const infoEl   = document.getElementById('pomSessionInfo');
    if (!timerEl) return;

    timerEl.textContent = `${mins}:${secs}`;

    const urgent = this._remaining <= 60 && this._running;
    timerEl.classList.toggle('urgent', urgent);

    if (ringEl) {
      const total  = this._durations[this._mode];
      const offset = CIRCUMFERENCE * (1 - this._remaining / total);
      ringEl.style.strokeDasharray  = CIRCUMFERENCE;
      ringEl.style.strokeDashoffset = offset;
      ringEl.classList.toggle('mode-break',  this._mode === 'break');
      ringEl.classList.toggle('mode-long',   this._mode === 'long');
      ringEl.classList.toggle('mode-urgent', urgent);
    }

    if (labelEl) {
      const labels = { focus: `SESSION ${this._session}`, break: 'SHORT BREAK', long: 'LONG BREAK' };
      labelEl.textContent = labels[this._mode];
    }

    if (infoEl) {
      const left = SESSIONS_BEFORE_LONG - (this._completedFocus % SESSIONS_BEFORE_LONG);
      infoEl.textContent = this._mode === 'focus'
        ? `${left} session${left !== 1 ? 's' : ''} until long break`
        : 'rest up!';
    }
  },

  _renderDots() {
    const el = document.getElementById('pomSessionDots');
    if (!el) return;
    const cycle = this._completedFocus % SESSIONS_BEFORE_LONG;
    el.innerHTML = Array.from({ length: SESSIONS_BEFORE_LONG }, (_, i) => {
      const done    = i < cycle;
      const current = i === cycle && this._mode === 'focus';
      return `<div class="pom-dot ${done ? 'done' : ''} ${current ? 'current' : ''}"></div>`;
    }).join('');
  },

  _settingsStatus(msg, isError) {
    const el = document.getElementById('pomSettingsStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'pom-settings-status' + (isError ? ' error' : '');
    setTimeout(() => { el.textContent = ''; el.className = 'pom-settings-status'; }, 3000);
  },
};

window.Pomodoro = Pomodoro;