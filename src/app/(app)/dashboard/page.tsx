import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { money, todayISO, TZ } from "@/lib/format";
import { runReport } from "@/lib/reports";
import { getT } from "@/lib/t";

export default async function Dashboard() {
  await requireUser(["manager"]);
  const t = await getT();
  const i = schema.invoices;
  const today = sql`(now() at time zone ${TZ})::date`;
  const [[s], byCity] = await Promise.all([
    db
      .select({
        newToday: sql<number>`count(*) filter (where (${i.createdAt} at time zone ${TZ})::date = ${today})::int`,
        waiting: sql<number>`count(*) filter (where ${i.status} = 'new')::int`,
        inWarehouse: sql<number>`count(*) filter (where ${i.status} = 'received')::int`,
        inWarehouseAmount: sql<string>`coalesce(sum(${i.amount}) filter (where ${i.status} = 'received'),0)`,
        deliveredToday: sql<number>`count(*) filter (where ${i.status} = 'delivered' and (${i.deliveredAt} at time zone ${TZ})::date = ${today})::int`,
        feeToday: sql<string>`coalesce(sum(${i.feeAmount}) filter (where ${i.status} = 'delivered' and (${i.deliveredAt} at time zone ${TZ})::date = ${today}),0)`,
      })
      .from(i),
    runReport({ from: todayISO(), to: todayISO(), dateBy: "delivered", group: "driver" }),
  ]);

  return (
    <>
      <h1>{t.navDashboard}</h1>
      <div className="stats">
        <Link href="/invoices?status=new" className="stat">
          <div className="label">{t.status_new}</div>
          <div className="value">{s.waiting}</div>
          <div className="sub">{t.newToday}: {s.newToday}</div>
        </Link>
        <Link href="/invoices?status=received" className="stat">
          <div className="label">{t.inWarehouse}</div>
          <div className="value">{s.inWarehouse}</div>
          <div className="sub">{money(s.inWarehouseAmount)}</div>
        </Link>
        <div className="stat">
          <div className="label">{t.deliveredToday}</div>
          <div className="value">{s.deliveredToday}</div>
        </div>
        <div className="stat">
          <div className="label">{t.feeToday}</div>
          <div className="value">{money(s.feeToday)}</div>
        </div>
      </div>

      <h2>{t.deliveredToday} — {t.byDriver}</h2>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>{t.deliveredBy}</th><th className="num">{t.count}</th><th className="num">{t.amount}</th><th className="num">{t.fee}</th></tr>
          </thead>
          <tbody>
            {byCity.map((r) => (
              <tr key={r.key}><td>{r.key}</td><td className="num">{r.count}</td><td className="num">{money(r.amount)}</td><td className="num">{money(r.fee)}</td></tr>
            ))}
            {!byCity.length && <tr><td colSpan={4} className="muted">{t.noResults}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
