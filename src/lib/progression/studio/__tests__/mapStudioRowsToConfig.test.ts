import { describe, expect, it } from 'vitest';
import {
  mapStudioRowsToProgressionConfig,
  normalizeStudioColumnLabel,
  remapSimTableRowsByColumns,
  simTableRowsToRuleProgressionRows,
  simTableRowsToTrackProgressionRows,
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

  it('normalizes camelCase Studio column labels', () => {
    expect(normalizeStudioColumnLabel('whenType')).toBe('when_type');
    expect(normalizeStudioColumnLabel('targetTrackId')).toBe('target_track_id');
  });

  it('remaps UUID field keys using column labels', () => {
    const columns = [
      { key: 'f1-uuid-track', label: 'track_id' },
      { key: 'f2-uuid-label', label: 'label' },
      { key: 'f3-uuid-kind', label: 'kind' },
      { key: 'f4-uuid-params', label: 'params' },
    ];
    const rows = [
      {
        id: 'row1',
        values: {
          'f1-uuid-track': 'char_exp',
          'f2-uuid-label': 'Character EXP',
          'f3-uuid-kind': 'exp_level',
          'f4-uuid-params':
            '{"baseExp":100,"growthFactor":1.08,"model":"logarithmic","maxLevel":100}',
        },
      },
    ];
    const mapped = simTableRowsToTrackProgressionRows(columns, rows);
    const config = mapStudioRowsToProgressionConfig(mapped, []);
    expect(config.tracks).toHaveLength(1);
    expect(config.tracks[0]?.id).toBe('char_exp');
  });

  it('remaps rules table with track_id column and camelCase labels', () => {
    const columns = [
      { key: 'r1', label: 'track_id' },
      { key: 'r2', label: 'enabled' },
      { key: 'r3', label: 'whenType' },
      { key: 'r4', label: 'targetTrackId' },
      { key: 'r5', label: 'rewardFormula' },
      { key: 'r6', label: 'params' },
    ];
    const rows = [
      {
        id: 'rule1',
        values: {
          r1: 'exp_from_damage',
          r2: 'TRUE',
          r3: 'deal_damage',
          r4: 'char_exp',
          r5: 'amount * damageRatio',
          r6: '{"damageRatio":0.1}',
        },
      },
    ];
    const mapped = simTableRowsToRuleProgressionRows(columns, rows);
    const config = mapStudioRowsToProgressionConfig([], mapped);
    expect(config.rules).toHaveLength(1);
    expect(config.rules[0]?.id).toBe('exp_from_damage');
    expect(config.rules[0]?.whenType).toBe('deal_damage');
    expect(config.rules[0]?.enabled).toBe(true);
  });
});
