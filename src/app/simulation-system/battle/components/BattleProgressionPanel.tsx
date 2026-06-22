'use client';

import Link from 'next/link';
import type { ProgressionConfig, TrackState, ProficiencyParams } from '@/lib/progression/types';
import styles from './BattleProgressionPanel.module.css';

interface Props {
  config: ProgressionConfig;
  trackStates: Record<string, TrackState>;
  skillNames: Record<string, string>;
}

function tierLabelFor(st: TrackState, tiers: ProficiencyParams['tiers']): string {
  const tier = tiers[st.level - 1];
  return tier?.label ?? `Lv${st.level}`;
}

export function BattleProgressionPanel({ config, trackStates, skillNames }: Props) {
  const exp = trackStates['char_exp'];
  const profEntries = Object.entries(trackStates)
    .filter(([id, st]) => id.startsWith('prof_') && st.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  const profDef = config.tracks.find((t) => t.id === 'prof_{skillId}');
  const tiers =
    profDef?.kind === 'proficiency' ? (profDef.params as ProficiencyParams).tiers : [];

  const otherTracks = config.tracks
    .filter((t) => t.id !== 'char_exp' && !t.id.includes('{skillId}'))
    .map((t) => ({ def: t, st: trackStates[t.id] }))
    .filter((x) => x.st && x.st.total > 0);

  const hasAny =
    (exp && exp.total > 0) ||
    profEntries.length > 0 ||
    otherTracks.length > 0 ||
    Object.values(trackStates).some((s) => s.unlockedRewards.length > 0);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Battle progression</span>
        <Link
          href="/simulation-system/progression/simulate"
          className={styles.editLink}
          target="_blank"
        >
          Edit rules
        </Link>
      </div>

      {!hasAny ? (
        <p className={styles.empty}>
          Deal damage or cast skills during battle to accumulate rewards using progression simulator
          rules.
        </p>
      ) : (
        <ul className={styles.list}>
          {exp && exp.total > 0 ? (
            <li className={styles.item}>
              <span className={styles.itemLabel}>Character EXP</span>
              <span className={styles.itemValue}>
                {Math.round(exp.total)} <span className={styles.muted}>→ Lv{exp.level}</span>
              </span>
            </li>
          ) : null}

          {profEntries.map(([id, st]) => {
            const skillId = id.slice('prof_'.length);
            const name = skillNames[skillId] ?? skillId;
            return (
              <li key={id} className={styles.item}>
                <span className={styles.itemLabel}>{name}</span>
                <span className={styles.itemValue}>
                  {Math.round(st.total)}{' '}
                  <span className={styles.muted}>→ {tierLabelFor(st, tiers)}</span>
                </span>
              </li>
            );
          })}

          {otherTracks.map(({ def, st }) =>
            st ? (
              <li key={def.id} className={styles.item}>
                <span className={styles.itemLabel}>{def.label}</span>
                <span className={styles.itemValue}>{Math.round(st.total)}</span>
              </li>
            ) : null
          )}

          {Object.entries(trackStates).flatMap(([id, st]) => {
            const def = config.tracks.find((t) => t.id === id);
            return st.unlockedRewards.map((reward) => (
              <li key={`${id}-${reward}`} className={styles.itemUnlock}>
                Unlocked {def?.label ?? id}: {reward}
              </li>
            ));
          })}
        </ul>
      )}
    </div>
  );
}
