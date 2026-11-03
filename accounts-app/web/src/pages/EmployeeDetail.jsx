import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../base.js";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import AttendancePie from "../components/AttendancePie.jsx";
import EmployeeForm from "../components/EmployeeForm.jsx";
import { fmtAadhaar, fmtAddress, fmtDate, money, tenure, todayIST, yearsSince } from "../lib/format.js";
import { prepareUpload } from "../lib/image.js";

const CORE = ["Photo", "Aadhaar", "Electricity bill"]; // always shown, with a "missing" hint
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Fact({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">{label.toUpperCase()}</div>
      <div className="mt-0.5">{children || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-card rounded-2xl shadow-card border border-border p-6">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">{children}</div>
    </section>
  );
}

function DocRow({ type, docs, empId, onChanged, setError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareUpload(file);
      const form = new FormData();
      form.append("doc_type", type);
      form.append("file", prepared);
      await api(`employees/${empId}/documents`, { method: "POST", body: form });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.doc_type} “${d.original_name}”?`)) return;
    try {
      await api(`employees/documents/${d.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-semibold">
          {type}
          {docs.length === 0 && CORE.includes(type) && <span className="ml-2 text-xs font-bold tracking-wider text-primary">MISSING</span>}
        </div>
        <button onClick={() => input.current?.click()} disabled={busy} className="px-4 py-1.5 rounded-full border border-primary text-primary text-xs font-bold tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60">
          {busy ? "UPLOADING…" : type === "Photo" && docs.length ? "REPLACE" : "+ UPLOAD"}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={upload} />
      </div>
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {docs.map((d) => (
            <div key={d.id} className="w-36">
              <a href={`${API_BASE}employees/documents/${d.id}`} target="_blank" rel="noreferrer" className="block h-28 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                {d.mime.startsWith("image/") ? <img src={`${API_BASE}employees/documents/${d.id}`} alt={d.doc_type} className="w-full h-full object-cover" /> : <span className="font-bold tracking-widest text-muted-foreground">PDF</span>}
              </a>
              <div className="text-xs mt-1 truncate" title={d.original_name}>{d.original_name}</div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{kb(d.size)}</span>
                <button onClick={() => remove(d)} className="font-bold tracking-wider text-destructive hover:underline">DELETE</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const shiftMonth = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });

function AttendanceCard({ empId }) {
  const thisMonth = todayIST().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [mine, setMine] = useState(undefined); // undefined = loading, null = not working that month
  useEffect(() => {
    let live = true; // ignore the reply if the month changed again meanwhile
    setMine(undefined);
    api(`attendance/month?month=${month}`)
      .then((d) => live && setMine(d.employees.find((e) => e.id === Number(empId)) ?? null))
      .catch(() => live && setMine(null));
    return () => { live = false; };
  }, [month, empId]);
  const btn = "w-9 h-9 rounded-full border border-border font-bold hover:bg-muted disabled:opacity-40";
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <button className={btn} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="font-display text-lg font-bold italic w-40 text-center">{monthLabel(month)}</span>
        <button className={btn} onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">›</button>
      </div>
      {mine === undefined ? <p className="text-muted-foreground">Loading…</p> : mine === null ? (
        <div className="bg-card rounded-2xl shadow-card border border-border p-8 text-center text-muted-foreground">Not working in {monthLabel(month)}.</div>
      ) : <AttendancePie employees={[mine]} subtitle={`Days · ${monthLabel(month)}`} />}
    </section>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api(`employees/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const removeEmployee = async () => {
    if (!window.confirm(`Delete ${data.employee.full_name} and all their uploaded documents? This cannot be undone.`)) return;
    try {
      await api(`employees/${id}`, { method: "DELETE" });
      navigate("/admin/employees");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!data) return <div className="max-w-6xl">{error ? <p role="alert" className="text-destructive">{error}</p> : <p className="text-muted-foreground">Loading…</p>}</div>;

  const e = data.employee;
  const byType = (t) => data.documents.filter((d) => d.doc_type === t);
  const photo = byType("Photo")[0];
  const otherTypes = data.doc_types.filter((t) => !CORE.includes(t));

  return (
    <div className="max-w-6xl">
      <Link to="/admin/employees" className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← ALL EMPLOYEES</Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mt-3 mb-8">
        <div className="flex items-center gap-5">
          <Avatar name={e.full_name} photoId={photo?.id} size={96} />
          <div>
            <h1 className="font-display text-4xl font-bold italic">{e.full_name}</h1>
            <p className="text-muted-foreground mt-1">
              {[e.designation, e.business].filter(Boolean).join(" · ") || "—"}
              {e.status === "Left" && <span className="ml-3 rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider text-foreground">LEFT</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEdit(true)} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90">EDIT</button>
          <button onClick={removeEmployee} className="px-6 py-3 rounded-full border border-destructive text-destructive font-bold text-sm tracking-wider hover:bg-destructive hover:text-destructive-foreground transition-colors">DELETE</button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="PERSONAL">
          <Fact label="Father's name">{e.father_name}</Fact>
          <Fact label="Date of birth">{e.dob && `${fmtDate(e.dob)} (${yearsSince(e.dob)} yrs)`}</Fact>
          <Fact label="Gender">{e.gender}</Fact>
          <Fact label="Blood group">{e.blood_group}</Fact>
          <Fact label="Mobile"><a href={`tel:${e.phone}`} className="text-primary font-semibold">{e.phone}</a></Fact>
          <Fact label="Alternate number">{e.alt_phone}</Fact>
          <Fact label="Aadhaar">{fmtAadhaar(e.aadhaar_no)}</Fact>
          <div className="col-span-2"><Fact label="Current address">{fmtAddress(e.address, e.city, e.state, e.pincode)}</Fact></div>
          <div className="col-span-2"><Fact label="Permanent address">{fmtAddress(e.perm_address, e.perm_city, e.perm_state, e.perm_pincode)}</Fact></div>
        </Card>

        <Card title="WORK">
          <Fact label="Business">{e.business}</Fact>
          <Fact label="Designation">{e.designation}</Fact>
          <Fact label="Joined">{e.join_date && `${fmtDate(e.join_date)} · ${tenure(e.join_date, e.status === "Left" ? e.leave_date : "")}`}</Fact>
          <Fact label="Left on">{e.leave_date && fmtDate(e.leave_date)}</Fact>
          <Fact label="Monthly salary">{e.monthly_salary > 0 && <span className="font-bold">{money(e.monthly_salary)}</span>}</Fact>
          <Fact label="Status">{e.status}</Fact>
        </Card>

        <Card title="BANK (FOR SALARY)">
          <Fact label="Bank">{e.bank_name}</Fact>
          <Fact label="Account number">{e.bank_account}</Fact>
          <Fact label="IFSC">{e.ifsc}</Fact>
        </Card>

        <Card title="EMERGENCY CONTACT">
          <Fact label="Name">{e.emergency_name}</Fact>
          <Fact label="Relation">{e.emergency_relation}</Fact>
          <Fact label="Mobile">{e.emergency_phone && <a href={`tel:${e.emergency_phone}`} className="text-primary font-semibold">{e.emergency_phone}</a>}</Fact>
        </Card>
      </div>

      {e.notes && (
        <section className="bg-card rounded-2xl shadow-card border border-border p-6 mb-6">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">NOTES</h2>
          <p className="text-sm whitespace-pre-wrap">{e.notes}</p>
        </section>
      )}

      <AttendanceCard empId={id} />

      <section className="bg-card rounded-2xl shadow-card border border-border p-6">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">DOCUMENTS</h2>
        <p className="text-sm text-muted-foreground mb-4">JPG, PNG, WEBP or PDF. Photos are shrunk automatically. Only you can see these.</p>
        <div className="divide-y divide-border">
          {[...CORE, ...otherTypes].map((t) => (
            <DocRow key={t} type={t} docs={byType(t)} empId={id} onChanged={load} setError={setError} />
          ))}
        </div>
      </section>

      {edit && <EmployeeForm employee={e} businesses={data.businesses} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); load(); }} />}
    </div>
  );
}
