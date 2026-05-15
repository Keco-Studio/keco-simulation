/**
 * Battle skills — public API for simulator pages (active module skills).
 * Multi-module state lives in battleSkillModulesStorage.
 */

import type { Skill } from '../../types';
import { getBuiltinSkills } from '../../data/skills';
import {
  loadBattleSkillModulesState,
  saveSkillsForModuleWithMirror,
  resetModuleSkillsToBuiltin,
} from './battleSkillModulesStorage';
import {
  BATTLE_SKILLS_STORAGE_KEY,
  BATTLE_SKILL_MODULES_STORAGE_KEY,
  BATTLE_SKILLS_UPDATED_EVENT,
} from './battleSkillsPersistenceKeys';

export {
  BATTLE_SKILLS_STORAGE_KEY,
  BATTLE_SKILL_MODULES_STORAGE_KEY,
  BATTLE_SKILLS_UPDATED_EVENT,
} from './battleSkillsPersistenceKeys';

export { notifyBattleSkillModulesUpdated as notifyBattleSkillsUpdated } from './battleSkillModulesStorage';

/** @deprecated Legacy helper; prefer loadBattleSkillModulesState + pick module */
export function normalizeStoredSkillsJson(raw: string): Skill[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return getBuiltinSkills();
  }
  if (!Array.isArray(data)) return getBuiltinSkills();
  if (data.length === 0) return [];
  const valid = data.filter((x): x is Skill => {
    if (!x || typeof x !== 'object') return false;
    const s = x as Skill;
    return (
      typeof s.id === 'string' &&
      s.id.length > 0 &&
      typeof s.name === 'string' &&
      s.name.length > 0 &&
      typeof s.power === 'number' &&
      Number.isFinite(s.power) &&
      typeof s.mpCost === 'number' &&
      Number.isFinite(s.mpCost) &&
      typeof s.maxCooldown === 'number' &&
      Number.isFinite(s.maxCooldown) &&
      typeof s.cooldown === 'number' &&
      (s.type === 'attack' || s.type === 'heal')
    );
  });
  if (valid.length === 0) return getBuiltinSkills();
  return valid;
}

export async function loadBattleSkillsFromPersistence(): Promise<Skill[]> {
  const state = await loadBattleSkillModulesState();
  const mod = state.modules.find((m) => m.id === state.activeModuleId);
  if (!mod) return getBuiltinSkills();
  return mod.skills;
}

export function saveBattleSkillsToStorage(moduleId: string, skills: Skill[]): void {
  saveSkillsForModuleWithMirror(moduleId, skills);
}

/** Reset one module's skills to built-in defaults (other modules unchanged). */
export function resetActiveBattleSkillModuleToBuiltin(moduleId: string): void {
  resetModuleSkillsToBuiltin(moduleId);
}
