'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import {
  bindCharacter,
  ensureUserProgression,
  listUserSkillLevels,
  loadUserProgression,
  upgradeSkill as upgradeSkillRemote,
} from '@/lib/characterProgression/supabaseProgressionStorage';
import {
  importStudioProgressionBundle,
  type StudioLibraryBinding,
} from '@/lib/characterProgression/studio/importStudioProgressionBundle';
import { buildEffectiveLoadout, resolveUpgradeCost } from '@/lib/characterProgression/merge';
import type {
  EffectiveBattleLoadout,
  StudioProgressionBundle,
  UserProgression,
  UserSkillLevel,
} from '@/lib/characterProgression/types';
import {
  notifyProgressionConfigUpdated,
  readCloudProgressionStudioBinding,
  writeCloudProgressionStudioBinding,
  type CloudProgressionStudioBinding,
} from './progressionStudioBindingStorage';

export function buildSafeEffectiveLoadout(input: {
  progression: UserProgression | null;
  studioBundle: StudioProgressionBundle | null;
  skillLevels: UserSkillLevel[];
}): EffectiveBattleLoadout | null {
  const { progression, studioBundle, skillLevels } = input;
  const characterAssetId = progression?.characterAssetId;
  if (!progression || !studioBundle || !characterAssetId) return null;
  if (!studioBundle.characters[characterAssetId]) return null;
  return buildEffectiveLoadout({ progression, skillLevels, studio: studioBundle });
}

export function useCloudProgression() {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();

  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [skillLevels, setSkillLevels] = useState<UserSkillLevel[]>([]);
  const [studioBundle, setStudioBundle] = useState<StudioProgressionBundle | null>(null);
  const [binding, setBinding] = useState<CloudProgressionStudioBinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = userProfile?.id;
  const ready = Boolean(supabase && isAuthenticated && userId);

  const reload = useCallback(async () => {
    if (!supabase || !userId) {
      setProgression(null);
      setSkillLevels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [prog, levels] = await Promise.all([
        ensureUserProgression(supabase, userId),
        listUserSkillLevels(supabase, userId),
      ]);
      setProgression(prog);
      setSkillLevels(levels);

      const savedBinding = readCloudProgressionStudioBinding();
      setBinding(savedBinding);
      if (savedBinding) {
        const bundle = await importStudioProgressionBundle(supabase, {
          projectId: savedBinding.projectId ?? '',
          charactersLibraryId: savedBinding.charactersLibraryId!,
          skillsLibraryId: savedBinding.skillsLibraryId!,
          charLevelCurveLibraryId: savedBinding.charLevelCurveLibraryId!,
          skillLevelCurveLibraryId: savedBinding.skillLevelCurveLibraryId!,
        });
        setStudioBundle(bundle);
      } else {
        setStudioBundle(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progression');
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, reload]);

  useEffect(() => {
    const onUpdated = () => void reload();
    window.addEventListener('keco-progression-config-updated', onUpdated);
    return () => window.removeEventListener('keco-progression-config-updated', onUpdated);
  }, [reload]);

  const importStudioBinding = useCallback(
    async (nextBinding: CloudProgressionStudioBinding) => {
      if (!supabase) return;
      setImporting(true);
      setError(null);
      try {
        writeCloudProgressionStudioBinding(nextBinding);
        setBinding(nextBinding);
        const bundle = await importStudioProgressionBundle(supabase, {
          projectId: nextBinding.projectId ?? '',
          charactersLibraryId: nextBinding.charactersLibraryId!,
          skillsLibraryId: nextBinding.skillsLibraryId!,
          charLevelCurveLibraryId: nextBinding.charLevelCurveLibraryId!,
          skillLevelCurveLibraryId: nextBinding.skillLevelCurveLibraryId!,
        });
        setStudioBundle(bundle);
        notifyProgressionConfigUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import Studio libraries');
        throw err;
      } finally {
        setImporting(false);
      }
    },
    [supabase],
  );

  const selectCharacter = useCallback(
    async (characterAssetId: string, characterLibraryId: string) => {
      if (!supabase || !userId) return;
      setError(null);
      const next = await bindCharacter(supabase, userId, characterAssetId, characterLibraryId);
      setProgression(next);
      notifyProgressionConfigUpdated();
      return next;
    },
    [supabase, userId],
  );

  const upgradeSkill = useCallback(
    async (skillId: string) => {
      if (!supabase || !userId || !studioBundle || !progression) {
        throw new Error('Not ready to upgrade skills');
      }
      const currentLevel = skillLevels.find((s) => s.skillId === skillId)?.level ?? 0;
      const cost = resolveUpgradeCost(skillId, currentLevel, studioBundle.skillLevelCurve);
      if (cost == null) throw new Error('No upgrade curve for this skill level');
      if (progression.skillPoints < cost) throw new Error('Insufficient skill points');

      const row = await upgradeSkillRemote(supabase, skillId, cost);
      const [nextProg, nextLevels] = await Promise.all([
        loadUserProgression(supabase, userId),
        listUserSkillLevels(supabase, userId),
      ]);
      if (nextProg) setProgression(nextProg);
      setSkillLevels(nextLevels);
      notifyProgressionConfigUpdated();
      return row;
    },
    [supabase, userId, studioBundle, progression, skillLevels],
  );

  const effectiveLoadout = buildSafeEffectiveLoadout({
    progression,
    studioBundle,
    skillLevels,
  });

  return {
    authLoading,
    isAuthenticated,
    ready,
    loading,
    importing,
    error,
    progression,
    skillLevels,
    studioBundle,
    binding,
    effectiveLoadout,
    reload,
    importStudioBinding,
    selectCharacter,
    upgradeSkill,
  };
}

export type { StudioLibraryBinding, CloudProgressionStudioBinding };
