import { useEffect, useState } from "react";
import { api } from "../api.js";
import { money } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
export const DEFAULT_EXPENSES = ["Parking", "Puncture / tyre", "Toll", "Fine / challan", "Car wash", "Repair", "Air / water"];

// rows: [{ name, amount, other }]  (other = the name is typed in rather than picked from the list)
export const rowsFromTrip = (trip) =>
  trip?.other_items?.length
    ? trip.other_items.map((x) => ({ name: x.item, amount: String(x.amount), other: !DEFAULT_EXPENSES.includes(x.item) }))
    : trip?.supplies > 0 ? [{ name: "", amount: String(trip.supplies), other: false }] : []; // an older entry that only has a total
export const itemsFromRows = (rows) => rows.filter((r) => r.name.trim() || Number(r.amount)).map((r) => ({ item: r.name.trim(), amount: Number(r.amount) || 0 }));
export const totalOf = (rows) => rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);

// "Other expenses" of the day: pick from the list (or leave it blank / choose Other… and type your own) and enter the amount.
// Add as many lines as needed (parking and puncture on the same day); the total goes to the sheet's Other Expenses column.
export default function OtherExpenses({ rows, setRows }) {
  const [used, setUsed] = useState([]);
  useEffect(() => { api("taxi/other-items").then((d) => setUsed(d.items)).catch(() => {}); }, []);
  const options = [...DEFAULT_EXPENSES, ...used.filter((u) => !DEFAULT_EXPENSES.includes(u))]; // names typed before are offered next time
  const set = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const pick = (i, v) => (v === "__other" ? set(i, { other: true, name: "" }) : set(i, { other: false, name: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">Other expenses</span>
        <span className="text-sm font-bold">{money(totalOf(rows))}</span>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem_auto] sm:grid-cols-[14rem_1fr_9rem_auto] gap-2 items-center">
            <select aria-label={`Other expense ${i + 1}`} className={field} value={r.other ? "__other" : r.name} onChange={(e) => pick(i, e.target.value)}>
              <option value="">— choose —</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
              <option value="__other">Other… (type)</option>
            </select>
            {r.other ? <input aria-label={`Other expense ${i + 1} name`} className={`${field} col-span-1`} placeholder="What was it for?" maxLength={60} value={r.name} onChange={(e) => set(i, { name: e.target.value })} /> : <span className="hidden sm:block" />}
            <input aria-label={`Other expense ${i + 1} amount`} type="number" min="0" step="0.01" inputMode="decimal" className={field} placeholder="₹" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} />
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove other expense ${i + 1}`} className="w-9 h-9 rounded-full border border-border font-bold text-destructive hover:bg-muted">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows([...rows, { name: "", amount: "", other: false }])} className="mt-2 text-xs font-bold tracking-wider text-primary hover:underline">{rows.length ? "+ ADD ANOTHER" : "+ ADD AN EXPENSE (PARKING, PUNCTURE…)"}</button>
    </div>
  );
}
