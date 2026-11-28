// Slots are 2 hours long, 9 am to 9 pm (one bay, so one car per slot). Keep in step with api/appointments.php.
export const SLOTS = [9, 11, 13, 15, 17, 19];
export const SLOT_HOURS = 2;
const h12 = (h) => `${((h + 11) % 12) + 1}${h < 12 || h === 24 ? " AM" : " PM"}`;
export const slotLabel = (h) => `${h12(h)} – ${h12(h + SLOT_HOURS)}`;
export const slotStart = (h) => `${h12(h)}`;
export const ACTIVE = ["Booked", "Confirmed", "Arrived", "Done"]; // statuses that keep the slot taken
export const STATUS_STYLE = {
  Booked: "bg-sky-100 text-sky-800", // not yet confirmed with the customer
  Confirmed: "bg-emerald-100 text-emerald-800",
  Arrived: "bg-amber-100 text-amber-800",
  Done: "bg-slate-200 text-slate-700",
  "No-show": "bg-red-100 text-red-800",
  Cancelled: "bg-muted text-muted-foreground",
};
export const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const weekday = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
// has this slot already ended (only meaningful for today)
export const slotOver = (hour, nowHour) => nowHour >= hour + SLOT_HOURS;
