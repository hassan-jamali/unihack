/* ═══════════════════════════════════════════
   multiplayer-game.js — Brain Battle MP Game
   ═══════════════════════════════════════════
   Drop this file in alongside your other modules.

   HOW IT WORKS
   ─────────────
   • window.startGame() (called by server.js _launchGame) now checks
     window.__mpPlayers. If present, it mounts the MP battle screen
     instead of the regular solo flow.
   • Each player gets the same boss sequence (host broadcasts the list).
   • All four players answer simultaneously. After every player has
     answered (or the timer expires), results are synced and the next
     question begins.
   • Boss HP is shared — everyone's damage is added together.
   • A player who runs out of HP is marked "fainted" but others continue.
   • First team to beat all bosses wins. If everyone faints, it's a loss.

   INTEGRATION CHECKLIST
   ──────────────────────
   1.  <script type="module" src="multiplayer-game.js"></script>
       Load it AFTER your existing modules in index.html.

   2.  In server.js _launchGame(), set the player list before calling
       window.startGame():

         _launchGame() {
           window.__mpPlayers = mpState.players;       // ← add this line
           window.__mpSocket  = mpState.socket;        // ← add this line
           window.__mpSelf    = mpState.playerId;      // ← add this line
           if (typeof window.startGame === 'function') window.startGame();
         }

   3.  The module monkey-patches window.startGame so the rest of your
       code doesn't need to change at all.

   PROTOCOL (messages sent over the existing WebSocket)
   ──────────────────────────────────────────────────────
   CLIENT → SERVER (relayed to all room members via RELAY wrapper):
     { type: 'RELAY', payload: { type: 'MP_ANSWER', questionIndex, answerIndex, correct, damage } }
     { type: 'RELAY', payload: { type: 'MP_BOSS_LIST', bosses } }   ← host only, at game start
     { type: 'RELAY', payload: { type: 'MP_NEXT_Q' } }              ← host only, advance question
     { type: 'RELAY', payload: { type: 'MP_GAME_OVER', win } }      ← host only

   SERVER → CLIENT (add to ws-server.js):
     Handle { type: 'RELAY' } by broadcasting payload to all room members.
     See the ws-server patch snippet at the bottom of this file.
   ═══════════════════════════════════════════ */

import { Config, _loadConfig } from '../core/config.js';
import { Presets }             from '../game/presets.js';
import { AI }                  from '../ai/ai.js';
import { shuffle, sleep }      from '../core/utils.js';

/* ─── tunables ─── */
const ANSWER_TIMEOUT_MS = 20_000;   // time limit per question
const COLORS = ['#e94560','#4ade80','#60a5fa','#f59e0b','#a78bfa','#f472b6'];

/* ─── shared live state ─── */
const MP = {
  players:       [],   // [ { id, name, avatarData, isHost, hp, maxHp, fainted } ]
  selfId:        null,
  socket:        null,
  isHost:        false,
  bosses:        [],
  bossIndex:     0,
  bossHp:        0,
  questionPool:  [],
  poolIndex:     0,
  currentQ:      null,
  shuffledAns:   [],
  questionIndex: 0,
  answered:      {},   // { [playerId]: { answerIndex, correct, damage } }
  timer:         null,
  timerEl:       null,
  timerInterval: null,
  gameOver:      false,
  container:     null,
};

/* ══════════════════════════════════════════════════
   ENTRY — called by window.startGame patch
   ══════════════════════════════════════════════════ */
function mountMPGame() {
  // Pull data injected by _launchGame
  MP.players  = (window.__mpPlayers || []).map((p, i) => ({
    ...p,
    hp:      _getMaxHp(),
    maxHp:   _getMaxHp(),
    fainted: false,
    color:   COLORS[i % COLORS.length],
  }));
  MP.selfId   = window.__mpSelf;
  MP.socket   = window.__mpSocket;
  MP.isHost   = MP.players.find(p => p.id === MP.selfId)?.isHost ?? false;
  MP.gameOver = false;
  MP.bossIndex = 0;
  MP.answered  = {};

  // Build boss list from config + presets (same as solo)
  const cfg        = _loadConfig();
  const allBosses  = [...Presets, ...(cfg.bosses || [])];
  MP.bosses        = allBosses.length ? allBosses : Presets;

  // Build / replace the battle container
  let existing = document.getElementById('mp-battle-root');
  if (existing) existing.remove();
  const root = document.createElement('div');
  root.id = 'mp-battle-root';
  document.body.appendChild(root);
  MP.container = root;

  _renderShell();
  _listenSocket();

  if (MP.isHost) {
    // Host broadcasts boss list, then starts
    _send({ type: 'MP_BOSS_LIST', bosses: MP.bosses });
    _startBoss();
  }
  // Guests wait for MP_BOSS_LIST → _startBoss
}

