// Host panel: login and quiz management (create / edit / delete / start).
(function () {
  'use strict';

  const { t, tErr, $, showView, shape, escapeHtml, storage } = window.NR;
  const TOKEN_KEY = 'nr_host_token';
  const TIME_LIMITS = [10, 20, 30];

  document.title = t('page_title_host');

  let token = storage.get(TOKEN_KEY, null);
  let draft = null; // quiz being edited
  let dirty = false;

  // ---------- api ----------

  async function api(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      return { error: 'network' };
    }
    const data = await res.json().catch(() => ({ error: 'unknown' }));
    if (res.status === 401 && url !== '/api/login') {
      logout();
      toast(tErr('unauthorized'), true);
    }
    return res.ok ? data : { error: data.error || 'unknown', index: data.index };
  }

  let toastTimer;
  function toast(msg, isError) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- auth ----------

  function logout() {
    token = null;
    storage.remove(TOKEN_KEY);
    showView('v-login');
    setTimeout(() => $('#passwordInput').focus(), 50);
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await api('POST', '/api/login', { password: $('#passwordInput').value });
    if (res.error) {
      $('#loginError').textContent = tErr(res.error);
      return;
    }
    token = res.token;
    storage.set(TOKEN_KEY, token);
    $('#passwordInput').value = '';
    $('#loginError').textContent = '';
    loadList();
  });

  $('#logoutBtn').addEventListener('click', logout);

  // ---------- quiz list ----------

  async function loadList() {
    showView('v-list');
    const list = $('#quizList');
    list.innerHTML = `<div class="empty">${escapeHtml(t('loading'))}</div>`;
    const res = await api('GET', '/api/quizzes');
    if (res.error) {
      list.innerHTML = `<div class="empty">${escapeHtml(tErr(res.error))}</div>`;
      return;
    }
    if (!res.quizzes.length) {
      list.innerHTML = `<div class="empty">${escapeHtml(t('empty_quizzes'))}</div>`;
      return;
    }
    list.innerHTML = res.quizzes
      .map(
        (q, i) => `
      <div class="quiz-card" style="animation-delay:${i * 0.05}s" data-id="${escapeHtml(q.id)}">
        <div class="qc-icon">🏃</div>
        <div class="qc-info">
          <h3>${escapeHtml(q.title)}</h3>
          <div class="qc-meta">${escapeHtml(t('n_questions', { n: q.questionCount }))}</div>
        </div>
        <div class="qc-actions">
          <button class="btn btn-primary" data-act="start">▶ ${escapeHtml(t('start_game'))}</button>
          <button class="btn btn-ghost" data-act="edit">${escapeHtml(t('edit'))}</button>
          <button class="btn btn-danger" data-act="delete" data-title="${escapeHtml(q.title)}">${escapeHtml(t('delete'))}</button>
        </div>
      </div>`
      )
      .join('');
  }

  $('#quizList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.quiz-card').dataset.id;
    if (btn.dataset.act === 'start') {
      location.href = `/screen?quiz=${encodeURIComponent(id)}`;
    } else if (btn.dataset.act === 'edit') {
      const res = await api('GET', `/api/quizzes/${encodeURIComponent(id)}`);
      if (res.error) return toast(tErr(res.error), true);
      openEditor(res.quiz);
    } else if (btn.dataset.act === 'delete') {
      if (!confirm(t('confirm_delete', { title: btn.dataset.title }))) return;
      const res = await api('DELETE', `/api/quizzes/${encodeURIComponent(id)}`);
      if (res.error) return toast(tErr(res.error), true);
      loadList();
    }
  });

  $('#newQuizBtn').addEventListener('click', () => openEditor(null));

  // ---------- editor ----------

  function blankQuestion() {
    return { text: '', options: ['', '', '', ''], correct: 0, timeLimit: 20, image: '' };
  }

  function openEditor(quiz) {
    draft = quiz
      ? JSON.parse(JSON.stringify({ id: quiz.id, title: quiz.title, questions: quiz.questions }))
      : { id: null, title: '', questions: [blankQuestion()] };
    dirty = false;
    $('#editorTitle').textContent = t(quiz ? 'editor_edit' : 'editor_new');
    $('#quizTitle').value = draft.title;
    $('#editorError').textContent = '';
    renderQuestions();
    showView('v-editor');
    window.scrollTo(0, 0);
  }

  function renderQuestions() {
    $('#questionList').innerHTML = draft.questions.map(questionHtml).join('');
  }

  function questionHtml(q, i) {
    const n = draft.questions.length;
    return `
    <div class="q-card" data-i="${i}">
      <div class="q-head">
        <span class="q-num">${escapeHtml(t('question_label', { n: i + 1 }))}</span>
        <button class="icon-btn" data-act="up" title="${escapeHtml(t('move_up'))}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-act="down" title="${escapeHtml(t('move_down'))}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon-btn" data-act="remove" title="${escapeHtml(t('remove_question'))}">✕</button>
      </div>
      <textarea class="input q-text" data-field="text" maxlength="300" placeholder="${escapeHtml(t('question_text_ph'))}">${escapeHtml(q.text)}</textarea>
      <div class="q-options">
        ${q.options
          .map(
            (o, j) => `
          <div class="q-opt${q.correct === j ? ' is-correct' : ''}">
            <button class="mark ans-${j}" type="button" data-act="correct" data-j="${j}" title="${escapeHtml(t('mark_correct'))}">${shape(j)}</button>
            <input class="input" data-field="option" data-j="${j}" maxlength="120" value="${escapeHtml(o)}" placeholder="${escapeHtml(t('option_ph', { n: j + 1 }))}">
          </div>`
          )
          .join('')}
      </div>
      <div class="q-bottom">
        <div class="q-time">
          <span class="q-label">${escapeHtml(t('time_label'))}</span>
          <div class="seg">
            ${TIME_LIMITS.map((s) => `<button type="button" data-act="time" data-s="${s}" class="${q.timeLimit === s ? 'on' : ''}">${escapeHtml(t('seconds', { n: s }))}</button>`).join('')}
          </div>
        </div>
        <div class="q-image">
          <span class="q-label">${escapeHtml(t('image_label'))}</span>
          <div class="q-image-row">
            <label class="btn btn-ghost">${escapeHtml(t('image_upload'))}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-act="upload" hidden></label>
            <input class="input" data-field="image" value="${escapeHtml(q.image && !q.image.startsWith('/uploads/') ? q.image : '')}" placeholder="${escapeHtml(t('image_url_ph'))}">
          </div>
          ${
            q.image
              ? `<div class="q-preview"><img src="${escapeHtml(q.image)}" alt=""><button class="icon-btn" type="button" data-act="rmimg" title="${escapeHtml(t('image_remove'))}">✕</button></div>`
              : ''
          }
        </div>
      </div>
    </div>`;
  }

  const qList = $('#questionList');

  qList.addEventListener('input', (e) => {
    const card = e.target.closest('.q-card');
    if (!card) return;
    const q = draft.questions[Number(card.dataset.i)];
    const f = e.target.dataset.field;
    if (f === 'text') q.text = e.target.value;
    else if (f === 'option') q.options[Number(e.target.dataset.j)] = e.target.value;
    else if (f === 'image') q.image = e.target.value.trim();
    dirty = true;
  });

  // Refresh the preview when an image URL is typed and the field loses focus.
  qList.addEventListener('change', (e) => {
    if (e.target.dataset.field === 'image') renderQuestions();
  });

  qList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.dataset.act === 'upload') return;
    const i = Number(btn.closest('.q-card').dataset.i);
    const qs = draft.questions;
    const q = qs[i];
    switch (btn.dataset.act) {
      case 'correct':
        q.correct = Number(btn.dataset.j);
        break;
      case 'time':
        q.timeLimit = Number(btn.dataset.s);
        break;
      case 'up':
        if (i > 0) [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
        break;
      case 'down':
        if (i < qs.length - 1) [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
        break;
      case 'remove':
        if ((q.text || q.options.some(Boolean)) && !confirm(t('confirm_remove_question'))) return;
        qs.splice(i, 1);
        break;
      case 'rmimg':
        q.image = '';
        break;
      default:
        return;
    }
    dirty = true;
    renderQuestions();
  });

  qList.addEventListener('change', async (e) => {
    if (e.target.dataset.act !== 'upload' || !e.target.files[0]) return;
    const i = Number(e.target.closest('.q-card').dataset.i);
    const label = e.target.closest('label');
    const file = e.target.files[0];
    label.firstChild.textContent = t('image_uploading');
    try {
      const dataUrl = await prepareImage(file);
      const res = await api('POST', '/api/upload', { dataUrl });
      if (res.error) throw new Error(res.error);
      draft.questions[i].image = res.url;
      dirty = true;
      renderQuestions();
    } catch (err) {
      toast(tErr(err.message), true);
      label.firstChild.textContent = t('image_upload');
    }
  });

  // Downscale big photos in the browser so uploads stay small and fast on projector Wi-Fi.
  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error('image_invalid'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('image_invalid'));
      reader.onload = () => {
        const dataUrl = reader.result;
        if (file.type === 'image/gif') {
          return file.size > 5 * 1024 * 1024 ? reject(new Error('image_too_large')) : resolve(dataUrl);
        }
        const img = new Image();
        img.onerror = () => reject(new Error('image_invalid'));
        img.onload = () => {
          const MAX = 1600;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 1.5 * 1024 * 1024) return resolve(dataUrl);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  $('#quizTitle').addEventListener('input', (e) => {
    draft.title = e.target.value;
    dirty = true;
  });

  $('#addQuestionBtn').addEventListener('click', () => {
    draft.questions.push(blankQuestion());
    dirty = true;
    renderQuestions();
    const cards = qList.querySelectorAll('.q-card');
    const last = cards[cards.length - 1];
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    last.querySelector('.q-text').focus({ preventScroll: true });
  });

  async function save() {
    const errEl = $('#editorError');
    errEl.textContent = '';
    const body = { title: draft.title, questions: draft.questions };
    const res = draft.id ? await api('PUT', `/api/quizzes/${encodeURIComponent(draft.id)}`, body) : await api('POST', '/api/quizzes', body);
    if (res.error) {
      errEl.textContent = tErr(res.error, res.index);
      toast(errEl.textContent, true);
      if (res.index) {
        const card = qList.querySelector(`.q-card[data-i="${res.index - 1}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    dirty = false;
    toast(t('saved'));
    loadList();
  }

  $('#saveBtn').addEventListener('click', save);
  $('#saveBtn2').addEventListener('click', save);
  $('#cancelEditBtn').addEventListener('click', () => {
    if (dirty && !confirm(t('unsaved_confirm'))) return;
    loadList();
  });

  window.addEventListener('beforeunload', (e) => {
    if (dirty && $('#v-editor').classList.contains('active')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---------- start ----------

  async function init() {
    if (!token) return logout();
    const res = await api('GET', '/api/session');
    if (!res.error) loadList();
    else if (res.error !== 'unauthorized') {
      showView('v-list');
      toast(tErr(res.error), true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
