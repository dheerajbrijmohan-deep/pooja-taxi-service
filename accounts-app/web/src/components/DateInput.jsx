import { useEffect, useMemo, useRef, useState } from "react";
import { todayIST } from "../lib/format.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const show = (v) => (v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "");

// A date box that opens a calendar when you click it (value is "YYYY-MM-DD", like <input type="date">, and `required` works the same).
// The month and year are drop-downs, so a date of birth does not need dozens of clicks.
export default function DateInput({ id, value, onChange, required, disabled, min, max, className = "", fromYear, toYear, placeholder = "dd/mm/yyyy" }) {
  const today = todayIST();
  const [open, setOpen] = useState(false);
  const base = value || (max && max < today ? max : today);
  const [view, setView] = useState({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 });
  const [up, setUp] = useState(false); // open upwards when there is no room below (fields near the bottom of a form)
  const wrap = useRef(null);

  const y0 = fromYear ?? 1940;
  const y1 = toYear ?? +today.slice(0, 4) + 15;
  const years = useMemo(() => { const a = []; for (let y = y0; y <= Math.max(y1, view.y); y++) a.push(y); if (view.y < y0) a.unshift(view.y); return a; }, [y0, y1, view.y]);

  const openIt = () => {
    if (disabled) return;
    const b = value || (max && max < today ? max : today);
    setView({ y: +b.slice(0, 4), m: +b.slice(5, 7) - 1 });
    const r = wrap.current?.getBoundingClientRect();
    setUp(!!r && window.innerHeight - r.bottom < 360 && r.top > window.innerHeight - r.bottom);
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const down = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const key = (e) => e.key === "Escape" && (e.stopPropagation(), setOpen(false));
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key, true); };
  }, [open]);

  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const blocked = (d) => { const s = iso(view.y, view.m, d); return (min && s < min) || (max && s > max); };
  const move = (n) => setView((v) => { const t = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const pick = (d) => { onChange(iso(view.y, view.m, d)); setOpen(false); };
  const sel = "rounded-md border border-input bg-white px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div ref={wrap} className="relative">
      <input
        id={id} type="text" inputMode="none" autoComplete="off" value={show(value)} placeholder={placeholder} required={required} disabled={disabled}
        className={`${className} pr-10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
        onChange={() => {}} onClick={openIt} onFocus={openIt}
        onKeyDown={(e) => {
          if (e.key === "Tab") return;
          if ((e.key === "Backspace" || e.key === "Delete") && !required) onChange("");
          if (e.key === "Enter" && !open) return; // Enter on a closed box still submits the form
          if (e.key === " " || e.key === "ArrowDown") openIt();
          e.preventDefault();
        }}
      />
      <button type="button" tabIndex={-1} aria-label="Open calendar" disabled={disabled} onClick={() => (open ? setOpen(false) : openIt())} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary disabled:opacity-40">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      </button>
      {open && (
        <div role="dialog" aria-label="Choose a date" className={`absolute left-0 ${up ? "bottom-full mb-1" : "top-full mt-1"} z-[70] w-72 bg-white rounded-xl border border-border shadow-card p-3`}>
          <div className="flex items-center gap-1 mb-2">
            <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="w-8 h-8 rounded-full border border-border hover:bg-muted">‹</button>
            <select aria-label="Month" value={view.m} onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))} className={`${sel} flex-1 min-w-0`}>{MONTHS.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
            <select aria-label="Year" value={view.y} onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))} className={`${sel} w-20`}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <button type="button" onClick={() => move(1)} aria-label="Next month" className="w-8 h-8 rounded-full border border-border hover:bg-muted">›</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground mb-1">{DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {cells.map((d, i) => d == null ? <div key={`e${i}`} /> : (
              <button key={d} type="button" disabled={blocked(d)} onClick={() => pick(d)}
                className={`mx-auto w-8 h-8 rounded-full ${iso(view.y, view.m, d) === value ? "bg-primary text-primary-foreground font-bold" : iso(view.y, view.m, d) === today ? "border border-primary text-primary font-semibold hover:bg-muted" : "hover:bg-muted"} disabled:opacity-30 disabled:hover:bg-transparent`}>{d}</button>
            ))}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-border text-xs font-bold tracking-wider">
            <button type="button" disabled={(max && today > max) || (min && today < min)} onClick={() => { onChange(today); setOpen(false); }} className="text-primary hover:underline disabled:opacity-40">TODAY</button>
            {!required && value && <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-destructive hover:underline">CLEAR</button>}
          </div>
        </div>
      )}
    </div>
  );
}
