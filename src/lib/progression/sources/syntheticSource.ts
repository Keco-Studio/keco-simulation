import type { Contribution } from '../types';

export interface PerStepContribution {
  type: string;
  amount: number;
  ctx: Record<string, number | string>;
}

/**
 * Per-skill usage picked from the real battle skill table. Each selected skill
 * emits its own `cast_skill` contribution per step, so template-routed tracks
 * (`prof_{skillId}`) produce one independent proficiency track per real skill.
 */
export interface SkillUsage {
  id: string;
  name: string;
  castsPerStep: number;
}

export interface BehaviorProfile {
  steps: number;
  perStep: PerStepContribution[];
  /** Optional real-skill usage; absent in legacy profiles. */
  skills?: SkillUsage[];
}

export function generateSyntheticContributions(profile: BehaviorProfile): Contribution[] {
  const out: Contribution[] = [];
  const skills = profile.skills ?? [];
  for (let step = 0; step < profile.steps; step++) {
    for (const item of profile.perStep) {
      out.push({ type: item.type, amount: item.amount, ctx: { ...item.ctx }, step });
    }
    for (const skill of skills) {
      if (skill.castsPerStep > 0) {
        out.push({
          type: 'cast_skill',
          amount: skill.castsPerStep,
          ctx: { skillId: skill.id },
          step,
        });
      }
    }
  }
  return out;
}
