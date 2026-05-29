export { MapBattleController } from './map-battle/MapBattleController';
export { createMapBattleSession, type MapBattleStartConfig } from './map-battle/createMapBattleSession';
export { createKecoArenaSession, type KecoArenaConfig } from './keco/createKecoBattleSession';
export { registerKecoSkills, kecoSkillToBattleCoreDefinition } from './keco/kecoSkillBridge';
export type { KecoCombatExtension } from './keco/types';
export type { BattleSession } from './battle-core/domain/entities/battle-session';
export type { BattleEntity } from './battle-core/domain/entities/battle-entity';
export { getPocBattleUiOutcome } from './map-battle/battleOutcome';
