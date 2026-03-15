/* ═══════════════════════════════════════════
   multiplayer-game.js — Brain Battle MP Game
   ═══════════════════════════════════════════

   INTEGRATION — 3 steps:

   1. In index.html, load AFTER your other modules:
      <script type="module" src="multiplayer-game.js"></script>

   2. In server.js _launchGame(), inject context before calling startGame:
        _launchGame() {
          window.__mpPlayers = mpState.players;
          window.__mpSocket  = mpState.socket;
          window.__mpSelf    = mpState.playerId;
          if (typeof window.startGame === 'function') window.startGame();
        }

   3. In ws-server.js, add the RELAY handler inside ws.on('message'):
        if (msg.type === 'RELAY') {
          if (!playerRoom) return;
          const room = rooms.get(playerRoom);
          if (!room) return;
          const str = JSON.stringify({ type: 'RELAY', payload: msg.payload });
          for (const { ws: peer } of room.players.values()) {
            if (peer.readyState === peer.OPEN) peer.send(str);
          }
          return;
        }
      NOTE: This sends to ALL players including the sender — that's intentional.
   ═══════════════════════════════════════════ */

import { _loadConfig }  from '../core/config.js';
import { Presets }      from '../game/presets.js';
import { AI }           from '../ai/ai.js';
import { shuffle, sleep } from '../core/utils.js';
import { Player } from '../game/player.js';
import { Shop }   from '../ui/shop.js';

const ANSWER_TIMEOUT_MS = 20_000;
const COLORS = ['#e94560','#4ade80','#60a5fa','#f59e0b','#a78bfa','#f472b6'];

/* ─── runtime state (reset each game) ─── */
let MP = _freshState();

function _freshState() {
  return {
    players:       [],
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
    answered:      {},
    timerInterval: null,
    forceTimeout:  null,
    gameOver:      false,
    resolving:     false,  // guard against double _resolveRound
  };
}

/* ══════════════════════════════════════════════════
   ENTRY
   ══════════════════════════════════════════════════ */
function mountMPGame() {
  MP = _freshState();

  MP.players = (window.__mpPlayers || []).map((p, i) => ({
    id:         p.id,
    name:       p.name,
    avatarData: p.avatarData || null,
    isHost:     p.isHost,
    hp:         _getMaxHp(),
    maxHp:      _getMaxHp(),
    fainted:    false,
    color:      COLORS[i % COLORS.length],
  }));

  MP.selfId  = window.__mpSelf;
  MP.socket  = window.__mpSocket;
  MP.isHost  = MP.players.find(p => p.id === MP.selfId)?.isHost ?? false;

  // Load bosses from config + presets
  const cfg     = _loadConfig();
  const allBosses = [...Presets, ...(cfg.bosses || [])];
  MP.bosses = allBosses.length ? allBosses : Presets;

  // Mount UI
  let existing = document.getElementById('mp-battle-root');
  if (existing) existing.remove();
  const root = document.createElement('div');
  root.id = 'mp-battle-root';
  document.body.appendChild(root);
  _renderShell(root);

  // Wire up socket BEFORE sending anything
  _listenSocket();

  if (MP.isHost) {
  _send({ type: 'MP_BOSS_START', bossIndex: 0, bosses: MP.bosses }); // ← change this line only
  _startBoss(0);
}
  // Guests wait for MP_BOSS_START via socket
}

/* ══════════════════════════════════════════════════
   RENDER SHELL
   ══════════════════════════════════════════════════ */
