import test from "node:test";
import assert from "node:assert/strict";
import { monthEndUTC, monthStartUTC } from "../src/domain/dates.js";

test("monthStartUTC inclui lançamentos em 00:00Z do primeiro dia do mês", () => {
  const now = new Date("2026-02-16T12:00:00.000Z");
  const from = monthStartUTC(now);

  assert.equal(from.toISOString(), "2026-02-01T00:00:00.000Z");

  const txAtMidnight = new Date("2026-02-01T00:00:00.000Z");
  assert.ok(txAtMidnight >= from);
});

test("monthEndUTC termina no último dia do mês (23:59:59.999Z)", () => {
  const now = new Date("2026-02-16T12:00:00.000Z");
  const to = monthEndUTC(now);
  assert.equal(to.toISOString(), "2026-02-28T23:59:59.999Z");
});
