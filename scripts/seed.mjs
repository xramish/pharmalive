import "dotenv/config";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

const login = process.env.ADMIN_LOGIN || "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error("Set ADMIN_PASSWORD in .env");

await sql`
  insert into users (name, login, password_hash, role)
  values ('Administrator', ${login}, ${await bcrypt.hash(password, 10)}, 'admin')
  on conflict (login) do nothing`;

// Regions of Uzbekistan as a starting list; fee % and aliases can be edited in the app.
const cities = [
  ["Toshkent shahri", "Ташкент,Tashkent,Toshkent,г. Ташкент"],
  ["Toshkent viloyati", "Ташкентская область,Toshkent vil."],
  ["Andijon", "Андижан,Andijan"],
  ["Buxoro", "Бухара,Bukhara"],
  ["Farg'ona", "Фергана,Fergana,Fargona"],
  ["Jizzax", "Джизак,Jizzakh"],
  ["Xorazm", "Хорезм,Urganch,Ургенч,Khorezm"],
  ["Namangan", "Наманган"],
  ["Navoiy", "Навои,Navoi"],
  ["Qashqadaryo", "Кашкадарья,Qarshi,Карши"],
  ["Qoraqalpog'iston", "Каракалпакстан,Nukus,Нукус"],
  ["Samarqand", "Самарканд,Samarkand"],
  ["Sirdaryo", "Сырдарья,Guliston,Гулистан"],
  ["Surxondaryo", "Сурхандарья,Termiz,Термез"],
];
for (const [name, aliases] of cities) {
  await sql`insert into cities (name, aliases) values (${name}, ${aliases}) on conflict (name) do nothing`;
}

await sql.end();
console.log(`Seed done. Admin login: ${login}`);
