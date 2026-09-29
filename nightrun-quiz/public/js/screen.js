// Host big screen (projector): lobby, questions, results, podium. Also the host's game controls.
(function () {
  'use strict';

  const { t, tErr, $, showView, shape, fmt, storage, emitAck, escapeHtml } = window.NR;
  const Sound = window.Sound;
  const SESSION_KEY = 'nr_screen_session';
  const TOKEN_KEY = 'nr_host_token';

  document.title = t('page_title_screen');

  const token = storage.get(TOKEN_KEY, null);
  if (!token) {
    location.replace('/host');
    return;
  }

  const params = new URLSearchParams(location.search);
  const quizId = params.get('quiz');
  const socket = io({ reconnectionDelay: 500, reconnectionDelayMax: 3000 });

  let session = readSession(); // { code, hostKey, quizId }
  let state = null;
  let renderedKey = '';
  let timerRaf = 0;
  let lastTickSecond = null;
  let podiumTimers = [];
  let knownPlayers = new Set();
  let busy = false;

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function writeSession(s) {
    session = s;
    try {
      if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  function stopTimer() {
    cancelAnimationFrame(timerRaf);
    timerRaf = 0;
  }

  function runTimer(remainingMs, totalMs, onFrame) {
    stopTimer();
    const endAt = performance.now() + remainingMs;
    const frame = () => {
      const left = Math.max(0, endAt - performance.now());
      onFrame(left, totalMs ? Math.min(1, left / totalMs) : 0);
      if (left > 0) timerRaf = requestAnimationFrame(frame);
    };
    frame();
  }

  function clearPodiumTimers() {
    podiumTimers.forEach(clearTimeout);
    podiumTimers = [];
  }

  function showLoadingError(msg) {
    $('#loadingText').textContent = msg;
    $('#loadingBack').hidden = false;
    document.querySelector('#v-loading .s-spinner').hidden = true;
    showView('v-loading');
  }

  // ---------- create / resume ----------

  async function connectGame() {
    if (session && (!quizId || session.quizId === quizId)) {
      const res = await emitAck(socket, 'host:resume', { token, code: session.code, hostKey: session.hostKey });
      if (res.ok) return render(res.state);
      if (res.error === 'network') return;
      if (res.error === 'unauthorized') return location.replace('/host');
      writeSession(null);
    }
    if (!quizId) return location.replace('/host');
    const res = await emitAck(socket, 'host:create', { token, quizId });
    if (res.error === 'unauthorized') return location.replace('/host');
    if (res.error) return showLoadingError(tErr(res.error));
    writeSession({ code: res.code, hostKey: res.hostKey, quizId });
    render(res.state);
  }

  // ---------- rendering ----------

  function render(s) {
    state = s;
    document.body.className = `screen phase-${s.phase}`;
    $('#sCodePill').hidden = s.phase === 'lobby' || s.phase === 'podium';
    $('#sCodePill').innerHTML = `${escapeHtml(t('game_code'))}: <b>${escapeHtml(s.code)}</b>`;
    $('#sInfo').textContent =
      s.phase === 'lobby' || s.phase === 'podium' ? s.quizTitle : t('question_n', { n: s.qIndex + 1, total: s.total });

    // Lane runner shows progress through the quiz.
    const progress = s.phase === 'podium' ? 1 : s.phase === 'lobby' ? 0 : (s.qIndex + (s.phase === 'reveal' ? 1 : 0.5)) / s.total;
    $('#laneRunner').style.left = `${progress * 100}%`;

    const key = `${s.phase}:${s.qIndex}`;
    const fresh = key !== renderedKey;
    renderedKey = key;

    if (s.phase !== 'podium') {
      clearPodiumTimers();
      window.Confetti.stop();
    }
    if (s.phase !== 'question' && s.phase !== 'intro') stopTimer();

    switch (s.phase) {
      case 'lobby':
        renderLobby(s);
        break;
      case 'intro':
        if (fresh) renderIntro(s);
        break;
      case 'question':
        if (fresh) renderQuestion(s);
        updateAnswerCount(s.answeredCount, s.players.length);
        break;
      case 'reveal':
        if (fresh) renderReveal(s);
        break;
      case 'podium':
        if (fresh) renderPodium(s);
        break;
    }
    updateMainButton();
  }

  function renderLobby(s) {
    const base = s.joinUrl.replace(/\/?\?code=.*$/, '');
    $('#joinUrlText').textContent = base.replace(/^https?:\/\//, '');
    $('#codeBig').textContent = s.code;
    if (s.qr) $('#qrImg').src = s.qr;
    $('#lanWarning').hidden = !/\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(s.joinUrl);
    renderPlayers(s.players);
    showView('v-lobby');
  }

  function renderPlayers(players) {
    const list = $('#playerList');
    $('#playerCount').textContent = t('players_count', { n: players.length });
    $('#lpWaiting').hidden = players.length > 0;
    const ids = new Set(players.map((p) => p.id));
    // Remove players that left / were kicked.
    list.querySelectorAll('.lp-player').forEach((el) => {
      if (!ids.has(el.dataset.id)) el.remove();
    });
    let added = false;
    for (const p of players) {
      let el = list.querySelector(`.lp-player[data-id="${CSS.escape(p.id)}"]`);
      if (!el) {
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'lp-player';
        el.dataset.id = p.id;
        el.textContent = p.nickname;
        list.appendChild(el);
        if (!knownPlayers.has(p.id)) added = true;
      }
      knownPlayers.add(p.id);
      el.classList.toggle('offline', !p.connected);
      el.title = p.connected ? '' : t('offline');
    }
    if (added && state && state.phase === 'lobby') Sound.join();
  }

  function renderIntro(s) {
    $('#introNum').textContent = t('question_n', { n: s.qIndex + 1, total: s.total });
    $('#introText').textContent = s.question.text;
    const fill = $('#introFill');
    const total = s.remainingMs || 1;
    runTimer(s.remainingMs, total, (_left, frac) => (fill.style.transform = `scaleX(${1 - frac})`));
    showView('v-intro');
    Sound.go();
  }

  function renderQuestion(s) {
    const q = s.question;
    $('#qText').textContent = q.text;
    const wrap = $('#qImageWrap');
    const img = $('#qImage');
    // Keep the column in place (visibility, not display) so timer and counter don't shift.
    if (q.image) img.src = q.image;
    else img.removeAttribute('src');
    wrap.style.visibility = q.image ? 'visible' : 'hidden';
    $('#qAnswers').innerHTML = q.options
      .map((o, i) => `<div class="s-answer ans-${i}">${shape(i)}<span class="txt">${escapeHtml(o)}</span></div>`)
      .join('');

    const ringFill = $('#ringFill');
    const timerBox = document.querySelector('.sq-timer');
    const secEl = $('#qSeconds');
    lastTickSecond = null;
    runTimer(s.remainingMs, q.timeLimit * 1000, (left, frac) => {
      ringFill.style.strokeDashoffset = String(100 * (1 - frac));
      const sec = Math.ceil(left / 1000);
      secEl.textContent = sec;
      timerBox.classList.toggle('urgent', sec <= 5 && left > 0);
      if (sec !== lastTickSecond) {
        if (lastTickSecond !== null && sec > 0) Sound.tick(sec <= 5);
        if (lastTickSecond !== null && sec === 0) Sound.timeUp();
        lastTickSecond = sec;
      }
    });
    showView('v-question');
  }

  function updateAnswerCount(answered, total) {
    $('#answeredNum').textContent = answered;
    $('#answeredOf').textContent = `/ ${total}`;
  }

  function renderReveal(s) {
    const q = s.question;
    const r = s.reveal;
    $('#rText').textContent = q.text;
    const max = Math.max(1, ...r.distribution);
    $('#rChart').innerHTML = q.options
      .map(
        (o, i) => `
      <div class="bar-col ${i === q.correct ? 'correct' : 'dim'}">
        <div class="bar-count">${r.distribution[i]}</div>
        <div class="bar ans-${i}" data-h="${(r.distribution[i] / max) * 100}"></div>
        <div class="bar-label ans-${i}">${shape(i)}<span>${escapeHtml(o)}</span></div>
      </div>`
      )
      .join('');
    // Grow bars after the view is shown so the height transition runs.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.querySelectorAll('#rChart .bar').forEach((b) => (b.style.height = `calc(${b.dataset.h}% * 0.7)`))
      )
    );
    const sum = $('#rSummary');
    sum.textContent = r.correctCount ? t('n_correct', { n: r.correctCount }) : t('nobody_correct');
    sum.classList.toggle('none', !r.correctCount);

    $('#rLeaderboard').innerHTML = r.top
      .map(
        (p, i) => `
      <div class="lb-row" style="animation-delay:${0.3 + i * 0.1}s">
        <span class="lb-rank">${p.rank}</span>
        <span class="lb-name">${escapeHtml(p.nickname)}</span>
        ${p.streak >= 3 ? `<span class="lb-streak">🔥${p.streak}</span>` : ''}
        <span class="lb-score">${fmt(p.score)}</span>
      </div>`
      )
      .join('');
    showView('v-reveal');
    if (r.correctCount) Sound.correct();
    else Sound.wrong();
  }

  function renderPodium(s) {
    clearPodiumTimers();
    const top = s.ranking;
    const medals = ['🥇', '🥈', '🥉'];
    const col = (place) => {
      const p = top[place - 1];
      return `
      <div class="pd-col pd-${place}${p ? '' : ' empty'}">
        <div class="pd-who">
          ${p ? `<div class="pd-medal">${medals[place - 1]}</div><div class="pd-name">${escapeHtml(p.nickname)}</div><div class="pd-score">${escapeHtml(t('points', { n: fmt(p.score) }))}</div>` : ''}
        </div>
        <div class="pd-block">${place}</div>
      </div>`;
    };
    $('#podium').innerHTML = col(2) + col(1) + col(3);
    $('#others').innerHTML = top
      .slice(3)
      .map((p) => `<div class="lb-row"><span class="lb-rank">${p.rank}</span><span class="lb-name">${escapeHtml(p.nickname)}</span><span class="lb-score">${fmt(p.score)}</span></div>`)
      .join('');
    $('#others').classList.remove('show');
    showView('v-podium');

    // Reveal 3rd, then 2nd, then 1st with a drumroll and confetti.
    const up = (place) => {
      const el = document.querySelector(`.pd-${place}`);
      if (el) el.classList.add('up');
    };
    podiumTimers.push(setTimeout(() => up(3), 600));
    podiumTimers.push(setTimeout(() => up(2), 1800));
    podiumTimers.push(setTimeout(() => Sound.drumroll(1.6), 2400));
    podiumTimers.push(
      setTimeout(() => {
        up(1);
        Sound.podium();
        window.Confetti.burst(6);
      }, 4200)
    );
    podiumTimers.push(setTimeout(() => $('#others').classList.add('show'), 5200));
  }

  // ---------- controls ----------

  function updateMainButton() {
    const btn = $('#mainBtn');
    const s = state;
    if (!s) return (btn.hidden = true);
    btn.hidden = false;
    btn.classList.remove('subtle');
    if (s.phase === 'lobby') {
      btn.textContent = t('start');
      btn.disabled = s.players.length === 0;
    } else if (s.phase === 'reveal') {
      btn.textContent = s.isLast ? t('show_results') : t('next');
      btn.disabled = false;
    } else if (s.phase === 'podium') {
      btn.textContent = t('new_game');
      btn.disabled = false;
    } else {
      btn.hidden = true;
    }
  }

  async function mainAction() {
    if (!state || busy) return;
    const btn = $('#mainBtn');
    if (btn.hidden || btn.disabled) return;
    if (state.phase === 'podium') return newGame();
    busy = true;
    const res = await emitAck(socket, 'host:next');
    busy = false;
    if (res.error && res.error !== 'not_allowed') showToastError(res.error);
  }

  async function newGame() {
    await emitAck(socket, 'host:end');
    writeSession(null);
    location.href = '/host';
  }

  function showToastError(code) {
    // The big screen has no toast area; reuse the connection banner briefly.
    const b = $('#connBanner');
    b.textContent = tErr(code);
    b.hidden = false;
    setTimeout(() => {
      b.hidden = socket.connected;
      b.textContent = t('reconnecting');
    }, 2500);
  }

  $('#mainBtn').addEventListener('click', mainAction);
  $('#skipBtn').addEventListener('click', () => emitAck(socket, 'host:skip'));

  $('#playerList').addEventListener('click', async (e) => {
    const el = e.target.closest('.lp-player');
    if (!el) return;
    if (!confirm(t('confirm_kick', { name: el.textContent }))) return;
    await emitAck(socket, 'host:kick', { playerId: el.dataset.id });
  });

  $('#endBtn').addEventListener('click', async () => {
    if (state && state.phase !== 'podium' && !confirm(t('confirm_end'))) return;
    newGame();
  });

  function updateMuteBtn() {
    const muted = Sound.isMuted();
    const btn = $('#muteBtn');
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = t(muted ? 'unmute' : 'mute');
  }
  $('#muteBtn').addEventListener('click', () => {
    Sound.toggle();
    updateMuteBtn();
  });

  $('#fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
      e.preventDefault();
      mainAction();
    } else if (e.key === 'm' || e.key === 'M') {
      Sound.toggle();
      updateMuteBtn();
    } else if (e.key === 'f' || e.key === 'F') {
      $('#fsBtn').click();
    }
  });

  // ---------- socket ----------

  socket.on('connect', () => {
    $('#connBanner').hidden = true;
    connectGame();
  });
  socket.on('disconnect', () => ($('#connBanner').hidden = false));
  socket.on('state', render);
  socket.on('players', (players) => {
    if (!state) return;
    state.players = players;
    if (state.phase === 'lobby') renderPlayers(players);
    if (state.phase === 'question') updateAnswerCount(state.answeredCount, players.length);
    updateMainButton();
  });
  socket.on('answers', ({ answeredCount, playerCount }) => {
    if (!state) return;
    state.answeredCount = answeredCount;
    if (state.phase === 'question') updateAnswerCount(answeredCount, playerCount);
  });

  updateMuteBtn();
  showView('v-loading');
})();
