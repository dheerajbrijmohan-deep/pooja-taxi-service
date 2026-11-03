import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { BUSINESSES } from "../lib/businesses.js";
import { todayIST } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
export const CATEGORIES = ["Legal & documentation", "Rent agreement", "Security deposit", "Interiors & construction", "Equipment & furniture", "Licences & permits", "Marketing & launch", "Deposits & advances", "Other"];
const MODES = ["Bank transfer", "UPI", "Cash", "Cheque", "Card"];

// `investment` set = editing. Category and payee are free text with suggestions (earlier ones are remembered).
export default function InvestmentForm({ investment, known, defaultBusiness, onSaved, onClose }) {
  const [f, setF] = useState(investment
    ? { ...investment, amount: String(investment.amount) }
    : { business: defaultBusiness || "Pooja Taxi Services", invest_date: todayIST(), category: "", item: "", paid_to: "", amount: "", payment_mode: "Bank transfer", funded_by: "Own funds", refundable: false, notes: "" });
  const [refTouched, setRefTouched] = useState(!!investment);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const categories = useMemo(() => [...new Set([...CATEGORIES, ...known.map((k) => k.category)])], [known]);
  const payees = useMemo(() => [...new Set(known.map((k) => k.paid_to).filter(Boolean))].sort(), [known]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setCategory = (e) => {
    const category = e.target.value;
    // a security deposit is normally refundable: tick the box unless the person already decided
    setF((p) => ({ ...p, category, refundable: !refTouched && /deposit/i.test(category) ? true : p.refundable }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...f, amount: Number(f.amount) };
      const d = investment ? await api(`investments/${investment.id}`, { method: "PUT", body }) : await api("investments", { method: "POST", body });
      onSaved(d.investment);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-2xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4 my-4">
        <h2 className="font-display text-2xl font-bold italic">{investment ? "Edit investment" : "New investment"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!defaultBusiness && <div><L id="iv-biz">Business</L><select id="iv-biz" className={field} value={f.business} onChange={set("business")}>{BUSINESSES.map((b) => <option key={b.slug}>{b.name}</option>)}</select></div>}
          <div><L id="iv-date">Date paid</L><input id="iv-date" type="date" className={field} value={f.invest_date} onChange={set("invest_date")} required /></div>
          <div>
            <L id="iv-cat">Category</L>
            <input id="iv-cat" ref={first} list="iv-cats" className={field} value={f.category} onChange={setCategory} required maxLength={60} autoComplete="off" placeholder="e.g. Security deposit" />
            <datalist id="iv-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <L id="iv-to">Paid to</L>
            <input id="iv-to" list="iv-payees" className={field} value={f.paid_to} onChange={set("paid_to")} maxLength={100} autoComplete="off" placeholder="e.g. Rekha Mohite" />
            <datalist id="iv-payees">{payees.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="sm:col-span-2"><L id="iv-item">What it was for</L><input id="iv-item" className={field} value={f.item} onChange={set("item")} required maxLength={150} placeholder="e.g. CA fees for filing ITR for 3 years" /></div>
          <div><L id="iv-amt">Amount (₹)</L><input id="iv-amt" type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.amount} onChange={set("amount")} required /></div>
          <div><L id="iv-mode">Paid by</L><select id="iv-mode" className={field} value={f.payment_mode} onChange={set("payment_mode")}>{MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><L id="iv-fund">Money came from</L><select id="iv-fund" className={field} value={f.funded_by} onChange={set("funded_by")}><option>Own funds</option><option>Loan</option></select></div>
          <label className="flex items-center gap-3 self-end pb-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#C87412]" checked={f.refundable} onChange={(e) => { setRefTouched(true); setF((p) => ({ ...p, refundable: e.target.checked })); }} />
            Refundable (e.g. a security deposit)
          </label>
          <div className="sm:col-span-2"><L id="iv-notes">Notes</L><textarea id="iv-notes" rows={2} className={field} value={f.notes} onChange={set("notes")} maxLength={500} /></div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
        </div>
      </form>
    </div>
  );
}
