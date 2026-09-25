"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import type { Dict } from "@/lib/i18n";

export default function LoginForm({ t, next }: { t: Dict; next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action}>
      {state?.error && <div className="alert err">{t.wrongLogin}</div>}
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label>{t.loginField}</label>
        <input name="login" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div className="field">
        <label>{t.password}</label>
        <input name="password" type="password" autoComplete="current-password" required />
      </div>
      <button disabled={pending}>{t.login}</button>
    </form>
  );
}
