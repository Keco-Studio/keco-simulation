/** Legacy: single flat skill array (pre multi-module); kept for one-time migration */
export const BATTLE_SKILLS_STORAGE_KEY = 'keco-studio-battle-skills-v1';

/** Multi-module battle skill sheets + active module id */
export const BATTLE_SKILL_MODULES_STORAGE_KEY = 'keco-studio-battle-skill-modules-v1';

/** Fired in-tab after the sheet saves so the battle page can refresh */
export const BATTLE_SKILLS_UPDATED_EVENT = 'keco-battle-skills-updated';

/** postMessage `data.type` from Keco Studio parent frames */
export const KECO_STUDIO_BATTLE_SKILL_MODULE_SYNC_MSG = 'keco-studio:battle-skill-module-sync';
