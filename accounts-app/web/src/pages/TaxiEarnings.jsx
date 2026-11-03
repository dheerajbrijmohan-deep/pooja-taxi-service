import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import TaxiLedgerForm from "../components/TaxiLedgerForm.jsx";
import TaxiTripForm from "../components/TaxiTripForm.jsx";
import TaxiDayAllCars from "../components/TaxiDayAllCars.jsx";
import { downloadExcel } from "../lib/exportExcel.js";
import { fmtDate, money, to12, todayIST } from "../lib/format.js";
import { TAXI_SHEET_COLUMNS, display, loadTaxiSheet, totalsFor } from "../lib/reports.js";

const monthLabel = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const shiftMonth = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1 + n, 1)).toISOString().slice(0, 7);
const num = (v) => (v == null ? "" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const dayName = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "short" });
const rs = (v) => (v == null ? "" : (Math.abs(v) < 0.005 ? 0 : Number(v)).toLocaleString("en-IN", { maximumFractionDigits: 2 }));

// One car's sheet. Columns follow the owner's list; each car shows only the cost columns it has (EMI, and Managing & Maintenance for a running day).
// Click a day to change it, click an empty day to add it. Profit is tracked by car number.
// `get` shows a row's value, `tot` (optional) shows the month total; `c` = alignment (l / r / c) and style (b = bold).
const COLS = (car, pctHead) => [
  { h: "Date", get: (r) => fmtDate(r.date, false), c: "l" },
  { h: "Day", get: (r) => dayName(r.date), c: "l" },
  { h: "Out-Time", get: (r) => to12(r.out_time), c: "l" },
  { h: "In-Time", get: (r) => to12(r.in_time), c: "l" },
  { h: "Start Reading", get: (r) => num(r.start_km), c: "r" },
  { h: "End Reading", get: (r) => num(r.end_km), c: "r" },
  { h: "Total Run", get: (r) => num(r.km), tot: (t) => num(t.km), c: "r b" },
  { h: "CNG (kg)", get: (r) => num(r.cng_kg), tot: (t) => num(t.cng_kg), c: "r" },
  { h: "CNG (₹)", get: (r) => rs(r.cng_amount), tot: (t) => rs(t.cng_amount), c: "r" },
  { h: "Petrol (L)", get: (r) => num(r.petrol_ltr), tot: (t) => num(t.petrol_ltr), c: "r" },
  { h: "Petrol (₹)", get: (r) => rs(r.petrol_amount), tot: (t) => rs(t.petrol_amount), c: "r" },
  { h: "Total Earning (₹)", get: (r) => rs(r.total_earning), tot: (t) => rs(t.total_earning), c: "r b" },
  { h: "Payout (₹)", get: (r) => rs(r.payout), tot: (t) => rs(t.payout), c: "r" },
  { h: "Online (₹)", get: (r) => rs(r.online_transfer), tot: (t) => rs(t.online_transfer), c: "r" },
  { h: "Parking (₹)", get: (r) => rs(r.parking || null), tot: (t) => rs(t.parking), c: "r" },
  { h: "Cash to Collect (₹)", get: (r) => rs(r.cash_to_collect), tot: (t) => rs(t.cash_to_collect), c: "r" },
  { h: "Cash Received (₹)", get: (r) => rs(r.cash_received), tot: (t) => rs(t.cash_received), c: "r" },
  { h: "Driver Earning (₹)", get: (r) => rs(r.driver_share), tot: (t) => rs(t.driver_share), c: "r" },
  { h: "Advance Paid (₹)", get: (r) => rs(r.advance_paid), tot: (t) => rs(t.advance_paid), c: "r" },
  ...(car?.maintenance_per_day > 0 ? [{ h: `Maintenance (₹${car.maintenance_per_day} a day)`, get: (r) => rs(r.maintenance || null), tot: (t) => rs(t.maintenance), c: "r" }] : []),
  ...(car?.emi_per_day > 0 ? [{ h: "EMI (₹)", get: (r) => rs(r.emi || null), tot: (t) => rs(t.emi), c: "r" }] : []),
  { h: "Cost (₹)", get: (r) => rs(r.cost), tot: (t) => rs(t.cost), c: "r b" },
  { h: "Profit (₹)", get: (r) => rs(r.gain), tot: (t) => rs(t.gain), c: "r b gain" },
  { h: "Shift", get: (r) => r.shift, c: "l" },
  { h: "Driver Name", get: (r) => r.driver_name, c: "l b" },
  { h: "Remarks", get: (r) => (r.trip_id && !r.on_leave && !r.total_earning ? `in progress${r.status ? " · " + r.status : ""}` : r.status), c: "l wide" },
  { h: "Leave", get: (r) => (r.on_leave ? "1" : ""), tot: (t) => (t.leave_days ? String(t.leave_days) : ""), c: "c" },
  { h: "Damage", get: (r) => r.damage, c: "l wide" },
];

