"use server";
import { Person } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { dashboardCacheTag } from "@/features/dashboard/data";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { ensureInitialCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { parseMonthlyExpenses } from "@/lib/spreadsheet-importer";

export async function parseImportWorkbook(formData: FormData) { await requireAuthorizedUser(); const file = formData.get("workbook"); if (!(file instanceof File) || !file.name.endsWith(".xlsx")) throw new Error("Selecione uma planilha .xlsx."); const items = await parseMonthlyExpenses(await file.arrayBuffer()); if (!items.length) throw new Error("Nenhum lançamento foi reconhecido."); const batch = await prisma.importBatch.create({ data: { sourceFileName: file.name, items: { create: items } } }); redirect(`/import/${batch.id}`); }
export async function commitImportBatch(formData: FormData) {
  await requireAuthorizedUser();
  const batchId = String(formData.get("batchId"));
  await ensureInitialCategories();

  const [items, categories] = await Promise.all([
    prisma.importItem.findMany({ where: { batchId, importedExpense: null } }),
    prisma.category.findMany(),
  ]);
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));

  const expenseCreates = items.flatMap((item) => {
    if (formData.get(`keep-${item.id}`) !== "on") return [];

    const categoryId = categoryIds.get(String(formData.get(`category-${item.id}`))) ?? categoryIds.get("Outros");
    if (!categoryId) throw new Error("Categoria inválida");

    return [
      prisma.expense.create({
        data: {
          description: String(formData.get(`description-${item.id}`)),
          amount: Number(formData.get(`amount-${item.id}`)),
          purchasedOn: new Date(`${String(formData.get(`date-${item.id}`))}T12:00:00`),
          occurredOn: new Date(`${String(formData.get(`date-${item.id}`))}T12:00:00`),
          payer: (formData.get(`payer-${item.id}`) || item.payer || Person.MATHEUS) as Person,
          sharingType: item.sharingType,
          categoryId,
          importItemId: item.id,
        },
      }),
    ];
  });

  await prisma.$transaction([
    ...expenseCreates,
    prisma.importBatch.update({ where: { id: batchId }, data: { importedAt: new Date() } }),
  ]);

  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect("/?month=2026-01");
}
