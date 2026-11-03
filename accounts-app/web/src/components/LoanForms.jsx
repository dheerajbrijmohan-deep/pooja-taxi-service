import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { BUSINESSES } from "../lib/businesses.js";
import { money, todayIST } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;

function Shell({ title, onClose, onSubmit, busy, error, children, submitLabel = "SAVE" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="w-full max-w-xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4 my-4">
        <h2 className="font-display text-2xl font-bold italic">{title}</h2>
        {children}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

// `loan` set = editing
export function LoanForm({ loan, defaultBusiness, onSaved, onClose }) {
  const [f, setF] = useState(loan
    ? { ...loan, sanctioned: String(loan.sanctioned), interest_rate: loan.interest_rate ?? "", tenure_months: loan.tenure_months ?? "" }
    : { business: defaultBusiness || "", lender: "", sanctioned: "", interest_rate: "", tenure_months: "", sanction_date: todayIST(), notes: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = { ...f, sanctioned: Number(f.sanctioned), interest_rate: f.interest_rate === "" ? null : Number(f.interest_rate), tenure_months: f.tenure_months === "" ? null : Number(f.tenure_months) };
      const d = loan ? await api(`loans/${loan.id}`, { method: "PUT", body }) : await api("loans", { method: "POST", body });
      onSaved(d.loan);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Shell title={loan ? "Edit loan" : "New loan"} onClose={onClose} onSubmit={submit} busy={busy} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><L id="ln-lender">Lender (bank / person)</L><input id="ln-lender" ref={first} className={field} value={f.lender} onChange={set("lender")} required maxLength={100} /></div>
        {!defaultBusiness && <div><L id="ln-biz">For business</L><select id="ln-biz" className={field} value={f.business} onChange={set("business")}><option value="">Not tied to one business</option>{BUSINESSES.map((b) => <option key={b.slug}>{b.name}</option>)}</select></div>}
        <div><L id="ln-date">Sanction date</L><input id="ln-date" type="date" className={field} value={f.sanction_date} onChange={set("sanction_date")} required /></div>
        <div><L id="ln-amt">Sanctioned amount (₹)</L><input id="ln-amt" type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.sanctioned} onChange={set("sanctioned")} required /></div>
        <div><L id="ln-rate">Interest rate (% a year)</L><input id="ln-rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" className={field} value={f.interest_rate} onChange={set("interest_rate")} /></div>
        <div><L id="ln-tenure">Tenure (months)</L><input id="ln-tenure" type="number" min="1" max="600" step="1" inputMode="numeric" className={field} value={f.tenure_months} onChange={set("tenure_months")} /></div>
        <div className="sm:col-span-2"><L id="ln-notes">Notes</L><input id="ln-notes" className={field} value={f.notes} onChange={set("notes")} maxLength={300} /></div>
      </div>
    </Shell>
  );
}

export function DisbursementForm({ loan, onSaved, onClose }) {
  const [f, setF] = useState({ disb_date: todayIST(), amount: "", note: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try { const d = await api(`loans/${loan.id}/disbursements`, { method: "POST", body: { ...f, amount: Number(f.amount) } }); onSaved(d.loan); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Record a disbursement" onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="SAVE DISBURSEMENT">
      <p className="text-sm text-muted-foreground">{loan.lender} · sanctioned {money(loan.sanctioned)} · disbursed so far {money(loan.disbursed)} · <b className="text-foreground">still to come {money(loan.pending)}</b></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><L id="db-date">Date received</L><input id="db-date" type="date" className={field} value={f.disb_date} onChange={set("disb_date")} required /></div>
        <div><L id="db-amt">Amount (₹)</L><input id="db-amt" ref={first} type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.amount} onChange={set("amount")} required /></div>
        <div className="sm:col-span-2"><L id="db-note">Note</L><input id="db-note" className={field} value={f.note} onChange={set("note")} maxLength={200} placeholder="e.g. First tranche" /></div>
      </div>
    </Shell>
  );
}
