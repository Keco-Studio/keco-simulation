import { describe, expect, it } from 'vitest';
import { buildBattleProgressionSummary } from '../battleProgressionSummary';

describe('battle progression summary', () => {
  it('returns Lv, EXP, and SP tokens for the left skill upgrade panel', () => {
    const summary = buildBattleProgressionSummary({
      progression: { level: 7, exp: 1250, skillPoints: 3 },
      characterName: 'Hero',
      nextNeed: 2000,
    });

    expect(summary?.title).toBe('Hero');
    expect(summary?.tokens).toEqual([
      { label: 'Lv', value: '7' },
      { label: 'EXP', value: '1250 / 2000' },
      { label: 'SP', value: '3' },
    ]);
  });
});
