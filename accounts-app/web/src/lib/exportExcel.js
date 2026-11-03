import { fmtDate, todayIST } from "./format.js";
import { totalsFor } from "./reports.js";

const ORANGE = "FFC87412";
const isoToDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Builds a formatted .xlsx (title, filters line, orange header, real numbers/dates, totals row) and downloads it.
// ExcelJS is large, so it is only loaded when someone actually exports.
export async function downloadExcel({ title, subtitle, columns, rows, fileName, generatedBy }) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "The Pooja Group Management";
  const sheetName = title.replace(/[*?:\\/\[\]]/g, " -").replace(/\s+/g, " ").trim().slice(0, 31) || "Report"; // Excel forbids * ? : \ / [ ] in sheet names and allows 31 characters
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 4 }], pageSetup: { orientation: columns.length > 7 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });

  const span = Math.max(columns.length, 3);
  ws.mergeCells(1, 1, 1, span);
  ws.getCell(1, 1).value = `The Pooja Group · ${title}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: ORANGE } };
  ws.mergeCells(2, 1, 2, span);
  ws.getCell(2, 1).value = `${subtitle}${subtitle ? " · " : ""}Generated ${fmtDate(todayIST())}${generatedBy ? ` by ${generatedBy}` : ""}`;
  ws.getCell(2, 1).font = { size: 10, color: { argb: "FF6B6B6B" } };

  const head = ws.getRow(4);
  columns.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ORANGE } };
    cell.alignment = { vertical: "middle", horizontal: c.type === "money" || c.type === "number" ? "right" : "left", wrapText: true };
  });
  head.height = 22;

  const fmt = { money: '"₹"#,##0.00', number: "#,##0.##", date: "dd-mmm-yyyy" };
  rows.forEach((r, ri) => {
    const row = ws.getRow(5 + ri);
    columns.forEach((c, ci) => {
      const v = r[c.key];
      const cell = row.getCell(ci + 1);
      if (v === null || v === undefined || v === "") return;
      cell.value = c.type === "date" ? isoToDate(v) : c.type === "money" || c.type === "number" ? Number(v) : String(v);
      if (fmt[c.type]) cell.numFmt = fmt[c.type];
      if (c.narrow) cell.alignment = { horizontal: "center" };
    });
    if (ri % 2 === 1) row.eachCell({ includeEmpty: true }, (cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F1E6" } }; });
  });

  // totals row
  const totals = totalsFor(columns, rows);
  if (rows.length && columns.some((c) => c.sum)) {
    const tr = ws.getRow(5 + rows.length);
    columns.forEach((c, i) => {
      const cell = tr.getCell(i + 1);
      if (i === 0) cell.value = `TOTAL (${rows.length} row${rows.length === 1 ? "" : "s"})`;
      if (c.sum) { cell.value = totals[c.key]; cell.numFmt = fmt[c.type]; }
      cell.font = { bold: true };
      cell.border = { top: { style: "medium" } };
    });
  }

  columns.forEach((c, i) => {
    const longest = rows.reduce((m, r) => Math.max(m, String(r[c.key] ?? "").length), c.label.length);
    ws.getColumn(i + 1).width = c.narrow ? 4.5 : Math.min(Math.max(longest + 3, c.type === "date" ? 14 : 10), 45);
  });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
