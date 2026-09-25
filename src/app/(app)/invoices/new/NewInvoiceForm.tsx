"use client";

import { useActionState } from "react";
import type { Dict } from "@/lib/i18n";
import { createInvoiceAction } from "../actions";

type Opt = { id: number; name: string };

export default function NewInvoiceForm({ t, companies, cities, today }: { t: Dict; companies: Opt[]; cities: Opt[]; today: string }) {
  const [state, action, pending] = useActionState(createInvoiceAction, undefined);
  return (
    <form action={action} className="card">
      {state?.error && <div className="alert err">{state.error}</div>}
      <div className="row">
        <div className="field">
          <label>{t.company} *</label>
          <select name="companyId" required>
            <option value="" />
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t.invoiceNo} *</label>
          <input name="number" required />
        </div>
        <div className="field">
          <label>{t.invoiceDate} *</label>
          <input name="invoiceDate" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label>{t.amount} *</label>
          <input name="amount" inputMode="decimal" required />
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>{t.store} *</label>
          <input name="storeName" required />
        </div>
        <div className="field">
          <label>{t.city} *</label>
          <select name="cityId" required>
            <option value="" />
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>{t.address}</label>
          <input name="address" />
        </div>
        <div className="field">
          <label>{t.phone}</label>
          <input name="phone" type="tel" />
        </div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>{t.note}</label>
        <input name="note" />
      </div>
      <div style={{ marginTop: 16 }}>
        <button disabled={pending}>{t.save}</button>
      </div>
    </form>
  );
}
