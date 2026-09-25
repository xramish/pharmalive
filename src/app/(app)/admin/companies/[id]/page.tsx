import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/t";
import { saveCompanyAction, saveTariffsAction } from "../../actions";

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireUser(["admin"]);
  const t = await getT();
  const id = Number((await params).id);
  const { saved } = await searchParams;
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, id) });
  if (!company) notFound();
  const [cities, tariffs] = await Promise.all([
    db.select().from(schema.cities).orderBy(schema.cities.name),
    db.select().from(schema.tariffs).where(eq(schema.tariffs.companyId, id)),
  ]);
  const pct = new Map(tariffs.map((x) => [x.cityId, x.percent]));

  return (
    <>
      <p><Link href="/admin/companies">← {t.back}</Link></p>
      <h1>{company.name}</h1>
      <form action={saveCompanyAction} className="card row">
        <input type="hidden" name="id" value={company.id} />
        <div className="field"><label>{t.name}</label><input name="name" defaultValue={company.name} required /></div>
        <div className="field"><label>{t.inn}</label><input name="inn" defaultValue={company.inn ?? ""} /></div>
        <div className="field"><label>{t.phone}</label><input name="phone" defaultValue={company.phone ?? ""} /></div>
        <label className="row" style={{ alignItems: "center" }}>
          <input type="checkbox" name="active" defaultChecked={company.active} style={{ minHeight: 0 }} /> {t.active}
        </label>
        <button>{t.save}</button>
      </form>

      <h2>{t.tariffs}</h2>
      {saved && <div className="alert ok">{t.saved}</div>}
      <p className="muted small">{t.tariffHint}</p>
      <form action={saveTariffsAction} className="card">
        <input type="hidden" name="companyId" value={company.id} />
        <table>
          <thead><tr><th>{t.city}</th><th className="num">{t.defaultPercent}</th><th>{t.feePercent}</th></tr></thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="num muted">{Number(c.defaultPercent)}%</td>
                <td><input name={`p_${c.id}`} defaultValue={pct.has(c.id) ? Number(pct.get(c.id)) : ""} inputMode="decimal" style={{ width: 100 }} placeholder={String(Number(c.defaultPercent))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><button>{t.save}</button></p>
      </form>
    </>
  );
}
