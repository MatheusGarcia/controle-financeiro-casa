import { cache } from "react";
import { SettlementStatus, SharingType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { observe } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

export const dashboardCacheTag = "finance-dashboard";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export type MonthlyDashboardData = {
  summary: { sharedTotal: number; pendingPerPerson: number; matheusPaid: number; karinaPaid: number };
  dashboard: {
    monthLabel: string;
    monthTotal: number;
    sharedTotal: number;
    individualTotal: number;
    settledTotal: number;
    settlement: string;
    balanced: boolean;
    personTotals: Array<{ person: "MATHEUS" | "KARINA"; value: number }>;
    upcomingExpenses: Array<{ id: string; description: string; occurredOn: string; categoryName: string; amount: number }>;
    categoryTotals: Array<[string, number]>;
    monthlyTrend: Array<{ date: string; value: number }>;
  };
};

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return { start: new Date(year, monthNumber - 1, 1, 12), end: new Date(year, monthNumber, 1, 12) };
}

const getCachedMonthlyDashboard = unstable_cache(
  async (month: string): Promise<MonthlyDashboardData> => observe("dashboard_cache_miss", async () => {
    const { start, end } = monthBounds(month);
    const trendStart = new Date(start.getFullYear(), start.getMonth() - 5, 1, 12);
    const upcomingEnd = new Date(end.getFullYear(), end.getMonth() + 3, 1, 12);
    const [expenses, trendExpenses, upcomingExpenses] = await Promise.all([
      prisma.expense.findMany({ where: { deletedAt: null, occurredOn: { gte: start, lt: end } }, include: { category: true } }),
      prisma.expense.findMany({ where: { deletedAt: null, occurredOn: { gte: trendStart, lt: end } }, select: { amount: true, occurredOn: true } }),
      prisma.expense.findMany({ where: { deletedAt: null, occurredOn: { gte: end, lt: upcomingEnd }, status: "PENDENTE" }, include: { category: true }, orderBy: { occurredOn: "asc" }, take: 6 }),
    ]);
    const sum = (items: Array<{ amount: { toNumber(): number } }>) => items.reduce((total, item) => total + item.amount.toNumber(), 0);
    const shared = expenses.filter((expense) => expense.sharingType === SharingType.COMPARTILHADA);
    const pendingSettlement = shared.filter((expense) => expense.settlementStatus === SettlementStatus.PENDENTE_DIVISAO);
    const matheusPaid = sum(pendingSettlement.filter((expense) => expense.payer === "MATHEUS"));
    const karinaPaid = sum(pendingSettlement.filter((expense) => expense.payer === "KARINA"));
    const matheusBalance = matheusPaid - (matheusPaid + karinaPaid) / 2;
    const balanced = Math.abs(matheusBalance) < 0.005;
    const categoryTotals = Array.from(expenses.reduce((result, expense) => result.set(expense.category.name, (result.get(expense.category.name) ?? 0) + expense.amount.toNumber()), new Map<string, number>())).sort(([, left], [, right]) => right - left);
    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth() - 5 + index, 1, 12);
      return { date: date.toISOString(), value: sum(trendExpenses.filter((expense) => expense.occurredOn.getFullYear() === date.getFullYear() && expense.occurredOn.getMonth() === date.getMonth())) };
    });

    return {
      summary: { sharedTotal: sum(shared), pendingPerPerson: (matheusPaid + karinaPaid) / 2, matheusPaid, karinaPaid },
      dashboard: {
        monthLabel: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start),
        monthTotal: sum(expenses),
        sharedTotal: sum(shared),
        individualTotal: sum(expenses.filter((expense) => expense.sharingType === SharingType.INDIVIDUAL)),
        settledTotal: sum(shared.filter((expense) => expense.settlementStatus === SettlementStatus.DIVIDIDA)),
        settlement: balanced ? "As despesas compartilhadas estão equilibradas." : matheusBalance > 0 ? `Karina deve ${currency.format(matheusBalance)} para Matheus.` : `Matheus deve ${currency.format(-matheusBalance)} para Karina.`,
        balanced,
        personTotals: ["MATHEUS", "KARINA"].map((person) => ({ person: person as "MATHEUS" | "KARINA", value: sum(expenses.filter((expense) => expense.payer === person)) })),
        upcomingExpenses: upcomingExpenses.map((expense) => ({ id: expense.id, description: expense.description, occurredOn: expense.occurredOn.toISOString(), categoryName: expense.category.name, amount: expense.amount.toNumber() })),
        categoryTotals,
        monthlyTrend,
      },
    };
  }),
  ["monthly-dashboard"],
  { revalidate: 300, tags: [dashboardCacheTag] },
);

export const getMonthlyDashboardData = cache(async (month: string) => getCachedMonthlyDashboard(month));
