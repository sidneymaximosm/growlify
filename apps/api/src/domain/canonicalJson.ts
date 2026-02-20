import crypto from "crypto";

function sortObjectKeysDeep(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortObjectKeysDeep);
  if (typeof value !== "object") return value;

  const out: Record<string, any> = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = sortObjectKeysDeep(value[key]);
  }
  return out;
}

export function canonicalJsonString(value: any) {
  return JSON.stringify(sortObjectKeysDeep(value));
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

