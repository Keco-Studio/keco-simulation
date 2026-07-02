import { describe, expect, it } from 'vitest';
import { mapStudioAssetToCharacter } from '../mapStudioRowToCharacter';

describe('mapStudioAssetToCharacter', () => {
  it('normalizes display-name reference values to canonical skill ids', () => {
    const character = mapStudioAssetToCharacter(
      {
        id: 'char-1',
        name: 'Mage',
        propertyValues: {
          character_id: 'hero_mage',
          skill_ids: ['Fireball', 'Arc Spark'],
        },
      },
      new Map(),
      new Map([
        ['fireball', 'fireball'],
        ['arcspark', 'arc_spark'],
      ]),
    );

    expect(character?.skillIds).toEqual(['fireball', 'arc_spark']);
  });

  it('splits comma-separated skill id text from imported character tables', () => {
    const character = mapStudioAssetToCharacter(
      {
        id: 'char-1',
        name: 'Knight',
        propertyValues: {
          character_id: 'hero_knight',
          skill_ids: 'fireball, heal',
        },
      },
      new Map(),
      new Map([
        ['fireball', 'fireball'],
        ['heal', 'heal'],
      ]),
    );

    expect(character?.skillIds).toEqual(['fireball', 'heal']);
  });
});