function _renderShell(root) {
  root.innerHTML = `
  <style>
    #mp-battle-root {
      position: fixed; inset: 0; z-index: 9999;
      background: linear-gradient(160deg, #080f08 0%, #0b1218 50%, #0a0808 100%);
      font-family: 'Press Start 2P', monospace;
      color: #f0f0f0;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    #mpg-topbar {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 14px;
      background: rgba(0,0,0,0.45);
      border-bottom: 1px solid #1a3a1a;
      flex-shrink: 0;
    }
    .mpg-chip {
      display: flex; align-items: center; gap: 5px;
      background: #0d1a0d; border: 1px solid #1a3a1a; border-radius: 20px;
      padding: 3px 8px 3px 3px;
      transition: border-color 0.18s, box-shadow 0.18s, opacity 0.3s;
    }
    .mpg-chip.fainted  { opacity: 0.3; }
    .mpg-chip.correct  { border-color: #4ade80; box-shadow: 0 0 6px #4ade8055; }
    .mpg-chip.wrong    { border-color: #e94560; box-shadow: 0 0 6px #e9456055; }
    .mpg-chip.waiting  { border-color: #f59e0b; box-shadow: 0 0 6px #f59e0b33; }
    .mpg-chip-av {
      width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; overflow: hidden; border: 1px solid #2a4a2a;
    }
    .mpg-chip-av img { width: 100%; height: 100%; object-fit: cover; }
    .mpg-chip-name { font-size: 5px; color: #c8e8c8; }
    .mpg-chip-hp   { font-size: 5px; margin-left: 2px; }

    #mpg-arena {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; padding: 10px 20px;
      position: relative; overflow: hidden;
    }
    #mpg-arena-bg {
      position: absolute; inset: 0; pointer-events: none;
      transition: background 0.6s;
    }
    #mpg-boss-info { display: flex; align-items: center; gap: 10px; position: relative; z-index: 2; }
    #mpg-boss-name  { font-size: 9px; color: #fff; }
    #mpg-boss-type  { font-size: 6px; padding: 3px 7px; border-radius: 3px; }
    #mpg-boss-hp-wrap { width: 180px; position: relative; z-index: 2; }
    .mpg-hpbar { height: 9px; background: #1a2a1a; border-radius: 5px; overflow: hidden; border: 1px solid #2a4a2a; }
    .mpg-hpfill { height: 100%; background: linear-gradient(90deg,#4ade80,#22c55e); border-radius: 5px; transition: width 0.4s; }
    .mpg-hpfill.mid { background: linear-gradient(90deg,#f59e0b,#d97706); }
    .mpg-hpfill.low { background: linear-gradient(90deg,#e94560,#be123c); }
    .mpg-hpnums { font-size: 5px; color: #6a9a6a; text-align: right; margin-top: 2px; }

    #mpg-sprite-wrap { font-size: 64px; line-height: 1; position: relative; z-index: 2; }
    #mpg-sprite-img  { width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated; display: none; }
    #mpg-sprite-img.hit, #mpg-sprite-emoji.hit { animation: mpg-hit 0.3s; }

    #mpg-dialogue {
      position: relative; z-index: 2;
      background: rgba(0,0,0,0.72); border: 2px solid #2a4a2a; border-radius: 6px;
      padding: 12px 16px; width: 100%; max-width: 500px; box-sizing: border-box;
      font-size: 8px; line-height: 2.1; min-height: 48px; white-space: pre-wrap;
    }
    #mpg-timer-bar {
      width: 100%; max-width: 500px; height: 4px;
      background: #1a2a1a; border-radius: 2px; overflow: hidden; flex-shrink: 0;
      position: relative; z-index: 2;
    }
    #mpg-timer-fill { height: 100%; background: #4ade80; border-radius: 2px; }

    #mpg-answers {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; width: 100%; max-width: 500px;
      position: relative; z-index: 2;
    }
    .mpg-abtn {
      background: #0d1a0d; border: 2px solid #1a3a1a; border-radius: 4px;
      color: #f0f0f0; font-family: inherit; font-size: 7px; padding: 10px 8px;
      cursor: pointer; text-align: left; line-height: 1.7; position: relative;
      transition: border-color 0.1s, background 0.1s, transform 0.08s;
      min-height: 52px;
    }
    .mpg-abtn:hover:not(:disabled) { border-color: #e94560; transform: translateY(-1px); }
    .mpg-abtn:disabled { cursor: default; }
    .mpg-abtn.correct { border-color: #4ade80 !important; background: #0a2a14 !important; color: #4ade80; }
    .mpg-abtn.wrong   { border-color: #e94560 !important; background: #2a0a0a !important; color: #e94560; }
    .mpg-abtn.dim     { opacity: 0.4; }
    .mpg-icons { position: absolute; right: 5px; bottom: 4px; display: flex; gap: 2px; }
    .mpg-icon  {
      width: 14px; height: 14px; border-radius: 50%; font-size: 7px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .mpg-icon img { width: 100%; height: 100%; object-fit: cover; }

    #mpg-overlay {
      display: none; position: absolute; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.88);
      flex-direction: column; align-items: center; justify-content: center; gap: 14px;
    }
    #mpg-overlay.show { display: flex; }
    #mpg-overlay-title { font-size: 15px; letter-spacing: 2px; }
    #mpg-overlay-sub   { font-size: 7px; color: #aaa; line-height: 2.4; text-align: center; white-space: pre-wrap; }
    #mpg-back-btn {
      background: #e94560; color: #fff; border: none; border-bottom: 3px solid #a01830;
      padding: 10px 18px; font-family: inherit; font-size: 8px; cursor: pointer; border-radius: 4px;
    }

    @keyframes mpg-hit  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
    @keyframes mpg-pulse{ 0%,100%{opacity:1} 50%{opacity:0.35} }
  </style>

  <div id="mpg-topbar"></div>

  <div id="mpg-arena">
    <div id="mpg-arena-bg"></div>

    <div id="mpg-boss-info">
      <div id="mpg-boss-name">···</div>
      <div id="mpg-boss-type">???</div>
    </div>

    <div id="mpg-boss-hp-wrap">
      <div class="mpg-hpbar"><div class="mpg-hpfill" id="mpg-boss-hpfill" style="width:100%"></div></div>
      <div class="mpg-hpnums" id="mpg-boss-hpnums">·/·</div>
    </div>

    <div id="mpg-sprite-wrap">
      <img  id="mpg-sprite-img">
      <span id="mpg-sprite-emoji">🤖</span>
    </div>

    <div id="mpg-dialogue">Connecting…</div>
    <div id="mpg-timer-bar"><div id="mpg-timer-fill" style="width:0%"></div></div>
    <div id="mpg-answers"></div>
  </div>

  <div id="mpg-overlay">
    <div id="mpg-overlay-title"></div>
    <div id="mpg-overlay-sub"></div>
    <button id="mpg-back-btn">← Back to Lobby</button>
  </div>
  `;

  root.querySelector('#mpg-back-btn').onclick = _exitGame;
  _renderTopBar();
}

