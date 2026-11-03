const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n) => inr.format(Math.round(n || 0));

// "2026-10-17" -> "17 Oct 2026" (parsed as a plain date, no timezone shifts)
export function fmtDate(iso, withYear = true) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    timeZone: "UTC", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}),
  });
}

export const todayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD

export function daysBetween(fromIso, toIso) {
  const t = (s) => Date.UTC(...s.split("-").map((v, i) => (i === 1 ? v - 1 : +v)));
  return Math.round((t(toIso) - t(fromIso)) / 86400000);
}

// Whole years between an ISO date and today (IST)
export function yearsSince(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const [ty, tm, td] = todayIST().split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

// "2 yrs 3 mths" from a joining date to today (or to a leaving date)
export function tenure(fromIso, toIso) {
  const [y, m, d] = fromIso.split("-").map(Number);
  const [ty, tm, td] = (toIso || todayIST()).split("-").map(Number);
  let months = (ty - y) * 12 + (tm - m) - (td < d ? 1 : 0);
  if (months < 0) return "";
  const yrs = Math.floor(months / 12), mo = months % 12;
  return [yrs ? `${yrs} yr${yrs === 1 ? "" : "s"}` : "", mo || !yrs ? `${mo} mth${mo === 1 ? "" : "s"}` : ""].filter(Boolean).join(" ");
}

// "17:05" -> "5:05 PM" (the sheet's style); empty stays empty
export function to12(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Aadhaar numbers are stored as 12 digits and shown as 1234-5678-9012 (also while typing: partial numbers are grouped as far as they go).
export const fmtAadhaar = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1-");

// "Plot 61, Ashok Nagar, Nagpur, Maharashtra – 440026" from the separate address lines
export const fmtAddress = (line, city, state, pin) => [line, city, state].filter(Boolean).join(", ") + (pin ? `${[line, city, state].some(Boolean) ? " – " : ""}${pin}` : "");
