import { useMemo, useState } from "react";
import { fmtDate } from "../lib/format.js";

const RANGES = [7, 14, 30, 90];
const niceMax = (n) => { if (n <= 4) return 4; const p = 10 ** Math.floor(Math.log10(n)); const f = [1, 2, 2.5, 5, 10].find((x) => x * p >= n); return f * p; };

// Histogram: how many (children / vehicles) came on each day. `rows` need a date; `dateOf` reads it.
export default function DailyBars({ rows, today, dateOf, title = "DAILY COUNT", unit = "visits", singular = "visit" }) {
  const [range, setRange] = useState(30);
  const [hover, setHover] = useState(null);

  const series = useMemo(() => {
    const counts = {};
    rows.forEach((r) => { const d = dateOf(r); counts[d] = (counts[d] || 0) + 1; });
    const [y, m, d] = today.split("-").map(Number);
    return Array.from({ length: range }, (_, i) => {
      const iso = new Date(Date.UTC(y, m - 1, d - (range - 1 - i))).toISOString().slice(0, 10);
      return { date: iso, count: counts[iso] || 0 };
    });
  }, [rows, today, range, dateOf]);

  const total = series.reduce((a, s) => a + s.count, 0);
  const busiest = series.reduce((a, s) => (s.count > a.count ? s : a), series[0]);
  const max = niceMax(Math.max(...series.map((s) => s.count), 1));
  const W = 960, H = 230, padL = 36, padB = 26, padT = 18;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const bw = plotW / series.length;
  const showValues = series.length <= 31;
  const every = series.length <= 14 ? 1 : series.length <= 31 ? 3 : 10;
  const shown = hover != null ? series[hover] : null;
  const word = (n) => (n === 1 ? singular : unit);

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">{title}</h2>
          <p className="font-semibold mt-1" aria-live="polite">
            {shown ? `${fmtDate(shown.date)} · ${shown.count} ${word(shown.count)}` : `${total} ${word(total)} in the last ${range} days`}
          </p>
          {!shown && total > 0 && <p className="text-xs text-muted-foreground mt-0.5">Average {(total / range).toFixed(1)} a day · busiest {fmtDate(busiest.date, false)} ({busiest.count})</p>}
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r}D</button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => {
          const y = padT + plotH - f * plotH;
          return (
            <g key={f}>
              <line x1={padL} x2={W - 6} y1={y} y2={y} stroke="#E4D9C4" strokeDasharray={f === 0 ? "" : "4 4"} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="12" fill="#6B6B6B">{Math.round(max * f)}</text>
            </g>
          );
        })}
        {series.map((s, i) => {
          const h = (s.count / max) * plotH;
          const x = padL + i * bw;
          const isToday = s.date === today;
          return (
            <g key={s.date} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={padT} width={bw} height={plotH} fill="transparent" />
              <rect x={x + bw * 0.14} y={padT + plotH - h} width={bw * 0.72} height={Math.max(h, s.count ? 2 : 0)} rx={2}
                data-date={s.date} data-count={s.count} aria-label={`${fmtDate(s.date)}: ${s.count} ${word(s.count)}`}
                fill={hover === i || isToday ? "#2F2F2F" : "#C87412"} />
              {showValues && s.count > 0 && <text x={x + bw / 2} y={padT + plotH - h - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#2F2F2F">{s.count}</text>}
              {(i % every === 0 || i === series.length - 1) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B6B6B">{fmtDate(s.date, false)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
