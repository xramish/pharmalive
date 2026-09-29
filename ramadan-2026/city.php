<?php
declare(strict_types=1);

require_once __DIR__ . '/inc/layout.php';

$city = city_or_null(isset($_GET['c']) ? (string) $_GET['c'] : null);

if (!$city) {
    http_response_code(404);
    page_head('Shahar topilmadi — ' . SITE_NAME, "So'ralgan shahar topilmadi.", 'page-city');
    ?>
    <main id="main" class="container narrow state-page">
        <div class="state-card">
            <h1>Shahar topilmadi</h1>
            <p>Bunday shahar ro'yxatda yo'q. Bosh sahifadan shaharni tanlang.</p>
            <a class="btn" href="./">Shaharlar ro'yxati</a>
        </div>
    </main>
    <?php
    page_foot();
    return;
}

$schedule = get_schedule($city);
$rows = $schedule['rows'] ?? [];
$now = new DateTimeImmutable('now');
$todayKey = $now->format('Y-m-d');
$byDate = array_column($rows, null, 'date');
$totalDays = count($rows);

/** Keyingi hodisa (saharlik tugashi yoki iftor) — JS ham xuddi shu mantiqni ishlatadi. */
function next_event(array $rows, DateTimeImmutable $now): ?array
{
    foreach ($rows as $r) {
        foreach (['saharlik' => 'Saharlik tugashiga', 'iftorlik' => 'Iftorlikka'] as $key => $label) {
            $at = new DateTimeImmutable($r['date'] . ' ' . $r[$key]);
            if ($at > $now) {
                return ['row' => $r, 'key' => $key, 'label' => $label, 'at' => $at];
            }
        }
    }
    return null;
}

function format_hms(int $s): string
{
    return sprintf('%02d:%02d:%02d', intdiv($s, 3600), intdiv($s % 3600, 60), $s % 60);
}

$next = $rows ? next_event($rows, $now) : null;
$todayRow = $byDate[$todayKey] ?? null;
// Iftordan keyin ertangi kun vaqtlari ko'rsatiladi.
$focusRow = $next['row'] ?? $todayRow;
$passed = count(array_filter($rows, fn($r) => new DateTimeImmutable($r['date'] . ' ' . $r['iftorlik']) <= $now));
$pct = $totalDays ? (int) round($passed / $totalDays * 100) : 0;

if (!$rows) {
    http_response_code(503);
    header('Retry-After: 300');
}

page_head(
    $city['name'] . ' — Ramazon 2026 taqvimi',
    $city['name'] . ' shahri uchun Ramazon 2026 saharlik va iftorlik vaqtlari.',
    'page-city'
);
?>
<header class="topbar">
    <div class="container topbar-inner">
        <a class="icon-btn" href="./" aria-label="Orqaga — shaharlar ro'yxati">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </a>
        <div class="topbar-title">
            <strong><?= e($city['name']) ?></strong>
            <small><?= e($city['region']) ?></small>
        </div>
        <?= theme_toggle() ?>
    </div>
</header>

<main id="main" class="container" data-city-page="<?= e($city['slug']) ?>" data-city-name="<?= e($city['name']) ?>">
<?php if (!$rows): ?>
    <div class="state-card">
        <h1>Ma'lumotni yuklab bo'lmadi</h1>
        <p>Vaqtlar manbasi hozircha javob bermayapti. Bir necha daqiqadan so'ng qayta urinib ko'ring.</p>
        <div class="state-actions">
            <a class="btn" href="city.php?c=<?= e($city['slug']) ?>">Qayta urinish</a>
            <a class="btn btn-ghost" href="./">Boshqa shahar</a>
        </div>
    </div>
