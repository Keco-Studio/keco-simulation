'use client';

import styles from './BattleResultOverlay.module.css';

export type BattleResultOutcome = 'win' | 'lose' | 'fled';

export type BattleResultOverlayProps = {
  open: boolean;
  outcome: BattleResultOutcome | null;
  enemyName: string;
  onContinue: () => void;
  onBattleAgain: () => void;
};

export function BattleResultOverlay({
  open,
  outcome,
  enemyName,
  onContinue,
  onBattleAgain,
}: BattleResultOverlayProps) {
  if (!open || !outcome) return null;

  const isWin = outcome === 'win';
  const isFled = outcome === 'fled';
  const title = isFled ? 'ESCAPED' : isWin ? 'VICTORY!' : 'DEFEAT';
  const titleClass = isFled ? styles.titleFled : isWin ? styles.titleWin : styles.titleLose;
  const backdropClass = isWin ? styles.backdropWin : styles.backdropLose;

  const enemyLabel = enemyName.toUpperCase();

  return (
    <div className={styles.root} role="dialog" aria-modal aria-labelledby="battle-result-title">
      <div className={backdropClass} aria-hidden />

      {isWin ? (
        <div className={styles.confettiLayer} aria-hidden>
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              className={styles.confetti}
              style={{
                left: `${(i * 13 + (i % 5) * 7) % 100}%`,
                animationDelay: `${(i % 10) * 0.08}s`,
                animationDuration: `${2 + (i % 5) * 0.2}s`,
                backgroundColor: `hsl(${(i * 37) % 360} 80% 58%)`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className={styles.panel}>
        <h2 id="battle-result-title" className={`${styles.title} ${titleClass}`}>
          {title}
        </h2>

        <p className={styles.subtitle}>
          {isFled ? (
            <>Left the battle.</>
          ) : isWin ? (
            <>
              You defeated <span className={styles.subtitleHighlight}>{enemyLabel}</span>
            </>
          ) : (
            <>
              You were defeated by <span className={styles.subtitleHighlight}>{enemyLabel}</span>
            </>
          )}
        </p>

        {!isWin && !isFled ? (
          <p className={styles.hint}>Adjust setup on the left and try again.</p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.arcadeBtn} ${isWin ? styles.btnPrimary : styles.btnDanger}`}
            onClick={onContinue}
          >
            CONTINUE
          </button>
          <button
            type="button"
            className={`${styles.arcadeBtn} ${isWin ? styles.btnSecondary : styles.btnSecondaryDark}`}
            onClick={onBattleAgain}
          >
            BATTLE AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}
