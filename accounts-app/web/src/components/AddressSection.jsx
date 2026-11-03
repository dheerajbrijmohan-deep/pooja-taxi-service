import { useEffect, useState } from "react";
import { INDIAN_STATES } from "../lib/states.js";

// Current address (the existing "address" line, plus city, state and PIN code) and the permanent address, each on its own lines.
// `f` is the form state, `setF` its setter, `idp` an id prefix, `field` the shared input class.
export default function AddressSection({ f, setF, idp, field }) {
  const [same, setSame] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const pin = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value.replace(/\D/g, "").slice(0, 6) }));

  // while "same as current address" is ticked, the permanent address follows the current one
  useEffect(() => {
    if (!same) return;
    setF((p) => ({ ...p, perm_address: p.address, perm_city: p.city, perm_state: p.state, perm_pincode: p.pincode }));
  }, [same, f.address, f.city, f.state, f.pincode, setF]);

  const block = (title, k, disabled) => (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold tracking-widest text-muted-foreground mb-1">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor={`${idp}-${k.address}`} className="text-sm font-semibold mb-1 block">Address</label>
          <input id={`${idp}-${k.address}`} className={field} value={f[k.address]} onChange={set(k.address)} maxLength={255} disabled={disabled} placeholder="House / plot no., street, area" />
        </div>
        <div>
          <label htmlFor={`${idp}-${k.city}`} className="text-sm font-semibold mb-1 block">City</label>
          <input id={`${idp}-${k.city}`} className={field} value={f[k.city]} onChange={set(k.city)} maxLength={60} disabled={disabled} />
        </div>
        <div>
          <label htmlFor={`${idp}-${k.state}`} className="text-sm font-semibold mb-1 block">State</label>
          <select id={`${idp}-${k.state}`} className={field} value={f[k.state]} onChange={set(k.state)} disabled={disabled}>
            <option value="">— Select state —</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${idp}-${k.pincode}`} className="text-sm font-semibold mb-1 block">PIN code</label>
          <input id={`${idp}-${k.pincode}`} className={field} value={f[k.pincode]} onChange={pin(k.pincode)} inputMode="numeric" placeholder="6 digits" disabled={disabled} />
        </div>
      </div>
    </fieldset>
  );

  return (
    <>
      {block("CURRENT ADDRESS", { address: "address", city: "city", state: "state", pincode: "pincode" }, false)}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold mb-3">
          <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} className="w-4 h-4" /> Permanent address is the same as the current address
        </label>
        {block("PERMANENT ADDRESS", { address: "perm_address", city: "perm_city", state: "perm_state", pincode: "perm_pincode" }, same)}
      </div>
    </>
  );
}
