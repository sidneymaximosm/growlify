import test from "node:test";
import assert from "node:assert/strict";
import { includesInsensitive } from "../src/domain/search.js";

test("includesInsensitive funciona com case-insensitive e null", () => {
  assert.equal(includesInsensitive("Aluguel", "alu"), true);
  assert.equal(includesInsensitive("Aluguel", "ALU"), true);
  assert.equal(includesInsensitive(null, "x"), false);
  assert.equal(includesInsensitive("abc", ""), true);
});

