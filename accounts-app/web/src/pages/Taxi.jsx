import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import DueList from "../components/DueList.jsx";
import TaxiLedgerForm from "../components/TaxiLedgerForm.jsx";
import TaxiSetup from "../components/TaxiSetup.jsx";
import TaxiTripForm from "../components/TaxiTripForm.jsx";
import { fmtDate, money, todayIST } from "../lib/format.js";

const monthLabel = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const shiftMonth = (m, n) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const last4 = (code) => code.slice(-4);
const niceMax = (n) => { if (n <= 4) return 4; const p = 10 ** Math.floor(Math.log10(n)); return [1, 2, 2.5, 5, 10].find((x) => x * p >= n) * p; };

function Stat({ label, value, sub, tone = "" }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl font-bold mt-1 whitespace-nowrap ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function EarningBars({ daily, today }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...daily.map((d) => d.earning), 1));
  const W = 960, H = 220, padL = 52, padB = 26, padT = 14;
  const plotW = W - padL - 6, plotH = H - padB - padT, bw = plotW / daily.length;
  const total = daily.reduce((a, d) => a + d.earning, 0);
  const shown = hover != null ? daily[hover] : null;
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-6">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">DAILY EARNING</h2>
      <p className="font-semibold mt-1 mb-3" aria-live="polite">{shown ? `${fmtDate(shown.date)} · ${money(shown.earning)}` : `${money(total)} this month`}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily earning bars" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => {
          const y = padT + plotH * (1 - t);
          return <g key={t}><line x1={padL} x2={W} y1={y} y2={y} stroke="currentColor" opacity="0.1" /><text x={padL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.6">{money(max * t)}</text></g>;
        })}
        {daily.map((d, i) => {
          const h = (d.earning / max) * plotH;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * bw} y={padT} width={bw} height={plotH} fill="transparent" />
              <rect x={padL + i * bw + 2} y={padT + plotH - h} width={Math.max(bw - 4, 1)} height={h} rx="2" className={d.date > today ? "fill-muted" : "fill-primary"} opacity={hover == null || hover === i ? 1 : 0.5} />
              {(i === 0 || (i + 1) % 5 === 0) && <text x={padL + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">{+d.date.slice(8)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Taxi() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [sum, setSum] = useState(null);
  const [trips, setTrips] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState("");
  const [tripForm, setTripForm] = useState(null);
  const [ledgerForm, setLedgerForm] = useState(null);
  const [setup, setSetup] = useState(false);
  const [due, setDue] = useState([]);
  const [filter, setFilter] = useState(""); // driver id or ""
  const latest = useRef(0);

  const load = useCallback(async () => {
    const token = ++latest.current;
    try {
      const [s, t, l, v, d, du] = await Promise.all([api(`taxi/summary?month=${month}`), api(`taxi/trips?month=${month}`), api(`taxi/ledger?month=${month}`), api("taxi/vehicles"), api("taxi/drivers"), api("taxi/due")]);
      if (token !== latest.current) return;
      setSum(s); setTrips(t.trips); setLedger(l.ledger); setVehicles(v.vehicles); setDrivers(d.drivers); setDue(du.items); setError("");
    } catch (err) {
      if (token === latest.current) setError(err.message);
    }
  }, [month]);
  useEffect(() => { setSum(null); load(); }, [load]);

  const today = sum?.today ?? todayIST();
  const vName = (id) => { const v = vehicles.find((x) => x.id === id); return v ? last4(v.code) : "—"; };
  const dName = (id) => drivers.find((x) => x.id === id)?.name ?? "—";
  const activeDrivers = drivers.filter((d) => d.active);
  const activeVehicles = vehicles.filter((v) => v.active);
  const rows = (trips ?? []).filter((t) => !filter || String(t.driver_id) === filter);
  const ledgerRows = (ledger ?? []).filter((l) => !filter || String(l.driver_id) === filter);

  const delTrip = async (t) => {
    if (!window.confirm(`Delete the entry for ${dName(t.driver_id)} on ${fmtDate(t.trip_date)}?`)) return;
    try { await api(`taxi/trips/${t.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };
  const delLedger = async (l) => {
    if (!window.confirm(`Delete this ${l.kind.toLowerCase()} of ${money(l.amount)} for ${dName(l.driver_id)}?`)) return;
    try { await api(`taxi/ledger/${l.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };

  const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-2.5 py-3 whitespace-nowrap";
  const td = "px-2.5 py-3 align-top";
  const R = "text-right whitespace-nowrap";
  const dayBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
  const pill = "px-5 py-2.5 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors";
  const t = sum?.totals;
  const lastTrip = trips?.find((x) => !x.on_leave);

  return (
    <div className="max-w-6xl">
      <Link to={isAdmin ? "/admin" : "/manager"} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← ALL BUSINESSES</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-6">
        <h1 className="font-display text-4xl font-bold italic">Pooja Taxi Services</h1>
        <div className="flex flex-wrap gap-3">
          {isAdmin && <button onClick={() => setSetup(true)} className={pill}>SETUP</button>}
          <button onClick={() => setLedgerForm({})} disabled={!activeDrivers.length} className={`${pill} disabled:opacity-50`}>+ ADVANCE / DAMAGE</button>
          <button onClick={() => setTripForm({})} disabled={!activeDrivers.length} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">+ DAILY ENTRY</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button className={dayBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <input type="month" value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Choose month"
          className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <button className={dayBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= todayIST().slice(0, 7)} aria-label="Next month">›</button>
        <span className="font-display text-xl font-bold italic ml-2">{monthLabel(month)}</span>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      {due.length > 0 && (
        <div className="bg-card rounded-2xl shadow-card border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-1"><h2 className="text-xs font-semibold tracking-widest text-muted-foreground">VEHICLE REMINDERS · {due.filter((i) => i.status === "overdue").length} OVERDUE, {due.filter((i) => i.status === "soon").length} DUE SOON</h2><Link to="/business/taxi/vehicles" className="text-xs font-bold tracking-wider text-primary hover:underline">ALL VEHICLES →</Link></div>
          <DueList items={due.slice(0, 6)} />
          {due.length > 6 && <p className="text-xs text-muted-foreground mt-2">and {due.length - 6} more under Vehicles.</p>}
        </div>
      )}

      {t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Stat label="TOTAL EARNING" value={money(t.earning)} sub={`${t.days} driver-day${t.days === 1 ? "" : "s"} · ${Math.round(t.km).toLocaleString("en-IN")} km`} />
            <Stat label="NET GAIN" value={money(t.gain)} tone={t.gain < 0 ? "text-destructive" : ""} />
            <Stat label="DRIVER SHARE" value={money(t.share)} sub="earned by drivers this month" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="FUEL" value={money(t.fuel)} sub="CNG + petrol" />
            <Stat label="OTHER EXPENSES" value={money(t.supplies)} sub="parking, puncture…" />
          </div>

          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-3">VEHICLES</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {sum.vehicles.filter((v) => v.active || v.earning > 0).map((v) => (
              <div key={v.id} className="bg-card rounded-2xl shadow-card border border-border p-5">
                <div className="flex items-baseline justify-between"><Link to={`/business/taxi/vehicles/${v.id}`} className="font-display text-2xl font-bold hover:text-primary">{last4(v.code)}</Link><div className="text-xs text-muted-foreground">{v.model || "model not set"}</div></div>
                <div className="text-xs text-muted-foreground mb-3">{v.code} · {v.days_run} day{v.days_run === 1 ? "" : "s"} run · {Math.round(v.km).toLocaleString("en-IN")} km{v.per_km ? ` · ₹${v.per_km}/km` : ""}</div>
                <dl className="text-sm grid grid-cols-[1fr_auto] gap-y-1">
                  <dt>Earning</dt><dd className="font-bold text-right">{money(v.earning)}</dd>
                  <dt className="text-muted-foreground">Fuel</dt><dd className="text-right">− {money(v.fuel)}</dd>
                  <dt className="text-muted-foreground">Driver share</dt><dd className="text-right">− {money(v.share)}</dd>
                  <dt className="text-muted-foreground">Other expenses</dt><dd className="text-right">− {money(v.supplies)}</dd>
                  {v.maintenance_per_day > 0 && <><dt className="text-muted-foreground">Maintenance ({money(v.maintenance_per_day)} a day)</dt><dd className="text-right">− {money(v.maintenance)}</dd></>}
                  {v.run_day_charge > 0 && <><dt className="text-muted-foreground">Managing &amp; maintenance ({money(v.run_day_charge)} × {v.days_run > 0 ? Math.round(v.charge / v.run_day_charge) : 0} days)</dt><dd className="text-right">− {money(v.charge)}</dd></>}
                  <dt className="font-semibold border-t border-border pt-1">Gain</dt><dd className={`font-bold text-right border-t border-border pt-1 ${v.gain < 0 ? "text-destructive" : ""}`}>{money(v.gain)}</dd>
                </dl>
              </div>
            ))}
          </div>

          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-3">DRIVERS</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {sum.drivers.filter((d) => d.active || d.earning > 0 || d.balance !== 0).map((d) => (
              <div key={d.id} className="bg-card rounded-2xl shadow-card border border-border p-5">
                <div className="flex items-baseline justify-between"><div className="font-display text-2xl font-bold">{d.name}</div><div className="text-xs text-muted-foreground">{d.share_pct}% of earning</div></div>
                <div className="text-xs text-muted-foreground mb-3">{d.days_worked} day{d.days_worked === 1 ? "" : "s"} worked{d.leave_days ? ` · ${d.leave_days} leave` : ""} this month</div>
                <dl className="text-sm grid grid-cols-[1fr_auto] gap-y-1">
                  <dt>Earned (his share)</dt><dd className="font-bold text-right">{money(d.share)}</dd>
                  <dt className="text-muted-foreground">Advances</dt><dd className="text-right">− {money(d.advances)}</dd>
                  <dt className="text-muted-foreground">Damages</dt><dd className="text-right">− {money(d.damages)}</dd>
                  <dt className="text-muted-foreground">Salary paid</dt><dd className="text-right">− {money(d.paid)}</dd>
                </dl>
                <div className="mt-3 pt-3 border-t border-border flex items-baseline justify-between">
                  <span className="text-xs font-semibold tracking-widest text-muted-foreground">BALANCE DUE (ALL TIME)</span>
                  <span className={`font-display text-2xl font-bold ${d.balance < 0 ? "text-destructive" : ""}`}>{money(d.balance)}</span>
                </div>
              </div>
            ))}
            {!sum.drivers.length && <p className="text-sm text-muted-foreground">No drivers yet.{isAdmin ? " Add them under Setup." : " Ask the owner to add them."}</p>}
          </div>

          <div className="mb-8"><EarningBars daily={sum.daily} today={today} /></div>
        </>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">DAILY ENTRIES · {monthLabel(month).toUpperCase()}</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by driver" className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold">
            <option value="">All drivers</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {["DATE", "DRIVER", "KM", "FUEL", "EARNING", "PAYOUT", "ONLINE", "CASH", "DRIVER SHARE", "GAIN", "NOTES", ""].map((h, i) => (
                  <th key={i} className={`${th} ${i >= 2 && i <= 9 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(r.trip_date, false)}<div className="text-xs text-muted-foreground">{r.on_leave ? <span className="font-bold tracking-wider">LEAVE</span> : r.shift}</div></td>
                  <td className={`${td} font-semibold whitespace-nowrap`}>{dName(r.driver_id)}<div className="text-xs font-normal text-muted-foreground">{r.vehicle_id ? `Car ${vName(r.vehicle_id)}` : ""}</div></td>
                  <td className={`${td} ${R}`}>{r.on_leave ? "" : r.km || "—"}</td>
                  <td className={`${td} ${R}`}>{r.on_leave ? "" : money(r.fuel)}</td>
                  <td className={`${td} ${R} font-bold`}>{r.on_leave ? "" : money(r.total_earning)}</td>
                  <td className={`${td} ${R}`}>{r.on_leave ? "" : money(r.payout)}</td>
                  <td className={`${td} ${R}`}>{r.on_leave ? "" : money(r.online_transfer)}</td>
                  <td className={`${td} ${R}`}>{r.on_leave ? "" : money(r.cash_to_collect)}</td>
                  <td className={`${td} ${R}`}>{r.on_leave ? "" : money(r.driver_share)}</td>
                  <td className={`${td} ${R} font-semibold ${r.gain < 0 ? "text-destructive" : ""}`}>{r.on_leave ? "" : money(r.gain)}</td>
                  <td className={`${td} min-w-40`}>{r.notes || ""}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button onClick={() => setTripForm(r)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button>
                    {isAdmin && <button onClick={() => delTrip(r)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>}
                  </td>
                </tr>
              ))}
              {trips && rows.length === 0 && <tr><td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">No entries in {monthLabel(month)}.</td></tr>}
              {!trips && !error && <tr><td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h2 className="text-xs font-semibold tracking-widest text-muted-foreground">ADVANCES, DAMAGES &amp; SALARY PAID · {monthLabel(month).toUpperCase()}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["DATE", "DRIVER", "TYPE", "AMOUNT", "VEHICLE", "NOTE", ""].map((h, i) => <th key={i} className={`${th} ${h === "AMOUNT" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {ledgerRows.map((l) => (
                <tr key={l.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(l.entry_date, false)}</td>
                  <td className={`${td} font-semibold`}>{dName(l.driver_id)}</td>
                  <td className={td}><span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider">{l.kind.toUpperCase()}</span></td>
                  <td className={`${td} ${R} font-bold`}>{money(l.amount)}</td>
                  <td className={td}>{l.vehicle_id ? vName(l.vehicle_id) : ""}</td>
                  <td className={`${td} min-w-40`}>{l.note}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    {isAdmin && <><button onClick={() => setLedgerForm(l)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">EDIT</button><button onClick={() => delLedger(l)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button></>}
                  </td>
                </tr>
              ))}
              {ledger && ledgerRows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nothing recorded in {monthLabel(month)}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {tripForm && <TaxiTripForm trip={tripForm.id ? tripForm : null} drivers={drivers} vehicles={vehicles} last={lastTrip} onClose={() => setTripForm(null)} onSaved={(saved) => { setTripForm(null); if (saved.trip_date.slice(0, 7) !== month) setMonth(saved.trip_date.slice(0, 7)); else load(); }} />}
      {ledgerForm && <TaxiLedgerForm entry={ledgerForm.id ? ledgerForm : null} drivers={drivers} vehicles={vehicles} isAdmin={isAdmin} onClose={() => setLedgerForm(null)} onSaved={(saved) => { setLedgerForm(null); if (saved.entry_date.slice(0, 7) !== month) setMonth(saved.entry_date.slice(0, 7)); else load(); }} />}
      {setup && <TaxiSetup vehicles={vehicles} drivers={drivers} onChanged={load} onClose={() => setSetup(false)} />}
    </div>
  );
}
