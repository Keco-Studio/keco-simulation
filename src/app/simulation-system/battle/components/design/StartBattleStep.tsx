'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { BattleSession } from '@keco/battle-core';
import {
  BattleArena,
  type BattleArenaConfig,
  type BattleArenaUiState,
} from '../BattleArena/BattleArena';
import { importBattleSessionToProgression } from '../../lib/progression/importBattleToProgression';
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

  const handleImportProgression = useCallback((session: BattleSession) => {
    const rec = importBattleSessionToProgression(session);
    message.success(
      `已导入本场战斗的成长贡献（${rec.contributions.length} 条事件，对手：${rec.enemyName}）`
    );
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
              onImportProgression={handleImportProgression}
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
