import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

// Warns shortly before the sign-in ends (8 hours after login) and lets the person continue; otherwise signs them out.
export default function SessionGuard() {
  const { session, extend, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = session ? Math.max(0, Math.round((session.endsAt - now) / 1000)) : null;
  const warnAt = session ? Math.min(300, Math.floor(session.total / 4)) : 0;

  useEffect(() => {
    if (session && left === 0) {
      try { sessionStorage.setItem("session-expired", "1"); } catch { /* ignore */ }
      logout().finally(() => navigate("/login", { replace: true }));
    }
  }, [session, left, logout, navigate]);

  if (!session || left > warnAt || left === 0) return null;
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");

  const cont = async () => {
    setBusy(true);
    setError("");
    try { await extend(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="print:hidden fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" role="alertdialog" aria-labelledby="sess-title">
      <div className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-card border border-border text-center">
        <div className="text-3xl mb-2" aria-hidden>⏳</div>
        <h2 id="sess-title" className="font-display text-xl font-bold italic mb-1">Your session is about to expire</h2>
        <p className="text-sm text-muted-foreground mb-1">For your security you will be signed out in</p>
        <div className="font-display text-4xl font-bold text-primary mb-4">{mm}:{ss}</div>
        <p className="text-sm text-muted-foreground mb-5">Press CONTINUE to stay signed in.</p>
        {error && <p role="alert" className="text-sm text-destructive mb-3">{error}</p>}
        <div className="flex gap-3 justify-center">
          <button onClick={async () => { await logout(); navigate("/login"); }} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">LOG OUT</button>
          <button onClick={cont} disabled={busy} autoFocus className="px-7 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "…" : "CONTINUE"}</button>
        </div>
      </div>
    </div>
  );
}