/* ══════════════════════════════════════════════════
   RENDER SHELL
   ══════════════════════════════════════════════════ */
function _renderShell() {
  MP.container.innerHTML = `
  <style>
    #mp-battle-root {
      position: fixed; inset: 0; z-index: 9999;
      background: linear-gradient(160deg, #080f08 0%, #0b1218 50%, #0a0808 100%);
      font-family: 'Press Start 2P', monospace;
      color: #f0f0f0;
      display: flex; flex-direction: column;
      overflow: hidden;
    }

    /* ── TOP BAR ── */
    #mpg-topbar {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px;
      background: rgba(0,0,0,0.4);
      border-bottom: 1px solid #1a3a1a;
      flex-shrink: 0;
    }
    .mpg-player-chip {
      display: flex; align-items: center; gap: 6px;
      background: #0d1a0d; border: 1px solid #1a3a1a; border-radius: 20px;
      padding: 4px 8px 4px 4px;
      transition: border-color 0.2s, opacity 0.3s;
    }
    .mpg-player-chip.fainted { opacity: 0.35; border-color: #3a1a1a; }
    .mpg-player-chip.answering { border-color: #f59e0b; box-shadow: 0 0 6px #f59e0b44; }
    .mpg-player-chip.correct  { border-color: #4ade80; box-shadow: 0 0 6px #4ade8044; }
    .mpg-player-chip.wrong    { border-color: #e94560; box-shadow: 0 0 6px #e9456044; }
    .mpg-chip-avatar {
      width: 22px; height: 22px; border-radius: 50%; object-fit: cover;
      border: 1px solid #2a4a2a; font-size: 11px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; overflow: hidden;
    }
    .mpg-chip-name { font-size: 5px; color: #c8e8c8; white-space: nowrap; }
    .mpg-chip-hp   { font-size: 5px; color: #4ade80; white-space: nowrap; margin-left: 2px; }
    .mpg-chip-hp.low { color: #f59e0b; }
    .mpg-chip-hp.crit { color: #e94560; animation: mpg-pulse 0.6s infinite; }

    /* ── BOSS AREA ── */
    #mpg-arena {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 16px; padding: 10px 20px;
      position: relative;
    }
    #mpg-arena-overlay {
      position: absolute; inset: 0; pointer-events: none;
      transition: background 0.6s;
    }
    #mpg-boss-sprite {
      width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated;
      filter: drop-shadow(0 0 12px currentColor);
      transition: transform 0.15s;
    }
    #mpg-boss-sprite.hit { animation: mpg-hit 0.3s; }
    #mpg-boss-name  { font-size: 9px; letter-spacing: 1px; color: #fff; }
    #mpg-boss-type  { font-size: 6px; padding: 3px 8px; border-radius: 3px; }
    #mpg-boss-hp-wrap { width: 200px; }
    .mpg-hp-track { height: 10px; background: #1a2a1a; border-radius: 5px; overflow: hidden; border: 1px solid #2a4a2a; }
    .mpg-hp-fill  {
      height: 100%; background: linear-gradient(90deg, #4ade80, #22c55e);
      border-radius: 5px; transition: width 0.4s ease;
    }
    .mpg-hp-fill.mid  { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .mpg-hp-fill.low  { background: linear-gradient(90deg, #e94560, #be123c); }
    .mpg-hp-nums { font-size: 6px; color: #aaa; text-align: right; margin-top: 3px; }

    /* ── DIALOGUE + QUESTION ── */
    #mpg-dialogue {
      position: relative; z-index: 2;
      background: rgba(0,0,0,0.7); border: 2px solid #2a4a2a; border-radius: 6px;
      padding: 12px 16px; width: 100%; max-width: 480px; box-sizing: border-box;
      font-size: 8px; line-height: 2; min-height: 50px;
      white-space: pre-wrap;
    }
    #mpg-timer-bar {
      height: 4px; background: #1a2a1a; border-radius: 2px;
      width: 100%; max-width: 480px; overflow: hidden; flex-shrink: 0;
    }
    #mpg-timer-fill {
      height: 100%; background: #4ade80; border-radius: 2px;
      transition: width 0.25s linear, background 0.5s;
    }

    /* ── ANSWERS ── */
    #mpg-answers {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; width: 100%; max-width: 480px;
    }
    .mpg-ans-btn {
      background: #0d1a0d; border: 2px solid #1a3a1a; border-radius: 4px;
      color: #f0f0f0; font-family: inherit; font-size: 7px; padding: 10px 8px;
      cursor: pointer; text-align: left; line-height: 1.6;
      transition: border-color 0.12s, background 0.12s, transform 0.1s;
      position: relative;
    }
    .mpg-ans-btn:hover:not(:disabled) { border-color: #e94560; transform: translateY(-1px); }
    .mpg-ans-btn:active:not(:disabled) { transform: translateY(1px); }
    .mpg-ans-btn:disabled { cursor: default; }
    .mpg-ans-btn.correct  { border-color: #4ade80 !important; background: #0d2a1a !important; color: #4ade80; }
    .mpg-ans-btn.wrong    { border-color: #e94560 !important; background: #2a0d0d !important; color: #e94560; }

    /* ── ANSWER INDICATORS (avatars of who picked what) ── */
    .mpg-ans-icons {
      position: absolute; right: 6px; bottom: 5px;
      display: flex; gap: 2px; flex-wrap: wrap; justify-content: flex-end;
    }
    .mpg-ans-icon {
      width: 14px; height: 14px; border-radius: 50%; font-size: 7px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0; overflow: hidden;
    }

    /* ── OVERLAY ── */
    #mpg-overlay {
      display: none; position: absolute; inset: 0; z-index: 100;
      background: rgba(0,0,0,0.85);
      flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    }
    #mpg-overlay.active { display: flex; }
    #mpg-overlay-title { font-size: 16px; letter-spacing: 2px; }
    #mpg-overlay-sub   { font-size: 7px; color: #aaa; line-height: 2.2; text-align: center; white-space: pre-wrap; }
    .mpg-back-btn {
      background: #e94560; color: #fff; border: none; border-bottom: 3px solid #a01830;
      padding: 10px 18px; font-family: inherit; font-size: 8px; cursor: pointer;
      border-radius: 4px; margin-top: 8px;
    }

    @keyframes mpg-hit { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
    @keyframes mpg-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes mpg-pop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
    @keyframes mpg-entry { from{transform:translateX(80px);opacity:0} to{transform:translateX(0);opacity:1} }
  </style>

  <!-- TOP BAR: player chips -->
  <div id="mpg-topbar"></div>

  <!-- MAIN ARENA -->
  <div id="mpg-arena">
    <div id="mpg-arena-overlay"></div>

    <!-- Boss info -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;z-index:2;">
      <div style="display:flex;gap:8px;align-items:center;">
        <div id="mpg-boss-name">···</div>
        <div id="mpg-boss-type" style="background:#60a5fa20;color:#60a5fa;">???</div>
      </div>
      <div id="mpg-boss-hp-wrap">
        <div class="mpg-hp-track"><div class="mpg-hp-fill" id="mpg-boss-hp-fill" style="width:100%"></div></div>
        <div class="mpg-hp-nums" id="mpg-boss-hp-nums">··/··</div>
      </div>
    </div>

    <!-- Boss sprite -->
    <div id="mpg-boss-sprite-wrap" style="font-size:64px;line-height:1;">
      <img id="mpg-boss-sprite" src="" style="display:none;">
      <span id="mpg-boss-emoji">🤖</span>
    </div>

    <!-- Dialogue -->
    <div id="mpg-dialogue" style="position:relative;z-index:2;">Waiting for host…</div>

    <!-- Timer bar -->
    <div id="mpg-timer-bar"><div id="mpg-timer-fill" style="width:100%"></div></div>

    <!-- Answers -->
    <div id="mpg-answers"></div>
  </div>

  <!-- OVERLAY (win/lose) -->
  <div id="mpg-overlay">
    <div id="mpg-overlay-title"></div>
    <div id="mpg-overlay-sub"></div>
    <button class="mpg-back-btn" onclick="window.__mpExitGame()">← Back to Lobby</button>
  </div>
  `;

  _renderTopBar();
  window.__mpExitGame = _exitGame;
}

