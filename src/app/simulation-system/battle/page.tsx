'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import type { Element, Skill } from './types';
import { DEFAULT_MONSTER_STATS, DEFAULT_PLAYER_STATS } from './types';
import {
  BATTLE_SKILLS_UPDATED_EVENT,
  hydrateBattlePageSkills,
  readBattleSkillsForInitialRender,
} from './lib/skills/battleSkillsStorage';
import { SIM_LOCAL_TABLE_ROWS_UPDATED_EVENT } from '@/lib/simLocalTables/simLocalTablesEvents';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import type { BattleArenaConfig } from './components/BattleArena/BattleArena';
import {
  runArenaBatchSimulation,
  type BatchMapBattleSummary,
} from './lib/batchArenaSimulation';
import { BattleDesignShell } from './components/design/BattleDesignShell';
import { ConfigureSkillStep } from './components/design/ConfigureSkillStep';
import { ConfigurePlayerStep } from './components/design/ConfigurePlayerStep';
import { StartBattleStep } from './components/design/StartBattleStep';
import { KecoLoginModal } from './components/design/KecoLoginModal';
import { type WizardStep } from './components/design/battleDesignConstants';
import {
  DEFAULT_BATTLE_SKILL_MODULE_ID,
  resetModuleSkillsToBuiltin,
} from './lib/skills/battleSkillModulesStorage';
import type { BattleUnitConfig } from './lib/localTableSkillSource/battleUnitSource';
import {
  readBattleWizardPreferences,
  writeBattleWizardPreferences,
} from './lib/battleWizardPreferencesStorage';

function defaultPlayerConfig(): BattleUnitConfig {
  return { ...DEFAULT_PLAYER_STATS };
}

function defaultMonsterConfig(): BattleUnitConfig {
  return { ...DEFAULT_MONSTER_STATS };
}

function reconcileLoadoutIds(prev: string[], skillList: Skill[], savedIds: string[]): string[] {
  const skillIds = new Set(skillList.map((s) => s.id));
  const fromPrev = prev.filter((id) => skillIds.has(id));
  if (fromPrev.length > 0) return fromPrev;
  const fromSaved = savedIds.filter((id) => skillIds.has(id));
  if (fromSaved.length > 0) return fromSaved;
  return skillList.slice(0, Math.min(6, skillList.length)).map((s) => s.id);
}

