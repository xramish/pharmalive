import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/t";
import { saveCityAction } from "../actions";

export default async function CitiesPage() {
  await requireUser(["admin"]);
  const t = await getT();
  const cities = await db.select().from(schema.cities).orderBy(schema.cities.name);
  return (
    <>
      <h1>{t.navCities}</h1>
      <form action={saveCityAction} className="card row">
        <div className="field"><label>{t.name} *</label><input name="name" required /></div>
        <div className="field" style={{ flex: 1 }}><label>{t.aliases}</label><input name="aliases" /></div>
        <div className="field"><label>{t.defaultPercent}</label><input name="defaultPercent" defaultValue="1.5" inputMode="decimal" style={{ width: 90 }} /></div>
        <button>{t.addCity}</button>
      </form>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>{t.name} · {t.aliases} · {t.defaultPercent}</th></tr></thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id}>
                <td>
                  <form action={saveCityAction} className="row" style={{ flexWrap: "nowrap" }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name" defaultValue={c.name} required />
                    <input name="aliases" defaultValue={c.aliases} style={{ flex: 1, minWidth: 260 }} />
                    <input name="defaultPercent" defaultValue={Number(c.defaultPercent)} inputMode="decimal" style={{ width: 80 }} />
                    <span>%</span>
                    <button className="secondary">{t.save}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
