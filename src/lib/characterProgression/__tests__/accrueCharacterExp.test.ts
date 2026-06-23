import { describe, it, expect } from 'vitest';
import { accrueCharacterExp } from '../merge';
import type { CharLevelCurveRow } from '../types';

const curve: CharLevelCurveRow[] = [
  { level: 1, needExp: 0, grantSp: 0 },
  { level: 2, needExp: 100, grantSp: 1 },
  { level: 3, needExp: 300, grantSp: 2 },
  { level: 4, needExp: 600, grantSp: 3 },
];

describe('accrueCharacterExp', () => {
  it('adds exp without level-up when below threshold', () => {
    const result = accrueCharacterExp({ level: 1, exp: 50, skillPoints: 0 }, 30, curve);
    expect(result.progression.exp).toBe(80);
    expect(result.progression.level).toBe(1);
    expect(result.leveledUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(result.spGranted).toBe(0);
  });

  it('levels up once and grants SP', () => {
    const result = accrueCharacterExp({ level: 1, exp: 80, skillPoints: 0 }, 30, curve);
    expect(result.progression.level).toBe(2);
    expect(result.progression.exp).toBe(110);
    expect(result.progression.skillPoints).toBe(1);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
    expect(result.spGranted).toBe(1);
  });

  it('handles multi level-up in one accrual', () => {
    const result = accrueCharacterExp({ level: 1, exp: 0, skillPoints: 0 }, 350, curve);
    expect(result.progression.level).toBe(3);
    expect(result.progression.exp).toBe(350);
    expect(result.progression.skillPoints).toBe(3);
    expect(result.levelsGained).toBe(2);
    expect(result.spGranted).toBe(3);
  });

  it('caps at max level in curve', () => {
    const result = accrueCharacterExp({ level: 3, exp: 300, skillPoints: 0 }, 500, curve);
    expect(result.progression.level).toBe(4);
    expect(result.levelsGained).toBe(1);
    expect(result.progression.exp).toBe(800);
  });
});
