import "server-only";
import ExcelJS from "exceljs";

export type ParsedRow = {
  row: number;
  number: string;
  invoiceDate: string;
  storeName: string;
  city: string;
  address: string;
  phone: string;
  amount: number | null;
};

type Field = Exclude<keyof ParsedRow, "row">;

/** Header names we recognise (Uzbek, Russian, English). Compared lowercase. */
const HEADERS: Record<Field, string[]> = {
  number: ["nakladnoy", "nakladnoy №", "nakladnoy raqami", "накладная", "накладная №", "номер накладной", "№ накладной", "номер", "№", "invoice", "invoice no", "invoice number"],
  invoiceDate: ["sana", "дата", "date", "дата накладной"],
  storeName: ["dorixona", "mijoz", "qabul qiluvchi", "аптека", "клиент", "получатель", "контрагент", "store", "pharmacy", "customer"],
  city: ["shahar", "viloyat", "hudud", "город", "область", "регион", "city", "region"],
  address: ["manzil", "адрес", "address"],
  phone: ["telefon", "телефон", "phone"],
  amount: ["summa", "jami", "сумма", "итого", "amount", "total", "sum"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[:.]$/, "");

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v).trim();
}

export function parseAmount(v: ExcelJS.CellValue | string): number | null {
  if (typeof v === "number") return v;
  const s = cellText(v as ExcelJS.CellValue).replace(/[\s ]/g, "").replace(/so'?m|сум|uzs/gi, "");
  if (!s) return null;
  // "1234567,50" -> 1234567.50 ; "1,234,567.50" -> 1234567.50
  const cleaned = s.includes(",") && s.includes(".") ? s.replace(/,/g, "") : s.replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseDate(v: ExcelJS.CellValue | string, fallback: string): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Excel serial date
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const s = cellText(v as ExcelJS.CellValue);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return fallback;
}

/** Reads the first sheet. Finds the header row within the first 10 rows. */
export async function parseInvoiceExcel(buf: ArrayBuffer, defaultDate: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [] as ParsedRow[], missingColumns: ["number", "storeName", "city", "amount"] as Field[] };

  let headerRow = 0;
  let cols: Partial<Record<Field, number>> = {};
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    const found: Partial<Record<Field, number>> = {};
    ws.getRow(r).eachCell((cell, col) => {
      const h = norm(cellText(cell.value));
      if (!h) return;
      for (const f of Object.keys(HEADERS) as Field[]) {
        if (found[f] == null && HEADERS[f].includes(h)) {
          found[f] = col;
          return;
        }
      }
      for (const f of Object.keys(HEADERS) as Field[]) {
        if (found[f] == null && HEADERS[f].some((a) => a.length > 3 && h.includes(a))) {
          found[f] = col;
          return;
        }
      }
    });
    if (Object.keys(found).length >= 3) {
      headerRow = r;
      cols = found;
      break;
    }
  }

  const required: Field[] = ["number", "storeName", "city", "amount"];
  const missingColumns = required.filter((f) => cols[f] == null);
  if (missingColumns.length) return { rows: [], missingColumns };

  const rows: ParsedRow[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (f: Field) => (cols[f] ? row.getCell(cols[f]!).value : null);
    const number = cellText(get("number"));
    const storeName = cellText(get("storeName"));
    if (!number && !storeName) continue; // empty line
    if (/^(итого|jami|total)/i.test(number) || /^(итого|jami|total)/i.test(storeName)) continue; // totals line
    rows.push({
      row: r,
      number,
      invoiceDate: parseDate(get("invoiceDate"), defaultDate),
      storeName,
      city: cellText(get("city")),
      address: cellText(get("address")),
      phone: cellText(get("phone")),
      amount: parseAmount(get("amount")),
    });
  }
  return { rows, missingColumns };
}

export async function workbookToBuffer(wb: ExcelJS.Workbook) {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export { ExcelJS };
