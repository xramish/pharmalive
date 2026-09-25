import { setLangAction } from "@/app/actions";
import { getLang } from "@/lib/t";

export default async function LangSwitch() {
  const lang = await getLang();
  return (
    <form action={setLangAction} className="lang-switch" style={{ display: "flex", gap: 4 }}>
      <button name="lang" value="uz" className={lang === "uz" ? "on" : ""}>UZ</button>
      <button name="lang" value="ru" className={lang === "ru" ? "on" : ""}>RU</button>
    </form>
  );
}
