'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'antd';
import type { Skill } from '../types';
import {
  BattleLocalTableSkillSourcePanel,
  type BattleLocalTableSkillSourcePanelHandle,
} from './BattleLocalTableSkillSourcePanel';
import styles from './BattleLocalTableSkillSourceModal.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  onSkillsApplied: (skills: Skill[]) => void;
};

export function BattleLocalTableSkillSourceModal({
  open,
  onClose,
  disabled = false,
  onSkillsApplied,
}: Props) {
  const panelRef = useRef<BattleLocalTableSkillSourcePanelHandle>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [applying, setApplying] = useState(false);

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      const result = await panelRef.current?.runValidate(false);
      if (result?.ok) onClose();
    } finally {
      setApplying(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="battle-skills-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="battle-skills-modal-title" className={styles.title}>
            SKILLS
          </h2>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <BattleLocalTableSkillSourcePanel
            ref={panelRef}
            layout="modal"
            modalOpen={open}
            disabled={disabled}
            onSkillsApplied={onSkillsApplied}
            onDraftsChange={setDraftCount}
          />
        </div>
        <div className={styles.footer}>
          <Button
            type="link"
            size="small"
            className={styles.footerLink}
            disabled={disabled}
            onClick={() => void panelRef.current?.refreshTables()}
          >
            Refresh tables
          </Button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.applyBtn}
            disabled={disabled || draftCount === 0 || applying}
            onClick={handleApply}
          >
            {applying ? 'Applying…' : 'Validate & apply'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
