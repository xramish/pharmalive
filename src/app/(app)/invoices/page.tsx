import Link from "next/link";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Status } from "@/db/schema";
import StatusBadge from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { getT } from "@/lib/t";

const PAGE = 100;

type SP = { q?: string; status?: string; company?: string; city?: string; from?: string; to?: string; page?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireUser(["manager", "operator", "warehouse"]);
  const t = await getT();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: SQL[] = [];
  if (sp.q) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(schema.invoices.number, q), ilike(schema.stores.name, q))!);
  }
  if (sp.status) where.push(eq(schema.invoices.status, sp.status as Status));
  if (sp.company) where.push(eq(schema.invoices.companyId, Number(sp.company)));
  if (sp.city) where.push(eq(schema.invoices.cityId, Number(sp.city)));
  if (sp.from) where.push(gte(schema.invoices.invoiceDate, sp.from));
  if (sp.to) where.push(lte(schema.invoices.invoiceDate, sp.to));
  const cond = where.length ? and(...where) : undefined;

  const [rows, [totals], companies, cities] = await Promise.all([
    invoiceSelect().where(cond).orderBy(desc(schema.invoices.id)).limit(PAGE).offset((page - 1) * PAGE),
    db
      .select({
        count: sql<number>`count(*)::int`,
        amount: sql<string>`coalesce(sum(${schema.invoices.amount}),0)`,
        fee: sql<string>`coalesce(sum(${schema.invoices.feeAmount}),0)`,
      })
      .from(schema.invoices)
      .innerJoin(schema.stores, eq(schema.stores.id, schema.invoices.storeId))
      .where(cond),
    db.select().from(schema.companies).orderBy(schema.companies.name),
    db.select().from(schema.cities).orderBy(schema.cities.name),
  ]);

  const canAdd = ["admin", "operator"].includes(session.role);
  const pageLink = (p: number) => `?${new URLSearchParams({ ...sp, page: String(p) } as Record<string, string>)}`;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{t.navInvoices}</h1>
        {canAdd && (
          <div className="row">
            <Link className="btn" href="/invoices/import">{t.importExcel}</Link>
            <Link className="btn secondary" href="/invoices/new">{t.newInvoice}</Link>
          </div>
        )}
      </div>

      <form className="card row">
        <div className="field">
          <label>{t.search}</label>
          <input name="q" defaultValue={sp.q} placeholder={`${t.invoiceNo} / ${t.store}`} />
        </div>
        <div className="field">
          <label>{t.status}</label>
          <select name="status" defaultValue={sp.status ?? ""}>
            <option value="">{t.all}</option>
            {(["new", "received", "delivered", "cancelled"] as const).map((s) => (
              <option key={s} value={s}>{t[`status_${s}`]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.company}</label>
          <select name="company" defaultValue={sp.company ?? ""}>
            <option value="">{t.all}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t.city}</label>
          <select name="city" defaultValue={sp.city ?? ""}>
            <option value="">{t.all}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t.from}</label>
          <input type="date" name="from" defaultValue={sp.from} />
        </div>
        <div className="field">
          <label>{t.to}</label>
          <input type="date" name="to" defaultValue={sp.to} />
        </div>
        <button>{t.filter}</button>
      </form>

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>{t.invoiceNo}</th>
              <th>{t.invoiceDate}</th>
              <th>{t.company}</th>
              <th>{t.store}</th>
              <th>{t.city}</th>
              <th className="num">{t.amount}</th>
              <th className="num">{t.feePercent}</th>
              <th className="num">{t.fee}</th>
              <th>{t.status}</th>
              <th>{t.deliveredBy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/invoices/${r.id}`}>{r.number}</Link></td>
                <td>{r.invoiceDate}</td>
                <td>{r.company}</td>
                <td>{r.store}</td>
                <td>{r.city}</td>
                <td className="num">{money(r.amount)}</td>
                <td className="num">{Number(r.feePercent)}%</td>
                <td className="num">{money(r.feeAmount)}</td>
                <td><StatusBadge status={r.status} t={t} /></td>
                <td>{r.driver ?? ""}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={10} className="muted">{t.noResults}</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>{t.total}: {totals.count}</td>
              <td className="num">{money(totals.amount)}</td>
              <td />
              <td className="num">{money(totals.fee)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      {totals.count > PAGE && (
        <div className="row">
          {page > 1 && <Link href={pageLink(page - 1)}>←</Link>}
          <span className="muted">{page} / {Math.ceil(totals.count / PAGE)}</span>
          {page * PAGE < totals.count && <Link href={pageLink(page + 1)}>→</Link>}
        </div>
      )}
    </>
  );
}
