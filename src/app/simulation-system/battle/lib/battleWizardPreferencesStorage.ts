import type { Element } from '../types';
import { DEFAULT_MONSTER_STATS, DEFAULT_PLAYER_STATS } from '../types';
import type { BattleUnitConfig } from './localTableSkillSource/battleUnitSource';

export const BATTLE_WIZARD_PREFERENCES_STORAGE_KEY = 'keco-battle-wizard-preferences-v1';

export type BattleWizardPreferences = {
  version: 1;
  playerConfig: BattleUnitConfig;
  monsterConfig: BattleUnitConfig;
  playerSkillIds: string[];
  monsterSkillIds: string[];
  monsterInitialElement: Element | null;
};

const VALID_ELEMENTS = new Set<Element>(['fire', 'water', 'thunder', 'grass', 'ice']);

function defaultPlayerConfig(): BattleUnitConfig {
  return { ...DEFAULT_PLAYER_STATS };
}

function defaultMonsterConfig(): BattleUnitConfig {
  return { ...DEFAULT_MONSTER_STATS };
}

function sanitizeUnitConfig(raw: unknown, defaults: BattleUnitConfig): BattleUnitConfig {
  if (!raw || typeof raw !== 'object') return defaults;
  const o = raw as Record<string, unknown>;
  const num = (key: keyof BattleUnitConfig, min: number, max: number, fallback: number) => {
    const v = o[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(v)));
  };
  const nameRaw = o.name;
  const name =
    typeof nameRaw === 'string' && nameRaw.trim().length > 0
      ? nameRaw.trim().slice(0, 20)
      : defaults.name;
  return {
    name,
    hp: num('hp', 1, 99999, defaults.hp),
    atk: num('atk', 1, 9999, defaults.atk),
    def: num('def', 0, 9999, defaults.def),
    spd: num('spd', 1, 9999, defaults.spd),
    mp: num('mp', 1, 999, defaults.mp),
  };
}

function sanitizeSkillIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= 6) break;
  }
  return ids;
}

function sanitizeElement(raw: unknown): Element | null {
  if (typeof raw !== 'string') return null;
  return VALID_ELEMENTS.has(raw as Element) ? (raw as Element) : null;
}

export function readBattleWizardPreferences(): BattleWizardPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BATTLE_WIZARD_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BattleWizardPreferences>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      playerConfig: sanitizeUnitConfig(parsed.playerConfig, defaultPlayerConfig()),
      monsterConfig: sanitizeUnitConfig(parsed.monsterConfig, defaultMonsterConfig()),
      playerSkillIds: sanitizeSkillIds(parsed.playerSkillIds),
      monsterSkillIds: sanitizeSkillIds(parsed.monsterSkillIds),
      monsterInitialElement: sanitizeElement(parsed.monsterInitialElement),
    };
  } catch {
    return null;
  }
}

export function writeBattleWizardPreferences(input: Omit<BattleWizardPreferences, 'version'>): void {
  if (typeof window === 'undefined') return;
  const payload: BattleWizardPreferences = {
    version: 1,
    playerConfig: sanitizeUnitConfig(input.playerConfig, defaultPlayerConfig()),
    monsterConfig: sanitizeUnitConfig(input.monsterConfig, defaultMonsterConfig()),
    playerSkillIds: sanitizeSkillIds(input.playerSkillIds),
    monsterSkillIds: sanitizeSkillIds(input.monsterSkillIds),
    monsterInitialElement: sanitizeElement(input.monsterInitialElement),
  };
  try {
    localStorage.setItem(BATTLE_WIZARD_PREFERENCES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function readInitialBattleWizardState(): Omit<BattleWizardPreferences, 'version'> {
  const saved = readBattleWizardPreferences();
  if (!saved) {
    return {
      playerConfig: defaultPlayerConfig(),
      monsterConfig: defaultMonsterConfig(),
      playerSkillIds: [],
      monsterSkillIds: [],
      monsterInitialElement: null,
    };
  }
  return {
    playerConfig: saved.playerConfig,
    monsterConfig: saved.monsterConfig,
    playerSkillIds: saved.playerSkillIds,
    monsterSkillIds: saved.monsterSkillIds,
    monsterInitialElement: saved.monsterInitialElement,
  };
}

let initialStateCache: Omit<BattleWizardPreferences, 'version'> | null = null;

/** Single read per page load for React initial state (avoids 5× localStorage parse). */
export function readInitialBattleWizardStateOnce(): Omit<BattleWizardPreferences, 'version'> {
  if (!initialStateCache) {
    initialStateCache = readInitialBattleWizardState();
  }
  return initialStateCache;
}

export function clearInitialBattleWizardStateCache(): void {
  initialStateCache = null;
}
