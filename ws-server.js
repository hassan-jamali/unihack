/* ═══════════════════════════════════════════
   ws-server.js — Brain Battle WebSocket Server
   Supports: room listing, public/private rooms,
   custom names + session-only avatars,
   selectedBossIds forwarded on GAME_START
   ═══════════════════════════════════════════ */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const PORT  = process.env.PORT || 8080;
const rooms = new Map();

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
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


    if (msg.type === 'RELAY') {
        if (!playerRoom) return;
    const room = rooms.get(playerRoom);
        if (!room) return;
    const str = JSON.stringify({ type: 'RELAY', payload: msg.payload });
    for (const { ws: peer } of room.players.values()) {
        if (peer.readyState === peer.OPEN) peer.send(str);  // ← no peer !== ws exclusion
    }
    return;
    }

    // ── LIST_ROOMS ──
    if (msg.type === 'LIST_ROOMS') {
      const publicRooms = [];
      for (const [code, room] of rooms) {
        if (!room.isPrivate && room.players.size < 4) {
          publicRooms.push({
            code,
            hostName:    room.hostName,
            playerCount: room.players.size,
            maxPlayers:  4,
          });
        }
      }
      ws.send(JSON.stringify({ type: 'ROOM_LIST', rooms: publicRooms }));
      return;
    }

    // ── JOIN_REQUEST ──
    if (msg.type === 'JOIN_REQUEST') {
      const { code, id, name, avatarData, isPrivate } = msg;

      if (!rooms.has(code)) {
        rooms.set(code, { players: new Map(), isPrivate: !!isPrivate, hostName: name });
      }

      const room = rooms.get(code);
      if (room.players.size >= 4) {
        ws.send(JSON.stringify({ type: 'ERROR', msg: 'Room is full.' }));
        return;
      }

      const isHost = room.players.size === 0;
      playerId   = id;
      playerRoom = code;
      room.players.set(id, { ws, name, avatarData: avatarData || null, isHost });

      broadcast(code, {
        type:      'ROOM_STATE',
        players:   serializePlayers(code),
        hostId:    getHostId(code),
        isPrivate: room.isPrivate,
      });

      broadcastRoomList();
      console.log(`[${code}] ${name} joined (${room.players.size}/4) ${isHost ? '👑 HOST' : ''} ${room.isPrivate ? '🔒' : '🌐'}`);
    }

    // ── TOGGLE_PRIVACY (host only) ──
    if (msg.type === 'TOGGLE_PRIVACY') {
      if (!playerRoom) return;
      const room = rooms.get(playerRoom);
      if (!room) return;
      const player = room.players.get(playerId);
      if (!player?.isHost) return;
      room.isPrivate = !room.isPrivate;
      console.log(`[${playerRoom}] Privacy toggled → ${room.isPrivate ? '🔒 private' : '🌐 public'}`);
      broadcast(playerRoom, {
        type:      'ROOM_STATE',
        players:   serializePlayers(playerRoom),
        hostId:    getHostId(playerRoom),
        isPrivate: room.isPrivate,
      });
      broadcastRoomList();
    }

    // ── GAME_START (host only) ──
    // Forward selectedBossIds so guests can show the correct boss list
    if (msg.type === 'GAME_START') {
      if (!playerRoom) return;
      const room = rooms.get(playerRoom);
      if (!room) return;
      const player = room.players.get(playerId);
      if (!player?.isHost) return;
      broadcast(playerRoom, {
        type:            'GAME_START',
        selectedBossIds: msg.selectedBossIds || null,
      });
      console.log(`[${playerRoom}] Game started! Bosses: ${msg.selectedBossIds ? msg.selectedBossIds.join(',') : 'all'}`);
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
    if (player) player.avatarData = null;
    room.players.delete(playerId);

    console.log(`[${playerRoom}] ${name} left (${room.players.size} remaining)`);

    if (room.players.size === 0) {
      rooms.delete(playerRoom);
      console.log(`[${playerRoom}] Room closed.`);
    } else {
      if (player?.isHost) {
        const next = room.players.values().next().value;
        if (next) { next.isHost = true; room.hostName = next.name; }
      }
      broadcast(playerRoom, {
        type:      'ROOM_STATE',
        players:   serializePlayers(playerRoom),
        hostId:    getHostId(playerRoom),
        isPrivate: room.isPrivate,
      });
    }

    broadcastRoomList();
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

function broadcastRoomList() {
  const publicRooms = [];
  for (const [code, room] of rooms) {
    if (!room.isPrivate && room.players.size < 4) {
      publicRooms.push({ code, hostName: room.hostName, playerCount: room.players.size, maxPlayers: 4 });
    }
  }
  const msg = JSON.stringify({ type: 'ROOM_LIST', rooms: publicRooms });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(msg);
  }
}

function serializePlayers(code) {
  const room = rooms.get(code);
  if (!room) return [];
  return [...room.players.entries()].map(([id, p]) => ({
    id, name: p.name, avatarData: p.avatarData || null, isHost: p.isHost,
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