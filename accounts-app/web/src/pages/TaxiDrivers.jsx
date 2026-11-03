import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import DriverForm from "../components/DriverForm.jsx";
import { fmtDate } from "../lib/format.js";

const sel = "rounded-full border border-input bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

// The taxi counterpart of Employees: one tile per driver.
export default function TaxiDrivers() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cars, setCars] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Active");

  const load = useCallback(async () => {
    try {
      const [d, v] = await Promise.all([api("taxi/driver-profiles"), api("taxi/vehicles")]);
      setData(d.drivers); setCars(v.vehicles);
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter((d) => (status === "All" || d.status === status) && (!t || [d.name, d.mobile, d.licence_no].some((v) => (v || "").toLowerCase().includes(t))));
  }, [data, q, status]);
  const carsOf = (id) => cars.filter((c) => c.driver_id === id).map((c) => c.code.slice(-4));

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold italic">Drivers</h1>
          {data && <p className="text-muted-foreground mt-1">{data.filter((d) => d.active).length} active driver{data.filter((d) => d.active).length === 1 ? "" : "s"}</p>}
        </div>
        <button onClick={() => setForm(true)} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">+ NEW DRIVER</button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {["Active", "Left", "All"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.toUpperCase()}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, licence…" aria-label="Search drivers" className={`${sel} w-full sm:w-72`} />
      </div>

      {data && list.length === 0 && (
        <div className="bg-card rounded-2xl shadow-card border border-border p-10 text-center text-muted-foreground">
          {data.length === 0 ? "No drivers yet. Click “New driver” to add the first one." : "No drivers match these filters."}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <Link key={d.id} to={`/business/taxi/drivers/${d.id}`} className="bg-card rounded-2xl shadow-card border border-border p-5 flex gap-4 items-center hover:shadow-lg hover:-translate-y-0.5 transition">
            <Avatar name={d.name} src={d.photo_id ? `/api/taxi/driver-documents/${d.photo_id}` : undefined} size={64} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{d.name}</div>
              <div className="text-sm text-muted-foreground">{d.join_date ? `Joined ${fmtDate(d.join_date)}` : "Joining date not set"}</div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                {!d.active && <span className="rounded-full bg-muted px-2 py-0.5 font-bold tracking-wider">LEFT</span>}
                {carsOf(d.id).map((c) => <span key={c} className="rounded-full bg-primary/15 text-primary px-2 py-0.5 font-bold tracking-wider">CAR {c}</span>)}
                <span className="text-muted-foreground">{d.doc_count} document{d.doc_count === 1 ? "" : "s"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {form && <DriverForm onClose={() => setForm(false)} onSaved={(id) => navigate(`/business/taxi/drivers/${id}`)} />}
    </div>
  );
}
