import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useBusiness } from "../components/BusinessLayout.jsx";
import { fmtDate, money } from "../lib/format.js";
import { rupeesInWords } from "../lib/words.js";

const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const days = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-4 py-2 border-b border-border ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// One salary slip. Used for a single slip and for "print all slips".
export function SlipArticle({ s, month }) {
  const rate = s.monthly_salary / s.day_basis;
  const paid = s.status === "Paid";
  return (
    <article className="bg-white rounded-2xl border border-border shadow-card print:shadow-none print:border-0 print:rounded-none p-8 md:p-10 text-sm">
      <header className="text-center border-b-2 border-primary pb-5 mb-6">
        <div className="text-2xl font-bold text-primary tracking-widest">THE POOJA GROUP</div>
        {s.business && <div className="text-xl font-bold tracking-wide mt-1.5">{s.business}</div>}
        <div className="font-display text-2xl font-bold italic mt-4">Salary Slip · {monthLabel(month)}</div>
        {!paid && <div className="mt-2 inline-block rounded-full border border-primary text-primary px-3 py-0.5 text-xs font-bold tracking-wider">PAYMENT PENDING</div>}
      </header>

      <div className="grid grid-cols-2 gap-x-8 mb-6">
        <div>
          <Row label="Employee" value={<b>{s.name}</b>} />
          <Row label="Designation" value={s.designation || "—"} />
          <Row label="Date of joining" value={s.join_date ? fmtDate(s.join_date) : "—"} />
        </div>
        <div>
          <Row label="Slip no." value={s.slip_no} />
          <Row label="Bank" value={s.bank_name ? `${s.bank_name}${s.bank_last4 ? ` · A/c ••••${s.bank_last4}` : ""}` : "—"} />
          <Row label="Paid on" value={paid ? fmtDate(s.paid_on) : "—"} />
        </div>
      </div>

      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">ATTENDANCE</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center mb-6">
        {[["Present", s.present], ["Half day", s.half_days], ["Paid leave", s.leave], ["Absent", s.absent], ["Not marked", s.unmarked], ["Paid days", days(s.payable_days)]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border py-2"><div className="text-lg font-bold">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>
        ))}
      </div>

      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">EARNINGS</h2>
      <div className="mb-2">
        <Row label="Monthly salary" value={money(s.monthly_salary)} />
        <Row label={`Daily rate (${money(s.monthly_salary)} ÷ ${s.day_basis})`} value={`₹${rate.toFixed(2)}`} />
        <Row label={`Salary for ${days(s.payable_days)} paid day${s.payable_days === 1 ? "" : "s"}`} value={money(s.earned)} />
        {s.bonus > 0 && <Row label={`Bonus${s.bonus_note ? ` (${s.bonus_note})` : ""}`} value={money(s.bonus)} />}
        <div className="flex justify-between gap-4 py-3 text-base font-bold border-b-2 border-foreground"><span>NET PAY</span><span>{money(s.net)}</span></div>
      </div>
      <p className="text-muted-foreground mb-10">{rupeesInWords(s.net)}</p>

      <div className="grid grid-cols-2 gap-16 mt-16 text-center text-xs">
        <div className="border-t border-foreground pt-2">Employer signature</div>
        <div className="border-t border-foreground pt-2">Employee signature</div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground mt-8">This is a computer-generated salary slip.</p>
    </article>
  );
}

export default function SalarySlip() {
  const { empId, month } = useParams();
  const biz = useBusiness();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`salary/slip?employee_id=${empId}&month=${month}`).then((d) => setS(d.slip)).catch((e) => setError(e.message));
  }, [empId, month]);

  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!s) return <p className="text-muted-foreground">Loading…</p>;
  if (s.business && s.business !== biz.name) return <p role="alert" className="text-destructive">This employee does not work for {biz.name}.</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link to={`${biz.base}/salary`} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← SALARY SHEET</Link>
        <button onClick={() => window.print()} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">PRINT / SAVE AS PDF</button>
      </div>

      <SlipArticle s={s} month={month} />
    </div>
  );
}

// Every employee's slip for a month, one per page, ready to print or save as a single PDF.
export function AllSlips() {
  const { month } = useParams();
  const biz = useBusiness();
  const [slips, setSlips] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const sheet = await api(`salary/sheet?month=${month}&business=${encodeURIComponent(biz.name)}`);
        const all = await Promise.all(sheet.rows.map((r) => api(`salary/slip?employee_id=${r.employee_id}&month=${month}`)));
        setSlips(all.map((d) => d.slip));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [month, biz.name]);

  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!slips) return <p className="text-muted-foreground">Preparing slips…</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link to={`${biz.base}/salary`} className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← SALARY SHEET</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{slips.length} slip{slips.length === 1 ? "" : "s"} · {monthLabel(month)}</span>
          <button onClick={() => window.print()} disabled={slips.length === 0} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">PRINT / SAVE AS PDF</button>
        </div>
      </div>
      {slips.length === 0 && <p className="text-muted-foreground">No employees worked in {monthLabel(month)}.</p>}
      <div className="space-y-8 print:space-y-0">
        {slips.map((s, i) => (
          <div key={s.employee_id} className={i < slips.length - 1 ? "print:break-after-page" : ""}>
            <SlipArticle s={s} month={month} />
          </div>
        ))}
      </div>
    </div>
  );
}