/* ══════════════════════════════════════════════════
   TOP BAR
   ══════════════════════════════════════════════════ */
function _renderTopBar() {
  const bar = document.getElementById('mpg-topbar');
  if (!bar) return;
  bar.innerHTML = MP.players.map(p => {
    const pct  = Math.round((p.hp / p.maxHp) * 100);
    const hpColor = pct <= 25 ? '#e94560' : pct <= 50 ? '#f59e0b' : '#4ade80';
    const av = p.avatarData
      ? `<div class="mpg-chip-av"><img src="${p.avatarData}"></div>`
      : `<div class="mpg-chip-av" style="background:${p.color}22;">${p.name[0]}</div>`;
    return `<div class="mpg-chip" id="mpg-chip-${p.id}">
      ${av}
      <span class="mpg-chip-name">${p.name}${p.id === MP.selfId ? ' ★' : ''}</span>
      <span class="mpg-chip-hp" style="color:${hpColor}">${p.hp}</span>
    </div>`;
  }).join('');
}

function _setChipState(pid, state) {
  const el = document.getElementById(`mpg-chip-${pid}`);
  if (!el) return;
  el.classList.remove('correct','wrong','waiting');
  if (state) el.classList.add(state);
}

/* ══════════════════════════════════════════════════
   BOSS SETUP
   ══════════════════════════════════════════════════ */
