import { Fragment, useEffect } from "react";

// "Are you sure you want to save the changes?" - shows what is about to be saved. `locks` explains that a manager's save is final.
export default function ConfirmSave({ rows = [], locks, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", onKey, true); // runs before the form's own Escape handler, so only this box closes
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label="Confirm save"
         onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-md bg-card text-foreground rounded-2xl p-6 md:p-8 shadow-card border border-border">
        <h2 className="font-display text-2xl font-bold italic mb-1">Are you sure you want to save the changes?</h2>
        {locks && <p className="text-sm text-muted-foreground mb-4">Once saved, this is locked: only the admin can change or delete it afterwards.</p>}
        {rows.length > 0 && (
          <dl className="rounded-xl bg-muted/70 border border-border p-4 mb-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold">{v}</dd></Fragment>))}
          </dl>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="px-6 py-3 rounded-full border border-border font-bold text-sm tracking-wider hover:bg-muted">GO BACK</button>
          <button type="button" onClick={onConfirm} disabled={busy} autoFocus className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-60">{busy ? "SAVING…" : "YES, SAVE"}</button>
        </div>
      </div>
    </div>
  );
}
