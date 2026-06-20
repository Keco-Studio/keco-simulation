import type { Rule, Contribution, RewardGrant } from './types';
import { evalNumber, evalBoolean } from './formulaAdapter';
import { resolveTrackId } from './templateRoute';

export function applyRules(contribution: Contribution, rules: Rule[]): RewardGrant[] {
  const scope = { amount: contribution.amount, ...contribution.ctx };
  const grants: RewardGrant[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.whenType !== contribution.type) continue;
    if (!evalBoolean(rule.filter, scope)) continue;
    const trackId = resolveTrackId(rule.targetTrackId, contribution);
    if (!trackId) continue;
    const amount = evalNumber(rule.rewardFormula, scope);
    if (!Number.isFinite(amount) || amount === 0) continue;
    grants.push({ trackId, amount, ruleId: rule.id });
  }
  return grants;
}
