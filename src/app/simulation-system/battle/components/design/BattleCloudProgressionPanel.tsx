'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Collapse, Progress, Select, message } from 'antd';
import { CloudDownloadOutlined, RiseOutlined } from '@ant-design/icons';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { listStudioLibrariesForSkillImport } from '@/app/simulation-system/battle/lib/localTableSkillSource/simTablePickerData';
import { useCloudProgression } from '@/app/simulation-system/progression/lib/useCloudProgression';
import { resolveUpgradeCost } from '@/lib/characterProgression/merge';
import type { EffectiveBattleLoadout } from '@/lib/characterProgression/types';
import type { CloudProgressionStudioBinding } from '@/app/simulation-system/progression/lib/progressionStudioBindingStorage';
import { buildBattleProgressionSummary } from './battleProgressionSummary';
import { buildCloudLoadoutSyncKey } from './cloudLoadoutSyncKey';
import styles from './BattleCloudProgressionPanel.module.css';

type Props = {
  onLoadoutApplied?: (loadout: EffectiveBattleLoadout) => void;
  onSkillLevelsChange?: (skillLevels: Record<string, number>) => void;
};

function expBarPercent(
  level: number,
  exp: number,
  curve: { level: number; needExp: number }[],
): { percent: number; nextNeed: number | null } {
  const sorted = [...curve].sort((a, b) => a.level - b.level);
  const maxLevel = sorted.length > 0 ? sorted[sorted.length - 1].level : level;
  if (level >= maxLevel) return { percent: 100, nextNeed: null };
  const currentNeed = sorted.find((r) => r.level === level)?.needExp ?? 0;
  const nextNeed = sorted.find((r) => r.level === level + 1)?.needExp ?? null;
  if (nextNeed == null || nextNeed <= currentNeed) return { percent: 100, nextNeed: null };
  const span = nextNeed - currentNeed;
  const into = exp - currentNeed;
  return { percent: span > 0 ? Math.max(0, Math.min(100, (into / span) * 100)) : 0, nextNeed };
}

