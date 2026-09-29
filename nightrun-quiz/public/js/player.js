// Player (phone) client.
(function () {
  'use strict';

  const { t, tErr, $, showView, shape, fmt, storage, emitAck, escapeHtml, vibrate } = window.NR;
  const SESSION_KEY = 'nr_player_session';
  const NICK_KEY = 'nr_player_nick';

  document.title = t('page_title_player');

  const socket = io({ reconnectionDelay: 500, reconnectionDelayMax: 3000 });
  let session = storage.get(SESSION_KEY, null); // { code, playerId, playerToken }
  let state = null;
  let renderedKey = '';
  let timerRaf = 0;

  // ---------- helpers ----------

  function saveSession(s) {
    session = s;
    storage.set(SESSION_KEY, s);
  }

  function clearSession() {
    session = null;
    storage.remove(SESSION_KEY);
    state = null;
    renderedKey = '';
    document.body.classList.remove('in-game', 'answering');
    $('#topBar').hidden = true;
  }

  function showMessage(text) {
    stopTimer();
    $('#messageText').textContent = text;
    showView('v-message');
  }

  function showJoin(errorText) {
    stopTimer();
    clearSession();
    $('#joinError').textContent = errorText || '';
    showView('v-join');
  }

  function stopTimer() {
    cancelAnimationFrame(timerRaf);
    timerRaf = 0;
  }

  // Animate a countdown from remainingMs (server-relative, so no clock skew issues).
  function runTimer(remainingMs, totalMs, onFrame) {
    stopTimer();
    const endAt = performance.now() + remainingMs;
    const frame = () => {
      const left = Math.max(0, endAt - performance.now());
      onFrame(left, Math.min(1, left / totalMs));
      if (left > 0) timerRaf = requestAnimationFrame(frame);
    };
    frame();
  }

  function updateMuteBtn() {
    const muted = window.Sound.isMuted();
    const btn = $('#muteBtn');
    btn.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', t(muted ? 'unmute' : 'mute'));
  }

  // ---------- rendering ----------

  function render(s) {
    state = s;
    document.body.classList.add('in-game');
    $('#topBar').hidden = false;
    $('#topNick').textContent = s.nickname;
    $('#topScore').textContent = fmt(s.score);
    document.body.classList.toggle('answering', s.phase === 'question' && s.answered == null);

    const key = `${s.phase}:${s.qIndex}:${s.phase === 'question' ? (s.answered == null ? 'open' : 'done') : ''}`;
    const fresh = key !== renderedKey;
    renderedKey = key;

    switch (s.phase) {
      case 'lobby':
        stopTimer();
        $('#lobbyNick').textContent = s.nickname;
        $('#lobbyCount').textContent = t('lobby_players', { n: s.playerCount });
        showView('v-lobby');
        break;
      case 'intro':
        if (fresh) renderIntro(s);
        break;
      case 'question':
        if (!fresh) break;
        if (s.answered == null) renderQuestion(s);
        else renderAnswered(s.answered);
        break;
      case 'reveal':
        if (fresh) renderResult(s);
        break;
      case 'podium':
        if (fresh) renderFinal(s);
        break;
    }
  }

  function renderIntro(s) {
    $('#introNum').textContent = t('question_n', { n: s.qIndex + 1, total: s.total });
    const fill = $('#introFill');
    const total = s.remainingMs || 1;
    runTimer(s.remainingMs, total, (_left, frac) => (fill.style.transform = `scaleX(${frac})`));
    showView('v-intro');
    vibrate(40);
  }

  function renderQuestion(s) {
    $('#qNum').textContent = t('question_n', { n: s.qIndex + 1, total: s.total });
    const grid = $('#answerGrid');
    grid.classList.remove('locked');
    grid.innerHTML = s.question.options
      .map(
        (opt, i) =>
          `<button class="answer-btn ans-${i}" type="button" data-choice="${i}">${shape(i)}<span>${escapeHtml(opt)}</span></button>`
      )
      .join('');
    const fill = $('#qTimeFill');
    const timer = $('#qTimer');
    runTimer(s.remainingMs, s.question.timeLimit * 1000, (left, frac) => {
      fill.style.transform = `scaleX(${frac})`;
      timer.textContent = t('seconds_short', { n: Math.ceil(left / 1000) });
    });
    showView('v-question');
  }

  function renderAnswered(choice, title) {
    stopTimer();
    const box = $('#answeredShape');
    box.className = `answered-shape ans-${choice}`;
    box.innerHTML = shape(choice);
    $('#answeredTitle').textContent = title || t('answered_title');
    document.body.classList.remove('answering');
    showView('v-answered');
  }

  async function answer(choice) {
    const grid = $('#answerGrid');
    if (grid.classList.contains('locked')) return;
    grid.classList.add('locked');
    grid.querySelector(`[data-choice="${choice}"]`).classList.add('picked');
    vibrate(30);
    const res = await emitAck(socket, 'player:answer', { choice });
    if (res.ok || res.error === 'already_answered') {
      renderedKey = `question:${state.qIndex}:done`;
      renderAnswered(choice);
    } else if (res.error === 'not_accepting') {
      renderAnswered(choice, t('too_late'));
    } else {
      grid.classList.remove('locked');
      grid.querySelectorAll('.picked').forEach((b) => b.classList.remove('picked'));
    }
  }

  function renderResult(s) {
    stopTimer();
    const r = s.result;
    const box = $('#v-result');
    const good = !!(r && r.correct);
    box.classList.toggle('good', good);
    box.classList.toggle('bad', !!r && !good);
    $('#fbIcon').textContent = !r ? '🏃' : good ? '✓' : '✗';
    $('#fbTitle').textContent = !r ? t('get_ready') : good ? t('correct') : r.answered ? t('wrong') : t('no_answer');
    $('#fbPoints').textContent = good ? t('points_earned', { n: fmt(r.points) }) : '';
    $('#fbStreak').textContent =
      r && r.bonus ? t('streak_bonus', { n: r.streak, bonus: r.bonus }) : r && r.streak >= 2 ? t('streak_line', { n: r.streak }) : '';
    $('#fbCorrect').textContent = good ? '' : t('correct_was', { text: s.correctText });
    $('#fbRank').textContent = t('your_rank', { rank: s.rank });
    $('#fbTotal').textContent = t('total_score', { score: fmt(s.score) });
    showView('v-result');
    if (r) {
      if (good) {
        window.Sound.correct();
        vibrate([60, 40, 60]);
      } else {
        window.Sound.wrong();
        vibrate(300);
      }
    }
  }

  function renderFinal(s) {
    stopTimer();
    const medals = ['🥇', '🥈', '🥉'];
    $('#finalMedal').textContent = medals[s.rank - 1] || '🏁';
    $('#finalRank').textContent = t('final_rank', { rank: s.rank });
    $('#finalOf').textContent = t('final_of', { n: s.playerCount });
    $('#finalScore').textContent = t('points', { n: fmt(s.score) });
    $('#finalCorrect').textContent = t('final_correct', { n: s.correctCount, total: s.total });
    const myId = session && session.playerId;
    $('#finalTop').innerHTML = s.top3
      .map(
        (p) =>
          `<div class="row${p.id === myId ? ' me' : ''}"><span>${medals[p.rank - 1] || p.rank} ${escapeHtml(p.nickname)}</span><span>${fmt(p.score)}</span></div>`
      )
      .join('');
    showView('v-final');
    if (s.rank <= 3) window.Sound.podium();
    vibrate([100, 60, 100, 60, 200]);
  }

  // ---------- socket events ----------

  socket.on('connect', async () => {
    $('#connBanner').hidden = true;
    if (!session) return;
    const res = await emitAck(socket, 'player:rejoin', session);
    if (res.error && res.error !== 'network') showJoin(tErr(res.error));
  });

  socket.on('disconnect', () => {
    if (session) $('#connBanner').hidden = false;
  });

  socket.on('state', render);

  socket.on('kicked', () => {
    clearSession();
    showMessage(t('kicked'));
  });

  socket.on('ended', () => {
    clearSession();
    showMessage(t('game_ended'));
  });

  socket.on('replaced', () => {
    // Another tab took over this player; don't clear the session (that tab uses it).
    session = null;
    state = null;
    showMessage(t('replaced'));
  });

  // Phones pause background tabs; reconnect right away when the screen turns back on.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
  });

  // ---------- UI events ----------

  $('#answerGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.answer-btn');
    if (btn) answer(Number(btn.dataset.choice));
  });

  const codeInput = $('#codeInput');
  const nickInput = $('#nickInput');
  codeInput.addEventListener('input', () => (codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6)));

  $('#joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    const nickname = nickInput.value.replace(/\s+/g, ' ').trim();
    const err = $('#joinError');
    if (!/^\d{6}$/.test(code)) return (err.textContent = tErr('code_invalid'));
    if (nickname.length < 2 || nickname.length > 16) return (err.textContent = tErr('nickname_invalid'));
    err.textContent = '';
    const btn = $('#joinBtn');
    btn.disabled = true;
    btn.textContent = t('joining');
    window.Sound.join();
    const res = await emitAck(socket, 'player:join', { code, nickname });
    btn.disabled = false;
    btn.textContent = t('join_btn');
    if (res.error) {
      err.textContent = tErr(res.error);
      vibrate(200);
      return;
    }
    storage.set(NICK_KEY, nickname);
    saveSession({ code: res.code, playerId: res.playerId, playerToken: res.playerToken });
    history.replaceState(null, '', '/');
  });

  function playAgain() {
    socket.emit('player:leave');
    showJoin('');
    codeInput.value = '';
    codeInput.focus();
  }
  $('#againBtn').addEventListener('click', playAgain);
  $('#messageBtn').addEventListener('click', playAgain);

  $('#muteBtn').addEventListener('click', () => {
    window.Sound.toggle();
    updateMuteBtn();
  });

  // ---------- start ----------

  function init() {
    updateMuteBtn();
    const urlCode = new URLSearchParams(location.search).get('code');
    if (urlCode) codeInput.value = urlCode.replace(/\D/g, '').slice(0, 6);
    nickInput.value = storage.get(NICK_KEY, '');
    if (session) {
      // Rejoin happens on 'connect'; show the waiting screen meanwhile.
      $('#lobbyNick').textContent = '';
      $('#lobbyCount').textContent = t('loading');
      showView('v-lobby');
      if (urlCode && urlCode !== session.code) showJoin('');
    } else {
      showView('v-join');
      (codeInput.value ? nickInput : codeInput).focus();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
