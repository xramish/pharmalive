<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

const UZ_MONTHS = [
    1 => 'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];
const UZ_WEEKDAYS = [
    1 => 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba',
];

function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function city_or_null(?string $slug): ?array
{
    if ($slug === null || !isset(CITIES[$slug])) {
        return null;
    }
    [$name, $region, $apiName, $nvSlug] = CITIES[$slug];
    return compact('slug', 'name', 'region', 'apiName', 'nvSlug');
}

function uz_date(DateTimeInterface $d, bool $withYear = true): string
{
    $s = $d->format('j') . '-' . UZ_MONTHS[(int) $d->format('n')];
    return $withYear ? $s . ' ' . $d->format('Y') : $s;
}

function uz_weekday(DateTimeInterface $d): string
{
    return UZ_WEEKDAYS[(int) $d->format('N')];
}

/**
 * Ramazon jadvalini qaytaradi: [rows => [...], source => string, fetchedAt => int, stale => bool]
 * yoki null (hech qanday ma'lumot yo'q bo'lsa). Hech qachon exception tashlamaydi.
 */
function get_schedule(array $city): ?array
{
    if (!is_dir(CACHE_DIR)) {
        @mkdir(CACHE_DIR, 0775, true);
    }
    $file = CACHE_DIR . '/' . $city['slug'] . '.json';
    $cached = read_cache($file);

    if ($cached && time() - $cached['fetchedAt'] < CACHE_TTL) {
        return $cached + ['stale' => false];
    }
    if ($cached && isset($cached['failedAt']) && time() - $cached['failedAt'] < FAIL_COOLDOWN) {
        return $cached['rows'] ? $cached + ['stale' => true] : null;
    }

    // Bir vaqtda kelgan so'rovlar manbaga birdaniga yopirilmasligi uchun qulf.
    $lock = @fopen($file . '.lock', 'c');
    if ($lock && !flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        return $cached && $cached['rows'] ? $cached + ['stale' => true] : null;
    }

    try {
        $fresh = fetch_schedule($city);
        if ($fresh) {
            write_cache($file, $fresh);
            return $fresh + ['stale' => false];
        }
        $marker = ($cached ?: ['rows' => [], 'source' => '', 'fetchedAt' => 0]);
        $marker['failedAt'] = time();
        write_cache($file, $marker);
        return $marker['rows'] ? $marker + ['stale' => true] : null;
    } finally {
        if ($lock) {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}

function read_cache(string $file): ?array
{
    if (!is_file($file)) {
        return null;
    }
    $data = json_decode((string) @file_get_contents($file), true);
    return is_array($data) && isset($data['rows'], $data['fetchedAt']) ? $data : null;
}

function write_cache(string $file, array $data): void
{
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE)) !== false) {
        @rename($tmp, $file);
    }
}

function fetch_schedule(array $city): ?array
{
    $sources = [
        'islomapi.uz'   => fn() => from_islomapi($city['apiName']),
        'namozvaqti.uz' => fn() => from_namozvaqti($city['nvSlug']),
    ];
    foreach ($sources as $name => $load) {
        try {
            $rows = normalize_rows($load());
        } catch (Throwable $ex) {
            error_log("ramadan: {$name} ({$city['slug']}): " . $ex->getMessage());
            continue;
        }
        if (count($rows) >= 20) {
            return ['rows' => $rows, 'source' => $name, 'fetchedAt' => time()];
        }
        error_log("ramadan: {$name} ({$city['slug']}): faqat " . count($rows) . ' qator topildi');
    }
    return null;
}

