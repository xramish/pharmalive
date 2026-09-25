import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  date,
  doublePrecision,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "manager", "operator", "warehouse", "driver"]);
export const statusEnum = pgEnum("invoice_status", ["new", "received", "delivered", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  login: text("login").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Pharma companies (A) — the senders. */
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  inn: text("inn"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  /** Other spellings used in Excel files (e.g. Russian), comma separated. */
  aliases: text("aliases").notNull().default(""),
  /** Default service fee % for this city, used when a company has no own rate. */
  defaultPercent: numeric("default_percent", { precision: 5, scale: 2 }).notNull().default("1.5"),
});

/** Company-specific fee % per city. Overrides cities.defaultPercent. */
export const tariffs = pgTable(
  "tariffs",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    cityId: integer("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
    percent: numeric("percent", { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [uniqueIndex("tariffs_company_city").on(t.companyId, t.cityId)],
);

/** Medical stores / pharmacies (B) — the receivers. */
export const stores = pgTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    cityId: integer("city_id").notNull().references(() => cities.id),
    address: text("address"),
    phone: text("phone"),
  },
  (t) => [uniqueIndex("stores_name_city").on(t.name, t.cityId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull(),
    invoiceDate: date("invoice_date").notNull(),
    companyId: integer("company_id").notNull().references(() => companies.id),
    storeId: integer("store_id").notNull().references(() => stores.id),
    cityId: integer("city_id").notNull().references(() => cities.id),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    feePercent: numeric("fee_percent", { precision: 5, scale: 2 }).notNull(),
    feeAmount: numeric("fee_amount", { precision: 18, scale: 2 }).notNull(),
    status: statusEnum("status").notNull().default("new"),
    /** Random token printed inside the QR code. */
    qrToken: text("qr_token").notNull().unique(),
    note: text("note"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    receivedBy: integer("received_by").references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    deliveredBy: integer("delivered_by").references(() => users.id),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveredLat: doublePrecision("delivered_lat"),
    deliveredLng: doublePrecision("delivered_lng"),
  },
  (t) => [
    uniqueIndex("invoices_company_number").on(t.companyId, t.number),
    index("invoices_status").on(t.status),
    index("invoices_date").on(t.invoiceDate),
  ],
);

/** History of every status change, for auditing. */
export const invoiceEvents = pgTable("invoice_events", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
});

export type Role = (typeof roleEnum.enumValues)[number];
export type Status = (typeof statusEnum.enumValues)[number];