/* ── top bar chips ── */
function _renderTopBar() {
  const bar = document.getElementById('mpg-topbar');
  if (!bar) return;
  bar.innerHTML = MP.players.map(p => {
    const hpPct = Math.round((p.hp / p.maxHp) * 100);
    const hpCls = hpPct <= 25 ? 'crit' : hpPct <= 50 ? 'low' : '';
    const avatar = p.avatarData
      ? `<img class="mpg-chip-avatar" src="${p.avatarData}">`
      : `<div class="mpg-chip-avatar" style="background:${p.color}22;">${p.name[0]}</div>`;
    return `
      <div class="mpg-player-chip${p.fainted ? ' fainted' : ''}" id="mpg-chip-${p.id}">
        ${avatar}
        <div>
          <div class="mpg-chip-name">${p.name}${p.id === MP.selfId ? ' (you)' : ''}</div>
          <div class="mpg-chip-hp ${hpCls}">${p.hp}/${p.maxHp}</div>
        </div>
      </div>`;
  }).join('');
}

function _updateChipState(playerId, state) {
  // state: 'answering' | 'correct' | 'wrong' | 'idle'
  const chip = document.getElementById(`mpg-chip-${playerId}`);
  if (!chip) return;
  chip.classList.remove('answering','correct','wrong');
  if (state !== 'idle') chip.classList.add(state);
}

