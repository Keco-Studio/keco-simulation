import { describe, expect, it } from 'vitest';
import { buildSafeEffectiveLoadout, planProgressionLevelSettlement } from '../useCloudProgression';
import type {
  StudioProgressionBundle,
  UserProgression,
} from '@/lib/characterProgression/types';

const progression: UserProgression = {
  userId: 'user-1',
  characterAssetId: 'missing-character',
  characterLibraryId: 'lib-1',
  level: 1,
  exp: 0,
  skillPoints: 0,
  updatedAt: '2026-01-01T00:00:00Z',
};

const emptyStudio: StudioProgressionBundle = {
  characters: {},
  skills: {},
  charLevelCurve: [],
  skillLevelCurve: [],
};

describe('buildSafeEffectiveLoadout', () => {
  it('returns null instead of throwing when the saved character is missing from the imported bundle', () => {
    expect(
      buildSafeEffectiveLoadout({
        progression,
        studioBundle: emptyStudio,
        skillLevels: [],
      }),
    ).toBeNull();
  });
});

describe('planProgressionLevelSettlement', () => {
  it('plans a level and SP settlement when stored exp already crosses the imported curve', () => {
    const result = planProgressionLevelSettlement(
      { ...progression, characterAssetId: 'hero-1', level: 1, exp: 110, skillPoints: 0 },
      [
        { level: 1, needExp: 0, grantSp: 0 },
        { level: 2, needExp: 100, grantSp: 1 },
      ],
    );

    expect(result).toEqual({
      level: 2,
      skillPoints: 1,
      levelsGained: 1,
      spGranted: 1,
    });
  });

  it('does not plan a remote update when stored exp is below the next threshold', () => {
    const result = planProgressionLevelSettlement(
      { ...progression, characterAssetId: 'hero-1', level: 1, exp: 80, skillPoints: 0 },
      [
        { level: 1, needExp: 0, grantSp: 0 },
        { level: 2, needExp: 100, grantSp: 1 },
      ],
    );

    expect(result).toBeNull();
  });
});
