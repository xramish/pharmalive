<?php
declare(strict_types=1);

require_once __DIR__ . '/data.php';

function asset(string $path): string
{
    $v = @filemtime(__DIR__ . '/../assets/' . $path) ?: 1;
    return 'assets/' . $path . '?v=' . $v;
}

function page_head(string $title, string $description, string $bodyClass = ''): void
{
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    ?>
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title><?= e($title) ?></title>
    <meta name="description" content="<?= e($description) ?>">
    <meta name="theme-color" content="#0b1424" media="(prefers-color-scheme: dark)">
    <meta name="theme-color" content="#f6f3ec" media="(prefers-color-scheme: light)">
    <meta property="og:title" content="<?= e($title) ?>">
    <meta property="og:description" content="<?= e($description) ?>">
    <meta property="og:type" content="website">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230b1424'/><path d='M20 7a10 10 0 1 0 5 16A8 8 0 0 1 20 7z' fill='%23e3b55b'/></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= e(asset('app.css')) ?>">
    <script>
        try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    </script>
</head>
<body class="<?= e($bodyClass) ?>">
<a class="skip-link" href="#main">Asosiy qismga o'tish</a>
<?php
}

function theme_toggle(): string
{
    return <<<HTML
<button class="icon-btn" type="button" data-theme-toggle aria-label="Mavzuni almashtirish" title="Kun / tun rejimi">
    <svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    <svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
</button>
HTML;
}

function page_foot(): void
{
    ?>
<footer class="site-footer">
    <p>Vaqtlar O'zbekiston musulmonlari idorasi taqvimi asosida. Ramazon 1447 / 2026.</p>
</footer>
<script src="<?= e(asset('app.js')) ?>" defer></script>
</body>
</html>
<?php
}
