/* ═══════════════════════════════════════════
   multiplayer/server.js — Lobby & Room system
   Features: room browser, public/private,
   custom name + image (session-only),
   boss picker (host selects active bosses)
   ═══════════════════════════════════════════ */

import { _loadConfig }  from '../core/config.js';
import { Presets }      from '../game/presets.js';

const COLORS = ['#e94560', '#4ade80', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6', '#34d399', '#fb923c'];
const WS_URL = 'wss://unihackserver.up.railway.app/';

let mpState = {
  roomCode:       null,
  playerName:     null,
  isHost:         false,
  isPrivate:      false,
  playerId:       null,
  socket:         null,
  players:        [],
  avatarData:     null,
  selectedBosses: null, // null = use all; array of boss ids when filtered
};

function _genId()   { return Math.random().toString(36).slice(2, 10); }
function _genCode() { return Math.random().toString(36).toUpperCase().slice(2, 8); }
function _genName() {
  const adj  = ['Swift', 'Brave', 'Clever', 'Bold', 'Sharp', 'Quick', 'Wise', 'Sly'];
  const noun = ['Fox', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Eagle', 'Tiger', 'Shark'];
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)];
}

/* ─── Load all available bosses (presets + config customs) ─── */
function _getAllBosses() {
  try {
    const cfg       = _loadConfig();
    const allBosses = [...Presets, ...(cfg.bosses || [])];
    return allBosses.length ? allBosses : Presets;
  } catch {
    return [...Presets];
  }
}

