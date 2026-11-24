import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import CallList from "../components/CallList.jsx";
import DailyBars from "../components/DailyBars.jsx";
import DueCell from "../components/DueCell.jsx";
import CarWashForm from "../components/CarWashForm.jsx";
import SharePie from "../components/SharePie.jsx";
import { earned } from "../lib/carwash.js";
import ConfirmSave from "../components/ConfirmSave.jsx";
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
  const [passes, setPasses] = useState([]);
  const [callData, setCallData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null | {} (new) | entry (edit)
  const [q, setQ] = useState("");
  const [day, setDay] = useState(todayIST());
  const [creditOpen, setCreditOpen] = useState(false);
  const [settle, setSettle] = useState(null); // { entry, mode } while recording that a credit was received
  const [settling, setSettling] = useState(false);
  const [view, setView] = useState("day"); // day | month | all
  const [month, setMonth] = useState(todayIST().slice(0, 7));

  const load = useCallback(async () => {
    try {
      const [e, s, c, m] = await Promise.all([api("carwash/entries"), api("carwash/stats"), api("carwash/call-list"), api("carwash/memberships")]);
      setEntries(e.entries);
      setPasses(m.memberships);
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
      const tc = t.replace(/[\s-]/g, ""); // "mh31" also finds MH-31 FM-7700
      return entries.filter((r) => [r.name, r.mobile, r.vehicle_number, r.vehicle_type, r.service, r.model, r.address, r.payment_mode].some((v) => v.toLowerCase().includes(t)) || (tc && r.vehicle_number.toLowerCase().replace(/[\s-]/g, "").includes(tc)));
    }
    if (view === "all") return entries;
    if (view === "month") return entries.filter((r) => r.entry_date.startsWith(month));
    return entries.filter((r) => r.entry_date === day);
  }, [entries, q, searching, day, view, month]);

  const dayTotal = rows.reduce((a, r) => a + earned(r), 0);
  const creditTotal = rows.reduce((a, r) => a + (r.payment_mode === "Credit" ? r.paid : 0), 0);
  const periodLabel = searching ? "" : view === "all" ? " in all entries" : view === "month" ? ` in ${new Date(month + "-01T00:00:00Z").toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}` : ` on ${fmtDate(day)}`;

  const remove = async (r) => {
    if (!window.confirm(`Delete the entry for ${r.name} (${r.vehicle_number})?`)) return;
    try {
      await api(`carwash/entries/${r.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const passCredit = passes.filter((m) => m.payment_mode === "Credit" && m.status !== "Cancelled")
    .map((m) => ({ id: `p${m.id}`, pass_id: m.id, entry_date: m.sold_on, name: m.name, mobile: m.mobile, vehicle_number: m.vehicle_number, service: `${m.plan} pass`, paid: m.amount, payment_mode: "Credit" }));
  const creditRows = [...(entries ?? []).filter((r) => r.payment_mode === "Credit"), ...passCredit].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  // pass sales are income on the day they are sold: shown in the earning pies
  const passRows = passes.filter((m) => m.status !== "Cancelled").map((m) => ({ entry_date: m.sold_on, vehicle_type: "Car", service: "Membership pass", payment_mode: m.payment_mode, paid: m.amount }));
  const lastOfMonth = (m) => { const [y, mo] = m.split("-").map(Number); return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`; };
  const [rFrom, rTo] = view === "all" ? ["2020-01-01", today] : view === "month" ? [`${month}-01`, lastOfMonth(month)] : [day, day];
  const th = "text-left text-[10px] font-semibold tracking-wider text-muted-foreground px-2.5 py-3 whitespace-nowrap";
  const td = "px-2.5 py-2.5 align-top text-[13px]";
  const dayBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";

  return (
    <div className="max-w-full">
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
          <button type="button" onClick={() => setCreditOpen(true)} className="text-left rounded-2xl hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Show who owes the credit">
            <Stat label="CREDIT (NOT RECEIVED)" value={money(stats.all.credit)} sub="all time · click to see who owes" />
          </button>
          <Stat label="TO CALL" value={stats.to_call} sub="customers due for a reminder" />
        </div>
      )}

      <div id="entries" className="mb-8 bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mr-2">{searching ? "SEARCH RESULTS" : "ENTRIES FOR"}</h2>
            {!searching && (
              <div className="inline-flex rounded-full border border-border overflow-hidden mr-2">
                {[["day", "DAY"], ["month", "MONTH"], ["all", "ALL"]].map(([k, l]) => (
                  <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-xs font-bold tracking-wider ${view === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
                ))}
              </div>
            )}
            {!searching && view === "month" && (
              <input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Choose month"
                className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
            )}
            {!searching && view === "day" && (
              <>
                <button className={dayBtn} onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">‹</button>
                <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Choose day"
                  className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button className={dayBtn} onClick={() => setDay(shiftDay(day, 1))} disabled={day >= today} aria-label="Next day">›</button>
                {day !== today && <button onClick={() => setDay(today)} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">TODAY</button>}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
          {user.role === "admin" && <Link to={`reports?report=entries&from=${rFrom}&to=${rTo}`} className="whitespace-nowrap px-4 py-2 rounded-full border border-primary text-primary font-bold text-xs tracking-wider hover:bg-primary hover:text-primary-foreground">GENERATE REPORT</Link>}
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all days: name, mobile, vehicle…" aria-label="Search entries"
            className="rounded-full border border-input bg-white px-4 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          </div>
        </div>
        {entries && (
          <div className="px-4 py-2 text-sm bg-muted/60 border-b border-border">
            <span className="font-semibold">{plural(rows.length, "vehicle")}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold">{money(dayTotal)}</span> <span className="text-muted-foreground">earned{periodLabel}</span>
            {creditTotal > 0 && <span className="text-muted-foreground"> · <span className="font-semibold text-foreground">{money(creditTotal)}</span> on credit (not counted)</span>}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 1000 }}>
            <thead className="bg-muted">
              <tr>
                {["DATE", "NAME", "MOBILE", "ADDRESS", "MODEL", "VEHICLE", "TYPE", "SERVICE", "DUE", "MODE", "PAID", ""].map((h, i) => (
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
                  <td className={`${td} min-w-28`}>{r.address || "—"}</td>
                  <td className={td}>{r.model || "—"}</td>
                  <td className={`${td} whitespace-nowrap font-semibold tracking-wide`}>{r.vehicle_number}</td>
                  <td className={td}><span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider">{r.vehicle_type.toUpperCase()}</span></td>
                  <td className={td}>{r.service || "—"}</td>
                  <td className={`${td} whitespace-nowrap`}><DueCell due={r.due_on} today={today} again={r.due_on < lastDue[r.vehicle_number]} /></td>
                  <td className={td}>{r.payment_mode === "Credit" ? <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-bold tracking-wider">CREDIT</span> : r.payment_mode || "—"}</td>
                  <td className={`${td} text-right whitespace-nowrap font-bold ${r.payment_mode === "Credit" ? "text-muted-foreground italic" : ""}`}>{money(r.paid)}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    {user.role === "admin" || !r.payment_mode
                      ? <button onClick={() => setForm(r)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button>
                      : <span className="text-xs font-bold tracking-wider text-muted-foreground mr-3" title="Payment recorded: only the owner can change this">🔒 LOCKED</span>}
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

      {entries && (
        <div className="mb-8 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <SharePie rows={[...entries, ...passRows]} today={today} title="EARNING PATTERN" subtitle="By vehicle type" dateOf={(e) => e.entry_date} keyOf={(e) => e.vehicle_type} amountOf={earned} emptyText="No paid entries in this period." />
          <SharePie rows={[...entries, ...passRows]} today={today} title="EARNING BY SERVICE" subtitle="Full Wash, Top Wash, Interior and more" dateOf={(e) => e.entry_date} keyOf={(e) => e.service || "Not specified"} amountOf={earned} emptyText="No paid entries in this period." />
        </div>
      )}
      {entries && <div className="mb-8"><DailyBars rows={entries} today={today} dateOf={(e) => e.entry_date} title="VEHICLES PER DAY" unit="vehicles" singular="vehicle" /></div>}

      <div className="mb-8"><CallList data={callData} today={today} onChanged={load} /></div>

      {creditOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && setCreditOpen(false)}>
          <div className="w-full max-w-3xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold italic">Credit — money due</h2>
                <p className="text-sm text-muted-foreground">{creditRows.length} {creditRows.length === 1 ? "entry" : "entries"} · total due <span className="font-bold text-foreground">{money(creditRows.reduce((a, r) => a + r.paid, 0))}</span></p>
              </div>
              <button onClick={() => setCreditOpen(false)} className="px-4 py-2 rounded-full border border-border font-bold text-xs tracking-wider hover:bg-muted">CLOSE</button>
            </div>
            {creditRows.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No credit is due. 🎉</p> : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>{["DATE", "NAME", "MOBILE", "VEHICLE", "SERVICE", "DUE (₹)", ""].map((h, i) => <th key={i} className={`${th} ${h.startsWith("DUE") ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {creditRows.map((r) => (
                      <tr key={r.id}>
                        <td className={`${td} whitespace-nowrap`}>{fmtDate(r.entry_date)}</td>
                        <td className={`${td} font-semibold`}>{r.name || "—"}</td>
                        <td className={`${td} whitespace-nowrap`}>{r.mobile || "—"}</td>
                        <td className={`${td} whitespace-nowrap`}>{r.vehicle_number || r.model || "—"}</td>
                        <td className={td}>{r.service || "—"}</td>
                        <td className={`${td} text-right font-bold whitespace-nowrap`}>{money(r.paid)}</td>
                        <td className={`${td} text-right whitespace-nowrap`}><button onClick={() => setSettle({ entry: r, mode: "Cash" })} className="text-xs font-bold tracking-wider text-primary hover:underline">RECEIVED</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {creditRows.length > 0 && <p className="text-xs text-muted-foreground mt-3">When the money comes in, click RECEIVED and choose Online or Cash.{user.role !== "admin" && " The entry then locks."}</p>}
          </div>
        </div>
      )}

      {settle && !settling && (
        <div className="fixed inset-0 z-[55] bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && setSettle(null)}>
          <div className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-card border border-border">
            <h2 className="font-display text-xl font-bold italic mb-1">Credit received</h2>
            <p className="text-sm text-muted-foreground mb-4">{settle.entry.name || settle.entry.vehicle_number || "Customer"} · {money(settle.entry.paid)}. How was it paid?</p>
            <div className="flex gap-2 mb-5">
              {["Cash", "Online"].map((m) => (
                <button key={m} onClick={() => setSettle({ ...settle, mode: m, asking: false })} className={`flex-1 py-2.5 rounded-full border font-bold text-sm tracking-wider ${settle.mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{m.toUpperCase()}</button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSettle(null)} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
              <button onClick={() => setSettle({ ...settle, asking: true })} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">CONTINUE</button>
            </div>
          </div>
        </div>
      )}
      {settle?.asking && (
        <ConfirmSave
          rows={[["Customer", settle.entry.name || "—"], ["Vehicle", settle.entry.vehicle_number || "—"], ["Amount received", money(settle.entry.paid)], ["Paid by", settle.mode]]}
          locks={user.role !== "admin"} busy={settling} onCancel={() => setSettle({ ...settle, asking: false })}
          onConfirm={async () => {
            setSettling(true);
            try {
              if (settle.entry.pass_id) await api(`carwash/memberships/${settle.entry.pass_id}/received`, { method: "POST", body: { payment_mode: settle.mode } });
              else await api(`carwash/entries/${settle.entry.id}`, { method: "PUT", body: { ...settle.entry, payment_mode: settle.mode } });
              setSettle(null);
              load();
            } catch (err) {
              setError(err.message);
              setSettle(null);
            } finally {
              setSettling(false);
            }
          }}
        />
      )}

      {form && <CarWashForm entry={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
