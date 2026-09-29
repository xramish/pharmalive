<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Tashkent');

const SITE_NAME = 'Ramazon 2026';

// O'zbekiston musulmonlari idorasi e'loni: 1-Ramazon 1447 — 19-fevral 2026,
// Ramazon hayiti — 20-mart 2026.
const RAMADAN_START = '2026-02-19';
const RAMADAN_END   = '2026-03-19';

const CACHE_DIR       = __DIR__ . '/../cache';
const CACHE_TTL       = 43200; // 12 soat: jadval o'zgarmaydi, manbani ortiqcha yuklamaymiz
const FAIL_COOLDOWN   = 300;   // manba ishlamasa, 5 daqiqa qayta urinmaymiz
const HTTP_TIMEOUT    = 8;

/**
 * slug => [nomi, viloyat, islomapi.uz dagi nomi, namozvaqti.uz dagi slug]
 */
const CITIES = [
    'toshkent'  => ['Toshkent',  'Toshkent shahri',        'Toshkent',  'toshkent'],
    'guliston'  => ['Guliston',  'Sirdaryo viloyati',      'Guliston',  'guliston'],
    'jizzax'    => ['Jizzax',    'Jizzax viloyati',        'Jizzax',    'jizzax'],
    'fargona'   => ["Farg'ona",  "Farg'ona viloyati",      "Farg'ona",  'fargona'],
    'andijon'   => ['Andijon',   'Andijon viloyati',       'Andijon',   'andijon'],
    'namangan'  => ['Namangan',  'Namangan viloyati',      'Namangan',  'namangan'],
    'buxoro'    => ['Buxoro',    'Buxoro viloyati',        'Buxoro',    'buxoro'],
    'navoiy'    => ['Navoiy',    'Navoiy viloyati',        'Navoiy',    'navoiy'],
    'samarqand' => ['Samarqand', 'Samarqand viloyati',     'Samarqand', 'samarqand'],
    'qarshi'    => ['Qarshi',    'Qashqadaryo viloyati',   'Qarshi',    'qarshi'],
    'termiz'    => ['Termiz',    'Surxondaryo viloyati',   'Termiz',    'termiz'],
    'xiva'      => ['Xiva',      'Xorazm viloyati',        'Xiva',      'xiva'],
    'nukus'     => ['Nukus',     "Qoraqalpog'iston Resp.", 'Nukus',     'nukus'],
];
