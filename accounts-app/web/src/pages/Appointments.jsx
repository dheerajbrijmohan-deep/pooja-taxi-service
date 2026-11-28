import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import AppointmentForm from "../components/AppointmentForm.jsx";
import { ACTIVE, SLOTS, STATUS_STYLE, addDays, slotLabel, slotOver, weekday } from "../lib/appointments.js";
import { fmtDate, todayIST } from "../lib/format.js";

const btn = "px-3 py-1.5 rounded-full border font-bold text-[11px] tracking-wider";

// One booked appointment with its actions.
function Card({ a, today, onAct, onEdit, onDelete, admin }) {
  const open = a.status === "Booked" || a.status === "Confirmed";
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold break-words">{a.name || a.vehicle_number || a.mobile} {a.name && a.vehicle_number && <span className="text-muted-foreground font-normal">· {a.vehicle_number}</span>}</div>
          <div className="text-sm text-muted-foreground">{[a.vehicle_type, a.model, a.service].filter(Boolean).join(" · ") || "—"}</div>
          {a.notes && <div className="text-sm mt-1">📝 {a.notes}</div>}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${STATUS_STYLE[a.status]}`}>{a.status.toUpperCase()}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {a.mobile && <a href={`tel:${a.mobile}`} className={`${btn} border-primary text-primary`}>📞 {a.mobile}</a>}
        {a.status === "Booked" && <button onClick={() => onAct(a, "confirm")} className={`${btn} border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white`}>CONFIRMED</button>}
        {open && a.appt_date === today && <button onClick={() => onAct(a, "arrived")} className={`${btn} bg-primary text-primary-foreground border-primary`}>ARRIVED</button>}
        {open && <button onClick={() => onEdit(a)} className={`${btn} border-border hover:bg-muted`}>POSTPONE / CHANGE</button>}
        {open && <button onClick={() => onAct(a, "no-show")} className={`${btn} border-border hover:bg-muted`}>NO-SHOW</button>}
        {open && <button onClick={() => onAct(a, "cancel")} className={`${btn} border-destructive text-destructive hover:bg-destructive hover:text-white`}>CANCEL</button>}
        {a.status === "Arrived" && <button onClick={() => onAct(a, "done")} className={`${btn} border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white`}>MARK DONE</button>}
        {admin && <button onClick={() => onDelete(a)} className={`${btn} border-transparent text-destructive hover:underline`}>DELETE</button>}
      </div>
    </div>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const admin = user.role === "admin";
  const [view, setView] = useState("today"); // today | tomorrow | week | date
  const [date, setDate] = useState(todayIST());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null); // null | { initial } | { appointment }
  const [busyId, setBusyId] = useState(null);

  const today = data?.today ?? todayIST();
  const day = view === "today" ? today : view === "tomorrow" ? addDays(today, 1) : date;
  const [from, to] = view === "week" ? [today, addDays(today, 6)] : [day, day];

  const load = useCallback(async () => {
    try {
      setData(await api(`carwash/appointments?from=${from}&to=${to}`));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const act = async (a, what) => {
    const label = { confirm: "mark this as confirmed by the customer", arrived: "mark this car as arrived", "no-show": "mark this as a no-show", cancel: "cancel this appointment", done: "mark this as done" }[what];
    if (what !== "done" && what !== "confirm" && !window.confirm(`Are you sure you want to ${label}?\n${a.name || ""} ${a.vehicle_number}`)) return;
    setBusyId(a.id);
    setNotice("");
    try {
      const d = await api(`carwash/appointments/${a.id}/${what}`, { method: "POST" });
      if (what === "arrived") setNotice(d.pass ? `Checked in. This car has pass ${d.pass.pass_no} (${d.pass.washes_left} washes left): record the wash with USE A WASH on the Memberships tab.` : "Checked in. A car wash entry was created on the Dashboard: add the payment there when the customer pays.");
      load(); window.dispatchEvent(new Event("appointments-changed"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const del = async (a) => {
    if (!window.confirm(`Delete this appointment for ${a.name || a.vehicle_number}?`)) return;
    try { await api(`carwash/appointments/${a.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };

  const list = data?.appointments ?? [];
  const live = list.filter((a) => ACTIVE.includes(a.status));
  const tab = (k, l) => (
    <button key={k} onClick={() => setView(k)} className={`px-4 py-2 text-xs font-bold tracking-wider ${view === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{l}</button>
  );

  // one day as a timetable of the six 2-hour slots
  const Timetable = ({ d }) => {
    const mine = list.filter((a) => a.appt_date === d);
    return (
      <div className="space-y-3">
        {SLOTS.map((h) => {
          const here = mine.filter((a) => a.slot_hour === h);
          const taken = here.find((a) => ACTIVE.includes(a.status));
          const past = d < today || (d === today && data && slotOver(h, data.now_hour));
          const others = here.filter((a) => a !== taken); // cancelled / no-show history of this slot
          return (
            <div key={h} className="grid grid-cols-1 sm:grid-cols-[9.5rem_1fr] gap-2 sm:gap-4">
              <div className={`text-sm font-bold tracking-wide pt-1 ${past ? "text-muted-foreground" : ""}`}>{slotLabel(h)}</div>
              <div className="space-y-2">
                {taken ? <Card a={taken} today={today} onAct={act} onEdit={(a) => setForm({ appointment: a })} onDelete={del} admin={admin} />
                  : past ? <div className="text-sm text-muted-foreground py-2">Slot over</div>
                  : <button onClick={() => setForm({ initial: { appt_date: d, slot_hour: h } })} className="w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-bold tracking-wider text-primary hover:bg-muted">FREE · + BOOK</button>}
                {others.map((a) => <div key={a.id} className="text-xs text-muted-foreground px-1">{a.status}: {a.name || a.vehicle_number}{a.mobile ? ` · ${a.mobile}` : ""}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl">
      <Link to="/business/carwash" className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← DASHBOARD</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold italic">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">2-hour slots, 9 am to 9 pm · one car at a time</p>
        </div>
        <button onClick={() => setForm({ initial: { appt_date: view === "week" ? today : day } })} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">+ NEW APPOINTMENT</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex rounded-full border border-border overflow-hidden bg-card">
          {tab("today", "TODAY")}{tab("tomorrow", "TOMORROW")}{tab("week", "THIS WEEK")}{tab("date", "PICK A DATE")}
        </div>
        {view === "date" && <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Choose date" className="rounded-md border border-input bg-white px-3 py-2 text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />}
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {notice && <p role="status" className="text-sm rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 mb-4">{notice}</p>}

      <div className="bg-card rounded-2xl shadow-card border border-border p-4 sm:p-5">
        {!data ? <p className="py-8 text-center text-muted-foreground">Loading…</p> : view === "week" ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{live.length} appointment{live.length === 1 ? "" : "s"} in the next 7 days. Tap a day to see its timetable.</p>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => {
              const mine = list.filter((a) => a.appt_date === d && ACTIVE.includes(a.status));
              return (
                <div key={d} className="border-t border-border pt-3 first:border-0 first:pt-0">
                  <button onClick={() => { setDate(d); setView("date"); }} className="flex w-full items-center justify-between text-left">
                    <span className="font-bold">{d === today ? "Today" : weekday(d)} <span className="font-normal text-muted-foreground">· {fmtDate(d, false)}</span></span>
                    <span className="text-xs font-bold tracking-wider text-primary">{mine.length}/{SLOTS.length} BOOKED ›</span>
                  </button>
                  {mine.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {mine.map((a) => (
                        <li key={a.id} className="text-sm flex flex-wrap gap-x-3"><span className="font-semibold w-28 shrink-0">{slotLabel(a.slot_hour)}</span><span>{a.name || a.vehicle_number}{a.name && a.vehicle_number ? ` · ${a.vehicle_number}` : ""}</span><span className="text-muted-foreground">{a.service}</span><span className={`rounded-full px-2 text-[10px] font-bold ${STATUS_STYLE[a.status]}`}>{a.status.toUpperCase()}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-4">{(day === today ? "TODAY" : weekday(day).toUpperCase())} · {fmtDate(day)} · {live.length} BOOKED</h2>
            <Timetable d={day} />
          </>
        )}
      </div>

      {form && <AppointmentForm appointment={form.appointment} initial={form.initial} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); window.dispatchEvent(new Event("appointments-changed")); }} />}
    </div>
  );
}
