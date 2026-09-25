import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getT } from "@/lib/t";
import ImportForm from "./ImportForm";

export default async function ImportPage() {
  await requireUser(["operator"]);
  const t = await getT();
  const companies = await db
    .select({ id: schema.companies.id, name: schema.companies.name })
    .from(schema.companies)
    .where(eq(schema.companies.active, true))
    .orderBy(schema.companies.name);
  return (
    <>
      <h1>{t.importExcel}</h1>
      <ImportForm t={t} companies={companies} today={todayISO()} />
    </>
  );
}
