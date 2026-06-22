import { loadBattleSkillsFromPersistence } from '@/app/simulation-system/battle/lib/skills/battleSkillsStorage';

export interface ProgressionSkillOption {
  id: string;
  name: string;
}

/**
 * Read the real battle skill table (same data edited in /simulation-system/battle/skills)
 * and expose a minimal {id, name} list for the progression simulator's skill picker.
 * Falls back to an empty list if persistence is unavailable.
 */
export async function loadProgressionSkillOptions(): Promise<ProgressionSkillOption[]> {
  try {
    const skills = await loadBattleSkillsFromPersistence();
    return skills.map((s) => ({ id: s.id, name: s.name }));
  } catch {
    return [];
  }
}