async function _startBoss(index) {
  MP.bossIndex   = index;
  MP.resolving   = false;
  MP.answered    = {};
  MP.questionPool = [];
  MP.poolIndex   = 0;
  MP.questionIndex = 0;

  const boss = MP.bosses[index];
  if (!boss) { _doGameOver(true); return; }

  MP.bossHp = boss.maxHp;

  // UI
  _el('mpg-boss-name').textContent = boss.name;
  const typeEl = _el('mpg-boss-type');
  typeEl.textContent  = boss.type || '???';
  typeEl.style.color  = boss.typeColor || '#60a5fa';
  typeEl.style.background = (boss.typeColor || '#60a5fa') + '22';
  _el('mpg-arena-bg').style.background = boss.typeBg || 'rgba(96,165,250,0.12)';
  _setBossHp(boss.maxHp, boss.maxHp);
  _el('mpg-answers').innerHTML = '';
  _el('mpg-timer-fill').style.width = '0%';
  _setChipState(null); // reset all

  // Sprite
  const img = _el('mpg-sprite-img');
  const emo = _el('mpg-sprite-emoji');
  if (boss.image) {
    img.src = boss.image; img.style.display = ''; emo.style.display = 'none';
  } else {
    img.style.display = 'none'; emo.textContent = boss.emoji || '🤖'; emo.style.display = '';
  }

  await _type(boss.intro || `${boss.name} appears!`);
  await sleep(900);

  if (MP.isHost) {
    await _type('Loading questions…');
    let qs;
    try   { qs = await AI.fetchQuestions(boss); }
    catch { qs = null; }
    if (!qs || !qs.length) qs = [{ q: `What is ${boss.name}'s subject?`, a: boss.type || '???', w: ['Art','Music','PE'] }];
    MP.questionPool = qs;
    MP.poolIndex    = 0;
    _nextQuestion();
  } else {
    await _type('Get ready…');
    // Guest waits for MP_QUESTION
  }
}

/* ══════════════════════════════════════════════════
   QUESTION FLOW
   ══════════════════════════════════════════════════ */
function _nextQuestion() {
  if (!MP.isHost) return;
  if (MP.poolIndex >= MP.questionPool.length) MP.poolIndex = 0;

  const q    = MP.questionPool[MP.poolIndex++];
  const ans  = shuffle([q.a, ...q.w]);
  const idx  = ++MP.questionIndex;

  MP.currentQ    = q;
  MP.shuffledAns = ans;
  MP.answered    = {};
  MP.resolving   = false;

  // Send to everyone (including self — simpler, avoids dual-path bugs)
  _send({ type: 'MP_QUESTION', q, ans, idx });
}

function _showQuestion(q, ans, idx) {
  MP.currentQ      = q;
  MP.shuffledAns   = ans;
  MP.questionIndex = idx;
  MP.answered      = {};
  MP.resolving     = false;

  if (MP.forceTimeout) { clearTimeout(MP.forceTimeout); MP.forceTimeout = null; }
  MP.players.forEach(p => _setChipState(p.id, p.fainted ? null : 'waiting'));

  _type(q.q, 18);

  const wrap = _el('mpg-answers');
  wrap.innerHTML = ans.map((a, i) =>
    `<button class="mpg-abtn" id="mpg-a${i}" onclick="window.__mpPick(${i})">${a}<div class="mpg-icons" id="mpg-ic${i}"></div></button>`
  ).join('');

  window.__mpPick = _pick;
  _startTimer();
}

/* ══════════════════════════════════════════════════
   ANSWERING
   ══════════════════════════════════════════════════ */
function _pick(idx) {
  if (MP.answered[MP.selfId] !== undefined) return;   // already answered
  if (MP.resolving) return;

  const correct = MP.shuffledAns[idx] === MP.currentQ.a;
  const damage  = correct ? (MP.bosses[MP.bossIndex]?.dmgTaken ?? 25) : 0;

  MP.answered[MP.selfId] = { idx, correct, damage };

  // Visual feedback immediately
  document.querySelectorAll('.mpg-abtn').forEach((b, i) => {
    if (i !== idx) b.classList.add('dim');
  });
  _el(`mpg-a${idx}`)?.classList.add(correct ? 'correct' : 'wrong');
  _setChipState(MP.selfId, correct ? 'correct' : 'wrong');
  _addIcon(idx, MP.players.find(p => p.id === MP.selfId));

  _send({ type: 'MP_ANSWER', pid: MP.selfId, qIdx: MP.questionIndex, idx, correct, damage });
  _checkDone();
}

