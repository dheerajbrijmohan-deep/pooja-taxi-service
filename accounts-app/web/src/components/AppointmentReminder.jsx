import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { slotLabel } from "../lib/appointments.js";
import { todayIST } from "../lib/format.js";
import AppointmentForm from "./AppointmentForm.jsx";

// Stays at the top of every page from the start of the day until each of today's appointments has been dealt with:
//  - a booked appointment that is not yet confirmed with the customer: CONFIRMED, POSTPONE or CANCEL
//  - a confirmed one from 15 minutes before its slot: ARRIVED, NO-SHOW or POSTPONE
// It disappears by itself once the status changes (or the appointment is moved to another day). A short beep sounds when a
// reminder first appears and again when its slot is 15 minutes away. Checked every minute and after any change.
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
  } catch { /* sound is optional */ }
}
const seen = (key) => { try { if (sessionStorage.getItem(key)) return true; sessionStorage.setItem(key, "1"); } catch { /* ignore */ } return false; };

const btn = "px-3 py-1.5 rounded-full border font-bold text-[11px] tracking-wider";

export default function AppointmentReminder() {
  const [items, setItems] = useState([]);
  const [soon, setSoon] = useState({}); // id -> within 15 minutes of the slot
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const check = useCallback(async () => {
    try {
      const day = todayIST();
      const d = await api(`carwash/appointments?from=${day}&to=${day}`);
      const mins = d.now_hour * 60 + d.now_minute;
      const near = {};
      const list = d.appointments.filter((a) => {
        const isSoon = mins >= a.slot_hour * 60 - 15;
        near[a.id] = isSoon;
        return a.status === "Booked" || (a.status === "Confirmed" && isSoon);
      });
      let ring = false;
      list.forEach((a) => {
        if (!seen(`appt-beep-${a.id}-${a.status}`)) ring = true; // first time this reminder is shown in this status
        if (near[a.id] && !seen(`appt-beep-${a.id}-soon`)) ring = true;
      });
      if (ring) beep();
      setSoon(near);
      setItems(list);
    } catch { /* signed out or offline: try again next minute */ }
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(() => !document.hidden && check(), 60000);
    window.addEventListener("appointments-changed", check);
    return () => { clearInterval(t); window.removeEventListener("appointments-changed", check); };
  }, [check]);

  const act = async (a, what, ask) => {
    if (ask && !window.confirm(`${ask}\n${a.name || ""} ${a.vehicle_number}`)) return;
    setBusy(a.id); setError("");
    try {
      await api(`carwash/appointments/${a.id}/${what}`, { method: "POST" });
      window.dispatchEvent(new Event("appointments-changed"));
    } catch (err) { setError(err.message); } finally { setBusy(null); }
  };

  if (!items.length && !form) return null;
  return (
    <div className="print:hidden mb-6 rounded-2xl border-2 border-primary bg-card shadow-card overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold tracking-widest">⏰ TODAY'S APPOINTMENTS NEED YOU ({items.length})</span>
        <Link to="/business/carwash/appointments" className="text-xs font-bold tracking-wider underline">OPEN APPOINTMENTS ›</Link>
      </div>
      {error && <p role="alert" className="text-sm text-destructive px-4 pt-2">{error}</p>}
      <ul className="divide-y divide-border">
        {items.map((a) => (
          <li key={a.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold tracking-wider text-primary">{slotLabel(a.slot_hour)}</div>
                <div className="font-semibold break-words">{a.name || a.vehicle_number}{a.name && a.vehicle_number ? ` · ${a.vehicle_number}` : ""}</div>
                <div className="text-sm text-muted-foreground">{[a.service, a.model].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <span className="text-xs font-bold text-muted-foreground max-w-48 text-right">{a.status === "Booked" ? "Call the customer to confirm" : "Due soon: mark ARRIVED or NO-SHOW"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {a.mobile && <a href={`tel:${a.mobile}`} className={`${btn} border-primary text-primary`}>📞 {a.mobile}</a>}
              {a.status === "Booked" && <button disabled={busy === a.id} onClick={() => act(a, "confirm")} className={`${btn} bg-emerald-600 text-white border-emerald-600`}>CONFIRMED</button>}
              {a.status === "Confirmed" && <button disabled={busy === a.id} onClick={() => act(a, "arrived")} className={`${btn} bg-primary text-primary-foreground border-primary`}>ARRIVED</button>}
              <button onClick={() => setForm(a)} className={`${btn} border-border hover:bg-muted`}>POSTPONE</button>
              {a.status === "Confirmed" && soon[a.id] && <button disabled={busy === a.id} onClick={() => act(a, "no-show", "Mark this as a no-show?")} className={`${btn} border-border hover:bg-muted`}>NO-SHOW</button>}
              {a.status === "Booked" && <button disabled={busy === a.id} onClick={() => act(a, "cancel", "Cancel this appointment?")} className={`${btn} border-destructive text-destructive hover:bg-destructive hover:text-white`}>CANCEL</button>}
            </div>
          </li>
        ))}
      </ul>
      {form && <AppointmentForm appointment={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); window.dispatchEvent(new Event("appointments-changed")); }} />}
    </div>
  );
}
