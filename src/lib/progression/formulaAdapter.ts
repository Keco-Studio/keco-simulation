import { evaluate, parse } from 'mathjs';

type Scope = Record<string, number | string>;

function toNumericScope(scope: Scope): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scope)) {
    const n = typeof v === 'number' ? v : Number(v);
    out[k] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

interface MathNode {
  type: string;
  name?: string;
  fn?: MathNode;
}

/**
 * Free variables referenced by an expression, so missing ones default to 0.
 * Skips function-name symbols (e.g. `floor`/`sqrt` in `floor(sqrt(total))`) so we
 * never shadow mathjs builtins by injecting them as 0 into the scope.
 */
function freeSymbols(expr: string): string[] {
  const names = new Set<string>();
  parse(expr).traverse((node: MathNode, _path: string, parent: MathNode | null) => {
    if (node.type !== 'SymbolNode' || !node.name) return;
    if (parent && parent.type === 'FunctionNode' && parent.fn === node) return;
    names.add(node.name);
  });
  return Array.from(names);
}

export function evalNumber(expr: string, scope: Scope): number {
  if (!expr || !expr.trim()) return 0;
  try {
    const numeric = toNumericScope(scope);
    for (const sym of freeSymbols(expr)) {
      if (!(sym in numeric)) numeric[sym] = 0;
    }
    const result = evaluate(expr, numeric);
    const n = Number(result);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function evalBoolean(expr: string | undefined, scope: Scope): boolean {
  if (!expr || !expr.trim()) return true;
  try {
    const numeric = toNumericScope(scope);
    for (const sym of freeSymbols(expr)) {
      if (!(sym in numeric)) numeric[sym] = 0;
    }
    return Boolean(evaluate(expr, numeric));
  } catch {
    return false;
  }
}

export function isValidFormula(expr: string | undefined): boolean {
  if (!expr || !expr.trim()) return false;
  try {
    parse(expr);
    return true;
  } catch {
    return false;
  }
}
