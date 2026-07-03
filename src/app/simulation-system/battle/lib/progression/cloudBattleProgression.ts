import type { SupabaseClient } from '@supabase/supabase-js';
import type { BattleSession } from '@keco/battle-core';
import { calcKillExp } from '@/lib/characterProgression/merge';
import { applyBattleExp } from '@/lib/characterProgression/supabaseProgressionStorage';
import type { CharLevelCurveRow } from '@/lib/characterProgression/types';
import { notifyProgressionConfigUpdated } from '@/app/simulation-system/progression/lib/progressionStudioBindingStorage';

/** P1 default when monster_exp Studio library is not wired yet. */
export const DEFAULT_KILL_BASE_EXP = 50;

/** P1 default enemy level when battle config has no explicit level. */
export const DEFAULT_ENEMY_LEVEL = 1;

export type CloudBattleExpInput = {
  supabase: SupabaseClient;
  userId: string;
  playerLevel: number;
  charLevelCurve: CharLevelCurveRow[];
  baseExp?: number;
  enemyLevel?: number;
  expRateMultiplier?: number;
};

export function computeCloudKillExp(input: {
  playerLevel: number;
  baseExp?: number;
  enemyLevel?: number;
  expRateMultiplier?: number;
}): number {
  return calcKillExp({
    baseExp: input.baseExp ?? DEFAULT_KILL_BASE_EXP,
    playerLevel: input.playerLevel,
    monsterLevel: input.enemyLevel ?? DEFAULT_ENEMY_LEVEL,
    expRateMultiplier: input.expRateMultiplier,
  });
}

/** Returns true when session ended in a player win suitable for kill EXP. */
export function isCloudKillExpEligible(session: BattleSession): boolean {
  if (session.result === 'left_win') return true;
  const ended = session.events.find((e) => e.type === 'battle_ended');
  if (!ended || ended.type !== 'battle_ended') return false;
  const payload = ended.payload as { result?: string; outcome?: string };
  const result = payload.result ?? payload.outcome ?? session.result;
  return result === 'left_win' || result === 'player_win';
}

export async function applyCloudBattleKillExp(
  session: BattleSession,
  input: CloudBattleExpInput,
) {
  if (!isCloudKillExpEligible(session)) {
    return null;
  }

  const gainedExp = computeCloudKillExp({
    playerLevel: input.playerLevel,
    baseExp: input.baseExp,
    enemyLevel: input.enemyLevel,
    expRateMultiplier: input.expRateMultiplier,
  });

  const result = await applyBattleExp(
    input.supabase,
    input.userId,
    gainedExp,
    input.charLevelCurve,
  );
  notifyProgressionConfigUpdated();
  return result;
}
