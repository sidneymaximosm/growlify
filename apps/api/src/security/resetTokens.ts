import crypto from "node:crypto";

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

