(function () {
    'use strict';

    var TZ = 'Asia/Tashkent';
    var TZ_OFFSET = '+05:00'; // O'zbekistonda yozgi vaqt yo'q
    var HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabiul avval', 'Rabiul oxir', 'Jumodul avval', 'Jumodul oxir',
        'Rajab', "Sha'bon", 'Ramazon', 'Shavvol', "Zulqa'da", 'Zulhijja'];

    function store(key, value) {
        try {
            if (value === undefined) return localStorage.getItem(key);
            localStorage.setItem(key, value);
        } catch (e) { return null; }
    }

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* Theme ------------------------------------------------------------- */
    $all('[data-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var root = document.documentElement;
            var current = root.dataset.theme ||
                (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            var next = current === 'dark' ? 'light' : 'dark';
            root.dataset.theme = next;
            store('theme', next);
        });
    });

    /* Schedule ---------------------------------------------------------- */
    var schedule = [];
    var dataEl = $('#schedule-data');
    if (dataEl) {
        try { schedule = JSON.parse(dataEl.textContent) || []; } catch (e) { schedule = []; }
    }

    function todayKey() {
        // YYYY-MM-DD Toshkent vaqti bo'yicha
        return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
            .format(new Date());
    }

    /* Hijri date -------------------------------------------------------- */
    function hijriText() {
        var key = todayKey();
        for (var i = 0; i < schedule.length; i++) {
            if (schedule[i][0] === key) return schedule[i][3] + ' Ramazon 1447';
        }
        try {
            var parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
                timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric'
            }).formatToParts(new Date());
            var p = {};
            parts.forEach(function (x) { p[x.type] = x.value; });
            var month = HIJRI_MONTHS[parseInt(p.month, 10) - 1];
            if (!month || !p.day) return '';
            return p.day + ' ' + month + ' ' + parseInt(p.year, 10);
        } catch (e) { return ''; }
    }
    var hijri = hijriText();
    $all('[data-hijri]').forEach(function (el) {
        if (hijri) el.textContent = ' · ' + hijri + ' h.';
    });

    /* Countdown --------------------------------------------------------- */
    var countdown = $('[data-countdown]');
    if (countdown && schedule.length) {
        var events = [];
        schedule.forEach(function (r) {
            events.push({ at: new Date(r[0] + 'T' + r[1] + ':00' + TZ_OFFSET).getTime(), key: 'saharlik', label: 'Saharlik tugashiga' });
            events.push({ at: new Date(r[0] + 'T' + r[2] + ':00' + TZ_OFFSET).getTime(), key: 'iftorlik', label: 'Iftorlikka' });
        });

        var valueEl = $('[data-countdown-value]');
        var labelEl = $('[data-countdown-label]');
        var barEl = $('[data-countdown-bar]');
        var initialIndex = null;

        function pad(n) { return n < 10 ? '0' + n : String(n); }

        var tick = function () {
            var now = Date.now();
            var i = 0;
            while (i < events.length && events[i].at <= now) i++;

            if (initialIndex === null) initialIndex = i;
            if (i !== initialIndex) {
                // Hodisa o'tdi — sahifadagi sarlavha va jadvalni yangilaymiz.
                setTimeout(function () { location.reload(); }, 1500);
                tick = function () {};
                valueEl.textContent = '00:00:00';
                return;
            }
            if (i >= events.length) {
                countdown.hidden = true;
                return;
            }

            var next = events[i];
            var prevAt = i > 0 ? events[i - 1].at : next.at - 12 * 3600 * 1000;
            var left = Math.max(0, Math.floor((next.at - now) / 1000));

            valueEl.textContent = pad(Math.floor(left / 3600)) + ':' + pad(Math.floor(left % 3600 / 60)) + ':' + pad(left % 60);
            labelEl.textContent = next.label;
            barEl.style.width = Math.min(100, Math.max(0, (now - prevAt) / (next.at - prevAt) * 100)).toFixed(2) + '%';

            $all('[data-tile]').forEach(function (t) {
                t.classList.toggle('is-next', t.getAttribute('data-tile') === next.key);
            });
        };

        tick();
        setInterval(function () { tick(); }, 1000);
    }

    /* Remember last city ------------------------------------------------ */
    var cityPage = $('[data-city-page]');
    if (cityPage) {
        store('lastCity', cityPage.getAttribute('data-city-page'));
    }

    var resume = $('[data-last-city]');
    var lastSlug = store('lastCity');
    if (resume && lastSlug) {
        var card = $('[data-city="' + (window.CSS && CSS.escape ? CSS.escape(lastSlug) : lastSlug) + '"]');
        if (card) {
            resume.href = card.getAttribute('href');
            $('[data-last-city-name]', resume).textContent = card.getAttribute('data-name');
            resume.hidden = false;
        }
    }

    /* City search ------------------------------------------------------- */
    var search = $('[data-city-search]');
    if (search) {
        var items = $all('[data-city-grid] li');
        var empty = $('[data-city-empty]');
        var norm = function (s) { return s.toLowerCase().replace(/[‘’ʻʼ`']/g, ''); };
        search.addEventListener('input', function () {
            var q = norm(search.value.trim());
            var shown = 0;
            items.forEach(function (li) {
                var hit = !q || norm(li.firstElementChild.getAttribute('data-search')).indexOf(q) !== -1;
                li.hidden = !hit;
                if (hit) shown++;
            });
            empty.hidden = shown !== 0;
        });
        search.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            var first = items.filter(function (li) { return !li.hidden; })[0];
            if (first) location.href = first.firstElementChild.href;
        });
    }

    /* Share ------------------------------------------------------------- */
    var share = $('[data-share]');
    if (share) {
        share.addEventListener('click', function () {
            var data = { title: document.title, url: location.href };
            if (navigator.share) {
                navigator.share(data).catch(function () {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(location.href).then(function () {
                    var old = share.lastChild.textContent;
                    share.lastChild.textContent = ' Havola nusxalandi';
                    setTimeout(function () { share.lastChild.textContent = old; }, 2000);
                });
            }
        });
    }
})();
