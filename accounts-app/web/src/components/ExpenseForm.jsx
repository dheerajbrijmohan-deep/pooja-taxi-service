import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { money, todayIST } from "../lib/format.js";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const blank = () => ({ expense_date: todayIST(), category: "Supplies", item: "", qty: "1", price: "" });

// `expense` set = editing. `known` = existing expenses, used to suggest item names (new names are saved as typed
// and appear in the suggestions next time). Only the owner can enter salaries.
export default function ExpenseForm({ business, expense, known, isAdmin, onSaved, onClose }) {
  const [f, setF] = useState(expense ? { ...expense, qty: String(expense.qty), price: String(expense.price) } : blank());
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

  const suggestions = useMemo(() => {
    const seen = new Map();
    known.filter((x) => x.category === f.category).forEach((x) => { if (!seen.has(x.item.toLowerCase())) seen.set(x.item.toLowerCase(), x.item); });
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [known, f.category]);

  const total = (Number(f.qty) || 0) * (Number(f.price) || 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = { ...f, business, qty: Number(f.qty), price: Number(f.price || 0) };
      const d = expense
        ? await api(`expenses/${expense.id}`, { method: "PUT", body })
        : await api("expenses", { method: "POST", body });
      onSaved(d.expense);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const L = ({ id, children }) => <label htmlFor={id} className="text-sm font-semibold mb-1 block">{children}</label>;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">{expense ? "Edit expense" : "New expense"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><L id="ce-date">Date</L><input id="ce-date" type="date" className={field} value={f.expense_date} onChange={set("expense_date")} required /></div>
          <div>
            <L id="ce-cat">Category</L>
            <select id="ce-cat" className={field} value={f.category} onChange={set("category")}>
              <option>Supplies</option>
              <option>Rent</option>
              {isAdmin && <option>Salary</option>}
            </select>
          </div>
          <div className="sm:col-span-2">
            <L id="ce-item">Item name</L>
            <input id="ce-item" ref={first} list="ce-items" className={field} value={f.item} onChange={set("item")} required maxLength={100} autoComplete="off"
              placeholder={f.category === "Salary" ? "e.g. Salary - Ramesh" : f.category === "Rent" ? "e.g. Shop rent, Parking rent" : "Pick from the list or type a new item"} />
            <datalist id="ce-items">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
            <p className="text-xs text-muted-foreground mt-1">A new item you type is added to this list for next time.</p>
          </div>
          <div><L id="ce-qty">Qty</L><input id="ce-qty" type="number" min="0" step="any" inputMode="decimal" className={field} value={f.qty} onChange={set("qty")} required /></div>
          <div><L id="ce-price">Price (₹ per unit)</L><input id="ce-price" type="number" min="0" step="0.01" inputMode="decimal" className={field} value={f.price} onChange={set("price")} required /></div>
        </div>
        <p className="text-sm">Total: <span className="font-bold">{money(total)}</span></p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">
            {busy ? "SAVING…" : "SAVE"}
          </button>
        </div>
      </form>
    </div>
  );
}
