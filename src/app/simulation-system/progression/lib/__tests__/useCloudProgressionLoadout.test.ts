import { describe, expect, it } from 'vitest';
import { buildSafeEffectiveLoadout } from '../useCloudProgression';
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
