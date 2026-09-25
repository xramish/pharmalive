import { requireUser } from "@/lib/auth";
import { ExcelJS, workbookToBuffer } from "@/lib/excel";

export async function GET() {
  await requireUser(["operator"]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Nakladnoylar");
  ws.columns = [
    { header: "Nakladnoy №", width: 16 },
    { header: "Sana", width: 12 },
    { header: "Dorixona", width: 32 },
    { header: "Shahar", width: 18 },
    { header: "Manzil", width: 36 },
    { header: "Telefon", width: 16 },
    { header: "Summa", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow(["A-1001", "25.09.2026", "Dori-Darmon №5", "Samarqand", "Registon ko'chasi 12", "+998901234567", 12500000]);
  return new Response(await workbookToBuffer(wb), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pharmalive-shablon.xlsx"',
    },
  });
}
