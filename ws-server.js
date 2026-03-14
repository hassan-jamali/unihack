/* ═══════════════════════════════════════════
   ws-server.js — Brain Battle WebSocket Server
   Uses HTTP + WS upgrade for Railway compatibility
   ═══════════════════════════════════════════ */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT  = process.env.PORT || 8080;
const rooms = new Map();

// Railway needs an HTTP server to health-check against
const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('Brain Battle WS Server OK');
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`🎮 Brain Battle WS server running on port ${PORT}`);
});

wss.on('connection', (ws) => {
  let playerRoom = null;
  let playerId   = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── JOIN_REQUEST ──
    if (msg.type === 'JOIN_REQUEST') {
      const { code, id, name, avatarIdx } = msg;

      if (!rooms.has(code)) {
        rooms.set(code, { players: new Map() });
      }

      const room = rooms.get(code);
      if (room.players.size >= 4) {
        ws.send(JSON.stringify({ type: 'ERROR', msg: 'Room is full.' }));
        return;
      }

      const isHost = room.players.size === 0;
      playerId   = id;
      playerRoom = code;

      room.players.set(id, { ws, name, avatarIdx, isHost });

      broadcast(code, {
        type:    'ROOM_STATE',
        players: serializePlayers(code),
        hostId:  getHostId(code),
      });

      console.log(`[${code}] ${name} joined (${room.players.size}/4) ${isHost ? '👑 HOST' : ''}`);
    }

    // ── GAME_START (host only) ──
    if (msg.type === 'GAME_START') {
      if (!playerRoom) return;
      const room = rooms.get(playerRoom);
      if (!room) return;
      const player = room.players.get(playerId);
      if (!player?.isHost) return;
      broadcast(playerRoom, { type: 'GAME_START' });
      console.log(`[${playerRoom}] Game started!`);
    }

    // ── PLAYER_LEFT ──
    if (msg.type === 'PLAYER_LEFT') {
      handleLeave();
    }
  });

  ws.on('close', () => handleLeave());
  ws.on('error', () => handleLeave());

  function handleLeave() {
    if (!playerRoom || !playerId) return;
    const room = rooms.get(playerRoom);
    if (!room) return;

    const player = room.players.get(playerId);
    const name   = player?.name || 'A player';
    room.players.delete(playerId);

    console.log(`[${playerRoom}] ${name} left (${room.players.size} remaining)`);

    if (room.players.size === 0) {
      rooms.delete(playerRoom);
      console.log(`[${playerRoom}] Room closed.`);
    } else {
      if (player?.isHost) {
        const next = room.players.values().next().value;
        if (next) next.isHost = true;
      }
      broadcast(playerRoom, {
        type:    'ROOM_STATE',
        players: serializePlayers(playerRoom),
        hostId:  getHostId(playerRoom),
      });
    }

    playerRoom = null;
    playerId   = null;
  }
});

function broadcast(code, msg) {
  const room = rooms.get(code);
  if (!room) return;
  const str = JSON.stringify(msg);
  for (const { ws } of room.players.values()) {
    if (ws.readyState === ws.OPEN) ws.send(str);
  }
}

function serializePlayers(code) {
  const room = rooms.get(code);
  if (!room) return [];
  return [...room.players.entries()].map(([id, p]) => ({
    id, name: p.name, avatarIdx: p.avatarIdx, isHost: p.isHost,
  }));
}

function getHostId(code) {
  const room = rooms.get(code);
  if (!room) return null;
  for (const [id, p] of room.players) {
    if (p.isHost) return id;
  }
  return null;
}