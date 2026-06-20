import { describe, it, expect } from 'vitest';
import { simulate } from '../simulate';
import type { ProgressionConfig, Contribution } from '../types';

const config: ProgressionConfig = {
  tracks: [
    {
      id: 'char_exp',
      kind: 'exp_level',
      label: 'EXP',
      params: { baseExp: 100, growthFactor: 1.5, model: 'linear', maxLevel: 100 },
    },
    {
      id: 'prof_{skillId}',
      kind: 'proficiency',
      label: 'Skill prof',
      params: {
        tiers: [
          { threshold: 0, label: '生疏' },
          { threshold: 100, label: '熟练' },
        ],
      },
    },
  ],
  rules: [
    {
      id: 'exp',
      enabled: true,
      whenType: 'deal_damage',
      targetTrackId: 'char_exp',
      rewardFormula: 'amount*0.1',
    },
    {
      id: 'prof',
      enabled: true,
      whenType: 'deal_damage',
      targetTrackId: 'prof_{skillId}',
      rewardFormula: 'amount*0.05',
    },
  ],
};
const contributions: Contribution[] = [
  { type: 'deal_damage', amount: 1000, ctx: { skillId: 'fireball' }, step: 0 },
  { type: 'deal_damage', amount: 1000, ctx: { skillId: 'fireball' }, step: 1 },
];

describe('simulate', () => {
  it('produces one snapshot per step and accumulates', () => {
    const snaps = simulate(config, contributions);
    expect(snaps).toHaveLength(2);
    expect(snaps[1].tracks['char_exp'].total).toBe(200);
    expect(snaps[1].tracks['prof_fireball'].total).toBe(100);
  });
  it('is deterministic (same input → same output)', () => {
    expect(simulate(config, contributions)).toEqual(simulate(config, contributions));
  });
  it('lazily creates template-routed tracks', () => {
    const snaps = simulate(config, contributions);
    expect(snaps[0].tracks['prof_fireball']).toBeDefined();
  });
});