function _onAnswer(msg) {
  // Ignore stale or duplicate
  if (msg.qIdx !== MP.questionIndex) return;
  if (MP.answered[msg.pid] !== undefined) return;

  MP.answered[msg.pid] = { idx: msg.idx, correct: msg.correct, damage: msg.damage };

  const player = MP.players.find(p => p.id === msg.pid);
  if (player && !player.fainted) {
    _setChipState(msg.pid, msg.correct ? 'correct' : 'wrong');
    _addIcon(msg.idx, player);
  }

  _checkDone();
}

function _checkDone() {
  const alive = MP.players.filter(p => !p.fainted);
  if (!alive.every(p => MP.answered[p.id] !== undefined)) return;

  _stopTimer();
  if (MP.forceTimeout) { clearTimeout(MP.forceTimeout); MP.forceTimeout = null; }

  if (MP.isHost && !MP.resolving) {
    MP.resolving = true;
    setTimeout(_resolveRound, 700);
  }
}

/* ══════════════════════════════════════════════════
   RESOLUTION (host computes, broadcasts to all incl. self)
   ══════════════════════════════════════════════════ */
function _resolveRound() {
  const boss = MP.bosses[MP.bossIndex];

  let totalDmg = 0;
  const results = {};
  for (const [pid, a] of Object.entries(MP.answered)) {
    results[pid] = a;
    if (a.correct) totalDmg += a.damage;
  }

  const playerHps = {};
  for (const p of MP.players) {
    if (p.fainted) continue;
    if (!MP.answered[p.id]?.correct) {
      playerHps[p.id] = Math.max(0, p.hp - (boss?.dmgDealt ?? 15));
    }
  }

  MP.bossHp = Math.max(0, MP.bossHp - totalDmg);

  // Send result to everyone including self
  _send({
    type:       'MP_RESULT',
    correctIdx: MP.shuffledAns.indexOf(MP.currentQ.a),
    results,
    bossHp:     MP.bossHp,
    bossMaxHp:  boss.maxHp,
    playerHps,
    totalDmg,
    bossIndex:  MP.bossIndex,
  });
}

async function _applyResult(msg) {
  _stopTimer();
  // Ignore if we've already moved to a different question/boss
  if (msg.bossIndex !== MP.bossIndex) return;

  _disableAnswers();

  const boss       = MP.bosses[MP.bossIndex];
  const correctIdx = msg.correctIdx;
  const correctAns = MP.shuffledAns[correctIdx] || '?';

  // Reveal buttons
  document.querySelectorAll('.mpg-abtn').forEach((b, i) => {
    b.classList.remove('dim');
    if (i === correctIdx) b.classList.add('correct');
    b.disabled = true;
  });

  // Show all icons
  for (const [pid, a] of Object.entries(msg.results)) {
    const p = MP.players.find(x => x.id === pid);
    if (p && a.idx >= 0) _addIconIfMissing(a.idx, p);
  }

  // Boss HP
  MP.bossHp = msg.bossHp;
  _setBossHp(msg.bossHp, msg.bossMaxHp);
  if (msg.totalDmg > 0) _bossHit();

  // Player HPs
  for (const [pid, hp] of Object.entries(msg.playerHps)) {
    const p = MP.players.find(x => x.id === pid);
    if (!p) continue;
    p.hp = hp;
    if (hp <= 0) p.fainted = true;
  }
  _renderTopBar();

  // Feedback
  const selfA = msg.results[MP.selfId];
  const lines = [];
  if (selfA?.correct) lines.push(`✓ Correct! Dealt ${selfA.damage} dmg!`);
  else                lines.push(`✗ Wrong! Answer: ${correctAns}`);
  const nCorrect = Object.values(msg.results).filter(r => r.correct).length;
  lines.push(`${nCorrect}/${Object.keys(msg.results).length} correct — ${msg.totalDmg} total dmg!`);
  const newlyFainted = MP.players.filter(p => p.fainted && msg.playerHps[p.id] !== undefined && msg.playerHps[p.id] <= 0);
  if (newlyFainted.length) lines.push(`💀 ${newlyFainted.map(p=>p.name).join(', ')} fainted!`);

  await _type(lines.join('\n'));
  await sleep(1600);

  const allFainted = MP.players.every(p => p.fainted);
  if (allFainted) { _doGameOver(false); return; }

  if (msg.bossHp <= 0) {
    _bossHit();
    await _type(boss.defeat || `${boss.name} fainted!`);
    await sleep(1000);

    const nextIdx = MP.bossIndex + 1;
    if (nextIdx < MP.bosses.length) {
      await _type('A new challenger approaches!');
      await sleep(800);
      if (MP.isHost) _send({ type: 'MP_BOSS_START', bossIndex: nextIdx, bosses: [] });
      _startBoss(nextIdx);
    } else {
      _doGameOver(true);
    }
  } else {
    if (MP.isHost) _nextQuestion();
  }
}

