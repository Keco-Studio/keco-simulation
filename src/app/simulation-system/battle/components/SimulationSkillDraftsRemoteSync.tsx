'use client';

import { useEffect } from 'react';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import {
  loadBattleSkillDrafts,
  type BattleSkillDraft,
} from '../lib/localTableSkillSource/battleSkillDrafts';
import {
  registerSimulationSkillDraftsRemoteSync,
  upsertSimulationSkillDraftsRemote,
} from '../lib/localTableSkillSource/simulationSkillDraftsRemote';

/** Registers Supabase upsert for simulation skill drafts (shared with battle-poc). */
export function SimulationSkillDraftsRemoteSync() {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!supabase || !isAuthenticated || !userProfile?.id) {
      registerSimulationSkillDraftsRemoteSync(null);
      return;
    }

    const userId = userProfile.id;
    registerSimulationSkillDraftsRemoteSync(async (drafts: BattleSkillDraft[]) => {
      await upsertSimulationSkillDraftsRemote(supabase, userId, drafts);
    });

    void upsertSimulationSkillDraftsRemote(supabase, userId, loadBattleSkillDrafts()).catch(
      (err) => {
        console.warn('[simulation] Failed to upload existing skill drafts:', err);
      },
    );

    return () => registerSimulationSkillDraftsRemoteSync(null);
  }, [supabase, isAuthenticated, userProfile?.id]);

  return null;
}
