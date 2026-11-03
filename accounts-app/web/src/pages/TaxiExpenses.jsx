import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import DateInput from "../components/DateInput.jsx";
import { fmtDate, todayIST } from "../lib/format.js";

const field = "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const num = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthName = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const shiftMonth = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1 + n, 1)).toISOString().slice(0, 7);
const th = "text-[11px] font-semibold tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap text-center";
const td = "px-3 py-2.5 whitespace-nowrap text-center";

function ExpenseForm({ expense, cars, defaultCar, categories, onClose, onSaved }) {
  const [f, setF] = useState(expense
    ? { expense_date: expense.date, vehicle_id: String(expense.vehicle_id), category: expense.category, item: expense.item, amount: String(expense.amount) }
    : { expense_date: todayIST(), vehicle_id: String(defaultCar || cars[0]?.id || ""), category: categories[0], item: "", amount: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...f, vehicle_id: Number(f.vehicle_id), amount: f.amount === "" ? null : Number(f.amount) };
      if (expense) await api(`taxi/expenses/${expense.id}`, { method: "PUT", body });
      else await api("taxi/expenses", { method: "POST", body });
      onSaved(f.expense_date.slice(0, 7));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-lg bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">{expense ? "Edit expense" : "New expense"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><L id="te-date">Date</L><DateInput id="te-date" className={field} value={f.expense_date} onChange={(v) => setF((p) => ({ ...p, expense_date: v }))} required max={todayIST()} fromYear={2025} toYear={+todayIST().slice(0, 4)} /></div>
          <div>
            <L id="te-car">Car</L>
            <select id="te-car" className={field} value={f.vehicle_id} onChange={set("vehicle_id")} required>
              {cars.map((c) => <option key={c.id} value={c.id}>{c.code.slice(-4)}{c.model ? ` · ${c.model}` : ""}</option>)}
            </select>
          </div>
          <div>
            <L id="te-cat">Expense</L>
            <select id="te-cat" className={field} value={f.category} onChange={set("category")}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div><L id="te-amt">Amount ₹</L><input id="te-amt" type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.amount} onChange={set("amount")} required /></div>
          <div className="sm:col-span-2">
            <L id="te-item">{f.category === "Other" ? "What was it? (required)" : "Details (optional)"}</L>
            <input id="te-item" className={field} value={f.item} onChange={set("item")} maxLength={120} required={f.category === "Other"} placeholder={f.category === "Puncture" ? "e.g. rear left tyre" : f.category === "Servicing" ? "e.g. oil change, brake pads" : "e.g. challan, wash, battery"} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
        </div>
      </form>
    </div>
  );
}

// Pooja Taxi expenses, car by car: puncture, servicing and other costs. The net profit subtracts them from the cars' profit.
export default function TaxiExpenses() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [carId, setCarId] = useState("");
  const [cars, setCars] = useState([]);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null); // null | {} | expense
  const [error, setError] = useState("");

  useEffect(() => { api("taxi/vehicles").then((d) => setCars(d.vehicles.filter((v) => v.active))).catch((e) => setError(e.message)); }, []);
  const load = useCallback(() => {
    setError("");
    api(`taxi/expenses?month=${month}`).then(setData).catch((e) => setError(e.message));
  }, [month]);
  useEffect(load, [load]);

  const rows = useMemo(() => (data?.expenses ?? []).filter((e) => !carId || String(e.vehicle_id) === carId), [data, carId]);
  const perCar = useMemo(() => cars.map((c) => ({ ...c, total: (data?.expenses ?? []).filter((e) => e.vehicle_id === c.id).reduce((a, e) => a + e.amount, 0) })), [cars, data]);
  const del = async (e) => {
    if (!window.confirm(`Delete this expense (${e.category}, car ${e.car_code.slice(-4)}, ₹${num(e.amount)})?`)) return;
    try { await api(`taxi/expenses/${e.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };
  const today = todayIST().slice(0, 7);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold italic">Expenses</h1>
          <p className="text-muted-foreground mt-1">Puncture, servicing and other costs, car by car. They are subtracted from the profit in Net Profit.</p>
        </div>
        <button onClick={() => setForm({})} disabled={!cars.length} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">+ ADD EXPENSE</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="w-9 h-9 rounded-full border border-border hover:bg-muted">‹</button>
        <input type="month" value={month} max={today} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today} aria-label="Next month" className="w-9 h-9 rounded-full border border-border hover:bg-muted disabled:opacity-40">›</button>
        <span className="font-display text-xl font-bold italic mx-2">{monthName(month)}</span>
        <select value={carId} onChange={(e) => setCarId(e.target.value)} aria-label="Car" className="rounded-full border border-input bg-white px-4 py-2 text-sm font-semibold ml-auto">
          <option value="">All cars</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.code.slice(-4)}{c.model ? ` · ${c.model}` : ""}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {perCar.map((c) => (
          <div key={c.id} className="bg-card rounded-2xl shadow-card border border-border p-5">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{c.code.slice(-4)} · {c.model}</div>
            <div className="font-display text-2xl font-bold mt-1">₹{num(c.total)}</div>
          </div>
        ))}
        <div className="bg-card rounded-2xl shadow-card border border-primary/60 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">ALL CARS</div>
          <div className="font-display text-2xl font-bold mt-1 text-primary">₹{num(data?.total)}</div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-x-auto">
        <table className="text-sm min-w-full">
          <thead className="bg-muted"><tr>{["Date", "Car", "Expense", "Details", "Amount (₹)"].map((h) => <th key={h} className={th}>{h.toUpperCase()}</th>)}{isAdmin && <th className={th}>ACTION</th>}</tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => (
              <tr key={e.id}>
                <td className={td}>{fmtDate(e.date, false)}</td><td className={`${td} font-semibold`}>{e.car_code.slice(-4)}</td><td className={td}>{e.category}</td>
                <td className={`${td} whitespace-normal max-w-xs`}>{e.item || "—"}</td><td className={`${td} font-semibold`}>{num(e.amount)}</td>
                {isAdmin && <td className={td}><button onClick={() => setForm(e)} className="text-xs font-bold tracking-wider text-primary hover:underline">EDIT</button><button onClick={() => del(e)} className="ml-4 text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button></td>}
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">No expenses recorded for {monthName(month)}{carId ? " on this car" : ""}.</td></tr>}
            {!data && !error && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot className="bg-muted font-bold"><tr><td className={td} colSpan={4}>TOTAL</td><td className={td}>{num(rows.reduce((a, e) => a + e.amount, 0))}</td>{isAdmin && <td />}</tr></tfoot>}
        </table>
      </div>

      {form && data && <ExpenseForm expense={form.id ? form : null} cars={cars} defaultCar={carId} categories={data.categories} onClose={() => setForm(null)}
        onSaved={(m) => { setForm(null); if (m !== month) setMonth(m); else load(); }} />}
    </div>
  );
}
