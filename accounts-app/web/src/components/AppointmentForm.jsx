import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { WASH_SERVICES, fmtVehicle } from "../lib/carwash.js";
import { ACTIVE, SLOTS, slotLabel, slotOver } from "../lib/appointments.js";
import { fmtDate, todayIST } from "../lib/format.js";
import ConfirmSave from "./ConfirmSave.jsx";

const field = "w-full rounded-md border border-input bg-white px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

// Book (or change) an appointment. `appointment` = editing; `initial` = values to start a new one with (date, slot, or a customer from the call list).
export default function AppointmentForm({ appointment, initial = {}, onSaved, onClose }) {
  const [f, setF] = useState(() => appointment
    ? { appt_date: appointment.appt_date, slot_hour: appointment.slot_hour, name: appointment.name, mobile: appointment.mobile, vehicle_number: appointment.vehicle_number, vehicle_type: appointment.vehicle_type, model: appointment.model, service: appointment.service, notes: appointment.notes }
    : { appt_date: todayIST(), slot_hour: "", name: "", mobile: "", vehicle_number: "", vehicle_type: "Car", model: "", service: "", notes: "", ...initial });
  const [taken, setTaken] = useState({}); // slot hour -> true for the chosen date
  const [nowHour, setNowHour] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // which slots are already taken on the chosen day
  useEffect(() => {
    if (!f.appt_date) return;
    let live = true;
    api(`carwash/appointments?from=${f.appt_date}&to=${f.appt_date}`).then((d) => {
      if (!live) return;
      const t = {};
      d.appointments.forEach((a) => { if (ACTIVE.includes(a.status) && a.id !== appointment?.id) t[a.slot_hour] = a; });
      setTaken(t);
      setNowHour(d.now_hour);
      setF((p) => (p.slot_hour !== "" && t[p.slot_hour] ? { ...p, slot_hour: "" } : p));
    }).catch(() => {});
    return () => { live = false; };
  }, [f.appt_date, appointment?.id]);

  const today = todayIST();
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const over = (h) => f.appt_date === today && slotOver(h, nowHour);

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (f.slot_hour === "") return setError("Choose a time slot");
    setConfirming(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, slot_hour: Number(f.slot_hour) };
      const d = appointment
        ? await api(`carwash/appointments/${appointment.id}`, { method: "PUT", body })
        : await api("carwash/appointments", { method: "POST", body });
      onSaved(d.appointment);
    } catch (err) {
      setConfirming(false);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;
  const summary = [
    ["Date", fmtDate(f.appt_date)], ["Time", f.slot_hour === "" ? "—" : slotLabel(Number(f.slot_hour))], ["Customer", f.name || "—"], ["Mobile", f.mobile || "—"],
    ["Vehicle", [f.vehicle_number, f.model, f.vehicle_type].filter(Boolean).join(" · ") || "—"], ["Service", f.service || "—"],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-3 sm:p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-xl bg-card rounded-2xl p-5 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">{appointment ? "Change appointment" : "Book appointment"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><L id="ap-date">Date</L><input id="ap-date" type="date" min={today} className={field} value={f.appt_date} onChange={set("appt_date")} required /></div>
          <div>
            <L id="ap-slot">Time slot (2 hours)</L>
            <select id="ap-slot" className={field} value={f.slot_hour} onChange={set("slot_hour")} required>
              <option value="">Select…</option>
              {SLOTS.map((h) => {
                const t = taken[h];
                return <option key={h} value={h} disabled={!!t || over(h)}>{slotLabel(h)}{t ? ` — booked${t.vehicle_number ? " (" + t.vehicle_number + ")" : ""}` : over(h) ? " — over" : ""}</option>;
              })}
            </select>
          </div>
          <div><L id="ap-name">Name</L><input id="ap-name" ref={first} className={field} value={f.name} onChange={set("name")} maxLength={100} /></div>
          <div><L id="ap-mobile">Mobile number</L><input id="ap-mobile" type="tel" inputMode="numeric" className={field} value={f.mobile} onChange={set("mobile")} placeholder="10 digits" /></div>
          <div><L id="ap-veh">Vehicle number</L><input id="ap-veh" className={`${field} uppercase`} value={f.vehicle_number} placeholder="MH-31 FM-7700" maxLength={20} onChange={(e) => setF((p) => {
            let v = fmtVehicle(e.target.value);
            if (e.target.value.length < p.vehicle_number.length && v === p.vehicle_number) v = fmtVehicle(v.replace(/[^A-Z0-9]/g, "").slice(0, -1));
            return { ...p, vehicle_number: v };
          })} /></div>
          <div><L id="ap-type">Type</L><select id="ap-type" className={field} value={f.vehicle_type} onChange={set("vehicle_type")}><option>Car</option><option>Bike</option><option>Auto</option></select></div>
          <div><L id="ap-model">Model</L><input id="ap-model" className={field} value={f.model} onChange={set("model")} maxLength={100} placeholder="Swift Dzire" /></div>
          <div><L id="ap-service">Service</L><select id="ap-service" className={field} value={f.service} onChange={set("service")}><option value="">Select…</option>{WASH_SERVICES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="sm:col-span-2"><L id="ap-notes">Note</L><input id="ap-notes" className={field} value={f.notes} onChange={set("notes")} maxLength={300} placeholder="Anything to remember about this visit" /></div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : appointment ? "SAVE CHANGES" : "BOOK"}</button>
        </div>
      </form>
      {confirming && <ConfirmSave rows={summary} locks={false} busy={busy} onConfirm={save} onCancel={() => setConfirming(false)} />}
    </div>
  );
}
