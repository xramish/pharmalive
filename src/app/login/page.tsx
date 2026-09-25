import LangSwitch from "@/components/LangSwitch";
import { getT } from "@/lib/t";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getT();
  const { next } = await searchParams;
  return (
    <>
      <div className="topbar">
        <span className="brand">Pharmalive</span>
        <span className="spacer" />
        <LangSwitch />
      </div>
      <div className="card login-box">
        <h1>{t.login}</h1>
        <LoginForm t={t} next={next} />
      </div>
    </>
  );
}
