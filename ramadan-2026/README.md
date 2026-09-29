# Ramazon 2026 — saharlik va iftorlik taqvimi

PHP 7.4+ (ext-dom, ext-curl tavsiya etiladi). Hech qanday kutubxona kerak emas.

## O'rnatish
Papkani serverga yuklang (masalan `ramish.uz/ramadan-2026/`). `cache/` papkasi PHP uchun yoziladigan bo'lishi kerak.

## Tuzilishi
- `index.php` — shaharlar ro'yxati
- `city.php?c=toshkent` — bitta shablon barcha shaharlar uchun
- `toshkent.php` va h.k. — eski havolalar, 301 bilan `city.php` ga yo'naltiradi
- `inc/config.php` — shaharlar, Ramazon sanalari, kesh sozlamalari
- `inc/data.php` — ma'lumot olish: islomapi.uz → namozvaqti.uz (zaxira), 12 soatlik fayl keshi
- `assets/` — CSS va JS (hisoblagich, kun/tun rejimi, qidiruv)

Manba ishlamay qolsa, sayt oxirgi saqlangan nusxani ko'rsatadi; umuman ma'lumot bo'lmasa — xato o'rniga chiroyli xabar.
