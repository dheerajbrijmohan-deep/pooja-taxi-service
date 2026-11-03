import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { todayIST } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const blank = () => ({ entry_date: todayIST(), name: "", mobile: "", address: "", model: "", vehicle_number: "", vehicle_type: "Car", service: "", paid: "" });

// `entry` set = editing; otherwise a new entry.
export default function CarWashForm({ entry, services = [], onSaved, onClose }) {
  const [f, setF] = useState(entry ? { ...entry, paid: String(entry.paid) } : blank());
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
      const body = { ...f, paid: Number(f.paid || 0) };
      const d = entry
        ? await api(`carwash/entries/${entry.id}`, { method: "PUT", body })
        : await api("carwash/entries", { method: "POST", body });
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
      <form onSubmit={submit} className="w-full max-w-xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">{entry ? "Edit entry" : "New entry"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><L id="cw-date">Date</L><input id="cw-date" type="date" className={field} value={f.entry_date} onChange={set("entry_date")} required /></div>
          <div><L id="cw-name">Name</L><input id="cw-name" ref={first} className={field} value={f.name} onChange={set("name")} required maxLength={100} /></div>
          <div><L id="cw-mobile">Mobile number</L><input id="cw-mobile" type="tel" inputMode="numeric" className={field} value={f.mobile} onChange={set("mobile")} required placeholder="10 digits" /></div>
          <div><L id="cw-veh">Vehicle number</L><input id="cw-veh" className={`${field} uppercase`} value={f.vehicle_number} onChange={set("vehicle_number")} required placeholder="MP09AB1234" maxLength={20} /></div>
          <div><L id="cw-type">Type</L><select id="cw-type" className={field} value={f.vehicle_type} onChange={set("vehicle_type")}><option>Car</option><option>Bike</option><option>Auto</option></select></div>
          <div>
            <L id="cw-service">Service</L>
            <input id="cw-service" list="cw-services" className={field} value={f.service} onChange={set("service")} maxLength={100} placeholder="e.g. Full wash" autoComplete="off" />
            <datalist id="cw-services">{services.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div><L id="cw-model">Model</L><input id="cw-model" className={field} value={f.model} onChange={set("model")} placeholder="Swift Dzire" maxLength={100} /></div>
          <div><L id="cw-addr">Address</L><input id="cw-addr" className={field} value={f.address} onChange={set("address")} maxLength={255} /></div>
          <div><L id="cw-paid">Paid (₹)</L><input id="cw-paid" type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.paid} onChange={set("paid")} /></div>
        </div>
        <p className="text-xs text-muted-foreground">“Due on” is filled in automatically: 15 days after the date.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">
            {busy ? "SAVING…" : "SAVE"}
          </button>
        </div>
      </form>
    </div>
  );
}
