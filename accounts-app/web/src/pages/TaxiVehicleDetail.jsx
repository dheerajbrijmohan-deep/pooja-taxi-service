import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../base.js";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import DueList from "../components/DueList.jsx";
import FormModal from "../components/FormModal.jsx";
import { fmtDate, money, todayIST } from "../lib/format.js";
import { prepareUpload } from "../lib/image.js";

const TABS = ["DETAILS", "DOCUMENTS", "SERVICE", "ACCIDENTS"];
const FUELS = ["CNG", "Petrol", "Diesel", "Electric", "CNG + Petrol"];
const daysLeft = (iso) => Math.round((Date.parse(iso) - Date.parse(todayIST())) / 86400000);

function Expiry({ iso }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const n = daysLeft(iso);
  const cls = n < 0 ? "text-destructive font-semibold" : n <= 30 ? "text-primary font-semibold" : "";
  return <span className={cls}>{fmtDate(iso)}{n < 0 ? " · expired" : n <= 30 ? ` · ${n} day${n === 1 ? "" : "s"} left` : ""}</span>;
}

const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-3 py-3 whitespace-nowrap";
const td = "px-3 py-3 align-top";
const link = "text-xs font-bold tracking-wider text-primary hover:underline";
const pill = "px-5 py-2.5 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors";

