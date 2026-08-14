export interface ParsedSpec {
  key: string;
  value: string;
}

function isHeaderRow({ key, value }: ParsedSpec): boolean {
  const k = key.trim().toLowerCase();
  const v = value.trim().toLowerCase();
  const keyLooksLikeHeader = k === "specification" || k === "spec" || k === "key" || k === "field" || k === "attribute";
  const valueLooksLikeHeader = v === "details" || v === "detail" || v === "value";
  return keyLooksLikeHeader && (valueLooksLikeHeader || v === "");
}

function dedupe(pairs: ParsedSpec[]): ParsedSpec[] {
  const seen = new Map<string, number>();
  const result: ParsedSpec[] = [];
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (!key) continue;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) {
      result[seen.get(normalized)!] = { key, value: pair.value.trim() };
    } else {
      seen.set(normalized, result.length);
      result.push({ key, value: pair.value.trim() });
    }
  }
  return result;
}

/**
 * Converts pasted specification data — copied Excel/table rows (tab-separated),
 * pipe tables ("Key| Value"), colon lines ("Brand: SummerCool / Capacity: 65L"),
 * or plain alternating lines (key on one line, value on the next) — into a
 * clean list of { key, value } specification rows.
 */
export function parseSmartSpecifications(raw: string): ParsedSpec[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const nonEmptyLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (nonEmptyLines.length === 0) return [];

  // 1. Tab-separated — pasted directly from Excel/Sheets.
  if (lines.some((l) => l.includes("\t"))) {
    const pairs = lines
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        const parts = l.split("\t").map((p) => p.trim());
        return { key: parts[0] ?? "", value: parts.slice(1).join(" ").trim() };
      })
      .filter((p) => p.key && !isHeaderRow(p));
    if (pairs.length > 0) return dedupe(pairs);
  }

  // 2. Pipe-delimited table, e.g. "Brand| SummerCool".
  if (nonEmptyLines.some((l) => l.includes("|"))) {
    const pairs = nonEmptyLines
      .map((l) => {
        const parts = l.split("|").map((p) => p.trim());
        return { key: parts[0] ?? "", value: parts.slice(1).join(" ").trim() };
      })
      .filter((p) => p.key && !isHeaderRow(p));
    if (pairs.length > 0) return dedupe(pairs);
  }

  // 3. Colon-separated, optionally several pairs per line joined with "/",
  //    e.g. "Brand: SummerCool / Capacity: 65L".
  const colonLineRatio = nonEmptyLines.filter((l) => l.includes(":")).length / nonEmptyLines.length;
  if (colonLineRatio >= 0.5) {
    const pairs: ParsedSpec[] = [];
    for (const line of nonEmptyLines) {
      const segments = line.split("/").map((s) => s.trim()).filter(Boolean);
      for (const segment of segments) {
        const colonIndex = segment.indexOf(":");
        if (colonIndex === -1) continue;
        const key = segment.slice(0, colonIndex).trim();
        const value = segment.slice(colonIndex + 1).trim();
        if (key) pairs.push({ key, value });
      }
    }
    if (pairs.length > 0) return dedupe(pairs.filter((p) => !isHeaderRow(p)));
  }

  // 4. Fallback — alternating lines: key, value, key, value…
  //    (matches specs copied as "Brand" / newline / "SummerCool" / blank line / …)
  const pairs: ParsedSpec[] = [];
  for (let i = 0; i < nonEmptyLines.length; i += 2) {
    const key = nonEmptyLines[i];
    const value = nonEmptyLines[i + 1] ?? "";
    if (key) pairs.push({ key, value });
  }
  return dedupe(pairs.filter((p) => !isHeaderRow(p)));
}
