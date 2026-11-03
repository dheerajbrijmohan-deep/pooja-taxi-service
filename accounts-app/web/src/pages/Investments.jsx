import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import InvestmentForm from "../components/InvestmentForm.jsx";
import { DisbursementForm, LoanForm } from "../components/LoanForms.jsx";
import PaybackChart from "../components/PaybackChart.jsx";
import { useBusiness } from "../components/BusinessLayout.jsx";
import { fmtDate, money } from "../lib/format.js";

const fmtMonth = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "short", year: "numeric" });
const pct = (n) => (n === null || n === undefined ? "—" : `${n}%`);
const lakh = (n) => money(n);

function Stat({ label, value, sub, tone }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl font-bold mt-1 ${tone === "bad" ? "text-destructive" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// What the ROI / break-even numbers mean right now, in plain words
function explain(s, biz) {
  const r = s.roi, name = biz || "your businesses";
  if (s.invested.base <= 0) return "Nothing invested yet. Add the first payment with “+ New investment”.";
  if (r.status === "not_launched") return `${name} has not started earning yet, so there is no ROI or break-even to show. They appear as soon as the first income is recorded. Until then this page tracks what has been put in.`;
  if (r.status === "recovered") return `Break-even reached in ${fmtMonth(r.breakeven_month)}: the profit earned so far covers everything invested.`;
  if (r.status === "on_track") return `At the recent average of ${money(r.recent_monthly_net)} a month, the remaining ${money(s.invested.base - s.operating.net)} would be earned back in about ${r.months_to_breakeven} month${r.months_to_breakeven === 1 ? "" : "s"} (around ${fmtMonth(r.breakeven_month)}).`;
  if (r.status === "not_profitable") return `Expenses are currently higher than income (recent average ${money(r.recent_monthly_net)} a month), so there is no break-even date yet.`;
  return "";
}

export default function Investments() {
  const biz = useBusiness().name; // each business has its own investments and loans
  const [exRef, setExRef] = useState(false);
  const [list, setList] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);       // null | {} | investment
  const [loanForm, setLoanForm] = useState(null); // null | {} | loan
  const [disbFor, setDisbFor] = useState(null);
  const [open, setOpen] = useState({});          // loan id -> expanded
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const latest = useRef(0);

  const load = useCallback(async () => {
    const t = ++latest.current;
    const qs = biz ? `business=${encodeURIComponent(biz)}` : "";
    try {
      const [i, s, l] = await Promise.all([api(`investments?${qs}`), api(`investments/summary?${qs}${exRef ? "&exclude_refundable=1" : ""}`), api(`loans?${qs}`)]);
      if (t !== latest.current) return;
      setList(i.investments); setSummary(s.summary); setLoans(l.loans);
    } catch (err) { if (t === latest.current) setError(err.message); }
  }, [biz, exRef]);
  useEffect(() => { setList(null); setSummary(null); load(); }, [load]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list ?? []).filter((r) => (!cat || r.category === cat) && (!t || [r.item, r.paid_to, r.category, r.notes, r.payment_mode].some((v) => v.toLowerCase().includes(t))));
  }, [list, q, cat]);
  const cats = useMemo(() => [...new Set((list ?? []).map((r) => r.category))].sort(), [list]);
  const shownTotal = rows.reduce((a, r) => a + r.amount, 0);

  const removeInv = async (r) => {
    if (!window.confirm(`Delete “${r.item}” (${money(r.amount)})?`)) return;
    try { await api(`investments/${r.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };
  const removeLoan = async (l) => {
    if (!window.confirm(`Delete the ${l.lender} loan and its ${l.disbursements.length} disbursement(s)?`)) return;
    try { await api(`loans/${l.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };
  const removeDisb = async (d) => {
    if (!window.confirm(`Delete this disbursement of ${money(d.amount)} (${fmtDate(d.disb_date)})?`)) return;
    try { await api(`loans/disbursements/${d.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };

  const s = summary;
  const r = s?.roi;
  const breakeven = !r ? "…" : r.status === "recovered" ? "Recovered ✓" : r.status === "on_track" ? fmtMonth(r.breakeven_month) : r.status === "not_launched" ? "Not opened yet" : r.status === "not_profitable" ? "Not yet" : "—";
  const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-4 py-3 whitespace-nowrap";
  const td = "px-3 py-3 align-top";
  const sel = "rounded-full border border-input bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const barMax = s ? Math.max(...s.invested.by_category.map((c) => c.amount), 1) : 1;
  const recovered = s && s.recovered_pct !== null ? Math.max(0, Math.min(100, s.recovered_pct)) : 0;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold italic">Investments & loans</h1>
          <p className="text-muted-foreground mt-1">Money put into setting up this business, its loans and disbursements, and how long it takes to earn it back.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setLoanForm({})} className="px-6 py-3 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors">+ NEW LOAN</button>
          <button onClick={() => setForm({})} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">+ NEW INVESTMENT</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[#C87412]" checked={exRef} onChange={(e) => setExRef(e.target.checked)} /> Don't count refundable deposits as money to earn back</label>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      {s && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Stat label="TOTAL INVESTED" value={money(s.invested.total)} sub={`${s.invested.count} payment${s.invested.count === 1 ? "" : "s"} · ${money(s.invested.refundable)} refundable`} />
            <Stat label="OWN FUNDS" value={money(s.invested.own_funds)} sub={`${money(s.invested.loan_funded)} funded by loans`} />
            <Stat label="LOANS DISBURSED" value={money(s.loans.disbursed)} sub={`of ${money(s.loans.sanctioned)} sanctioned · ${money(s.loans.pending)} still to come`} />
            <Stat label="NET RESULT SO FAR" value={money(s.operating.net)} tone={s.operating.net < 0 ? "bad" : ""} sub={`income ${money(s.operating.income)} − expenses ${money(s.operating.expenses)}`} />
            <Stat label="ROI" value={r.status === "not_launched" ? "—" : pct(r.roi_to_date_pct)} tone={r.roi_to_date_pct < 0 ? "bad" : ""} sub={r.status === "not_launched" ? "starts once income is recorded" : `${pct(r.roi_annual_pct)} a year at the recent pace`} />
            <Stat label="BREAK-EVEN" value={breakeven} sub={r.status === "on_track" ? `about ${r.months_to_breakeven} months away` : r.status === "recovered" ? `reached ${fmtMonth(r.breakeven_month)}` : ""} />
          </div>

          <section className="bg-card rounded-2xl shadow-card border border-border p-6 mb-6" data-payback>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">PAYBACK</h2>
              <span className="text-sm font-semibold">{money(Math.max(0, s.operating.net))} earned back of {money(s.invested.base)} ({s.recovered_pct === null ? "—" : `${Math.max(0, s.recovered_pct)}%`})</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-3" role="progressbar" aria-valuenow={recovered} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary" style={{ width: `${recovered}%` }} /></div>
            <p className="text-sm mb-4" data-explain>{explain(s, biz)}</p>
            <PaybackChart months={s.operating.months} base={s.invested.base} />
          </section>

          {s.invested.by_category.length > 0 && (
            <section className="bg-card rounded-2xl shadow-card border border-border p-6 mb-6">
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-4">WHERE THE MONEY WENT</h2>
              <ul className="space-y-3" data-categories>
                {s.invested.by_category.map((c) => (
                  <li key={c.category} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-semibold truncate">{c.category}</span>
                    <span className="h-3 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-primary rounded-full" style={{ width: `${(c.amount / barMax) * 100}%` }} /></span>
                    <span className="text-right whitespace-nowrap"><b>{money(c.amount)}</b> <span className="text-muted-foreground">· {Math.round((c.amount / s.invested.total) * 100)}%</span></span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">INVESTMENTS {list && `(${rows.length})`}</h2>
          <div className="flex flex-wrap gap-3">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={sel} aria-label="Filter by category"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search what, who…" aria-label="Search investments" className={`${sel} w-full sm:w-64`} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["DATE", ...(biz ? [] : ["BUSINESS"]), "CATEGORY", "WHAT FOR", "PAID TO", "PAID BY", "AMOUNT", ""].map((h, i) => <th key={i} className={`${th} ${h === "AMOUNT" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border" data-investments>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(r.invest_date)}</td>
                  {!biz && <td className={td}>{r.business}</td>}
                  <td className={td}>{r.category}{r.refundable && <span className="ml-2 inline-block rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-bold tracking-wider align-middle">REFUNDABLE</span>}</td>
                  <td className={`${td} font-semibold min-w-48`}>{r.item}{r.notes && <div className="text-xs font-normal text-muted-foreground">{r.notes}</div>}</td>
                  <td className={td}>{r.paid_to || "—"}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.payment_mode}<div className="text-xs text-muted-foreground">{r.funded_by}</div></td>
                  <td className={`${td} text-right whitespace-nowrap font-bold`}>{money(r.amount)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button onClick={() => setForm(r)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button>
                    <button onClick={() => removeInv(r)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>
                  </td>
                </tr>
              ))}
              {list && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">{list.length === 0 ? "No investments recorded yet. Click “+ New investment”." : "Nothing matches."}</td></tr>}
              {!list && !error && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
            {rows.length > 0 && <tfoot className="bg-muted font-bold"><tr><td className="px-4 py-3" colSpan={biz ? 5 : 6}>TOTAL ({rows.length})</td><td className="px-4 py-3 text-right whitespace-nowrap">{money(shownTotal)}</td><td /></tr></tfoot>}
          </table>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <div>
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">LOANS {loans && `(${loans.length})`}</h2>
            {s && <p className="text-sm text-muted-foreground mt-1">Disbursed so far: <b className="text-foreground">{money(s.loans.disbursed)}</b> of {money(s.loans.sanctioned)} sanctioned</p>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["LENDER", "FOR", "SANCTIONED", "DISBURSED", "STILL TO COME", "RATE", "TENURE", ""].map((h, i) => <th key={i} className={`${th} ${["SANCTIONED", "DISBURSED", "STILL TO COME"].includes(h) ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody data-loans>
              {(loans ?? []).map((l) => (
                <FragmentRow key={l.id} l={l} open={!!open[l.id]} toggle={() => setOpen((o) => ({ ...o, [l.id]: !o[l.id] }))} td={td}
                  onEdit={() => setLoanForm(l)} onDelete={() => removeLoan(l)} onDisburse={() => setDisbFor(l)} onDeleteDisb={removeDisb} />
              ))}
              {loans && loans.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No loans recorded. Click “+ New loan” to add one, then record each disbursement as the money arrives.</td></tr>}
            </tbody>
            {loans && loans.length > 0 && s && <tfoot className="bg-muted font-bold"><tr><td className="px-4 py-3" colSpan={2}>TOTAL</td><td className="px-4 py-3 text-right whitespace-nowrap">{money(s.loans.sanctioned)}</td><td className="px-4 py-3 text-right whitespace-nowrap">{money(s.loans.disbursed)}</td><td className="px-4 py-3 text-right whitespace-nowrap">{money(s.loans.pending)}</td><td colSpan={3} /></tr></tfoot>}
          </table>
        </div>
      </div>

      {form && <InvestmentForm investment={form.id ? form : null} known={list ?? []} defaultBusiness={biz} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {loanForm && <LoanForm loan={loanForm.id ? loanForm : null} defaultBusiness={biz} onClose={() => setLoanForm(null)} onSaved={() => { setLoanForm(null); load(); }} />}
      {disbFor && <DisbursementForm loan={disbFor} onClose={() => setDisbFor(null)} onSaved={() => { setDisbFor(null); load(); }} />}
    </div>
  );
}

function FragmentRow({ l, open, toggle, td, onEdit, onDelete, onDisburse, onDeleteDisb }) {
  return (
    <>
      <tr className="border-t border-border hover:bg-muted/60" data-loan-row>
        <td className={`${td} font-semibold`}><button onClick={toggle} className="text-left hover:text-primary" aria-expanded={open}>{open ? "▾" : "▸"} {l.lender}</button>{l.notes && <div className="text-xs font-normal text-muted-foreground ml-4">{l.notes}</div>}</td>
        <td className={td}>{l.business || "General"}</td>
        <td className={`${td} text-right whitespace-nowrap`}>{money(l.sanctioned)}</td>
        <td className={`${td} text-right whitespace-nowrap font-bold`}>{money(l.disbursed)}</td>
        <td className={`${td} text-right whitespace-nowrap`}>{money(l.pending)}</td>
        <td className={`${td} whitespace-nowrap`}>{l.interest_rate !== null ? `${l.interest_rate}%` : "—"}</td>
        <td className={`${td} whitespace-nowrap`}>{l.tenure_months !== null ? `${l.tenure_months} mo` : "—"}</td>
        <td className={`${td} whitespace-nowrap text-right`}>
          {l.pending > 0 && <button onClick={onDisburse} className="text-xs font-bold tracking-wider text-foreground hover:underline mr-3">+ DISBURSEMENT</button>}
          <button onClick={onEdit} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button>
          <button onClick={onDelete} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/40"><td colSpan={8} className="px-8 py-3">
          {l.disbursements.length === 0 ? <p className="text-sm text-muted-foreground">Nothing disbursed yet.</p> : (
            <ul className="space-y-1 text-sm" data-disbursements>
              {l.disbursements.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-6"><span className="w-28">{fmtDate(d.disb_date)}</span><b className="w-28 text-right">{money(d.amount)}</b><span className="text-muted-foreground flex-1">{d.note}</span><button onClick={() => onDeleteDisb(d)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button></li>
              ))}
            </ul>
          )}
        </td></tr>
      )}
    </>
  );
}