/* ══════════════════════════════════════════════════
   BOSS LIFECYCLE
   ══════════════════════════════════════════════════ */
async function _startBoss() {
  const boss     = MP.bosses[MP.bossIndex];
  if (!boss) { _gameOver(true); return; }

  MP.bossHp      = boss.maxHp;
  MP.questionPool = [];
  MP.poolIndex    = 0;
  MP.answered     = {};

  // Update UI
  document.getElementById('mpg-boss-name').textContent = boss.name;
  const typeEl = document.getElementById('mpg-boss-type');
  typeEl.textContent    = boss.type || '???';
  typeEl.style.color    = boss.typeColor || '#60a5fa';
  typeEl.style.background = (boss.typeColor || '#60a5fa') + '20';

  const overlay = document.getElementById('mpg-arena-overlay');
  if (overlay) overlay.style.background = boss.typeBg || 'rgba(96,165,250,0.15)';

  // Sprite
  const spriteImg   = document.getElementById('mpg-boss-sprite');
  const spriteEmoji = document.getElementById('mpg-boss-emoji');
  if (boss.image) {
    spriteImg.src = boss.image; spriteImg.style.display = '';
    spriteEmoji.style.display = 'none';
    spriteImg.style.animation = 'mpg-entry 0.4s ease';
  } else {
    spriteImg.style.display = 'none';
    spriteEmoji.textContent = boss.emoji || '🤖';
    spriteEmoji.style.display = '';
    spriteEmoji.style.animation = 'mpg-entry 0.4s ease';
  }

  _setBossHp(boss.maxHp, boss.maxHp);
  document.getElementById('mpg-answers').innerHTML = '';
  document.getElementById('mpg-timer-fill').style.width = '0%';

  await _typewrite(boss.intro || `${boss.name} appears!`);
  await sleep(1000);

  if (MP.isHost) {
    // Host fetches questions then broadcasts + displays first question locally
    await _typewrite('Loading questions…');
    try {
      const qs = await AI.fetchQuestions(boss);
      MP.questionPool = qs && qs.length ? qs : _fallbackQuestions(boss);
    } catch {
      MP.questionPool = _fallbackQuestions(boss);
    }
    MP.poolIndex     = 0;
    MP.questionIndex = 0;
    _askQuestion();
  } else {
    // Guests wait — host will push MP_QUESTION when ready
    await _typewrite('Waiting for host…');
  }
}

