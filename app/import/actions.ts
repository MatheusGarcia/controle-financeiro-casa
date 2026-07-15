"use server";
import { Person } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureInitialCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { parseMonthlyExpenses } from "@/lib/spreadsheet-importer";

export async function parseImportWorkbook(formData: FormData) { const file = formData.get("workbook"); if (!(file instanceof File) || !file.name.endsWith(".xlsx")) throw new Error("Selecione uma planilha .xlsx."); const items = await parseMonthlyExpenses(await file.arrayBuffer()); if (!items.length) throw new Error("Nenhum lançamento foi reconhecido."); const batch = await prisma.importBatch.create({ data: { sourceFileName: file.name, items: { create: items } } }); redirect(`/import/${batch.id}`); }
export async function commitImportBatch(formData: FormData) { const batchId = String(formData.get("batchId")); await ensureInitialCategories(); const [items, categories] = await Promise.all([prisma.importItem.findMany({ where: { batchId, importedExpense: null } }), prisma.category.findMany()]); const ids = new Map(categories.map((item) => [item.name, item.id])); await prisma.$transaction(async (tx) => { for (const item of items) { if (formData.get(`keep-${item.id}`) !== "on") continue; const categoryId = ids.get(String(formData.get(`category-${item.id}`))) ?? ids.get("Outros"); if (!categoryId) throw new Error("Categoria inválida"); await tx.expense.create({ data: { description: String(formData.get(`description-${item.id}`)), amount: Number(formData.get(`amount-${item.id}`)), occurredOn: new Date(`${String(formData.get(`date-${item.id}`))}T12:00:00`), payer: (formData.get(`payer-${item.id}`) || item.payer || Person.MATHEUS) as Person, sharingType: item.sharingType, categoryId, importItemId: item.id } }); } await tx.importBatch.update({ where: { id: batchId }, data: { importedAt: new Date() } }); }); revalidatePath("/"); redirect("/?month=2026-01"); }
