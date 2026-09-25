import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { ExcelJS, workbookToBuffer } from "@/lib/excel";
import { todayISO, TZ } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { parseReportParams, runReport } from "@/lib/reports";
import { getT } from "@/lib/t";

/** Excel with two sheets: the grouped summary and every invoice in the period. */
export async function GET(req: NextRequest) {
  await requireUser(["manager"]);
  const t = await getT();
  const p = parseReportParams(Object.fromEntries(req.nextUrl.searchParams), todayISO());
  const i = schema.invoices;
  const dateCol = p.dateBy === "delivered" ? sql`(${i.deliveredAt} at time zone ${TZ})::date` : sql`${i.invoiceDate}`;
  const where = [ne(i.status, "cancelled"), gte(dateCol, p.from), lte(dateCol, p.to)];
  if (p.company) where.push(eq(i.companyId, p.company));
  if (p.city) where.push(eq(i.cityId, p.city));
  const [summary, detail] = await Promise.all([runReport(p), invoiceSelect().where(and(...where)).orderBy(i.invoiceDate, i.id)]);

  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet(t.total);
  s1.addRow([`${p.from} — ${p.to}`]);
  s1.addRow([t.groupBy, t.count, t.deliveredCount, t.pendingCount, t.amount, t.fee]).font = { bold: true };
  for (const r of summary) s1.addRow([r.key, r.count, r.delivered, r.pending, Number(r.amount), Number(r.fee)]);
  s1.columns.forEach((c, idx) => (c.width = idx === 0 ? 30 : 16));

  const s2 = wb.addWorksheet(t.navInvoices);
  s2.addRow([t.invoiceNo, t.invoiceDate, t.company, t.store, t.city, t.address, t.amount, t.feePercent, t.fee, t.status, t.receivedAt, t.deliveredAt, t.deliveredBy]).font = { bold: true };
  for (const r of detail) {
    s2.addRow([
      r.number, r.invoiceDate, r.company, r.store, r.city, r.address, Number(r.amount), Number(r.feePercent), Number(r.feeAmount),
      t[`status_${r.status}`], r.receivedAt ?? "", r.deliveredAt ?? "", r.driver ?? "",
    ]);
  }
  s2.columns.forEach((c) => (c.width = 16));
  for (const col of [7, 9]) s2.getColumn(col).numFmt = "#,##0";
  for (const col of [5, 6]) s1.getColumn(col).numFmt = "#,##0";

  return new Response(await workbookToBuffer(wb), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pharmalive-${p.from}_${p.to}.xlsx"`,
    },
  });
}