function _fallbackQuestions(boss) {
  return [{
    q: `What subject does ${boss.name} specialise in?`,
    a: boss.type || 'Unknown',
    w: ['Physics', 'Art', 'Geography'],
  }];
}

/* ══════════════════════════════════════════════════
   QUESTION FLOW
   ══════════════════════════════════════════════════ */
function _askQuestion() {
  if (!MP.isHost) return;   // only host drives questions
  if (MP.poolIndex >= MP.questionPool.length) {
    MP.poolIndex = 0;
  }
  const q = MP.questionPool[MP.poolIndex++];
  MP.questionIndex++;

  const shuffledAns = shuffle([q.a, ...q.w]);

  // Broadcast to guests
  _send({
    type:          'MP_QUESTION',
    question:      q,
    shuffledAns,
    questionIndex: MP.questionIndex,
  });

  // Host also displays it locally (doesn't receive its own RELAY echo reliably)
  _displayQuestion(q, shuffledAns, MP.questionIndex);
}

/* Receive & display a question (called for everyone, including host) */
function _displayQuestion(q, shuffledAns, questionIndex) {
  MP.currentQ    = q;
  MP.shuffledAns = shuffledAns;
  MP.questionIndex = questionIndex;
  MP.answered    = {};

  // Reset chip states
  MP.players.forEach(p => _updateChipState(p.id, 'idle'));

  _typewrite(q.q, 18);
  _showAnswers(shuffledAns);
  _startTimer();
}

function _showAnswers(answers) {
  const wrap = document.getElementById('mpg-answers');
  if (!wrap) return;
  wrap.innerHTML = answers.map((a, i) => `
    <button class="mpg-ans-btn" id="mpg-ans-${i}" onclick="window.__mpAnswer(${i})">
      <span class="mpg-ans-label">${a}</span>
      <div class="mpg-ans-icons" id="mpg-ans-icons-${i}"></div>
    </button>
  `).join('');
  window.__mpAnswer = _selectAnswer;
}

function _disableAnswers() {
  document.querySelectorAll('.mpg-ans-btn').forEach(b => b.disabled = true);
}

/* ══════════════════════════════════════════════════
   ANSWER HANDLING
   ══════════════════════════════════════════════════ */
function _selectAnswer(idx) {
  // Prevent double-answer
  if (MP.answered[MP.selfId] !== undefined) return;
  const q       = MP.currentQ;
  const correct = MP.shuffledAns[idx] === q.a;
  const boss    = MP.bosses[MP.bossIndex];
  const damage  = correct ? (boss?.dmgTaken ?? 25) : 0;

  // Mark locally immediately
  MP.answered[MP.selfId] = { answerIndex: idx, correct, damage };

  // Animate self button
  _animateMyAnswer(idx, correct);
  _updateChipState(MP.selfId, correct ? 'correct' : 'wrong');

  // Broadcast answer
  _send({
    type:          'MP_ANSWER',
    playerId:      MP.selfId,
    questionIndex: MP.questionIndex,
    answerIndex:   idx,
    correct,
    damage,
  });

  // Check if all alive players have answered
  _checkAllAnswered();
}

function _animateMyAnswer(idx, correct) {
  const btn = document.getElementById(`mpg-ans-${idx}`);
  if (btn) {
    btn.classList.add(correct ? 'correct' : 'wrong');
  }
  // Dim other buttons so player sees their pick
  document.querySelectorAll('.mpg-ans-btn').forEach((b, i) => {
    if (i !== idx) b.style.opacity = '0.45';
  });
}

function _receiveAnswer(msg) {
  if (msg.questionIndex !== MP.questionIndex) return;
  const player = MP.players.find(p => p.id === msg.playerId);
  if (!player || player.fainted) return;

  MP.answered[msg.playerId] = {
    answerIndex: msg.answerIndex,
    correct:     msg.correct,
    damage:      msg.damage,
  };

  // Show avatar icon on the answer button they picked
  _addAnswerIcon(msg.answerIndex, player);
  _updateChipState(msg.playerId, msg.correct ? 'correct' : 'wrong');

  _checkAllAnswered();
}

