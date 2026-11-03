import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../base.js";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import DriverForm from "../components/DriverForm.jsx";
import { fmtAadhaar, fmtAddress, fmtDate, money, tenure, yearsSince } from "../lib/format.js";
import { prepareUpload } from "../lib/image.js";

const CORE = ["Photo", "Driving licence", "Aadhaar"];
const kb = (n) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const daysLeft = (iso) => Math.round((Date.parse(iso) - Date.parse(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }))) / 86400000);

function Card({ title, children }) {
  return (
    <section className="bg-card rounded-2xl shadow-card border border-border p-6 break-inside-avoid">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-4">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</dl>
    </section>
  );
}
const Fact = ({ label, children }) => (
  <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold text-sm break-words">{children || <span className="text-muted-foreground font-normal">—</span>}</dd></div>
);

function DocRow({ type, docs, driverId, onChanged, setError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.append("doc_type", type);
      form.append("file", await prepareUpload(file));
      await api(`taxi/driver-profiles/${driverId}/documents`, { method: "POST", body: form });
      onChanged();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.doc_type} “${d.original_name}”?`)) return;
    try { await api(`taxi/driver-documents/${d.id}`, { method: "DELETE" }); onChanged(); } catch (err) { setError(err.message); }
  };
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-semibold">{type}{docs.length === 0 && CORE.includes(type) && <span className="ml-2 text-xs font-bold tracking-wider text-primary">MISSING</span>}</div>
        <button onClick={() => input.current?.click()} disabled={busy} className="px-4 py-1.5 rounded-full border border-primary text-primary text-xs font-bold tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60">
          {busy ? "UPLOADING…" : type === "Photo" && docs.length ? "REPLACE" : "+ UPLOAD"}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={upload} aria-label={`Upload ${type}`} />
      </div>
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {docs.map((d) => (
            <div key={d.id} className="w-40">
              <a href={`${API_BASE}taxi/driver-documents/${d.id}`} target="_blank" rel="noreferrer" className="block h-28 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                {d.mime.startsWith("image/") ? <img src={`${API_BASE}taxi/driver-documents/${d.id}`} alt={d.doc_type} className="w-full h-full object-cover" /> : <span className="font-bold tracking-widest text-muted-foreground">PDF</span>}
              </a>
              <div className="text-xs mt-1 truncate" title={d.original_name}>{d.original_name}</div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{kb(d.size)}</span>
                <span>
                  <a href={`${API_BASE}taxi/driver-documents/${d.id}?download=1`} className="font-bold tracking-wider text-primary hover:underline mr-2">DOWNLOAD</a>
                  <button onClick={() => remove(d)} className="font-bold tracking-wider text-destructive hover:underline">DELETE</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaxiDriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api(`taxi/driver-profiles/${id}`)); } catch (err) { setError(err.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const removeDriver = async () => {
    const name = data.driver.name;
    if (!window.confirm(`Remove ${name}? If they have entries or payments on record those are kept and they are marked as left; otherwise the driver and their documents are deleted.`)) return;
    try {
      const r = await api(`taxi/drivers/${id}`, { method: "DELETE" });
      if (r.deactivated) { setError(""); load(); } else navigate("/business/taxi/drivers");
    } catch (err) { setError(err.message); }
  };

  // PDF = the browser's "Save as PDF" on a clean print layout; the title becomes the file name
  const printDetails = () => {
    const prev = document.title;
    document.title = `Driver ${data.driver.name}`;
    const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  if (!data) return <div className="max-w-6xl">{error ? <p role="alert" className="text-destructive">{error}</p> : <p className="text-muted-foreground">Loading…</p>}</div>;
  const d = data.driver;
  const byType = (t) => data.documents.filter((x) => x.doc_type === t);
  const photo = byType("Photo")[0];
  const otherTypes = data.doc_types.filter((t) => !CORE.includes(t));
  const lic = d.licence_expiry ? daysLeft(d.licence_expiry) : null;
  const btn = "px-5 py-3 rounded-full font-bold text-sm tracking-wider";

  return (
    <div className="max-w-6xl">
      <Link to="/business/taxi/drivers" className="print:hidden text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← ALL DRIVERS</Link>
      <div className="hidden print:block text-center border-b-2 border-primary pb-3 mb-6">
        <div className="text-2xl font-bold text-primary tracking-widest">THE POOJA GROUP</div>
        <div className="text-lg font-bold">Pooja Taxi Services · Driver details</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mt-3 mb-8">
        <div className="flex items-center gap-5">
          <Avatar name={d.name} src={photo ? `${API_BASE}taxi/driver-documents/${photo.id}` : undefined} size={96} />
          <div>
            <h1 className="font-display text-4xl font-bold italic">{d.name}</h1>
            <p className="text-muted-foreground mt-1">
              Driver · Pooja Taxi Services
              {!d.active && <span className="ml-3 rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tracking-wider text-foreground">LEFT</span>}
            </p>
          </div>
        </div>
        <div className="print:hidden flex flex-wrap gap-3">
          <button onClick={() => setEdit(true)} className={`${btn} bg-primary text-primary-foreground hover:opacity-90`}>EDIT</button>
          <button onClick={printDetails} className={`${btn} border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors`}>DOWNLOAD DETAILS (PDF)</button>
          {data.documents.length > 0 && <a href={`${API_BASE}taxi/driver-profiles/${id}/documents.zip`} className={`${btn} border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors`}>DOWNLOAD DOCUMENTS (ZIP)</a>}
          <button onClick={removeDriver} className={`${btn} border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors`}>REMOVE</button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
      {lic !== null && lic <= 30 && d.active && (
        <p className="mb-4 rounded-xl border border-primary bg-primary/10 text-primary font-semibold text-sm px-4 py-3">{lic < 0 ? `Driving licence expired ${-lic} day${lic === -1 ? "" : "s"} ago (${fmtDate(d.licence_expiry)}).` : `Driving licence expires in ${lic} day${lic === 1 ? "" : "s"} (${fmtDate(d.licence_expiry)}).`}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="PERSONAL">
          <Fact label="Father's name">{d.father_name}</Fact>
          <Fact label="Date of birth">{d.dob && `${fmtDate(d.dob)} (${yearsSince(d.dob)} yrs)`}</Fact>
          <Fact label="Gender">{d.gender}</Fact>
          <Fact label="Blood group">{d.blood_group}</Fact>
          <Fact label="Mobile">{d.mobile && <a href={`tel:${d.mobile}`} className="text-primary">{d.mobile}</a>}</Fact>
          <Fact label="Alternate number">{d.alt_phone}</Fact>
          <Fact label="Aadhaar">{fmtAadhaar(d.aadhaar_no)}</Fact>
          <div className="col-span-2"><Fact label="Current address">{fmtAddress(d.address, d.city, d.state, d.pincode)}</Fact></div>
          <div className="col-span-2"><Fact label="Permanent address">{fmtAddress(d.perm_address, d.perm_city, d.perm_state, d.perm_pincode)}</Fact></div>
        </Card>

        <Card title="LICENCE">
          <Fact label="Driving licence no.">{d.licence_no}</Fact>
          <Fact label="Valid until">{d.licence_expiry && <span className={lic !== null && lic < 0 ? "text-destructive" : lic !== null && lic <= 30 ? "text-primary" : ""}>{fmtDate(d.licence_expiry)}</span>}</Fact>
          <Fact label="Taxi badge no.">{d.badge_no}</Fact>
        </Card>

        <Card title="WORK">
          <Fact label="Joined">{d.join_date && `${fmtDate(d.join_date)} · ${tenure(d.join_date, d.active ? "" : d.leave_date)}`}</Fact>
          <Fact label="Left on">{d.leave_date && fmtDate(d.leave_date)}</Fact>
          <Fact label="Share of daily earning">{`${d.share_pct}%`}</Fact>
          <Fact label="Drives">{data.cars.length ? data.cars.map((c) => c.code.slice(-4)).join(", ") : ""}</Fact>
          <Fact label="Balance due (all time)">{data.money && <span className="font-bold">{money(data.money.balance)}</span>}</Fact>
          <Fact label="This month">{data.money && `${data.money.month_days} day${data.money.month_days === 1 ? "" : "s"} · earned ${money(data.money.month_share)}`}</Fact>
        </Card>

        <Card title="BANK (FOR PAYMENT)">
          <Fact label="Bank">{d.bank_name}</Fact>
          <Fact label="Account number">{d.bank_account}</Fact>
          <Fact label="IFSC">{d.ifsc}</Fact>
        </Card>

        <Card title="EMERGENCY CONTACT">
          <Fact label="Name">{d.emergency_name}</Fact>
          <Fact label="Relation">{d.emergency_relation}</Fact>
          <Fact label="Mobile">{d.emergency_phone && <a href={`tel:${d.emergency_phone}`} className="text-primary">{d.emergency_phone}</a>}</Fact>
        </Card>
      </div>

      {d.notes && (
        <section className="bg-card rounded-2xl shadow-card border border-border p-6 mb-6">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">NOTES</h2>
          <p className="text-sm whitespace-pre-wrap">{d.notes}</p>
        </section>
      )}

      <section className="print:hidden bg-card rounded-2xl shadow-card border border-border p-6">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">DOCUMENTS</h2>
        <p className="text-sm text-muted-foreground mb-4">JPG, PNG, WEBP or PDF. Photos are shrunk automatically. Only you can see these. Use Download on any file, or “Download documents (zip)” above for all of them.</p>
        <div className="divide-y divide-border">
          {[...CORE, ...otherTypes].map((t) => <DocRow key={t} type={t} docs={byType(t)} driverId={id} onChanged={load} setError={setError} />)}
        </div>
      </section>

      {edit && <DriverForm driver={d} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); load(); }} />}
    </div>
  );
}
