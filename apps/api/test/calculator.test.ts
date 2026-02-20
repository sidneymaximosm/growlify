import test from "node:test";
import assert from "node:assert/strict";
import { runCalculator } from "../src/domain/calculator.js";

test("daily_limit_month: referência diária muda ao trocar daysBase", () => {
  const baseParams = { limitCents: 2300_00, spentCents: 0, asOfDate: "2026-02-16" };

  const r28 = runCalculator("daily_limit_month", { ...baseParams, daysBase: 28 }).result;
  const r30 = runCalculator("daily_limit_month", { ...baseParams, daysBase: 30 }).result;

  assert.equal(r28.daysLeft, 28);
  assert.equal(r30.daysLeft, 30);
  assert.equal(r28.perDayCents, Math.floor(2300_00 / 28));
  assert.equal(r30.perDayCents, Math.floor(2300_00 / 30));
  assert.notEqual(r28.perDayCents, r30.perDayCents);
});

