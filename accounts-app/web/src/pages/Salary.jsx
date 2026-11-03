import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useBusiness } from "../components/BusinessLayout.jsx";
import { countChipClass } from "../lib/attendance.js";
import { fmtDate, money, todayIST } from "../lib/format.js";

const shiftMonth = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const days = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const field = "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

function BonusModal({ row, month, onClose, onSaved, setError }) {
  const [bonus, setBonus] = useState(row.bonus ? String(row.bonus) : "");
  const [note, setNote] = useState(row.bonus_note);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("salary/bonus", { method: "PUT", body: { employee_id: row.employee_id, month, bonus: Number(bonus || 0), note } });
      onSaved();
    } catch (err) {
      setError(err.message);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold italic">Bonus</h2>
          <p className="text-sm text-muted-foreground">{row.name} · {monthLabel(month)}</p>
        </div>
        <div>
          <label htmlFor="b-amt" className="text-sm font-semibold mb-1 block">Bonus amount (₹)</label>
          <input id="b-amt" type="number" min="0" step="0.01" inputMode="decimal" autoFocus className={field} value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label htmlFor="b-note" className="text-sm font-semibold mb-1 block">Reason (shown on the slip)</label>
          <input id="b-note" className={field} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Diwali bonus" />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
        </div>
      </form>
    </div>
  );
}

