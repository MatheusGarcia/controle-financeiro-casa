import ExcelJS from "exceljs";
import { Person, SharingType } from "@prisma/client";

type Candidate = { sheetName: string; sourceRow: number; description: string; amount: number; occurredOn: Date; payer: Person | null; sharingType: SharingType; categoryName: string; needsReview: boolean };
const months: Record<string, number> = { janeiro: 0, fevereiro: 1, "março": 2, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
const person = (value: string) => value.toLowerCase().includes("matheus") ? Person.MATHEUS : value.toLowerCase().includes("karina") ? Person.KARINA : null;
const category = (description: string, fallback: string) => /(ração|pethaus|cobasi|banho|creche|cadel)/i.test(description) ? "Cadelas" : /(uber|gasolina|estacionamento|carro|biciclet)/i.test(description) ? "Transporte e combustível" : /(airbnb|latam|passagem|aeroporto|rio)/i.test(description) ? "Viagens" : /(netflix|disney|chatgpt|duogourmet)/i.test(description) ? "Assinaturas" : fallback;

export async function parseMonthlyExpenses(buffer: ArrayBuffer): Promise<Candidate[]> {
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer); const out: Candidate[] = [];
  for (const ws of workbook.worksheets) {
    const key = ws.name.toLowerCase(); const monthName = Object.keys(months).find((item) => key.startsWith(item)); const year = Number(key.match(/20\d{2}/)?.[0]); if (!monthName || !year) continue;
    const push = (row: number, d: number, p: number, s: number, a: number, fallback: string) => { const desc = ws.getRow(row).getCell(d).text.trim(); const amount = Number(ws.getRow(row).getCell(a).value); const sharing = ws.getRow(row).getCell(s).text.trim().toLowerCase(); const payer = person(ws.getRow(row).getCell(p).text); if (!desc || !Number.isFinite(amount) || amount <= 0 || !/^(sim|não|nao)$/.test(sharing)) return; out.push({ sheetName: ws.name, sourceRow: row, description: desc, amount, occurredOn: new Date(year, months[monthName], 1, 12), payer, sharingType: sharing === "sim" ? SharingType.COMPARTILHADA : SharingType.INDIVIDUAL, categoryName: category(desc, fallback), needsReview: !payer }); };
    for (let r = 3; r <= ws.rowCount; r++) { push(r, 4, 5, 6, 7, r < 13 ? "Moradia" : "Mercado e alimentação"); push(r, 8, 9, 10, 11, r < 13 ? "Cadelas" : "Lazer e fim de semana"); push(r, 13, 17, 16, 14, "Outros"); }
  } return out;
}
