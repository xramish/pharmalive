"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ROLES: Role[] = ["admin", "manager", "operator", "warehouse", "driver"];

export async function saveUserAction(form: FormData) {
  await requireUser(["admin"]);
  const id = Number(form.get("id")) || null;
  const login = str(form, "login").toLowerCase();
  const role = ROLES.find((r) => r === str(form, "role"));
  const password = str(form, "password");
  if (!login || !role || !str(form, "name")) return;
  const taken = await db.query.users.findFirst({
    where: id ? and(eq(schema.users.login, login), ne(schema.users.id, id)) : eq(schema.users.login, login),
  });
  if (taken) redirect("/admin/users?error=login");
  const values = { name: str(form, "name"), login, phone: str(form, "phone") || null, role, active: form.get("active") === "on" };
  if (id) {
    await db
      .update(schema.users)
      .set({ ...values, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) })
      .where(eq(schema.users.id, id));
  } else {
    if (!password) return;
    await db.insert(schema.users).values({ ...values, active: true, passwordHash: await bcrypt.hash(password, 10) });
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function saveCompanyAction(form: FormData) {
  await requireUser(["admin"]);
  const id = Number(form.get("id")) || null;
  const name = str(form, "name");
  if (!name) return;
  const values = { name, inn: str(form, "inn") || null, phone: str(form, "phone") || null };
  if (id) {
    await db.update(schema.companies).set({ ...values, active: form.get("active") === "on" }).where(eq(schema.companies.id, id));
  } else {
    const [c] = await db.insert(schema.companies).values(values).onConflictDoNothing().returning({ id: schema.companies.id });
    if (c) redirect(`/admin/companies/${c.id}`);
  }
  revalidatePath("/admin/companies");
}

/** Saves the company's % per city. Empty field = use city default. */
export async function saveTariffsAction(form: FormData) {
  await requireUser(["admin"]);
  const companyId = Number(form.get("companyId"));
  const cities = await db.select({ id: schema.cities.id }).from(schema.cities);
  await db.transaction(async (tx) => {
    for (const c of cities) {
      const raw = str(form, `p_${c.id}`).replace(",", ".");
      if (raw === "") {
        await tx.delete(schema.tariffs).where(and(eq(schema.tariffs.companyId, companyId), eq(schema.tariffs.cityId, c.id)));
      } else if (Number.isFinite(Number(raw)) && Number(raw) >= 0) {
        await tx
          .insert(schema.tariffs)
          .values({ companyId, cityId: c.id, percent: raw })
          .onConflictDoUpdate({ target: [schema.tariffs.companyId, schema.tariffs.cityId], set: { percent: raw } });
      }
    }
  });
  revalidatePath(`/admin/companies/${companyId}`);
  redirect(`/admin/companies/${companyId}?saved=1`);
}

export async function saveCityAction(form: FormData) {
  await requireUser(["admin"]);
  const id = Number(form.get("id")) || null;
  const name = str(form, "name");
  const pct = str(form, "defaultPercent").replace(",", ".");
  if (!name || !Number.isFinite(Number(pct))) return;
  const values = { name, aliases: str(form, "aliases"), defaultPercent: pct || "0" };
  if (id) await db.update(schema.cities).set(values).where(eq(schema.cities.id, id));
  else await db.insert(schema.cities).values(values).onConflictDoNothing();
  revalidatePath("/admin/cities");
}