function _addAnswerIcon(ansIdx, player) {
  const iconWrap = document.getElementById(`mpg-ans-icons-${ansIdx}`);
  if (!iconWrap) return;
  const icon = document.createElement('div');
  icon.className = 'mpg-ans-icon';
  icon.style.border = `1px solid ${player.color}`;
  if (player.avatarData) {
    icon.innerHTML = `<img src="${player.avatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    icon.textContent = player.name[0];
    icon.style.background = player.color + '33';
  }
  iconWrap.appendChild(icon);
}

function _checkAllAnswered() {
  const alive = MP.players.filter(p => !p.fainted);
  const allIn = alive.every(p => MP.answered[p.id] !== undefined);
  if (!allIn) return;

  _stopTimer();
  if (MP.isHost) {
    // Brief pause so everyone sees each other's choices, then host resolves
    setTimeout(_resolveRound, 900);
  }
}

/* ══════════════════════════════════════════════════
   ROUND RESOLUTION (host only — broadcasts result)
   ══════════════════════════════════════════════════ */
async function _resolveRound() {
  _disableAnswers();

  const boss        = MP.bosses[MP.bossIndex];
  const correctAns  = MP.currentQ.a;
  const correctIdx  = MP.shuffledAns.indexOf(correctAns);

  // Tally damage to boss
  let totalDmg = 0;
  const results = {};
  for (const [pid, ans] of Object.entries(MP.answered)) {
    if (ans.correct) totalDmg += ans.damage;
    results[pid] = ans;
  }

  // Damage to players who got it wrong
  const playerUpdates = {};
  for (const player of MP.players) {
    if (player.fainted) continue;
    const ans = MP.answered[player.id];
    if (!ans || !ans.correct) {
      const newHp = Math.max(0, player.hp - (boss?.dmgDealt ?? 15));
      playerUpdates[player.id] = newHp;
    }
  }

  // Advance boss HP
  MP.bossHp = Math.max(0, MP.bossHp - totalDmg);

  const resultMsg = {
    type:         'MP_ROUND_RESULT',
    correctIdx,
    results,
    bossHp:       MP.bossHp,
    bossMaxHp:    boss.maxHp,
    playerUpdates,
    totalDmg,
  };

  // Broadcast to guests
  _send(resultMsg);

  // Host applies locally (won't receive its own echo due to listener guard)
  _applyRoundResult(resultMsg);
}

async function _applyRoundResult(msg) {
  _disableAnswers();
  _stopTimer();

  const boss       = MP.bosses[MP.bossIndex];
  const correctIdx = msg.correctIdx;
  const correctAns = MP.shuffledAns[correctIdx];

  // Reveal correct / wrong on buttons
  document.querySelectorAll('.mpg-ans-btn').forEach((btn, i) => {
    btn.style.opacity = '1';
    if (i === correctIdx) btn.classList.add('correct');
  });

  // Show answer icons for latecomers (host already showed live, but sync for all)
  for (const [pid, ans] of Object.entries(msg.results)) {
    const player = MP.players.find(p => p.id === pid);
    if (player) _addAnswerIconIfMissing(ans.answerIndex, player);
  }

  // Update boss HP
  MP.bossHp = msg.bossHp;
  _setBossHp(msg.bossHp, msg.bossMaxHp);
  if (msg.totalDmg > 0) _hitBossSprite();

  // Update player HPs
  for (const [pid, newHp] of Object.entries(msg.playerUpdates)) {
    const p = MP.players.find(pl => pl.id === pid);
    if (!p) continue;
    p.hp = newHp;
    if (newHp <= 0) p.fainted = true;
  }
  _renderTopBar();

  // Feedback message
  const selfAns = msg.results[MP.selfId];
  let feedbackLines = [];
  if (selfAns?.correct)  feedbackLines.push(`✓ Correct! You dealt ${selfAns.damage} dmg!`);
  else if (selfAns)      feedbackLines.push(`✗ Wrong! Answer: ${correctAns}`);

  const correctCount = Object.values(msg.results).filter(r => r.correct).length;
  feedbackLines.push(`${correctCount}/${Object.keys(msg.results).length} got it right — ${msg.totalDmg} total damage!`);

  if (MP.players.some(p => p.fainted && msg.playerUpdates[p.id] <= 0)) {
    const fainted = MP.players.filter(p => p.fainted).map(p => p.name).join(', ');
    feedbackLines.push(`💀 ${fainted} fainted!`);
  }

  await _typewrite(feedbackLines.join('\n'));
  await sleep(1800);

  // Check win / all fainted
  const allFainted = MP.players.every(p => p.fainted);
  if (allFainted) { if (MP.isHost) { _send({ type: 'MP_GAME_OVER', win: false }); _gameOver(false); } return; }

  if (MP.bossHp <= 0) {
    // Boss defeated!
    _hitBossSprite();
    await _typewrite(`${boss.defeat || `${boss.name} fainted!`}`);
    await sleep(1200);
    MP.bossIndex++;
    if (MP.bossIndex < MP.bosses.length) {
      await _typewrite('A new challenger approaches!');
      await sleep(1000);
      if (MP.isHost) _startBoss();
    } else {
      if (MP.isHost) { _send({ type: 'MP_GAME_OVER', win: true }); _gameOver(true); }
    }
  } else {
    if (MP.isHost) _askQuestion();
  }
}

function _addAnswerIconIfMissing(ansIdx, player) {
  const wrap = document.getElementById(`mpg-ans-icons-${ansIdx}`);
  if (!wrap) return;
  // don't double-add
  const already = wrap.querySelector(`[data-pid="${player.id}"]`);
  if (already) return;
  const icon = document.createElement('div');
  icon.className  = 'mpg-ans-icon';
  icon.dataset.pid = player.id;
  icon.style.border = `1px solid ${player.color}`;
  if (player.avatarData) {
    icon.innerHTML = `<img src="${player.avatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    icon.textContent = player.name[0];
    icon.style.background = player.color + '33';
  }
  wrap.appendChild(icon);
}

