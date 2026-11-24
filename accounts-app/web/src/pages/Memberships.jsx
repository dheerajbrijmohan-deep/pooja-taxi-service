import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import ConfirmSave from "../components/ConfirmSave.jsx";
import PassCard from "../components/PassCard.jsx";
import { fmtVehicle } from "../lib/carwash.js";
import { fmtDate, money, todayIST } from "../lib/format.js";

const PLANS = { Monthly: { washes: 4, days: 30 }, Quarterly: { washes: 12, days: 90 }, "Half-yearly": { washes: 24, days: 180 }, Annual: { washes: 48, days: 365 } };
const RATES = { Hatchback: 250, Sedan: 350, SUV: 450 };
const field = "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const th = "text-left text-[10px] font-semibold tracking-wider text-muted-foreground px-2.5 py-3 whitespace-nowrap";
const td = "px-2.5 py-2.5 align-top text-[13px]";
const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;

const endOf = (start, days) => { const d = new Date(`${start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days - 1); return d.toISOString().slice(0, 10); };
const tone = { Active: "bg-emerald-100 text-emerald-800", Expired: "bg-neutral-200 text-neutral-700", "Used up": "bg-neutral-200 text-neutral-700", Cancelled: "bg-red-100 text-red-800" };

function Stat({ label, value, sub }) {
  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function NewPass({ onSaved, onClose }) {
  const [f, setF] = useState({ name: "", mobile: "", vehicle_number: "", model: "", vehicle_type: "Hatchback", plan: "Monthly", payment_mode: "Cash", start_date: todayIST() });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const plan = PLANS[f.plan];
  const amount = RATES[f.vehicle_type] * plan.washes;
  const end = endOf(f.start_date, plan.days);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setBusy(true);
    try { const d = await api("carwash/memberships", { method: "POST", body: f }); onSaved(d.membership); }
    catch (err) { setConfirming(false); setError(err.message); }
    finally { setBusy(false); }
  };
  const summary = [["Customer", f.name], ["Mobile", f.mobile], ["Vehicle", `${f.vehicle_number}${f.model ? " · " + f.model : ""}`], ["Plan", `${f.plan} · ${f.vehicle_type}`],
    ["Valid", `${fmtDate(f.start_date)} to ${fmtDate(end)}`], ["Full washes", `${plan.washes} × ${money(RATES[f.vehicle_type])}`], ["Amount", `${money(amount)} · ${f.payment_mode}`]];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={(e) => { e.preventDefault(); setError(""); setConfirming(true); }} className="w-full max-w-xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">New membership</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><L id="m-name">Customer name</L><input id="m-name" autoFocus required className={field} value={f.name} onChange={set("name")} maxLength={100} /></div>
          <div><L id="m-mobile">Mobile number</L><input id="m-mobile" required type="tel" inputMode="numeric" className={field} value={f.mobile} onChange={set("mobile")} placeholder="10 digits" /></div>
          <div><L id="m-veh">Vehicle number</L><input id="m-veh" required className={`${field} uppercase`} value={f.vehicle_number} onChange={(e) => setF((p) => ({ ...p, vehicle_number: fmtVehicle(e.target.value) }))} placeholder="MH-31 FM-7700" maxLength={20} /></div>
          <div><L id="m-model">Model</L><input id="m-model" className={field} value={f.model} onChange={set("model")} placeholder="Swift Dzire" maxLength={100} /></div>
          <div><L id="m-type">Vehicle type</L><select id="m-type" className={field} value={f.vehicle_type} onChange={set("vehicle_type")}>{Object.keys(RATES).map((t) => <option key={t} value={t}>{t} — {money(RATES[t])} per wash</option>)}</select></div>
          <div><L id="m-plan">Plan</L><select id="m-plan" className={field} value={f.plan} onChange={set("plan")}>{Object.entries(PLANS).map(([p, v]) => <option key={p} value={p}>{p} — {v.washes} washes</option>)}</select></div>
          <div><L id="m-start">Start date</L><input id="m-start" type="date" required className={field} value={f.start_date} onChange={set("start_date")} /></div>
          <div><L id="m-mode">Payment mode</L><select id="m-mode" className={field} value={f.payment_mode} onChange={set("payment_mode")}><option>Cash</option><option>Online</option><option>Credit</option></select></div>
        </div>
        <div className="rounded-xl bg-muted/70 border border-border p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{plan.washes} Full Washes × {money(RATES[f.vehicle_type])}</span><span className="font-display text-2xl font-bold">{money(amount)}</span></div>
          <div className="text-xs text-muted-foreground mt-1">Valid {fmtDate(f.start_date)} to {fmtDate(end)}</div>
          <div className="text-xs font-bold mt-2">Not valid on Saturdays, Sundays and public holidays.</div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">SAVE &amp; PRINT</button>
        </div>
      </form>
      {confirming && <ConfirmSave rows={summary} locks busy={busy} onConfirm={save} onCancel={() => setConfirming(false)} />}
    </div>
  );
}

function Holidays({ isAdmin, onClose }) {
  const [list, setList] = useState(null);
  const [d, setD] = useState("");
  const [n, setN] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => api("carwash/holidays").then((r) => setList(r.holidays)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const add = async (e) => {
    e.preventDefault(); setError("");
    try { await api("carwash/holidays", { method: "POST", body: { holiday_date: d, name: n } }); setD(""); setN(""); load(); } catch (err) { setError(err.message); }
  };
  const del = async (h) => { if (window.confirm(`Remove ${h.name} (${fmtDate(h.holiday_date)})?`)) { try { await api(`carwash/holidays/${h.id}`, { method: "DELETE" }); load(); } catch (err) { setError(err.message); } } };
  const today = todayIST();
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div><h2 className="font-display text-2xl font-bold italic">Public holidays</h2><p className="text-sm text-muted-foreground">Passes are not valid on these days, nor on Saturdays and Sundays.</p></div>
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-border font-bold text-xs tracking-wider hover:bg-muted">CLOSE</button>
        </div>
        {isAdmin && (
          <form onSubmit={add} className="flex flex-wrap gap-2 mb-3">
            <input type="date" required value={d} onChange={(e) => setD(e.target.value)} className={`${field} w-auto`} aria-label="Holiday date" />
            <input required value={n} onChange={(e) => setN(e.target.value)} placeholder="Holiday name" maxLength={100} className={`${field} flex-1 min-w-40`} aria-label="Holiday name" />
            <button className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs tracking-wider hover:opacity-90">ADD</button>
          </form>
        )}
        {error && <p role="alert" className="text-sm text-destructive mb-2">{error}</p>}
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {(list ?? []).map((h) => (
            <div key={h.id} className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${h.holiday_date < today ? "text-muted-foreground" : ""}`}>
              <span><span className="font-semibold">{fmtDate(h.holiday_date)}</span> · {h.name}</span>
              {isAdmin && <button onClick={() => del(h)} className="text-xs font-bold tracking-wider text-destructive hover:underline">REMOVE</button>}
            </div>
          ))}
          {list && list.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">No holidays in the list.</p>}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Please check these dates against the official holiday list{isAdmin ? "; you can add or remove any day." : "."}</p>
      </div>
    </div>
  );
}

