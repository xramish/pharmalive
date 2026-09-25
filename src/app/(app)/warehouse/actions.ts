"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

/** Marks selected "new" invoices as received and opens the QR label print page. */
export async function receiveAction(form: FormData) {
  const s = await requireUser(["warehouse"]);
  const ids = form.getAll("id").map(Number).filter(Boolean);
  if (!ids.length) return;
  const updated = await db
    .update(schema.invoices)
    .set({ status: "received", receivedAt: new Date(), receivedBy: s.uid })
    .where(and(inArray(schema.invoices.id, ids), eq(schema.invoices.status, "new")))
    .returning({ id: schema.invoices.id });
  if (updated.length) {
    await db.insert(schema.invoiceEvents).values(updated.map((u) => ({ invoiceId: u.id, userId: s.uid, action: "received" })));
  }
  redirect(`/print?ids=${ids.join(",")}&auto=1`);
}
