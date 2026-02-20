import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../http/authMiddleware.js";
import { computeInsights } from "../domain/insights.js";
import { monthEndUTC, monthStartUTC, startOfMonthUTC } from "../domain/dates.js";

export const reportsRouter = Router();

const SummaryQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});

function formatCsvDate(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  card: "Cart\u00e3o",
  pix: "Pix",
  transfer: "Transfer\u00eancia",
  other: "Outro"
};

reportsRouter.get("/summary", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const q = SummaryQuery.parse(req.query);

    const now = new Date();
    // Período padrão (mês atual) em UTC para não excluir lançamentos em 00:00Z.
    const from = q.from ? new Date(String(q.from)) : monthStartUTC(now);
    // Sem "to", consideramos o mês inteiro (inclui lançamentos futuros no mês).
    const to = q.to ? new Date(String(q.to)) : monthEndUTC(now);
    const nowRef = q.to ? new Date(String(q.to)) : now;
    const insightsFrom = startOfMonthUTC(nowRef, -1);

    const [periodTx, insightsTx, categories] = await Promise.all([
      prisma.transaction.findMany({ where: { userId, date: { gte: from, lte: to } }, include: { category: true } }),
      prisma.transaction.findMany({ where: { userId, date: { gte: insightsFrom, lte: to } } }),
      prisma.category.findMany({ where: { userId } })
    ]);

    const income = periodTx.filter((t) => t.type === "income").reduce((a, b) => a + b.amountCents, 0);
    const expense = periodTx.filter((t) => t.type === "expense").reduce((a, b) => a + b.amountCents, 0);
    const result = income - expense;

    // Insights precisam de dados do mês atual + mês anterior para comparações (ex.: "subiram X%").
    const insights = computeInsights({ categories, transactions: insightsTx as any, now: nowRef });

    res.json({
      period: { from, to },
      totals: {
        balance_cents: result,
        income_cents: income,
        expense_cents: expense,
        result_cents: result
      },
      insights
    });
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/export.csv", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const q = SummaryQuery.parse(req.query);
    const now = new Date();
    const from = q.from ? new Date(String(q.from)) : monthStartUTC(now);
    const to = q.to ? new Date(String(q.to)) : monthEndUTC(now);

    const items = await prisma.transaction.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { category: true },
      orderBy: { date: "desc" }
    });

    const header = ["Data", "Tipo", "Valor (R$)", "Categoria", "M\u00e9todo", "Descri\u00e7\u00e3o", "Tag"];
    const escape = (v: string) => `"${String(v).replaceAll("\"", "\"\"")}"`;
    const toMoney = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

    const lines = [
      header.join(";"),
      ...items.map((t) =>
        [
          formatCsvDate(new Date(t.date)),
          t.type === "income" ? "Entrada" : "Sa\u00edda",
          toMoney(t.amountCents),
          t.category?.name || "Sem categoria",
          METHOD_LABEL[t.method] || "Outro",
          t.description || "",
          t.tag || ""
        ]
          .map((x) => escape(String(x)))
          .join(";")
      )
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"growlify-lancamentos.csv\"");
    res.send(lines.join("\n"));
  } catch (err) {
    next(err);
  }
});
