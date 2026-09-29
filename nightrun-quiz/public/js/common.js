// Shared helpers for all pages: translation, DOM helpers, shapes, wordmark.
(function () {
  'use strict';

  // t('key', { n: 3 }) -> translated string with placeholders filled.
  function t(key, params) {
    let s = key.split('.').reduce((o, k) => (o == null ? o : o[k]), window.LANG);
    if (typeof s !== 'string') return key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
    return s;
  }

  // Translate a server error code (optionally with question number).
  function tErr(code, index) {
    const known = window.LANG.errors[code];
    return known ? t('errors.' + code, { n: index }) : t('errors.unknown');
  }

  // Fill static text: data-i18n, data-i18n-placeholder, data-i18n-title, data-i18n-aria.
  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
    root.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.documentElement.lang = window.LANG.code;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // 12500 -> "12 500"
  function fmt(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  // Answer shapes so color-blind players can tell the options apart.
  const SHAPES = [
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 L29 27 H3 Z"/></svg>',
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 L30 16 L16 30 L2 16 Z"/></svg>',
    '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/></svg>',
    '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="2"/></svg>',
  ];

  function shape(i) {
    return `<span class="shape shape-${i}" role="img" aria-label="${escapeHtml(t('answer_shapes')[i] || '')}">${SHAPES[i]}</span>`;
  }

  // Night Run wordmark. If public/img/logo.png exists, it replaces the text.
  function renderWordmarks() {
    $$('.wordmark').forEach((el) => {
      if (el.dataset.ready) return;
      el.dataset.ready = '1';
      el.innerHTML = '<img class="wm-logo" alt="Night Run" hidden><span class="wm-text"><span class="wm-night">NIGHT</span><span class="wm-run">RUN</span></span>';
      const img = el.querySelector('img');
      img.onload = () => {
        img.hidden = false;
        el.classList.add('has-logo');
      };
      img.onerror = () => img.remove();
      img.src = '/img/logo.png';
    });
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {}
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    },
  };

  // Emit with acknowledgement as a promise, with a timeout.
  function emitAck(socket, event, payload, timeoutMs) {
    return new Promise((resolve) => {
      socket.timeout(timeoutMs || 8000).emit(event, payload, (err, res) => {
        resolve(err ? { error: 'network' } : res || { error: 'unknown' });
      });
    });
  }

  // Show one .view inside a container, hide the rest (CSS handles the transition).
  function showView(id) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === id));
  }

  window.NR = { t, tErr, applyI18n, escapeHtml, fmt, $, $$, shape, renderWordmarks, vibrate, storage, emitAck, showView };

  document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    renderWordmarks();
  });
})();
