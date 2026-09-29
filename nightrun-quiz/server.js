'use strict';

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const { QuizStore, ValidationError } = require('./src/quizStore');
const { setupSockets } = require('./src/sockets');

const PORT = Number(process.env.PORT) || 3000;
const HOST_PASSWORD = process.env.HOST_PASSWORD || 'nightrun';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, 'data', 'quizzes.json'));
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

if (!process.env.HOST_PASSWORD) {
  console.warn('WARNING: HOST_PASSWORD is not set, using the default "nightrun". Set it in .env before going live.');
}

// ---------- host auth ----------
// The token is derived from the password, so it survives restarts and
// changing HOST_PASSWORD logs every host out.
const HOST_TOKEN = crypto.createHmac('sha256', HOST_PASSWORD).update('nightrun-host-v1').digest('hex');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

const auth = { isValidToken: (token) => safeEqual(token, HOST_TOKEN) };

function requireHost(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!auth.isValidToken(token)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ---------- join URL ----------
// Phones can't open "localhost", so when the host screen runs on localhost
// we swap in this machine's LAN address (handy for meetups on a laptop + Wi-Fi).
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return null;
}

function getJoinBase(socket) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const h = socket.handshake.headers;
  const proto = (h['x-forwarded-proto'] || '').split(',')[0] || (socket.handshake.secure ? 'https' : 'http');
  let host = (h['x-forwarded-host'] || h.host || `localhost:${PORT}`).split(',')[0].trim();
  const m = host.match(/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i);
  if (m) {
    const lan = lanAddress();
    if (lan) host = `${lan}${m[2] || ''}`;
  }
  return `${proto}://${host}`;
}

// ---------- app ----------
const store = new QuizStore(DATA_FILE);
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '8mb' }));

app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/host', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'host.html')));
app.get('/screen', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'screen.html')));
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use(express.static(PUBLIC_DIR, { index: false, maxAge: '1h' }));

app.post('/api/login', (req, res) => {
  const password = (req.body && req.body.password) || '';
  if (!safeEqual(password, HOST_PASSWORD)) return res.status(401).json({ error: 'wrong_password' });
  res.json({ token: HOST_TOKEN });
});

app.get('/api/session', requireHost, (_req, res) => res.json({ ok: true }));

app.get('/api/quizzes', requireHost, (_req, res) => res.json({ quizzes: store.list() }));

app.get('/api/quizzes/:id', requireHost, (req, res) => {
  const quiz = store.get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz_not_found' });
  res.json({ quiz });
});

function handleWrite(fn) {
  return (req, res) => {
    try {
      const result = fn(req);
      if (!result) return res.status(404).json({ error: 'quiz_not_found' });
      res.json({ quiz: result });
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.code, index: err.index });
      console.error(err);
      res.status(500).json({ error: 'unknown' });
    }
  };
}

app.post('/api/quizzes', requireHost, handleWrite((req) => store.create(req.body)));
app.put('/api/quizzes/:id', requireHost, handleWrite((req) => store.update(req.params.id, req.body)));

app.delete('/api/quizzes/:id', requireHost, (req, res) => {
  if (!store.remove(req.params.id)) return res.status(404).json({ error: 'quiz_not_found' });
  res.json({ ok: true });
});

// Image upload as a data URL (keeps the front end build-free and dependency-free).
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
app.post('/api/upload', requireHost, (req, res) => {
  const m = String((req.body && req.body.dataUrl) || '').match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !IMAGE_TYPES[m[1]]) return res.status(400).json({ error: 'image_invalid' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_UPLOAD_BYTES) return res.status(400).json({ error: 'image_too_large' });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${IMAGE_TYPES[m[1]]}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.json({ url: `/uploads/${name}` });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000 });
setupSockets(io, { store, auth, getJoinBase });

server.listen(PORT, () => {
  console.log(`Night Run quiz running on http://localhost:${PORT}`);
  console.log(`  Players:   http://localhost:${PORT}/`);
  console.log(`  Host panel: http://localhost:${PORT}/host`);
});

module.exports = { app, server };
