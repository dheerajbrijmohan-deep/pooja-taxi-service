import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import CallList from "../components/CallList.jsx";
import DailyBars from "../components/DailyBars.jsx";
import DueCell from "../components/DueCell.jsx";
import CarWashForm from "../components/CarWashForm.jsx";
import SharePie from "../components/SharePie.jsx";
import { daysBetween, fmtDate, money, todayIST } from "../lib/format.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Stat({ label, value, sub }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

const shiftDay = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export default function CarWash() {
  const { user } = useAuth();
  const [entries, setEntries] = useState(null);
  const [stats, setStats] = useState(null);
  const [callData, setCallData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null | {} (new) | entry (edit)
  const [q, setQ] = useState("");
  const [day, setDay] = useState(todayIST());

  const load = useCallback(async () => {
    try {
      const [e, s, c] = await Promise.all([api("carwash/entries"), api("carwash/stats"), api("carwash/call-list")]);
      setEntries(e.entries);
      setStats(s);
      setCallData(c);
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = stats?.today ?? todayIST();

  // latest due date per vehicle: older entries of a returning vehicle are "washed again"
  const lastDue = useMemo(() => {
    const m = {};
    (entries ?? []).forEach((r) => { if (!m[r.vehicle_number] || r.due_on > m[r.vehicle_number]) m[r.vehicle_number] = r.due_on; });
    return m;
  }, [entries]);

  const searching = q.trim() !== "";
  const rows = useMemo(() => {
    if (!entries) return [];
    if (searching) {
      const t = q.trim().toLowerCase();
      return entries.filter((r) => [r.name, r.mobile, r.vehicle_number, r.vehicle_type, r.service, r.model, r.address].some((v) => v.toLowerCase().includes(t)));
    }
    return entries.filter((r) => r.entry_date === day);
  }, [entries, q, searching, day]);

  // services already used, offered as suggestions in the form
  const services = useMemo(() => [...new Set((entries ?? []).map((r) => r.service).filter(Boolean))].sort(), [entries]);

  const dayTotal = rows.reduce((a, r) => a + r.paid, 0);

  const remove = async (r) => {
    if (!window.confirm(`Delete the entry for ${r.name} (${r.vehicle_number})?`)) return;
    try {
      await api(`carwash/entries/${r.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const avg = stats && stats.month.cars ? stats.month.earned / stats.month.cars : 0;
  const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-4 py-3 whitespace-nowrap";
  const td = "px-4 py-3 align-top";
  const dayBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";

  return (
    <div className="max-w-6xl">
      <Link to={user.role === "admin" ? "/admin" : "/manager"} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← ALL BUSINESSES</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-8">
        <h1 className="font-display text-4xl font-bold italic">AutoShine Premium Car Wash</h1>
        <div className="flex gap-3">
          <button onClick={() => setForm({})} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">
            + NEW ENTRY
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="TODAY'S EARNING" value={money(stats.day.earned)} sub={`${plural(stats.day.cars, "vehicle")} today`} />
          <Stat label="THIS MONTH" value={money(stats.month.earned)} sub={plural(stats.month.cars, "vehicle")} />
          <Stat label="AVG PER VEHICLE" value={money(avg)} sub="this month" />
          <Stat label="TO CALL" value={stats.to_call} sub="customers due for a reminder" />
        </div>
      )}

      <div className="mb-6"><CallList data={callData} today={today} onChanged={load} /></div>

      {entries && (
        <div className="mb-8">
          <SharePie rows={entries} today={today} title="EARNING PATTERN" subtitle="Paid amount by type" dateOf={(e) => e.entry_date} keyOf={(e) => e.vehicle_type} amountOf={(e) => e.paid} emptyText="No paid entries in this period." />
        </div>
      )}
      {entries && <div className="mb-8"><DailyBars rows={entries} today={today} dateOf={(e) => e.entry_date} title="VEHICLES PER DAY" unit="vehicles" singular="vehicle" /></div>}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mr-2">{searching ? "SEARCH RESULTS" : "ENTRIES FOR"}</h2>
            {!searching && (
              <>
                <button className={dayBtn} onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">‹</button>
                <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Choose day"
                  className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button className={dayBtn} onClick={() => setDay(shiftDay(day, 1))} disabled={day >= today} aria-label="Next day">›</button>
                {day !== today && <button onClick={() => setDay(today)} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">TODAY</button>}
              </>
            )}
          </div>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all days: name, mobile, vehicle…" aria-label="Search entries"
            className="rounded-full border border-input bg-white px-4 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        {entries && (
          <div className="px-4 py-2 text-sm bg-muted/60 border-b border-border">
            <span className="font-semibold">{plural(rows.length, "vehicle")}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold">{money(dayTotal)}</span> <span className="text-muted-foreground">paid{searching ? "" : ` on ${fmtDate(day)}`}</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {["DATE", "NAME", "MOBILE", "ADDRESS", "MODEL", "VEHICLE NO.", "TYPE", "SERVICE", "DUE ON", "PAID", ""].map((h, i) => (
                  <th key={i} className={`${th} ${h === "PAID" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(r.entry_date)}</td>
                  <td className={`${td} font-semibold`}>{r.name}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.mobile}</td>
                  <td className={`${td} min-w-40`}>{r.address || "—"}</td>
                  <td className={td}>{r.model || "—"}</td>
                  <td className={`${td} whitespace-nowrap font-semibold tracking-wide`}>{r.vehicle_number}</td>
                  <td className={td}><span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider">{r.vehicle_type.toUpperCase()}</span></td>
                  <td className={td}>{r.service || "—"}</td>
                  <td className={`${td} whitespace-nowrap`}><DueCell due={r.due_on} today={today} again={r.due_on < lastDue[r.vehicle_number]} /></td>
                  <td className={`${td} text-right whitespace-nowrap font-bold`}>{money(r.paid)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button onClick={() => setForm(r)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button>
                    {user.role === "admin" && <button onClick={() => remove(r)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>}
                  </td>
                </tr>
              ))}
              {entries && rows.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">{searching ? "No entries match your search." : `No entries on ${fmtDate(day)}.`}</td></tr>
              )}
              {!entries && !error && <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && <CarWashForm entry={form.id ? form : null} services={services} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
