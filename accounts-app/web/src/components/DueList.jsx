import { Link } from "react-router-dom";
import { fmtDate } from "../lib/format.js";

const when = (i) => {
  if (i.kind === "accident") return `since ${fmtDate(i.due_date, false)}`;
  if (i.days_left !== null) return i.days_left < 0 ? `${-i.days_left} day${i.days_left === -1 ? "" : "s"} overdue (${fmtDate(i.due_date, false)})` : i.days_left === 0 ? "due today" : `in ${i.days_left} day${i.days_left === 1 ? "" : "s"} (${fmtDate(i.due_date, false)})`;
  return i.km_left < 0 ? `${Math.round(-i.km_left).toLocaleString("en-IN")} km overdue` : `${Math.round(i.km_left).toLocaleString("en-IN")} km to go`;
};

// Overdue / due-soon items. `linkVehicle` makes each row open that vehicle.
export default function DueList({ items, linkVehicle = true, showVehicle = true }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Nothing is overdue or due in the next 30 days.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((i, n) => (
        <li key={`${i.kind}-${i.ref_id}-${n}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
          <div className="flex items-center gap-3">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${i.status === "overdue" ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary"}`}>{i.status === "overdue" ? "OVERDUE" : "DUE SOON"}</span>
            <span className="font-semibold">{i.label}</span>
            {i.kind === "licence" && <Link to={`/business/taxi/drivers/${i.driver_id}`} className="text-muted-foreground hover:text-primary">· {i.driver_name}</Link>}
            {showVehicle && i.kind !== "licence" && (linkVehicle ? <Link to={`/business/taxi/vehicles/${i.vehicle_id}`} className="text-muted-foreground hover:text-primary">· {i.vehicle_code.slice(-4)}</Link> : <span className="text-muted-foreground">· {i.vehicle_code.slice(-4)}</span>)}
          </div>
          <span className={i.status === "overdue" ? "text-destructive font-semibold" : "text-muted-foreground"}>{when(i)}</span>
        </li>
      ))}
    </ul>
  );
}
