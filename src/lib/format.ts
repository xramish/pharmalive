export const TZ = "Asia/Tashkent";

export function money(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ru-RU", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
}

/** Today's date in Tashkent as YYYY-MM-DD. */
export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
