import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import FormModal from "../components/FormModal.jsx";
import { fmtDate, money, todayIST } from "../lib/format.js";

const monthLabel = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const shiftMonth = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1 + n, 1)).toISOString().slice(0, 7);
const th = "text-[11px] font-semibold tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap";
const td = "px-3 py-2.5 whitespace-nowrap";
const link = "text-xs font-bold tracking-wider text-primary hover:underline";
const pill = "px-5 py-2.5 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50";

function Stat({ label, value, sub, tone = "" }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl font-bold mt-1 whitespace-nowrap ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

const STATUS_CHIP = { Due: "bg-muted", Asked: "bg-primary/15 text-primary", Received: "bg-emerald-100 text-emerald-700" };

// The owner's account sheet for one car. Rows are copied from that car's sheet. Deposit stamps the day with the date of the click.
export default function TaxiAccount() {
  const { vehicleId } = useParams();
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [view, setView] = useState("month"); // month | pending
  const [data, setData] = useState(null);
  const [dues, setDues] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null); // { due?, prefill? }
  const [hist, setHist] = useState(null);  // deposit history: null = closed, otherwise the data
  const [openMonth, setOpenMonth] = useState("");
  const latest = useRef(0);

  const load = useCallback(async () => {
    const token = ++latest.current;
    try {
      const range = view === "pending" ? "from=2000-01-01&to=2099-12-31" : `month=${month}`;
      const [a, d] = await Promise.all([api(`taxi/account?vehicle_id=${vehicleId}&${range}`), api(`taxi/dues?vehicle_id=${vehicleId}`)]);
      if (token !== latest.current) return;
      setData(a); setDues(d); setError("");
    } catch (err) {
      if (token === latest.current) setError(err.message);
    }
  }, [vehicleId, month, view]);
  useEffect(() => { setData(null); load(); }, [load]);

  const act = async (fn, msg) => {
    setError(""); setNotice("");
    try { const r = await fn(); if (msg) setNotice(typeof msg === "function" ? msg(r) : msg); load(); } catch (err) { setError(err.message); }
  };
  if (error && !data) return <p role="alert" className="text-destructive">{error}</p>;
  if (!data || !dues) return <p className="text-muted-foreground">Loading…</p>;

  const v = data.vehicle, t = data.totals, all = data.all_time;
  const rows = view === "pending" ? data.rows.filter((r) => r.deposited_on === null && r.ready) : data.rows;
  const pendingRows = data.rows.filter((r) => r.deposited_on === null && r.ready);
  const pendingNet = pendingRows.reduce((a, r) => a + r.profit, 0);
  const toggleHistory = async () => {
    if (hist) { setHist(null); return; }
    try { const h = await api(`taxi/account/deposits?vehicle_id=${vehicleId}`); setHist(h); setOpenMonth(h.months[0]?.month ?? ""); } catch (err) { setError(err.message); }
  };
  const depositAll = () => {
    if (!window.confirm(`Mark ${pendingRows.length} day${pendingRows.length === 1 ? "" : "s"} as deposited today (${fmtDate(data.today)}) to ${v.deposit_to || "the deposit account"}?\n\nNet amount: ${money(pendingNet)}`)) return;
    act(() => api("taxi/account/deposit", { method: "POST", body: { trip_ids: pendingRows.map((r) => r.trip_id) } }), (r) => `Deposited ${r.deposited} day${r.deposited === 1 ? "" : "s"}, net ${money(r.amount)}, on ${fmtDate(r.on)}.`);
  };
  const depositOne = (r) => act(() => api("taxi/account/deposit", { method: "POST", body: { trip_ids: [r.trip_id] } }), (x) => `${fmtDate(r.date)}: ${money(x.amount)} marked as deposited on ${fmtDate(x.on)}.`);
  const undo = (r) => window.confirm(`Remove the deposit mark from ${fmtDate(r.date)} (${money(r.deposited_amount)} deposited on ${fmtDate(r.deposited_on)})?`) && act(() => api("taxi/account/undeposit", { method: "POST", body: { trip_id: r.trip_id } }));

  const dueFields = [
    { key: "kind", label: "What is it for?", type: "select", options: dues.kinds, required: true },
    { key: "description", label: "Details", type: "text", span: 2, placeholder: "e.g. insurance renewal 2026-27" },
    { key: "amount", label: "Amount ₹", type: "number", step: "0.01", hint: "0 if not known yet" },
    { key: "due_date", label: "Due on", type: "date" },
    { key: "note", label: "Note", type: "text", span: 2 },
  ];
  const submitDue = async (x) => {
    const body = { ...x, vehicle_id: Number(vehicleId), amount: Number(x.amount) || 0, ref: form.prefill?.ref ?? "" };
    if (form.due) await api(`taxi/dues/${form.due.id}`, { method: "PUT", body }); else await api("taxi/dues", { method: "POST", body });
    setForm(null); load();
  };

  return (
    <div className="max-w-full">
      <h1 className="font-display text-4xl font-bold italic">{v.account_name}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Car {v.code.slice(-4)}{v.model ? ` · ${v.model}` : ""} · profits are deposited to <b>{v.deposit_to || "the deposit account"}</b> · management {money(v.run_day_charge)} on every day the car runs</p>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {notice && <p className="text-sm text-primary font-semibold mb-4">{notice}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="TO DEPOSIT (NET, ALL DAYS)" value={money(all.pending)} tone={all.pending < 0 ? "text-destructive" : ""} sub={`${all.pending_days} day${all.pending_days === 1 ? "" : "s"} waiting`} />
        <button onClick={toggleHistory} aria-expanded={!!hist} className="text-left bg-card rounded-2xl shadow-card border border-border p-5 hover:border-primary transition-colors">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">DEPOSITED THIS MONTH</div>
          <div className="font-display text-3xl font-bold mt-1 whitespace-nowrap">{money(data.deposited_this_month.amount)}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.deposited_this_month.days} day{data.deposited_this_month.days === 1 ? "" : "s"} in {monthLabel(data.deposited_this_month.month)} · to {v.deposit_to || "the deposit account"}</div>
          <div className="text-xs font-bold tracking-wider text-primary mt-2">{hist ? "HIDE HISTORY ▴" : "SEE HISTORY ▾"}</div>
        </button>
        <Stat label={view === "pending" ? "PROFIT (ALL TIME)" : `PROFIT · ${monthLabel(month).toUpperCase()}`} value={money(t.profit)} tone={t.profit < 0 ? "text-destructive" : ""} sub={`management ${money(t.management)}`} />
        <Stat label="MONEY TO ASK FOR" value={money(dues.totals.outstanding)} sub={`${money(dues.totals.to_ask)} not asked yet · ${money(dues.totals.asked)} asked`} />
      </div>

      {hist && (
        <section className="bg-card rounded-2xl shadow-card border border-border mb-6 overflow-hidden" aria-label="Deposit history">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-border">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">DEPOSIT HISTORY · BY THE DATE OF DEPOSIT</h2>
            <span className="text-sm font-semibold">All time: {money(hist.total)} · {hist.days} day{hist.days === 1 ? "" : "s"}</span>
          </div>
          {hist.months.length === 0 && <p className="px-4 py-8 text-center text-muted-foreground">Nothing has been deposited yet.</p>}
          {hist.months.map((m) => (
            <div key={m.month} className="border-b border-border last:border-0">
              <button onClick={() => setOpenMonth(openMonth === m.month ? "" : m.month)} aria-expanded={openMonth === m.month} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60 text-left">
                <span className="font-display text-lg font-bold italic">{monthLabel(m.month)}</span>
                <span className="text-sm"><b>{money(m.total)}</b> <span className="text-muted-foreground">· {m.days} day{m.days === 1 ? "" : "s"} · {m.dates.length} deposit date{m.dates.length === 1 ? "" : "s"}</span> <span className="ml-2 text-primary">{openMonth === m.month ? "▴" : "▾"}</span></span>
              </button>
              {openMonth === m.month && (
                <div className="px-4 pb-4 space-y-3">
                  {m.dates.map((d) => (
                    <div key={d.date} className="rounded-xl border border-border">
                      <div className="flex justify-between gap-3 px-3 py-2 bg-muted/60 text-sm font-semibold rounded-t-xl"><span>Deposited on {fmtDate(d.date)}</span><span>{money(d.total)}</span></div>
                      <table className="w-full text-sm"><tbody className="divide-y divide-border">
                        {d.days.map((x, i) => <tr key={i}><td className="px-3 py-1.5">{fmtDate(x.trip_date)}</td><td className="px-3 py-1.5 text-muted-foreground">{x.driver_name}</td><td className="px-3 py-1.5 text-right">{money(x.amount)}</td></tr>)}
                      </tbody></table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {[["month", "MONTH"], ["pending", "NOT DEPOSITED YET"]].map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>)}
          </div>
          {view === "month" && (
            <>
              <button className="w-9 h-9 rounded-full border border-border font-bold hover:bg-muted" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
              <input type="month" value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Choose month" className="rounded-md border border-input bg-white px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <button className="w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= todayIST().slice(0, 7)} aria-label="Next month">›</button>
              <span className="font-display text-xl font-bold italic ml-2">{monthLabel(month)}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`/business/taxi/reports?report=taxi-account&car=${v.code}&from=${view === "pending" ? "2026-01-01" : `${month}-01`}&to=${todayIST()}`} className={pill}>DOWNLOAD (EXCEL / PDF) →</Link>
          <button onClick={depositAll} disabled={!pendingRows.length} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">
            {pendingRows.length ? `DEPOSIT ${pendingRows.length} PENDING DAY${pendingRows.length === 1 ? "" : "S"} · ${money(pendingNet)}` : "NOTHING PENDING"}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>{["DATE", "DRIVER", "TOTAL EARNING", "PAYOUT", "DRIVER SHARE", "CNG", "PETROL", "MANAGEMENT", "PROFIT", "DEPOSITED ON"].map((h, i) => <th key={h} className={`${th} ${i >= 2 && i <= 8 ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.trip_id} className="hover:bg-muted/60">
                  <td className={td}>{fmtDate(r.date)}</td>
                  <td className={`${td} font-semibold`}>{r.driver_name}</td>
                  <td className={`${td} text-right`}>{money(r.total_earning)}</td>
                  <td className={`${td} text-right`}>{r.payout ? money(r.payout) : <span className="text-muted-foreground">—</span>}</td>
                  <td className={`${td} text-right`}>{money(r.driver_share)}</td>
                  <td className={`${td} text-right`}>{money(r.cng_amount)}</td>
                  <td className={`${td} text-right`}>{money(r.petrol_amount)}</td>
                  <td className={`${td} text-right`}>{r.management ? money(r.management) : ""}</td>
                  <td className={`${td} text-right font-bold ${r.ready && r.profit < 0 ? "text-destructive" : ""}`}>{r.ready ? money(r.profit) : <span className="text-muted-foreground font-normal">in progress</span>}</td>
                  <td className={td}>
                    {r.deposited_on ? (
                      <span>
                        <b>{fmtDate(r.deposited_on)}</b> <span className="text-muted-foreground">· {money(r.deposited_amount)}</span>
                        {r.changed && <span className="ml-2 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-bold tracking-wider" title={`The day was edited after it was deposited. Profit is now ${money(r.profit)}.`}>CHANGED · NOW {money(r.profit)}</span>}
                        <button onClick={() => undo(r)} className="ml-3 text-xs text-muted-foreground hover:text-destructive hover:underline">undo</button>
                      </span>
                    ) : r.ready ? <button onClick={() => depositOne(r)} className={link}>DEPOSIT</button> : <span className="text-muted-foreground text-xs">waiting for payout</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">{view === "pending" ? "Everything is deposited." : `No running days in ${monthLabel(month)}.`}</td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-muted font-bold">
                <tr>
                  <td className="px-3 py-3" colSpan={2}>TOTAL ({rows.length} day{rows.length === 1 ? "" : "s"})</td>
                  {["total_earning", "payout", "driver_share", "cng_amount", "petrol_amount", "management"].map((k) => <td key={k} className="px-3 py-3 text-right">{money(rows.reduce((a, r) => a + r[k], 0))}</td>)}
                  <td className={`px-3 py-3 text-right ${rows.reduce((a, r) => a + (r.ready ? r.profit : 0), 0) < 0 ? "text-destructive" : ""}`}>{money(rows.reduce((a, r) => a + (r.ready ? r.profit : 0), 0))}</td>
                  <td className="px-3 py-3">{money(rows.reduce((a, r) => a + (r.deposited_on ? r.deposited_amount : 0), 0))} deposited</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-8 mb-10">Profit = Payout − Driver share − CNG − Petrol − Management. The rows come from the car's own sheet, so any change there shows here. Pressing DEPOSIT stamps the day with today's date and remembers the amount; if the day is edited afterwards it is flagged. Days with a loss are netted into what is deposited. Other expenses (parking etc.) are not part of this profit.</p>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-2xl font-bold italic">Money to ask for</h2>
          <p className="text-sm text-muted-foreground">Nothing is held back in advance for service, insurance or permit. When one falls due, add it here, mark it Asked when you ask, and Received when the money comes.</p>
        </div>
        <button onClick={() => setForm({})} className={pill}>+ ADD</button>
      </div>

      {dues.upcoming.length > 0 && (
        <div className="bg-card rounded-2xl shadow-card border border-border p-5 mb-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">COMING UP (FROM VEHICLES)</h3>
          <ul className="divide-y divide-border text-sm">
            {dues.upcoming.map((u) => (
              <li key={u.ref} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span><b>{u.label}</b> <span className={u.status === "overdue" ? "text-destructive" : "text-muted-foreground"}>· {u.due_date ? (u.days_left < 0 ? `${-u.days_left} days overdue` : `in ${u.days_left} days (${fmtDate(u.due_date, false)})`) : u.km_left < 0 ? `${Math.round(-u.km_left)} km overdue` : `${Math.round(u.km_left)} km to go`}</span></span>
                {u.added ? <span className="text-xs font-bold tracking-wider text-muted-foreground">ALREADY ADDED</span> : <button onClick={() => setForm({ prefill: { kind: u.kind, description: u.label, due_date: u.due_date ?? "", ref: u.ref } })} className={link}>ADD TO MONEY TO ASK FOR →</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["DUE ON", "FOR", "DETAILS", "AMOUNT", "STATUS", "ASKED ON", "RECEIVED ON", ""].map((h) => <th key={h} className={`${th} ${h === "AMOUNT" ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {dues.dues.map((d) => (
                <tr key={d.id} className="hover:bg-muted/60">
                  <td className={td}>{d.due_date ? fmtDate(d.due_date) : "—"}</td>
                  <td className={`${td} font-semibold`}>{d.kind}</td>
                  <td className={`${td} whitespace-normal min-w-48`}>{d.description}{d.note && <div className="text-xs text-muted-foreground">{d.note}</div>}</td>
                  <td className={`${td} text-right font-bold`}>{d.amount ? money(d.amount) : <span className="text-muted-foreground font-normal">to be confirmed</span>}</td>
                  <td className={td}><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider ${STATUS_CHIP[d.status]}`}>{d.status === "Due" ? "NOT ASKED YET" : d.status.toUpperCase()}</span></td>
                  <td className={td}>{d.asked_on ? fmtDate(d.asked_on) : ""}</td>
                  <td className={td}>{d.received_on ? fmtDate(d.received_on) : ""}</td>
                  <td className={`${td} text-right`}>
                    {d.status === "Due" && <button onClick={() => act(() => api(`taxi/dues/${d.id}/asked`, { method: "POST" }))} className={`${link} mr-3`}>ASKED</button>}
                    {d.status !== "Received" && <button onClick={() => act(() => api(`taxi/dues/${d.id}/received`, { method: "POST" }))} className={`${link} mr-3`}>RECEIVED</button>}
                    {d.status !== "Due" && <button onClick={() => act(() => api(`taxi/dues/${d.id}/reopen`, { method: "POST" }))} className="text-xs text-muted-foreground hover:underline mr-3">reopen</button>}
                    <button onClick={() => setForm({ due: d })} className={`${link} mr-3`}>EDIT</button>
                    <button onClick={() => window.confirm(`Delete this ${d.kind.toLowerCase()} item?`) && act(() => api(`taxi/dues/${d.id}`, { method: "DELETE" }))} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>
                  </td>
                </tr>
              ))}
              {dues.dues.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nothing yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && <FormModal title={form.due ? "Edit money to ask for" : "Add money to ask for"} fields={dueFields} submitLabel="SAVE" onClose={() => setForm(null)}
        initial={form.due ? { ...form.due, amount: String(form.due.amount), due_date: form.due.due_date ?? "" } : { kind: "Other", description: "", amount: "", due_date: "", note: "", ...form.prefill }} onSubmit={submitDue} />}
    </div>
  );
}
