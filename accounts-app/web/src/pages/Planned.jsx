import { useEffect, useState } from "react";
import { api } from "../api.js";
import { fmtDate, money } from "../lib/format.js";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };

const TumblesIcon = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12" {...stroke}>
    <circle cx="24" cy="24" r="15" />
    <circle cx="18.5" cy="21" r="1.4" fill="currentColor" />
    <circle cx="29.5" cy="21" r="1.4" fill="currentColor" />
    <path d="M17 28c2 4 12 4 14 0" />
    <path d="M24 5v4M9 11l3 3M39 11l-3 3" />
  </svg>
);

const ICONS = { "Tiny Tumbles": TumblesIcon };

// Businesses we are planning but have not started. No dashboard yet: only what has been spent on them so far.
export default function Planned() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("planned").then((d) => setData(d.planned)).catch((e) => setError(e.message)); }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-bold italic">Planned Business</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">Businesses we are planning but have not started.</p>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {!data && !error && <p className="text-muted-foreground">Loading…</p>}
      <div className="space-y-6">
        {(data ?? []).map((b) => {
          const Icon = ICONS[b.name];
          return (
            <section key={b.name} className="bg-card rounded-2xl shadow-card border border-border border-t-4 border-t-primary p-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-sky-100 text-sky-700 shrink-0">{Icon && <Icon />}</div>
                <div className="flex-1">
                  <h2 className="font-display text-2xl font-bold italic leading-snug">{b.name}</h2>
                  <p className="text-sm text-muted-foreground">{b.about}</p>
                </div>
                <span className="rounded-full border border-primary text-primary px-3 py-1 text-xs font-bold tracking-wider">PLANNED</span>
              </div>
              <div className="mt-5 pt-4 border-t border-border">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-xs font-semibold tracking-widest text-muted-foreground">SPENT SO FAR</h3>
                  <span className="font-display text-xl font-bold">{money(b.spend_total)}</span>
                </div>
                {b.spend.length === 0 ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p> : (
                  <ul className="divide-y divide-border text-sm">
                    {b.spend.map((r, i) => (
                      <li key={i} className="flex justify-between gap-4 py-2"><span>{fmtDate(r.expense_date)} · {r.item} <span className="text-muted-foreground">({r.category})</span></span><span className="font-semibold">{money(r.total)}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
