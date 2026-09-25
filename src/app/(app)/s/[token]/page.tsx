import Link from "next/link";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { getT } from "@/lib/t";
import DeliverButton from "./DeliverButton";

/** Page opened by scanning an invoice QR code. */
export default async function ScanPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string }> }) {
  const s = await requireUser();
  const t = await getT();
  const { token } = await params;
  const justDelivered = (await searchParams).ok === "1";
  const [inv] = await invoiceSelect().where(eq(schema.invoices.qrToken, token));
  const isDriver = s.role === "driver" || s.role === "admin";

  if (!inv) {
    return (
      <div className="mobile">
        <div className="alert err">{t.qrNotFound}</div>
        <Link className="btn" href="/driver">{t.scanNext}</Link>
      </div>
    );
  }

  return (
    <div className="mobile">
      <div className="card">
        <h1 style={{ marginBottom: 8 }}>№ {inv.number}</h1>
        <StatusBadge status={inv.status} t={t} />
        <dl className="kv" style={{ marginTop: 12 }}>
          <dt>{t.store}</dt><dd>{inv.store}</dd>
          <dt>{t.city}</dt><dd>{inv.city}</dd>
          <dt>{t.address}</dt><dd>{inv.address || "—"}</dd>
          <dt>{t.phone}</dt><dd>{inv.storePhone ? <a href={`tel:${inv.storePhone}`}>{inv.storePhone}</a> : "—"}</dd>
          <dt>{t.company}</dt><dd>{inv.company}</dd>
          <dt>{t.amount}</dt><dd>{money(inv.amount)}</dd>
        </dl>
      </div>

      {inv.status === "new" && <div className="alert warn">{t.notReceivedYet}</div>}
      {inv.status === "cancelled" && <div className="alert err">{t.isCancelled}</div>}
      {inv.status === "delivered" && (
        <div className="alert ok">
          {justDelivered ? `✅ ${t.deliveredOk}` : t.alreadyDelivered}: {inv.driver} · {dateTime(inv.deliveredAt)}
        </div>
      )}
      {inv.status === "received" && isDriver && (
        <DeliverButton token={token} label={t.markDelivered} confirmText={t.confirmDelivered} />
      )}

      <p style={{ marginTop: 16 }}>
        {isDriver ? (
          <Link className="btn secondary" href="/driver">📷 {t.scanNext}</Link>
        ) : (
          <Link href={`/invoices/${inv.id}`}>{t.invoice} →</Link>
        )}
      </p>
    </div>
  );
}
