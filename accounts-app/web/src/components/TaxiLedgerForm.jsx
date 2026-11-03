import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { todayIST } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

// Advance given to a driver, damage deducted from him, or salary paid out. Salary paid is the owner's entry.
export default function TaxiLedgerForm({ entry, drivers, vehicles, isAdmin, onSaved, onClose }) {
  const [f, setF] = useState(entry
    ? { ...entry, driver_id: String(entry.driver_id), vehicle_id: entry.vehicle_id == null ? "" : String(entry.vehicle_id), amount: String(entry.amount) }
    : { entry_date: todayIST(), driver_id: String(drivers[0]?.id ?? ""), kind: "Advance", amount: "", vehicle_id: "", note: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
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
      const body = { ...f, amount: Number(f.amount) };
      const d = entry ? await api(`taxi/ledger/${entry.id}`, { method: "PUT", body }) : await api("taxi/ledger", { method: "POST", body });
      onSaved(d.entry);
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
        <h2 className="font-display text-2xl font-bold italic">{entry ? "Edit entry" : "Advance / damage / salary"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><L id="tl-date">Date</L><input id="tl-date" ref={first} type="date" className={field} value={f.entry_date} max={todayIST()} onChange={set("entry_date")} required /></div>
          <div>
            <L id="tl-kind">Type</L>
            <select id="tl-kind" className={field} value={f.kind} onChange={set("kind")}>
              <option>Advance</option><option>Damage</option>{isAdmin && <option>Salary paid</option>}
            </select>
          </div>
          <div>
            <L id="tl-driver">Driver</L>
            <select id="tl-driver" className={field} value={f.driver_id} onChange={set("driver_id")} required>
              {drivers.filter((d) => d.active || String(d.id) === f.driver_id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><L id="tl-amount">Amount ₹</L><input id="tl-amount" type="number" min="1" step="0.01" inputMode="decimal" className={field} value={f.amount} onChange={set("amount")} required /></div>
          {f.kind === "Damage" && (
            <div className="sm:col-span-2">
              <L id="tl-vehicle">Vehicle damaged</L>
              <select id="tl-vehicle" className={field} value={f.vehicle_id} onChange={set("vehicle_id")}>
                <option value="">—</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.code.slice(-4)}{v.model ? ` · ${v.model}` : ""}</option>)}
              </select>
            </div>
          )}
          <div className="sm:col-span-2"><L id="tl-note">Note</L><input id="tl-note" className={field} value={f.note} onChange={set("note")} maxLength={300}
            placeholder={f.kind === "Damage" ? "e.g. back right door" : f.kind === "Salary paid" ? "e.g. salary paid till 29 Sep" : "e.g. mobile recharge"} /></div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
        </div>
      </form>
    </div>
  );
}