<?php else: ?>
    <section class="today" aria-labelledby="today-title">
        <div class="today-head">
            <p class="eyebrow"><?= e(uz_weekday($now) . ', ' . uz_date($now)) ?><span data-hijri></span></p>
            <h1 id="today-title" data-today-title>
                <?php if ($todayRow): ?>
                    Ramazonning <?= (int) $todayRow['day'] ?>-kuni
                <?php elseif ($next): ?>
                    Ramazonga <?= (int) (new DateTimeImmutable($todayKey))->diff(new DateTimeImmutable($rows[0]['date']))->days ?> kun qoldi
                <?php else: ?>
                    Ramazon 2026 yakunlandi
                <?php endif; ?>
            </h1>
        </div>

        <?php if ($next): ?>
            <div class="countdown" data-countdown aria-live="polite">
                <span class="countdown-label" data-countdown-label><?= e($next['label']) ?></span>
                <span class="countdown-value" data-countdown-value>
                    <?= e(format_hms($next['at']->getTimestamp() - $now->getTimestamp())) ?>
                </span>
                <div class="progress" aria-hidden="true"><span data-countdown-bar></span></div>
            </div>
        <?php else: ?>
            <p class="done-note">Alloh tutgan ro'zalaringizni qabul qilsin. <span lang="ar" dir="rtl" class="arabic-inline">تَقَبَّلَ اللّٰهُ مِنَّا وَمِنْكُمْ</span></p>
        <?php endif; ?>

        <?php if ($focusRow): ?>
            <div class="time-tiles">
                <div class="tile" data-tile="saharlik">
                    <span class="tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1M16 5l-4 4-4-4"/></svg></span>
                    <span class="tile-label">Saharlik</span>
                    <span class="tile-time"><?= e($focusRow['saharlik']) ?></span>
                    <span class="tile-sub"><?= e(uz_date(new DateTimeImmutable($focusRow['date']), false)) ?> · og'iz yopish</span>
                </div>
                <div class="tile" data-tile="iftorlik">
                    <span class="tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1M8 6l4 4 4-4"/></svg></span>
                    <span class="tile-label">Iftorlik</span>
                    <span class="tile-time"><?= e($focusRow['iftorlik']) ?></span>
                    <span class="tile-sub"><?= e(uz_date(new DateTimeImmutable($focusRow['date']), false)) ?> · og'iz ochish</span>
                </div>
            </div>
        <?php endif; ?>

        <div class="month-progress">
            <div class="month-progress-row"><span>Ramazon</span><span><?= $passed ?> / <?= $totalDays ?> kun</span></div>
            <div class="progress"><span style="width: <?= $pct ?>%"></span></div>
        </div>
    </section>

    <section class="duas" aria-label="Duolar">
        <details class="dua" open>
            <summary><span>Saharlik (ro'za tutish) niyati</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary>
            <p class="arabic" lang="ar" dir="rtl">نَوَيْتُ أَنْ أَصُومَ صَوْمَ شَهْرِ رَمَضَانَ مِنَ الْفَجْرِ إِلَى الْمَغْرِبِ، خَالِصًا لِلّٰهِ تَعَالَى، اَللّٰهُ أَكْبَرُ</p>
            <p class="translit">Navaytu an asuma sovma shahri ramazona minal fajri ilal mag'ribi, xolisan lillahi ta'aalaa. Allohu akbar.</p>
            <p class="meaning">Ramazon oyining ro'zasini subhdan to kun botguncha tutmoqni niyat qildim. Xolis Alloh uchun. Alloh buyukdir.</p>
        </details>
        <details class="dua">
            <summary><span>Iftorlik (og'iz ochish) duosi</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary>
            <p class="arabic" lang="ar" dir="rtl">اَللّٰهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ، فَاغْفِرْ لِي يَا غَفَّارُ مَا قَدَّمْتُ وَمَا أَخَّرْتُ</p>
            <p class="translit">Allohumma laka sumtu va bika aamantu va a'layka tavakkaltu va a'laa rizqika aftartu, fag'firliy yaa G'offaru maa qoddamtu va maa axxortu.</p>
            <p class="meaning">Ey Alloh, ushbu ro'zamni Sen uchun tutdim, Senga iymon keltirdim, Senga tavakkal qildim va bergan rizqing bilan iftor qildim. Ey gunohlarni afv etuvchi Zot, avvalgi va keyingi gunohlarimni mag'firat qil.</p>
        </details>
    </section>

    <section class="calendar" aria-labelledby="cal-title">
        <div class="section-head">
            <h2 id="cal-title">Oylik taqvim</h2>
            <button class="btn btn-ghost btn-sm" type="button" data-share>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
                Ulashish
            </button>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th scope="col">Kun</th>
                        <th scope="col">Sana</th>
                        <th scope="col" class="col-weekday">Hafta kuni</th>
                        <th scope="col" class="col-time">Saharlik</th>
                        <th scope="col" class="col-time">Iftorlik</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($rows as $r):
                    $d = new DateTimeImmutable($r['date']);
                    $cls = $r['date'] === $todayKey ? 'is-today' : ($r['date'] < $todayKey ? 'is-past' : '');
                    if ($d->format('N') === '5') {
                        $cls .= ' is-friday';
                    }
                    ?>
                    <tr class="<?= e(trim($cls)) ?>" <?= $r['date'] === $todayKey ? 'aria-current="date" data-today-row' : '' ?>>
                        <td class="col-day"><span><?= (int) $r['day'] ?></span></td>
                        <td><?= e(uz_date($d, false)) ?><small class="weekday-inline"><?= e(uz_weekday($d)) ?></small></td>
                        <td class="col-weekday"><?= e(uz_weekday($d)) ?></td>
                        <td class="col-time"><?= e($r['saharlik']) ?></td>
                        <td class="col-time"><?= e($r['iftorlik']) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <p class="source-note">
            Manba: <?= e($schedule['source']) ?>
            <?php if (!empty($schedule['stale'])): ?>
                · manba vaqtincha javob bermadi, <?= e(date('d.m.Y H:i', (int) $schedule['fetchedAt'])) ?> dagi nusxa ko'rsatilmoqda
            <?php endif; ?>
        </p>
    </section>

    <script type="application/json" id="schedule-data"><?= json_encode(array_map(fn($r) => [$r['date'], $r['saharlik'], $r['iftorlik'], $r['day']], $rows), JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<?php endif; ?>
</main>
<?php page_foot();
