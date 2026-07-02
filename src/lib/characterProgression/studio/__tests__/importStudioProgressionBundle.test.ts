import { describe, expect, it } from 'vitest';
import {
  parseCharLevelCurveFromStudioTable,
  parseSkillLevelCurveFromStudioTable,
} from '../importStudioProgressionBundle';

describe('Studio progression bundle curve parsing', () => {
  it('parses char level curves from Studio UUID field keys using column labels', () => {
    const rows = [
      {
        id: 'lv1',
        values: {
          field_level: '1',
          field_need: '0',
          field_sp: '0',
        },
      },
      {
        id: 'lv2',
        values: {
          field_level: '2',
          field_need: '100',
          field_sp: '1',
        },
      },
    ];

    expect(
      parseCharLevelCurveFromStudioTable(
        [
          { key: 'field_level', label: 'level' },
          { key: 'field_need', label: 'need_exp' },
          { key: 'field_sp', label: 'grant_sp' },
        ],
        rows,
      ),
    ).toEqual([
      { level: 1, needExp: 0, grantSp: 0 },
      { level: 2, needExp: 100, grantSp: 1 },
    ]);
  });

  it('parses skill level curves from Studio UUID field keys using column labels', () => {
    const rows = [
      {
        id: 'fireball-lv1',
        values: {
          field_skill: 'fireball',
          field_level: '1',
          field_cost: '1',
          field_power: '0.1',
          field_mp: '-1',
        },
      },
    ];

    expect(
      parseSkillLevelCurveFromStudioTable(
        [
          { key: 'field_skill', label: 'skill_id' },
          { key: 'field_level', label: 'level' },
          { key: 'field_cost', label: 'cost_sp' },
          { key: 'field_power', label: 'power_bonus' },
          { key: 'field_mp', label: 'mp_cost_delta' },
        ],
        rows,
      ),
    ).toEqual([
      {
        skillId: 'fireball',
        level: 1,
        costSp: 1,
        powerBonus: 0.1,
        mpCostDelta: -1,
        cooldownDelta: undefined,
      },
    ]);
  });
});