/* ══════════════════════════════════════════════════
   GAME OVER
   ══════════════════════════════════════════════════ */
function _doGameOver(win) {
  if (MP.gameOver) return;
  MP.gameOver = true;
  _stopTimer();
// ← ADD THIS BLOCK

  if (win) {
  if (Player.questsUnlocked) {
    const quest = Shop.getQuest('q_mp_win');
    const prog  = Player.getQuestProgress('q_mp_win');
    if (quest && !prog.completed) {
      Player.completeQuest('q_mp_win');
      Player.awardXP(quest.reward.xp);
      Player.awardCoins(quest.reward.coins);
    }
  }
}

  const overlay = _el('mpg-overlay');
  if (!overlay) return;
  overlay.classList.add('show');

  _el('mpg-overlay-title').textContent = win ? '🏆 VICTORY!' : '💀 WIPED OUT';
  _el('mpg-overlay-title').style.color = win ? '#4ade80' : '#e94560';
  _el('mpg-overlay-sub').textContent   = win
    ? `All bosses defeated!\n\n${MP.players.map(p => `${p.name}: ${p.fainted ? '💀' : `${p.hp}/${p.maxHp} HP`}`).join('\n')}`
    : 'Your whole team fainted!\nStudy harder next time!';
}

/* ══════════════════════════════════════════════════
   SOCKET — send & receive
   ══════════════════════════════════════════════════ */
function _send(payload) {
  if (!MP.socket || MP.socket.readyState !== WebSocket.OPEN) return;
  MP.socket.send(JSON.stringify({ type: 'RELAY', payload }));
}

function _listenSocket() {
  if (!MP.socket) return;
  MP.socket.addEventListener('message', (e) => {
    let outer;
    try { outer = JSON.parse(e.data); } catch { return; }
    if (outer.type !== 'RELAY') return;
    const msg = outer.payload;
    if (!msg?.type) return;

    switch (msg.type) {

      case 'MP_BOSS_START':
  if (!MP.isHost) {
    if (msg.bosses?.length) {
      const cfg = _loadConfig();
      const localBosses = [...Presets, ...(cfg.bosses || [])];
      MP.bosses = msg.bosses.map(b => {
        const local = localBosses.find(l => l.id === b.id);
        return local ? { ...b, image: local.image || b.image, emoji: local.emoji || b.emoji } : b;
      });
    }
    _startBoss(msg.bossIndex);
  }
  break;

      case 'MP_QUESTION':
        // Everyone shows the question (host sent it to all via RELAY, incl. itself)
        _showQuestion(msg.q, msg.ans, msg.idx);
        break;

      case 'MP_ANSWER':
        // Everyone tracks answers (so all see icons appear live)
        _onAnswer(msg);
        break;

      case 'MP_RESULT':
        // Everyone applies the result
        _applyResult(msg);
        break;
    }
  });
}

/* ══════════════════════════════════════════════════
   TIMER
   ══════════════════════════════════════════════════ */
