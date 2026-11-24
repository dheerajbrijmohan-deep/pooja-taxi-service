export const WASH_SERVICES = ["Full Wash", "Top Wash", "Water Spray", "Interior Vacuum", "Interior Deep Clean", "Wax Polish", "Glass Clean"];
export const PAYMENT_MODES = ["Online", "Cash", "Credit", "Complimentary"];
// Credit is not yet received and Complimentary is free, so only Online and Cash count as earning.
export const earned = (e) => (e.payment_mode === "Credit" ? 0 : e.paid);

// Vehicle numbers are kept as MH-31 FM-7700 (state-district series-number). Anything that does not fit that shape is kept as typed, in capitals.
export function fmtVehicle(raw) {
  const c = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = c.match(/^([A-Z]{1,2})(\d{0,2})([A-Z]{0,3})(\d{0,4})$/);
  if (!m) return c;
  const [, st, dist, ser, num] = m;
  let out = st;
  if (st.length === 2 && (dist || ser || num)) out += "-";
  out += dist;
  if (ser || num) out += " ";
  out += ser;
  if (num) out += "-" + num;
  return out.trim();
}
