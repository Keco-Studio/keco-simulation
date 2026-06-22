import { describe, expect, it } from 'vitest';
import {
  mapStudioRowsToProgressionConfig,
  type StudioProgressionRow,
} from '../mapStudioRowsToConfig';

const trackRows: StudioProgressionRow[] = [
  {
    id: 'a1',
    values: {
      track_id: 'char_exp',
      label: 'Character EXP',
      kind: 'exp_level',
      params: '{"baseExp":100,"growthFactor":1.08,"model":"logarithmic","maxLevel":100}',
    },
  },
];

const ruleRows: StudioProgressionRow[] = [
  {
    id: 'b1',
    values: {
      rule_id: 'exp_from_damage',
      enabled: 'true',
      when_type: 'deal_damage',
      filter: '',
      target_track_id: 'char_exp',
      reward_formula: 'amount * damageRatio',
      params: '{"damageRatio":0.1}',
    },
  },
];

describe('mapStudioRowsToProgressionConfig', () => {
  it('maps tracks and rules from Studio library rows', () => {
    const config = mapStudioRowsToProgressionConfig(trackRows, ruleRows);
    expect(config.tracks).toHaveLength(1);
    expect(config.tracks[0]?.id).toBe('char_exp');
    expect(config.tracks[0]?.kind).toBe('exp_level');
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0]?.whenType).toBe('deal_damage');
    expect(config.rules[0]?.params?.damageRatio).toBe(0.1);
  });

  it('skips rows missing required ids', () => {
    const config = mapStudioRowsToProgressionConfig(
      [{ id: 'x', values: { label: 'No id' } }],
      [{ id: 'y', values: { when_type: 'deal_damage' } }],
    );
    expect(config.tracks).toHaveLength(0);
    expect(config.rules).toHaveLength(0);
  });
});