function http_get(string $url): string
{
    $headers = ['Accept-Language: uz,ru;q=0.8,en;q=0.5'];
    $ua = 'Mozilla/5.0 (compatible; Ramazon2026/1.0)';

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT        => HTTP_TIMEOUT,
            CURLOPT_USERAGENT      => $ua,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_ENCODING       => '',
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        if ($body === false || $code >= 400) {
            throw new RuntimeException("HTTP {$code} {$err}");
        }
        return (string) $body;
    }

    $ctx = stream_context_create(['http' => [
        'timeout'       => HTTP_TIMEOUT,
        'user_agent'    => $ua,
        'header'        => implode("\r\n", $headers),
        'ignore_errors' => false,
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        throw new RuntimeException(error_get_last()['message'] ?? 'yuklab bo\'lmadi');
    }
    return $body;
}

/** islomapi.uz — rasmiy vaqtlar, JSON. Ramazon ikki oyga tushgani uchun ikkala oyni olamiz. */
function from_islomapi(string $region): array
{
    $months = array_unique([(int) date('n', strtotime(RAMADAN_START)), (int) date('n', strtotime(RAMADAN_END))]);
    $rows = [];
    foreach ($months as $m) {
        $url = 'https://islomapi.uz/api/monthly?' . http_build_query(['region' => $region, 'month' => $m]);
        $json = json_decode(http_get($url), true);
        if (!is_array($json)) {
            throw new RuntimeException('JSON noto\'g\'ri');
        }
        foreach ($json as $item) {
            $times = $item['times'] ?? [];
            $rows[] = [
                'date'     => substr((string) ($item['date'] ?? ''), 0, 10),
                'saharlik' => $times['tong_saharlik'] ?? '',
                'iftorlik' => $times['shom_iftor'] ?? '',
            ];
        }
    }
    return $rows;
}

/** namozvaqti.uz — HTML jadval. Ustunlar: kun | hafta kuni | sana | saharlik | iftorlik. */
function from_namozvaqti(string $slug): array
{
    $html = http_get('https://namozvaqti.uz/ramazon/' . rawurlencode($slug));

    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NONET | LIBXML_NOERROR);
    libxml_clear_errors();

    $rows = [];
    foreach ((new DOMXPath($dom))->query('//table//tr') as $tr) {
        $cells = [];
        foreach ($tr->getElementsByTagName('td') as $td) {
            $cells[] = trim(preg_replace('/\s+/u', ' ', $td->textContent));
        }
        if (count($cells) < 3) {
            continue;
        }
        $times = array_values(array_filter($cells, fn($c) => preg_match('/^\d{1,2}[:.]\d{2}$/', $c)));
        $date = null;
        foreach ($cells as $c) {
            if ($date = parse_loose_date($c)) {
                break;
            }
        }
        // Sana topilmasa, 1-ustundagi kun raqamidan hisoblaymiz.
        if (!$date && ctype_digit($cells[0]) && (int) $cells[0] >= 1 && (int) $cells[0] <= 30) {
            $date = date('Y-m-d', strtotime(RAMADAN_START . ' +' . ((int) $cells[0] - 1) . ' days'));
        }
        if ($date && count($times) >= 2) {
            $rows[] = ['date' => $date, 'saharlik' => $times[0], 'iftorlik' => $times[count($times) - 1]];
        }
    }
    return $rows;
}

function parse_loose_date(string $s): ?string
{
    $s = mb_strtolower(trim($s));
    if (preg_match('/(\d{4})-(\d{2})-(\d{2})/', $s, $m)) {
        return checkdate((int) $m[2], (int) $m[3], (int) $m[1]) ? "{$m[1]}-{$m[2]}-{$m[3]}" : null;
    }
    if (preg_match('/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/', $s, $m)) {
        $y = strlen($m[3]) === 2 ? 2000 + (int) $m[3] : (int) $m[3];
        return checkdate((int) $m[2], (int) $m[1], $y) ? sprintf('%04d-%02d-%02d', $y, $m[2], $m[1]) : null;
    }
    $names = [
        'yan' => 1, 'янв' => 1, 'fev' => 2, 'фев' => 2, 'mar' => 3, 'мар' => 3,
        'apr' => 4, 'апр' => 4, 'may' => 5, 'май' => 5, 'мая' => 5,
    ];
    if (preg_match('/(\d{1,2})\s*[-\s]\s*([a-zа-яё\']+)(?:\s+(\d{4}))?/u', $s, $m)) {
        $month = $names[mb_substr($m[2], 0, 3)] ?? null;
        $year = isset($m[3]) ? (int) $m[3] : (int) date('Y', strtotime(RAMADAN_START));
        if ($month && checkdate($month, (int) $m[1], $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $m[1]);
        }
    }
    return null;
}

/** Ramazon oralig'idagi, vaqtlari to'g'ri qatorlarni tartiblab qaytaradi. */
function normalize_rows(array $rows): array
{
    $out = [];
    $start = new DateTimeImmutable(RAMADAN_START);
    foreach ($rows as $r) {
        $date = (string) ($r['date'] ?? '');
        $sah = normalize_time((string) ($r['saharlik'] ?? ''));
        $ift = normalize_time((string) ($r['iftorlik'] ?? ''));
        if ($date < RAMADAN_START || $date > RAMADAN_END || !$sah || !$ift || $sah >= $ift) {
            continue;
        }
        $d = new DateTimeImmutable($date);
        $out[$date] = [
            'day'      => $start->diff($d)->days + 1,
            'date'     => $date,
            'saharlik' => $sah,
            'iftorlik' => $ift,
        ];
    }
    ksort($out);
    return array_values($out);
}

function normalize_time(string $t): ?string
{
    if (!preg_match('/^\s*(\d{1,2})[:.](\d{2})/', $t, $m) || (int) $m[1] > 23 || (int) $m[2] > 59) {
        return null;
    }
    return sprintf('%02d:%02d', $m[1], $m[2]);
}
