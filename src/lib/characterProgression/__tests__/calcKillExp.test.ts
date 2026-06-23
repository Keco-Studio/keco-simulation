import { describe, it, expect } from 'vitest';
import { calcKillExp } from '../merge';

describe('calcKillExp', () => {
  it('returns base exp when player and monster levels match', () => {
    expect(calcKillExp({ baseExp: 100, playerLevel: 10, monsterLevel: 10 })).toBe(100);
  });

  it('applies over-level bonus capped at 1.5x', () => {
    expect(calcKillExp({ baseExp: 100, playerLevel: 10, monsterLevel: 20 })).toBe(150);
    expect(calcKillExp({ baseExp: 100, playerLevel: 10, monsterLevel: 30 })).toBe(150);
  });

  it('applies under-level decay floored at 0.05x but result at least 1', () => {
    expect(calcKillExp({ baseExp: 100, playerLevel: 20, monsterLevel: 10 })).toBe(5);
    expect(calcKillExp({ baseExp: 10, playerLevel: 20, monsterLevel: 1 })).toBe(1);
  });

  it('applies exp rate multiplier', () => {
    expect(
      calcKillExp({ baseExp: 100, playerLevel: 10, monsterLevel: 10, expRateMultiplier: 2 }),
    ).toBe(200);
  });
});
