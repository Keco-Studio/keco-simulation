'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { HomeOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import type { WizardStep } from './battleDesignConstants';
import styles from './BattleDesignShell.module.css';

type Props = {
  step: WizardStep;
  onStepChange: (step: WizardStep) => void;
  canEnterStep2: boolean;
  canEnterStep3: boolean;
  onOpenLogin: () => void;
  children: React.ReactNode;
};

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Configure skill' },
  { id: 2, label: 'Configure player' },
  { id: 3, label: 'Start battle' },
];

export function BattleDesignShell({
  step,
  onStepChange,
  canEnterStep2,
  canEnterStep3,
  onOpenLogin,
  children,
}: Props) {
  const { isAuthenticated, isLoading, userProfile, signOut } = useAuth();

  const accountLabel = useMemo(() => {
    if (!isAuthenticated) return null;
    return (
      userProfile?.email?.trim() ||
      userProfile?.username?.trim() ||
      userProfile?.full_name?.trim() ||
      null
    );
  }, [isAuthenticated, userProfile]);

  const canGoTo = (target: WizardStep) => {
    if (target === 1) return true;
    if (target === 2) return canEnterStep2;
    if (target === 3) return canEnterStep3;
    return false;
  };

  const handleAccountClick = () => {
    if (isLoading) return;
    if (isAuthenticated) return;
    onOpenLogin();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>Battle simulator</div>

        <nav className={styles.stepper} aria-label="Battle setup steps">
          {STEPS.map((s, index) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.step} ${step === s.id ? styles.stepActive : ''}`}
              disabled={!canGoTo(s.id)}
              onClick={() => canGoTo(s.id) && onStepChange(s.id)}
            >
              {index + 1} {s.label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link href="/simulation-system/battle/skills" className={styles.skillSheetBtn}>
            <ThunderboltOutlined />
            Skill sheet
          </Link>
          <Link href="/simulation-system" className={styles.iconBtn} aria-label="Home">
            <HomeOutlined />
          </Link>

          {isAuthenticated ? (
            <div className={styles.accountChip}>
              <span className={styles.accountAvatar}>
                <UserOutlined />
              </span>
              <span className={styles.accountEmail} title={accountLabel ?? 'Signed in'}>
                {accountLabel ?? (isLoading ? 'Loading…' : 'Signed in')}
              </span>
              <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Sign in"
              onClick={handleAccountClick}
              disabled={isLoading}
            >
              <UserOutlined />
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
