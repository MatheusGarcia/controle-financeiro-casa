"use server";
import { Person } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { dashboardCacheTag } from "@/features/dashboard/data";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { ensureInitialCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { parseMonthlyExpenses } from "@/lib/spreadsheet-importer";

export type ImportWorkbookState = { message: string; status: "idle" | "error" };

export async function parseImportWorkbook(_previousState: ImportWorkbookState, formData: FormData): Promise<ImportWorkbookState> {
  await requireAuthorizedUser();
  const file = formData.get("workbook");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) return { message: "Selecione um arquivo do Excel no formato .xlsx.", status: "error" };
  if (file.size === 0) return { message: "O arquivo selecionado está vazio.", status: "error" };
  if (file.size > 10 * 1024 * 1024) return { message: "A planilha deve ter no máximo 10 MB.", status: "error" };

  let batchId: string;
  try {
    const items = await parseMonthlyExpenses(await file.arrayBuffer());
    if (!items.length) return { message: "Nenhum lançamento foi reconhecido. Confira se a planilha mantém as colunas e abas do modelo original.", status: "error" };
    const batch = await prisma.importBatch.create({ data: { sourceFileName: file.name, items: { create: items } } });
    batchId = batch.id;
  } catch (error) {
    console.error("Workbook import parsing failed", error instanceof Error ? { name: error.name } : { type: typeof error });
    return { message: "Não foi possível ler esta planilha. Verifique o formato e tente novamente.", status: "error" };
  }
  redirect(`/import/${batchId}`);
}
export async function commitImportBatch(formData: FormData) {
  await requireAuthorizedUser();
  const batchId = String(formData.get("batchId"));
  await ensureInitialCategories();

  const [items, categories] = await Promise.all([
    prisma.importItem.findMany({ where: { batchId, importedExpense: null } }),
    prisma.category.findMany(),
  ]);
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  let targetMonth: string | null = null;

  const expenseCreates = items.flatMap((item) => {
    if (formData.get(`keep-${item.id}`) !== "on") return [];

    const categoryId = categoryIds.get(String(formData.get(`category-${item.id}`))) ?? categoryIds.get("Outros");
    if (!categoryId) throw new Error("Categoria inválida");

    const date = String(formData.get(`date-${item.id}`));
    targetMonth ??= date.slice(0, 7);
    return [
      prisma.expense.create({
        data: {
          description: String(formData.get(`description-${item.id}`)),
          amount: Number(formData.get(`amount-${item.id}`)),
          purchasedOn: new Date(`${date}T12:00:00`),
          occurredOn: new Date(`${date}T12:00:00`),
          payer: (formData.get(`payer-${item.id}`) || item.payer || Person.MATHEUS) as Person,
          sharingType: item.sharingType,
          categoryId,
          importItemId: item.id,
        },
      }),
    ];
  });

  if (expenseCreates.length === 0) redirect(`/import/${batchId}?notice=none-selected`);

  await prisma.$transaction([
    ...expenseCreates,
    prisma.importBatch.update({ where: { id: batchId }, data: { importedAt: new Date() } }),
  ]);

  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${targetMonth}`);
}
