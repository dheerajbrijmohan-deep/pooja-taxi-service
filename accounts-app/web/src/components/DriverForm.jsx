import { useEffect, useRef, useState } from "react";
import AddressSection from "./AddressSection.jsx";
import DateInput from "./DateInput.jsx";
import { fmtAadhaar, todayIST } from "../lib/format.js";
import { api } from "../api.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const blank = () => ({
  name: "", father_name: "", dob: "", gender: "", blood_group: "", mobile: "", alt_phone: "", address: "", city: "", state: "", pincode: "", perm_address: "", perm_city: "", perm_state: "", perm_pincode: "", aadhaar_no: "",
  join_date: "", employee_id: "", status: "Active", leave_date: "", share_pct: "30", licence_no: "", licence_expiry: "", badge_no: "",
  bank_name: "", bank_account: "", ifsc: "", emergency_name: "", emergency_relation: "", emergency_phone: "", notes: "",
});

function Section({ title, children }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </fieldset>
  );
}

// `driver` set = editing. The photo, licence copy and other documents are added on the driver's page after saving.
export default function DriverForm({ driver, onSaved, onClose }) {
  const [f, setF] = useState(driver ? { ...blank(), ...Object.fromEntries(Object.entries(driver).map(([k, v]) => [k, v ?? ""])), share_pct: String(driver.share_pct) } : blank());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setStatus = (e) => {
    const status = e.target.value;
    setF((p) => ({ ...p, status, leave_date: status === "Left" ? p.leave_date || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "" }));
  };
  const T = (k, label, { span, ...rest } = {}) => (
    <div key={k} className={span ? "sm:col-span-2" : ""}>
      <label htmlFor={`dr-${k}`} className="text-sm font-semibold mb-1 block">{label}</label>
      {rest.type === "date"
        ? <DateInput id={`dr-${k}`} className={field} value={f[k]} onChange={(v) => setF((p) => ({ ...p, [k]: v }))} required={rest.required} disabled={rest.disabled} max={k === "dob" ? todayIST() : undefined} fromYear={k === "dob" ? 1940 : 2000} />
        : <input id={`dr-${k}`} className={field} value={f[k]} onChange={set(k)} {...rest} />}
    </div>
  );
  const S = (k, label, options, { onChange, ...rest } = {}) => (
    <div key={k}>
      <label htmlFor={`dr-${k}`} className="text-sm font-semibold mb-1 block">{label}</label>
      <select id={`dr-${k}`} className={field} value={f[k]} onChange={onChange || set(k)} {...rest}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...f, share_pct: f.share_pct === "" ? 30 : Number(f.share_pct) };
      if (driver) { await api(`taxi/driver-profiles/${driver.id}`, { method: "PUT", body }); onSaved(driver.id); }
      else { const d = await api("taxi/driver-profiles", { method: "POST", body }); onSaved(d.id); }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-3xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-6 my-4">
        <h2 className="font-display text-2xl font-bold italic">{driver ? "Edit driver" : "New driver"}</h2>

        <Section title="PERSONAL">
          {T("name", "Full name", { span: true, ref: first, required: true, maxLength: 100 })}
          {T("father_name", "Father's name", { maxLength: 100 })}
          {T("dob", "Date of birth", { type: "date" })}
          {S("gender", "Gender", [["", "—"], ["Male", "Male"], ["Female", "Female"], ["Other", "Other"]])}
          {S("blood_group", "Blood group", [["", "—"], ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => [b, b])])}
          {T("mobile", "Mobile number", { type: "tel", inputMode: "numeric", required: true, placeholder: "10 digits" })}
          {T("alt_phone", "Alternate number", { type: "tel", inputMode: "numeric" })}
          {T("aadhaar_no", "Aadhaar number (12 digits)", { inputMode: "numeric", maxLength: 14, placeholder: "1234-5678-9012", value: fmtAadhaar(f.aadhaar_no), onChange: (e) => setF((p) => ({ ...p, aadhaar_no: e.target.value.replace(/\D/g, "").slice(0, 12) })) })}
        </Section>

        <AddressSection f={f} setF={setF} idp="dr" field={field} />

        <Section title="LICENCE">
          {T("licence_no", "Driving licence number", { maxLength: 40, className: `${field} uppercase` })}
          {T("licence_expiry", "Licence valid until", { type: "date" })}
          {T("badge_no", "Taxi badge number", { maxLength: 40 })}
        </Section>

        <Section title="WORK">
          {T("join_date", "Joining date (required)", { type: "date", required: true })}
          {T("employee_id", "Employee ID", { maxLength: 40, placeholder: "e.g. 20260823-000" })}
          {T("share_pct", "Share of daily earning (%)", { type: "number", min: "0", max: "100", step: "0.5", inputMode: "decimal" })}
          {S("status", "Status", [["Active", "Active"], ["Left", "Left"]], { onChange: setStatus })}
          {T("leave_date", "Last working day", { type: "date", required: f.status === "Left", disabled: f.status !== "Left" })}
        </Section>

        <Section title="BANK (FOR PAYMENT)">
          {T("bank_name", "Bank name", { maxLength: 100 })}
          {T("bank_account", "Account number", { inputMode: "numeric" })}
          {T("ifsc", "IFSC code", { maxLength: 11, className: `${field} uppercase` })}
        </Section>

        <Section title="EMERGENCY CONTACT">
          {T("emergency_name", "Name", { maxLength: 100 })}
          {T("emergency_relation", "Relation", { maxLength: 50, placeholder: "e.g. Wife, Brother" })}
          {T("emergency_phone", "Mobile number", { type: "tel", inputMode: "numeric" })}
        </Section>

        <div>
          <label htmlFor="dr-notes" className="text-sm font-semibold mb-1 block">Notes</label>
          <textarea id="dr-notes" rows={3} maxLength={1000} className={field} value={f.notes} onChange={set("notes")} />
        </div>

        {!driver && <p className="text-xs text-muted-foreground">After saving you can upload the photo, driving licence, Aadhaar and other documents.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "SAVE"}</button>
        </div>
      </form>
    </div>
  );
}
