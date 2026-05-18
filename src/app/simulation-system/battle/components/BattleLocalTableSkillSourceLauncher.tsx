'use client';

import { useCallback, useState } from 'react';
import { Button } from 'antd';
import { SettingOutlined, TableOutlined } from '@ant-design/icons';
import type { Skill } from '../types';
import { BattleLocalTableSkillSourceModal } from './BattleLocalTableSkillSourceModal';
import styles from './BattleLocalTableSkillSourceLauncher.module.css';

type Props = {
  disabled?: boolean;
  activeSkillCount: number;
  onSkillsApplied: (skills: Skill[]) => void;
};

export function BattleLocalTableSkillSourceLauncher({
  disabled = false,
  activeSkillCount,
  onSkillsApplied,
}: Props) {
  const [open, setOpen] = useState(false);
  const [appliedCount, setAppliedCount] = useState(activeSkillCount);

  const handleApplied = useCallback(
    (skills: Skill[]) => {
      onSkillsApplied(skills);
      setAppliedCount(skills.length);
    },
    [onSkillsApplied],
  );

  const displayCount = Math.max(appliedCount, activeSkillCount);

  return (
    <>
      <div className={styles.triggerCard}>
        <div className={styles.triggerHeader}>
          <TableOutlined className={styles.triggerIcon} />
          <span className={styles.triggerTitle}>Skills</span>
        </div>
        <p className={styles.triggerMeta}>
          {displayCount > 0
            ? `${displayCount} skill(s) configured for battle`
            : 'Import from Keco Studio or local tables'}
        </p>
        <Button
          type="default"
          block
          disabled={disabled}
          icon={<SettingOutlined />}
          className={styles.openBtn}
          onClick={() => setOpen(true)}
        >
          Configure skills…
        </Button>
      </div>

      <BattleLocalTableSkillSourceModal
        open={open}
        onClose={() => setOpen(false)}
        disabled={disabled}
        onSkillsApplied={handleApplied}
      />
    </>
  );
}
