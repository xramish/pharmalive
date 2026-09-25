import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql, { schema });

const login = process.env.ADMIN_LOGIN || "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error("Set ADMIN_PASSWORD in .env");

await db
  .insert(schema.users)
  .values({ name: "Administrator", login, passwordHash: await bcrypt.hash(password, 10), role: "admin" })
  .onConflictDoNothing();

// Regions of Uzbekistan as a starting list; fee % and aliases can be edited in the app.
const cityList: [string, string][] = [
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
await db
  .insert(schema.cities)
  .values(cityList.map(([name, aliases]) => ({ name, aliases })))
  .onConflictDoNothing();

await sql.end();
console.log(`Seed done. Admin login: ${login}`);
