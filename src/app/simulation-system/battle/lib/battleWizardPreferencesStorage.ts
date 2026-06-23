import type { Element } from '../types';
import { DEFAULT_MONSTER_STATS, DEFAULT_PLAYER_STATS } from '../types';
import type { BattleUnitConfig } from './localTableSkillSource/battleUnitSource';
import {
  type BattleUnitConfigSource,
  type BattleUnitImportBinding,
  sanitizeConfigSource,
  sanitizeImportHistory,
} from './battleUnitImportHistory';
import {
  type BattleProgressionSource,
  sanitizeBattleProgressionSource,
} from './battleProgressionSource';

export const BATTLE_WIZARD_PREFERENCES_STORAGE_KEY = 'keco-battle-wizard-preferences-v2';
/** Legacy v1 key — read once for migration. */
const LEGACY_PREFERENCES_STORAGE_KEY = 'keco-battle-wizard-preferences-v1';

export type BattleWizardPreferences = {
  version: 2;
  playerConfig: BattleUnitConfig;
  monsterConfig: BattleUnitConfig;
  playerSkillIds: string[];
  monsterSkillIds: string[];
  monsterInitialElement: Element | null;
  playerImportHistory: BattleUnitImportBinding[];
  monsterImportHistory: BattleUnitImportBinding[];
  playerConfigSource: BattleUnitConfigSource;
  monsterConfigSource: BattleUnitConfigSource;
  /** Whether battles apply rules from the progression simulator. */
  progressionSource: BattleProgressionSource;
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

type LegacyPreferencesV1 = {
  version: 1;
  playerConfig?: unknown;
  monsterConfig?: unknown;
  playerSkillIds?: unknown;
  monsterSkillIds?: unknown;
  monsterInitialElement?: unknown;
};

function readLegacyV1Preferences(): LegacyPreferencesV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegacyPreferencesV1>;
    if (parsed.version !== 1) return null;
    return parsed as LegacyPreferencesV1;
  } catch {
    return null;
  }
}

type RawPreferencesPartial = {
  playerConfig?: unknown;
  monsterConfig?: unknown;
  playerSkillIds?: unknown;
  monsterSkillIds?: unknown;
  monsterInitialElement?: unknown;
  playerImportHistory?: unknown;
  monsterImportHistory?: unknown;
  playerConfigSource?: unknown;
  monsterConfigSource?: unknown;
  progressionSource?: unknown;
};

function buildPreferencesFromPartial(partial: RawPreferencesPartial): BattleWizardPreferences {
  const playerImportHistory = sanitizeImportHistory(partial.playerImportHistory);
  const monsterImportHistory = sanitizeImportHistory(partial.monsterImportHistory);
  return {
    version: 2,
    playerConfig: sanitizeUnitConfig(partial.playerConfig, defaultPlayerConfig()),
    monsterConfig: sanitizeUnitConfig(partial.monsterConfig, defaultMonsterConfig()),
    playerSkillIds: sanitizeSkillIds(partial.playerSkillIds),
    monsterSkillIds: sanitizeSkillIds(partial.monsterSkillIds),
    monsterInitialElement: sanitizeElement(partial.monsterInitialElement),
    playerImportHistory,
    monsterImportHistory,
    playerConfigSource: sanitizeConfigSource(partial.playerConfigSource, playerImportHistory),
    monsterConfigSource: sanitizeConfigSource(partial.monsterConfigSource, monsterImportHistory),
    progressionSource: sanitizeBattleProgressionSource(partial.progressionSource),
  };
}

export function readBattleWizardPreferences(): BattleWizardPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BATTLE_WIZARD_PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BattleWizardPreferences>;
      if (parsed.version === 2) {
        return buildPreferencesFromPartial(parsed);
      }
    }
  } catch {
    // fall through to legacy migration
  }

  const legacy = readLegacyV1Preferences();
  if (!legacy) return null;

  return buildPreferencesFromPartial({
    playerConfig: legacy.playerConfig as unknown,
    monsterConfig: legacy.monsterConfig as unknown,
    playerSkillIds: legacy.playerSkillIds,
    monsterSkillIds: legacy.monsterSkillIds,
    monsterInitialElement: legacy.monsterInitialElement,
    playerImportHistory: [],
    monsterImportHistory: [],
    playerConfigSource: { kind: 'manual' },
    monsterConfigSource: { kind: 'manual' },
    progressionSource: 'cloud',
  });
}

export function writeBattleWizardPreferences(
  input: Omit<BattleWizardPreferences, 'version' | 'progressionSource'>,
): void {
  if (typeof window === 'undefined') return;
  const payload = buildPreferencesFromPartial({ ...input, progressionSource: 'cloud' });
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
      playerImportHistory: [],
      monsterImportHistory: [],
      playerConfigSource: { kind: 'manual' },
      monsterConfigSource: { kind: 'manual' },
      progressionSource: 'cloud',
    };
  }
  const { version: _v, progressionSource: _ps, ...rest } = saved;
  return rest;
}

let initialStateCache: Omit<BattleWizardPreferences, 'version'> | null = null;

/** Single read per page load for React initial state (avoids repeated localStorage parse). */
export function readInitialBattleWizardStateOnce(): Omit<BattleWizardPreferences, 'version'> {
  if (!initialStateCache) {
    initialStateCache = readInitialBattleWizardState();
  }
  return initialStateCache;
}

export function clearInitialBattleWizardStateCache(): void {
  initialStateCache = null;
}
