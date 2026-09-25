import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Fee % for a company delivering to a city: company tariff if set, otherwise city default. */
export async function feePercentFor(companyId: number, cityId: number): Promise<string> {
  const tariff = await db.query.tariffs.findFirst({
    where: and(eq(schema.tariffs.companyId, companyId), eq(schema.tariffs.cityId, cityId)),
  });
  if (tariff) return tariff.percent;
  const city = await db.query.cities.findFirst({ where: eq(schema.cities.id, cityId) });
  return city?.defaultPercent ?? "0";
}

/** Fee in so'm, rounded to whole so'm. */
export function calcFee(amount: number, percent: string | number) {
  return Math.round((amount * Number(percent)) / 100);
}
