'use client';

import type { Skill } from '../../types';
import { skillSpecialLabel } from './skillLibraryFilters';
import styles from './SkillCard.module.css';

type Props = {
  skill: Skill;
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
};

export function SkillCard({ skill, selected = false, selectable = false, onClick }: Props) {
  return (
    <article
      className={`${styles.card} ${selectable ? styles.cardSelectable : ''} ${selected ? styles.cardSelected : ''}`}
      onClick={selectable ? onClick : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className={styles.cardHead}>
        <span className={styles.name}>{skill.name}</span>
        <span className={styles.mp}>mp {skill.mpCost}</span>
      </div>
      <div className={styles.tags}>
        <span className={styles.tag}>power {skill.power}</span>
        <span className={styles.tag}>cd {skill.maxCooldown}</span>
      </div>
      <div className={styles.special}>{skillSpecialLabel(skill)}</div>
      <p className={styles.description}>{skill.description || 'No description'}</p>
    </article>
  );
}
