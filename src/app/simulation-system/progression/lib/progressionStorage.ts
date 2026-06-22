import type { ProgressionConfig, Contribution } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { DEFAULT_CONFIG, DEFAULT_PROFILE } from '@/lib/progression/defaults';

const STORAGE_KEY = 'keco-sim:progression:v1';
export const PROGRESSION_BATTLE_IMPORTED_EVENT = 'keco-progression-battle-imported';

function notifyBattleImported(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROGRESSION_BATTLE_IMPORTED_EVENT));
}

export interface BattleImportRecord {
  id: string;
  importedAt: number;
  outcome: 'win' | 'lose' | 'fled';
  enemyName: string;
  contributions: Contribution[];
}

interface PersistedState {
  version: 1;
  config: ProgressionConfig;
  profile: BehaviorProfile;
  battleImports?: BattleImportRecord[];
}

export function readProgressionState(): {
  config: ProgressionConfig;
  profile: BehaviorProfile;
  battleImports: BattleImportRecord[];
} {
  if (typeof window === 'undefined') {
    return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE, battleImports: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE, battleImports: [] };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1 || !parsed.config || !parsed.profile) {
      return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE, battleImports: [] };
    }
    return {
      config: parsed.config,
      profile: parsed.profile,
      battleImports: Array.isArray(parsed.battleImports) ? parsed.battleImports : [],
    };
  } catch {
    return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE, battleImports: [] };
  }
}

function readRawPersisted(): PersistedState {
  const s = readProgressionState();
  return { version: 1, ...s };
}

export function writeProgressionState(
  config: ProgressionConfig,
  profile: BehaviorProfile,
  battleImports?: BattleImportRecord[]
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readRawPersisted();
    const payload: PersistedState = {
      version: 1,
      config,
      profile,
      battleImports: battleImports ?? existing.battleImports ?? [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function appendBattleImport(record: Omit<BattleImportRecord, 'id' | 'importedAt'>): BattleImportRecord {
  const existing = readRawPersisted();
  const entry: BattleImportRecord = {
    ...record,
    id: `battle_${Date.now()}`,
    importedAt: Date.now(),
  };
  const battleImports = [...(existing.battleImports ?? []), entry];
  writeProgressionState(existing.config, existing.profile, battleImports);
  notifyBattleImported();
  return entry;
}

export function clearBattleImports(): void {
  const existing = readRawPersisted();
  writeProgressionState(existing.config, existing.profile, []);
}

/** Flatten imported battles into contributions with distinct step indices per battle. */
export function flattenBattleImports(
  imports: BattleImportRecord[],
  stepOffset = 0
): Contribution[] {
  const out: Contribution[] = [];
  imports.forEach((rec, battleIdx) => {
    for (const c of rec.contributions) {
      out.push({ ...c, step: stepOffset + battleIdx });
    }
  });
  return out;
}

export function resetProgressionState(): {
  config: ProgressionConfig;
  profile: BehaviorProfile;
  battleImports: BattleImportRecord[];
} {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE, battleImports: [] };
}
