import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/t";
import { saveCompanyAction } from "../actions";

export default async function CompaniesPage() {
  await requireUser(["admin"]);
  const t = await getT();
  const companies = await db
    .select({
      id: schema.companies.id,
      name: schema.companies.name,
      inn: schema.companies.inn,
      phone: schema.companies.phone,
      active: schema.companies.active,
      tariffs: sql<number>`(select count(*)::int from tariffs where tariffs.company_id = ${schema.companies.id})`,
    })
    .from(schema.companies)
    .orderBy(schema.companies.name);

  return (
    <>
      <h1>{t.navCompanies}</h1>
      <form action={saveCompanyAction} className="card row">
        <div className="field"><label>{t.name} *</label><input name="name" required /></div>
        <div className="field"><label>{t.inn}</label><input name="inn" /></div>
        <div className="field"><label>{t.phone}</label><input name="phone" type="tel" /></div>
        <button>{t.addCompany}</button>
      </form>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>{t.name}</th><th>{t.inn}</th><th>{t.phone}</th><th>{t.tariffs}</th><th>{t.active}</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/companies/${c.id}`}>{c.name}</Link></td>
                <td>{c.inn}</td>
                <td>{c.phone}</td>
                <td>{c.tariffs}</td>
                <td>{c.active ? t.yes : t.no}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
