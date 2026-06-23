import { describe, it, expect } from 'vitest';
import { buildEffectiveLoadout } from '../merge';
import type {
  StudioProgressionBundle,
  UserProgression,
  UserSkillLevel,
} from '../types';
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
