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
});
