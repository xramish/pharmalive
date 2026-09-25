"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { receiveAction } from "./actions";

type Row = { id: number; number: string; invoiceDate: string; company: string; store: string; city: string; amount: string };

export default function ReceiveTable({ t, rows }: { t: Dict; rows: Row[] }) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const shown = rows.filter((r) => !q || `${r.number} ${r.store} ${r.company} ${r.city}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = shown.length > 0 && shown.every((r) => sel.has(r.id));

  return (
    <form action={receiveAction}>
      <div className="row" style={{ marginBottom: 12 }}>
        <input placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted">{t.selected}: {sel.size}</span>
        <button disabled={!sel.size}>{t.receiveAndPrint}</button>
      </div>
      {[...sel].map((id) => <input key={id} type="hidden" name="id" value={id} />)}
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label={t.selectAll}
                  checked={allOn}
                  onChange={() => setSel((s) => { const n = new Set(s); shown.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id))); return n; })}
                  style={{ minHeight: 0 }}
                />
              </th>
              <th>{t.invoiceNo}</th>
              <th>{t.invoiceDate}</th>
              <th>{t.company}</th>
              <th>{t.store}</th>
              <th>{t.city}</th>
              <th className="num">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} onClick={() => toggle(r.id)} style={{ cursor: "pointer", background: sel.has(r.id) ? "#eef7f4" : undefined }}>
                <td><input type="checkbox" checked={sel.has(r.id)} readOnly style={{ minHeight: 0 }} /></td>
                <td>{r.number}</td>
                <td>{r.invoiceDate}</td>
                <td>{r.company}</td>
                <td>{r.store}</td>
                <td>{r.city}</td>
                <td className="num">{Number(r.amount).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="muted">{t.noResults}</td></tr>}
          </tbody>
        </table>
      </div>
    </form>
  );
}
