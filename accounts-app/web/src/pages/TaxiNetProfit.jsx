import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { fmtDate, todayIST } from "../lib/format.js";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const prevMonth = () => { const t = todayIST(); return new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 2, 1)).toISOString().slice(0, 7); };
const monthName = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const th = "text-[11px] font-semibold tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap text-center";
const td = "px-3 py-2.5 whitespace-nowrap text-center";

function Stat({ label, value, sub, tone = "", big }) {
  return (
    <div className={`bg-card rounded-2xl shadow-card border border-border p-5 ${big ? "border-primary/60" : ""}`}>
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display ${big ? "text-4xl" : "text-3xl"} font-bold mt-1 whitespace-nowrap ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// Pooja Taxi net profit for a month:  net profit = profit of all cars (payout - cost, as on each car's sheet) - the month's expenses.
export default function TaxiNetProfit() {
  const [month, setMonth] = useState(prevMonth());
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setD(null);
    setError("");
    api(`taxi/net-profit?month=${month}`).then((x) => live && setD(x)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [month]);

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-4xl font-bold italic mb-2">Net profit</h1>
      <p className="text-muted-foreground mb-6">Net profit = profit of all cars − expenses for the month.</p>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <input type="month" value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <span className="font-display text-xl font-bold italic ml-2">{monthName(month)}</span>
      </div>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {!d && !error && <div className="bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground">Loading…</div>}

      {d && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Stat label="PROFIT OF ALL CARS" value={inr(d.cars_profit)} sub="payout − cost, summed over the cars" tone={d.cars_profit < 0 ? "text-destructive" : ""} />
            <Stat label="EXPENSES" value={`− ${inr(d.expenses_total)}`} sub={Object.entries(d.by_category).map(([k, v]) => `${k} ₹${num(v)}`).join(" · ")} />
            <Stat big label="NET PROFIT" value={inr(d.net_profit)} sub="profit of all cars − expenses" tone={d.net_profit < 0 ? "text-destructive" : "text-primary"} />
          </div>

          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">PROFIT BY CAR</h2>
          <div className="bg-card rounded-2xl shadow-card border border-border overflow-x-auto mb-8">
            <table className="text-sm min-w-full">
              <thead className="bg-muted"><tr>{["Car", "Driver", "Days run", "Total earning (₹)", "Payout (₹)", "Cost (₹)", "Profit (₹)", "Expenses (₹)", "Net profit (₹)"].map((h) => <th key={h} className={th}>{h.toUpperCase()}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {d.cars.map((c) => (
                  <tr key={c.id}>
                    <td className={`${td} font-semibold`}>{c.code.slice(-4)}<span className="text-muted-foreground font-normal"> · {c.model}</span></td>
                    <td className={td}>{c.driver || "—"}</td><td className={td}>{c.days_run}</td>
                    <td className={td}>{num(c.total_earning)}</td><td className={td}>{num(c.payout)}</td><td className={td}>{num(c.cost)}</td>
                    <td className={`${td} font-bold ${c.profit < 0 ? "text-destructive" : ""}`}>{num(c.profit)}</td>
                    <td className={td}>{num(c.expenses)}</td>
                    <td className={`${td} font-bold ${c.net_profit < 0 ? "text-destructive" : "text-primary"}`}>{num(c.net_profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-bold">
                <tr><td className={td} colSpan={3}>ALL CARS</td><td className={td}>{num(d.cars.reduce((a, c) => a + c.total_earning, 0))}</td><td className={td}>{num(d.cars.reduce((a, c) => a + c.payout, 0))}</td><td className={td}>{num(d.cars.reduce((a, c) => a + c.cost, 0))}</td><td className={`${td} ${d.cars_profit < 0 ? "text-destructive" : ""}`}>{num(d.cars_profit)}</td><td className={td}>{num(d.expenses_total)}</td><td className={`${td} ${d.net_profit < 0 ? "text-destructive" : "text-primary"}`}>{num(d.net_profit)}</td></tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">EXPENSES BY CAR (PUNCTURE, SERVICING, OTHER)</h2>
            <Link to="/business/taxi/expenses" className="text-xs font-bold tracking-wider text-primary hover:underline">ADD OR CHANGE EXPENSES →</Link>
          </div>
          <div className="bg-card rounded-2xl shadow-card border border-border overflow-x-auto mb-8">
            <table className="text-sm min-w-full">
              <thead className="bg-muted"><tr>{["Date", "Car", "Expense", "Details", "Amount (₹)"].map((h) => <th key={h} className={th}>{h.toUpperCase()}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {d.expenses.map((e) => (
                  <tr key={e.id}><td className={td}>{fmtDate(e.date, false)}</td><td className={`${td} font-semibold`}>{e.car_code.slice(-4)}</td><td className={td}>{e.category}</td><td className={td}>{e.item || "—"}</td><td className={`${td} font-semibold`}>{num(e.amount)}</td></tr>
                ))}
                {d.expenses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No expenses recorded for {monthName(month)}.</td></tr>}
              </tbody>
              <tfoot className="bg-muted font-bold"><tr><td className={td} colSpan={4}>TOTAL EXPENSES</td><td className={td}>{num(d.expenses_total)}</td></tr></tfoot>
            </table>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 text-sm text-center">
            <b>Net profit</b> = {inr(d.cars_profit)} − {inr(d.expenses_total)} = <b className={d.net_profit < 0 ? "text-destructive" : "text-primary"}>{inr(d.net_profit)}</b>
          </div>
        </>
      )}
    </div>
  );
}