function Stat({ label, value, sub, tone = "" }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl font-bold mt-1 whitespace-nowrap ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export default function TaxiEarnings() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [carId, setCarId] = useState(null);
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [sheet, setSheet] = useState(null);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const [tripForm, setTripForm] = useState(null);
  const [ledgerForm, setLedgerForm] = useState(false);
  const [tick, setTick] = useState(0);        // bumps after every save so the all-cars panel reloads
  const [dl, setDl] = useState({ busy: false, print: null });
  const latest = useRef(0);

  useEffect(() => {
    Promise.all([api("taxi/vehicles"), api("taxi/drivers")]).then(([v, d]) => {
      setVehicles(v.vehicles); setDrivers(d.drivers);
      setCarId((c) => c ?? v.vehicles.find((x) => x.active)?.id ?? v.vehicles[0]?.id ?? null);
    }).catch((e) => setError(e.message));
  }, []);

  const load = useCallback(async () => {
    if (!carId) return;
    const token = ++latest.current;
    try {
      const [s, t] = await Promise.all([api(`taxi/sheet?vehicle_id=${carId}&month=${month}`), api(`taxi/trips?month=${month}`)]);
      if (token !== latest.current) return;
      setSheet(s); setTrips(t.trips); setError("");
    } catch (err) {
      if (token === latest.current) setError(err.message);
    }
  }, [carId, month]);
  useEffect(() => { setSheet(null); load(); }, [load]);

  const today = todayIST();
  const download = async (kind, f) => {
    setDl((d) => ({ ...d, busy: true })); setError("");
    try {
      const rows = await loadTaxiSheet(f);
      if (!rows.length) { setError("There are no entries in that period."); return; }
      const columns = TAXI_SHEET_COLUMNS.filter((c) => c.on);
      const carName = f.car ? `Car ${f.car.slice(-4)}` : "All cars";
      const subtitle = `Pooja Taxi Services · ${fmtDate(f.from)} to ${fmtDate(f.to)} · ${carName}`;
      const fileName = `taxi-earnings-${f.car ? f.car.slice(-4) : "all-cars"}-${f.from}-to-${f.to}`;
      if (kind === "excel") await downloadExcel({ title: "Taxi earnings sheet", subtitle, columns, rows, fileName, generatedBy: user.name });
      else {
        setDl({ busy: true, print: { columns, rows, subtitle } });
        const prev = document.title; document.title = fileName;
        const done = () => { document.title = prev; window.removeEventListener("afterprint", done); setDl({ busy: false, print: null }); };
        window.addEventListener("afterprint", done);
        setTimeout(() => window.print(), 150);
        return;
      }
    } catch (err) {
      setError(err.message);
    }
    setDl((d) => ({ ...d, busy: false }));
  };
  const car = vehicles.find((v) => v.id === carId);
  const openRow = (r) => {
    if (r.trip_id) setTripForm({ trip: trips.find((t) => t.id === r.trip_id) });
    else if (r.date <= today) setTripForm({ preset: { trip_date: r.date, vehicle_id: carId, driver_id: car?.driver_id ?? undefined } });
  };
  const saved = () => { setTick((n) => n + 1); load(); };
  const del = async (r) => {
    if (!window.confirm(`Delete the entry for ${r.driver_name} on ${fmtDate(r.date)}?`)) return;
    try { await api(`taxi/trips/${r.trip_id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };

  const dayBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
  const t = sheet?.totals, since = sheet?.since_start;
  const cell = (cls) => `px-2.5 py-2 text-center ${cls.includes("b") ? "font-semibold" : ""} ${cls.includes("wide") ? "min-w-56 max-w-xs whitespace-normal break-words" : "whitespace-nowrap"}`;
  const pctHead = sheet?.rows.find((r) => r.share_pct != null)?.share_pct;
  const cols = COLS(sheet?.vehicle, pctHead != null ? Number(pctHead) : undefined);

  return (
    <>
    <div className="max-w-full print:hidden">
      <Link to="/business/taxi" className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← POOJA TAXI SERVICES</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-5">
        <h1 className="font-display text-4xl font-bold italic">Earnings by car</h1>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setLedgerForm(true)} disabled={!drivers.some((d) => d.active)} className="px-5 py-2.5 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50">+ ADVANCE / DAMAGE</button>
          <button onClick={() => setTripForm({ preset: { vehicle_id: carId, driver_id: car?.driver_id ?? undefined } })} disabled={!carId} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">+ NEW ENTRY</button>
        </div>
      </div>

      <TaxiDayAllCars tick={tick} onOpen={(f) => (!isAdmin && f.trip ? setError("Only the admin can edit an entry.") : setTripForm(f))} onDownload={download} busy={dl.busy} />

      <div className="flex flex-wrap items-center gap-2 mb-4" role="tablist" aria-label="Cars">
        {vehicles.filter((v) => v.active || v.id === carId).map((v) => (
          <button key={v.id} role="tab" aria-selected={v.id === carId} onClick={() => setCarId(v.id)}
            className={`px-5 py-2.5 rounded-full font-bold text-sm tracking-wider border ${v.id === carId ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {v.code.slice(-4)}{v.model ? ` · ${v.model}` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button className={dayBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Choose month" className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <button className={dayBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today.slice(0, 7)} aria-label="Next month">›</button>
        <span className="font-display text-xl font-bold italic ml-2">{monthLabel(month)}</span>
        {sheet && <span className="text-sm text-muted-foreground ml-3">{sheet.vehicle.code} · {sheet.vehicle.driver_name ? `driver: ${sheet.vehicle.driver_name}` : "no driver assigned (set it under Setup)"}</span>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label={`${sheet.vehicle.code.slice(-4)} · EARNING`} value={money(t.total_earning)} sub={`${Math.round(t.km).toLocaleString("en-IN")} km this month`} />
          <Stat label="COST" value={money(t.cost)} sub={sheet.vehicle.cost_mode === "fuel_share" ? "CNG + petrol + driver earning" : "driver earning, fuel, other expenses, managing & maintenance"} />
          <Stat label="PROFIT THIS MONTH" value={money(t.gain)} tone={t.gain < 0 ? "text-destructive" : ""} sub="payout − cost" />
          <Stat label="PROFIT SINCE FIRST ENTRY" value={money(since.gain)} tone={since.gain < 0 ? "text-destructive" : ""} sub={since.first_date ? `from ${fmtDate(since.first_date)}` : "no entries yet"} />
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-muted">
              <tr>
                {cols.map((c) => <th key={c.h} className={`text-[11px] font-semibold tracking-widest text-muted-foreground px-2.5 py-3 whitespace-nowrap text-center`}>{c.h.toUpperCase()}</th>)}
                {isAdmin && <th className="sticky right-0 bg-muted px-2.5 py-3 text-[11px] font-semibold tracking-widest text-muted-foreground text-center shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.15)]">ACTION</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(sheet?.rows ?? []).map((r, ri) => {
                const future = r.date > today && !r.trip_id;
                return (
                  <tr key={`${r.date}-${ri}`} className={`${future ? "opacity-40" : ""} ${r.on_leave ? "bg-amber-100 text-amber-900" : ""}`}>
                    {cols.map((c) => <td key={c.h} className={`${cell(c.c)} ${c.c.includes("gain") && r.gain < 0 ? "text-destructive" : ""}`}>{c.get(r)}</td>)}
                    {isAdmin && <td className={`sticky right-0 ${r.on_leave ? "bg-amber-100" : "bg-card"} px-3 py-2 whitespace-nowrap text-center shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.15)]`} onClick={(e) => e.stopPropagation()}>
                      {r.trip_id && <button onClick={() => openRow(r)} className="text-xs font-bold tracking-wider text-primary hover:underline">EDIT</button>}
                      {!r.trip_id && !future && <button onClick={() => openRow(r)} className="text-xs font-bold tracking-wider text-primary hover:underline">ADD</button>}
                      {isAdmin && r.trip_id && <button onClick={() => del(r)} className="ml-3 text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>}
                    </td>}
                  </tr>
                );
              })}
              {!sheet && !error && <tr><td colSpan={cols.length + 1} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
            {t && (
              <tfoot className="bg-muted font-bold">
                <tr>
                  {cols.map((c, ci) => <td key={c.h} className={`px-2.5 py-3 whitespace-nowrap text-center ${c.c.includes("gain") && t.gain < 0 ? "text-destructive" : ""}`}>{ci === 0 ? "TOTAL" : c.tot ? c.tot(t) : ""}</td>)}
                  {isAdmin && <td className="sticky right-0 bg-muted" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        <b>Cash to Collect</b> = Payout − Online − Parking. <b>Cash Received</b> is the same amount. <b>Driver Earning</b> = {sheet?.vehicle.cost_mode === "fuel_share" ? "30%" : "the driver's share"} of Total Earning.{" "}
        {sheet?.vehicle.cost_mode === "fuel_share" ? <><b>Cost</b> = CNG ₹ + Petrol ₹ + Driver Earning. </> : <><b>Cost</b> = driver earning + CNG ₹ + petrol ₹ + other expenses + the car's fixed daily charges. </>}
        <b>Profit</b> = Payout − Cost. Advances are deducted when the driver's salary slip is made.
      </p>

      {tripForm && <TaxiTripForm trip={tripForm.trip ?? null} preset={tripForm.preset} drivers={drivers} vehicles={vehicles} last={null} onClose={() => setTripForm(null)}
        onSaved={(saved) => { setTripForm(null); setTick((n) => n + 1); if (saved.vehicle_id && saved.vehicle_id !== carId) setCarId(saved.vehicle_id); if (saved.trip_date.slice(0, 7) !== month) setMonth(saved.trip_date.slice(0, 7)); else load(); }} />}
      {ledgerForm && <TaxiLedgerForm entry={null} drivers={drivers} vehicles={vehicles} isAdmin={isAdmin} onClose={() => setLedgerForm(false)} onSaved={() => { setLedgerForm(false); saved(); }} />}
    </div>

    {dl.print && (
      <article className="hidden print:block text-[#1a1a1a]" style={{ fontSize: dl.print.columns.length > 14 ? "7px" : "9px" }}>
        <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } }`}</style>
        <header className="text-center border-b-2 border-[#C87412] pb-3 mb-4">
          <div className="text-xl font-bold tracking-widest text-[#C87412]">THE POOJA GROUP</div>
          <div className="text-lg font-bold mt-1">Taxi earnings sheet</div>
          <div className="mt-1 text-[#6B6B6B]">{dl.print.subtitle}</div>
        </header>
        <table className="w-full border-collapse">
          <thead style={{ display: "table-header-group" }}>
            <tr>{dl.print.columns.map((c) => <th key={c.key} className={`border border-[#d8cdb8] bg-[#C87412] text-white px-1 py-1 ${c.type === "money" || c.type === "number" ? "text-right" : "text-left"}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {dl.print.rows.map((r, i) => <tr key={i} className="break-inside-avoid" style={{ background: i % 2 ? "#f7f1e6" : "transparent" }}>{dl.print.columns.map((c) => <td key={c.key} className={`border border-[#d8cdb8] px-1 py-0.5 align-top ${c.type === "money" || c.type === "number" ? "text-right" : ""}`}>{display(c, r[c.key])}</td>)}</tr>)}
          </tbody>
          <tfoot>
            <tr className="font-bold">{dl.print.columns.map((c, i) => <td key={c.key} className={`border border-[#d8cdb8] border-t-2 border-t-[#1a1a1a] px-1 py-1 ${c.type === "money" || c.type === "number" ? "text-right" : ""}`}>{i === 0 ? `TOTAL (${dl.print.rows.length})` : c.sum ? display(c, totalsFor(dl.print.columns, dl.print.rows)[c.key]) : ""}</td>)}</tr>
          </tfoot>
        </table>
        <footer className="mt-3 text-[#6B6B6B]">Generated on {fmtDate(todayIST())} by {user.name}</footer>
      </article>
    )}
    </>
  );
}
