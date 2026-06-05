/**
 * Persist keco-simulation Studio skill drafts to shared Supabase (battle-poc migration).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BattleSkillDraft } from './battleSkillDrafts';

const TABLE = 'simulation_skill_drafts';

export async function upsertSimulationSkillDraftsRemote(
  supabase: SupabaseClient,
  userId: string,
  drafts: BattleSkillDraft[],
): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      drafts,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

let remoteSyncHandler: ((drafts: BattleSkillDraft[]) => Promise<void>) | null = null;

export function registerSimulationSkillDraftsRemoteSync(
  handler: ((drafts: BattleSkillDraft[]) => Promise<void>) | null,
): void {
  remoteSyncHandler = handler;
}

export function triggerSimulationSkillDraftsRemoteSync(drafts: BattleSkillDraft[]): void {
  if (!remoteSyncHandler) return;
  void remoteSyncHandler(drafts).catch((err) => {
    console.warn('[simulation] Failed to sync skill drafts to Supabase:', err);
  });
}
