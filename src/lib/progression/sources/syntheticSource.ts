import type { Contribution } from '../types';

export interface PerStepContribution {
  type: string;
  amount: number;
  ctx: Record<string, number | string>;
}

export interface BehaviorProfile {
  steps: number;
  perStep: PerStepContribution[];
}

export function generateSyntheticContributions(profile: BehaviorProfile): Contribution[] {
  const out: Contribution[] = [];
  for (let step = 0; step < profile.steps; step++) {
    for (const item of profile.perStep) {
      out.push({ type: item.type, amount: item.amount, ctx: { ...item.ctx }, step });
    }
  }
  return out;
}
