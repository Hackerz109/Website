function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))];
  return lines.join("\n");
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  downloadFile(`${filename}.csv`, toCSV(rows), "text/csv;charset=utf-8;");
}

export function exportJSON(filename: string, data: unknown) {
  downloadFile(`${filename}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8;");
}

export function exportExcel(filename: string, rows: Record<string, unknown>[], sheetName = "Sheet1") {
  if (rows.length === 0) {
    downloadFile(`${filename}.xls`, "<html><body>No data for this range.</body></html>", "application/vnd.ms-excel");
    return;
  }
  const headers = Object.keys(rows[0]);
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(sheetName)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<table border="1">
<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(r[h])}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
</body></html>`;
  downloadFile(`${filename}.xls`, html, "application/vnd.ms-excel");
}

export function exportPDF(title: string, sections: { heading: string; rows: Record<string, unknown>[] }[]) {
  const win = window.open("", "_blank");
  if (!win) return;

  const sectionsHtml = sections
    .map((s) => {
      if (s.rows.length === 0) return `<h2>${escapeHtml(s.heading)}</h2><p class="empty">No data for this range.</p>`;
      const headers = Object.keys(s.rows[0]);
      return `
        <h2>${escapeHtml(s.heading)}</h2>
        <table>
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>${s.rows.map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(r[h])}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>`;
    })
    .join("");

  win.document.write(`<!doctype html>
<html><head><title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 32px; color: #1a1610; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .meta { color: #84796a; font-size: 12px; margin-bottom: 20px; }
  h2 { font-size: 13px; margin-top: 22px; text-transform: uppercase; letter-spacing: 0.04em; color: #585047; }
  .empty { color: #84796a; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; }
  th { background: #F7F5EE; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated ${new Date().toLocaleString()}</div>
  ${sectionsHtml}
  <script>window.onload = () => window.print();</script>
</body></html>`);
  win.document.close();
}
