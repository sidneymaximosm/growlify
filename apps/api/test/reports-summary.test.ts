import test from "node:test";
import assert from "node:assert/strict";
import { monthEndUTC, monthStartUTC } from "../src/domain/dates.js";

test("soma despesas do mês atual e ignora mês anterior", () => {
  const now = new Date("2026-02-16T12:00:00.000Z");
  const from = monthStartUTC(now);
  const to = monthEndUTC(now);

  const txs = [
    { type: "income", amountCents: 100_00, date: new Date("2026-02-02T12:00:00.000Z") },
    { type: "expense", amountCents: 40_00, date: new Date("2026-02-05T12:00:00.000Z") },
    { type: "expense", amountCents: 70_00, date: new Date("2026-01-20T12:00:00.000Z") }
  ];

  const inRange = txs.filter((t) => t.date >= from && t.date <= to);
  const income = inRange.filter((t) => t.type === "income").reduce((a, b) => a + b.amountCents, 0);
  const expense = inRange.filter((t) => t.type === "expense").reduce((a, b) => a + b.amountCents, 0);

  assert.equal(income, 100_00);
  assert.equal(expense, 40_00);
  assert.equal(income - expense, 60_00);
});

