import { useMemo, useState } from "react";
import { money } from "../lib/format.js";

const COLORS = ["#C87412", "#2F2F2F", "#2F7F79", "#D9A441", "#8A5A44", "#9AA5A8"];
const RANGES = [["TODAY", 0], ["7D", 7], ["30D", 30], ["ALL", null]];

const polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];

// Donut showing each key's share of an amount (top 5 + Others) over a chosen period. Computed from the loaded rows.
export default function SharePie({ rows, today, title, subtitle, dateOf, keyOf, amountOf, periods = true, colors, format = money, order, centerLabel = "TOTAL", emptyText = "Nothing in this period." }) {
  const [range, setRange] = useState(30);
  const [hover, setHover] = useState(null);

  const slices = useMemo(() => {
    const [y, m, d] = today.split("-").map(Number);
    const from = !periods || range === null ? "0000" : new Date(Date.UTC(y, m - 1, d - range)).toISOString().slice(0, 10);
    const groups = {};
    rows.forEach((e) => {
      if ((periods && dateOf(e) < from) || amountOf(e) <= 0) return;
      const key = keyOf(e);
      const k = key.toLowerCase();
      groups[k] = groups[k] || { label: key, value: 0, cars: 0 };
      groups[k].value += amountOf(e);
      groups[k].cars += 1;
    });
    const sorted = Object.values(groups).sort((a, b) => (order ? order.indexOf(a.label) - order.indexOf(b.label) : b.value - a.value));
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    if (rest.length) top.push({ label: "Others", value: rest.reduce((a, s) => a + s.value, 0), cars: rest.reduce((a, s) => a + s.cars, 0) });
    return top;
  }, [rows, today, range, periods, order]);

  // fixed colours per label when given (e.g. attendance statuses), otherwise the shared palette
  const colorFor = (s, i) => colors?.[s.label] ?? COLORS[i % COLORS.length];

  const total = slices.reduce((a, s) => a + s.value, 0);
  const R = 80, r = 48, C = 100;
  let angle = 0;
  const arcs = slices.map((s, i) => {
    const sweep = (s.value / total) * Math.PI * 2;
    const a0 = angle, a1 = angle + sweep;
    angle = a1;
    if (slices.length === 1) return { s, i, full: true };
    const [x0, y0] = polar(C, C, R, a0), [x1, y1] = polar(C, C, R, a1);
    const [x2, y2] = polar(C, C, r, a1), [x3, y3] = polar(C, C, r, a0);
    const big = sweep > Math.PI ? 1 : 0;
    return { s, i, d: `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z` };
  });
  const focus = hover != null ? slices[hover] : null;

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {periods && <div className="flex gap-1 rounded-full bg-muted p-1">
          {RANGES.map(([label, v]) => (
            <button key={label} onClick={() => setRange(v)}
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${range === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>}
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-8">
          <svg viewBox="0 0 200 200" className="w-56 h-56" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
            {arcs.map((a) =>
              a.full ? (
                <circle key={a.i} cx={C} cy={C} r={(R + r) / 2} fill="none" stroke={colorFor(slices[0], 0)} strokeWidth={R - r} />
              ) : (
                <path key={a.i} d={a.d} fill={colorFor(a.s, a.i)} stroke="#fff" strokeWidth="2" opacity={hover == null || hover === a.i ? 1 : 0.45} onMouseEnter={() => setHover(a.i)} />
              ),
            )}
            <text x={C} y={C - 4} textAnchor="middle" fontSize="11" fill="#6B6B6B">{focus ? focus.label : centerLabel}</text>
            <text x={C} y={C + 16} textAnchor="middle" fontSize="18" fontWeight="700" fill="#2F2F2F">{format(focus ? focus.value : total)}</text>
          </svg>
          <ul className="space-y-2 text-sm min-w-56">
            {slices.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: colorFor(s, i) }} />
                <span className="flex-1 font-semibold">{s.label}</span>
                <span className="text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
                <span className="w-24 text-right font-bold">{format(s.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
