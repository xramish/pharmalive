import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { dateTime, TZ } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { getT } from "@/lib/t";
import ReceiveTable from "./ReceiveTable";

export default async function WarehousePage() {
  await requireUser(["warehouse"]);
  const t = await getT();
  const [pending, receivedToday] = await Promise.all([
    invoiceSelect().where(eq(schema.invoices.status, "new")).orderBy(asc(schema.invoices.id)),
    invoiceSelect()
      .where(
        and(
          eq(schema.invoices.status, "received"),
          sql`(${schema.invoices.receivedAt} at time zone ${TZ})::date = (now() at time zone ${TZ})::date`,
        ),
      )
      .orderBy(desc(schema.invoices.receivedAt)),
  ]);

  return (
    <>
      <h1>{t.toReceive} ({pending.length})</h1>
      <ReceiveTable t={t} rows={pending} />

      <h2>{t.receivedToday} ({receivedToday.length})</h2>
      {receivedToday.length > 0 && (
        <p><Link className="btn secondary" href={`/print?ids=${receivedToday.map((r) => r.id).join(",")}`} target="_blank">{t.reprint} ({receivedToday.length})</Link></p>
      )}
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <tbody>
            {receivedToday.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/invoices/${r.id}`}>{r.number}</Link></td>
                <td>{r.company}</td>
                <td>{r.store}</td>
                <td>{r.city}</td>
                <td>{dateTime(r.receivedAt)}</td>
                <td><Link href={`/print?ids=${r.id}`} target="_blank">{t.printQr}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
