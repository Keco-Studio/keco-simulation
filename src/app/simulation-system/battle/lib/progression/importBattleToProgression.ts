import type { BattleSession } from '@keco/battle-core';
import { getPocBattleUiOutcome } from '@keco/battle-core';
import { battleEventsToContributions } from '@/lib/progression/sources/battleEventSource';
import {
  appendBattleImport,
  type BattleImportRecord,
} from '@/app/simulation-system/progression/lib/progressionStorage';

/** Import a finished battle session into the progression battle queue. */
export function importBattleSessionToProgression(session: BattleSession): BattleImportRecord {
  const ui = getPocBattleUiOutcome(session);
  const outcome: BattleImportRecord['outcome'] =
    ui === 'win' ? 'win' : ui === 'fled' ? 'fled' : 'lose';
  const contributions = battleEventsToContributions(session);
  return appendBattleImport({
    outcome,
    enemyName: session.right.name,
    contributions,
  });
}
