'use strict';

const QRCode = require('qrcode');
const { Game, PHASE } = require('./game');

const IDLE_TTL_MS = 3 * 60 * 60 * 1000; // drop games idle for 3 hours
const FINISHED_TTL_MS = 30 * 60 * 1000; // keep finished games 30 min for late reconnects
const CLEANUP_EVERY_MS = 60 * 1000;

function genCode(games) {
  for (;;) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!games.has(code)) return code;
  }
}

const noop = () => {};

// Wires all Socket.io events. `auth.isValidToken(token)` checks the host token;
// `getJoinBase(socket)` returns the public base URL phones should open.
function setupSockets(io, { store, auth, getJoinBase }) {
  const games = new Map(); // code -> Game

  function hostGame(socket) {
    const code = socket.data.hostCode;
    return code ? games.get(code) || null : null;
  }

  function playerCtx(socket) {
    const ref = socket.data.player;
    if (!ref) return {};
    const game = games.get(ref.code);
    const player = game && game.players.get(ref.id);
    return player ? { game, player } : {};
  }

  function bindPlayer(socket, game, player) {
    // If this player was connected on another socket (old tab), detach it.
    if (player.socketId && player.socketId !== socket.id) {
      const old = io.sockets.sockets.get(player.socketId);
      if (old) {
        old.data.player = null;
        old.emit('replaced');
      }
    }
    player.socketId = socket.id;
    player.connected = true;
    socket.data.player = { code: game.code, id: player.id };
    game.broadcastPlayers();
  }

  io.on('connection', (socket) => {
    socket.data.hostCode = null;
    socket.data.player = null;

    // ---------- host (big screen) ----------

    socket.on('host:create', async (payload, ack = noop) => {
      const { token, quizId } = payload || {};
      if (!auth.isValidToken(token)) return ack({ error: 'unauthorized' });
      const quiz = store.get(quizId);
      if (!quiz) return ack({ error: 'quiz_not_found' });
      if (!quiz.questions.length) return ack({ error: 'questions_required' });

      const code = genCode(games);
      const joinUrl = `${getJoinBase(socket)}/?code=${code}`;
      let qr = '';
      try {
        qr = await QRCode.toDataURL(joinUrl, { margin: 1, width: 480, color: { dark: '#060914', light: '#ffffff' } });
      } catch (err) {
        console.error('QR generation failed:', err.message);
      }
      const game = new Game({ io, code, quiz, joinUrl, qr });
      games.set(code, game);
      socket.data.hostCode = code;
      socket.join(game.hostRoom);
      console.log(`[game ${code}] created with quiz "${quiz.title}"`);
      ack({ ok: true, code, hostKey: game.hostKey, state: game.hostState() });
    });

    socket.on('host:resume', (payload, ack = noop) => {
      const { token, code, hostKey } = payload || {};
      if (!auth.isValidToken(token)) return ack({ error: 'unauthorized' });
      const game = games.get(String(code));
      if (!game || game.hostKey !== hostKey) return ack({ error: 'room_not_found' });
      socket.data.hostCode = game.code;
      socket.join(game.hostRoom);
      ack({ ok: true, code: game.code, state: game.hostState() });
    });

    socket.on('host:next', (_p, ack = noop) => {
      const game = hostGame(socket);
      if (!game) return ack({ error: 'room_not_found' });
      ack(game.next() ? { ok: true } : { error: 'not_allowed' });
    });

    socket.on('host:skip', (_p, ack = noop) => {
      const game = hostGame(socket);
      if (!game) return ack({ error: 'room_not_found' });
      ack(game.skip() ? { ok: true } : { error: 'not_allowed' });
    });

    socket.on('host:kick', (payload, ack = noop) => {
      const game = hostGame(socket);
      if (!game) return ack({ error: 'room_not_found' });
      const p = game.removePlayer(payload && payload.playerId);
      if (!p) return ack({ error: 'not_found' });
      if (p.socketId) {
        const s = io.sockets.sockets.get(p.socketId);
        if (s) {
          s.data.player = null;
          s.emit('kicked');
        }
      }
      game.broadcastPlayers();
      game.endIfEveryoneAnswered();
      ack({ ok: true });
    });

    socket.on('host:end', (_p, ack = noop) => {
      const game = hostGame(socket);
      if (!game) return ack({ error: 'room_not_found' });
      for (const p of game.players.values()) {
        if (p.socketId) io.to(p.socketId).emit('ended');
      }
      game.destroy();
      games.delete(game.code);
      socket.leave(game.hostRoom);
      socket.data.hostCode = null;
      console.log(`[game ${game.code}] ended by host`);
      ack({ ok: true });
    });

    // ---------- players (phones) ----------

    socket.on('player:join', (payload, ack = noop) => {
      const { code, nickname } = payload || {};
      const c = String(code || '').replace(/\D/g, '');
      if (c.length !== 6) return ack({ error: 'code_invalid' });
      const game = games.get(c);
      if (!game) return ack({ error: 'room_not_found' });
      const res = game.addPlayer(nickname);
      if (res.error) return ack({ error: res.error });
      bindPlayer(socket, game, res.player);
      ack({ ok: true, code: game.code, playerId: res.player.id, playerToken: res.player.token, nickname: res.player.nickname });
      socket.emit('state', game.playerState(res.player));
    });

    socket.on('player:rejoin', (payload, ack = noop) => {
      const { code, playerId, playerToken } = payload || {};
      const game = games.get(String(code || ''));
      if (!game) return ack({ error: 'room_not_found' });
      const player = game.findPlayer(playerId, playerToken);
      if (!player) return ack({ error: 'session_expired' });
      bindPlayer(socket, game, player);
      ack({ ok: true, nickname: player.nickname });
      socket.emit('state', game.playerState(player));
    });

    socket.on('player:answer', (payload, ack = noop) => {
      const { game, player } = playerCtx(socket);
      if (!game) return ack({ error: 'session_expired' });
      const res = game.submitAnswer(player.id, Number(payload && payload.choice));
      ack(res);
    });

    socket.on('player:leave', (_p, ack = noop) => {
      const { game, player } = playerCtx(socket);
      socket.data.player = null;
      if (game && game.phase === PHASE.LOBBY) {
        game.removePlayer(player.id);
        game.broadcastPlayers();
      } else if (player) {
        player.connected = false;
        player.socketId = null;
        if (game) game.broadcastPlayers();
      }
      ack({ ok: true });
    });

    socket.on('disconnect', () => {
      const { game, player } = playerCtx(socket);
      if (!game || player.socketId !== socket.id) return;
      player.connected = false;
      player.socketId = null;
      game.broadcastPlayers();
      // Don't let a player whose phone died hold up the question for everyone else.
      game.endIfEveryoneAnswered();
    });
  });

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [code, game] of games) {
      const ttl = game.phase === PHASE.PODIUM ? FINISHED_TTL_MS : IDLE_TTL_MS;
      if (now - game.lastActivity > ttl) {
        game.destroy();
        games.delete(code);
        console.log(`[game ${code}] removed after inactivity`);
      }
    }
  }, CLEANUP_EVERY_MS);
  cleanup.unref();

  return { games };
}

module.exports = { setupSockets };
