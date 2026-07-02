import { describe, expect, it } from 'vitest';
import { buildCloudLoadoutSyncKey } from '../cloudLoadoutSyncKey';

const progression = {
  characterAssetId: 'char-1',
  level: 1,
  exp: 0,
};

const baseLoadout = {
  character: {
    name: 'Knight',
    stats: { maxHp: 120, atk: 14, def: 8, spd: 6, maxMp: 40 },
  },
  skills: [],
};

describe('buildCloudLoadoutSyncKey', () => {
  it('returns null until progression and effective loadout exist', () => {
    expect(
      buildCloudLoadoutSyncKey({
        progression: null,
        effectiveLoadout: baseLoadout,
        skillLevels: [],
      }),
    ).toBeNull();
    expect(
      buildCloudLoadoutSyncKey({
        progression,
        effectiveLoadout: null,
        skillLevels: [],
      }),
    ).toBeNull();
  });

  it('changes when effective skills become available', () => {
    const emptyKey = buildCloudLoadoutSyncKey({
      progression,
      effectiveLoadout: baseLoadout,
      skillLevels: [],
    });
    const populatedKey = buildCloudLoadoutSyncKey({
      progression,
      effectiveLoadout: {
        ...baseLoadout,
        skills: [
          {
            id: 'fireball',
            name: 'Fireball',
            type: 'attack',
            power: 1.2,
            mpCost: 10,
            cooldown: 0,
            maxCooldown: 2,
            description: 'Basic fire attack',
          },
        ],
      },
      skillLevels: [],
    });

    expect(populatedKey).not.toEqual(emptyKey);
    expect(populatedKey).toContain('fireball');
  });

  it('changes when effective skill values change', () => {
    const first = buildCloudLoadoutSyncKey({
      progression,
      effectiveLoadout: {
        ...baseLoadout,
        skills: [
          {
            id: 'fireball',
            name: 'Fireball',
            type: 'attack',
            power: 1.2,
            mpCost: 10,
            cooldown: 0,
            maxCooldown: 2,
            description: 'Basic fire attack',
          },
        ],
      },
      skillLevels: [],
    });
    const second = buildCloudLoadoutSyncKey({
      progression,
      effectiveLoadout: {
        ...baseLoadout,
        skills: [
          {
            id: 'fireball',
            name: 'Fireball',
            type: 'attack',
            power: 1.4,
            mpCost: 9,
            cooldown: 0,
            maxCooldown: 2,
            description: 'Basic fire attack',
          },
        ],
      },
      skillLevels: [{ skillId: 'fireball', level: 1 }],
    });

    expect(second).not.toEqual(first);
  });
});
