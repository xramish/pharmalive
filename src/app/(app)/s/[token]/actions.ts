"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export async function deliverAction(token: string, lat: number | null, lng: number | null) {
  const s = await requireUser(["driver"]);
  const [inv] = await db
    .update(schema.invoices)
    .set({ status: "delivered", deliveredAt: new Date(), deliveredBy: s.uid, deliveredLat: lat, deliveredLng: lng })
    .where(and(eq(schema.invoices.qrToken, token), eq(schema.invoices.status, "received")))
    .returning({ id: schema.invoices.id });
  if (!inv) return { ok: false };
  await db.insert(schema.invoiceEvents).values({ invoiceId: inv.id, userId: s.uid, action: "delivered", lat, lng });
  revalidatePath(`/s/${token}`);
  return { ok: true };
}
