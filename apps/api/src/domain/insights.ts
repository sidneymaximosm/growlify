import type { Category, Transaction } from "@prisma/client";
import { endOfMonthUTC, startOfMonthUTC } from "./dates.js";

export type Insight = {
  id: string;
  type: "alert";
  title: string;
  message: string;
  severity: "info" | "warning";
};

function pct(a: number, b: number) {
  if (b === 0) return null;
  return (a / b) * 100;
}

export function computeInsights(params: {
  categories: Category[];
  transactions: Transaction[];
  now: Date;
}): Insight[] {
  const { categories, transactions, now } = params;

  // Cortes em UTC para não perder itens em 00:00Z (ex.: lançamentos salvos como yyyy-mm-dd).
  const startThisMonth = startOfMonthUTC(now, 0);
  const startLastMonth = startOfMonthUTC(now, -1);
  const endLastMonth = endOfMonthUTC(now, -1);

  const thisMonth = transactions.filter((t) => t.date >= startThisMonth);
  const lastMonth = transactions.filter((t) => t.date >= startLastMonth && t.date <= endLastMonth);

  const sumByCategory = (list: Transaction[]) => {
    const map = new Map<string, number>();
    for (const t of list) {
      if (t.type !== "expense") continue;
      const key = (t as any).categoryId ?? "sem_categoria";
      map.set(key, (map.get(key) || 0) + t.amountCents);
    }
    return map;
  };

  const thisByCat = sumByCategory(thisMonth);
  const lastByCat = sumByCategory(lastMonth);

  const insights: Insight[] = [];

  let best: { categoryId: string; increasePct: number; curr: number; prev: number } | null = null;
  for (const [catId, curr] of thisByCat.entries()) {
    const prev = lastByCat.get(catId) || 0;
    if (prev === 0 || curr === 0) continue;
    const p = pct(curr - prev, prev);
    if (p === null) continue;
    if (!best || p > best.increasePct) best = { categoryId: catId, increasePct: p, curr, prev };
  }

  if (best && best.increasePct >= 10) {
    const category = categories.find((c) => c.id === best!.categoryId);
    const name = category?.name || "Sem categoria";
    const inc = Math.round(best.increasePct);
    insights.push({
      id: "cat_growth",
      type: "alert",
      title: "Varia\u00e7\u00e3o de gastos",
      message: `Gastos com ${name} subiram ${inc}% em rela\u00e7\u00e3o ao m\u00eas anterior.`,
      severity: inc >= 20 ? "warning" : "info"
    });
  }

  let budgetOver: { name: string; overPct: number } | null = null;
  for (const c of categories) {
    if (!c.monthlyBudgetCents) continue;
    const spent = thisByCat.get(c.id) || 0;
    if (spent <= c.monthlyBudgetCents) continue;
    const over = ((spent - c.monthlyBudgetCents) / c.monthlyBudgetCents) * 100;
    if (!budgetOver || over > budgetOver.overPct) budgetOver = { name: c.name, overPct: over };
  }
  if (budgetOver) {
    insights.push({
      id: "budget_over",
      type: "alert",
      title: "Or\u00e7amento do m\u00eas",
      message: `Voc\u00ea ultrapassou o or\u00e7amento em ${budgetOver.name}.`,
      severity: "warning"
    });
  }

  return insights;
}
