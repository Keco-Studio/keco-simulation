'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    const el = logBodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logLines.length]);

  return (
    <div className={styles.root}>
      <div className={styles.body}>
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

        <div className={styles.arenaWrap}>
          <BattleArena
            config={arenaConfig}
            presentation="design"
            hideInternalLog
            onLogLinesChange={handleLogLinesChange}
            onBattleStateChange={handleBattleStateChange}
            onStop={onStop}
          />
        </div>
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusCol}>
          <div className={styles.statusHead}>
            <span className={styles.statusName}>{arenaConfig.playerName}</span>
            <span className={styles.slotLabel}>1/8</span>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span className={styles.barLabel}>HP</span>
              <span className={styles.barValue}>
                {Math.round(battleUi.playerHp)}/{Math.round(battleUi.playerMaxHp)}
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillHp}
                style={{ width: `${pct(battleUi.playerHp, battleUi.playerMaxHp)}%` }}
              />
            </div>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span className={styles.barLabel}>MP</span>
              <span className={styles.barValue}>
                {Math.round(battleUi.playerMp)}/{Math.round(battleUi.playerMaxMp)}
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillMp}
                style={{ width: `${pct(battleUi.playerMp, battleUi.playerMaxMp)}%` }}
              />
            </div>
          </div>
        </div>

        <div className={styles.statusCol}>
          <div className={styles.statusHead}>
            <span className={styles.statusName}>{arenaConfig.enemyName}</span>
            <span className={styles.slotLabel}>1/8</span>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span className={styles.barLabel}>HP</span>
              <span className={styles.barValue}>
                {Math.round(battleUi.enemyHp)}/{Math.round(battleUi.enemyMaxHp)}
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillHp}
                style={{ width: `${pct(battleUi.enemyHp, battleUi.enemyMaxHp)}%` }}
              />
            </div>
          </div>
          <div className={styles.barRow}>
            <div className={styles.barHeader}>
              <span className={styles.barLabel}>MP</span>
              <span className={styles.barValue}>
                {Math.round(battleUi.enemyMp)}/{Math.round(battleUi.enemyMaxMp)}
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFillMp}
                style={{ width: `${pct(battleUi.enemyMp, battleUi.enemyMaxMp)}%` }}
              />
            </div>
          </div>
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
    </div>
  );
}
