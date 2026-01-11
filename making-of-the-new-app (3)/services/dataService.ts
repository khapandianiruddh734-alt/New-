
import { DuplicateOptions } from '../types';

declare const XLSX: any;

/**
 * Excel to PDF
 */
export async function excelToPdf(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const html = XLSX.utils.sheet_to_html(sheet);
  
  // Use html2pdf for high quality conversion
  return await (window as any).html2pdf().from(html).output('blob');
}

/**
 * Clean Excel
 */
export async function cleanExcel(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  wb.SheetNames.forEach(name => {
    const sheet = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const cleaned = data.map(row => 
      row.map(cell => {
        if (typeof cell === 'string') {
          return cell.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\x20-\x7E]/g, "")
            .trim();
        }
        return cell;
      })
    );
    wb.Sheets[name] = XLSX.utils.aoa_to_sheet(cleaned);
  });
  
  const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Process Duplicates with Yellow Highlighting
 */
export async function processDuplicates(file: File, options: DuplicateOptions): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const name = wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  const seen = new Set<string>();
  const duplicatesIndices = new Set<number>();
  
  rows.forEach((row, i) => {
    const key = options.criteria === 'row' ? JSON.stringify(row) : (String(row[0] || '').trim().toLowerCase());
    if (key === "" || key === "[]") return;
    if (seen.has(key)) duplicatesIndices.add(i);
    else seen.add(key);
  });

  const workbook = XLSX.utils.book_new();
  let finalSheet;

  if (options.mode === 'remove') {
    const finalRows = rows.filter((_, i) => !duplicatesIndices.has(i));
    finalSheet = XLSX.utils.aoa_to_sheet(finalRows);
  } else {
    // Styling requires each cell to be an object with an 's' property
    const styledRows = rows.map((row, i) => {
      const isDuplicate = duplicatesIndices.has(i);
      const isHeader = i === 0;
      
      return row.map(cellValue => {
        const cell: any = { v: cellValue, t: typeof cellValue === 'number' ? 'n' : 's' };
        
        // Highlight logic
        if (isDuplicate && !isHeader) {
          cell.s = {
            fill: { fgColor: { rgb: "FFFF00" } }, // Yellow Background
            font: { color: { rgb: "000000" }, bold: false },
            border: {
              top: { style: 'thin', color: { rgb: "000000" } },
              bottom: { style: 'thin', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
        return cell;
      });
    });
    finalSheet = XLSX.utils.aoa_to_sheet(styledRows);
  }

  XLSX.utils.book_append_sheet(workbook, finalSheet, "Processed Data");
  const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Generic Sheet Exporter
 */
export function exportToExcel(data: any[][], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}
