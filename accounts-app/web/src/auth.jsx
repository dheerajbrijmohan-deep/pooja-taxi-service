import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null); // { endsAt (ms), total (seconds) } while signed in
  const track = (s) => setSession(s ? { endsAt: Date.now() + s.expires_in * 1000, total: s.session_seconds } : null);

  useEffect(() => {
    api("me")
      .then((d) => { setUser(d.user); track(d.session); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const d = await api("login", { method: "POST", body: { username, password } });
    setUser(d.user);
    track(d.session);
    return d.user;
  }, []);

  // CONTINUE on the "about to expire" box: starts another full period
  const extend = useCallback(async () => {
    const d = await api("session/extend", { method: "POST" });
    track(d.session);
  }, []);

  // the server says the sign-in has ended: back to the login page with a note
  useEffect(() => {
    const onExpired = () => {
      try { sessionStorage.setItem("session-expired", "1"); } catch { /* ignore */ }
      setUser(null);
      setSession(null);
    };
    window.addEventListener("session-expired", onExpired);
    return () => window.removeEventListener("session-expired", onExpired);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("logout", { method: "POST" });
    } finally {
      setUser(null);
      setSession(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, session, extend }}>
      {children}
    </AuthContext.Provider>
  );
}

export const homeFor = (user) => (user?.role === "admin" ? "/admin" : "/manager");
