"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { parseInvoiceExcel, type ParsedRow } from "@/lib/excel";
import { todayISO } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { cityMatcher, createInvoice, invoiceExists } from "@/lib/invoices";
import { getT } from "@/lib/t";

export type FormState = { error?: string } | undefined;

export async function createInvoiceAction(_prev: FormState, form: FormData): Promise<FormState> {
  const s = await requireUser(["operator"]);
  const t = await getT();
  const companyId = Number(form.get("companyId"));
  const cityId = Number(form.get("cityId"));
  const number = String(form.get("number") ?? "").trim();
  const storeName = String(form.get("storeName") ?? "").trim();
  const amount = Number(String(form.get("amount") ?? "").replace(/\s/g, "").replace(",", "."));
  if (!companyId || !cityId || !number || !storeName) return { error: t.missing };
  if (!(amount > 0)) return { error: t.badAmount };
  if (await invoiceExists(companyId, number)) return { error: `${t.duplicate}: ${number}` };
  const id = await createInvoice(
    {
      number,
      companyId,
      cityId,
      storeName,
      invoiceDate: String(form.get("invoiceDate") || todayISO()),
      address: String(form.get("address") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      amount,
      note: String(form.get("note") ?? "").trim(),
    },
    s.uid,
  );
  redirect(`/invoices/${id}`);
}

export type PreviewRow = ParsedRow & { cityId?: number; errors: string[] };
export type PreviewState = { rows?: PreviewRow[]; companyId?: number; error?: string; saved?: number } | undefined;

async function validateRows(rows: ParsedRow[], companyId: number, t: (typeof dictionaries)["uz"]) {
  const matchCity = await cityMatcher();
  const seen = new Set<string>();
  const out: PreviewRow[] = [];
  for (const r of rows) {
    const errors: string[] = [];
    if (!r.number) errors.push(`${t.missing}: ${t.invoiceNo}`);
    if (!r.storeName) errors.push(`${t.missing}: ${t.store}`);
    if (r.amount == null) errors.push(t.badAmount);
    const cityId = matchCity(r.city);
    if (!cityId) errors.push(`${t.unknownCity}: "${r.city}"`);
    if (r.number && (seen.has(r.number) || (await invoiceExists(companyId, r.number)))) errors.push(t.duplicate);
    seen.add(r.number);
    out.push({ ...r, cityId, errors });
  }
  return out;
}

/** Step 1: read the Excel file and show what will be imported. Nothing is saved. */
export async function previewImportAction(_prev: PreviewState, form: FormData): Promise<PreviewState> {
  await requireUser(["operator"]);
  const t = await getT();
  const companyId = Number(form.get("companyId"));
  const file = form.get("file") as File | null;
  if (!companyId || !file || !file.size) return { error: t.missing };
  let parsed;
  try {
    parsed = await parseInvoiceExcel(await file.arrayBuffer(), String(form.get("invoiceDate") || todayISO()));
  } catch {
    return { error: `${t.error}: .xlsx` };
  }
  if (parsed.missingColumns.length) {
    const names: Record<string, string> = { number: t.invoiceNo, storeName: t.store, city: t.city, amount: t.amount };
    return { error: `${t.missing}: ${parsed.missingColumns.map((c) => names[c]).join(", ")}` };
  }
  return { rows: await validateRows(parsed.rows, companyId, t), companyId };
}

/** Step 2: save the good rows. Rows are re-checked on the server. */
export async function saveImportAction(companyId: number, rows: ParsedRow[]): Promise<PreviewState> {
  const s = await requireUser(["operator"]);
  const t = await getT();
  const checked = await validateRows(rows, companyId, t);
  let saved = 0;
  for (const r of checked) {
    if (r.errors.length) continue;
    await createInvoice(
      {
        number: r.number,
        invoiceDate: r.invoiceDate,
        companyId,
        cityId: r.cityId!,
        storeName: r.storeName,
        address: r.address,
        phone: r.phone,
        amount: r.amount!,
      },
      s.uid,
    );
    saved++;
  }
  revalidatePath("/invoices");
  return { saved, rows: checked.filter((r) => r.errors.length), companyId };
}

export async function cancelInvoiceAction(form: FormData) {
  const s = await requireUser(["admin"]);
  const id = Number(form.get("id"));
  await db
    .update(schema.invoices)
    .set({ status: "cancelled" })
    .where(and(eq(schema.invoices.id, id), inArray(schema.invoices.status, ["new", "received"])));
  await db.insert(schema.invoiceEvents).values({ invoiceId: id, userId: s.uid, action: "cancelled" });
  revalidatePath(`/invoices/${id}`);
}
