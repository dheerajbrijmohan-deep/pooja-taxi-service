// Attendance statuses with one colour each, used everywhere attendance is shown.
export const STATUSES = [
  { key: "Present", short: "P", label: "Present", on: "bg-[#2F7F79] text-white border-[#2F7F79]", cell: "bg-[#2F7F79] text-white" },
  { key: "Half day", short: "H", label: "Half day", on: "bg-[#D9A441] text-white border-[#D9A441]", cell: "bg-[#D9A441] text-white" },
  { key: "Absent", short: "A", label: "Absent", on: "bg-destructive text-white border-destructive", cell: "bg-destructive text-white" },
  { key: "Leave", short: "L", label: "Leave", on: "bg-[#2F2F2F] text-white border-[#2F2F2F]", cell: "bg-[#2F2F2F] text-white" },
];
export const BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
export const weight = { Present: 1, "Half day": 0.5, Leave: 1, Absent: 0 };

// click cycle for editing a day: not marked -> Present -> Half day -> Absent -> Leave -> not marked
export const nextStatus = (cur) => {
  const order = [null, "Present", "Half day", "Absent", "Leave"];
  return order[(order.indexOf(cur ?? null) + 1) % order.length];
};

export const shiftMonth = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
export const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });

// Counts for one row of /attendance/month: { Present, "Half day", Leave, Absent, notMarked, paidDays }
export function monthTally(e) {
  const t = { Present: 0, "Half day": 0, Leave: 0, Absent: 0 };
  let marked = 0;
  Object.entries(e.marks).forEach(([d, s]) => {
    if (+d >= e.from_day && +d <= e.to_day && s in t) { t[s]++; marked++; }
  });
  return { ...t, notMarked: e.to_day - e.from_day + 1 - marked, paidDays: t.Present + 0.5 * t["Half day"] + t.Leave };
}

// small coloured number used for per-status counts
export function countChipClass(key, n) {
  return n > 0 ? `${BY_KEY[key].cell} font-bold` : "bg-muted text-muted-foreground";
}
