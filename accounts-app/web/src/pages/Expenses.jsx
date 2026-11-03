import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import ExpenseForm from "../components/ExpenseForm.jsx";
import SharePie from "../components/SharePie.jsx";
import { businessBySlug } from "../lib/businesses.js";
import { fmtDate, money, todayIST } from "../lib/format.js";

const total = (e) => e.qty * e.price;
const sum = (rows) => rows.reduce((a, e) => a + total(e), 0);
const qtyFmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, ""));

function Stat({ label, value, sub }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

const shiftMonth = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });

export default function Expenses() {
  const { slug } = useParams();
  const biz = businessBySlug(slug);
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [expenses, setExpenses] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null | {} (new) | expense (edit)
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All"); // All | Supplies | Rent | Salary
  const today = todayIST();
  const [month, setMonth] = useState(today.slice(0, 7));

  const load = useCallback(async () => {
    if (!biz) return;
    try {
      setExpenses((await api(`expenses?business=${encodeURIComponent(biz.name)}`)).expenses);
    } catch (err) {
      setError(err.message);
    }
  }, [biz]);
  useEffect(() => { load(); }, [load]);

  const scoped = useMemo(() => (expenses ?? []).filter((e) => cat === "All" || e.category === cat), [expenses, cat]);
  const searching = q.trim() !== "";
  const rows = useMemo(() => {
    if (searching) {
      const t = q.trim().toLowerCase();
      return scoped.filter((e) => e.item.toLowerCase().includes(t) || e.category.toLowerCase().includes(t));
    }
    return scoped.filter((e) => e.expense_date.startsWith(month));
  }, [scoped, q, searching, month]);

  // everything on this page (cards, pie, table) follows the selected month
  const ofMonth = (ym) => (expenses ?? []).filter((e) => e.expense_date.startsWith(ym));
  const monthRows = ofMonth(month);
  const prevTotal = sum(ofMonth(shiftMonth(month, -1)));
  const isCurrent = month >= today.slice(0, 7);
  const cards = [
    ["TOTAL EXPENSES", money(sum(monthRows)), monthLabel(month)],
    ["SUPPLIES", money(sum(monthRows.filter((e) => e.category === "Supplies"))), monthLabel(month)],
    ["RENT", money(sum(monthRows.filter((e) => e.category === "Rent"))), monthLabel(month)],
    ...(isAdmin ? [["SALARY", money(sum(monthRows.filter((e) => e.category === "Salary"))), monthLabel(month)]] : []),
    ["PREVIOUS MONTH", money(prevTotal), monthLabel(shiftMonth(month, -1))],
  ];

  const remove = async (e) => {
    if (!window.confirm(`Delete "${e.item}" (${fmtDate(e.expense_date)})?`)) return;
    try {
      await api(`expenses/${e.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-4 py-3 whitespace-nowrap";
  const td = "px-4 py-3 align-top";
  const monthBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
  const tabs = isAdmin ? ["All", "Supplies", "Rent", "Salary"] : ["All", "Supplies", "Rent"];

  if (!biz) return <p className="text-muted-foreground">Unknown business.</p>;

  return (
    <div className="max-w-6xl">
      <Link to={slug === "carwash" || slug === "taxi" ? `/business/${slug}` : user.role === "admin" ? "/admin" : "/manager"} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">{slug === "carwash" ? "← CAR WASH DASHBOARD" : slug === "taxi" ? "← TAXI DASHBOARD" : "← ALL BUSINESSES"}</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold italic">Expenses</h1>
          <p className="text-muted-foreground mt-1">{biz.name} · {isAdmin ? "supplies, rent and salaries" : "supplies and rent"}</p>
        </div>
        <button onClick={() => setForm({})} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">
          + NEW EXPENSE
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button className={monthBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="font-display text-xl font-bold italic w-44 text-center">{monthLabel(month)}</span>
        <button className={monthBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month">›</button>
        {!isCurrent && <button onClick={() => setMonth(today.slice(0, 7))} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">THIS MONTH</button>}
        {tabs.length > 1 && (
          <div className="flex gap-1 rounded-full bg-muted p-1 ml-2">
            {tabs.map((t) => (
              <button key={t} onClick={() => setCat(t)} className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${cat === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.toUpperCase()}</button>
            ))}
          </div>
        )}
      </div>

      {expenses && (
        <div className={`grid grid-cols-2 ${{ 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" }[cards.length] ?? ""} gap-4 mb-6`}>
          {cards.map(([label, value, sub]) => <Stat key={label} label={label} value={value} sub={sub} />)}
        </div>
      )}

      {expenses && (
        <div className="mb-8">
          <SharePie rows={scoped.filter((e) => e.expense_date.startsWith(month))} today={today} periods={false} title="ITEM USAGE" subtitle={`Expenses by item · ${monthLabel(month)}`} dateOf={(e) => e.expense_date} keyOf={(e) => e.item} amountOf={total} emptyText={`No expenses in ${monthLabel(month)}.`} />
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">{searching ? "SEARCH RESULTS (ALL MONTHS)" : `ENTRIES · ${monthLabel(month).toUpperCase()}`}</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all months by item…" aria-label="Search expenses"
            className="rounded-full border border-input bg-white px-4 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {expenses && (
          <div className="px-4 py-2 text-sm bg-muted/60 border-b border-border">
            <span className="font-semibold">{rows.length} entr{rows.length === 1 ? "y" : "ies"}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold">{money(sum(rows))}</span> <span className="text-muted-foreground">{searching ? "in total" : `in ${monthLabel(month)}`}</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {["DATE", ...(isAdmin ? ["CATEGORY"] : []), "ITEM NAME", "QTY", "PRICE", "TOTAL", ""].map((h, i) => (
                  <th key={i} className={`${th} ${["QTY", "PRICE", "TOTAL"].includes(h) ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(e.expense_date)}</td>
                  {isAdmin && <td className={td}><span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider">{e.category.toUpperCase()}</span></td>}
                  <td className={`${td} font-semibold`}>{e.item}</td>
                  <td className={`${td} text-right`}>{qtyFmt(e.qty)}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>{money(e.price)}</td>
                  <td className={`${td} text-right whitespace-nowrap font-bold`}>{money(total(e))}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button onClick={() => setForm(e)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button>
                    {isAdmin && <button onClick={() => remove(e)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>}
                  </td>
                </tr>
              ))}
              {expenses && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{searching ? "No expenses match your search." : `No expenses in ${monthLabel(month)}.`}</td></tr>
              )}
              {!expenses && !error && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && <ExpenseForm business={biz.name} expense={form.id ? form : null} known={expenses ?? []} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
