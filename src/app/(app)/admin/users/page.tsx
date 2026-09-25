import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/t";
import { saveUserAction } from "../actions";

const ROLES = ["admin", "manager", "operator", "warehouse", "driver"] as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(["admin"]);
  const t = await getT();
  const { error } = await searchParams;
  const users = await db.select().from(schema.users).orderBy(asc(schema.users.role), asc(schema.users.name));

  const roleSelect = (value?: string) => (
    <select name="role" defaultValue={value ?? "driver"}>
      {ROLES.map((r) => <option key={r} value={r}>{t[`role_${r}`]}</option>)}
    </select>
  );

  return (
    <>
      <h1>{t.users}</h1>
      {error === "login" && <div className="alert err">{t.loginTaken}</div>}

      <form action={saveUserAction} className="card row">
        <div className="field"><label>{t.name} *</label><input name="name" required /></div>
        <div className="field"><label>{t.loginField} *</label><input name="login" required autoCapitalize="none" /></div>
        <div className="field"><label>{t.phone}</label><input name="phone" type="tel" /></div>
        <div className="field"><label>{t.role}</label>{roleSelect()}</div>
        <div className="field"><label>{t.password} *</label><input name="password" required minLength={6} /></div>
        <button>{t.addUser}</button>
      </form>

      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>{t.name}</th><th>{t.loginField}</th><th>{t.phone}</th><th>{t.role}</th><th>{t.active}</th><th>{t.newPassword}</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td colSpan={7} style={{ padding: 0 }}>
                  <form action={saveUserAction} className="row" style={{ padding: "6px 10px", flexWrap: "nowrap" }}>
                    <input type="hidden" name="id" value={u.id} />
                    <input name="name" defaultValue={u.name} required />
                    <input name="login" defaultValue={u.login} required style={{ width: 120 }} />
                    <input name="phone" defaultValue={u.phone ?? ""} style={{ width: 140 }} />
                    {roleSelect(u.role)}
                    <input type="checkbox" name="active" defaultChecked={u.active} style={{ minHeight: 0 }} />
                    <input name="password" placeholder="••••••" minLength={6} style={{ width: 130 }} />
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
