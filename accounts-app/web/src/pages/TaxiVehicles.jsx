import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import DueList from "../components/DueList.jsx";
import { fmtDate } from "../lib/format.js";

// All taxis at a glance, with everything overdue or due soon across them.
export default function TaxiVehicles() {
  const [vehicles, setVehicles] = useState(null);
  const [due, setDue] = useState([]);
  const [info, setInfo] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [v, d] = await Promise.all([api("taxi/vehicles"), api("taxi/due")]);
        const details = await Promise.all(v.vehicles.map((x) => api(`taxi/vehicles/${x.id}`)));
        setVehicles(v.vehicles); setDue(d.items);
        setInfo(Object.fromEntries(details.map((x) => [x.vehicle.id, x])));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl">
      <Link to="/business/taxi" className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← POOJA TAXI SERVICES</Link>
      <h1 className="font-display text-4xl font-bold italic mt-2 mb-6">Vehicles</h1>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="bg-card rounded-2xl shadow-card border border-border p-6 mb-8">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">OVERDUE &amp; DUE SOON · ALL VEHICLES</h2>
        {vehicles ? <DueList items={due} /> : <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(vehicles ?? []).map((v) => {
          const x = info[v.id];
          const overdue = x?.due.filter((i) => i.status === "overdue").length ?? 0, soon = x?.due.filter((i) => i.status === "soon").length ?? 0;
          const lastService = x?.services[0];
          return (
            <Link key={v.id} to={`/business/taxi/vehicles/${v.id}`} className={`block bg-card rounded-2xl shadow-card border border-border p-5 hover:border-primary transition-colors ${v.active ? "" : "opacity-60"}`}>
              <div className="flex items-baseline justify-between"><div className="font-display text-2xl font-bold">{v.code.slice(-4)}</div><div className="text-xs text-muted-foreground">{[x?.vehicle.make, v.model].filter(Boolean).join(" ") || "details not added"}</div></div>
              <div className="text-xs text-muted-foreground mb-3">{v.code}{v.active ? "" : " · inactive"}</div>
              <dl className="text-sm grid grid-cols-[1fr_auto] gap-y-1">
                <dt className="text-muted-foreground">Odometer</dt><dd className="text-right">{x?.odometer != null ? `${Math.round(x.odometer).toLocaleString("en-IN")} km` : "—"}</dd>
                <dt className="text-muted-foreground">Documents</dt><dd className="text-right">{x?.documents.length ?? 0}</dd>
                <dt className="text-muted-foreground">Last service</dt><dd className="text-right">{lastService ? `${lastService.kind}, ${fmtDate(lastService.service_date, false)}` : "—"}</dd>
                <dt className="text-muted-foreground">Accidents</dt><dd className="text-right">{x?.accidents.length ?? 0}</dd>
              </dl>
              <div className="mt-3 pt-3 border-t border-border flex gap-2 text-[11px] font-bold tracking-wider">
                {overdue > 0 && <span className="rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5">{overdue} OVERDUE</span>}
                {soon > 0 && <span className="rounded-full bg-primary/15 text-primary px-2.5 py-0.5">{soon} DUE SOON</span>}
                {overdue + soon === 0 && <span className="text-muted-foreground">ALL CLEAR</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
