import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { getT } from "@/lib/t";
import { cancelInvoiceAction } from "../actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser(["manager", "operator", "warehouse"]);
  const t = await getT();
  const id = Number((await params).id);
  const [inv] = await invoiceSelect().where(eq(schema.invoices.id, id));
  if (!inv) notFound();
  const events = await db
    .select({ action: schema.invoiceEvents.action, at: schema.invoiceEvents.at, lat: schema.invoiceEvents.lat, lng: schema.invoiceEvents.lng, user: schema.users.name })
    .from(schema.invoiceEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.invoiceEvents.userId))
    .where(eq(schema.invoiceEvents.invoiceId, id))
    .orderBy(asc(schema.invoiceEvents.at));

  const actionLabel: Record<string, string> = {
    created: t.createdAt,
    received: t.receivedAt,
    delivered: t.deliveredAt,
    cancelled: t.status_cancelled,
  };

  return (
    <>
      <p><Link href="/invoices">← {t.back}</Link></p>
      <h1>
        {t.invoice} {inv.number} <StatusBadge status={inv.status} t={t} />
      </h1>
      <div className="card">
        <dl className="kv">
          <dt>{t.invoiceDate}</dt><dd>{inv.invoiceDate}</dd>
          <dt>{t.company}</dt><dd>{inv.company}</dd>
          <dt>{t.store}</dt><dd>{inv.store}</dd>
          <dt>{t.city}</dt><dd>{inv.city}</dd>
          <dt>{t.address}</dt><dd>{inv.address || "—"}</dd>
          <dt>{t.phone}</dt><dd>{inv.storePhone || "—"}</dd>
          <dt>{t.amount}</dt><dd>{money(inv.amount)}</dd>
          <dt>{t.fee}</dt><dd>{money(inv.feeAmount)} ({Number(inv.feePercent)}%)</dd>
          <dt>{t.deliveredBy}</dt><dd>{inv.driver || "—"}</dd>
          {inv.note && (<><dt>{t.note}</dt><dd>{inv.note}</dd></>)}
        </dl>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        {inv.status !== "new" && inv.status !== "cancelled" && (
          <Link className="btn secondary" href={`/print?ids=${inv.id}`} target="_blank">{t.reprint}</Link>
        )}
        {session.role === "admin" && (inv.status === "new" || inv.status === "received") && (
          <form action={cancelInvoiceAction}>
            <input type="hidden" name="id" value={inv.id} />
            <button className="danger">{t.cancelInvoice}</button>
          </form>
        )}
      </div>

      <h2>{t.history}</h2>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td>{dateTime(e.at)}</td>
                <td>{actionLabel[e.action] ?? e.action}</td>
                <td>{e.user}</td>
                <td>
                  {e.lat != null && (
                    <a href={`https://maps.google.com/?q=${e.lat},${e.lng}`} target="_blank" rel="noreferrer">📍 map</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
