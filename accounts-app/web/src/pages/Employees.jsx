import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import EmployeeForm from "../components/EmployeeForm.jsx";
import { businessBySlug } from "../lib/businesses.js";
import { fmtDate, money } from "../lib/format.js";

export default function Employees() {
  const navigate = useNavigate();
  const { slug } = useParams();                 // inside a business workspace the list is only that business
  const only = slug ? businessBySlug(slug)?.name : null;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Active");
  const [business, setBusiness] = useState(only ?? "");

  const load = useCallback(async () => {
    try {
      setData(await api("employees"));
    } catch (err) {
      setError(err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.employees ?? []).filter((e) =>
      (status === "All" || e.status === status) &&
      (!business || e.business === business) &&
      (!t || [e.full_name, e.phone, e.designation, e.business].some((v) => v.toLowerCase().includes(t))));
  }, [data, q, status, business]);

  const active = (data?.employees ?? []).filter((e) => e.status === "Active" && (!only || e.business === only));
  const payroll = active.reduce((a, e) => a + e.monthly_salary, 0);
  const sel = "rounded-full border border-input bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold italic">Employees</h1>
          {data && <p className="text-muted-foreground mt-1">{active.length} active · monthly salaries {money(payroll)}</p>}
        </div>
        <button onClick={() => setForm(true)} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">+ NEW EMPLOYEE</button>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {["Active", "Left", "All"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.toUpperCase()}</button>
          ))}
        </div>
        {!only && <select value={business} onChange={(e) => setBusiness(e.target.value)} className={sel} aria-label="Filter by business">
          <option value="">All businesses</option>
          {(data?.businesses ?? []).map((b) => <option key={b}>{b}</option>)}
        </select>}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, mobile, designation…" aria-label="Search employees" className={`${sel} w-full sm:w-72`} />
      </div>

      {data && list.length === 0 && (
        <div className="bg-card rounded-2xl shadow-card border border-border p-10 text-center text-muted-foreground">
          {data.employees.length === 0 ? "No employees yet. Click “New employee” to add the first one." : "No employees match these filters."}
        </div>
      )}

      {data && list.length > 0 && (
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>{["", "NAME", "BUSINESS", "DESIGNATION", "MOBILE", "JOINED", "MONTHLY SALARY", "DOCS", "STATUS"].map((h, i) => <th key={i} className={`text-[11px] font-semibold tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap ${h === "MONTHLY SALARY" ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/60 cursor-pointer" onClick={() => navigate(`/admin/employees/${e.id}`)}>
                    <td className="pl-4 pr-1 py-2.5"><Avatar name={e.full_name} photoId={e.photo_id} size={40} /></td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap"><Link to={`/admin/employees/${e.id}`} className="hover:text-primary hover:underline" onClick={(ev) => ev.stopPropagation()}>{e.full_name}</Link></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{e.business}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{e.designation || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{e.phone || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{e.join_date ? fmtDate(e.join_date) : "—"}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold">{money(e.monthly_salary)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{e.doc_count}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{e.status === "Left" ? <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider">LEFT{e.leave_date ? ` · ${fmtDate(e.leave_date, false)}` : ""}</span> : <span className="text-xs font-bold tracking-wider text-primary">ACTIVE</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form && data && <EmployeeForm businesses={data.businesses} defaultBusiness={only ?? undefined} onClose={() => setForm(false)} onSaved={(id) => navigate(`/admin/employees/${id}`)} />}
    </div>
  );
}
