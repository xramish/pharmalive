"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { homeFor } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/i18n";
import { SESSION_COOKIE, signSession } from "@/lib/session";

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" };

export async function loginAction(_prev: { error?: boolean } | undefined, form: FormData) {
  const login = String(form.get("login") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.query.users.findFirst({ where: eq(schema.users.login, login) });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: true };
  }
  (await cookies()).set(SESSION_COOKIE, await signSession({ uid: user.id, role: user.role, name: user.name }), cookieOpts);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLangAction(form: FormData) {
  const lang = form.get("lang") === "ru" ? "ru" : "uz";
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
