import "server-only";
import { randomBytes } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { calcFee, feePercentFor } from "./fees";

export type InvoiceInput = {
  number: string;
  invoiceDate: string; // YYYY-MM-DD
  companyId: number;
  cityId: number;
  storeName: string;
  address?: string;
  phone?: string;
  amount: number;
  note?: string;
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[‘’`ʻʼ]/g, "'").replace(/\s+/g, " ");

/** Returns a lookup function: city text (name or alias, any case) -> city id. */
export async function cityMatcher() {
  const cities = await db.select().from(schema.cities);
  const map = new Map<string, number>();
  for (const c of cities) {
    map.set(norm(c.name), c.id);
    for (const a of c.aliases.split(",")) if (a.trim()) map.set(norm(a), c.id);
  }
  return (text: string) => map.get(norm(text));
}

export async function invoiceExists(companyId: number, number: string) {
  const row = await db.query.invoices.findFirst({
    where: and(eq(schema.invoices.companyId, companyId), eq(schema.invoices.number, number.trim())),
    columns: { id: true },
  });
  return !!row;
}

async function upsertStore(name: string, cityId: number, address?: string, phone?: string) {
  const [store] = await db
    .insert(schema.stores)
    .values({ name: name.trim(), cityId, address: address || null, phone: phone || null })
    .onConflictDoUpdate({
      target: [schema.stores.name, schema.stores.cityId],
      set: {
        address: sql`coalesce(excluded.address, ${schema.stores.address})`,
        phone: sql`coalesce(excluded.phone, ${schema.stores.phone})`,
      },
    })
    .returning({ id: schema.stores.id });
  return store.id;
}

export async function createInvoice(input: InvoiceInput, userId: number) {
  const storeId = await upsertStore(input.storeName, input.cityId, input.address, input.phone);
  const feePercent = await feePercentFor(input.companyId, input.cityId);
  const [inv] = await db
    .insert(schema.invoices)
    .values({
      number: input.number.trim(),
      invoiceDate: input.invoiceDate,
      companyId: input.companyId,
      storeId,
      cityId: input.cityId,
      amount: String(input.amount),
      feePercent,
      feeAmount: String(calcFee(input.amount, feePercent)),
      qrToken: randomBytes(12).toString("base64url"),
      note: input.note || null,
      createdBy: userId,
    })
    .returning({ id: schema.invoices.id });
  await db.insert(schema.invoiceEvents).values({ invoiceId: inv.id, userId, action: "created" });
  return inv.id;
}

/** Joined invoice rows for lists, details and reports. */
export function invoiceSelect() {
  const driver = sql<string | null>`(select name from users where users.id = ${schema.invoices.deliveredBy})`;
  return db
    .select({
      id: schema.invoices.id,
      number: schema.invoices.number,
      invoiceDate: schema.invoices.invoiceDate,
      amount: schema.invoices.amount,
      feePercent: schema.invoices.feePercent,
      feeAmount: schema.invoices.feeAmount,
      status: schema.invoices.status,
      qrToken: schema.invoices.qrToken,
      note: schema.invoices.note,
      createdAt: schema.invoices.createdAt,
      receivedAt: schema.invoices.receivedAt,
      deliveredAt: schema.invoices.deliveredAt,
      deliveredLat: schema.invoices.deliveredLat,
      deliveredLng: schema.invoices.deliveredLng,
      companyId: schema.invoices.companyId,
      cityId: schema.invoices.cityId,
      company: schema.companies.name,
      store: schema.stores.name,
      address: schema.stores.address,
      storePhone: schema.stores.phone,
      city: schema.cities.name,
      driver,
    })
    .from(schema.invoices)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.invoices.companyId))
    .innerJoin(schema.stores, eq(schema.stores.id, schema.invoices.storeId))
    .innerJoin(schema.cities, eq(schema.cities.id, schema.invoices.cityId));
}

export type InvoiceRow = Awaited<ReturnType<ReturnType<typeof invoiceSelect>["execute"]>>[number];
