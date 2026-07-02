import { describe, it, expect } from 'vitest';
import { buildEffectiveLoadout } from '../merge';
import type {
  StudioProgressionBundle,
  UserProgression,
  UserSkillLevel,
} from '../types';
import { mapStudioAssetToCharacter } from '../studio/mapStudioRowToCharacter';
import type { Skill } from '@/app/simulation-system/battle/types';

const fireball: Skill = {
  id: 'fireball',
  name: 'Fireball',
  type: 'attack',
  power: 1.0,
  mpCost: 5,
  cooldown: 0,
  maxCooldown: 2,
  description: '',
};

const studio: StudioProgressionBundle = {
  characters: {
    'asset-1': {
      assetId: 'asset-1',
      characterId: 'hero',
      name: 'Hero',
      hp: 100,
      atk: 10,
      def: 5,
      spd: 8,
      mp: 50,
      skillIds: ['fireball', 'missing_skill'],
    },
  },
  skills: { fireball },
  charLevelCurve: [{ level: 1, needExp: 0, grantSp: 0 }],
  skillLevelCurve: [
    { skillId: 'fireball', level: 1, costSp: 1, powerBonus: 0.5 },
  ],
};

const progression: UserProgression = {
  userId: 'user-1',
  characterAssetId: 'asset-1',
  characterLibraryId: 'lib-1',
  level: 1,
  exp: 0,
  skillPoints: 2,
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('buildEffectiveLoadout', () => {
  it('merges studio config with cloud skill levels', () => {
    const skillLevels: UserSkillLevel[] = [
      { skillId: 'fireball', level: 1, spentSp: 1 },
      { skillId: 'orphan_skill', level: 5, spentSp: 10 },
    ];
    const loadout = buildEffectiveLoadout({ progression, skillLevels, studio });
    expect(loadout.character.name).toBe('Hero');
    expect(loadout.character.stats.maxHp).toBe(100);
    expect(loadout.skills).toHaveLength(1);
    expect(loadout.skills[0].power).toBeCloseTo(1.5);
    expect(loadout.skillLevels).toEqual({ fireball: 1 });
  });

  it('matches character skill display names to studio skill ids', () => {
    const loadout = buildEffectiveLoadout({
      progression,
      skillLevels: [],
      studio: {
        ...studio,
        characters: {
          'asset-1': {
            ...studio.characters['asset-1'],
            skillIds: ['Fireball'],
          },
        },
      },
    });

    expect(loadout.skills.map((s) => s.id)).toEqual(['fireball']);
  });

  it('builds battle skills after imported character skill text is split', () => {
    const mappedCharacter = mapStudioAssetToCharacter(
      {
        id: 'asset-1',
        name: 'Hero',
        propertyValues: {
          character_id: 'hero',
          name: 'Hero',
          skill_ids: 'fireball, heal',
        },
      },
      new Map(),
      new Map([
        ['fireball', 'fireball'],
        ['heal', 'heal'],
      ]),
    );

    const loadout = buildEffectiveLoadout({
      progression,
      skillLevels: [],
      studio: {
        ...studio,
        characters: {
          'asset-1': mappedCharacter!,
        },
        skills: {
          ...studio.skills,
          heal: {
            ...fireball,
            id: 'heal',
            name: 'Minor Heal',
            type: 'heal',
          },
        },
      },
    });

    expect(loadout.skills.map((s) => s.id)).toEqual(['fireball', 'heal']);
  });

  it('falls back to all imported studio skills when a character has no explicit skill ids', () => {
    const heal: Skill = {
      ...fireball,
      id: 'heal',
      name: 'Minor Heal',
      type: 'heal',
    };

    const loadout = buildEffectiveLoadout({
      progression,
      skillLevels: [],
      studio: {
        ...studio,
        characters: {
          'asset-1': {
            ...studio.characters['asset-1'],
            skillIds: [],
          },
        },
        skills: { fireball, heal },
      },
    });

    expect(loadout.skills.map((s) => s.id)).toEqual(['fireball', 'heal']);
  });

  it('throws when bound character asset is missing', () => {
    expect(() =>
      buildEffectiveLoadout({
        progression: { ...progression, characterAssetId: 'missing' },
        skillLevels: [],
        studio,
      }),
    ).toThrow(/character asset/i);
  });
});
