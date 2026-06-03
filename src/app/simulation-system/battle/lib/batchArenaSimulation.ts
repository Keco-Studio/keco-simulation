import {
  runBatchMapBattle,
  BATCH_MAP_BATTLE_LIMITS,
  type BatchMapBattleInput,
  type BatchMapBattleSummary,
} from '@keco/battle-core';
import type { BattleArenaConfig } from '../components/BattleArena/BattleArena';

export { BATCH_MAP_BATTLE_LIMITS, type BatchMapBattleSummary };

export function arenaConfigToBatchInput(config: BattleArenaConfig): BatchMapBattleInput {
  return {
    mapWidth: config.mapWidth,
    mapHeight: config.mapHeight,
    playerName: config.playerName,
    playerStats: config.playerStats,
    playerHp: config.playerHp,
    playerMp: config.playerMp,
    playerMaxMp: config.playerMaxMp,
    playerSkillIds: config.playerSkillIds,
    enemyName: config.enemyName,
    enemyStats: config.enemyStats,
    enemyHp: config.enemyHp,
    enemyMp: config.enemyMp,
    enemyMaxMp: config.enemyMaxMp,
    enemySkillIds: config.enemySkillIds,
    skills: config.skills,
    monsterInitialElement: config.monsterInitialElement ?? null,
    preparationTicks: 3,
  };
}

export function runArenaBatchSimulation(
  config: BattleArenaConfig,
  runs: number,
): BatchMapBattleSummary {
  const capped = Math.min(
    BATCH_MAP_BATTLE_LIMITS.maxRuns,
    Math.max(1, Math.floor(runs)),
  );
  return runBatchMapBattle(arenaConfigToBatchInput(config), capped);
}
