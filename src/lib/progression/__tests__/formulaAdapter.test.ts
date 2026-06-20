import { describe, it, expect } from 'vitest';
import { evalNumber, evalBoolean, isValidFormula } from '../formulaAdapter';

describe('evalNumber', () => {
  it('evaluates arithmetic with scope vars', () => {
    expect(evalNumber('amount*0.1 + enemyLevel*5', { amount: 1200, enemyLevel: 30 })).toBe(270);
  });
  it('supports power operator', () => {
    expect(evalNumber('50 * level^1.5', { level: 4 })).toBe(400);
  });
  it('returns 0 for invalid expression', () => {
    expect(evalNumber('amount +', { amount: 1 })).toBe(0);
  });
  it('treats missing vars as 0', () => {
    expect(evalNumber('amount + bonus', { amount: 5 })).toBe(5);
  });
});

describe('evalBoolean', () => {
  it('evaluates comparison', () => {
    expect(evalBoolean('enemyLevel >= 20', { enemyLevel: 30 })).toBe(true);
    expect(evalBoolean('enemyLevel >= 20', { enemyLevel: 10 })).toBe(false);
  });
  it('empty filter is true', () => {
    expect(evalBoolean('', {})).toBe(true);
    expect(evalBoolean(undefined, {})).toBe(true);
  });
  it('supports and/or', () => {
    expect(evalBoolean('enemyLevel >= 20 and isBoss == 1', { enemyLevel: 30, isBoss: 1 })).toBe(true);
  });
});

describe('isValidFormula', () => {
  it('valid', () => expect(isValidFormula('amount*0.1')).toBe(true));
  it('invalid', () => expect(isValidFormula('amount *')).toBe(false));
});
