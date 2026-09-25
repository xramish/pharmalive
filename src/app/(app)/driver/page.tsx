import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { dateTime, money, TZ } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { getT } from "@/lib/t";
import Scanner from "./Scanner";

export default async function DriverPage() {
  const s = await requireUser(["driver"]);
  const t = await getT();
  const mine = await invoiceSelect()
    .where(
      and(
        eq(schema.invoices.deliveredBy, s.uid),
        sql`(${schema.invoices.deliveredAt} at time zone ${TZ})::date = (now() at time zone ${TZ})::date`,
      ),
    )
    .orderBy(desc(schema.invoices.deliveredAt));

  return (
    <div className="mobile">
      <Scanner hint={t.scanHint} errorText={t.cameraError} buttonText={t.scanQr} />
      <h2>{t.myDeliveriesToday}: {mine.length}</h2>
      {mine.map((r) => (
        <div className="card" key={r.id}>
          <b>№ {r.number}</b> · {r.store}
          <div className="small muted">
            {r.city} · {money(r.amount)} · {dateTime(r.deliveredAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
