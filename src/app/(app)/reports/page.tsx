import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { money, todayISO } from "@/lib/format";
import { parseReportParams, runReport } from "@/lib/reports";
import { getT } from "@/lib/t";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireUser(["manager"]);
  const t = await getT();
  const sp = await searchParams;
  const p = parseReportParams(sp, todayISO());
  const [rows, companies, cities] = await Promise.all([
    runReport(p),
    db.select().from(schema.companies).orderBy(schema.companies.name),
    db.select().from(schema.cities).orderBy(schema.cities.name),
  ]);
  const sum = (k: "count" | "delivered" | "pending" | "amount" | "fee") => rows.reduce((a, r) => a + Number(r[k]), 0);
  const groupLabel = { company: t.byCompany, city: t.byCity, driver: t.byDriver, day: t.byDay }[p.group];
  const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));

  return (
    <>
      <h1>{t.navReports}</h1>
      <form className="card row">
        <div className="field">
          <label>{t.groupBy}</label>
          <select name="group" defaultValue={p.group}>
            <option value="company">{t.byCompany}</option>
            <option value="city">{t.byCity}</option>
            <option value="driver">{t.byDriver}</option>
            <option value="day">{t.byDay}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.dateBy}</label>
          <select name="dateBy" defaultValue={p.dateBy}>
            <option value="invoice">{t.dateInvoice}</option>
            <option value="delivered">{t.dateDelivered}</option>
          </select>
        </div>
        <div className="field">
          <label>{t.from}</label>
          <input type="date" name="from" defaultValue={p.from} />
        </div>
        <div className="field">
          <label>{t.to}</label>
          <input type="date" name="to" defaultValue={p.to} />
        </div>
        <div className="field">
          <label>{t.company}</label>
          <select name="company" defaultValue={p.company ?? ""}>
            <option value="">{t.all}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t.city}</label>
          <select name="city" defaultValue={p.city ?? ""}>
            <option value="">{t.all}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button>{t.show}</button>
        <a className="btn secondary" href={`/reports/export?${qs}`}>{t.exportExcel}</a>
      </form>

      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>{groupLabel}</th>
              <th className="num">{t.count}</th>
              <th className="num">{t.deliveredCount}</th>
              <th className="num">{t.pendingCount}</th>
              <th className="num">{t.amount}</th>
              <th className="num">{t.fee}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td className="num">{r.count}</td>
                <td className="num">{r.delivered}</td>
                <td className="num">{r.pending}</td>
                <td className="num">{money(r.amount)}</td>
                <td className="num">{money(r.fee)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="muted">{t.noResults}</td></tr>}
          </tbody>
          <tfoot>
            <tr>
              <td>{t.total}</td>
              <td className="num">{sum("count")}</td>
              <td className="num">{sum("delivered")}</td>
              <td className="num">{sum("pending")}</td>
              <td className="num">{money(sum("amount"))}</td>
              <td className="num">{money(sum("fee"))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