export default function TaxiVehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [d, setD] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [tab, setTab] = useState("DETAILS");
  const [modal, setModal] = useState(null); // {kind, item?}
  const [error, setError] = useState("");
  const latest = useRef(0);

  const load = useCallback(async () => {
    const token = ++latest.current;
    try {
      const [x, dr] = await Promise.all([api(`taxi/vehicles/${id}`), api("taxi/drivers")]);
      if (token !== latest.current) return;
      setD(x); setDrivers(dr.drivers); setError("");
    } catch (err) {
      if (token === latest.current) setError(err.message);
    }
  }, [id]);
  useEffect(() => { setD(null); load(); }, [load]);

  const del = async (url, what) => {
    if (!window.confirm(`Delete this ${what}?`)) return;
    try { await api(url, { method: "DELETE" }); load(); } catch (err) { setError(err.message); }
  };

  if (error && !d) return <p role="alert" className="text-destructive">{error}</p>;
  if (!d) return <p className="text-muted-foreground">Loading…</p>;
  const v = d.vehicle;
  const dName = (i) => drivers.find((x) => x.id === i)?.name ?? "";
  const close = () => setModal(null);
  const done = () => { close(); load(); };

  // ---- form definitions ----
  const docFields = (edit) => [
    ...(edit ? [] : [{ key: "doc_type", label: "Document", type: "select", options: d.doc_types, required: true }]),
    { key: "doc_number", label: "Number", type: "text", placeholder: "Policy / certificate no." },
    { key: "issued_on", label: "Issued on", type: "date" },
    { key: "expires_on", label: "Valid until / next due", type: "date", hint: "Leave empty for papers that do not expire. A renewal replaces the old expiry in the reminders." },
    { key: "notes", label: "Notes", type: "text", span: 2 },
    ...(edit ? [] : [{ key: "file", label: "File (photo or PDF, up to 5 MB)", type: "file", required: true }]),
  ];
  const serviceFields = [
    { key: "service_date", label: "Date", type: "date", required: true, max: todayIST() },
    { key: "kind", label: "Type of service", type: "select", options: d.service_kinds, required: true },
    { key: "odometer_km", label: "Odometer (km)", type: "number", step: "0.1", hint: d.odometer != null ? `Latest known: ${Math.round(d.odometer).toLocaleString("en-IN")} km` : "" },
    { key: "cost", label: "Cost ₹", type: "number", step: "0.01" },
    { key: "vendor", label: "Garage / vendor", type: "text" },
    { key: "description", label: "What was done", type: "text" },
    { key: "next_due_date", label: "Next due on", type: "date" },
    { key: "next_due_km", label: "Next due at (km)", type: "number", step: "0.1" },
  ];
  const accidentFields = [
    { key: "accident_date", label: "Date", type: "date", required: true, max: todayIST() },
    { key: "driver_id", label: "Driver", type: "select", optional: true, options: drivers.map((x) => [String(x.id), x.name]) },
    { key: "location", label: "Where", type: "text", span: 2 },
    { key: "description", label: "What happened", type: "textarea", required: true },
    { key: "damage", label: "Damage", type: "text", span: 2, placeholder: "e.g. back right door, rear light cover" },
    { key: "repair_cost", label: "Repair cost ₹", type: "number", step: "0.01" },
    { key: "insurance_claim", label: "Insurance claim", type: "select", options: d.claims },
    { key: "claim_amount", label: "Claim amount ₹", type: "number", step: "0.01", show: (x) => x.insurance_claim !== "None" },
    { key: "status", label: "Repair status", type: "select", options: d.accident_statuses },
    { key: "repaired_on", label: "Repaired on", type: "date", show: (x) => x.status === "Repaired" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];
  const detailFields = [
    { key: "make", label: "Make", type: "text", placeholder: "Maruti Suzuki / Honda" },
    { key: "fuel_type", label: "Fuel", type: "select", options: FUELS },
    { key: "color", label: "Colour", type: "text" },
    { key: "mfg_year", label: "Year of manufacture", type: "number", step: "1" },
    { key: "reg_date", label: "Registration date", type: "date" },
    { key: "owner_name", label: "Registered owner", type: "text" },
    { key: "chassis_no", label: "Chassis no.", type: "text" },
    { key: "engine_no", label: "Engine no.", type: "text" },
    { key: "purchase_date", label: "Purchase date", type: "date" },
    { key: "purchase_price", label: "Purchase price ₹", type: "number", step: "0.01" },
    { key: "account_name", label: "Owner account sheet name", type: "text", placeholder: "e.g. Jiju's Account", hint: "Gives this car a tab with its own account sheet. Leave empty for none." },
    { key: "deposit_to", label: "Profit is deposited to", type: "text", placeholder: "e.g. Edura Consulting Account" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];
  const nums = (o, keys) => { const r = { ...o }; keys.forEach((k) => { r[k] = o[k] === "" || o[k] == null ? null : Number(o[k]); }); return r; };
  const prefill = (o, keys) => Object.fromEntries(Object.entries(o).map(([k, val]) => [k, keys.includes(k) ? (val == null ? "" : String(val)) : val ?? ""]));

  const Row = ({ label, children }) => <div className="flex justify-between gap-4 py-2 border-b border-border text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right">{children || "—"}</span></div>;

  return (
    <div className="max-w-6xl">
      <Link to="/business/taxi/vehicles" className="text-xs font-semibold tracking-widest text-muted-foreground hover:text-primary">← ALL VEHICLES</Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold italic">{v.code.slice(-4)} <span className="text-2xl not-italic font-normal text-muted-foreground">{[v.make, v.model].filter(Boolean).join(" ")}</span></h1>
          <div className="text-sm text-muted-foreground mt-1">{v.code}{!v.active && " · inactive"} · {d.odometer != null ? `${Math.round(d.odometer).toLocaleString("en-IN")} km on the clock` : "odometer not known yet"}</div>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}

      <div className="bg-card rounded-2xl shadow-card border border-border p-6 mb-6">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">OVERDUE &amp; DUE SOON</h2>
        <DueList items={d.due} showVehicle={false} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-full font-bold text-sm tracking-wider border ${tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {t}{t === "DOCUMENTS" ? ` (${d.documents.length})` : t === "SERVICE" ? ` (${d.services.length})` : t === "ACCIDENTS" ? ` (${d.accidents.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "DETAILS" && (
        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">VEHICLE DETAILS</h2>
            {isAdmin && <button className={link} onClick={() => setModal({ kind: "details" })}>EDIT</button>}
          </div>
          <div className="grid md:grid-cols-2 gap-x-10">
            <div>
              <Row label="Registration no.">{v.code}</Row><Row label="Make">{v.make}</Row><Row label="Model">{v.model}</Row><Row label="Fuel">{v.fuel_type}</Row><Row label="Colour">{v.color}</Row>
              <Row label="Year">{v.mfg_year}</Row><Row label="Registered on">{v.reg_date && fmtDate(v.reg_date)}</Row>
            </div>
            <div>
              <Row label="Registered owner">{v.owner_name}</Row><Row label="Chassis no.">{v.chassis_no}</Row><Row label="Engine no.">{v.engine_no}</Row>
              <Row label="Purchased on">{v.purchase_date && fmtDate(v.purchase_date)}</Row><Row label="Purchase price">{v.purchase_price != null && money(v.purchase_price)}</Row>
              <Row label="EMI per day">{money(v.emi_per_day)}</Row><Row label="Owner account sheet">{v.account_name}</Row><Row label="Profit deposited to">{v.deposit_to}</Row><Row label="Notes">{v.notes}</Row>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Registration number, model and EMI are changed under “Setup” on the Taxi dashboard.</p>
        </div>
      )}

      {tab === "DOCUMENTS" && (
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">DOCUMENTS</h2>
            {isAdmin && <button className={pill} onClick={() => setModal({ kind: "doc" })}>+ UPLOAD DOCUMENT</button>}
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["FILE", "DOCUMENT", "NUMBER", "ISSUED", "VALID UNTIL", "NOTES", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {d.documents.map((x) => (
                <tr key={x.id} className="hover:bg-muted/60">
                  <td className={td}><a href={`${API_BASE}taxi/vehicle-documents/${x.id}`} target="_blank" rel="noreferrer" className="block w-16 h-12 rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center">
                    {x.mime.startsWith("image/") ? <img src={`${API_BASE}taxi/vehicle-documents/${x.id}`} alt={x.doc_type} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold tracking-widest text-muted-foreground">PDF</span>}
                  </a></td>
                  <td className={`${td} font-semibold`}>{x.doc_type}</td>
                  <td className={td}>{x.doc_number || "—"}</td>
                  <td className={`${td} whitespace-nowrap`}>{x.issued_on ? fmtDate(x.issued_on) : "—"}</td>
                  <td className={`${td} whitespace-nowrap`}><Expiry iso={x.expires_on} /></td>
                  <td className={`${td} min-w-32`}>{x.notes}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <a href={`${API_BASE}taxi/vehicle-documents/${x.id}`} target="_blank" rel="noreferrer" className={`${link} mr-3`}>VIEW</a>
                    {isAdmin && <><button className={`${link} mr-3`} onClick={() => setModal({ kind: "docEdit", item: x })}>EDIT</button><button className="text-xs font-bold tracking-wider text-destructive hover:underline" onClick={() => del(`taxi/vehicle-documents/${x.id}`, `${x.doc_type} document`)}>DELETE</button></>}
                  </td>
                </tr>
              ))}
              {d.documents.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No documents yet.{isAdmin ? " Upload the RC, insurance, PUC, fitness and so on." : ""}</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      {tab === "SERVICE" && (
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">SERVICE HISTORY · {money(d.services.reduce((a, s) => a + s.cost, 0))} TOTAL</h2>
            <button className={pill} onClick={() => setModal({ kind: "service" })}>+ ADD SERVICE</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["DATE", "TYPE", "ODOMETER", "COST", "GARAGE", "WHAT WAS DONE", "NEXT DUE", ""].map((h, i) => <th key={i} className={`${th} ${h === "COST" || h === "ODOMETER" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {d.services.map((x) => (
                <tr key={x.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(x.service_date)}</td>
                  <td className={`${td} font-semibold`}>{x.kind}</td>
                  <td className={`${td} text-right whitespace-nowrap`}>{x.odometer_km != null ? `${Math.round(x.odometer_km).toLocaleString("en-IN")} km` : "—"}</td>
                  <td className={`${td} text-right whitespace-nowrap font-bold`}>{money(x.cost)}</td>
                  <td className={td}>{x.vendor || "—"}</td>
                  <td className={`${td} min-w-40`}>{x.description}</td>
                  <td className={`${td} whitespace-nowrap`}>{x.next_due_date ? <Expiry iso={x.next_due_date} /> : ""}{x.next_due_date && x.next_due_km != null ? <br /> : ""}{x.next_due_km != null ? `${Math.round(x.next_due_km).toLocaleString("en-IN")} km` : ""}{!x.next_due_date && x.next_due_km == null ? "—" : ""}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button className={`${link} mr-3`} onClick={() => setModal({ kind: "service", item: x })}>EDIT</button>
                    {isAdmin && <button className="text-xs font-bold tracking-wider text-destructive hover:underline" onClick={() => del(`taxi/vehicle-services/${x.id}`, "service record")}>DELETE</button>}
                  </td>
                </tr>
              ))}
              {d.services.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No service recorded yet. Add one with its next due date or km and it will show in the reminders.</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      {tab === "ACCIDENTS" && (
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">ACCIDENTS &amp; DAMAGE · {money(d.accidents.reduce((a, s) => a + s.repair_cost, 0))} REPAIR COST</h2>
            <button className={pill} onClick={() => setModal({ kind: "accident" })}>+ LOG ACCIDENT</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted"><tr>{["DATE", "DRIVER", "WHAT HAPPENED", "DAMAGE", "REPAIR COST", "INSURANCE", "STATUS", ""].map((h, i) => <th key={i} className={`${th} ${h === "REPAIR COST" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {d.accidents.map((x) => (
                <tr key={x.id} className="hover:bg-muted/60">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(x.accident_date)}</td>
                  <td className={td}>{x.driver_id ? dName(x.driver_id) : "—"}</td>
                  <td className={`${td} min-w-48`}>{x.description}{x.location && <div className="text-xs text-muted-foreground">{x.location}</div>}</td>
                  <td className={`${td} min-w-32`}>{x.damage || "—"}</td>
                  <td className={`${td} text-right whitespace-nowrap font-bold`}>{money(x.repair_cost)}</td>
                  <td className={`${td} whitespace-nowrap`}>{x.insurance_claim === "None" ? "—" : `${x.insurance_claim}${x.claim_amount ? ` · ${money(x.claim_amount)}` : ""}`}</td>
                  <td className={td}><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider ${x.status === "Open" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{x.status.toUpperCase()}</span>{x.repaired_on && <div className="text-xs text-muted-foreground mt-1">{fmtDate(x.repaired_on, false)}</div>}</td>
                  <td className={`${td} whitespace-nowrap text-right`}>
                    <button className={`${link} mr-3`} onClick={() => setModal({ kind: "accident", item: x })}>EDIT</button>
                    {isAdmin && <button className="text-xs font-bold tracking-wider text-destructive hover:underline" onClick={() => del(`taxi/vehicle-accidents/${x.id}`, "accident record")}>DELETE</button>}
                  </td>
                </tr>
              ))}
              {d.accidents.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No accidents recorded.</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      {modal?.kind === "details" && (
        <FormModal title="Vehicle details" fields={detailFields} initial={prefill(v, ["mfg_year", "purchase_price"])} onClose={close}
          onSubmit={async (x) => { await api(`taxi/vehicles/${id}/details`, { method: "PUT", body: nums(x, ["mfg_year", "purchase_price"]) }); done(); }} />
      )}
      {modal?.kind === "doc" && (
        <FormModal title="Upload document" fields={docFields(false)} submitLabel="UPLOAD" onClose={close}
          onSubmit={async (x) => {
            const form = new FormData();
            ["doc_type", "doc_number", "issued_on", "expires_on", "notes"].forEach((k) => form.append(k, x[k] ?? ""));
            form.append("file", await prepareUpload(x.file));
            await api(`taxi/vehicles/${id}/documents`, { method: "POST", body: form }); done();
          }} />
      )}
      {modal?.kind === "docEdit" && (
        <FormModal title={`Edit ${modal.item.doc_type}`} fields={docFields(true)} initial={prefill(modal.item, [])} onClose={close}
          onSubmit={async (x) => { await api(`taxi/vehicle-documents/${modal.item.id}`, { method: "PUT", body: x }); done(); }} />
      )}
      {modal?.kind === "service" && (
        <FormModal title={modal.item ? "Edit service" : "Add service"} fields={serviceFields} initial={modal.item ? prefill(modal.item, ["odometer_km", "cost", "next_due_km"]) : { service_date: todayIST() }} onClose={close}
          onSubmit={async (x) => { const body = nums(x, ["odometer_km", "next_due_km"]); body.cost = Number(x.cost) || 0; await api(modal.item ? `taxi/vehicle-services/${modal.item.id}` : `taxi/vehicles/${id}/services`, { method: modal.item ? "PUT" : "POST", body }); done(); }} />
      )}
      {modal?.kind === "accident" && (
        <FormModal title={modal.item ? "Edit accident" : "Log accident"} fields={accidentFields} initial={modal.item ? prefill(modal.item, ["driver_id", "repair_cost", "claim_amount"]) : { accident_date: todayIST() }} onClose={close}
          onSubmit={async (x) => { const body = { ...x, repair_cost: Number(x.repair_cost) || 0, claim_amount: x.insurance_claim === "None" ? 0 : Number(x.claim_amount) || 0 }; await api(modal.item ? `taxi/vehicle-accidents/${modal.item.id}` : `taxi/vehicles/${id}/accidents`, { method: modal.item ? "PUT" : "POST", body }); done(); }} />
      )}
    </div>
  );
}
