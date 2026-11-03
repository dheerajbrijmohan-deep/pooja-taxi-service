import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { daysBetween, fmtDate } from "../lib/format.js";

function status(daysSince, dueDays) {
  const left = dueDays - daysSince;
  if (left > 0) return { text: `Due in ${left} day${left === 1 ? "" : "s"}`, tone: "text-muted-foreground" };
  if (left === 0) return { text: "Due today", tone: "text-primary" };
  return { text: `${-left} day${left === -1 ? "" : "s"} past due`, tone: "text-primary" };
}

// What differs between the businesses: the API path, how a customer is identified and the wording.
const KINDS = {
  carwash: {
    path: "carwash/calls",
    id: (c) => c.vehicle_number,
    body: (c) => ({ vehicle_number: c.vehicle_number }),
    since: "Last wash", visited: "washed", next: "Next wash due on", who: "customers",
    title: (c) => c.name, tag: (c) => c.vehicle_number,
    detail: (c) => [c.vehicle_type, c.service, c.model].filter(Boolean).join(" · "),
    hint: "e.g. Will bring the car on Saturday / Not picking up / Asked to call next week",
  },
};

const when = (s) => new Date(s.replace(" ", "T")).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function CommentModal({ c, k, onClose, onSaved }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(k.path, { method: "POST", body: { ...k.body(c), comment } });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-lg bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold italic">{k.title(c)}</h2>
          <p className="text-sm text-muted-foreground">{[k.tag(c), k.detail(c)].filter(Boolean).join(" · ")} · {k.since.toLowerCase()} {fmtDate(c.entry_date)}</p>
          <a href={`tel:${c.mobile}`} className="inline-block mt-2 font-bold text-primary">{c.mobile}</a>
        </div>
        {c.calls.length > 0 && (
          <div className="rounded-lg bg-muted p-3 max-h-40 overflow-y-auto space-y-2">
            {c.calls.map((k, i) => (
              <div key={i} className="text-sm"><span className="text-xs text-muted-foreground">{when(k.at)} · {k.by}</span><div>{k.comment}</div></div>
            ))}
          </div>
        )}
        <div>
          <label htmlFor="call-comment" className="text-sm font-semibold mb-1 block">Comment after the call</label>
          <textarea id="call-comment" ref={ref} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} required
            placeholder={k.hint}
            className="w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE COMMENT"}</button>
        </div>
      </form>
    </div>
  );
}

// Customers whose last wash/visit was `call_after_days`+ days ago (and who haven't come again).
export default function CallList({ data, today, onChanged, kind = "carwash" }) {
  const k = KINDS[kind];
  const [open, setOpen] = useState(null);
  const customers = data?.customers ?? [];

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">CUSTOMERS TO CALL {data && `(${customers.length})`}</h2>
        {data && <p className="text-sm text-muted-foreground mt-1">{k.since} {data.call_after_days}+ days ago.</p>}
      </div>
      {!data ? (
        <p className="p-8 text-center text-muted-foreground">Loading…</p>
      ) : customers.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">No one to call right now. 🎉</p>
      ) : (
        <ul className="divide-y divide-border">
          {customers.map((c) => {
            const since = daysBetween(c.entry_date, today);
            const st = status(since, data.due_days);
            const last = c.calls[0];
            return (
              <li key={k.id(c)} className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="min-w-48 flex-1">
                  <div className="font-semibold">{k.title(c)} {k.tag(c) && <span className="text-muted-foreground font-normal">· {k.tag(c)}</span>}</div>
                  <div className="text-sm text-muted-foreground">{k.detail(c) && `${k.detail(c)} · `}{k.visited} {fmtDate(c.entry_date)} ({since} days ago)</div>
                </div>
                <a href={`tel:${c.mobile}`} className="font-bold text-primary hover:underline">{c.mobile}</a>
                <div className="text-sm w-44"><div className="text-xs text-muted-foreground">{k.next}</div><div className="font-semibold">{fmtDate(c.due_on)}</div><div className={`text-xs font-semibold ${st.tone}`}>{st.text}</div></div>
                <div className="text-sm flex-1 min-w-48 text-muted-foreground">
                  {last ? <><span className="text-foreground">“{last.comment}”</span> <span className="text-xs">· {when(last.at)}, {last.by}</span></> : "Not called yet"}
                </div>
                <button onClick={() => setOpen(c)} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs tracking-wider hover:opacity-90">
                  {last ? "ADD COMMENT" : "CALLED · COMMENT"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && <CommentModal c={open} k={k} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); onChanged(); }} />}
    </div>
  );
}