/* ══════════════════════════════════════════════════
   TIMER
   ══════════════════════════════════════════════════ */
function _startTimer() {
  _stopTimer();
  const fill  = document.getElementById('mpg-timer-fill');
  const start = Date.now();
  fill.style.transition = 'none';
  fill.style.width      = '100%';
  fill.style.background = '#4ade80';

  MP.timerInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct     = Math.max(0, 100 - (elapsed / ANSWER_TIMEOUT_MS) * 100);
    fill.style.width = pct + '%';
    if (pct < 33) fill.style.background = '#e94560';
    else if (pct < 66) fill.style.background = '#f59e0b';

    if (elapsed >= ANSWER_TIMEOUT_MS) {
      _stopTimer();
      // Auto-submit unanswered (treated as wrong)
      if (MP.answered[MP.selfId] === undefined) {
        // No answer = wrong
        MP.answered[MP.selfId] = { answerIndex: -1, correct: false, damage: 0 };
        _disableAnswers();
        _send({
          type: 'MP_ANSWER', playerId: MP.selfId,
          questionIndex: MP.questionIndex,
          answerIndex: -1, correct: false, damage: 0,
        });
        _updateChipState(MP.selfId, 'wrong');
        _checkAllAnswered();
      }
    }
  }, 100);
}

function _stopTimer() {
  if (MP.timerInterval) { clearInterval(MP.timerInterval); MP.timerInterval = null; }
}

/* ══════════════════════════════════════════════════
   WEBSOCKET — send / receive
   ══════════════════════════════════════════════════ */
function _send(payload) {
  if (!MP.socket || MP.socket.readyState !== WebSocket.OPEN) return;
  MP.socket.send(JSON.stringify({ type: 'RELAY', payload }));
}

function _listenSocket() {
  if (!MP.socket) return;
  const _origOnMessage = MP.socket.onmessage;

  MP.socket.addEventListener('message', (e) => {
    let outer;
    try { outer = JSON.parse(e.data); } catch { return; }
    if (outer.type !== 'RELAY') return;
    const msg = outer.payload;
    if (!msg?.type) return;

    switch (msg.type) {
      case 'MP_BOSS_LIST':
        // Guests receive boss list from host
        if (!MP.isHost) {
          MP.bosses    = msg.bosses;
          MP.bossIndex = 0;
          _startBoss();
        }
        break;

      case 'MP_QUESTION':
        // Host already displayed it locally in _askQuestion; ignore the echo
        if (!MP.isHost) _displayQuestion(msg.question, msg.shuffledAns, msg.questionIndex);
        break;

      case 'MP_ANSWER':
        _receiveAnswer(msg);
        break;

      case 'MP_ROUND_RESULT':
        // Host triggers this directly in _resolveRound; echo would double-apply
        if (!MP.isHost) _applyRoundResult(msg);
        break;

      case 'MP_GAME_OVER':
        if (!MP.isHost) _gameOver(msg.win);
        break;
    }
  });
}

