import type { Rule, Contribution, RewardGrant } from './types';
import { evalNumber, evalBoolean } from './formulaAdapter';
import { resolveTrackId } from './templateRoute';

/** Scope for filter/rewardFormula: event amount, dynamic ctx, then params (params win on key clash). */
export function buildRuleScope(
  contribution: Contribution,
  rule: Rule
): Record<string, number | string> {
  return {
    amount: contribution.amount,
    ...contribution.ctx,
    ...(rule.params ?? {}),
  };
}

export function applyRules(contribution: Contribution, rules: Rule[]): RewardGrant[] {
  const grants: RewardGrant[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.whenType !== contribution.type) continue;
    const scope = buildRuleScope(contribution, rule);
    if (!evalBoolean(rule.filter, scope)) continue;
    const trackId = resolveTrackId(rule.targetTrackId, contribution);
    if (!trackId) continue;
    const amount = evalNumber(rule.rewardFormula, scope);
    if (!Number.isFinite(amount) || amount === 0) continue;
    grants.push({ trackId, amount, ruleId: rule.id });
  }
  return grants;
}
