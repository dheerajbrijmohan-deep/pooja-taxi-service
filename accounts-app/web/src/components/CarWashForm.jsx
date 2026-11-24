import { WASH_SERVICES, PAYMENT_MODES, fmtVehicle } from "../lib/carwash.js";
import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { todayIST, fmtDate, money } from "../lib/format.js";
import ConfirmSave from "./ConfirmSave.jsx";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const blank = () => ({ entry_date: todayIST(), name: "", mobile: "", address: "", model: "", vehicle_number: "", vehicle_type: "Car", service: "", paid: "", payment_mode: "" });

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

  const { user } = useAuth();
  const locks = user.role !== "admin" && f.payment_mode !== ""; // a manager's save is final once payment is recorded
  const [confirming, setConfirming] = useState(false); // the "are you sure?" step
  const submit = (e) => {
    e.preventDefault();
    setError("");
    setConfirming(true);
  };

  const summary = [
    ["Date", fmtDate(f.entry_date)],
    ["Customer", f.name || "—"],
    ["Mobile", f.mobile || "—"],
    ["Vehicle", [f.vehicle_number, f.model, f.vehicle_type].filter(Boolean).join(" · ") || "—"],
    ["Service", f.service || "—"],
    ["Payment", f.payment_mode ? `${f.payment_mode} · ${money(Number(f.paid || 0))}` : "Not paid yet"],
  ];

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, paid: Number(f.paid || 0) };
      const d = entry
        ? await api(`carwash/entries/${entry.id}`, { method: "PUT", body })
        : await api("carwash/entries", { method: "POST", body });
      onSaved(d.entry);
    } catch (err) {
      setConfirming(false);
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
          <div><L id="cw-name">Name</L><input id="cw-name" ref={first} className={field} value={f.name} onChange={set("name")} maxLength={100} /></div>
          <div><L id="cw-mobile">Mobile number</L><input id="cw-mobile" type="tel" inputMode="numeric" className={field} value={f.mobile} onChange={set("mobile")} placeholder="10 digits" /></div>
          <div><L id="cw-veh">Vehicle number</L><input id="cw-veh" className={`${field} uppercase`} value={f.vehicle_number} onChange={(e) => setF((p) => {
            let v = fmtVehicle(e.target.value);
            // backspace over a hyphen or space would be put straight back: remove the character before it instead
            if (e.target.value.length < p.vehicle_number.length && v === p.vehicle_number) v = fmtVehicle(v.replace(/[^A-Z0-9]/g, "").slice(0, -1));
            return { ...p, vehicle_number: v };
          })} placeholder="MH-31 FM-7700" maxLength={20} /></div>
          <div><L id="cw-type">Type</L><select id="cw-type" className={field} value={f.vehicle_type} onChange={set("vehicle_type")}><option>Car</option><option>Bike</option><option>Auto</option></select></div>
          <div>
            <L id="cw-service">Service</L>
            <select id="cw-service" className={field} value={f.service} onChange={set("service")}>
              <option value="">Select…</option>
              {[...WASH_SERVICES, ...(f.service && !WASH_SERVICES.includes(f.service) ? [f.service] : [])].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><L id="cw-model">Model</L><input id="cw-model" className={field} value={f.model} onChange={set("model")} placeholder="Swift Dzire" maxLength={100} /></div>
          <div><L id="cw-addr">Address</L><input id="cw-addr" className={field} value={f.address} onChange={set("address")} maxLength={255} /></div>
          <div><L id="cw-paid">Paid (₹)</L><input id="cw-paid" type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.paid} onChange={set("paid")} /></div>
          <div><L id="cw-mode">Payment mode</L><select id="cw-mode" className={field} value={f.payment_mode ?? ""} onChange={set("payment_mode")}><option value="">Not paid yet</option>{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
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
      {confirming && <ConfirmSave rows={summary} locks={locks} busy={busy} onConfirm={save} onCancel={() => setConfirming(false)} />}
    </div>
  );
}
