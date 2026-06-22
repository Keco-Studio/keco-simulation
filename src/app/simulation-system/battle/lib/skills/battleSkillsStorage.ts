/**
 * Battle skills — public API for simulator pages (active module skills).
 * Multi-module state lives in battleSkillModulesStorage.
 */

import type { Skill } from '../../types';
import { getBuiltinSkills } from '../../data/skills';
import { loadBattleSkillDrafts } from '../localTableSkillSource/battleSkillDrafts';
import { validateSkillDraftsFromLiveTables } from '../localTableSkillSource/refreshDraftsFromLiveTables';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_BATTLE_SKILL_MODULE_ID,
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

/** Skills for the battle page: module storage is the source of truth (may be empty). */
export async function loadBattleSkillsForBattlePage(): Promise<Skill[]> {
  return loadBattleSkillsFromPersistence();
}

/** SSR-safe initial state; client hydrates from persistence in useLayoutEffect. */
export function readBattleSkillsForInitialRender(): Skill[] {
  return [];
}

/**
 * Refresh skills from live local-table drafts when source table rows change.
 * Returns null when drafts are absent/invalid or the module sheet was cleared.
 */
export async function refreshBattleSkillsFromLiveTableDrafts(
  supabase: SupabaseClient | null = null,
): Promise<Skill[] | null> {
  const persisted = await loadBattleSkillsFromPersistence();
  if (persisted.length === 0) return null;

  const drafts = loadBattleSkillDrafts();
  if (drafts.length === 0) return null;

  try {
    const result = await validateSkillDraftsFromLiveTables(supabase, drafts);
    if (result.ok) {
      // Silent save: callers listen to BATTLE_SKILLS_UPDATED_EVENT and would loop otherwise.
      saveBattleSkillsToStorage(DEFAULT_BATTLE_SKILL_MODULE_ID, result.skills, { notify: false });
      return result.skills;
    }
  } catch (err) {
    console.warn('[simulation] Failed to refresh skill drafts from live tables:', err);
  }
  return null;
}

/** @deprecated Use loadBattleSkillsForBattlePage or refreshBattleSkillsFromLiveTableDrafts. */
export async function hydrateBattlePageSkills(
  supabase: SupabaseClient | null = null,
): Promise<Skill[]> {
  const fromDrafts = await refreshBattleSkillsFromLiveTableDrafts(supabase);
  if (fromDrafts) return fromDrafts;
  return loadBattleSkillsForBattlePage();
}

export function saveBattleSkillsToStorage(
  moduleId: string,
  skills: Skill[],
  options?: { notify?: boolean },
): void {
  saveSkillsForModuleWithMirror(moduleId, skills, options);
}

/** Reset one module's skills to built-in defaults (other modules unchanged). */
export function resetActiveBattleSkillModuleToBuiltin(moduleId: string): void {
  resetModuleSkillsToBuiltin(moduleId);
}
