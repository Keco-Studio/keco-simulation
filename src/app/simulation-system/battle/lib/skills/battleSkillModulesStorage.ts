/**
 * Multi-module battle skills persistence (IndexedDB + localStorage mirror).
 * Contract is consumed by battleSkillsStorage.ts and useBattleSkillsEditor.ts.
 */

import type { Skill } from '../../types';
import { getBuiltinSkills } from '../../data/skills';
import {
  idbReadBattleSkillModulesJson,
  idbReadBattleSkillsJson,
  idbWriteBattleSkillModulesJson,
} from './battleSkillsIndexedDb';
import {
  BATTLE_SKILL_MODULES_STORAGE_KEY,
  BATTLE_SKILLS_UPDATED_EVENT,
} from './battleSkillsPersistenceKeys';

export const DEFAULT_BATTLE_SKILL_MODULE_ID = 'all';

export type BattleSkillModule = {
  id: string;
  skills: Skill[];
};

export type BattleSkillModulesState = {
  activeModuleId: string;
  modules: BattleSkillModule[];
};

function cloneSkills(skills: Skill[]): Skill[] {
  return JSON.parse(JSON.stringify(skills)) as Skill[];
}

function isValidSkill(x: unknown): x is Skill {
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
    (typeof s.description === 'string' || s.description === undefined) &&
    (s.type === 'attack' || s.type === 'heal')
  );
}

function parseLegacyFlatSkillsJson(raw: string | null): Skill[] | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  const valid = data.filter(isValidSkill);
  if (valid.length === 0) return null;
  return valid;
}

function isModulesState(x: unknown): x is BattleSkillModulesState {
  if (!x || typeof x !== 'object') return false;
  const o = x as BattleSkillModulesState;
  if (typeof o.activeModuleId !== 'string' || !Array.isArray(o.modules)) return false;
  for (const m of o.modules) {
    if (!m || typeof m !== 'object') return false;
    const mod = m as BattleSkillModule;
    if (typeof mod.id !== 'string' || !Array.isArray(mod.skills)) return false;
    if (!mod.skills.every(isValidSkill)) return false;
  }
  return o.modules.length > 0;
}

function createDefaultState(): BattleSkillModulesState {
  return {
    activeModuleId: DEFAULT_BATTLE_SKILL_MODULE_ID,
    modules: [{ id: DEFAULT_BATTLE_SKILL_MODULE_ID, skills: cloneSkills(getBuiltinSkills()) }],
  };
}

function readLocalStorageModulesRaw(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BATTLE_SKILL_MODULES_STORAGE_KEY);
}

function parseModulesJson(raw: string | null): BattleSkillModulesState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  return isModulesState(data) ? normalizeModulesState(data) : null;
}

function normalizeModulesState(state: BattleSkillModulesState): BattleSkillModulesState {
  const modules = state.modules.map((m) => ({
    ...m,
    skills: m.skills.map((s) => ({
      ...s,
      description: typeof s.description === 'string' ? s.description : '',
    })),
  }));
  const active = modules.some((m) => m.id === state.activeModuleId)
    ? state.activeModuleId
    : DEFAULT_BATTLE_SKILL_MODULE_ID;
  return { activeModuleId: active, modules };
}

type WriteStateOptions = {
  /** When false, persist without firing BATTLE_SKILLS_UPDATED_EVENT (avoids hydrate feedback loops). */
  notify?: boolean;
};

function writeStateSync(state: BattleSkillModulesState, options?: WriteStateOptions): void {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(state);
  localStorage.setItem(BATTLE_SKILL_MODULES_STORAGE_KEY, json);
  void idbWriteBattleSkillModulesJson(json);
  if (options?.notify !== false) {
    notifyBattleSkillModulesUpdated();
  }
}

export function notifyBattleSkillModulesUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BATTLE_SKILLS_UPDATED_EVENT));
}

async function migrateFromLegacyIfNeeded(): Promise<BattleSkillModulesState | null> {
  const legacyIdb = await idbReadBattleSkillsJson();
  const skills = parseLegacyFlatSkillsJson(legacyIdb);
  if (!skills) return null;
  const state: BattleSkillModulesState = normalizeModulesState({
    activeModuleId: DEFAULT_BATTLE_SKILL_MODULE_ID,
    modules: [{ id: DEFAULT_BATTLE_SKILL_MODULE_ID, skills: cloneSkills(skills) }],
  });
  writeStateSync(state);
  return state;
}

export async function loadBattleSkillModulesState(): Promise<BattleSkillModulesState> {
  const fromLs = parseModulesJson(readLocalStorageModulesRaw());
  if (fromLs) return fromLs;

  const fromIdb = parseModulesJson(await idbReadBattleSkillModulesJson());
  if (fromIdb) {
    writeStateSync(fromIdb, { notify: false });
    return fromIdb;
  }

  const migrated = await migrateFromLegacyIfNeeded();
  if (migrated) return migrated;

  const fresh = createDefaultState();
  writeStateSync(fresh);
  return fresh;
}

export function saveSkillsForModuleWithMirror(
  moduleId: string,
  skills: Skill[],
  options?: WriteStateOptions,
): void {
  if (typeof window === 'undefined') return;
  const raw = readLocalStorageModulesRaw();
  let state = parseModulesJson(raw) ?? createDefaultState();
  const idx = state.modules.findIndex((m) => m.id === moduleId);
  const nextMod: BattleSkillModule = { id: moduleId, skills: cloneSkills(skills) };
  if (idx >= 0) {
    const nextMods = [...state.modules];
    nextMods[idx] = nextMod;
    state = { ...state, modules: nextMods };
  } else {
    state = { ...state, modules: [...state.modules, nextMod] };
  }
  writeStateSync(state, options);
}

export function resetModuleSkillsToBuiltin(moduleId: string): void {
  if (typeof window === 'undefined') return;
  const raw = readLocalStorageModulesRaw();
  let state = parseModulesJson(raw) ?? createDefaultState();
  const builtin = cloneSkills(getBuiltinSkills());
  const idx = state.modules.findIndex((m) => m.id === moduleId);
  if (idx >= 0) {
    const nextMods = [...state.modules];
    nextMods[idx] = { id: moduleId, skills: builtin };
    state = { ...state, modules: nextMods };
  } else {
    state = { ...state, modules: [...state.modules, { id: moduleId, skills: builtin }] };
  }
  writeStateSync(state);
}