/* ══════════════════════════════════════════════════
   GAME OVER
   ══════════════════════════════════════════════════ */
function _gameOver(win) {
  if (MP.gameOver) return;
  MP.gameOver = true;
  _stopTimer();

  const overlay = document.getElementById('mpg-overlay');
  if (!overlay) return;

  const title = document.getElementById('mpg-overlay-title');
  const sub   = document.getElementById('mpg-overlay-sub');

  if (win) {
    title.textContent = '🏆 VICTORY!';
    title.style.color = '#4ade80';
    const scores = MP.players.map(p =>
      `${p.name}: ${p.fainted ? '💀 fainted' : `${p.hp}/${p.maxHp} HP remaining`}`
    ).join('\n');
    sub.textContent = `All bosses defeated!\n\n${scores}`;
  } else {
    title.textContent = '💀 WIPED OUT';
    title.style.color = '#e94560';
    sub.textContent = 'Your whole team fainted!\nBetter study together next time!';
  }

  overlay.classList.add('active');
}

function _exitGame() {
  _stopTimer();
  const root = document.getElementById('mp-battle-root');
  if (root) root.remove();
  // Clean up globals
  delete window.__mpPlayers;
  delete window.__mpSocket;
  delete window.__mpSelf;
  delete window.__mpAnswer;
  delete window.__mpExitGame;
  // Go back to the multiplayer lobby / title
  if (typeof window.Multiplayer?._leave === 'function') {
    window.Multiplayer._leave();
  }
}

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */
function _getMaxHp() {
  try { return Config.player?.maxHp ?? 100; } catch { return 100; }
}

function _setBossHp(current, max) {
  const fill  = document.getElementById('mpg-boss-hp-fill');
  const nums  = document.getElementById('mpg-boss-hp-nums');
  const pct   = max > 0 ? (current / max) * 100 : 0;
  if (fill) {
    fill.style.width = pct + '%';
    fill.classList.remove('mid','low');
    if (pct < 25) fill.classList.add('low');
    else if (pct < 50) fill.classList.add('mid');
  }
  if (nums) nums.textContent = `${current}/${max}`;
}

function _hitBossSprite() {
  const img = document.getElementById('mpg-boss-sprite');
  const emo = document.getElementById('mpg-boss-emoji');
  const el  = img?.style.display !== 'none' ? img : emo;
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 350);
}

async function _typewrite(text, speed = 22) {
  const el = document.getElementById('mpg-dialogue');
  if (!el) return;
  el.textContent = '';
  for (const ch of (text || '')) {
    el.textContent += ch;
    await sleep(ch === '\n' ? speed * 3 : speed);
  }
}

/* ══════════════════════════════════════════════════
   MONKEY-PATCH window.startGame
   ══════════════════════════════════════════════════ */
const _originalStartGame = window.startGame;

window.startGame = function () {
  if (window.__mpPlayers && window.__mpPlayers.length > 1) {
    // Multiplayer mode
    mountMPGame();
  } else if (typeof _originalStartGame === 'function') {
    // Solo mode fallback
    _originalStartGame();
  }
};

/* ══════════════════════════════════════════════════
   WS-SERVER PATCH  (add to ws-server.js)
   ══════════════════════════════════════════════════

   Inside the ws.on('message') handler, add this block
   alongside your other message-type handlers:

   // ── RELAY (multiplayer game events) ──
   if (msg.type === 'RELAY') {
     if (!playerRoom) return;
     const room = rooms.get(playerRoom);
     if (!room) return;
     const str = JSON.stringify({ type: 'RELAY', payload: msg.payload });
     for (const { ws: peer } of room.players.values()) {
       if (peer !== ws && peer.readyState === peer.OPEN) {
         peer.send(str);
       }
     }
     // Echo back to sender too (so host gets their own broadcast)
     if (ws.readyState === ws.OPEN) ws.send(str);
     return;
   }

   ══════════════════════════════════════════════════ */