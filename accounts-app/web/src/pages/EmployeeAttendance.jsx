import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import AttendancePie from "../components/AttendancePie.jsx";
import { BY_KEY, STATUSES, countChipClass, monthLabel, monthTally, nextStatus, shiftMonth } from "../lib/attendance.js";
import { todayIST } from "../lib/format.js";

const navBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";

// One employee's attendance for a chosen month: counts, work-vs-leave pie and a colour-coded calendar.
export default function EmployeeAttendance() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const thisMonth = todayIST().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month") : thisMonth;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const latest = useRef(0);

  const setMonth = (m) => setParams({ month: m }, { replace: true });

  const load = useCallback(async () => {
    const t = ++latest.current; // only the newest request may update the screen (older, slower replies are dropped)
    try {
      const d = await api(`attendance/month?month=${month}`);
      if (t === latest.current) setData(d);
    } catch (err) {
      if (t === latest.current) setError(err.message);
    }
  }, [month]);
  useEffect(() => { setData(null); load(); }, [load]);

  const e = data?.employees.find((x) => x.id === Number(id)) ?? null;
  const t = e ? monthTally(e) : null;

  const change = async (day) => {
    const next = nextStatus(e.marks[day]);
    setError("");
    setData((d) => ({ ...d, employees: d.employees.map((x) => (x.id === e.id ? { ...x, marks: { ...x.marks, [day]: next } } : x)) }));
    try {
      await api("attendance", { method: "PUT", body: { employee_id: e.id, date: `${month}-${String(day).padStart(2, "0")}`, status: next } });
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  // calendar: Sunday-first weeks
  const first = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5) - 1, 1)).getUTCDay();
  const cells = data ? [...Array(first).fill(null), ...Array.from({ length: data.days }, (_, i) => i + 1)] : [];

  return (
    <div className="max-w-4xl">
      <Link to={`/attendance?view=month&month=${month}`} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← ATTENDANCE</Link>
      <div className="mt-2 mb-6">
        <h1 className="font-display text-4xl font-bold italic">{e ? e.name : "Employee attendance"}</h1>
        {e && <p className="text-muted-foreground mt-1">{[e.designation, e.business].filter(Boolean).join(" · ")}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button className={navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="font-display text-xl font-bold italic w-44 text-center">{monthLabel(month)}</span>
        <button className={navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">›</button>
        {month !== thisMonth && <button onClick={() => setMonth(thisMonth)} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">THIS MONTH</button>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {!data && !error && <p className="text-muted-foreground">Loading…</p>}
      {data && !e && <div className="bg-card rounded-2xl shadow-card border border-border p-10 text-center text-muted-foreground">Not working in {monthLabel(month)}.</div>}

      {e && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
            {STATUSES.map((s) => (
              <div key={s.key} className={`rounded-2xl p-4 text-center ${countChipClass(s.key, t[s.key])}`}>
                <div className="font-display text-3xl font-bold">{t[s.key]}</div>
                <div className="text-[11px] font-semibold tracking-widest opacity-90">{s.label.toUpperCase()}</div>
              </div>
            ))}
            <div className="rounded-2xl p-4 text-center bg-muted"><div className="font-display text-3xl font-bold">{t.notMarked}</div><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">NOT MARKED</div></div>
            <div className="rounded-2xl p-4 text-center bg-card border border-border"><div className="font-display text-3xl font-bold">{t.paidDays}</div><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">PAID DAYS</div></div>
          </div>

          <div className="mb-6"><AttendancePie employees={[e]} subtitle={`Days · ${monthLabel(month)}`} /></div>

          <section className="bg-card rounded-2xl shadow-card border border-border p-5 md:p-6">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">DAY BY DAY</h2>
            <p className="text-xs text-muted-foreground mb-4">{e.locked ? "🔒 Salary is paid for this month, so attendance is locked." : "Click a day to change it: P → H → A → L → blank"}</p>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-[11px] font-semibold tracking-widest text-muted-foreground pb-1">{d}</div>)}
              {cells.map((day, i) => {
                if (day === null) return <div key={`b${i}`} />;
                const inWindow = day >= e.from_day && day <= e.to_day;
                const st = BY_KEY[e.marks[day]];
                return (
                  <button key={day} disabled={!inWindow || e.locked} onClick={() => change(day)}
                    aria-label={`${day} ${monthLabel(month)}: ${st ? st.label : inWindow ? "not marked" : "not working"}`}
                    className={`h-14 rounded-lg flex flex-col items-center justify-center text-sm ${st ? st.cell : inWindow ? "bg-muted hover:bg-border" : "bg-transparent text-border"} disabled:cursor-not-allowed`}>
                    <span className="text-xs opacity-80">{day}</span>
                    <span className="font-bold leading-none">{st?.short ?? ""}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
