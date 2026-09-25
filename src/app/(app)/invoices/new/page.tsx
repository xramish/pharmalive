import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getT } from "@/lib/t";
import NewInvoiceForm from "./NewInvoiceForm";

export default async function NewInvoicePage() {
  await requireUser(["operator"]);
  const t = await getT();
  const [companies, cities] = await Promise.all([
    db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.active, true)).orderBy(schema.companies.name),
    db.select({ id: schema.cities.id, name: schema.cities.name }).from(schema.cities).orderBy(schema.cities.name),
  ]);
  return (
    <>
      <h1>{t.newInvoice}</h1>
      <NewInvoiceForm t={t} companies={companies} cities={cities} today={todayISO()} />
    </>
  );
}
