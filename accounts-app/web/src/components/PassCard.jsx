import { useEffect } from "react";
import { fmtDate, money } from "../lib/format.js";

export const SHOP = {
  name: "AUTOSHINE PREMIUM CAR WASH",
  address: "SHAMBHU NAGAR T POINT, SHIVAJI BRIDGE, NAGPUR, MAHARASHTRA 440030",
  contact: "91-5652-8800",
};

const row = (k, v) => (
  <div className="flex justify-between gap-3 text-[11px] leading-tight py-[2px]"><span className="text-neutral-500">{k}</span><span className="font-bold text-right">{v}</span></div>
);

// The membership card, printed as two small cards (front and back). Anything outside .pass-print is hidden when printing.
export default function PassCard({ pass, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const front = (
    <div className="pass-card bg-white text-black border-2 border-[#C87412] rounded-xl overflow-hidden" style={{ width: "90mm", height: "58mm" }}>
      <div className="bg-[#C87412] text-white px-3 py-1.5 flex items-center justify-between">
        <div className="font-extrabold text-[11px] tracking-wider leading-tight">{SHOP.name}</div>
        <div className="text-[10px] font-bold">{pass.pass_no}</div>
      </div>
      <div className="px-3 pt-1">
        <div className="text-[10px] font-bold tracking-widest text-[#C87412]">{pass.plan.toUpperCase()} MEMBERSHIP · {pass.vehicle_type.toUpperCase()}</div>
        {row("Name", pass.name)}
        {row("Mobile", pass.mobile)}
        {row("Vehicle", [pass.vehicle_number, pass.model].filter(Boolean).join(" · "))}
        {row("Valid", `${fmtDate(pass.start_date)} to ${fmtDate(pass.end_date)}`)}
        {row("Full washes", `${pass.washes_total} (${money(pass.rate)} each)`)}
        {row("Paid", `${money(pass.amount)} · ${pass.payment_mode}`)}
        <div className="mt-1.5 text-center text-[9px] font-extrabold border border-black rounded px-1 py-[2px]">NOT VALID ON SATURDAYS, SUNDAYS &amp; PUBLIC HOLIDAYS</div>
      </div>
    </div>
  );

  const back = (
    <div className="pass-card bg-white text-black border-2 border-[#C87412] rounded-xl overflow-hidden" style={{ width: "90mm", height: "58mm" }}>
      <div className="px-3 pt-2">
        <div className="text-[10px] font-bold tracking-widest text-[#C87412] mb-1">TERMS &amp; CONDITIONS</div>
        <ol className="list-decimal pl-4 text-[9px] leading-snug space-y-[2px]">
          <li className="font-extrabold">This membership is NOT valid on Saturdays, Sundays and public holidays.</li>
          <li>Valid for Full Wash only.</li>
          <li>Valid from {fmtDate(pass.start_date)} to {fmtDate(pass.end_date)}. Unused washes expire after the end date.</li>
          <li>One wash per day. Show this card at every visit.</li>
        </ol>
        <div className="mt-2 pt-1 border-t border-neutral-300 text-[8.5px] leading-snug">
          <div className="font-bold">{SHOP.name}</div>
          <div>{SHOP.address}</div>
          <div>Contact: {SHOP.contact}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pass-print fixed inset-0 z-50 bg-black/60 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border max-w-fit">
        <div className="print:hidden flex items-center justify-between gap-6 mb-4">
          <div>
            <h2 className="font-display text-2xl font-bold italic">Membership card</h2>
            <p className="text-sm text-muted-foreground">Prints as two small cards: front and back.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CLOSE</button>
            <button onClick={() => window.print()} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">PRINT</button>
          </div>
        </div>
        <div className="pass-sheet flex flex-wrap gap-4 justify-center">{front}{back}</div>
      </div>
    </div>
  );
}
