import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../../../lib/progression/defaults';
import type { TrackState } from '@/lib/progression/types';
import { buildProgressionGrantLogLines } from '../formatProgressionBattleLog';

describe('buildProgressionGrantLogLines', () => {
  it('formats character exp and skill proficiency lines', () => {
    const trackStates: Record<string, TrackState> = {
      char_exp: {
        id: 'char_exp',
        total: 520,
        level: 3,
        progressToNext: 0.4,
        unlockedRewards: [],
      },
      prof_firebolt: {
        id: 'prof_firebolt',
        total: 120,
        level: 2,
        progressToNext: 0.2,
        unlockedRewards: [],
      },
    };
    const lines = buildProgressionGrantLogLines(
      [
        { trackId: 'char_exp', amount: 52, ruleId: 'exp_from_damage' },
        { trackId: 'prof_firebolt', amount: 10, ruleId: 'prof_from_cast' },
      ],
      DEFAULT_CONFIG,
      trackStates,
      { firebolt: 'Firebolt' }
    );
    expect(lines).toEqual([
      '  [growth] +52 角色经验 → Lv3 (累计 520)',
      '  [growth] +10 Firebolt 熟练度 → 熟练 (累计 120)',
    ]);
  });
});
