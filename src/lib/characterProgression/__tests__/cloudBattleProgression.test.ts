import { describe, it, expect } from 'vitest';
import {
  computeCloudKillExp,
  isCloudKillExpEligible,
} from '../../../app/simulation-system/battle/lib/progression/cloudBattleProgression';
import type { BattleSession } from '@keco/battle-core';

describe('cloudBattleProgression', () => {
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
});
