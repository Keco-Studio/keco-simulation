import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../../../lib/progression/defaults';
import type { RewardGrant } from '../../../../../../lib/progression/types';
import {
  aggregateGrantsByTrack,
  grantsToFloatRewards,
} from '../formatGrantFloatText';

describe('formatGrantFloatText', () => {
  it('aggregates grants by track id', () => {
    const grants: RewardGrant[] = [
      { trackId: 'char_exp', amount: 3.2, ruleId: 'a' },
      { trackId: 'char_exp', amount: 4.8, ruleId: 'b' },
      { trackId: 'prof_firebolt', amount: 2, ruleId: 'c' },
    ];
    const map = aggregateGrantsByTrack(grants);
    expect(map.get('char_exp')).toBe(8);
    expect(map.get('prof_firebolt')).toBe(2);
  });

  it('formats exp and proficiency float labels', () => {
    const grants: RewardGrant[] = [
      { trackId: 'char_exp', amount: 52, ruleId: 'exp_from_damage' },
      { trackId: 'prof_firebolt', amount: 10, ruleId: 'prof_from_cast' },
    ];
    const floats = grantsToFloatRewards(grants, DEFAULT_CONFIG, { firebolt: 'Bolt' });
    expect(floats).toEqual([
      { text: '+52 EXP', variant: 'exp' },
      { text: 'Bolt +10', variant: 'proficiency' },
    ]);
  });

  it('truncates long skill names for float text', () => {
    const grants: RewardGrant[] = [
      { trackId: 'prof_arcane_missile', amount: 5, ruleId: 'prof_from_cast' },
    ];
    const floats = grantsToFloatRewards(grants, DEFAULT_CONFIG, {
      arcane_missile: 'Arcane Missile Enhanced',
    });
    expect(floats[0]?.text).toBe('Arcan… +5');
    expect(floats[0]?.variant).toBe('proficiency');
  });
});