export default function Salary() {
  const biz = useBusiness();
  const thisMonth = todayIST().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bonusFor, setBonusFor] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const t = ++latest.current; // only the newest request may update the screen (older, slower replies are dropped)
    try {
      const d = await api(`salary/sheet?month=${month}&business=${encodeURIComponent(biz.name)}`);
      if (t === latest.current) setData(d);
    } catch (err) {
      if (t === latest.current) setError(err.message);
    }
  }, [month, biz.name]);
  useEffect(() => { setData(null); setNotice(""); load(); }, [load]);

  const rows = data?.rows ?? [];
  const totals = useMemo(() => ({
    net: rows.reduce((a, r) => a + r.net, 0),
    paid: rows.filter((r) => r.status === "Paid").reduce((a, r) => a + r.net, 0),
  }), [rows]);

  const pay = async (r) => {
    const warn = r.unmarked > 0 ? `\n\n⚠ ${r.unmarked} day(s) are not marked and will NOT be paid.` : "";
    if (!window.confirm(`Mark ${r.name}'s salary for ${monthLabel(month)} as paid?\n\nNet pay: ${money(r.net)}${warn}\n\nAttendance for this month will be locked.`)) return;
    setError("");
    try {
      const d = await api("salary/pay", { method: "POST", body: { employee_id: r.employee_id, month } });
      setNotice(d.expense_added ? `${r.name}: marked as paid and added to ${d.expense_business} expenses as a Salary entry.` : `${r.name}: marked as paid (no expense added because the net pay is ₹0).`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const unpay = async (r) => {
    if (!window.confirm(`Undo the payment for ${r.name} (${monthLabel(month)})? Any salary entry added to Expenses will be removed and attendance unlocked.`)) return;
    setError("");
    try {
      await api("salary/unpay", { method: "POST", body: { employee_id: r.employee_id, month } });
      setNotice("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const navBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
  const pill = "px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-colors";
  const chip = (key, short, n) => (
    <span key={key} title={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${countChipClass(key, n)}`}>{short} {n}</span>
  );
  const Fact = ({ label, children, big }) => (
    <div>
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label.toUpperCase()}</div>
      <div className={big ? "font-display text-2xl font-bold" : "font-semibold"}>{children}</div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-4xl font-bold italic mb-1">Salary</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button className={navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
          <span className="font-display text-xl font-bold italic w-44 text-center">{monthLabel(month)}</span>
          <button className={navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">›</button>
          {month !== thisMonth && <button onClick={() => setMonth(thisMonth)} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">THIS MONTH</button>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`${biz.base}/reports?report=salary&month=${month}`} className={`${pill} border border-primary text-primary hover:bg-primary hover:text-primary-foreground`}>SALARY REPORT (EXCEL / PDF)</Link>
          <Link to={`${biz.base}/salary/slips/${month}`} className={`${pill} bg-primary text-primary-foreground hover:opacity-90`}>PRINT ALL SLIPS</Link>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {notice && <p role="status" className="text-sm rounded-lg bg-card border border-border px-4 py-3 mb-4">{notice}</p>}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-2xl shadow-card border border-border p-5"><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">TOTAL PAYABLE</div><div className="font-display text-3xl font-bold mt-1">{money(totals.net)}</div><div className="text-xs text-muted-foreground mt-1">{rows.length} employee{rows.length === 1 ? "" : "s"}</div></div>
          <div className="bg-card rounded-2xl shadow-card border border-border p-5"><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">PAID</div><div className="font-display text-3xl font-bold mt-1">{money(totals.paid)}</div></div>
          <div className="bg-card rounded-2xl shadow-card border border-border p-5 col-span-2 lg:col-span-1"><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">STILL TO PAY</div><div className="font-display text-3xl font-bold mt-1">{money(totals.net - totals.paid)}</div></div>
        </div>
      )}

      <div className="space-y-4">
        {!data && !error && <p className="text-center text-muted-foreground py-10">Loading…</p>}
        {data && rows.length === 0 && <div className="bg-card rounded-2xl shadow-card border border-border p-10 text-center text-muted-foreground">No employees worked in {monthLabel(month)}.</div>}
        {rows.map((r) => (
          <article key={r.employee_id} className="bg-card rounded-2xl shadow-card border border-border p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to={`/attendance/${r.employee_id}?month=${month}`} className="font-display text-2xl font-bold italic hover:text-primary hover:underline">{r.name}</Link>
                <div className="text-sm text-muted-foreground">{r.designation || "—"}</div>
              </div>
              {r.status === "Paid"
                ? <div className="text-right"><span className="rounded-full bg-[#2F7F79] text-white px-3 py-1 text-xs font-bold tracking-wider">PAID</span><div className="text-xs text-muted-foreground mt-1">on {fmtDate(r.paid_on)}</div></div>
                : <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold tracking-wider">NOT PAID YET</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              {chip("Present", "P", r.present)}{chip("Half day", "H", r.half_days)}{chip("Leave", "L", r.leave)}{chip("Absent", "A", r.absent)}
              {r.unmarked > 0 && <span className="text-xs font-semibold text-primary ml-1">{r.unmarked} day{r.unmarked === 1 ? "" : "s"} not marked (not paid)</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              <Fact label="Monthly salary">{r.monthly_salary > 0 ? money(r.monthly_salary) : <span className="text-primary">not set</span>}</Fact>
              <Fact label="Paid days">{days(r.payable_days)}</Fact>
              <Fact label="Earned">{money(r.earned)}</Fact>
              <Fact label="Bonus">{r.bonus > 0 ? <span title={r.bonus_note}>{money(r.bonus)}{r.bonus_note && <span className="block text-xs font-normal text-muted-foreground">{r.bonus_note}</span>}</span> : "—"}</Fact>
              <Fact label="Net pay" big>{money(r.net)}</Fact>
            </div>

            <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border">
              <Link to={`${biz.base}/salary/slip/${r.employee_id}/${month}`} className={`${pill} bg-primary text-primary-foreground hover:opacity-90`}>GENERATE SALARY SLIP</Link>
              {r.status === "Open" && <button onClick={() => setBonusFor(r)} className={`${pill} border border-primary text-primary hover:bg-primary hover:text-primary-foreground`}>{r.bonus > 0 ? "EDIT BONUS" : "+ ADD BONUS"}</button>}
              {r.status === "Open"
                ? <button onClick={() => pay(r)} className={`${pill} border border-foreground hover:bg-foreground hover:text-background`}>MARK AS PAID</button>
                : <button onClick={() => unpay(r)} className={`${pill} border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground`}>UNDO PAYMENT</button>}
            </div>
          </article>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">P = present, H = half day, L = paid leave, A = absent. Days that are not marked are not paid. Marking a salary as paid also adds a Salary entry to the expenses of the business the employee works for.</p>

      {bonusFor && <BonusModal row={bonusFor} month={month} setError={setError} onClose={() => setBonusFor(null)} onSaved={() => { setBonusFor(null); load(); }} />}
    </div>
  );
}
