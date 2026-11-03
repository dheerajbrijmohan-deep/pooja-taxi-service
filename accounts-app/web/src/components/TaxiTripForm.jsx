import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import OtherExpenses, { itemsFromRows, rowsFromTrip, totalOf } from "./OtherExpenses.jsx";
import TimeInput from "./TimeInput.jsx";
import { money, todayIST } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const NUM = ["start_km", "end_km", "cng_kg", "cng_amount", "petrol_ltr", "petrol_amount", "total_earning", "payout", "online_transfer", "parking", "advance"];

const blank = (drivers, vehicles, last) => ({
  trip_date: todayIST(), driver_id: String(last?.driver_id ?? drivers[0]?.id ?? ""), vehicle_id: String(last?.vehicle_id ?? vehicles[0]?.id ?? ""),
  shift: "Day", in_time: "", out_time: "", start_km: last?.end_km != null ? String(last.end_km) : "", end_km: "", cng_kg: "", cng_amount: "", petrol_ltr: "", petrol_amount: "",
  total_earning: "", payout: "", online_transfer: "", parking: "", advance: "", on_leave: false, notes: "",
});

// Manager's daily entry for a driver. Share, cash to collect and gain are shown live but worked out by the server.
export default function TaxiTripForm({ trip, drivers, vehicles, last, preset, onSaved, onClose }) {
  const [f, setF] = useState(() => {
    if (!trip) {
      const b = blank(drivers, vehicles, last);
      if (!preset) return b;
      const car = vehicles.find((v) => String(v.id) === String(preset.vehicle_id));
      return { ...b, ...(preset.trip_date ? { trip_date: preset.trip_date } : {}), vehicle_id: String(preset.vehicle_id ?? b.vehicle_id), driver_id: String(preset.driver_id ?? car?.driver_id ?? b.driver_id), start_km: preset.start_km != null ? String(preset.start_km) : b.start_km };
    }
    const o = { ...trip, driver_id: String(trip.driver_id), vehicle_id: trip.vehicle_id == null ? "" : String(trip.vehicle_id) };
    NUM.forEach((k) => { o[k] = trip[k] == null || trip[k] === 0 ? "" : String(trip[k]); });
    return o;
  });
  const initialAdvance = trip?.advance ? String(trip.advance) : "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [others, setOthers] = useState(() => rowsFromTrip(trip)); // the day's other expenses (parking, puncture…)
  const [unfinished, setUnfinished] = useState({ out: false, in: false }); // a time typed only in part (e.g. no AM/PM yet)
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  // choosing a car on a new entry picks the driver assigned to that car
  const setCar = (e) => { const id = e.target.value; const car = vehicles.find((v) => String(v.id) === id); setF((p) => ({ ...p, vehicle_id: id, ...(!trip && car?.driver_id ? { driver_id: String(car.driver_id) } : {}) })); };
  const n = (k) => Number(f[k]) || 0;
  const driver = drivers.find((d) => String(d.id) === f.driver_id);
  const pct = trip && String(trip.driver_id) === f.driver_id ? trip.share_pct : driver?.share_pct ?? 30;
  const share = (n("total_earning") * pct) / 100;
  const cash = Math.max(0, n("payout") - (n("online_transfer") + n("parking"))); // cash to collect = payout - online - parking
  const car = vehicles.find((v) => String(v.id) === f.vehicle_id);
  const gain = n("payout") - n("cng_amount") - n("petrol_amount") - share - totalOf(others); // only what has been entered: nothing is taken off automatically here
  const km = f.start_km !== "" && f.end_km !== "" ? n("end_km") - n("start_km") : null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.on_leave && (unfinished.out || unfinished.in)) { setError("Finish the time (hour, minutes and AM/PM), or clear it, before saving."); return; }
    setBusy(true);
    try {
      const body = { ...f, other_items: itemsFromRows(others) };
      NUM.forEach((k) => { body[k] = f[k] === "" ? (k === "start_km" || k === "end_km" ? null : 0) : Number(f[k]); });
      if (f.advance === initialAdvance) delete body.advance; // untouched: leave the ledger as it is
      const d = trip ? await api(`taxi/trips/${trip.id}`, { method: "PUT", body }) : await api("taxi/trips", { method: "POST", body });
      onSaved(d.trip);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;
  // a plain function (not a component): a component created inside this form would be rebuilt on every keystroke and the cursor would be lost after each digit
  const num = (k, label, { step = "0.01", hint } = {}) => (
    <div key={k}><L id={`tt-${k}`}>{label}</L><input id={`tt-${k}`} type="number" min="0" step={step} inputMode="decimal" className={field} value={f[k]} onChange={set(k)} />{hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}</div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-3xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">{trip ? "Edit daily entry" : "New daily entry"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div><L id="tt-date">Date</L><input id="tt-date" ref={first} type="date" className={field} value={f.trip_date} max={todayIST()} onChange={set("trip_date")} required /></div>
          <div>
            <L id="tt-driver">Driver</L>
            <select id="tt-driver" className={field} value={f.driver_id} onChange={set("driver_id")} required>
              {drivers.filter((d) => d.active || String(d.id) === f.driver_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <L id="tt-vehicle">Vehicle</L>
            <select id="tt-vehicle" className={field} value={f.vehicle_id} onChange={setCar}>
              <option value="">—</option>
              {vehicles.filter((v) => v.active || String(v.id) === f.vehicle_id).map((v) => <option key={v.id} value={v.id}>{v.code.slice(-4)}{v.model ? ` · ${v.model}` : ""}</option>)}
            </select>
          </div>
          <div>
            <L id="tt-shift">Shift</L>
            <select id="tt-shift" className={field} value={f.shift} onChange={set("shift")}>{["Day", "Night", "Mid Night"].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={f.on_leave} onChange={(e) => setF((p) => ({ ...p, on_leave: e.target.checked }))} className="w-4 h-4" /> Leave / did not run (no earning for the day)
        </label>

        {f.on_leave && <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{num("advance", "Advance paid ₹", { hint: "given to the driver today; taken off the salary slip" })}</div>}

        {!f.on_leave && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><L id="tt-out">Out-Time</L><TimeInput id="tt-out" className={field} value={f.out_time} onChange={(v) => setF((p) => ({ ...p, out_time: v }))} onPartial={(x) => setUnfinished((u) => (u.out === x ? u : { ...u, out: x }))} /><p className="text-xs text-muted-foreground mt-1">car leaves</p></div>
              <div><L id="tt-in">In-Time</L><TimeInput id="tt-in" className={field} value={f.in_time} onChange={(v) => setF((p) => ({ ...p, in_time: v }))} onPartial={(x) => setUnfinished((u) => (u.in === x ? u : { ...u, in: x }))} /><p className="text-xs text-muted-foreground mt-1">car comes back</p></div>
              {num("start_km", "Start reading", { step: "0.1" })}
              {num("end_km", "End reading", { step: "0.1", hint: km != null ? (km < 0 ? "Less than start" : `${km} km run`) : "" })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {num("cng_kg", "CNG (kg)")}{num("cng_amount", "CNG ₹")}
              {num("petrol_ltr", "Petrol (litres)")}{num("petrol_amount", "Petrol ₹")}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {num("total_earning", "Total earning ₹")}
              {num("payout", "Payout ₹", { hint: "what we receive (online + cash)" })}
              {num("online_transfer", "Online transfer ₹", { hint: "PhonePe by the driver" })}
              {num("parking", "Parking ₹", { hint: "paid by the driver from the cash" })}
              {num("advance", "Advance paid ₹", { hint: "given to the driver today; taken off the salary slip" })}
            </div>
            <OtherExpenses rows={others} setRows={setOthers} />
            <div className="rounded-xl bg-muted/70 border border-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">DRIVER {pct}%</div><div className="font-bold">{money(share)}</div></div>
              <div><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">CASH TO COLLECT</div><div className="font-bold">{money(cash)}</div></div>
              <div><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">PROFIT</div><div className={`font-bold ${gain < 0 ? "text-destructive" : ""}`}>{money(gain)}</div></div>
              <div><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">CASH RECEIVED</div><div className="font-bold">{money(cash)}</div></div>
            </div>
          </>
        )}
        <div><L id="tt-notes">Notes</L><input id="tt-notes" className={field} value={f.notes} onChange={set("notes")} maxLength={500} placeholder="e.g. tyre puncture, airport parking" /></div>
        <p className="text-xs text-muted-foreground">You can save at any point and come back to add the rest (open the day on the sheet). An advance entered here reaches the driver’s balance and is taken off the salary slip. Damages are entered separately with “+ ADVANCE / DAMAGE”.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
        </div>
      </form>
    </div>
  );
}