export default function Memberships() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Active");
  const [newOpen, setNewOpen] = useState(false);
  const [card, setCard] = useState(null);
  const [holidays, setHolidays] = useState(false);
  const [recv, setRecv] = useState(null); // { pass, mode, ask }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api("carwash/memberships")); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const tc = t.replace(/[\s-]/g, "");
    return (data?.memberships ?? []).filter((m) => (status === "All" || m.status === status) &&
      (!t || [m.pass_no, m.name, m.mobile, m.model, m.plan, m.vehicle_type].some((v) => v.toLowerCase().includes(t)) || m.vehicle_number.toLowerCase().replace(/[\s-]/g, "").includes(tc)));
  }, [data, q, status]);

  const all = data?.memberships ?? [];
  const active = all.filter((m) => m.status === "Active");
  const monthStart = todayIST().slice(0, 7);
  const soldMonth = all.filter((m) => m.status !== "Cancelled" && m.sold_on.startsWith(monthStart) && m.payment_mode !== "Credit").reduce((a, m) => a + m.amount, 0);

  const useWash = async (m) => {
    if (!window.confirm(`Record a Full Wash on pass ${m.pass_no} (${m.name}, ${m.vehicle_number})?\n${m.washes_left} wash${m.washes_left === 1 ? "" : "es"} left now; ${m.washes_left - 1} after this.`)) return;
    setBusyId(m.id); setError("");
    try { await api(`carwash/memberships/${m.id}/wash`, { method: "POST" }); await load(); } catch (e) { setError(e.message); } finally { setBusyId(null); }
  };
  const cancel = async (m) => {
    if (!window.confirm(`Cancel pass ${m.pass_no} (${m.name})? It can no longer be used.`)) return;
    try { await api(`carwash/memberships/${m.id}/cancel`, { method: "POST" }); load(); } catch (e) { setError(e.message); }
  };
  const del = async (m) => {
    if (!window.confirm(`Delete pass ${m.pass_no} (${m.name})? This removes it completely.`)) return;
    try { await api(`carwash/memberships/${m.id}`, { method: "DELETE" }); load(); } catch (e) { setError(e.message); }
  };
  const settle = async () => {
    setBusyId(recv.pass.id);
    try { await api(`carwash/memberships/${recv.pass.id}/received`, { method: "POST", body: { payment_mode: recv.mode } }); setRecv(null); await load(); } catch (e) { setError(e.message); setRecv(null); } finally { setBusyId(null); }
  };

  const blocked = data?.blocked_today;
  return (
    <div className="max-w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold italic">Memberships</h1>
          <p className="text-muted-foreground">Full Wash passes: Monthly 4 · Quarterly 12 · Half-yearly 24 · Annual 48 washes. Hatchback ₹250, Sedan ₹350, SUV ₹450 per wash.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setHolidays(true)} className="px-5 py-3 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">PUBLIC HOLIDAYS</button>
          <button onClick={() => setNewOpen(true)} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">+ NEW MEMBERSHIP</button>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 mb-6 text-sm ${blocked ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
        <span className="font-bold">Condition:</span> memberships are <span className="font-bold">not valid on Saturdays, Sundays and public holidays.</span>
        {data && <span className="ml-2">{blocked ? `Today is a ${blocked}: passes cannot be used today.` : "Today passes can be used."}</span>}
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Stat label="ACTIVE PASSES" value={active.length} sub={`${all.length} sold in all`} />
        <Stat label="WASHES LEFT ON ACTIVE PASSES" value={active.reduce((a, m) => a + m.washes_left, 0)} sub="across all active passes" />
        <Stat label="SOLD THIS MONTH" value={money(soldMonth)} sub="excluding credit" />
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <div className="inline-flex rounded-full border border-border overflow-hidden">
            {["Active", "Expired", "Used up", "Cancelled", "All"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 text-xs font-bold tracking-wider ${status === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s.toUpperCase()}</button>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pass no, name, mobile, vehicle…" aria-label="Search passes" className="rounded-full border border-input bg-white px-4 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 1000 }}>
            <thead className="bg-muted"><tr>{["PASS", "CUSTOMER", "VEHICLE", "PLAN", "VALID", "WASHES", "PAID", "STATUS", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-muted/60">
                  <td className={`${td} font-bold whitespace-nowrap`}>{m.pass_no}<div className="text-[11px] font-normal text-muted-foreground">sold {fmtDate(m.sold_on)}</div></td>
                  <td className={td}><div className="font-semibold">{m.name}</div><div className="text-muted-foreground">{m.mobile}</div></td>
                  <td className={`${td} whitespace-nowrap`}><div className="font-semibold">{m.vehicle_number}</div><div className="text-muted-foreground">{m.vehicle_type}{m.model ? ` · ${m.model}` : ""}</div></td>
                  <td className={td}>{m.plan}</td>
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(m.start_date)}<div className="text-muted-foreground">to {fmtDate(m.end_date)}</div></td>
                  <td className={`${td} whitespace-nowrap`}><span className="font-bold">{m.washes_used}</span> of {m.washes_total} used<div className="text-muted-foreground">{m.washes_left} left</div></td>
                  <td className={`${td} whitespace-nowrap`}><div className="font-bold">{money(m.amount)}</div>{m.payment_mode === "Credit" ? <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold tracking-wider">CREDIT DUE</span> : <div className="text-muted-foreground">{m.payment_mode}</div>}</td>
                  <td className={td}><span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${tone[m.status]}`}>{m.status.toUpperCase()}</span></td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    {m.status === "Active" && m.payment_mode !== "Credit" && <button disabled={busyId === m.id} onClick={() => useWash(m)} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider hover:opacity-90 disabled:opacity-60 mr-2">USE A WASH</button>}
                    {m.payment_mode === "Credit" && m.status !== "Cancelled" && <button onClick={() => setRecv({ pass: m, mode: "Cash", ask: false })} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">RECEIVED</button>}
                    <button onClick={() => setCard(m)} className="text-xs font-bold tracking-wider text-primary hover:underline mr-3">PRINT</button>
                    {isAdmin && m.status === "Active" && <button onClick={() => cancel(m)} className="text-xs font-bold tracking-wider text-destructive hover:underline mr-3">CANCEL</button>}
                    {isAdmin && m.washes_used === 0 && <button onClick={() => del(m)} className="text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button>}
                  </td>
                </tr>
              ))}
              {data && rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">{all.length === 0 ? "No memberships sold yet. Click “+ New membership”." : "Nothing matches."}</td></tr>}
              {!data && !error && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {newOpen && <NewPass onClose={() => setNewOpen(false)} onSaved={(m) => { setNewOpen(false); setCard(m); load(); }} />}
      {card && <PassCard pass={card} onClose={() => setCard(null)} />}
      {holidays && <Holidays isAdmin={isAdmin} onClose={() => setHolidays(false)} />}
      {recv && !recv.ask && (
        <div className="fixed inset-0 z-[55] bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && setRecv(null)}>
          <div className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-card border border-border">
            <h2 className="font-display text-xl font-bold italic mb-1">Credit received</h2>
            <p className="text-sm text-muted-foreground mb-4">{recv.pass.name} · {money(recv.pass.amount)} for pass {recv.pass.pass_no}. How was it paid?</p>
            <div className="flex gap-2 mb-5">{["Cash", "Online"].map((m) => <button key={m} onClick={() => setRecv({ ...recv, mode: m })} className={`flex-1 py-2.5 rounded-full border font-bold text-sm tracking-wider ${recv.mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{m.toUpperCase()}</button>)}</div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRecv(null)} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
              <button onClick={() => setRecv({ ...recv, ask: true })} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">CONTINUE</button>
            </div>
          </div>
        </div>
      )}
      {recv?.ask && <ConfirmSave rows={[["Customer", recv.pass.name], ["Pass", recv.pass.pass_no], ["Amount received", money(recv.pass.amount)], ["Paid by", recv.mode]]} locks={!isAdmin} busy={busyId === recv.pass.id} onCancel={() => setRecv({ ...recv, ask: false })} onConfirm={settle} />}
    </div>
  );
}