export default function BattleSimulatorPage() {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const [playerConfig, setPlayerConfig] = useState<BattleUnitConfig>(defaultPlayerConfig);
  const [monsterConfig, setMonsterConfig] = useState<BattleUnitConfig>(defaultMonsterConfig);
  const [monsterInitialElement, setMonsterInitialElement] = useState<Element | null>(null);
  const [skillList, setSkillList] = useState<Skill[]>(() => readBattleSkillsForInitialRender());
  const [playerSkillIds, setPlayerSkillIds] = useState<string[]>([]);
  const [monsterSkillIds, setMonsterSkillIds] = useState<string[]>([]);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const savedPrefsRef = useRef(readBattleWizardPreferences());

  const [arenaConfig, setArenaConfig] = useState<BattleArenaConfig | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [skillSheetLabel, setSkillSheetLabel] = useState('Battle skills');
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const saved = readBattleWizardPreferences();
    savedPrefsRef.current = saved;
    if (saved) {
      setPlayerConfig(saved.playerConfig);
      setMonsterConfig(saved.monsterConfig);
      setMonsterInitialElement(saved.monsterInitialElement);
      setPlayerSkillIds(saved.playerSkillIds);
      setMonsterSkillIds(saved.monsterSkillIds);
    }
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncSkills = () => {
      void hydrateBattlePageSkills(supabaseReady ? supabase : null).then((skills) => {
        if (!cancelled) setSkillList(skills);
      });
    };
    syncSkills();
    const onSkillsUpdated = () => syncSkills();
    window.addEventListener(BATTLE_SKILLS_UPDATED_EVENT, onSkillsUpdated);
    window.addEventListener(SIM_LOCAL_TABLE_ROWS_UPDATED_EVENT, onSkillsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(BATTLE_SKILLS_UPDATED_EVENT, onSkillsUpdated);
      window.removeEventListener(SIM_LOCAL_TABLE_ROWS_UPDATED_EVENT, onSkillsUpdated);
    };
  }, [supabase, supabaseReady]);

  useEffect(() => {
    if (!prefsHydrated) return;
    writeBattleWizardPreferences({
      playerConfig,
      monsterConfig,
      playerSkillIds,
      monsterSkillIds,
      monsterInitialElement,
    });
    savedPrefsRef.current = readBattleWizardPreferences();
  }, [
    prefsHydrated,
    playerConfig,
    monsterConfig,
    playerSkillIds,
    monsterSkillIds,
    monsterInitialElement,
  ]);

  const defaultLoadoutIds = useCallback(
    () => skillList.slice(0, Math.min(6, skillList.length)).map((s) => s.id),
    [skillList],
  );

  useEffect(() => {
    if (!prefsHydrated || skillList.length === 0) return;

    const saved = savedPrefsRef.current;
    setPlayerSkillIds((prev) =>
      reconcileLoadoutIds(prev, skillList, saved?.playerSkillIds ?? []),
    );
    setMonsterSkillIds((prev) =>
      reconcileLoadoutIds(prev, skillList, saved?.monsterSkillIds ?? []),
    );
  }, [skillList, prefsHydrated]);

  const handleSkillsFromLocalTable = useCallback((skills: Skill[]) => {
    if (skills.length > 0) {
      setSkillList(skills);
      setSkillSheetLabel('Imported from table');
    }
  }, []);

  const handleUseDefaultSheet = useCallback(() => {
    resetModuleSkillsToBuiltin(DEFAULT_BATTLE_SKILL_MODULE_ID);
    void hydrateBattlePageSkills(supabaseReady ? supabase : null).then((skills) => {
      setSkillList(skills);
      setSkillSheetLabel('Default sheet');
      message.success('Default skill sheet loaded');
    });
  }, [supabase, supabaseReady]);

  const buildArenaConfig = useCallback(
    (playerLoadout: string[], enemyLoadout: string[]): BattleArenaConfig => ({
      mapWidth: 16,
      mapHeight: 16,
      playerName: playerConfig.name,
      playerStats: {
        maxHp: playerConfig.hp,
        atk: playerConfig.atk,
        def: playerConfig.def,
        spd: playerConfig.spd,
      },
      playerHp: playerConfig.hp,
      playerMp: playerConfig.mp,
      playerMaxMp: playerConfig.mp,
      playerSkillIds: playerLoadout,
      enemyName: monsterConfig.name,
      enemyStats: {
        maxHp: monsterConfig.hp,
        atk: monsterConfig.atk,
        def: monsterConfig.def,
        spd: monsterConfig.spd,
      },
      enemyHp: monsterConfig.hp,
      enemyMp: monsterConfig.mp,
      enemyMaxMp: monsterConfig.mp,
      enemySkillIds: enemyLoadout,
      skills: skillList,
      monsterInitialElement,
    }),
    [playerConfig, monsterConfig, monsterInitialElement, skillList],
  );

  const resolveLoadouts = useCallback(() => {
    const fallback = defaultLoadoutIds();
    const playerLoadout = playerSkillIds.length > 0 ? playerSkillIds : fallback;
    const enemyLoadout = monsterSkillIds.length > 0 ? monsterSkillIds : fallback;
    return { playerLoadout, enemyLoadout };
  }, [defaultLoadoutIds, playerSkillIds, monsterSkillIds]);

  const validateBeforeBattle = useCallback((): { playerLoadout: string[]; enemyLoadout: string[] } | null => {
    if (!playerConfig.name || !monsterConfig.name) {
      message.warning('Enter both unit names');
      return null;
    }
    if (skillList.length === 0) {
      message.warning('Import and apply skills before battle');
      return null;
    }

    const { playerLoadout, enemyLoadout } = resolveLoadouts();
    if (playerLoadout.length === 0 || enemyLoadout.length === 0) {
      message.warning('Select at least one skill for player and enemy');
      return null;
    }

    if (playerLoadout.length !== playerSkillIds.length) {
      setPlayerSkillIds(playerLoadout);
    }
    if (enemyLoadout.length !== monsterSkillIds.length) {
      setMonsterSkillIds(enemyLoadout);
    }

    return { playerLoadout, enemyLoadout };
  }, [
    playerConfig.name,
    monsterConfig.name,
    skillList.length,
    resolveLoadouts,
    playerSkillIds.length,
    monsterSkillIds.length,
  ]);

  const handleStartBattle = useCallback(() => {
    const loadouts = validateBeforeBattle();
    if (!loadouts) return;
    setArenaConfig(buildArenaConfig(loadouts.playerLoadout, loadouts.enemyLoadout));
    setWizardStep(3);
  }, [validateBeforeBattle, buildArenaConfig]);

  const handleRunBatchSimulation = useCallback(
    (runs: number): BatchMapBattleSummary | null => {
      const loadouts = validateBeforeBattle();
      if (!loadouts) return null;
      const config = buildArenaConfig(loadouts.playerLoadout, loadouts.enemyLoadout);
      return runArenaBatchSimulation(config, runs);
    },
    [validateBeforeBattle, buildArenaConfig],
  );

  const handleReset = useCallback(() => {
    setArenaConfig(null);
    setWizardStep(2);
  }, []);

  const updatePlayerStat = useCallback((field: string, value: number | string | null) => {
    setPlayerConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateMonsterStat = useCallback((field: string, value: number | string | null) => {
    setMonsterConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleOpenLogin = useCallback(() => {
    setLoginOpen(true);
  }, []);

  return (
    <BattleDesignShell
      step={wizardStep}
      onStepChange={setWizardStep}
      canEnterStep2={skillList.length > 0}
      canEnterStep3={arenaConfig !== null}
      onOpenLogin={handleOpenLogin}
    >
      {wizardStep === 1 ? (
        <ConfigureSkillStep
          skills={skillList}
          skillSheetLabel={skillSheetLabel}
          isAuthenticated={isAuthenticated}
          onSkillsApplied={handleSkillsFromLocalTable}
          onUseDefaultSheet={handleUseDefaultSheet}
          onOpenLogin={handleOpenLogin}
          onContinue={() => {
            if (skillList.length === 0) {
              message.warning('Import skills before continuing');
              return;
            }
            setWizardStep(2);
          }}
        />
      ) : null}

      {wizardStep === 2 ? (
        <ConfigurePlayerStep
          skillList={skillList}
          skillSheetLabel={skillSheetLabel}
          playerConfig={playerConfig}
          monsterConfig={monsterConfig}
          monsterInitialElement={monsterInitialElement}
          playerSkillIds={playerSkillIds}
          monsterSkillIds={monsterSkillIds}
          onSkillsApplied={handleSkillsFromLocalTable}
          onUpdatePlayer={updatePlayerStat}
          onUpdateMonster={updateMonsterStat}
          onSetMonsterElement={setMonsterInitialElement}
          onTogglePlayerSkill={(id) =>
            setPlayerSkillIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
          onToggleMonsterSkill={(id) =>
            setMonsterSkillIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
          onRemovePlayerSkill={(id) =>
            setPlayerSkillIds((prev) => prev.filter((x) => x !== id))
          }
          onRemoveMonsterSkill={(id) =>
            setMonsterSkillIds((prev) => prev.filter((x) => x !== id))
          }
          onApplyPlayerConfig={setPlayerConfig}
          onApplyMonsterConfig={setMonsterConfig}
          onStartBattle={handleStartBattle}
          onRunBatchSimulation={handleRunBatchSimulation}
        />
      ) : null}

      {wizardStep === 3 && arenaConfig ? (
        <StartBattleStep arenaConfig={arenaConfig} onStop={handleReset} />
      ) : null}

      <KecoLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSignedIn={() => setLoginOpen(false)}
      />
    </BattleDesignShell>
  );
}
