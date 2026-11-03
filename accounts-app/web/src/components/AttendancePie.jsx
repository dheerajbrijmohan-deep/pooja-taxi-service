import SharePie from "./SharePie.jsx";

export const ATT_COLORS = { Present: "#2F7F79", "Half day": "#D9A441", Leave: "#2F2F2F", Absent: "#B3261E", "Not marked": "#9AA5A8" };
const ORDER = ["Present", "Half day", "Leave", "Absent", "Not marked"];

// Day counts for a set of employees from /attendance/month rows (each has from_day, to_day, marks).
export function tallyAttendance(employees) {
  const t = { Present: 0, "Half day": 0, Leave: 0, Absent: 0, "Not marked": 0 };
  employees.forEach((e) => {
    let marked = 0;
    Object.entries(e.marks).forEach(([d, s]) => {
      if (+d >= e.from_day && +d <= e.to_day && s in t) { t[s]++; marked++; }
    });
    t["Not marked"] += e.to_day - e.from_day + 1 - marked;
  });
  return t;
}

// Work vs leave donut for a month: of the days that were marked, how many were present, half days, leave or absent.
// Days not marked yet are left out of the chart and mentioned in the subtitle instead.
export default function AttendancePie({ employees, subtitle }) {
  const t = tallyAttendance(employees);
  const rows = ORDER.filter((l) => l !== "Not marked").map((label) => ({ label, value: t[label] }));
  const notMarked = t["Not marked"];
  return (
    <SharePie
      rows={rows} today="" periods={false} title="WORK VS LEAVE"
      subtitle={`${subtitle}${notMarked > 0 ? ` · ${notMarked} day${notMarked === 1 ? "" : "s"} not marked yet` : ""}`}
      dateOf={() => ""} keyOf={(r) => r.label} amountOf={(r) => r.value}
      colors={ATT_COLORS} order={ORDER} centerLabel="MARKED"
      format={(v) => `${v} day${v === 1 ? "" : "s"}`} emptyText="No days marked in this month yet."
    />
  );
}
