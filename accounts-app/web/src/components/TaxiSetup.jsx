import { useEffect, useState } from "react";
import { api } from "../api.js";

const field = "rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const btn = "text-xs font-bold tracking-wider text-primary hover:underline";

// a car row keeps its own unsaved edits; it lives outside TaxiSetup so typing elsewhere in the dialog does not rebuild it
function VRow({ v, drivers, run }) {
  const [f, setF] = useState({ ...v, emi_per_day: String(v.emi_per_day), run_day_charge: String(v.run_day_charge ?? 0), maintenance_per_day: String(v.maintenance_per_day ?? 0), driver_id: v.driver_id == null ? "" : String(v.driver_id) });
  const dirty = f.code !== v.code || f.model !== v.model || Number(f.emi_per_day) !== v.emi_per_day || Number(f.run_day_charge) !== (v.run_day_charge ?? 0) || Number(f.maintenance_per_day) !== (v.maintenance_per_day ?? 0) || f.active !== v.active || f.driver_id !== (v.driver_id == null ? "" : String(v.driver_id));
  return (
    <tr>
      <td className="px-2 py-1.5"><input aria-label="Vehicle number" className={`${field} w-36`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></td>
      <td className="px-2 py-1.5"><input aria-label="Model" className={`${field} w-32`} value={f.model} placeholder="Dzire / Amaze" onChange={(e) => setF({ ...f, model: e.target.value })} /></td>
      <td className="px-2 py-1.5"><input aria-label="EMI per day" type="number" min="0" className={`${field} w-24`} value={f.emi_per_day} onChange={(e) => setF({ ...f, emi_per_day: e.target.value })} /></td>
      <td className="px-2 py-1.5"><input aria-label="Managing and maintenance per running day" type="number" min="0" className={`${field} w-24`} value={f.run_day_charge} onChange={(e) => setF({ ...f, run_day_charge: e.target.value })} /></td>
      <td className="px-2 py-1.5"><input aria-label="Maintenance per day" type="number" min="0" className={`${field} w-24`} value={f.maintenance_per_day} onChange={(e) => setF({ ...f, maintenance_per_day: e.target.value })} /></td>
        <td className="px-2 py-1.5"><select aria-label="Driver of this car" className={`${field} w-40`} value={f.driver_id} onChange={(e) => setF({ ...f, driver_id: e.target.value })}><option value="">— none —</option>{drivers.filter((d) => d.active || String(d.id) === f.driver_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
      <td className="px-2 py-1.5"><input aria-label="Active" type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /></td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        <button disabled={!dirty} className={`${btn} mr-3 disabled:opacity-40 disabled:no-underline`} onClick={() => run(() => api(`taxi/vehicles/${v.id}`, { method: "PUT", body: { ...f, emi_per_day: Number(f.emi_per_day) || 0, run_day_charge: Number(f.run_day_charge) || 0, maintenance_per_day: Number(f.maintenance_per_day) || 0 } }))}>SAVE</button>
        <button className="text-xs font-bold tracking-wider text-destructive hover:underline" onClick={() => window.confirm(`Delete vehicle ${v.code}?`) && run(() => api(`taxi/vehicles/${v.id}`, { method: "DELETE" }))}>DELETE</button>
      </td>
    </tr>
  );
}

// Owner-only: the cars (number, model, EMI per day) and the drivers (name, mobile, share of earning).
export default function TaxiSetup({ vehicles, drivers, onChanged, onClose }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nv, setNv] = useState({ code: "", model: "", emi_per_day: "", run_day_charge: "", maintenance_per_day: "", driver_id: "" });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn) => {
    setError(""); setNotice("");
    try { await fn(); onChanged(); } catch (err) { setError(err.message); }
  };
  const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-2 py-2";
  const btn = "text-xs font-bold tracking-wider text-primary hover:underline";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-6">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold italic">Vehicles &amp; drivers</h2><button onClick={onClose} className="px-5 py-2 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">DONE</button></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-primary font-semibold">{notice}</p>}
        <section>
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">VEHICLES</h3>
          <div className="overflow-x-auto"><table className="text-sm">
            <thead><tr>{["CAR NUMBER", "MODEL", "EMI / DAY ₹", "MANAGING & MAINT. ₹ / RUNNING DAY", "MAINTENANCE ₹ / DAY", "DRIVER", "ACTIVE", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {vehicles.map((v) => <VRow key={v.id + v.code + v.model + v.emi_per_day + v.run_day_charge + v.maintenance_per_day + v.active + String(v.driver_id)} v={v} drivers={drivers} run={run} />)}
              <tr>
                <td className="px-2 py-1.5"><input aria-label="New vehicle number" className={`${field} w-36`} placeholder="MH31GD…" value={nv.code} onChange={(e) => setNv({ ...nv, code: e.target.value })} /></td>
                <td className="px-2 py-1.5"><input aria-label="New vehicle model" className={`${field} w-32`} placeholder="Dzire / Amaze" value={nv.model} onChange={(e) => setNv({ ...nv, model: e.target.value })} /></td>
                <td className="px-2 py-1.5"><input aria-label="New vehicle EMI" type="number" min="0" className={`${field} w-24`} value={nv.emi_per_day} onChange={(e) => setNv({ ...nv, emi_per_day: e.target.value })} /></td>
                <td className="px-2 py-1.5"><input aria-label="New car managing and maintenance" type="number" min="0" className={`${field} w-24`} value={nv.run_day_charge} onChange={(e) => setNv({ ...nv, run_day_charge: e.target.value })} /></td>
                <td className="px-2 py-1.5"><input aria-label="New car maintenance" type="number" min="0" className={`${field} w-24`} value={nv.maintenance_per_day} onChange={(e) => setNv({ ...nv, maintenance_per_day: e.target.value })} /></td>
                <td className="px-2 py-1.5"><select aria-label="New car driver" className={`${field} w-40`} value={nv.driver_id} onChange={(e) => setNv({ ...nv, driver_id: e.target.value })}><option value="">— none —</option>{drivers.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
                <td />
                <td className="px-2 py-1.5"><button className={btn} onClick={() => run(async () => { await api("taxi/vehicles", { method: "POST", body: { ...nv, emi_per_day: Number(nv.emi_per_day) || 0, run_day_charge: Number(nv.run_day_charge) || 0, maintenance_per_day: Number(nv.maintenance_per_day) || 0 } }); setNv({ code: "", model: "", emi_per_day: "", run_day_charge: "", maintenance_per_day: "", driver_id: "" }); })}>+ ADD</button></td>
              </tr>
            </tbody>
          </table></div>
        </section>
        <p className="text-xs text-muted-foreground">Each car has its own rules: <b>EMI per day</b> is charged every day; <b>managing &amp; maintenance</b> is charged only on days the car runs; <b>maintenance</b> is a separate charge taken every day, like the EMI. Leave a box at 0 if the car does not have it.</p>
        <p className="text-sm text-muted-foreground">Drivers, with their personal details and documents, are added and removed on the <b>Drivers</b> tab. Here you only choose which driver drives which car.</p>
      </div>
    </div>
  );
}
