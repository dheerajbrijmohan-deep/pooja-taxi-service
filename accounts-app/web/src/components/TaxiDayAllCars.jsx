import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { fmtDate, money, to12, todayIST } from "../lib/format.js";

const shiftDay = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8) + n)).toISOString().slice(0, 10);
const num = (v) => (v == null ? "" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const rs = (v) => (v == null || v === 0 ? "" : money(v));
const fld = "rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40";

// [heading, value, alignment, key used for the day's total]
const COLS = [
  ["Out-Time", (r) => to12(r.out_time), "l"], ["In-Time", (r) => to12(r.in_time), "l"],
  ["Start", (r) => num(r.start_km), "r"], ["End", (r) => num(r.end_km), "r"], ["Total Run", (r) => num(r.km), "r b", "km"],
  ["CNG ₹", (r) => rs(r.cng_amount), "r", "cng_amount"], ["Petrol ₹", (r) => rs(r.petrol_amount), "r", "petrol_amount"],
  ["Total Earning", (r) => rs(r.total_earning), "r b", "total_earning"], ["Payout", (r) => rs(r.payout), "r", "payout"], ["Online", (r) => rs(r.online_transfer), "r", "online_transfer"],
  ["Cash to Collect", (r) => rs(r.cash_to_collect), "r", "cash_to_collect"], ["Cash Received", (r) => rs(r.cash_received), "r", "cash_received"],
  ["Driver Earning", (r) => rs(r.driver_share), "r", "driver_share"], ["Other Exp.", (r) => rs(r.supplies), "r", "supplies"],
  ["Managing & Maint.", (r) => rs(r.run_charge), "r", "run_charge"], ["Maintenance", (r) => rs(r.maintenance), "r", "maintenance"], ["EMI", (r) => rs(r.emi), "r", "emi"],
  ["Cost", (r) => rs(r.cost), "r b", "cost"], ["Gain", (r) => (r.cost || r.trip_id ? money(r.gain) : ""), "r b gain", "gain"],
];

// All cars on one day, at the top of the Earnings page: a line per car (a second line if two drivers ran it), so nothing is missed.
// Pick any day; click a line to open or add that car's entry. Below it: download earlier data as Excel or PDF.
export default function TaxiDayAllCars({ tick, onOpen, onDownload, busy }) {
  const { user } = useAuth();
  const today = todayIST();
  const [day, setDay] = useState(today);
  const [data, setData] = useState(null);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [car, setCar] = useState("");
  const [cars, setCars] = useState([]);
  const latest = useRef(0);

  useEffect(() => { api("taxi/vehicles").then((d) => setCars(d.vehicles)).catch(() => {}); }, []);
  const load = useCallback(async () => {
    const token = ++latest.current;
    try {
      const [d, t] = await Promise.all([api(`taxi/day?date=${day}`), api(`taxi/trips?from=${day}&to=${day}`)]);
      if (token === latest.current) { setData(d); setTrips(t.trips); setError(""); }
    } catch (err) {
      if (token === latest.current) setError(err.message);
    }
  }, [day]);
  useEffect(() => { setData(null); load(); }, [load, tick]);

  const lines = (data?.cars ?? []).flatMap((c) => c.rows.map((r) => ({ r, c: c.vehicle })));
  const sum = (key) => lines.reduce((a, { r }) => a + (Number(r[key]) || 0), 0);
  const open = ({ r, c }) => {
    if (r.trip_id) onOpen({ trip: trips.find((t) => t.id === r.trip_id) });
    else if (day <= today) onOpen({ preset: { trip_date: day, vehicle_id: c.id, driver_id: c.driver_id ?? undefined } });
  };
  const dayBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
  const cell = (c) => `px-2.5 py-2.5 whitespace-nowrap ${c.includes("r") ? "text-right" : "text-left"} ${c.includes("b") ? "font-semibold" : ""}`;
  const btn = "px-4 py-2 rounded-full border border-primary text-primary font-bold text-xs tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50";

  return (
    <section className="bg-card rounded-2xl shadow-card border border-border mb-8 overflow-hidden" aria-label="All cars on one day">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mr-2">ALL CARS ON</h2>
          <button className={dayBtn} onClick={() => setDay(shiftDay(day, -1))} aria-label="Previous day">‹</button>
          <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Choose day" className={fld} />
          <button className={dayBtn} onClick={() => setDay(shiftDay(day, 1))} disabled={day >= today} aria-label="Next day">›</button>
          {day !== today && <button onClick={() => setDay(today)} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">TODAY</button>}
          <span className="font-display text-lg font-bold italic ml-2">{new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8))).toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        <span className="text-xs text-muted-foreground">Use EDIT or ADD on a line to open or add that car's entry</span>
      </div>
      {error && <p role="alert" className="text-sm text-destructive px-4 py-3">{error}</p>}
      <div className="overflow-x-auto">
        <table className="text-sm min-w-full">
          <thead className="bg-muted">
            <tr>
              {["CAR", "DRIVER", ...COLS.map((c) => c[0]), "STATUS"].map((h, i) => <th key={h} className={`text-[11px] font-semibold tracking-widest text-muted-foreground px-2.5 py-3 whitespace-nowrap ${i >= 4 && i < COLS.length + 2 ? "text-right" : "text-left"}`}>{h.toUpperCase()}</th>)}
              <th className="text-[11px] font-semibold tracking-widest text-muted-foreground px-2.5 py-3 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map(({ r, c }, i) => {
              const none = !r.trip_id;
              return (
                <tr key={`${c.id}-${r.trip_id ?? "x"}-${i}`} className={`${none && day > today ? "opacity-50" : ""} ${r.on_leave ? "bg-muted/40" : ""}`}>
                  <td className="px-2.5 py-2.5 whitespace-nowrap font-display text-lg font-bold">{c.code.slice(-4)}<span className="ml-2 text-xs font-sans font-normal text-muted-foreground">{c.model}</span></td>
                  <td className="px-2.5 py-2.5 whitespace-nowrap font-semibold">{none ? <span className="text-muted-foreground font-normal">{c.driver_name || "—"}</span> : r.driver_name}</td>
                  {COLS.map(([h, get, cls]) => <td key={h} className={`${cell(cls)} ${cls.includes("gain") && r.gain < 0 ? "text-destructive" : ""}`}>{none && !["Cost", "Gain", "EMI", "Maintenance", "Managing & Maint."].includes(h) ? "" : get(r)}</td>)}
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-muted-foreground">{none ? "No entry yet" : r.on_leave ? "Leave" : !r.total_earning ? "in progress" : r.status}</td>
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-center">
                    {!none && user.role === "admin" && <button onClick={() => open({ r, c })} className="text-xs font-bold tracking-wider text-primary hover:underline">EDIT</button>}
                    {none && day <= today && <button onClick={() => open({ r, c })} className="text-xs font-bold tracking-wider text-primary hover:underline">ADD</button>}
                  </td>
                </tr>
              );
            })}
            {!data && !error && <tr><td colSpan={COLS.length + 3} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
          </tbody>
          {data && (
            <tfoot className="bg-muted font-bold">
              <tr>
                <td className="px-2.5 py-3">ALL CARS</td><td />
                {COLS.map(([h, , cls, key]) => <td key={h} className={`px-2.5 py-3 whitespace-nowrap ${cls.includes("r") ? "text-right" : ""} ${key === "gain" && sum("gain") < 0 ? "text-destructive" : ""}`}>{key ? (key === "km" ? num(sum(key)) : rs(sum(key)) || (key === "gain" ? money(0) : "")) : ""}</td>)}
                <td /><td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4 border-t border-border bg-muted/40">
        <div className="text-xs font-semibold tracking-widest text-muted-foreground mr-1 pb-2">DOWNLOAD HISTORY</div>
        <label className="text-xs font-semibold">From<br /><input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={fld} aria-label="History from" /></label>
        <label className="text-xs font-semibold">To<br /><input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className={fld} aria-label="History to" /></label>
        <label className="text-xs font-semibold">Car<br />
          <select value={car} onChange={(e) => setCar(e.target.value)} className={fld} aria-label="History car">
            <option value="">All cars</option>{cars.filter((v) => v.active).map((v) => <option key={v.id} value={v.code}>{v.code.slice(-4)}{v.model ? ` · ${v.model}` : ""}</option>)}
          </select>
        </label>
        <button onClick={() => onDownload("excel", { from, to, car })} disabled={busy || from > to} className={btn}>{busy ? "PREPARING…" : "EXCEL"}</button>
        <button onClick={() => onDownload("pdf", { from, to, car })} disabled={busy || from > to} className={btn}>PDF</button>
        {user.role === "admin" &&         <a href={`/business/taxi/reports?report=taxi-sheet&from=${from}&to=${to}${car ? `&car=${car}` : ""}`} className="text-xs font-bold tracking-wider text-primary hover:underline pb-2 ml-1">MORE OPTIONS (CHOOSE COLUMNS) →</a>}
      </div>
    </section>
  );
}