export const Multiplayer = {

  _listSocket:    null,
  _allBosses:     [],
  _checkedBosses: new Set(), // boss ids the host has ticked

  mount(container) {
    // Load bosses once on mount
    this._allBosses     = _getAllBosses();
    this._checkedBosses = new Set(this._allBosses.map(b => b.id));

    container.innerHTML = `
      <style>
        #mp-root-inner {
          font-family: 'Press Start 2P', monospace;
          color: #f0f0f0;
          min-height: 100%;
          background: linear-gradient(160deg, #0a1a0a 0%, #0d1a1a 50%, #0a0d1a 100%);
          padding: 20px;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
        }
        .mp-btn { background:#e94560; color:#fff; border:none; border-bottom:3px solid #a01830; padding:10px 18px; font-family:inherit; font-size:8px; cursor:pointer; border-radius:4px; transition:transform 0.1s,border-bottom 0.1s; position:relative; z-index:2; }
        .mp-btn:hover { transform:translateY(2px); border-bottom-width:1px; }
        .mp-btn:active { transform:translateY(3px); border-bottom-width:0; }
        .mp-btn:disabled { opacity:0.4; cursor:default; transform:none; }
        .mp-btn-ghost { background:transparent; border:2px solid rgba(255,255,255,0.2); color:#aaa; padding:8px 14px; font-family:inherit; font-size:7px; cursor:pointer; border-radius:4px; transition:all 0.12s; position:relative; z-index:2; }
        .mp-btn-ghost:hover { border-color:#e94560; color:#fff; }
        .mp-input-name {
          background:#0d1a0d; border:2px solid #1a3a1a; border-radius:4px; color:#f0f0f0;
          font-family:inherit; font-size:9px; padding:10px 12px; outline:none; width:100%;
          transition:border-color 0.12s; box-sizing:border-box; letter-spacing:1px;
          position:relative; z-index:2;
        }
        .mp-input-name:focus { border-color:#e94560; }
        .mp-input {
          background:#0d1a0d; border:2px solid #1a3a1a; border-radius:4px; color:#f0f0f0;
          font-family:inherit; font-size:12px; padding:10px 12px; outline:none;
          letter-spacing:6px; text-transform:uppercase; width:100%;
          transition:border-color 0.12s; box-sizing:border-box;
          position:relative; z-index:2;
        }
        .mp-input:focus { border-color:#e94560; }
        .mp-code-box { background:#0d1a0d; border:2px dashed #2a4a2a; border-radius:6px; padding:16px; text-align:center; cursor:pointer; transition:border-color 0.15s; position:relative; z-index:2; }
        .mp-code-box:hover { border-color:#e94560; }
        .mp-player-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#0d1a0d; border-radius:4px; border:1px solid #1a3a1a; }
        .mp-avatar-img { width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0; border:2px solid #1a3a1a; }
        .mp-avatar-placeholder { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
        .mp-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; flex-shrink:0; }
        .mp-label { font-size:5px; color:#c8a820; letter-spacing:2px; margin:0 0 8px; }
        .mp-status { font-size:7px; padding:8px 12px; border-radius:4px; line-height:2; background:#0d1a0d; margin-top:4px; min-height:14px; }
        .mp-tag { display:inline-block; font-size:5px; padding:3px 7px; border-radius:3px; letter-spacing:1px; background:#e9456020; color:#e94560; }
        .mp-tag-blue { display:inline-block; font-size:5px; padding:3px 7px; border-radius:3px; letter-spacing:1px; background:#60a5fa20; color:#60a5fa; }
        .mp-err { font-size:7px; color:#e94560; min-height:14px; margin-top:4px; }
        .mp-view { display:none; flex-direction:column; gap:14px; }
        .mp-view.active { display:flex; }
        .mp-title { font-size:10px; color:#fff; letter-spacing:1px; margin-bottom:4px; }
        .mp-section { background:#0d1a0d; border:1px solid #1a3a1a; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px; position:relative; z-index:2; }
        .mp-avatar-upload { display:flex; align-items:center; gap:12px; }
        .mp-avatar-preview {
          width:52px; height:52px; border-radius:50%; background:#1a2a1a;
          border:2px dashed #2a4a2a; display:flex; align-items:center; justify-content:center;
          font-size:22px; cursor:pointer; flex-shrink:0; overflow:hidden; transition:border-color 0.15s;
          position:relative; z-index:2;
        }
        .mp-avatar-preview:hover { border-color:#e94560; }
        .mp-avatar-preview img { width:100%; height:100%; object-fit:cover; }
        .mp-room-list { display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto; }
        .mp-room-row {
          display:flex; align-items:center; gap:10px; padding:8px 12px;
          background:#0a150a; border:1px solid #1a3a1a; border-radius:4px;
          cursor:pointer; transition:border-color 0.12s; position:relative; z-index:2;
        }
        .mp-room-row:hover { border-color:#e94560; }
        .mp-room-name { font-size:6px; color:#f0f0f0; flex:1; }
        .mp-room-count { font-size:5px; color:#aaa; }
        .mp-empty-rooms { font-size:6px; color:#3a5a3a; padding:12px; text-align:center; }
        .mp-privacy-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .mp-toggle {
          width:36px; height:18px; background:#1a2a1a; border:2px solid #2a4a2a;
          border-radius:10px; position:relative; cursor:pointer; transition:background 0.2s;
          flex-shrink:0; user-select:none; -webkit-user-select:none; z-index:2;
        }
        .mp-toggle.on { background:#1a5a2a; border-color:#4ade80; }
        .mp-toggle::after {
          content:''; position:absolute; width:10px; height:10px; background:#aaa;
          border-radius:50%; top:2px; left:2px; transition:transform 0.2s, background 0.2s;
          pointer-events:none;
        }
        .mp-toggle.on::after { transform:translateX(18px); background:#4ade80; }
        .mp-divider { border:none; border-top:1px solid #1a3a1a; margin:4px 0; }

        /* ── Boss Picker ── */
        #mp-boss-picker { display:flex; flex-direction:column; gap:6px; position:relative; z-index:2; }
        .mp-boss-row {
          display:flex; align-items:center; gap:9px;
          padding:7px 10px; border-radius:4px;
          border:2px solid #1a2a1a; background:#080f08;
          cursor:pointer; transition:border-color 0.12s, background 0.12s;
          user-select:none; -webkit-user-select:none;
        }
        .mp-boss-row.checked  { border-color:#1a4a2a; background:#0a1a0a; }
        .mp-boss-row:hover    { border-color:#e94560; }
        .mp-boss-cb {
          width:13px; height:13px; border:2px solid #2a4a2a; border-radius:2px;
          background:#0d1a0d; flex-shrink:0; display:flex; align-items:center;
          justify-content:center; font-size:8px; transition:background 0.12s, border-color 0.12s;
        }
        .mp-boss-row.checked .mp-boss-cb { background:#22c55e; border-color:#4ade80; color:#000; }
        .mp-boss-emoji { font-size:16px; flex-shrink:0; line-height:1; }
        .mp-boss-img   { width:20px; height:20px; object-fit:contain; image-rendering:pixelated; flex-shrink:0; }
        .mp-boss-info  { flex:1; min-width:0; }
        .mp-boss-name  { font-size:6px; color:#f0f0f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mp-boss-type  { font-size:4px; margin-top:2px; padding:2px 5px; border-radius:2px; display:inline-block; }
        .mp-boss-hp    { font-size:5px; color:#5a8a5a; flex-shrink:0; }
        .mp-boss-picker-actions { display:flex; gap:6px; }
        .mp-boss-picker-actions button {
          background:transparent; border:1px solid #2a4a2a; color:#5a8a5a;
          font-family:inherit; font-size:5px; padding:4px 8px; cursor:pointer;
          border-radius:3px; transition:all 0.1s;
        }
        .mp-boss-picker-actions button:hover { border-color:#4ade80; color:#4ade80; }
        .mp-boss-count { font-size:5px; color:#4ade80; margin-left:auto; }
        .mp-boss-section-header { display:flex; align-items:center; justify-content:space-between; }
        /* Guest read-only boss list */
        .mp-boss-guest-row {
          display:flex; align-items:center; gap:8px; padding:5px 10px;
          border-radius:4px; border:1px solid #1a2a1a; background:#080f08;
        }
        .mp-boss-guest-name { font-size:6px; color:#c8e8c8; }
        .mp-boss-guest-type { font-size:4px; padding:2px 5px; border-radius:2px; display:inline-block; }
      </style>

      <div id="mp-root-inner">

        <!-- ═══ HOME ═══ -->
        <div id="mpv-home" class="mp-view active">
          <div class="mp-title">⚔ MULTIPLAYER</div>
          <div class="mp-section">
            <div class="mp-label">YOUR PROFILE</div>
            <div class="mp-avatar-upload">
              <div class="mp-avatar-preview" id="mp-avatar-preview" title="Click to upload image">🧑‍💻
                <input type="file" id="mp-avatar-input" accept="image/*" style="display:none">
              </div>
              <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                <input class="mp-input-name" id="mp-name-input" maxlength="16" placeholder="Enter your name…">
                <div style="font-size:5px;color:#3a5a3a;">Click avatar to upload image (session only)</div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:2;">
            <button class="mp-btn" id="mp-create-btn">+ Create Room</button>
            <button class="mp-btn-ghost" id="mp-show-join-btn">Enter Code →</button>
          </div>
          <hr class="mp-divider">
          <div style="position:relative;z-index:2;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div class="mp-label" style="margin:0;">PUBLIC ROOMS</div>
              <button class="mp-btn-ghost" id="mp-refresh-btn" style="padding:4px 8px;font-size:5px;">↻ Refresh</button>
            </div>
            <div class="mp-room-list" id="mp-room-list">
              <div class="mp-empty-rooms">Loading rooms…</div>
            </div>
          </div>
        </div>

        <!-- ═══ JOIN FORM ═══ -->
        <div id="mpv-join" class="mp-view">
          <div style="display:flex;align-items:center;gap:10px;position:relative;z-index:2;">
            <button class="mp-btn-ghost" id="mp-back-btn" style="padding:6px 10px;font-size:7px;">← Back</button>
            <span class="mp-title">JOIN ROOM</span>
          </div>
          <div class="mp-label">Enter room code</div>
          <input class="mp-input" id="mp-join-input" maxlength="6" placeholder="ABC123">
          <button class="mp-btn" id="mp-join-btn">Join →</button>
          <div class="mp-err" id="mp-join-err"></div>
        </div>

        <!-- ═══ LOBBY ═══ -->
        <div id="mpv-lobby" class="mp-view">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;position:relative;z-index:2;">
            <span class="mp-title">LOBBY</span>
            <span class="mp-tag" id="mp-role-badge">HOST</span>
          </div>

          <div style="position:relative;z-index:2;">
            <div class="mp-label">Room code — click to copy</div>
            <div class="mp-code-box" id="mp-code-box">
              <div id="mp-code-display" style="font-size:24px;letter-spacing:8px;color:#fff;">······</div>
              <div id="mp-copy-hint" style="font-size:6px;color:#aaa;margin-top:6px;letter-spacing:1px;">CLICK TO COPY</div>
            </div>
          </div>

          <div id="mp-privacy-section" style="display:none;position:relative;z-index:2;">
            <div class="mp-section">
              <div class="mp-privacy-row">
                <div>
                  <div style="font-size:6px;color:#f0f0f0;margin-bottom:3px;" id="mp-privacy-label-text">🌐 Public Room</div>
                  <div style="font-size:5px;color:#5a7a5a;">Toggle to hide from room list</div>
                </div>
                <div class="mp-toggle" id="mp-privacy-toggle" role="button" tabindex="0"></div>
              </div>
            </div>
          </div>

          <div style="position:relative;z-index:2;">
            <div class="mp-label">Players (<span id="mp-player-count">0</span>/4)</div>
            <div id="mp-player-list" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>

          <!-- ═══ BOSS PICKER (host) / BOSS LIST (guest) ═══ -->
          <div class="mp-section" id="mp-boss-section">
            <div class="mp-boss-section-header">
              <div class="mp-label" style="margin:0;">⚔ BOSSES</div>
              <span class="mp-boss-count" id="mp-boss-count"></span>
            </div>
            <!-- host picker injected here -->
            <div id="mp-boss-picker"></div>
          </div>

          <div class="mp-status" id="mp-lobby-status" style="color:#aaa;position:relative;z-index:2;"></div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:2;">
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
    container.querySelector('#mp-refresh-btn').onclick   = () => this._requestRoomList();

    // Privacy toggle
    const toggle = container.querySelector('#mp-privacy-toggle');
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._togglePrivacy();
    });
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._togglePrivacy();
      }
    });

    // Name input
    const nameInput = container.querySelector('#mp-name-input');
    nameInput.value = _genName();

    // Avatar upload
    const avatarPreview = container.querySelector('#mp-avatar-preview');
    const avatarInput   = container.querySelector('#mp-avatar-input');
    avatarPreview.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => this._handleAvatarUpload(e));

    // Code input formatting
    const codeInput = container.querySelector('#mp-join-input');
    codeInput.oninput   = () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    codeInput.onkeydown = (e) => { if (e.key === 'Enter') this._join(); };

    this._restoreProfile();
    this._connectForListing();
  },

  // ── Restore avatar preview after remount ──
  _restoreProfile() {
    if (mpState.avatarData) {
      const preview = document.getElementById('mp-avatar-preview');
      if (preview) preview.innerHTML = `<img src="${mpState.avatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
  },

  // ── Avatar upload ──
  _handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx  = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        const sx   = (img.width  - size) / 2;
        const sy   = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 64, 64);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        mpState.avatarData = dataUrl;
        const preview = document.getElementById('mp-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  },

  _getPlayerName() {
    const input = document.getElementById('mp-name-input');
    return input?.value?.trim() || _genName();
  },

  // ── Views ──
  _show(viewId) {
    document.querySelectorAll('#mp-root-inner .mp-view').forEach(v => v.classList.remove('active'));
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
    this._requestRoomList();
  },

  // ══════════════════════════════════════════════
  // BOSS PICKER
  // ══════════════════════════════════════════════

  _renderBossPicker(isHost) {
    const wrap      = document.getElementById('mp-boss-picker');
    const countEl   = document.getElementById('mp-boss-count');
    if (!wrap) return;

    if (isHost) {
      // Build checked count label
      const checked = this._checkedBosses.size;
      if (countEl) countEl.textContent = `${checked}/${this._allBosses.length} selected`;

      let html = `<div class="mp-boss-picker-actions">
        <button id="mp-boss-all">Select All</button>
        <button id="mp-boss-none">Clear All</button>
      </div>`;

      html += this._allBosses.map(boss => {
        const on      = this._checkedBosses.has(boss.id);
        const typeClr = boss.typeColor || '#60a5fa';
        const sprite  = boss.image
          ? `<img class="mp-boss-img" src="${boss.image}">`
          : `<span class="mp-boss-emoji">${boss.emoji || '🤖'}</span>`;
        return `
          <div class="mp-boss-row ${on ? 'checked' : ''}" data-bid="${boss.id}">
            <div class="mp-boss-cb">${on ? '✓' : ''}</div>
            ${sprite}
            <div class="mp-boss-info">
              <div class="mp-boss-name">${boss.name}</div>
              <span class="mp-boss-type" style="color:${typeClr};background:${typeClr}22;">${boss.type || '???'}</span>
            </div>
            <div class="mp-boss-hp">❤ ${boss.maxHp}</div>
          </div>`;
      }).join('');

      wrap.innerHTML = html;

      // Row click
      wrap.querySelectorAll('.mp-boss-row').forEach(row => {
        row.addEventListener('click', () => {
          const bid = row.dataset.bid;
          if (this._checkedBosses.has(bid)) {
            // Don't allow deselecting the last boss
            if (this._checkedBosses.size <= 1) return;
            this._checkedBosses.delete(bid);
          } else {
            this._checkedBosses.add(bid);
          }
          this._renderBossPicker(true);
        });
      });

      document.getElementById('mp-boss-all')?.addEventListener('click', () => {
        this._allBosses.forEach(b => this._checkedBosses.add(b.id));
        this._renderBossPicker(true);
      });
      document.getElementById('mp-boss-none')?.addEventListener('click', () => {
        // Keep at least the first boss
        this._checkedBosses.clear();
        if (this._allBosses[0]) this._checkedBosses.add(this._allBosses[0].id);
        this._renderBossPicker(true);
      });

    } else {
      // Guest — read-only list of selected bosses sent from host via ROOM_STATE
      const activeBossIds  = mpState.selectedBosses;
      const bossesToShow   = activeBossIds
        ? this._allBosses.filter(b => activeBossIds.includes(b.id))
        : this._allBosses;

      if (countEl) countEl.textContent = `${bossesToShow.length} boss${bossesToShow.length !== 1 ? 'es' : ''}`;

      if (!bossesToShow.length) {
        wrap.innerHTML = `<div style="font-size:6px;color:#3a5a3a;padding:6px;">Waiting for host to select bosses…</div>`;
        return;
      }

      wrap.innerHTML = bossesToShow.map(boss => {
        const typeClr = boss.typeColor || '#60a5fa';
        const sprite  = boss.image
          ? `<img class="mp-boss-img" src="${boss.image}">`
          : `<span class="mp-boss-emoji" style="font-size:14px;">${boss.emoji || '🤖'}</span>`;
        return `
          <div class="mp-boss-guest-row">
            ${sprite}
            <span class="mp-boss-guest-name">${boss.name}</span>
            <span class="mp-boss-guest-type" style="color:${typeClr};background:${typeClr}22;">${boss.type || '???'}</span>
            <span class="mp-boss-hp" style="font-size:5px;color:#5a7a5a;margin-left:auto;">❤ ${boss.maxHp}</span>
          </div>`;
      }).join('');
    }
  },

  // Returns the ordered boss array the host has selected
  _getSelectedBosses() {
    return this._allBosses.filter(b => this._checkedBosses.has(b.id));
  },

  // ── FIX 1: Room listing — keep socket alive ──
  _connectForListing() {
    if (this._listSocket && this._listSocket.readyState !== WebSocket.CLOSED) {
      this._listSocket.onclose = null;
      this._listSocket.close();
    }

    try {
      const socket = new WebSocket(WS_URL);
      this._listSocket = socket;

      socket.onopen = () => socket.send(JSON.stringify({ type: 'LIST_ROOMS' }));

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'ROOM_LIST') this._renderRoomList(msg.rooms);
        } catch {}
      };

      socket.onerror = () => {
        const el = document.getElementById('mp-room-list');
        if (el) el.innerHTML = `<div class="mp-empty-rooms">Could not reach server.</div>`;
      };

      socket.onclose = () => {
        if (this._listSocket === socket) this._listSocket = null;
      };
    } catch {}
  },

  _requestRoomList() {
    if (mpState.socket?.readyState === WebSocket.OPEN) {
      mpState.socket.send(JSON.stringify({ type: 'LIST_ROOMS' }));
      return;
    }
    if (this._listSocket?.readyState === WebSocket.OPEN) {
      this._listSocket.send(JSON.stringify({ type: 'LIST_ROOMS' }));
      return;
    }
    this._connectForListing();
  },

  _renderRoomList(rooms) {
    const el = document.getElementById('mp-room-list');
    if (!el) return;
    if (!rooms || rooms.length === 0) {
      el.innerHTML = `<div class="mp-empty-rooms">No public rooms open. Create one!</div>`;
      return;
    }
    el.innerHTML = rooms.map(r => `
      <div class="mp-room-row" onclick="Multiplayer._quickJoin('${r.code}')">
        <div class="mp-room-name">🌐 ${r.hostName}'s room</div>
        <div class="mp-room-count">${r.playerCount}/4</div>
        <span class="mp-tag-blue">${r.code}</span>
        <button class="mp-btn" style="padding:4px 10px;font-size:6px;border-bottom-width:2px;">Join</button>
      </div>
    `).join('');
  },

  _quickJoin(code) {
    const codeInput = document.getElementById('mp-join-input');
    if (codeInput) codeInput.value = code;
    this._showJoin();
    setTimeout(() => this._join(), 100);
  },

  // ── WebSocket connect ──
  _connect(onOpen) {
    this._setStatus('Connecting to server…', '#f59e0b');
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => { mpState.socket = socket; onOpen(socket); };
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
      this._setStatus('⚠ Could not connect to server.', '#e94560');
    };
  },

  // ── Create ──
  _create() {
    const code = _genCode();
    mpState.roomCode   = code;
    mpState.isHost     = true;
    mpState.isPrivate  = false;
    mpState.playerId   = _genId();
    mpState.playerName = this._getPlayerName();

    // Reset boss selection to all on each new room
    this._checkedBosses = new Set(this._allBosses.map(b => b.id));

    this._connect((socket) => {
      socket.send(JSON.stringify({
        type:       'JOIN_REQUEST',
        code,
        id:         mpState.playerId,
        name:       mpState.playerName,
        avatarData: mpState.avatarData || null,
        isPrivate:  false,
      }));
    });

    document.getElementById('mp-code-display').textContent = code;
    document.getElementById('mp-role-badge').textContent   = '⭐ HOST';
    const privSection = document.getElementById('mp-privacy-section');
    if (privSection) privSection.style.display = 'block';
    this._renderPlayers([{ id: mpState.playerId, name: mpState.playerName, isHost: true, avatarData: mpState.avatarData }]);
    this._renderBossPicker(true);
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
    mpState.playerName = this._getPlayerName();

    this._connect((socket) => {
      socket.send(JSON.stringify({
        type:       'JOIN_REQUEST',
        code,
        id:         mpState.playerId,
        name:       mpState.playerName,
        avatarData: mpState.avatarData || null,
      }));
    });

    document.getElementById('mp-code-display').textContent = code;
    document.getElementById('mp-role-badge').textContent   = '🎮 GUEST';
    document.getElementById('mp-start-btn').disabled       = true;
    const privSection = document.getElementById('mp-privacy-section');
    if (privSection) privSection.style.display = 'none';
    this._renderPlayers([{ id: mpState.playerId, name: mpState.playerName, isHost: false, avatarData: mpState.avatarData }]);
    this._renderBossPicker(false);
    this._setStatus('Connecting…', '#f59e0b');
    this._show('mpv-lobby');
  },

  // ── Privacy toggle ──
  _togglePrivacy() {
    if (!mpState.isHost) { console.warn('Not host'); return; }
    if (!mpState.socket || mpState.socket.readyState !== WebSocket.OPEN) { console.warn('Socket not ready'); return; }

    const toggle = document.getElementById('mp-privacy-toggle');
    if (toggle) toggle.style.pointerEvents = 'none';

    mpState.socket.send(JSON.stringify({ type: 'TOGGLE_PRIVACY' }));
  },

  _updatePrivacyToggle(isPrivate) {
    mpState.isPrivate = isPrivate;
    const toggle = document.getElementById('mp-privacy-toggle');
    const label  = document.getElementById('mp-privacy-label-text');
    if (toggle) {
      toggle.classList.toggle('on', isPrivate);
      toggle.style.pointerEvents = '';
    }
    if (label) label.textContent = isPrivate ? '🔒 Private Room' : '🌐 Public Room';
  },

  // ── Message handler ──
  _handleMsg(msg) {
    if (!msg?.type) return;

    if (msg.type === 'ROOM_LIST') {
      this._renderRoomList(msg.rooms);
    }

    if (msg.type === 'ROOM_STATE') {
      mpState.players = msg.players;

      // Sync selectedBosses from room state (host broadcasts this)
      if (Array.isArray(msg.selectedBossIds)) {
        mpState.selectedBosses = msg.selectedBossIds;
      }

      const me = msg.players.find(p => p.id === mpState.playerId);
      if (me) {
        mpState.isHost = me.isHost;
        document.getElementById('mp-role-badge').textContent = me.isHost ? '⭐ HOST' : '🎮 GUEST';
        document.getElementById('mp-start-btn').disabled = !me.isHost || msg.players.length < 2;
        const privSection = document.getElementById('mp-privacy-section');
        if (privSection) privSection.style.display = me.isHost ? 'block' : 'none';
      }
      this._updatePrivacyToggle(msg.isPrivate);
      this._renderPlayers(msg.players);

      // Re-render boss picker in the correct mode
      const isHost = me?.isHost ?? mpState.isHost;
      this._renderBossPicker(isHost);

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
      // Store the host's selected boss IDs so _launchGame can resolve full objects for guests too
      if (Array.isArray(msg.selectedBossIds) && msg.selectedBossIds.length) {
        mpState.selectedBosses = msg.selectedBossIds;
      }
      setTimeout(() => this._launchGame(), 800);
    }
  },

  // ── Render players ──
  _renderPlayers(players) {
    const list  = document.getElementById('mp-player-list');
    const count = document.getElementById('mp-player-count');
    if (!list || !count) return;
    mpState.players   = players;
    count.textContent = players.length;
    list.innerHTML = players.map((p, i) => {
      const avatarHtml = p.avatarData
        ? `<img class="mp-avatar-img" src="${p.avatarData}">`
        : `<div class="mp-avatar-placeholder" style="background:${COLORS[i % COLORS.length]}22;">🧑‍💻</div>`;
      return `
        <div class="mp-player-row">
          ${avatarHtml}
          <span style="font-size:7px;color:#f0f0f0;flex:1;">${p.name}${p.id === mpState.playerId ? ' <span style="font-size:5px;color:#aaa">(you)</span>' : ''}</span>
          ${p.isHost ? '<span class="mp-tag">HOST</span>' : ''}
          <div class="mp-dot"></div>
        </div>
      `;
    }).join('') || '<div style="font-size:7px;color:#555;padding:8px;">No players yet.</div>';
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

    // Collect selected bosses and store on mpState so _launchGame can pass them
    const selectedBosses = this._getSelectedBosses();
    if (!selectedBosses.length) {
      this._setStatus('⚠ Select at least one boss!', '#e94560');
      return;
    }
    mpState.selectedBosses = selectedBosses.map(b => b.id);

    // Broadcast GAME_START with selected boss ids so guests know too
    mpState.socket.send(JSON.stringify({
      type:            'GAME_START',
      selectedBossIds: mpState.selectedBosses,
    }));
    this._setStatus('▶ Starting…', '#4ade80');
  },

  // ── Launch: inject selected bosses into window globals ──
  _launchGame() {
    const selectedBosses = mpState.selectedBosses
      ? this._allBosses.filter(b => mpState.selectedBosses.includes(b.id))
      : this._allBosses;

    window.__mpPlayers      = mpState.players;
    window.__mpSocket       = mpState.socket;
    window.__mpSelf         = mpState.playerId;
    window.__mpBossOverride = selectedBosses.length ? selectedBosses : null;

    if (typeof window.startGame === 'function') window.startGame();
  },

  _leave() {
    if (mpState.socket) {
      mpState.socket.send(JSON.stringify({ type: 'PLAYER_LEFT' }));
      mpState.socket.close();
      mpState.socket = null;
    }
    const savedAvatar = mpState.avatarData;
    mpState = { roomCode: null, playerName: null, isHost: false, isPrivate: false, playerId: null, socket: null, players: [], avatarData: savedAvatar, selectedBosses: null };
    this._show('mpv-home');
    this._requestRoomList();
  },

};

window.Multiplayer = Multiplayer;