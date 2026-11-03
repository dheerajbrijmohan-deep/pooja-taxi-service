import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth.jsx";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(username.trim(), password);
      navigate(homeFor(u), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card rounded-2xl p-8 shadow-card border border-border space-y-5">
        <div className="text-center leading-tight">
          <div className="text-2xl font-bold text-primary tracking-widest">THE POOJA GROUP</div>
          <div className="text-xs font-semibold tracking-wider">MANAGEMENT</div>
        </div>
        <div>
          <label htmlFor="u" className="text-sm font-semibold mb-1 block">Username</label>
          <input id="u" className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div>
          <label htmlFor="p" className="text-sm font-semibold mb-1 block">Password</label>
          <input id="p" type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-full tracking-wider hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "SIGNING IN…" : "SIGN IN"}
        </button>
      </form>
    </div>
  );
}
