import { useEffect, useRef, useState } from "react";

const field =
  "w-full rounded-md border border-input bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

// Generic modal form. fields: [{ key, label, type: text|date|number|select|textarea|file, options?, required?, span?, hint?, step?, placeholder?, show?(values) }]
// onSubmit(values) is awaited; an Error thrown from it is shown inside the form.
export default function FormModal({ title, fields, initial = {}, submitLabel = "SAVE", onSubmit, onClose }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? (f.type === "select" && !f.optional ? (Array.isArray(f.options?.[0]) ? f.options[0][0] : f.options?.[0] ?? "") : "")])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  useEffect(() => first.current?.focus(), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.type === "file" ? e.target.files?.[0] ?? null : e.target.value }));
  let firstDone = false;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-xl bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border space-y-4">
        <h2 className="font-display text-2xl font-bold italic">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.filter((f) => !f.show || f.show(v)).map((f) => {
            const id = `fm-${f.key}`;
            const ref = !firstDone && f.type !== "file" ? ((firstDone = true), first) : undefined;
            return (
              <div key={f.key} className={f.span === 2 || f.type === "textarea" || f.type === "file" ? "sm:col-span-2" : ""}>
                <label htmlFor={id} className="text-sm font-semibold mb-1 block">{f.label}</label>
                {f.type === "select" ? (
                  <select id={id} ref={ref} className={field} value={v[f.key]} onChange={set(f.key)} required={f.required}>
                    {(f.optional ? [""] : []).concat(f.options).map((o) => <option key={String(o)} value={Array.isArray(o) ? o[0] : o}>{Array.isArray(o) ? o[1] : o || "—"}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea id={id} ref={ref} className={field} rows={2} value={v[f.key]} onChange={set(f.key)} required={f.required} maxLength={f.max ?? 500} placeholder={f.placeholder} />
                ) : f.type === "file" ? (
                  <input id={id} type="file" accept="image/*,application/pdf" className={field} onChange={set(f.key)} required={f.required} />
                ) : (
                  <input id={id} ref={ref} type={f.type} className={field} value={v[f.key]} onChange={set(f.key)} required={f.required} step={f.step} min={f.type === "number" ? 0 : undefined} max={f.type === "date" ? f.max : undefined} placeholder={f.placeholder} autoComplete="off" />
                )}
                {f.hint && <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>}
              </div>
            );
          })}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">CANCEL</button>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
