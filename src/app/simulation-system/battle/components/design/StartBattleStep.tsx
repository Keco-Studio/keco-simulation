'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { BattleSession } from '@keco/battle-core';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import {
  applyCloudBattleKillExp,
  isCloudKillExpEligible,
} from '../../lib/progression/cloudBattleProgression';
import { readCloudProgressionStudioBinding } from '@/app/simulation-system/progression/lib/progressionStudioBindingStorage';
import { importStudioProgressionBundle } from '@/lib/characterProgression/studio/importStudioProgressionBundle';
import { loadUserProgression } from '@/lib/characterProgression/supabaseProgressionStorage';
import {
  BattleArena,
  type BattleArenaConfig,
  type BattleArenaUiState,
} from '../BattleArena/BattleArena';
import styles from './StartBattleStep.module.css';

type Props = {
  arenaConfig: BattleArenaConfig;
  onStop: () => void;
};

function pct(current: number, max: number) {
  return max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
}

function FighterBars({
  name,
  hp,
  maxHp,
  mp,
  maxMp,
  variant,
}: {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  variant: 'player' | 'enemy';
}) {
  return (
    <div className={`${styles.fighter} ${variant === 'player' ? styles.fighterPlayer : styles.fighterEnemy}`}>
      <div className={styles.fighterHead}>
        <span className={styles.fighterName}>{name}</span>
      </div>
      <div className={styles.barRow}>
        <span className={styles.barLabel}>HP</span>
        <div className={styles.barTrack}>
          <div className={styles.barFillHp} style={{ width: `${pct(hp, maxHp)}%` }} />
        </div>
        <span className={styles.barValue}>
          {Math.round(hp)}/{Math.round(maxHp)}
        </span>
      </div>
      <div className={styles.barRow}>
        <span className={styles.barLabel}>MP</span>
        <div className={styles.barTrack}>
          <div
            className={styles.barFillMp}
            style={{ width: `${pct(Math.max(0, mp), maxMp)}%` }}
          />
        </div>
        <span className={styles.barValue}>
          {Math.max(0, Math.round(mp))}/{Math.round(maxMp)}
        </span>
      </div>
    </div>
  );
}

export function StartBattleStep({ arenaConfig, onStop }: Props) {
  const logBodyRef = useRef<HTMLDivElement>(null);
  const cloudKillAppliedRef = useRef(false);
  const supabase = useSupabase();
  const { userProfile } = useAuth();
  const [logLines, setLogLines] = useState<string[]>([]);
  const [battleUi, setBattleUi] = useState<BattleArenaUiState>(() => ({
    tick: 0,
    phase: 'preparation',
    playerHp: arenaConfig.playerHp,
    playerMaxHp: arenaConfig.playerStats.maxHp,
    playerMp: arenaConfig.playerMp,
    playerMaxMp: arenaConfig.playerMaxMp,
    enemyHp: arenaConfig.enemyHp,
    enemyMaxHp: arenaConfig.enemyStats.maxHp,
    enemyMp: arenaConfig.enemyMp,
    enemyMaxMp: arenaConfig.enemyMaxMp,
  }));

  const handleLogLinesChange = useCallback((lines: string[]) => {
    setLogLines(lines);
  }, []);

  const handleBattleStateChange = useCallback((state: BattleArenaUiState) => {
    setBattleUi(state);
  }, []);

  const applyCloudKillExp = useCallback(
    async (session: BattleSession) => {
      if (cloudKillAppliedRef.current) return;
      if (!isCloudKillExpEligible(session)) return;
      if (!supabase || !userProfile?.id) {
        message.warning('Sign in to persist progression');
        return;
      }
      const binding = readCloudProgressionStudioBinding();
      if (!binding) {
        message.warning('Import Studio libraries in step 2 first');
        return;
      }
      cloudKillAppliedRef.current = true;
      try {
        const [prog, bundle] = await Promise.all([
          loadUserProgression(supabase, userProfile.id),
          importStudioProgressionBundle(supabase, {
            projectId: binding.projectId ?? '',
            charactersLibraryId: binding.charactersLibraryId!,
            skillsLibraryId: binding.skillsLibraryId!,
            charLevelCurveLibraryId: binding.charLevelCurveLibraryId!,
            skillLevelCurveLibraryId: binding.skillLevelCurveLibraryId!,
          }),
        ]);
        if (!prog) return;
        const result = await applyCloudBattleKillExp(session, {
          supabase,
          userId: userProfile.id,
          playerLevel: prog.level,
          charLevelCurve: bundle.charLevelCurve,
        });
        if (!result) return;
        if (result.leveledUp) {
          message.success(`Level up! You gained ${result.spGranted} skill points`);
        } else if (result.expGained > 0) {
          message.info(`+${result.expGained} EXP`);
        }
      } catch (err) {
        cloudKillAppliedRef.current = false;
        message.error(err instanceof Error ? err.message : 'Failed to save cloud EXP');
      }
    },
    [supabase, userProfile?.id],
  );

  const handleSessionChange = useCallback(
    (session: BattleSession) => {
      void applyCloudKillExp(session);
    },
    [applyCloudKillExp],
  );

  const handleBattleReset = useCallback(() => {
    cloudKillAppliedRef.current = false;
  }, []);

  useEffect(() => {
    const el = logBodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logLines.length]);

  return (
    <div className={styles.root}>
      <aside className={styles.logPanel}>
        <div className={styles.logTitle}>Battle logs</div>
        <div ref={logBodyRef} className={styles.logBody}>
          {logLines.length === 0 ? (
            <div className={styles.logLine}>Waiting for battle events…</div>
          ) : (
            logLines.map((line, i) => (
              <div key={i} className={styles.logLine}>
                {line}
              </div>
            ))
          )}
        </div>
        <div className={styles.progressionDisabled}>
          Kill EXP saves to your account on victory. Upgrade skills in step 2.
        </div>
      </aside>

      <section className={styles.rightCol}>
        <div className={styles.arenaStage}>
          <div className={styles.arenaFrame}>
            <BattleArena
              config={arenaConfig}
              presentation="design"
              hideInternalLog
              onLogLinesChange={handleLogLinesChange}
              onBattleStateChange={handleBattleStateChange}
              onSessionChange={handleSessionChange}
              onBattleReset={handleBattleReset}
              onStop={onStop}
            />
          </div>
        </div>

        <div className={styles.statusBar}>
          <div className={styles.statusMain}>
            <FighterBars
              variant="player"
              name={arenaConfig.playerName}
              hp={battleUi.playerHp}
              maxHp={battleUi.playerMaxHp}
              mp={battleUi.playerMp}
              maxMp={battleUi.playerMaxMp}
            />
            <FighterBars
              variant="enemy"
              name={arenaConfig.enemyName}
              hp={battleUi.enemyHp}
              maxHp={battleUi.enemyMaxHp}
              mp={battleUi.enemyMp}
              maxMp={battleUi.enemyMaxMp}
            />
          </div>
          <div className={styles.statusActions}>
            <span className={styles.tickLabel}>
              T{battleUi.tick} · {battleUi.phase}
            </span>
            <button type="button" className={styles.stopBtn} onClick={onStop}>
              Stop battle
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