function _startTimer() {
  _stopTimer();
  const fill  = _el('mpg-timer-fill');
  const start = Date.now();
  if (fill) { fill.style.width = '100%'; fill.style.background = '#4ade80'; }

  MP.timerInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct     = Math.max(0, 100 - (elapsed / ANSWER_TIMEOUT_MS) * 100);
    if (fill) {
      fill.style.width = pct + '%';
      fill.style.background = pct < 33 ? '#e94560' : pct < 66 ? '#f59e0b' : '#4ade80';
    }
    if (elapsed >= ANSWER_TIMEOUT_MS) {
      _stopTimer();
      // Auto-submit self as wrong if not answered
      if (MP.answered[MP.selfId] === undefined) {
        MP.answered[MP.selfId] = { idx: -1, correct: false, damage: 0 };
        _setChipState(MP.selfId, 'wrong');
        _send({ type: 'MP_ANSWER', pid: MP.selfId, qIdx: MP.questionIndex, idx: -1, correct: false, damage: 0 });
      }
      // Host resolves after short grace period for any in-flight answers
      if (MP.isHost && !MP.resolving) {
        MP.forceTimeout = setTimeout(() => {
          if (MP.resolving) return;
          // Fill in any missing answers as wrong
          MP.players.filter(p => !p.fainted).forEach(p => {
            if (MP.answered[p.id] === undefined) {
              MP.answered[p.id] = { idx: -1, correct: false, damage: 0 };
              _setChipState(p.id, 'wrong');
            }
          });
          MP.resolving = true;
          _resolveRound();
        }, 1500);
      }
    }
  }, 100);
}

function _stopTimer() {
  if (MP.timerInterval) { clearInterval(MP.timerInterval); MP.timerInterval = null; }
}

/* ══════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════ */
function _el(id)       { return document.getElementById(id); }
function _getMaxHp()   { try { return _loadConfig().player?.maxHp ?? 100; } catch { return 100; } }
function _disableAnswers() { document.querySelectorAll('.mpg-abtn').forEach(b => { b.disabled = true; }); }

function _setBossHp(cur, max) {
  const fill = _el('mpg-boss-hpfill');
  const nums = _el('mpg-boss-hpnums');
  const pct  = max > 0 ? (cur / max) * 100 : 0;
  if (fill) {
    fill.style.width = pct + '%';
    fill.classList.remove('mid','low');
    if (pct < 25) fill.classList.add('low');
    else if (pct < 50) fill.classList.add('mid');
  }
  if (nums) nums.textContent = `${cur}/${max}`;
}

function _bossHit() {
  const img = _el('mpg-sprite-img');
  const emo = _el('mpg-sprite-emoji');
  const el  = img?.style.display !== 'none' ? img : emo;
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 320);
}

function _addIcon(ansIdx, player) {
  if (!player || ansIdx < 0) return;
  const wrap = _el(`mpg-ic${ansIdx}`);
  if (!wrap) return;
  const icon = document.createElement('div');
  icon.className = 'mpg-icon';
  icon.dataset.pid = player.id;
  icon.style.border = `1px solid ${player.color}`;
  if (player.avatarData) {
    icon.innerHTML = `<img src="${player.avatarData}">`;
  } else {
    icon.textContent = player.name[0];
    icon.style.background = player.color + '33';
  }
  wrap.appendChild(icon);
}

function _addIconIfMissing(ansIdx, player) {
  if (!player || ansIdx < 0) return;
  const wrap = _el(`mpg-ic${ansIdx}`);
  if (!wrap || wrap.querySelector(`[data-pid="${player.id}"]`)) return;
  _addIcon(ansIdx, player);
}

async function _type(text, speed = 20) {
  const el = _el('mpg-dialogue');
  if (!el) return;
  el.textContent = '';
  for (const ch of (text || '')) {
    el.textContent += ch;
    await sleep(ch === '\n' ? speed * 4 : speed);
  }
}

function _exitGame() {
  _stopTimer();
  if (MP.forceTimeout) clearTimeout(MP.forceTimeout);
  document.getElementById('mp-battle-root')?.remove();
  delete window.__mpPick;
  if (typeof window.Multiplayer?._leave === 'function') window.Multiplayer._leave();
}

/* ══════════════════════════════════════════════════
   PATCH window.startGame
   ══════════════════════════════════════════════════ */
const _origStart = window.startGame;
window.startGame = function() {
  if (window.__mpPlayers?.length >= 2) {
    mountMPGame();
  } else if (typeof _origStart === 'function') {
    _origStart();
  }
};