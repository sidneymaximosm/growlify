export function includesInsensitive(haystack: string | null | undefined, needle: string | null | undefined) {
  const h = String(haystack || "").toLowerCase();
  const n = String(needle || "").trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

