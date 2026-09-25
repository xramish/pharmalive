# Pharmalive

Internal system for tracking pharma deliveries: pharma company (A) → Pharmalive warehouse → medical store (B).

## Flow

1. **Operator** uploads the day's invoices from company A as an Excel file (or types them in).
   The service fee is calculated automatically: the company's % for that city, or the city's default %.
2. **Warehouse** selects the invoices that physically arrived → *Receive & print QR*. Status becomes
   **In warehouse / on the way** and QR labels are printed.
3. **Driver** opens the app on their phone, scans the QR at the store and presses **Delivered**
   (time and GPS location are saved).
4. **Manager / admin** see the dashboard and reports (by company, city, driver, day) and export them to Excel.

Roles: `admin`, `manager` (reports), `operator` (invoice entry), `warehouse`, `driver`.
Languages: Uzbek / Russian (switch in the top bar).

## Excel format

First sheet, one header row (within the first 10 rows). Recognised headers (uz / ru / en):

| Field | Accepted headers |
|---|---|
| Invoice number * | Nakladnoy №, Накладная №, № накладной, Номер, Invoice |
| Date | Sana, Дата, Date (if missing — date chosen on the upload form) |
| Store * | Dorixona, Mijoz, Аптека, Клиент, Получатель, Контрагент |
| City * | Shahar, Viloyat, Город, Область, Регион |
| Address | Manzil, Адрес |
| Phone | Telefon, Телефон |
| Amount * | Summa, Сумма, Итого, Amount |

City names are matched against the city name **and its aliases** (Admin → Cities), so "Самарканд" and "Samarqand" both work.
The upload shows a preview first; rows with errors (unknown city, duplicate number, bad amount) are not saved.
A template can be downloaded from the upload page.

## Tech

Next.js 15 (App Router, server actions) · PostgreSQL · Drizzle ORM · `qrcode` / `qr-scanner` · ExcelJS.

## Run locally

```bash
cp .env.example .env        # set DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD
npm install
npm run db:migrate          # create tables
npm run db:seed             # first admin + Uzbekistan regions
npm run dev                 # http://localhost:3000
```

Production: `npm run build && npm start`. HTTPS is required for the phone camera to work.

Changing the database: edit `src/db/schema.ts`, run `npx drizzle-kit generate`, then `npm run db:migrate`.
