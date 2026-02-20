import test from "node:test";
import assert from "node:assert/strict";
import { generateResetToken, hashResetToken } from "../src/security/resetTokens.js";

test("generateResetToken gera token e hash consistentes", () => {
  const { token, tokenHash } = generateResetToken();
  assert.equal(typeof token, "string");
  assert.equal(typeof tokenHash, "string");
  assert.equal(tokenHash, hashResetToken(token));
});

test("hashResetToken \u00e9 determin\u00edstico", () => {
  const token = "abc123";
  assert.equal(hashResetToken(token), hashResetToken(token));
  assert.notEqual(hashResetToken(token), hashResetToken(token + "x"));
});

