import "server-only";
import { and, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { TZ } from "./format";

export type Group = "company" | "city" | "driver" | "day";
export type ReportParams = { from: string; to: string; dateBy: "invoice" | "delivered"; group: Group; company?: number; city?: number };

export type ReportRow = { key: string; count: number; delivered: number; pending: number; amount: string; fee: string };

export async function runReport(p: ReportParams): Promise<ReportRow[]> {
  const i = schema.invoices;
  const dateCol = p.dateBy === "delivered" ? sql`(${i.deliveredAt} at time zone ${TZ})::date` : sql`${i.invoiceDate}`;
  const keys: Record<Group, SQL> = {
    company: sql`${schema.companies.name}`,
    city: sql`${schema.cities.name}`,
    driver: sql`coalesce(${schema.users.name}, '—')`,
    day: sql`to_char(${dateCol}, 'YYYY-MM-DD')`,
  };
  const key = keys[p.group];
  const where = [ne(i.status, "cancelled"), gte(dateCol, p.from), lte(dateCol, p.to)];
  if (p.company) where.push(eq(i.companyId, p.company));
  if (p.city) where.push(eq(i.cityId, p.city));

  const rows = await db
    .select({
      key: sql<string>`${key}`,
      count: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${i.status} = 'delivered')::int`,
      pending: sql<number>`count(*) filter (where ${i.status} <> 'delivered')::int`,
      amount: sql<string>`sum(${i.amount})`,
      fee: sql<string>`sum(${i.feeAmount})`,
    })
    .from(i)
    .innerJoin(schema.companies, eq(schema.companies.id, i.companyId))
    .innerJoin(schema.cities, eq(schema.cities.id, i.cityId))
    .leftJoin(schema.users, eq(schema.users.id, i.deliveredBy))
    .where(and(...where))
    .groupBy(key)
    .orderBy(p.group === "day" ? key : sql`sum(${i.amount}) desc`);
  return rows;
}

export function parseReportParams(sp: Record<string, string | undefined>, today: string): ReportParams {
  const monthStart = today.slice(0, 8) + "01";
  const group = (["company", "city", "driver", "day"] as const).find((g) => g === sp.group) ?? "company";
  return {
    from: sp.from || monthStart,
    to: sp.to || today,
    dateBy: sp.dateBy === "delivered" ? "delivered" : "invoice",
    group,
    company: Number(sp.company) || undefined,
    city: Number(sp.city) || undefined,
  };
}
