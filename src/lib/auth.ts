import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { SESSION_COOKIE, verifySession, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  // Re-check the database so deactivated users lose access immediately.
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, s.uid) });
  if (!user || !user.active) return null;
  return { uid: user.id, role: user.role, name: user.name };
}

/** Use at the top of every page/action. Redirects if not logged in or wrong role. */
export async function requireUser(roles?: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles && !roles.includes(s.role) && s.role !== "admin") redirect("/");
  return s;
}

export function homeFor(role: Role) {
  switch (role) {
    case "driver":
      return "/driver";
    case "warehouse":
      return "/warehouse";
    case "operator":
      return "/invoices";
    default:
      return "/dashboard";
  }
}
