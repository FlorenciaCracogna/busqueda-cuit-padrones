import ExcelJS from 'exceljs';
import type { PadronConfig } from '@/config/padrones';
import { normalizeCuit } from '@/utils/cuit';

export interface ProcessedRow {
  cuit: string;
  found: boolean;
  fields: string[];
}

function parseAliquota(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const normalized = value.replace(',', '.').replace(/\s/g, '');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function parseDate(value: string): Date | null {
  const clean = value.trim();
  // Expected format: ddmmaaaa (8 digits)
  if (!/^\d{8}$/.test(clean)) return null;
  const day = parseInt(clean.slice(0, 2), 10);
  const month = parseInt(clean.slice(2, 4), 10);
  const year = parseInt(clean.slice(4, 8), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Validate the date actually exists (e.g. 31/02 would roll over)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return d;
}

export async function generateExcel(
  padron: PadronConfig,
  rows: ProcessedRow[],
  baseFileName: string
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Resultado', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: padron.fields.length },
  };

  // Header row
  const headerRow = ws.getRow(1);
  padron.fields.forEach((field, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = field.name;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF99042F' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF710522' } },
    };
  });
  headerRow.height = 24;

  // Track max content length per column for auto-width
  const maxContentLengths: number[] = padron.fields.map((f) => f.name.length);

  // Data rows
  rows.forEach((row, rowIdx) => {
    const excelRow = ws.getRow(rowIdx + 2);
    padron.fields.forEach((field, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      if (!row.found) {
        if (colIdx === padron.cuitFieldIndex) {
          cell.value = row.cuit;
          cell.numFmt = '@';
          maxContentLengths[colIdx] = Math.max(maxContentLengths[colIdx], row.cuit.length);
        } else {
          cell.value = '';
        }
      } else {
        const rawValue = row.fields[colIdx] ?? '';

        switch (field.format) {
          case 'aliquota': {
            const num = parseAliquota(rawValue);
            if (num !== null) {
              cell.value = num;
              cell.numFmt = '0.00';
            } else {
              cell.value = '';
            }
            maxContentLengths[colIdx] = Math.max(maxContentLengths[colIdx], 6);
            break;
          }
          case 'date': {
            const date = parseDate(rawValue);
            if (date) {
              cell.value = date;
              cell.numFmt = 'dd/mm/yyyy';
            } else {
              cell.value = rawValue;
            }
            maxContentLengths[colIdx] = Math.max(maxContentLengths[colIdx], 10);
            break;
          }
          case 'text':
          default: {
            if (colIdx === padron.cuitFieldIndex) {
              cell.value = normalizeCuit(rawValue);
              cell.numFmt = '@';
              maxContentLengths[colIdx] = Math.max(maxContentLengths[colIdx], 13);
            } else {
              cell.value = rawValue;
              // Track content length but cap at 50 for width purposes
              maxContentLengths[colIdx] = Math.max(
                maxContentLengths[colIdx],
                Math.min(rawValue.length, 50)
              );
            }
            break;
          }
        }
      }
    });
  });

  // Column widths — minimum is header length, content-based up to a cap
  padron.fields.forEach((field, i) => {
    const col = ws.getColumn(i + 1);
    // Header length + 2 for padding; content length + 2 for padding
    const headerWidth = field.name.length + 2;
    const contentWidth = maxContentLengths[i] + 2;
    // Take the larger of header vs content, but cap at 50
    col.width = Math.min(Math.max(headerWidth, contentWidth), 52);
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
