import { fmtDate, money } from "../lib/format.js";

const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "short", year: "2-digit" });

// Cumulative net result (income - expenses) month by month against the amount invested: the line crossing the dashed line = break-even.
export default function PaybackChart({ months, base }) {
  if (months.length < 2) return <p className="text-sm text-muted-foreground py-6 text-center">The chart appears once there are two or more months of data.</p>;
  const W = 960, H = 260, padL = 96, padR = 16, padT = 20, padB = 30;
  const vals = months.map((m) => m.cumulative);
  // round axis: pick a "nice" step (1, 2, 2.5, 5 x 10^n) so labels read ₹8,00,000 rather than ₹8,00,280
  const rawTop = Math.max(base, ...vals, 1) * 1.05, rawBottom = Math.min(0, ...vals);
  const pow = 10 ** Math.floor(Math.log10((rawTop - rawBottom) / 4));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => (rawTop - rawBottom) / s <= 5);
  const top = Math.ceil(rawTop / step) * step, bottom = Math.floor(rawBottom / step) * step;
  const x = (i) => padL + (i / (months.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - bottom) / (top - bottom)) * (H - padT - padB);
  const path = months.map((m, i) => `${i ? "L" : "M"}${x(i)} ${y(m.cumulative)}`).join(" ");
  const ticks = []; for (let t = bottom; t <= top + 1e-9; t += step) ticks.push(Math.round(t));
  const every = Math.ceil(months.length / 9);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="PAYBACK CHART">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#2F2F2F" : "#E4D9C4"} strokeDasharray={t === 0 ? "" : "4 4"} />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#6B6B6B">{money(t)}</text>
        </g>
      ))}
      {base > 0 && (
        <g>
          <line x1={padL} x2={W - padR} y1={y(base)} y2={y(base)} stroke="#B3261E" strokeWidth="2" strokeDasharray="8 6" />
          <text x={W - padR} y={y(base) - 6} textAnchor="end" fontSize="12" fontWeight="700" fill="#B3261E">Invested {money(base)}</text>
        </g>
      )}
      <path d={path} fill="none" stroke="#C87412" strokeWidth="3" strokeLinejoin="round" />
      {months.map((m, i) => (
        <g key={m.month}>
          <circle cx={x(i)} cy={y(m.cumulative)} r="4" fill="#C87412"><title>{`${monthLabel(m.month)}: net ${money(m.net)}, total ${money(m.cumulative)}`}</title></circle>
          {(i % every === 0 || i === months.length - 1) && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B6B6B">{monthLabel(m.month)}</text>}
        </g>
      ))}
      <text x={x(months.length - 1)} y={y(months[months.length - 1].cumulative) - 10} textAnchor="end" fontSize="12" fontWeight="700" fill="#2F2F2F">{money(months[months.length - 1].cumulative)}</text>
    </svg>
  );
}
