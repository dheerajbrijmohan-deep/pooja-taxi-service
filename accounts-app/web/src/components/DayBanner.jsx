import { useEffect, useMemo, useState } from "react";
import { getPanchang } from "../lib/panchang.js";
import { randomQuote } from "../lib/quotes.js";

const TZ = "Asia/Kolkata";

export default function DayBanner() {
  const [now, setNow] = useState(() => new Date());
  const quote = useMemo(randomQuote, []); // new quote on every page load
  const panchang = useMemo(() => getPanchang(now), [Math.floor(now.getTime() / 60000)]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString("en-IN", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
  const day = now.toLocaleDateString("en-IN", { timeZone: TZ, weekday: "long" });
  const time = now.toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const items = [
    ["Tithi", `${panchang.paksha} · ${panchang.tithi}`],
    ["Nakshatra", panchang.nakshatra],
    ["Yoga", panchang.yoga],
    ["Karana", panchang.karana],
  ];

  return (
    <section className="bg-card rounded-2xl shadow-card border border-border overflow-hidden mb-8">
      <div className="p-6 md:p-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-widest text-primary mb-1">{day.toUpperCase()} · {panchang.vara.toUpperCase()}</div>
          <div className="font-display text-3xl md:text-4xl font-bold italic">{date}</div>
        </div>
        <div className="text-3xl md:text-4xl font-bold tabular-nums tracking-wide text-primary">{time}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border-y border-border">
        {items.map(([k, v]) => (
          <div key={k} className="bg-card px-6 py-4">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{k.toUpperCase()}</div>
            <div className="font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <blockquote className="p-6 md:p-8">
        <p className="font-display text-xl md:text-2xl italic leading-snug">“{quote.text}”</p>
        <footer className="text-sm text-muted-foreground mt-2">— {quote.by}</footer>
      </blockquote>
    </section>
  );
}
