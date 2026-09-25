import Link from "next/link";
import { logoutAction } from "@/app/actions";
import type { Role } from "@/db/schema";
import type { Session } from "@/lib/session";
import { getT } from "@/lib/t";
import LangSwitch from "./LangSwitch";

export default async function Nav({ session }: { session: Session }) {
  const t = await getT();
  const links: [string, string, Role[]][] = [
    ["/dashboard", t.navDashboard, ["admin", "manager"]],
    ["/invoices", t.navInvoices, ["admin", "manager", "operator", "warehouse"]],
    ["/warehouse", t.navWarehouse, ["admin", "warehouse"]],
    ["/driver", t.navDriver, ["admin", "driver"]],
    ["/reports", t.navReports, ["admin", "manager"]],
    ["/admin/users", t.navUsers, ["admin"]],
    ["/admin/companies", t.navCompanies, ["admin"]],
    ["/admin/cities", t.navCities, ["admin"]],
  ];
  return (
    <nav className="topbar">
      <Link href="/" className="brand">Pharmalive</Link>
      {links
        .filter(([, , roles]) => roles.includes(session.role))
        .map(([href, label]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
      <span className="spacer" />
      <LangSwitch />
      <span className="user">
        {session.name} · {t[`role_${session.role}`]}
      </span>
      <form action={logoutAction}>
        <button className="link">{t.logout}</button>
      </form>
    </nav>
  );
}
