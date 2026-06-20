import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../defaults';
import {
  createTrackRuntime,
  applyContributionBatch,
  trackStatesToRecord,
} from '../runtime';
import type { Contribution } from '../types';

describe('progression runtime', () => {
  it('accumulates contributions into track states', () => {
    const ctx = createTrackRuntime(DEFAULT_CONFIG);
    const contributions: Contribution[] = [
      { type: 'deal_damage', amount: 1000, ctx: { enemyLevel: 30, skillId: 'firebolt' }, step: 0 },
      { type: 'cast_skill', amount: 1, ctx: { skillId: 'firebolt' }, step: 0 },
    ];
    const grants = applyContributionBatch(ctx, DEFAULT_CONFIG, contributions);
    expect(grants.length).toBeGreaterThan(0);
    const states = trackStatesToRecord(ctx);
    expect(states['char_exp']?.total).toBeGreaterThan(0);
    expect(states['prof_firebolt']?.total).toBeGreaterThan(0);
  });
});
