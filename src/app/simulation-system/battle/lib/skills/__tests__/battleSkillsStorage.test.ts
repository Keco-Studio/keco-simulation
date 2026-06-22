import { describe, expect, it } from 'vitest';
import { readBattleSkillsForInitialRender } from '../battleSkillsStorage';

describe('readBattleSkillsForInitialRender', () => {
  it('returns empty array for SSR-safe hydration (client loads from persistence after mount)', () => {
    expect(readBattleSkillsForInitialRender()).toEqual([]);
  });
});
