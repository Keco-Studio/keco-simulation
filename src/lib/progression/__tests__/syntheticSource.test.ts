import { describe, it, expect } from 'vitest';
import { generateSyntheticContributions } from '../sources/syntheticSource';
import type { BehaviorProfile } from '../sources/syntheticSource';

const profile: BehaviorProfile = {
  steps: 2,
  perStep: [
    { type: 'deal_damage', amount: 5000, ctx: { skillId: 'fireball' } },
    { type: 'time_elapsed', amount: 1800, ctx: {} },
  ],
};

describe('generateSyntheticContributions', () => {
  it('expands profile across steps with step index', () => {
    const out = generateSyntheticContributions(profile);
    expect(out).toHaveLength(4);
    expect(out[0].step).toBe(0);
    expect(out[2].step).toBe(1);
    expect(out[0].type).toBe('deal_damage');
  });

  it('emits one cast_skill per selected skill per step', () => {
    const withSkills: BehaviorProfile = {
      steps: 2,
      perStep: [{ type: 'time_elapsed', amount: 60, ctx: {} }],
      skills: [
        { id: 'fireball', name: 'Fireball', castsPerStep: 5 },
        { id: 'iceball', name: 'Iceball', castsPerStep: 3 },
      ],
    };
    const out = generateSyntheticContributions(withSkills);
    const casts = out.filter((c) => c.type === 'cast_skill');
    expect(casts).toHaveLength(4); // 2 skills x 2 steps
    expect(casts.find((c) => c.ctx.skillId === 'fireball')?.amount).toBe(5);
    expect(casts.find((c) => c.ctx.skillId === 'iceball')?.amount).toBe(3);
  });

  it('skips skills with zero casts per step', () => {
    const out = generateSyntheticContributions({
      steps: 1,
      perStep: [],
      skills: [{ id: 'a', name: 'A', castsPerStep: 0 }],
    });
    expect(out).toHaveLength(0);
  });
});
