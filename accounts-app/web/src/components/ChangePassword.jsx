import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const field = "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground";

// A signed-in user changes their own password.
export default function ChangePassword({ onClose }) {
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (f.next.length < 10) { setError("The new password must be at least 10 characters."); return; }
    if (f.next !== f.again) { setError("The two new passwords do not match."); return; }
    setBusy(true);
    try {
      await api("change-password", { method: "POST", body: { current: f.current, new: f.next } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md bg-card text-foreground rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">Change password</h2>
        {done ? (
          <>
            <p className="text-sm">Your password has been changed. Use the new one the next time you sign in.</p>
            <div className="flex justify-end pt-2"><button type="button" onClick={onClose} className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">DONE</button></div>
          </>
        ) : (
          <>
            <div><L id="cp-cur">Current password</L><input id="cp-cur" ref={first} type="password" autoComplete="current-password" className={field} value={f.current} onChange={set("current")} required /></div>
            <div><L id="cp-new">New password (at least 10 characters)</L><input id="cp-new" type="password" autoComplete="new-password" className={field} value={f.next} onChange={set("next")} required /></div>
            <div><L id="cp-again">New password again</L><input id="cp-again" type="password" autoComplete="new-password" className={field} value={f.again} onChange={set("again")} required /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
              <button type="submit" disabled={busy} className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
