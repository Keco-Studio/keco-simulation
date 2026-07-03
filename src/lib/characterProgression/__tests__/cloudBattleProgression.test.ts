import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  applyCloudBattleKillExp,
  computeCloudKillExp,
  isCloudKillExpEligible,
} from '../../../app/simulation-system/battle/lib/progression/cloudBattleProgression';
import { PROGRESSION_CONFIG_UPDATED_EVENT } from '../../../app/simulation-system/progression/lib/progressionStudioBindingStorage';
import type { BattleSession } from '@keco/battle-core';

vi.mock('@/lib/characterProgression/supabaseProgressionStorage', () => ({
  applyBattleExp: vi.fn(async () => ({
    progression: {
      userId: 'user-1',
      characterAssetId: 'char-1',
      characterLibraryId: 'characters',
      level: 1,
      exp: 50,
      skillPoints: 0,
      updatedAt: '2026-07-03T00:00:00.000Z',
    },
    leveledUp: false,
    levelsGained: 0,
    spGranted: 0,
    expGained: 50,
  })),
}));

describe('cloudBattleProgression', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('computes kill exp with defaults at equal level', () => {
    expect(computeCloudKillExp({ playerLevel: 10, enemyLevel: 10 })).toBe(50);
  });

  it('detects player win on battle_ended', () => {
    const session = {
      result: 'left_win',
      events: [{ type: 'battle_ended', payload: { result: 'left_win' } }],
    } as unknown as BattleSession;
    expect(isCloudKillExpEligible(session)).toBe(true);
  });

  it('rejects non-win outcomes', () => {
    const session = {
      events: [{ type: 'battle_ended', payload: { outcome: 'right_win' } }],
    } as unknown as BattleSession;
    expect(isCloudKillExpEligible(session)).toBe(false);
  });

  it('notifies progression consumers after cloud battle exp is applied', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('CustomEvent', class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });
    vi.stubGlobal('window', { dispatchEvent });
    const session = {
      result: 'left_win',
      events: [{ type: 'battle_ended', payload: { result: 'left_win' } }],
    } as unknown as BattleSession;

    await applyCloudBattleKillExp(session, {
      supabase: {} as any,
      userId: 'user-1',
      playerLevel: 1,
      charLevelCurve: [],
    });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0]?.[0]).toMatchObject({
      type: PROGRESSION_CONFIG_UPDATED_EVENT,
    });
  });
});
