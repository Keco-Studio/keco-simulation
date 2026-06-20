import type { ProgressionConfig } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { DEFAULT_CONFIG, DEFAULT_PROFILE } from '@/lib/progression/defaults';

const STORAGE_KEY = 'keco-sim:progression:v1';

interface PersistedState {
  version: 1;
  config: ProgressionConfig;
  profile: BehaviorProfile;
}

export function readProgressionState(): { config: ProgressionConfig; profile: BehaviorProfile } {
  if (typeof window === 'undefined') return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1 || !parsed.config || !parsed.profile) {
      return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
    }
    return { config: parsed.config, profile: parsed.profile };
  } catch {
    return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
  }
}

export function writeProgressionState(config: ProgressionConfig, profile: BehaviorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedState = { version: 1, config, profile };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function resetProgressionState(): { config: ProgressionConfig; profile: BehaviorProfile } {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
}
