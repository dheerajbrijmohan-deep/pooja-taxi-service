import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { downloadExcel } from "../lib/exportExcel.js";
import { fmtDate, money, todayIST } from "../lib/format.js";
import { useBusiness } from "../components/BusinessLayout.jsx";
import { REPORTS as ALL_REPORTS, display, reportById, totalsFor } from "../lib/reports.js";

const input = "rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PREVIEW_ROWS = 100;

// Month picker built from two dropdowns (Safari has no native month input)
function MonthPicker({ value, onChange }) {
  const [y, m] = value.split("-");
  const thisYear = +todayIST().slice(0, 4);
  const years = Array.from({ length: 6 }, (_, i) => thisYear - 4 + i);
  return (
    <div className="flex gap-2">
      <select className={input} value={m} onChange={(e) => onChange(`${y}-${e.target.value}`)} aria-label="Month">
        {MONTHS.map((n, i) => <option key={n} value={String(i + 1).padStart(2, "0")}>{n}</option>)}
      </select>
      <select className={input} value={y} onChange={(e) => onChange(`${e.target.value}-${m}`)} aria-label="Year">
        {years.map((yy) => <option key={yy}>{yy}</option>)}
      </select>
    </div>
  );
}

function Filter({ spec, value, onChange }) {
  const id = `f-${spec.key}`;
  if (spec.type === "check") {
    return (
      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer self-end pb-2">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-[#C87412]" />
        {spec.label}
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold tracking-widest text-muted-foreground mb-1 block">{spec.label.toUpperCase()}</label>
      {spec.type === "date" && <input id={id} type="date" className={input} value={value} max={todayIST()} onChange={(e) => e.target.value && onChange(e.target.value)} />}
      {spec.type === "month" && <MonthPicker value={value} onChange={onChange} />}
      {spec.type === "select" && (
        <select id={id} className={input} value={value} onChange={(e) => onChange(e.target.value)}>
          {spec.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const biz = useBusiness();
  // only this business's reports, with the business itself fixed (each business is managed on its own)
  const REPORTS = useMemo(() => ALL_REPORTS.filter((r) => !r.only || r.only === biz.slug), [biz.slug]);
  const scoped = (r) => { const d = r.defaults(); return "business" in d ? { ...d, business: biz.name } : d; };
  const [params] = useSearchParams(); // ?report=salary&month=2026-10 opens a report ready-made
  const [reportId, setReportId] = useState(REPORTS.some((r) => r.id === params.get("report")) ? params.get("report") : REPORTS[0].id);
  const report = reportById(reportId);
  const [filters, setFilters] = useState(() => {
    const d = scoped(report);
    for (const k of ["from", "to", "car"]) if (params.get(k) && k in d) d[k] = params.get(k); // a link can open a report ready-made
    const m = params.get("month") ?? "";
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && "month" in d ? { ...d, month: m } : d;
  });
  const [cars, setCars] = useState([]); // for the "Car" filter of the taxi reports
  useEffect(() => { if (biz.slug === "taxi") api("taxi/vehicles").then((d) => setCars(d.vehicles)).catch(() => {}); }, [biz.slug]);
  const [picked, setPicked] = useState({}); // column key -> true/false, overrides the default
  const [orientation, setOrientation] = useState("auto");
  const [result, setResult] = useState({ key: "", rows: null }); // rows are kept with the report+filters they were loaded for
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = useRef(0);

  const choose = (id) => {
    if (id === reportId) return;
    setReportId(id);
    setFilters(scoped(reportById(id)));
    setPicked({});
    setError("");
  };

  const allColumns = useMemo(() => report.columns(filters), [report, filters]);
  const columns = allColumns.filter((c) => picked[c.key] ?? !!c.on);
  const badRange = filters.from && filters.to && filters.from > filters.to;

  // reload whenever the report or its filters change
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    if (badRange) { setResult({ key: "", rows: null }); setError("“From” is after “To”."); return; }
    const mine = ++token.current;
    setError("");
    const t = setTimeout(async () => {
      try {
        const r = await report.load(filters);
        if (mine === token.current) setResult({ key: `${report.id}|${filterKey}`, rows: r });
      } catch (err) {
        if (mine === token.current) { setResult({ key: "", rows: null }); setError(err.message); }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [report, filterKey, badRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // another report's (or older filters') rows are never shown, even if a slower reply arrives late
  const rows = result.key === `${report.id}|${filterKey}` ? result.rows : null;
  const subtitle = report.describe(filters);
  const totals = useMemo(() => (rows ? totalsFor(columns, rows) : {}), [rows, columns]);
  const hasTotals = rows && rows.length > 0 && columns.some((c) => c.sum);
  const landscape = orientation === "landscape" || (orientation === "auto" && columns.length > 6);
  const stamp = todayIST();
  const fileName = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${stamp}`;
  const canExport = rows && rows.length > 0 && columns.length > 0;

  const excel = async () => {
    setBusy(true);
    try {
      await downloadExcel({ title: report.title, subtitle, columns, rows, fileName, generatedBy: user.name });
    } catch (err) {
      setError(`Could not create the Excel file: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  // PDF = the browser's "Save as PDF" on a clean print layout (keeps ₹ and Hindi text exact). The title becomes the file name.
  const pdf = () => {
    const prev = document.title;
    document.title = `${report.title} ${stamp}`;
    const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const wide = columns.length > 14;
  const th = "text-left text-[11px] font-semibold tracking-widest text-muted-foreground px-3 py-2.5 whitespace-nowrap";

  return (
    <div className="max-w-7xl">
      <style>{`@media print { @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 10mm; } }`}</style>

      {/* ---------- screen ---------- */}
      <div className="print:hidden">
        <h1 className="font-display text-4xl font-bold italic mb-1">Reports</h1>
        <p className="text-muted-foreground mb-6">Pick a report, set the filters, choose the columns, then download it as Excel or PDF.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => choose(r.id)} aria-pressed={r.id === reportId}
              className={`text-left rounded-2xl border p-4 transition-colors ${r.id === reportId ? "bg-primary text-primary-foreground border-primary shadow-card" : "bg-card border-border hover:border-primary"}`}>
              <div className="font-semibold">{r.title}</div>
              <div className={`text-xs mt-1 ${r.id === reportId ? "opacity-90" : "text-muted-foreground"}`}>{r.blurb}</div>
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-5 md:p-6 mb-6 space-y-5">
          {report.filters.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-3">FILTERS</h2>
              <div className="flex flex-wrap gap-4 items-start">
                {report.filters.filter((s) => s.key !== "business").map((s0) => { const s = s0.dynamic === "cars" ? { ...s0, options: [["", "All cars"], ...cars.map((c) => [c.code, `${c.code.slice(-4)}${c.model ? ` · ${c.model}` : ""}`])] } : s0; return (
                  <Filter key={s.key} spec={s} value={filters[s.key]} onChange={(v) => setFilters((f) => ({ ...f, [s.key]: v }))} />
                ); })}
              </div>
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground">COLUMNS TO INCLUDE ({columns.length} of {allColumns.length})</h2>
              <div className="flex gap-4 text-xs font-bold tracking-wider">
                <button onClick={() => setPicked(Object.fromEntries(allColumns.map((c) => [c.key, true])))} className="text-primary hover:underline">ALL</button>
                <button onClick={() => setPicked(Object.fromEntries(allColumns.map((c) => [c.key, false])))} className="text-primary hover:underline">NONE</button>
                <button onClick={() => setPicked({})} className="text-muted-foreground hover:underline">RESET</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allColumns.map((c) => {
                const on = picked[c.key] ?? !!c.on;
                return (
                  <label key={c.key} className={`cursor-pointer select-none rounded-full border px-3 py-1 text-sm font-semibold ${on ? "bg-primary/10 border-primary text-primary" : "bg-white border-border text-muted-foreground"} ${c.narrow ? "px-2.5" : ""}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={(e) => setPicked((p) => ({ ...p, [c.key]: e.target.checked }))} />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm text-muted-foreground">
            {rows ? <><b className="text-foreground">{rows.length}</b> row{rows.length === 1 ? "" : "s"}</> : error ? "" : "Loading…"}
            {subtitle && <> · {subtitle}</>}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className={`${input} rounded-full`} aria-label="PDF page orientation">
              <option value="auto">PDF: automatic layout</option>
              <option value="portrait">PDF: portrait</option>
              <option value="landscape">PDF: landscape</option>
            </select>
            <button onClick={excel} disabled={!canExport || busy} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">{busy ? "PREPARING…" : "DOWNLOAD EXCEL"}</button>
            <button onClick={pdf} disabled={!canExport} className="px-6 py-3 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50">DOWNLOAD PDF</button>
          </div>
        </div>
        {canExport && <p className="text-xs text-muted-foreground mb-3">For the PDF, choose “Save as PDF” as the destination in the print window.</p>}
        {error && <p role="alert" className="text-sm text-destructive mb-3">{error}</p>}

        <div className="bg-card rounded-2xl shadow-card border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>{columns.map((c) => <th key={c.key} className={`${th} ${c.type === "money" || c.type === "number" ? "text-right" : ""} ${c.narrow ? "px-1 text-center" : ""}`}>{c.label.toUpperCase()}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(rows ?? []).slice(0, PREVIEW_ROWS).map((r, i) => (
                <tr key={i} className="hover:bg-muted/60">
                  {columns.map((c) => <td key={c.key} className={`px-3 py-2.5 align-top ${c.type === "money" || c.type === "number" ? "text-right whitespace-nowrap" : ""} ${c.type === "date" ? "whitespace-nowrap" : ""} ${c.narrow ? "px-1 text-center" : ""}`}>{display(c, r[c.key])}</td>)}
                </tr>
              ))}
              {rows && rows.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-10 text-center text-muted-foreground">Nothing to report for these filters.</td></tr>}
              {rows === null && !error && <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
              {columns.length === 0 && <tr><td className="px-4 py-10 text-center text-muted-foreground">Tick at least one column.</td></tr>}
            </tbody>
            {hasTotals && (
              <tfoot className="bg-muted font-bold">
                <tr>{columns.map((c, i) => <td key={c.key} className={`px-3 py-2.5 ${c.type === "money" || c.type === "number" ? "text-right whitespace-nowrap" : ""}`}>{i === 0 ? `TOTAL (${rows.length})` : c.sum ? display(c, totals[c.key]) : ""}</td>)}</tr>
              </tfoot>
            )}
          </table>
        </div>
        {rows && rows.length > PREVIEW_ROWS && <p className="text-xs text-muted-foreground mt-2">Showing the first {PREVIEW_ROWS} of {rows.length} rows. The Excel and PDF files include all rows.</p>}
      </div>

      {/* ---------- print / PDF layout ---------- */}
      <article className="hidden print:block text-[#1a1a1a]" style={{ fontSize: wide ? "7.5px" : columns.length > 8 ? "9px" : "11px" }}>
        <header className="text-center border-b-2 border-[#C87412] pb-3 mb-4">
          <div className="text-xl font-bold tracking-widest text-[#C87412]">THE POOJA GROUP</div>
          <div className="font-display text-lg font-bold italic mt-1">{report.title}</div>
          <div className="mt-1 text-[#6B6B6B]">{subtitle}</div>
        </header>
        <table className="w-full border-collapse">
          <thead style={{ display: "table-header-group" }}>
            <tr>{columns.map((c) => <th key={c.key} className={`border border-[#d8cdb8] bg-[#C87412] text-white px-1.5 py-1 ${c.type === "money" || c.type === "number" ? "text-right" : "text-left"} ${c.narrow ? "text-center px-0.5" : ""}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r, i) => (
              <tr key={i} className="break-inside-avoid" style={{ background: i % 2 ? "#f7f1e6" : "transparent" }}>
                {columns.map((c) => <td key={c.key} className={`border border-[#d8cdb8] px-1.5 py-1 align-top ${c.type === "money" || c.type === "number" ? "text-right" : ""} ${c.narrow ? "text-center px-0.5" : ""}`}>{display(c, r[c.key])}</td>)}
              </tr>
            ))}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr className="font-bold">{columns.map((c, i) => <td key={c.key} className={`border border-[#d8cdb8] border-t-2 border-t-[#1a1a1a] px-1.5 py-1 ${c.type === "money" || c.type === "number" ? "text-right" : ""}`}>{i === 0 ? `TOTAL (${rows.length})` : c.sum ? display(c, totals[c.key]) : ""}</td>)}</tr>
            </tfoot>
          )}
        </table>
        <footer className="mt-4 text-[#6B6B6B] flex justify-between">
          <span>Generated on {fmtDate(stamp)} by {user.name}</span>
          <span>{rows?.length ?? 0} row{rows?.length === 1 ? "" : "s"}{hasTotals ? `` : ""}</span>
        </footer>
      </article>
    </div>
  );
}
