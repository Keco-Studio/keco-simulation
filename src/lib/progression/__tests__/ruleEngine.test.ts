import { describe, it, expect } from 'vitest';
import { applyRules } from '../ruleEngine';
import type { Rule, Contribution } from '../types';

const dmg: Contribution = {
  type: 'deal_damage',
  amount: 1000,
  ctx: { enemyLevel: 30, skillId: 'fireball' },
  step: 0,
};

describe('applyRules', () => {
  it('matches type and evaluates reward formula', () => {
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        targetTrackId: 'char_exp',
        rewardFormula: 'amount*0.1 + enemyLevel*5',
      },
    ];
    expect(applyRules(dmg, rules)).toEqual([{ trackId: 'char_exp', amount: 250, ruleId: 'r1' }]);
  });
  it('skips disabled and non-matching', () => {
    const rules: Rule[] = [
      { id: 'r1', enabled: false, whenType: 'deal_damage', targetTrackId: 'x', rewardFormula: '1' },
      { id: 'r2', enabled: true, whenType: 'kill_enemy', targetTrackId: 'x', rewardFormula: '1' },
    ];
    expect(applyRules(dmg, rules)).toEqual([]);
  });
  it('applies filter', () => {
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        filter: 'enemyLevel >= 50',
        targetTrackId: 'x',
        rewardFormula: '1',
      },
    ];
    expect(applyRules(dmg, rules)).toEqual([]);
  });
  it('resolves template track id from ctx', () => {
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        targetTrackId: 'prof_{skillId}',
        rewardFormula: 'amount*0.05',
      },
    ];
    expect(applyRules(dmg, rules)).toEqual([{ trackId: 'prof_fireball', amount: 50, ruleId: 'r1' }]);
  });

  it('skips template rule when ctx lacks the placeholder var (no bogus prof_ track)', () => {
    const noSkill: Contribution = { type: 'deal_damage', amount: 1000, ctx: { enemyLevel: 30 }, step: 0 };
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        targetTrackId: 'prof_{skillId}',
        rewardFormula: 'amount*0.05',
      },
    ];
    expect(applyRules(noSkill, rules)).toEqual([]);
  });

  it('merges rule.params into formula scope (designer-tuned constants)', () => {
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        targetTrackId: 'char_exp',
        rewardFormula: 'amount * damageRatio + enemyLevel * levelBonus',
        params: { damageRatio: 0.1, levelBonus: 5 },
      },
    ];
    expect(applyRules(dmg, rules)).toEqual([{ trackId: 'char_exp', amount: 250, ruleId: 'r1' }]);
  });

  it('lets rule.params override contribution ctx on key clash', () => {
    const withCtx: Contribution = {
      type: 'deal_damage',
      amount: 1000,
      ctx: { enemyLevel: 30, skillId: 'fireball' },
      step: 0,
    };
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        targetTrackId: 'char_exp',
        rewardFormula: 'enemyLevel * killLevelBonus',
        params: { killLevelBonus: 20, enemyLevel: 99 },
      },
    ];
    expect(applyRules(withCtx, rules)).toEqual([{ trackId: 'char_exp', amount: 1980, ruleId: 'r1' }]);
  });

  it('uses params in filter expressions', () => {
    const rules: Rule[] = [
      {
        id: 'r1',
        enabled: true,
        whenType: 'deal_damage',
        filter: 'enemyLevel >= minEnemyLevel',
        targetTrackId: 'char_exp',
        rewardFormula: '1',
        params: { minEnemyLevel: 50 },
      },
    ];
    expect(applyRules(dmg, rules)).toEqual([]);
  });
});
