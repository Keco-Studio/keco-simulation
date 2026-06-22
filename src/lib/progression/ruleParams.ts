/** Parse rule.params from JSON text (UI / XLSX). Returns undefined for empty input. */
export function parseRuleParamsJson(raw: string | undefined): Record<string, number> | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('invalid_json');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_shape');
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!key.trim()) continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      throw new Error(`invalid_value:${key}`);
    }
    out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function stringifyRuleParams(params: Record<string, number> | undefined): string {
  if (!params || Object.keys(params).length === 0) return '';
  return JSON.stringify(params);
}

export function isValidRuleParamsJson(raw: string | undefined): boolean {
  if (!raw?.trim()) return true;
  try {
    parseRuleParamsJson(raw);
    return true;
  } catch {
    return false;
  }
}
