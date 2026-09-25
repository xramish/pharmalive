import { inArray } from "drizzle-orm";
import { schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { invoiceSelect } from "@/lib/invoices";
import { qrSvg } from "@/lib/qr";
import { getT } from "@/lib/t";
import PrintButton from "./PrintButton";

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ ids?: string; auto?: string }> }) {
  await requireUser(["manager", "operator", "warehouse"]);
  const t = await getT();
  const sp = await searchParams;
  const ids = (sp.ids ?? "").split(",").map(Number).filter(Boolean);
  const rows = ids.length ? await invoiceSelect().where(inArray(schema.invoices.id, ids)).orderBy(schema.invoices.id) : [];
  const labels = await Promise.all(rows.filter((r) => r.status !== "new" && r.status !== "cancelled").map(async (r) => ({ ...r, svg: await qrSvg(r.qrToken) })));

  return (
    <>
      <div className="no-print row" style={{ marginBottom: 16 }}>
        <PrintButton label={`${t.print} (${labels.length})`} auto={sp.auto === "1"} />
      </div>
      <div className="labels">
        {labels.map((l) => (
          <div className="label" key={l.id}>
            <div dangerouslySetInnerHTML={{ __html: l.svg }} />
            <div className="info">
              <b>№ {l.number}</b>
              <div>{l.invoiceDate}</div>
              <div><b>{l.store}</b></div>
              <div>{l.city}</div>
              <div>{l.address}</div>
              <div>{l.company}</div>
              <div>{money(l.amount)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
