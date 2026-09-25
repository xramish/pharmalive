"use client";

import { useActionState, useState, useTransition } from "react";
import type { Dict } from "@/lib/i18n";
import { previewImportAction, saveImportAction, type PreviewState } from "../actions";

type Opt = { id: number; name: string };

export default function ImportForm({ t, companies, today }: { t: Dict; companies: Opt[]; today: string }) {
  const [preview, previewAction, previewing] = useActionState(previewImportAction, undefined);
  const [result, setResult] = useState<PreviewState>();
  const [saving, startSave] = useTransition();

  const state = result ?? preview;
  const rows = state?.rows ?? [];
  const good = rows.filter((r) => !r.errors.length);
  const bad = rows.filter((r) => r.errors.length);

  return (
    <>
      <form action={(fd) => { setResult(undefined); previewAction(fd); }} className="card row">
        <div className="field">
          <label>{t.company} *</label>
          <select name="companyId" required>
            <option value="" />
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t.invoiceDate}</label>
          <input type="date" name="invoiceDate" defaultValue={today} />
        </div>
        <div className="field">
          <label>{t.chooseFile} (.xlsx) *</label>
          <input type="file" name="file" accept=".xlsx" required />
        </div>
        <button disabled={previewing}>{t.check}</button>
        <a href="/invoices/import/template" className="small">{t.downloadTemplate}</a>
      </form>

      {state?.error && <div className="alert err">{state.error}</div>}
      {result?.saved != null && <div className="alert ok">{t.imported}: {result.saved}</div>}

      {!result && good.length > 0 && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>{t.rowsOk}: {good.length}</h2>
            <button
              disabled={saving}
              onClick={() => startSave(async () => setResult(await saveImportAction(preview!.companyId!, good)))}
            >
              {t.importRows} ({good.length})
            </button>
          </div>
          <PreviewTable t={t} rows={good} />
        </div>
      )}

      {bad.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t.rowsError}: {bad.length}</h2>
          <PreviewTable t={t} rows={bad} showErrors />
        </div>
      )}
    </>
  );
}

function PreviewTable({ t, rows, showErrors }: { t: Dict; rows: NonNullable<PreviewState>["rows"] & object; showErrors?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.row}</th>
            <th>{t.invoiceNo}</th>
            <th>{t.invoiceDate}</th>
            <th>{t.store}</th>
            <th>{t.city}</th>
            <th>{t.address}</th>
            <th className="num">{t.amount}</th>
            {showErrors && <th>{t.error}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row}>
              <td>{r.row}</td>
              <td>{r.number}</td>
              <td>{r.invoiceDate}</td>
              <td>{r.storeName}</td>
              <td>{r.city}</td>
              <td>{r.address}</td>
              <td className="num">{r.amount?.toLocaleString("ru-RU")}</td>
              {showErrors && <td style={{ color: "var(--danger)", whiteSpace: "normal" }}>{r.errors.join("; ")}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
