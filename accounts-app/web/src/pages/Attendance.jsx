import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import AttendancePie from "../components/AttendancePie.jsx";
import { BY_KEY, STATUSES, countChipClass, monthLabel, monthTally, nextStatus, shiftMonth } from "../lib/attendance.js";
import { fmtDate, todayIST } from "../lib/format.js";

const shiftDay = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const navBtn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
const sel = "rounded-full border border-input bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function DayView({ business, setError }) {
  const today = todayIST();
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const t = ++latest.current; // only the newest request may update the screen (older, slower replies are dropped)
    try {
      const d = await api(`attendance/day?date=${date}`);
      if (t === latest.current) setData(d);
    } catch (err) {
      if (t === latest.current) setError(err.message);
    }
  }, [date, setError]);
  useEffect(() => { setData(null); load(); }, [load]);

  const list = useMemo(() => (data?.employees ?? []).filter((e) => !business || e.business === business), [data, business]);
  const counts = useMemo(() => {
    const c = { Present: 0, "Half day": 0, Absent: 0, Leave: 0, none: 0 };
    list.forEach((e) => { c[e.status ?? "none"]++; });
    return c;
  }, [list]);

  // click a status to set it; click the same one again to clear it
  const mark = async (e, status) => {
    const next = e.status === status ? null : status;
    setError("");
    setData((d) => ({ ...d, employees: d.employees.map((x) => (x.id === e.id ? { ...x, status: next } : x)) }));
    try {
      await api("attendance", { method: "PUT", body: { employee_id: e.id, date, status: next } });
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const fill = async () => {
    setError("");
    try {
      await api("attendance/fill", { method: "POST", body: { date, employee_ids: list.filter((e) => !e.status && !e.locked).map((e) => e.id) } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button className={navBtn} onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">‹</button>
        <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Choose day"
          className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <button className={navBtn} onClick={() => setDate(shiftDay(date, 1))} disabled={date >= today} aria-label="Next day">›</button>
        {date !== today && <button onClick={() => setDate(today)} className="text-xs font-bold tracking-wider text-primary hover:underline ml-1">TODAY</button>}
        <span className="text-muted-foreground text-sm ml-2">{fmtDate(date)}</span>
      </div>

      {data && (
        <div className="bg-card rounded-2xl shadow-card border border-border p-5 mb-4">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-2">PRESENT {date === today ? "TODAY" : `ON ${fmtDate(date).toUpperCase()}`} ({counts.Present + counts["Half day"]})</div>
          {counts.Present + counts["Half day"] === 0 ? (
            <p className="text-sm text-muted-foreground">No one is marked present yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {list.filter((e) => e.status === "Present" || e.status === "Half day").map((e) => (
                <Link key={e.id} to={`/attendance/${e.id}`} className={`rounded-full px-3 py-1 text-sm font-semibold ${BY_KEY[e.status].cell}`}>{e.name}{e.status === "Half day" ? " · half day" : ""}</Link>
              ))}
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm">
            <b>{counts.Present}</b> present · <b>{counts["Half day"]}</b> half day · <b>{counts.Absent}</b> absent · <b>{counts.Leave}</b> leave
            {counts.none > 0 && <> · <b className="text-primary">{counts.none} not marked</b></>}
          </p>
          {counts.none > 0 && <button onClick={fill} className="px-5 py-2 rounded-full border border-primary text-primary text-xs font-bold tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors">MARK ALL UNMARKED AS PRESENT</button>}
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        {!data && <p className="p-8 text-center text-muted-foreground">Loading…</p>}
        {data && list.length === 0 && <p className="p-8 text-center text-muted-foreground">No employees to mark on this day.</p>}
        <ul className="divide-y divide-border">
          {list.map((e) => (
            <li key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-48">
                <Link to={`/attendance/${e.id}`} className="font-semibold hover:text-primary hover:underline">{e.name}</Link>
                <div className="text-sm text-muted-foreground">{[e.designation, e.business].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="flex gap-2" role="group" aria-label={`Attendance for ${e.name}`}>
                {STATUSES.map((s) => (
                  <button key={s.key} onClick={() => mark(e, s.key)} disabled={e.locked} aria-pressed={e.status === s.key}
                    className={`px-3 sm:px-4 py-2 rounded-full border text-xs font-bold tracking-wider transition-colors disabled:opacity-50 ${e.status === s.key ? s.on : "border-border bg-white hover:bg-muted"}`}>
                    <span className="sm:hidden">{s.short}</span><span className="hidden sm:inline">{s.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
              {e.locked && <span className="text-xs font-bold tracking-wider text-muted-foreground w-full">🔒 SALARY PAID FOR THIS MONTH</span>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function MonthView({ business, setError, startMonth }) {
  const [month, setMonth] = useState(startMonth || todayIST().slice(0, 7));
  const [data, setData] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const t = ++latest.current; // only the newest request may update the screen (older, slower replies are dropped)
    try {
      const d = await api(`attendance/month?month=${month}`);
      if (t === latest.current) setData(d);
    } catch (err) {
      if (t === latest.current) setError(err.message);
    }
  }, [month, setError]);
  useEffect(() => { setData(null); load(); }, [load]);

  const rows = (data?.employees ?? []).filter((e) => !business || e.business === business);
  const days = data ? Array.from({ length: data.days }, (_, i) => i + 1) : [];
  const isCurrent = month >= todayIST().slice(0, 7);
  const wd = (d) => "SMTWTFS"[new Date(Date.UTC(+month.slice(0, 4), +month.slice(5) - 1, d)).getUTCDay()];

  // click cycles: not marked -> Present -> Half day -> Absent -> Leave -> not marked
  const cycle = async (e, day) => {
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button className={navBtn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="font-display text-xl font-bold italic w-44 text-center">{monthLabel(month)}</span>
        <button className={navBtn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month">›</button>
        <span className="text-xs text-muted-foreground ml-3">Click a name for that person's month · click a day to change it: P → H → A → L → blank</span>
      </div>
      {data && rows.length > 0 && (
        <div className="mb-6"><AttendancePie employees={rows} subtitle={`Days · ${monthLabel(month)}${business ? ` · ${business}` : ""}`} /></div>
      )}
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-x-auto">
        {!data && <p className="p-8 text-center text-muted-foreground">Loading…</p>}
        {data && rows.length === 0 && <p className="p-8 text-center text-muted-foreground">No employees in this month.</p>}
        {data && rows.length > 0 && (
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-muted text-left px-3 py-2 min-w-40 font-semibold tracking-widest text-muted-foreground">EMPLOYEE</th>
                {STATUSES.map((s) => <th key={s.key} title={s.label} className="bg-muted px-1 py-2 w-9 font-semibold text-muted-foreground">{s.short}</th>)}
                {days.map((d) => (
                  <th key={d} className="bg-muted px-0 py-1 w-8 min-w-8 font-semibold text-muted-foreground"><div>{d}</div><div className="font-normal opacity-60">{wd(d)}</div></th>
                ))}
                <th className="bg-muted px-3 py-2 font-semibold tracking-widest text-muted-foreground whitespace-nowrap">PAID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const tally = monthTally(e);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="sticky left-0 bg-card px-3 py-2 font-semibold whitespace-nowrap"><Link to={`/attendance/${e.id}?month=${month}`} className="hover:text-primary hover:underline">{e.name}</Link>{e.locked && <span title="Salary paid for this month"> 🔒</span>}</td>
                    {STATUSES.map((s) => (
                      <td key={s.key} className="p-0.5 text-center"><span className={`inline-flex w-8 h-7 items-center justify-center rounded text-xs ${countChipClass(s.key, tally[s.key])}`}>{tally[s.key]}</span></td>
                    ))}
                    {days.map((d) => {
                      const inWindow = d >= e.from_day && d <= e.to_day;
                      const st = BY_KEY[e.marks[d]];
                      return (
                        <td key={d} className="p-0.5 text-center">
                          {inWindow ? (
                            <button onClick={() => cycle(e, d)} disabled={e.locked} aria-label={`${e.name}, day ${d}: ${st ? st.label : "not marked"}`}
                              className={`w-7 h-7 rounded font-bold ${st ? st.cell : "bg-muted hover:bg-border"} disabled:cursor-not-allowed`}>{st?.short ?? ""}</button>
                          ) : <div className="w-7 h-7" />}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-bold">{tally.paidDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default function Attendance() {
  const [params] = useSearchParams();
  const [view, setView] = useState(params.get("view") === "month" ? "month" : "day");
  const [business, setBusiness] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("attendance/day").then((d) => setBusinesses(d.businesses)).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="font-display text-4xl font-bold italic">Attendance</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select value={business} onChange={(e) => setBusiness(e.target.value)} className={sel} aria-label="Filter by business">
            <option value="">All businesses</option>
            {businesses.map((b) => <option key={b}>{b}</option>)}
          </select>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {[["day", "DAY"], ["month", "MONTH"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className={`px-4 py-1 rounded-full text-xs font-bold tracking-wider ${view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {view === "day" ? <DayView business={business} setError={setError} /> : <MonthView business={business} setError={setError} startMonth={/^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? params.get("month") : ""} />}
    </div>
  );
}
