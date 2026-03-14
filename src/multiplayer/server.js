/* ═══════════════════════════════════════════
   multiplayer/server.js — Lobby & Room system
   Uses WebSockets — works across devices.
   Start the server: node ws-server.js
   ═══════════════════════════════════════════ */

const AVATARS  = ['🧑‍💻', '👾', '🤖', '🧙', '🦊', '🐉', '🎮', '🌟'];
const COLORS   = ['#e94560', '#4ade80', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6', '#34d399', '#fb923c'];
const WS_URL   = 'wss://unihack.up.railway.app/'; // ← change to your server address for real cross-device play

let mpState = {
  roomCode:   null,
  playerName: null,
  isHost:     false,
  playerId:   null,
  socket:     null,
  players:    [],
};

function _genId()   { return Math.random().toString(36).slice(2, 10); }
function _genName() {
  const adj  = ['Swift', 'Brave', 'Clever', 'Bold', 'Sharp', 'Quick', 'Wise', 'Sly'];
  const noun = ['Fox', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Eagle', 'Tiger', 'Shark'];
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)];
}
function _genCode() { return Math.random().toString(36).toUpperCase().slice(2, 8); }

export const Multiplayer = {

  mount(container) {
    container.innerHTML = `
      <style>
        #mp-root-inner { font-family: 'Press Start 2P', monospace; color: #f0f0f0; }
        .mp-btn { background:#e94560; color:#fff; border:none; border-bottom:3px solid #a01830; padding:10px 18px; font-family:inherit; font-size:8px; cursor:pointer; border-radius:4px; transition:transform 0.1s,border-bottom 0.1s; }
        .mp-btn:hover { transform:translateY(2px); border-bottom-width:1px; }
        .mp-btn:active { transform:translateY(3px); border-bottom-width:0; }
        .mp-btn:disabled { opacity:0.4; cursor:default; transform:none; }
        .mp-btn-ghost { background:transparent; border:2px solid rgba(255,255,255,0.2); color:#aaa; padding:8px 14px; font-family:inherit; font-size:7px; cursor:pointer; border-radius:4px; transition:all 0.12s; }
        .mp-btn-ghost:hover { border-color:#e94560; color:#fff; }
        .mp-input { background:#0d1a0d; border:2px solid #1a3a1a; border-radius:4px; color:#f0f0f0; font-family:inherit; font-size:12px; padding:10px 12px; outline:none; letter-spacing:6px; text-transform:uppercase; width:100%; transition:border-color 0.12s; box-sizing:border-box; }
        .mp-input:focus { border-color:#e94560; }
        .mp-code-box { background:#0d1a0d; border:2px dashed #2a4a2a; border-radius:6px; padding:16px; text-align:center; cursor:pointer; transition:border-color 0.15s; }
        .mp-code-box:hover { border-color:#e94560; }
        .mp-player-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#0d1a0d; border-radius:4px; border:1px solid #1a3a1a; }
        .mp-avatar { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
        .mp-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; flex-shrink:0; }
        .mp-label { font-size:5px; color:#c8a820; letter-spacing:2px; margin:0 0 8px; }
        .mp-status { font-size:7px; padding:8px 12px; border-radius:4px; line-height:2; background:#0d1a0d; margin-top:8px; min-height:14px; }
        .mp-tag { display:inline-block; font-size:5px; padding:3px 7px; border-radius:3px; letter-spacing:1px; background:#e9456020; color:#e94560; }
        .mp-err { font-size:7px; color:#e94560; min-height:14px; margin-top:4px; }
        .mp-view { display:none; flex-direction:column; gap:12px; }
        .mp-view.active { display:flex; }
        .mp-title { font-size:10px; color:#fff; letter-spacing:1px; }
      </style>

      <div id="mp-root-inner">

        <!-- HOME -->
        <div id="mpv-home" class="mp-view active">
          <div class="mp-title">MULTIPLAYER</div>
          <p style="font-size:7px;color:#aaa;line-height:2;margin:0;">Challenge a friend. Create a room or join one with a code.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="mp-btn" id="mp-create-btn">+ Create Room</button>
            <button class="mp-btn-ghost" id="mp-show-join-btn">Join Room →</button>
          </div>
        </div>

        <!-- JOIN FORM -->
        <div id="mpv-join" class="mp-view">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="mp-btn-ghost" id="mp-back-btn" style="padding:6px 10px;font-size:7px;">← Back</button>
            <span class="mp-title">JOIN ROOM</span>
          </div>
          <p class="mp-label">Enter room code</p>
          <input class="mp-input" id="mp-join-input" maxlength="6" placeholder="ABC123">
          <button class="mp-btn" id="mp-join-btn">Join →</button>
          <div class="mp-err" id="mp-join-err"></div>
        </div>

        <!-- LOBBY -->
        <div id="mpv-lobby" class="mp-view">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <span class="mp-title">LOBBY</span>
            <span class="mp-tag" id="mp-role-badge">HOST</span>
          </div>

          <div>
            <p class="mp-label">Room code — click to copy</p>
            <div class="mp-code-box" id="mp-code-box">
              <div id="mp-code-display" style="font-size:24px;letter-spacing:8px;color:#fff;">······</div>
              <div id="mp-copy-hint" style="font-size:6px;color:#aaa;margin-top:6px;letter-spacing:1px;">CLICK TO COPY</div>
            </div>
          </div>

          <div>
            <p class="mp-label">Players (<span id="mp-player-count">0</span>/4)</p>
            <div id="mp-player-list" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>

          <div class="mp-status" id="mp-lobby-status" style="color:#aaa;"></div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="mp-btn" id="mp-start-btn" disabled>▶ Start Game</button>
            <button class="mp-btn-ghost" id="mp-leave-btn">Leave</button>
          </div>
        </div>

      </div>
    `;

    // ── Wire up buttons ──
    container.querySelector('#mp-create-btn').onclick    = () => this._create();
    container.querySelector('#mp-show-join-btn').onclick = () => this._showJoin();
    container.querySelector('#mp-back-btn').onclick      = () => this._back();
    container.querySelector('#mp-join-btn').onclick      = () => this._join();
    container.querySelector('#mp-start-btn').onclick     = () => this._startGame();
    container.querySelector('#mp-leave-btn').onclick     = () => this._leave();
    container.querySelector('#mp-code-box').onclick      = () => this._copyCode();

    const codeInput = container.querySelector('#mp-join-input');
    codeInput.oninput   = () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    codeInput.onkeydown = (e) => { if (e.key === 'Enter') this._join(); };
  },

  // ── Views ──

  _show(viewId) {
    document.querySelectorAll('.mp-view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
  },

  _showJoin() {
    this._show('mpv-join');
    setTimeout(() => document.getElementById('mp-join-input')?.focus(), 50);
  },

  _back() {
    this._show('mpv-home');
    document.getElementById('mp-join-err').textContent = '';
  },

  // ── WebSocket connect ──

  _connect(onOpen) {
    this._setStatus('Connecting to server…', '#f59e0b');
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      mpState.socket = socket;
      onOpen(socket);
    };

    socket.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      this._handleMsg(msg);
    };

    socket.onclose = () => {
      if (mpState.socket) {
        this._setStatus('⚠ Disconnected from server.', '#e94560');
        mpState.socket = null;
      }
    };

    socket.onerror = () => {
      this._setStatus('⚠ Could not connect to server. Is ws-server.js running?', '#e94560');
    };
  },

  // ── Create ──

  _create() {
    const code = _genCode();
    mpState.roomCode   = code;
    mpState.isHost     = true;
    mpState.playerId   = _genId();
    mpState.playerName = _genName();

    this._connect((socket) => {
      socket.send(JSON.stringify({
        type:      'JOIN_REQUEST',
        code,
        id:        mpState.playerId,
        name:      mpState.playerName,
        avatarIdx: 0,
      }));
    });

    document.getElementById('mp-code-display').textContent = code;
    document.getElementById('mp-role-badge').textContent   = '⭐ HOST';
    this._renderPlayers([{ id: mpState.playerId, name: mpState.playerName, isHost: true, avatarIdx: 0 }]);
    this._setStatus('Connecting…', '#f59e0b');
    this._show('mpv-lobby');
  },

  // ── Join ──

  _join() {
    const code = document.getElementById('mp-join-input').value.trim();
    if (code.length < 4) {
      document.getElementById('mp-join-err').textContent = 'Enter a valid 4–6 character code.';
      return;
    }

    mpState.roomCode   = code;
    mpState.isHost     = false;
    mpState.playerId   = _genId();
    mpState.playerName = _genName();
    const avatarIdx    = Math.floor(Math.random() * AVATARS.length);

    this._connect((socket) => {
      socket.send(JSON.stringify({
        type: 'JOIN_REQUEST',
        code,
        id:        mpState.playerId,
        name:      mpState.playerName,
        avatarIdx,
      }));
    });

    document.getElementById('mp-code-display').textContent = code;
    document.getElementById('mp-role-badge').textContent   = '🎮 GUEST';
    document.getElementById('mp-start-btn').disabled       = true;
    this._renderPlayers([{ id: mpState.playerId, name: mpState.playerName, isHost: false, avatarIdx }]);
    this._setStatus('Connecting…', '#f59e0b');
    this._show('mpv-lobby');
  },

  // ── Message handler ──

  _handleMsg(msg) {
    if (!msg?.type) return;

    if (msg.type === 'ROOM_STATE') {
      mpState.players = msg.players;
      // Re-detect if we are host (server is source of truth)
      const me = msg.players.find(p => p.id === mpState.playerId);
      if (me) {
        mpState.isHost = me.isHost;
        document.getElementById('mp-role-badge').textContent = me.isHost ? '⭐ HOST' : '🎮 GUEST';
        document.getElementById('mp-start-btn').disabled = !me.isHost || msg.players.length < 2;
      }
      this._renderPlayers(msg.players);
      this._setStatus(
        msg.players.length >= 2
          ? (mpState.isHost ? 'Ready! Hit Start when everyone is in.' : 'Connected! Waiting for host to start…')
          : 'Waiting for players… share the room code!',
        '#4ade80'
      );
    }

    if (msg.type === 'ERROR') {
      this._setStatus('⚠ ' + msg.msg, '#e94560');
    }

    if (msg.type === 'GAME_START') {
      this._setStatus('▶ Game starting!', '#4ade80');
      setTimeout(() => this._launchGame(), 800);
    }
  },

  // ── Render players ──

  _renderPlayers(players) {
    const list  = document.getElementById('mp-player-list');
    const count = document.getElementById('mp-player-count');
    if (!list || !count) return;
    mpState.players = players;
    count.textContent = players.length;
    list.innerHTML = players.map((p, i) => `
      <div class="mp-player-row">
        <div class="mp-avatar" style="background:${COLORS[i % COLORS.length]}22;">${AVATARS[p.avatarIdx ?? i % AVATARS.length]}</div>
        <span style="font-size:7px;color:#f0f0f0;flex:1;">${p.name}${p.id === mpState.playerId ? ' <span style="font-size:5px;color:#aaa">(you)</span>' : ''}</span>
        ${p.isHost ? '<span class="mp-tag">HOST</span>' : ''}
        <div class="mp-dot"></div>
      </div>
    `).join('') || '<div style="font-size:7px;color:#555;padding:8px;">No players yet.</div>';
  },

  // ── Helpers ──

  _copyCode() {
    if (!mpState.roomCode) return;
    navigator.clipboard.writeText(mpState.roomCode).catch(() => {});
    const hint = document.getElementById('mp-copy-hint');
    if (!hint) return;
    hint.textContent = '✓ COPIED!';
    hint.style.color = '#4ade80';
    setTimeout(() => { hint.textContent = 'CLICK TO COPY'; hint.style.color = '#aaa'; }, 2000);
  },

  _setStatus(msg, color) {
    const el = document.getElementById('mp-lobby-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = color || '#aaa';
  },

  _startGame() {
    if (!mpState.isHost || mpState.players.length < 2 || !mpState.socket) return;
    mpState.socket.send(JSON.stringify({ type: 'GAME_START' }));
    this._setStatus('▶ Starting…', '#4ade80');
  },

  _launchGame() {
    console.log('🎮 Multiplayer game start! Players:', mpState.players);
    if (typeof window.startGame === 'function') window.startGame();
  },

  _leave() {
    if (mpState.socket) {
      mpState.socket.send(JSON.stringify({ type: 'PLAYER_LEFT' }));
      mpState.socket.close();
      mpState.socket = null;
    }
    mpState = { roomCode: null, playerName: null, isHost: false, playerId: null, socket: null, players: [] };
    this._show('mpv-home');
  },

};

window.Multiplayer = Multiplayer;