export function BattleCloudProgressionPanel({
  onLoadoutApplied,
  onSkillLevelsChange,
}: Props) {
  const cloud = useCloudProgression();
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const [charactersLibraryId, setCharactersLibraryId] = useState(cloud.binding?.charactersLibraryId);
  const [skillsLibraryId, setSkillsLibraryId] = useState(cloud.binding?.skillsLibraryId);
  const [charLevelCurveLibraryId, setCharLevelCurveLibraryId] = useState(
    cloud.binding?.charLevelCurveLibraryId,
  );
  const [skillLevelCurveLibraryId, setSkillLevelCurveLibraryId] = useState(
    cloud.binding?.skillLevelCurveLibraryId,
  );
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    if (!cloud.binding) return;
    setCharactersLibraryId(cloud.binding.charactersLibraryId);
    setSkillsLibraryId(cloud.binding.skillsLibraryId);
    setCharLevelCurveLibraryId(cloud.binding.charLevelCurveLibraryId);
    setSkillLevelCurveLibraryId(cloud.binding.skillLevelCurveLibraryId);
  }, [cloud.binding]);

  const lastLoadoutKeyRef = useRef<string | null>(null);
  const loadoutKey = useMemo(() => {
    return buildCloudLoadoutSyncKey({
      progression: cloud.progression,
      effectiveLoadout: cloud.effectiveLoadout,
      skillLevels: cloud.skillLevels,
    });
  }, [cloud.effectiveLoadout, cloud.progression, cloud.skillLevels]);

  useEffect(() => {
    if (!cloud.effectiveLoadout || !onLoadoutApplied || !loadoutKey) return;
    if (lastLoadoutKeyRef.current === loadoutKey) return;
    lastLoadoutKeyRef.current = loadoutKey;
    onLoadoutApplied(cloud.effectiveLoadout);
  }, [cloud.effectiveLoadout, loadoutKey, onLoadoutApplied]);

  useEffect(() => {
    if (!onSkillLevelsChange) return;
    const map: Record<string, number> = {};
    for (const row of cloud.skillLevels) {
      if (row.level > 0) map[row.skillId] = row.level;
    }
    onSkillLevelsChange(map);
  }, [cloud.skillLevels, onSkillLevelsChange]);

  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['battleCloudProgressionLibs', userProfile?.id],
    queryFn: () => listStudioLibrariesForSkillImport(supabase!, userProfile!.id),
    enabled: supabaseReady,
  });

  const libraryOptions = useMemo(
    () => libraries.map((l) => ({ value: l.libraryId, label: l.label })),
    [libraries],
  );

  const labelFor = useCallback(
    (libraryId: string | undefined) =>
      libraries.find((l) => l.libraryId === libraryId)?.label ?? libraryId ?? '',
    [libraries],
  );

  const librariesSelected = Boolean(
    charactersLibraryId &&
      skillsLibraryId &&
      charLevelCurveLibraryId &&
      skillLevelCurveLibraryId,
  );
  const needsImport = librariesSelected && !cloud.binding;
  const bundleReady = Boolean(cloud.studioBundle);
  const bundleLoading = cloud.loading || cloud.importing;

  const handleImport = async () => {
    if (
      !charactersLibraryId ||
      !skillsLibraryId ||
      !charLevelCurveLibraryId ||
      !skillLevelCurveLibraryId
    ) {
      message.warning('Select all four Studio libraries');
      return;
    }
    const lib = libraries.find((l) => l.libraryId === charactersLibraryId);
    const next: CloudProgressionStudioBinding = {
      projectId: lib?.projectId,
      charactersLibraryId,
      skillsLibraryId,
      charLevelCurveLibraryId,
      skillLevelCurveLibraryId,
      importedAt: Date.now(),
      cloudLabels: {
        characters: labelFor(charactersLibraryId),
        skills: labelFor(skillsLibraryId),
        charLevelCurve: labelFor(charLevelCurveLibraryId),
        skillLevelCurve: labelFor(skillLevelCurveLibraryId),
      },
    };
    try {
      await cloud.importStudioBinding(next);
      message.success('Studio libraries imported');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to import Studio libraries');
    }
  };

  const characterOptions = cloud.studioBundle
    ? Object.values(cloud.studioBundle.characters).map((c) => ({
        value: c.assetId,
        label: c.name,
      }))
    : [];

  const boundCharacter =
    cloud.progression?.characterAssetId && cloud.studioBundle
      ? cloud.studioBundle.characters[cloud.progression.characterAssetId]
      : undefined;

  const expBar =
    cloud.progression && cloud.studioBundle
      ? expBarPercent(
          cloud.progression.level,
          cloud.progression.exp,
          cloud.studioBundle.charLevelCurve,
        )
      : null;
  const progressionSummary = buildBattleProgressionSummary({
    progression: cloud.progression,
    characterName: boundCharacter?.name,
    nextNeed: expBar?.nextNeed,
  });

  const skillRows = useMemo(() => {
    const skills = cloud.studioBundle?.skills ?? {};
    const curve = cloud.studioBundle?.skillLevelCurve ?? [];
    const characterSkillIds =
      boundCharacter?.skillIds ??
      (cloud.progression?.characterAssetId && cloud.studioBundle
        ? cloud.studioBundle.characters[cloud.progression.characterAssetId]?.skillIds
        : undefined);
    const baseIds =
      characterSkillIds && characterSkillIds.length > 0
        ? characterSkillIds
        : [...new Set([...Object.keys(skills), ...cloud.skillLevels.map((s) => s.skillId)])];
    return baseIds.map((skillId) => {
      const allocated = cloud.skillLevels.find((s) => s.skillId === skillId)?.level ?? 0;
      return {
        skillId,
        name: skills[skillId]?.name ?? skillId,
        allocated,
        cost: resolveUpgradeCost(skillId, allocated, curve),
      };
    });
  }, [cloud.studioBundle, cloud.skillLevels, cloud.progression?.characterAssetId, boundCharacter]);
  const hasAllocatedSkills = skillRows.some((row) => row.allocated > 0);

  const handleUpgrade = async (skillId: string, name: string, nextLevel: number, cost: number) => {
    if (!cloud.progression || cloud.progression.skillPoints < cost) {
      message.error('Insufficient skill points');
      return;
    }
    setUpgradingId(skillId);
    try {
      await cloud.upgradeSkill(skillId);
      message.success(`${name} upgraded to Lv.${nextLevel}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgradingId(null);
    }
  };

  const handleReset = async (skillId: string, name: string) => {
    setResettingId(skillId);
    try {
      await cloud.resetSkill(skillId);
      message.success(`${name} reset; spent SP refunded`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResettingId(null);
    }
  };

  if (authLoading) return null;

  return (
    <div className={styles.card}>
      <div className={styles.title}>
        <RiseOutlined />
        Character progression
      </div>
      <p className={styles.hint}>
        Kill EXP and skill points sync to your account. Import Studio libraries, bind a character,
        then start battle.
      </p>

      {!isAuthenticated ? (
        <Alert
          type="info"
          showIcon
          message="Sign in to sync progression across devices"
          style={{ fontSize: 12 }}
        />
      ) : (
        <>
          {cloud.error ? <div className={styles.error}>{cloud.error}</div> : null}

          {needsImport ? (
            <Alert
              type="warning"
              showIcon
              message="Click Import libraries to enable character binding and skill upgrades"
              style={{ marginBottom: 10, fontSize: 12 }}
            />
          ) : null}

          <Collapse
            size="small"
            defaultActiveKey={cloud.binding ? [] : ['setup']}
            items={[
              {
                key: 'setup',
                label: cloud.binding
                  ? `Studio: ${cloud.binding.cloudLabels?.characters ?? 'bound'}`
                  : 'Studio library setup',
                children: (
                  <>
                    <div className={styles.field}>
                      <span className={styles.label}>Characters</span>
                      <Select
                        className={styles.select}
                        size="small"
                        showSearch
                        placeholder="Characters library"
                        options={libraryOptions}
                        value={charactersLibraryId}
                        onChange={setCharactersLibraryId}
                        loading={librariesLoading}
                        optionFilterProp="label"
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.label}>Skills</span>
                      <Select
                        className={styles.select}
                        size="small"
                        showSearch
                        placeholder="Skills library"
                        options={libraryOptions}
                        value={skillsLibraryId}
                        onChange={setSkillsLibraryId}
                        loading={librariesLoading}
                        optionFilterProp="label"
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.label}>Level curve</span>
                      <Select
                        className={styles.select}
                        size="small"
                        showSearch
                        placeholder="char_level_curve"
                        options={libraryOptions}
                        value={charLevelCurveLibraryId}
                        onChange={setCharLevelCurveLibraryId}
                        loading={librariesLoading}
                        optionFilterProp="label"
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.label}>Skill curve</span>
                      <Select
                        className={styles.select}
                        size="small"
                        showSearch
                        placeholder="skill_level_curve"
                        options={libraryOptions}
                        value={skillLevelCurveLibraryId}
                        onChange={setSkillLevelCurveLibraryId}
                        loading={librariesLoading}
                        optionFilterProp="label"
                      />
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      className={styles.importBtn}
                      icon={<CloudDownloadOutlined />}
                      loading={cloud.importing}
                      disabled={!supabaseReady}
                      onClick={() => void handleImport()}
                    >
                      Import libraries
                    </Button>
                  </>
                ),
              },
            ]}
          />

          {progressionSummary && cloud.binding ? (
            <>
              <div className={styles.statusRow}>
                {progressionSummary.title ? (
                  <strong className={styles.summaryTitle}>{progressionSummary.title}</strong>
                ) : null}
                <span className={styles.summaryTokens}>
                  {progressionSummary.tokens.map((token) => (
                    <span key={token.label} className={styles.summaryToken}>
                      <span className={styles.summaryLabel}>{token.label}</span>
                      <strong>{token.value}</strong>
                    </span>
                  ))}
                </span>
              </div>
              {expBar ? (
                <Progress
                  className={styles.progress}
                  percent={Math.round(expBar.percent)}
                  size="small"
                  showInfo={false}
                />
              ) : null}
            </>
          ) : null}

          {cloud.binding ? (
            <div className={styles.field}>
              <span className={styles.label}>Character</span>
              {bundleLoading && !bundleReady ? (
                <div className={styles.mutedHint}>Loading Studio libraries…</div>
              ) : (
                <Select
                  className={styles.select}
                  size="small"
                  showSearch
                  placeholder="Select character to bind"
                  options={characterOptions}
                  value={cloud.progression?.characterAssetId ?? undefined}
                  loading={cloud.loading}
                  disabled={!bundleReady}
                  optionFilterProp="label"
                  onChange={(assetId) => {
                    if (!cloud.binding?.charactersLibraryId) return;
                    void cloud.selectCharacter(assetId, cloud.binding.charactersLibraryId);
                  }}
                />
              )}
              {bundleReady && characterOptions.length === 0 ? (
                <div className={styles.mutedHint}>No characters found in the imported library.</div>
              ) : null}
              {bundleReady && !cloud.progression?.characterAssetId ? (
                <div className={styles.mutedHint}>
                  Bind a character to sync stats and show skill levels on the grid.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.upgradesSection}>
            <div className={styles.upgradesTitle}>Skill upgrades</div>
            {!cloud.binding ? (
              <p className={styles.mutedHint}>Import Studio libraries first.</p>
            ) : bundleLoading && !bundleReady ? (
              <p className={styles.mutedHint}>Loading skills…</p>
            ) : !cloud.progression?.characterAssetId ? (
              <p className={styles.mutedHint}>Select a character above to upgrade their skills.</p>
            ) : skillRows.length === 0 ? (
              <p className={styles.mutedHint}>
                No skills found. Check the Skills library and skill_level_curve imports.
              </p>
            ) : (
              <>
                {cloud.progression.skillPoints === 0 ? (
                  <p className={styles.mutedHint}>
                    {hasAllocatedSkills
                      ? 'No unspent skill points. Reset an upgraded skill to reclaim SP.'
                      : 'No skill points yet. Gain SP by leveling up from battle EXP.'}
                  </p>
                ) : null}
                {skillRows.map((row) => (
                  <div key={row.skillId} className={styles.skillRow}>
                    <span className={styles.skillName}>
                      {row.name} · Lv.{row.allocated}
                    </span>
                    <span className={styles.skillActions}>
                      {row.allocated > 0 ? (
                        <Button
                          type="link"
                          size="small"
                          className={styles.upgradeBtn}
                          disabled={upgradingId === row.skillId}
                          loading={resettingId === row.skillId}
                          onClick={() => void handleReset(row.skillId, row.name)}
                        >
                          Reset
                        </Button>
                      ) : null}
                      {row.cost != null ? (
                        <Button
                          type="link"
                          size="small"
                          className={styles.upgradeBtn}
                          disabled={
                            !cloud.progression ||
                            cloud.progression.skillPoints < row.cost ||
                            resettingId === row.skillId
                          }
                          loading={upgradingId === row.skillId}
                          onClick={() =>
                            void handleUpgrade(row.skillId, row.name, row.allocated + 1, row.cost!)
                          }
                        >
                          +1 ({row.cost} SP)
                        </Button>
                      ) : (
                        <span className={styles.maxLabel}>Max</span>
                      )}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
