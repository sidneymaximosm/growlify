import test from "node:test";
import assert from "node:assert/strict";
import { computeInsights } from "../src/domain/insights.js";

test("computeInsights gera observação de variação quando há dados do mês anterior", () => {
  const now = new Date("2026-02-16T12:00:00.000Z");
  const categories = [{ id: "c1", name: "Alimentação", monthlyBudgetCents: null }] as any[];

  const transactions = [
    { type: "expense", amountCents: 100_00, date: new Date("2026-01-10T12:00:00.000Z"), categoryId: "c1" },
    { type: "expense", amountCents: 130_00, date: new Date("2026-02-10T12:00:00.000Z"), categoryId: "c1" }
  ] as any[];

  const insights = computeInsights({ categories, transactions, now });
  assert.ok(insights.length >= 1);
  assert.ok(insights.some((i: any) => String(i.message).includes("subiram")));
});

