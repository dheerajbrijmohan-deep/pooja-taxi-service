import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const ago = (at) => {
  const t = new Date(at.replace(" ", "T") + "+05:30").getTime();
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

// Owner only: what the manager has entered or changed. Checked every 30 seconds.
export default function NotificationBell() {
  const [data, setData] = useState({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const load = useCallback(async () => {
    try { setData(await api("notifications")); } catch { /* keep the last list */ }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const markRead = async () => {
    try { await api("notifications/read", { method: "POST" }); load(); } catch { /* ignore */ }
  };
  const toggle = () => { setOpen((o) => !o); if (!open) load(); };

  return (
    <div ref={box} className="relative order-2 md:order-none">
      <button onClick={toggle} aria-label={`Notifications, ${data.unread} unread`} className="relative w-full md:w-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold tracking-wider hover:bg-sidebar-accent">
        <span aria-hidden="true">🔔</span><span>MANAGER UPDATES</span>
        {data.unread > 0 && <span className="ml-auto md:ml-1 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl bg-card text-foreground border border-border shadow-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground">WHAT THE MANAGER DID</span>
            {data.unread > 0 && <button onClick={markRead} className="text-xs font-bold tracking-wider text-primary hover:underline">MARK ALL READ</button>}
          </div>
          {data.items.length === 0 ? <p className="p-6 text-sm text-center text-muted-foreground">Nothing yet. Entries and changes made by the manager show up here.</p> : (
            <ul className="divide-y divide-border">
              {data.items.map((n) => (
                <li key={n.id} className={`px-4 py-3 text-sm ${n.read ? "" : "bg-primary/10"}`}>
                  <div><span className="font-semibold">{n.by}</span> {n.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ago(n.at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
