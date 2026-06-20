import { describe, it, expect } from 'vitest';
import { TRACK_STRATEGIES, initTrackState } from '../tracks';
import type { TrackDef } from '../types';

const expDef: TrackDef = {
  id: 'char_exp',
  kind: 'exp_level',
  label: 'EXP',
  params: { baseExp: 100, growthFactor: 1.5, model: 'linear', maxLevel: 100 },
};
const profDef: TrackDef = {
  id: 'prof_fireball',
  kind: 'proficiency',
  label: 'Fireball',
  params: {
    tiers: [
      { threshold: 0, label: '生疏' },
      { threshold: 100, label: '熟练' },
      { threshold: 500, label: '精通' },
    ],
  },
};
const mileDef: TrackDef = {
  id: 'damage_total',
  kind: 'milestone',
  label: 'Damage',
  params: {
    milestones: [
      { at: 1000, reward: 'title_a' },
      { at: 5000, reward: 'title_b' },
    ],
  },
};
const rateDef: TrackDef = {
  id: 'idle',
  kind: 'rate_accrual',
  label: 'Idle',
  params: { ratePerUnit: 2, cap: 1000 },
};

describe('exp_level', () => {
  it('accrues and computes level via linear model', () => {
    const s = TRACK_STRATEGIES.exp_level.accrue(initTrackState(expDef), 250, expDef);
    expect(s.total).toBe(250);
    expect(s.level).toBe(3); // exp for lvl: 1->0, 2->100, 3->200, 4->300; 200<=250<300
    expect(s.progressToNext).toBeGreaterThan(0);
  });
});

describe('proficiency', () => {
  it('lands on tier by threshold', () => {
    let s = initTrackState(profDef);
    s = TRACK_STRATEGIES.proficiency.accrue(s, 120, profDef);
    expect(s.total).toBe(120);
    expect(s.level).toBe(2); // 熟练 (index 1) → level 2
  });
});

describe('milestone', () => {
  it('unlocks rewards once when crossing', () => {
    let s = initTrackState(mileDef);
    s = TRACK_STRATEGIES.milestone.accrue(s, 1200, mileDef);
    expect(s.unlockedRewards).toEqual(['title_a']);
    s = TRACK_STRATEGIES.milestone.accrue(s, 4000, mileDef);
    expect(s.unlockedRewards).toEqual(['title_a', 'title_b']);
    s = TRACK_STRATEGIES.milestone.accrue(s, 1, mileDef);
    expect(s.unlockedRewards).toEqual(['title_a', 'title_b']); // no dup
  });
});

describe('rate_accrual', () => {
  it('accrues with cap', () => {
    let s = initTrackState(rateDef);
    s = TRACK_STRATEGIES.rate_accrual.accrue(s, 100, rateDef); // 100*2=200
    expect(s.total).toBe(200);
    s = TRACK_STRATEGIES.rate_accrual.accrue(s, 1000, rateDef); // would be 2200, capped 1000
    expect(s.total).toBe(1000);
  });
});
