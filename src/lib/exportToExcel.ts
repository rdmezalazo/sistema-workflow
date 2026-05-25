import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

export function exportRowsToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = "Datos"
) {
  const data = rows.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col) => {
      const value = col.accessor(row);
      obj[col.header] = value ?? "";
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  });

  // Auto-size columns
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.header.length,
      ...data.map((d) => String(d[col.header] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeName = fileName.replace(/[^\w\-]+/g, "_");
  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${safeName}_${date}.xlsx`);
}
