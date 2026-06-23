import { describe, it, expect } from 'vitest';
import { applyLevelBonus, resolveUpgradeCost } from '../merge';
import type { SkillLevelCurveRow } from '../types';
import type { Skill } from '@/app/simulation-system/battle/types';

const baseSkill: Skill = {
  id: 'fireball',
  name: 'Fireball',
  type: 'attack',
  power: 1.2,
  mpCost: 10,
  cooldown: 0,
  maxCooldown: 3,
  description: 'A fireball',
};

const curveRows: SkillLevelCurveRow[] = [
  { skillId: 'fireball', level: 1, costSp: 1, powerBonus: 0.1 },
  { skillId: 'fireball', level: 2, costSp: 2, powerBonus: 0.2, mpCostDelta: -1 },
  { skillId: 'fireball', level: 3, costSp: 3, powerBonus: 0.3, cooldownDelta: -1 },
];

function curveMap(rows: SkillLevelCurveRow[]): Map<number, SkillLevelCurveRow> {
  return new Map(rows.map((r) => [r.level, r]));
}

describe('applyLevelBonus', () => {
  it('returns base skill unchanged at level 0', () => {
    const result = applyLevelBonus(baseSkill, 0, curveMap(curveRows));
    expect(result.power).toBe(1.2);
    expect(result.mpCost).toBe(10);
    expect(result.maxCooldown).toBe(3);
  });

  it('stacks power_bonus through allocated levels', () => {
    const result = applyLevelBonus(baseSkill, 2, curveMap(curveRows));
    expect(result.power).toBeCloseTo(1.5);
    expect(result.mpCost).toBe(9);
  });

  it('applies cooldown delta at level 3', () => {
    const result = applyLevelBonus(baseSkill, 3, curveMap(curveRows));
    expect(result.power).toBeCloseTo(1.8);
    expect(result.maxCooldown).toBe(2);
  });
});

describe('resolveUpgradeCost', () => {
  it('returns cost for next level', () => {
    expect(resolveUpgradeCost('fireball', 0, curveRows)).toBe(1);
    expect(resolveUpgradeCost('fireball', 1, curveRows)).toBe(2);
  });

  it('returns null when curve row missing', () => {
    expect(resolveUpgradeCost('fireball', 3, curveRows)).toBeNull();
    expect(resolveUpgradeCost('unknown', 0, curveRows)).toBeNull();
  });
});
