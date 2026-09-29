'use strict';

// End-to-end test: starts the real server, drives the REST API as the host,
// then plays the seeded 10-question quiz with a host screen and 3 players over
// Socket.io, including a duplicate nickname, a phone that drops mid-question and
// rejoins, a streak bonus, a wrong answer, a skipped question and the podium.
//
// Run with: npm test

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
const { io } = require('socket.io-client');

const ROOT = path.join(__dirname, '..');
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const PASSWORD = 'test-password';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightrun-'));
const dataFile = path.join(tmpDir, 'quizzes.json');
fs.copyFileSync(path.join(ROOT, 'data', 'quizzes.json'), dataFile);

let server;
const sockets = [];
let passed = 0;

function step(msg) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT), HOST_PASSWORD: PASSWORD, DATA_FILE: dataFile, INTRO_MS: '300', PUBLIC_URL: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${out}`)), 10000);
    server.stdout.on('data', (d) => {
      out += d;
      if (out.includes('running on')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (d) => (out += d));
    server.on('exit', (code) => code && reject(new Error(`server exited with ${code}:\n${out}`)));
  });
}

async function http(method, url, body, token) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

// A socket client that remembers the latest 'state' and lets tests wait for one.
function client(name) {
  const socket = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(socket);
  const c = { name, socket, state: null, waiters: [] };
  socket.on('state', (s) => {
    c.state = s;
    c.waiters = c.waiters.filter((w) => {
      if (!w.pred(s)) return true;
      clearTimeout(w.timer);
      w.resolve(s);
      return false;
    });
  });
  c.emit = (event, payload) =>
    new Promise((resolve, reject) => {
      socket.timeout(5000).emit(event, payload, (err, res) => (err ? reject(err) : resolve(res)));
    });
  c.waitState = (pred, label, ms = 15000) =>
    new Promise((resolve, reject) => {
      if (c.state && pred(c.state)) return resolve(c.state);
      const w = { pred, resolve };
      w.timer = setTimeout(() => reject(new Error(`${name}: timed out waiting for ${label}; last state phase=${c.state && c.state.phase} q=${c.state && c.state.qIndex}`)), ms);
      c.waiters.push(w);
    });
  c.connected = () => new Promise((resolve) => (socket.connected ? resolve() : socket.once('connect', resolve)));
  return c;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phaseIs = (phase, q) => (s) => s.phase === phase && (q === undefined || s.qIndex === q);

async function main() {
  console.log(`Starting server on port ${PORT}...`);
  await startServer();
  step('server started');

  // ---------- REST: auth + quiz CRUD ----------
  let r = await http('POST', '/api/login', { password: 'wrong' });
  assert.equal(r.status, 401);
  r = await http('GET', '/api/quizzes');
  assert.equal(r.status, 401);
  step('wrong password and missing token are rejected');

  r = await http('POST', '/api/login', { password: PASSWORD });
  assert.equal(r.status, 200);
  const token = r.body.token;
  r = await http('GET', '/api/quizzes', null, token);
  const seed = r.body.quizzes.find((q) => q.title === "Yugurish bo'yicha viktorina");
  assert.ok(seed, 'seed quiz present');
  assert.equal(seed.questionCount, 10);
  step('host logs in and sees the seeded 10-question quiz');

  r = await http('POST', '/api/quizzes', { title: 'X', questions: [{ text: 'Q', options: ['a', 'b', '', 'd'], correct: 0, timeLimit: 20 }] }, token);
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'options_required');
  assert.equal(r.body.index, 1);
  r = await http('POST', '/api/quizzes', { title: 'X', questions: [{ text: 'Q', options: ['a', 'b', 'c', 'd'], correct: 0, timeLimit: 15 }] }, token);
  assert.equal(r.body.error, 'invalid_time');
  step('invalid quizzes are rejected with translatable error codes');

  const newQuiz = { title: 'Test viktorina', questions: [{ text: 'Savol?', options: ['a', 'b', 'c', 'd'], correct: 2, timeLimit: 10, image: '' }] };
  r = await http('POST', '/api/quizzes', newQuiz, token);
  assert.equal(r.status, 200);
  const createdId = r.body.quiz.id;
  r = await http('PUT', `/api/quizzes/${createdId}`, { ...newQuiz, title: 'Yangilangan' }, token);
  assert.equal(r.body.quiz.title, 'Yangilangan');
  r = await http('GET', `/api/quizzes/${createdId}`, null, token);
  assert.equal(r.body.quiz.questions[0].correct, 2);
  r = await http('DELETE', `/api/quizzes/${createdId}`, null, token);
  assert.equal(r.status, 200);
  r = await http('GET', `/api/quizzes/${createdId}`, null, token);
  assert.equal(r.status, 404);
  const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(onDisk.quizzes.length, 1);
  step('quiz create / edit / delete works and persists to the JSON file');

  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  r = await http('POST', '/api/upload', { dataUrl: png }, token);
  assert.match(r.body.url, /^\/uploads\/.+\.png$/);
  const img = await fetch(BASE + r.body.url);
  assert.equal(img.status, 200);
  fs.unlinkSync(path.join(ROOT, 'public', r.body.url));
  step('image upload is stored and served');

  for (const p of ['/', '/host', '/screen', '/lang/uz.js', '/js/screen.js', '/socket.io/socket.io.js']) {
    assert.equal((await fetch(BASE + p)).status, 200, p);
  }
  step('all pages and scripts are served');

  // ---------- game setup ----------
  const host = client('host');
  await host.connected();
  let res = await host.emit('host:create', { token: 'bad', quizId: seed.id });
  assert.equal(res.error, 'unauthorized');
  res = await host.emit('host:create', { token, quizId: seed.id });
  assert.ok(res.ok);
  const code = res.code;
  assert.match(code, /^\d{6}$/);
  assert.match(res.state.qr, /^data:image\/png;base64,/);
  assert.ok(res.state.joinUrl.endsWith(`/?code=${code}`));
  host.state = res.state;
  step(`host created room ${code} with QR code for ${res.state.joinUrl}`);

  const A = client('Alisher');
  const B = client('Bekzod');
  const C = client('Charos');
  await Promise.all([A.connected(), B.connected(), C.connected()]);

  res = await A.emit('player:join', { code: '000000', nickname: 'Alisher' });
  assert.equal(res.error, 'room_not_found');
  res = await A.emit('player:join', { code, nickname: 'A' });
  assert.equal(res.error, 'nickname_invalid');

  const sessions = {};
  for (const c of [A, B, C]) {
    res = await c.emit('player:join', { code, nickname: c.name });
    assert.ok(res.ok, `${c.name} joined`);
    sessions[c.name] = { code, playerId: res.playerId, playerToken: res.playerToken };
  }
  const dup = client('dup');
  await dup.connected();
  res = await dup.emit('player:join', { code, nickname: '  alisher ' });
  assert.equal(res.error, 'nickname_taken');
  step('3 players joined; wrong code, short name and duplicate nickname (case-insensitive) are blocked');

  await host.waitState((s) => s.players && s.players.length === 3, 'lobby with 3 players').catch(() => {});
  res = await host.emit('host:resume', { token, code, hostKey: 'nope' });
  assert.equal(res.error, 'room_not_found');

  // ---------- play all 10 questions ----------
  const quiz = JSON.parse(fs.readFileSync(dataFile, 'utf8')).quizzes[0];
  const total = quiz.questions.length;
  let players = { A, B, C };
  let cScoreBeforeDrop = null;
  const wrongOf = (q) => (q.correct + 1) % 4;

  assert.ok((await host.emit('host:next')).ok);

  for (let qi = 0; qi < total; qi++) {
    const q = quiz.questions[qi];
    await host.waitState(phaseIs('intro', qi), `intro ${qi}`);
    const hq = await host.waitState(phaseIs('question', qi), `question ${qi}`);
    assert.equal(hq.question.text, q.text);
    assert.equal(hq.question.correct, undefined, 'correct answer must not leak during the question');
    await players.A.waitState(phaseIs('question', qi), `A question ${qi}`);
    assert.equal(players.A.state.question.correct, undefined);

    // A: always correct, immediately.
    assert.ok((await players.A.emit('player:answer', { choice: q.correct })).ok);
    res = await players.A.emit('player:answer', { choice: q.correct });
    assert.equal(res.error, 'already_answered');

    if (qi === 2) {
      // C's phone locks mid-question: the question must still end once A and B answer.
      cScoreBeforeDrop = players.C.state.score;
      players.C.socket.disconnect();
    }

    await sleep(400);
    // B: correct but slower, except a wrong answer on question 5 (index 4).
    const bChoice = qi === 4 ? wrongOf(q) : q.correct;

    if (qi === total - 1) {
      // Last question: C doesn't answer, host ends the question early.
      assert.ok((await players.B.emit('player:answer', { choice: bChoice })).ok);
      await sleep(100);
      assert.ok((await host.emit('host:skip')).ok);
    } else if (qi === 2) {
      assert.ok((await players.B.emit('player:answer', { choice: bChoice })).ok);
    } else {
      await players.B.emit('player:answer', { choice: bChoice });
      // C: wrong on the first question, correct afterwards.
      await players.C.emit('player:answer', { choice: qi === 0 ? wrongOf(q) : q.correct });
    }

    const reveal = await host.waitState(phaseIs('reveal', qi), `reveal ${qi}`);
    assert.equal(reveal.question.correct, q.correct);
    assert.equal(reveal.reveal.distribution.reduce((a, b) => a + b, 0), reveal.reveal.answeredCount);
    assert.ok(reveal.reveal.top.length <= 5);

    const ra = (await players.A.waitState(phaseIs('reveal', qi), `A reveal ${qi}`)).result;
    const rb = (await players.B.waitState(phaseIs('reveal', qi), `B reveal ${qi}`)).result;
    assert.equal(ra.correct, true);
    assert.ok(ra.points > 900 && ra.points <= 1000, `A fast points ${ra.points}`);
    assert.equal(ra.streak, qi + 1);
    assert.equal(ra.bonus, qi >= 2 ? 100 : 0, 'streak bonus from the 3rd correct answer in a row');

    if (qi === 4) {
      assert.equal(rb.correct, false);
      assert.equal(rb.points, 0);
      assert.equal(rb.bonus, 0);
      assert.equal(rb.streak, 0, 'wrong answer resets streak');
    } else {
      assert.equal(rb.correct, true);
      assert.ok(rb.points < ra.points, `faster answer scores more (A ${ra.points} > B ${rb.points})`);
      assert.ok(rb.points >= 500);
    }

    if (qi === 0) {
      const rc = (await players.C.waitState(phaseIs('reveal', 0), 'C reveal 0')).result;
      assert.equal(rc.correct, false);
      assert.equal(rc.points, 0);
      step('Q1: correct answers score by speed, wrong answer scores 0');
    }

    if (qi === 2) {
      assert.equal(reveal.reveal.answeredCount, 2, 'question ended without the disconnected player');
      // C reconnects with a brand-new socket (new page load) using the saved session.
      const C2 = client('Charos (reconnected)');
      await C2.connected();
      res = await C2.emit('player:rejoin', sessions.Charos);
      assert.ok(res.ok);
      const s = await C2.waitState(phaseIs('reveal', 2), 'C2 reveal state after rejoin');
      assert.equal(s.nickname, 'Charos');
      assert.equal(s.score, cScoreBeforeDrop, 'score kept after reconnect');
      assert.equal(s.result.answered, false);
      res = await C2.emit('player:rejoin', { ...sessions.Charos, playerToken: 'x'.repeat(32) });
      assert.equal(res.error, 'session_expired');
      players = { ...players, C: C2 };
      step(`Q3: Charos dropped mid-question, rejoined with the same score (${s.score}), Alisher got the +100 streak bonus`);
    }

    if (qi === 4) step('Q5: Bekzod answered wrong, got 0 and his streak reset');

    if (qi === total - 1) {
      const rc = (await players.C.waitState(phaseIs('reveal', qi), 'C reveal last')).result;
      assert.equal(rc.answered, false);
      assert.equal(rc.streak, 0);
      assert.equal(reveal.isLast, true);
      step('Q10: host ended the question early; Charos got no points for not answering');
    }

    assert.ok((await host.emit('host:next')).ok);
  }

  // ---------- podium ----------
  const final = await host.waitState(phaseIs('podium'), 'podium');
  const ranking = final.ranking;
  assert.equal(ranking.length, 3);
  for (let i = 1; i < ranking.length; i++) assert.ok(ranking[i - 1].score >= ranking[i].score, 'ranking sorted');
  assert.equal(ranking[0].nickname, 'Alisher');
  // A: 10 fast correct answers + 8 streak bonuses.
  assert.ok(ranking[0].score > 9000 + 800, `winner score ${ranking[0].score}`);

  for (const c of Object.values(players)) {
    const s = await c.waitState(phaseIs('podium'), `${c.name} podium`);
    const mine = ranking.find((p) => p.nickname === s.nickname);
    assert.equal(s.rank, mine.rank);
    assert.equal(s.score, mine.score);
    assert.equal(s.top3.length, 3);
  }
  res = await dup.emit('player:join', { code, nickname: 'Late' });
  assert.equal(res.error, 'game_over');
  step(`podium: 1) ${ranking[0].nickname} ${ranking[0].score}, 2) ${ranking[1].nickname} ${ranking[1].score}, 3) ${ranking[2].nickname} ${ranking[2].score}`);

  const ended = new Promise((resolve) => players.A.socket.once('ended', resolve));
  assert.ok((await host.emit('host:end')).ok);
  await ended;
  res = await host.emit('host:next');
  assert.equal(res.error, 'room_not_found');
  step('host ended the game; players were notified');

  console.log(`\nAll ${passed} checks passed.`);
}

function cleanup() {
  sockets.forEach((s) => s.close());
  if (server) server.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTEST FAILED:', err);
    cleanup();
    process.exit(1);
  });
