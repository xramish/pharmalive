'use strict';

const crypto = require('crypto');
const { scoreAnswer } = require('./scoring');

const PHASE = Object.freeze({
  LOBBY: 'lobby',
  INTRO: 'intro', // question text shown, answers not open yet
  QUESTION: 'question', // answers open, countdown running
  REVEAL: 'reveal', // correct answer, distribution, top 5
  PODIUM: 'podium', // final results
});

// How long the question is shown before answers open.
const INTRO_MS = Number(process.env.INTRO_MS) || 3000;
const MAX_PLAYERS = 250;
const NICK_MIN = 2;
const NICK_MAX = 16;
const TOP_N = 5;

const randomToken = () => crypto.randomBytes(16).toString('hex');

function normalizeNickname(raw) {
  return String(raw || '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// One running game (room). All state is in memory.
class Game {
  constructor({ io, code, quiz, joinUrl, qr }) {
    this.io = io;
    this.code = code;
    // Snapshot the quiz so edits in the host panel don't affect a running game.
    this.quiz = JSON.parse(JSON.stringify(quiz));
    this.joinUrl = joinUrl;
    this.qr = qr;
    this.hostKey = randomToken();
    this.phase = PHASE.LOBBY;
    this.qIndex = -1;
    this.players = new Map(); // id -> player
    this.answers = new Map(); // playerId -> { choice, elapsedMs } for the current question
    this.phaseEndsAt = 0;
    this.questionStartedAt = 0;
    this.timer = null;
    this.reveal = null;
    this.createdAt = Date.now();
    this.touch();
  }

  get total() {
    return this.quiz.questions.length;
  }

  get question() {
    return this.quiz.questions[this.qIndex] || null;
  }

  get hostRoom() {
    return `host:${this.code}`;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  // ---------- players ----------

  addPlayer(rawNickname) {
    if (this.phase === PHASE.PODIUM) return { error: 'game_over' };
    const nickname = normalizeNickname(rawNickname);
    if (nickname.length < NICK_MIN || nickname.length > NICK_MAX) return { error: 'nickname_invalid' };
    const key = nickname.toLocaleLowerCase('uz');
    for (const p of this.players.values()) {
      if (p.nickname.toLocaleLowerCase('uz') === key) return { error: 'nickname_taken' };
    }
    if (this.players.size >= MAX_PLAYERS) return { error: 'room_full' };

    const player = {
      id: randomToken().slice(0, 12),
      token: randomToken(),
      nickname,
      score: 0,
      streak: 0,
      correctCount: 0,
      socketId: null,
      connected: false,
      joinedAt: Date.now(),
      lastResult: null,
    };
    this.players.set(player.id, player);
    this.touch();
    return { player };
  }

  findPlayer(id, token) {
    const p = this.players.get(id);
    if (!p || typeof token !== 'string' || token.length !== p.token.length) return null;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(p.token)) ? p : null;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return null;
    this.players.delete(id);
    this.answers.delete(id);
    this.touch();
    return p;
  }

  // Sorted by score; equal scores share a rank (1, 2, 2, 4...).
  ranking() {
    const list = [...this.players.values()].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
    let rank = 0;
    let prevScore = null;
    return list.map((p, i) => {
      if (p.score !== prevScore) {
        rank = i + 1;
        prevScore = p.score;
      }
      return { id: p.id, nickname: p.nickname, score: p.score, streak: p.streak, rank };
    });
  }

  rankOf(id) {
    const r = this.ranking().find((x) => x.id === id);
    return r ? r.rank : null;
  }

  // ---------- flow ----------

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // Host pressed the main button: start / next question / final results.
  next() {
    this.touch();
    if (this.phase === PHASE.LOBBY) {
      if (this.players.size === 0) return false;
      this.beginQuestion(0);
      return true;
    }
    if (this.phase === PHASE.REVEAL) {
      if (this.qIndex + 1 < this.total) this.beginQuestion(this.qIndex + 1);
      else this.finish();
      return true;
    }
    return false;
  }

  beginQuestion(index) {
    this.clearTimer();
    this.qIndex = index;
    this.answers.clear();
    this.reveal = null;
    this.phase = PHASE.INTRO;
    this.phaseEndsAt = Date.now() + INTRO_MS;
    this.timer = setTimeout(() => this.openAnswers(), INTRO_MS);
    this.broadcast();
  }

  openAnswers() {
    this.clearTimer();
    const limitMs = this.question.timeLimit * 1000;
    this.phase = PHASE.QUESTION;
    this.questionStartedAt = Date.now();
    this.phaseEndsAt = this.questionStartedAt + limitMs;
    // Small grace period for network latency on the last-second answers.
    this.timer = setTimeout(() => this.endQuestion(), limitMs + 250);
    this.broadcast();
  }

  submitAnswer(playerId, choice) {
    if (this.phase !== PHASE.QUESTION) return { error: 'not_accepting' };
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return { error: 'invalid_choice' };
    if (!this.players.has(playerId)) return { error: 'session_expired' };
    if (this.answers.has(playerId)) return { error: 'already_answered' };
    const elapsedMs = Math.max(0, Date.now() - this.questionStartedAt);
    this.answers.set(playerId, { choice, elapsedMs });
    this.touch();

    if (!this.endIfEveryoneAnswered()) this.broadcastAnswerCount();
    return { ok: true };
  }

  // Close the question early once every connected player has answered.
  endIfEveryoneAnswered() {
    if (this.phase !== PHASE.QUESTION || this.answers.size === 0) return false;
    const everyone = [...this.players.values()].every((p) => !p.connected || this.answers.has(p.id));
    if (everyone) this.endQuestion();
    return everyone;
  }

  // Host can close the question before the timer runs out.
  skip() {
    this.touch();
    if (this.phase === PHASE.INTRO) {
      this.openAnswers();
      return true;
    }
    if (this.phase === PHASE.QUESTION) {
      this.endQuestion();
      return true;
    }
    return false;
  }

  endQuestion() {
    if (this.phase !== PHASE.QUESTION) return;
    this.clearTimer();
    const q = this.question;
    const distribution = [0, 0, 0, 0];
    let correctCount = 0;

    for (const p of this.players.values()) {
      const a = this.answers.get(p.id);
      if (a) distribution[a.choice] += 1;
      const correct = !!a && a.choice === q.correct;
      const res = scoreAnswer({ correct, elapsedMs: a ? a.elapsedMs : 0, timeLimitSec: q.timeLimit, streak: p.streak });
      p.streak = res.streak;
      p.score += res.points + res.bonus;
      if (correct) {
        p.correctCount += 1;
        correctCount += 1;
      }
      p.lastResult = {
        qIndex: this.qIndex,
        answered: !!a,
        choice: a ? a.choice : null,
        correct,
        points: res.points,
        bonus: res.bonus,
        streak: res.streak,
      };
    }

    this.reveal = { distribution, correctCount, answeredCount: this.answers.size };
    this.phase = PHASE.REVEAL;
    this.phaseEndsAt = 0;
    this.broadcast();
  }

  finish() {
    this.clearTimer();
    this.phase = PHASE.PODIUM;
    this.phaseEndsAt = 0;
    this.broadcast();
  }

  destroy() {
    this.clearTimer();
  }

  // ---------- state snapshots ----------
  // Clients render purely from these snapshots, which makes reconnecting trivial.

  remainingMs() {
    return this.phaseEndsAt ? Math.max(0, this.phaseEndsAt - Date.now()) : 0;
  }

  hostState() {
    const q = this.question;
    const s = {
      phase: this.phase,
      code: this.code,
      joinUrl: this.joinUrl,
      qr: this.qr,
      quizTitle: this.quiz.title,
      total: this.total,
      qIndex: this.qIndex,
      isLast: this.qIndex === this.total - 1,
      players: [...this.players.values()].map((p) => ({ id: p.id, nickname: p.nickname, connected: p.connected })),
      remainingMs: this.remainingMs(),
      answeredCount: this.answers.size,
    };
    if (q && this.phase !== PHASE.LOBBY && this.phase !== PHASE.PODIUM) {
      s.question = { text: q.text, image: q.image, options: q.options, timeLimit: q.timeLimit };
    }
    if (this.phase === PHASE.REVEAL) {
      s.question.correct = q.correct;
      s.reveal = { ...this.reveal, top: this.ranking().slice(0, TOP_N) };
    }
    if (this.phase === PHASE.PODIUM) s.ranking = this.ranking().slice(0, 10);
    return s;
  }

  playerState(p) {
    const q = this.question;
    const s = {
      phase: this.phase,
      code: this.code,
      nickname: p.nickname,
      score: p.score,
      streak: p.streak,
      rank: this.rankOf(p.id),
      playerCount: this.players.size,
      qIndex: this.qIndex,
      total: this.total,
      remainingMs: this.remainingMs(),
    };
    if (q && (this.phase === PHASE.INTRO || this.phase === PHASE.QUESTION)) {
      s.question = { text: q.text, options: q.options, timeLimit: q.timeLimit };
      const a = this.answers.get(p.id);
      s.answered = a ? a.choice : null;
    }
    if (this.phase === PHASE.REVEAL) {
      s.result = p.lastResult && p.lastResult.qIndex === this.qIndex ? p.lastResult : null;
      s.correctIndex = q.correct;
      s.correctText = q.options[q.correct];
    }
    if (this.phase === PHASE.PODIUM) {
      s.top3 = this.ranking().slice(0, 3);
      s.correctCount = p.correctCount;
    }
    return s;
  }

  broadcast() {
    this.io.to(this.hostRoom).emit('state', this.hostState());
    for (const p of this.players.values()) {
      if (p.connected && p.socketId) this.io.to(p.socketId).emit('state', this.playerState(p));
    }
  }

  broadcastAnswerCount() {
    this.io.to(this.hostRoom).emit('answers', { answeredCount: this.answers.size, playerCount: this.players.size });
  }

  broadcastPlayers() {
    this.io.to(this.hostRoom).emit('players', this.hostState().players);
  }
}

module.exports = { Game, PHASE, normalizeNickname, INTRO_MS };
