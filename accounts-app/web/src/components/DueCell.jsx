import { daysBetween, fmtDate } from "../lib/format.js";

// "Next due" date with how far away it is. If the customer came again, the older entry just says so.
export default function DueCell({ due, today, again = false, againText = "washed again" }) {
  if (again) return <div><div>{fmtDate(due)}</div><div className="text-xs text-muted-foreground">{againText}</div></div>;
  const diff = daysBetween(today, due);
  const note = diff > 0 ? `in ${diff}d` : diff === 0 ? "due today" : `${-diff}d past due`;
  return (
    <div>
      <div>{fmtDate(due)}</div>
      <div className={`text-xs font-semibold ${diff <= 0 ? "text-primary" : "text-muted-foreground"}`}>{note}</div>
    </div>
  );
}
