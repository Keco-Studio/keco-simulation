import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../defaults';
import {
  PROGRESSION_RULE_COLUMNS,
  PROGRESSION_TRACK_COLUMNS,
} from '../columnKeys';
import {
  STUDIO_SAMPLE_RULE_ROWS,
  STUDIO_SAMPLE_TRACK_ROWS,
  buildStudioRuleTableRows,
  buildStudioTrackTableRows,
} from '../studioSampleTableRows';

describe('studioSampleTableRows', () => {
  it('maps default tracks to Studio column keys', () => {
    expect(STUDIO_SAMPLE_TRACK_ROWS.length).toBe(DEFAULT_CONFIG.tracks.length);
    const first = STUDIO_SAMPLE_TRACK_ROWS[0]!;
    expect(first[PROGRESSION_TRACK_COLUMNS.trackId]).toBe('char_exp');
    expect(first[PROGRESSION_TRACK_COLUMNS.kind]).toBe('exp_level');
    expect(first[PROGRESSION_TRACK_COLUMNS.params]).toContain('baseExp');
  });

  it('maps default rules to Studio column keys', () => {
    expect(STUDIO_SAMPLE_RULE_ROWS.length).toBe(DEFAULT_CONFIG.rules.length);
    const first = STUDIO_SAMPLE_RULE_ROWS[0]!;
    expect(first[PROGRESSION_RULE_COLUMNS.ruleId]).toBe('exp_from_damage');
    expect(first[PROGRESSION_RULE_COLUMNS.whenType]).toBe('deal_damage');
    expect(first[PROGRESSION_RULE_COLUMNS.params]).toContain('damageRatio');
  });

  it('serializes disabled rules and empty params', () => {
    const rows = buildStudioRuleTableRows([
      {
        id: 'off_rule',
        enabled: false,
        whenType: 'cast_skill',
        targetTrackId: 'char_exp',
        rewardFormula: 'amount',
      },
    ]);
    expect(rows[0]?.enabled).toBe('false');
    expect(rows[0]?.params).toBe('');
  });

  it('round-trips track params as JSON text', () => {
    const rows = buildStudioTrackTableRows([DEFAULT_CONFIG.tracks[0]!]);
    expect(() => JSON.parse(rows[0]![PROGRESSION_TRACK_COLUMNS.params])).not.toThrow();
  });
});
