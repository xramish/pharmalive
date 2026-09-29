<?php
declare(strict_types=1);

require __DIR__ . '/inc/layout.php';

$today = new DateTimeImmutable('today');
$start = new DateTimeImmutable(RAMADAN_START);
$end = new DateTimeImmutable(RAMADAN_END);
$totalDays = $start->diff($end)->days + 1;

if ($today < $start) {
    $status = 'Ramazongacha ' . $today->diff($start)->days . ' kun qoldi';
} elseif ($today <= $end) {
    $status = 'Ramazonning ' . ($start->diff($today)->days + 1) . '-kuni';
} else {
    $status = 'Ramazon 2026 yakunlandi · Taqabbalallohu minna va minkum';
}

page_head(SITE_NAME . ' — saharlik va iftorlik vaqtlari', "O'zbekiston shaharlari uchun Ramazon 2026 saharlik va iftorlik taqvimi.", 'page-home');
?>
<header class="hero">
    <div class="hero-bar container">
        <span class="brand">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a9 9 0 1 0 6 15.6A7.2 7.2 0 0 1 15 3z"/></svg>
            <?= e(SITE_NAME) ?>
        </span>
        <?= theme_toggle() ?>
    </div>
    <div class="hero-body container">
        <p class="eyebrow"><?= e(uz_weekday($today) . ', ' . uz_date($today)) ?><span data-hijri></span></p>
        <h1>Saharlik va iftorlik<br><span class="accent">taqvimi</span></h1>
        <p class="lead">Shahringizni tanlang — bugungi vaqtlar, qolgan vaqt hisoblagichi va to'liq oylik jadval.</p>
        <span class="pill"><?= e($status) ?></span>
    </div>
</header>

<main id="main" class="container">
    <a class="resume" href="#" data-last-city hidden>
        <span>
            <small>Oxirgi tanlangan shahar</small>
            <strong data-last-city-name></strong>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </a>

    <div class="section-head">
        <h2>Shaharlar</h2>
        <label class="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input type="search" placeholder="Qidirish…" aria-label="Shaharni qidirish" data-city-search autocomplete="off">
        </label>
    </div>

    <ul class="city-grid" data-city-grid>
        <?php foreach (CITIES as $slug => [$name, $region]): ?>
            <li>
                <a class="city-card" href="city.php?c=<?= e($slug) ?>" data-city="<?= e($slug) ?>" data-name="<?= e($name) ?>" data-search="<?= e(mb_strtolower($name . ' ' . $region)) ?>">
                    <span class="city-initial" aria-hidden="true"><?= e(mb_substr($name, 0, 1)) ?></span>
                    <span class="city-text">
                        <strong><?= e($name) ?></strong>
                        <small><?= e($region) ?></small>
                    </span>
                    <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </a>
            </li>
        <?php endforeach; ?>
    </ul>
    <p class="empty" data-city-empty hidden>Hech narsa topilmadi.</p>

    <figure class="verse">
        <blockquote>
            <p class="arabic" lang="ar" dir="rtl">شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ</p>
            <p>«Ramazon oyi — odamlarga hidoyat bo'lib, to'g'ri yo'lni va haq bilan botilni ajratib beruvchi ochiq oyatlar bo'lib Qur'on nozil qilingan oydir.»</p>
        </blockquote>
        <figcaption>Baqara surasi, 185-oyat</figcaption>
    </figure>
</main>
<?php page_foot();
