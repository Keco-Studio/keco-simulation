'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudOutlined, PlusOutlined, ThunderboltOutlined, BookOutlined } from '@ant-design/icons';
import type { Skill } from '../../types';
import { BattleLocalTableSkillSourceModal } from '../BattleLocalTableSkillSourceModal';
import {
  DESIGN_LIBRARY_NAMES,
  SKILL_LIBRARY_TABS,
  type SkillLibraryTab,
} from './battleDesignConstants';
import { filterSkillsByLibraryTab } from './skillLibraryFilters';
import { SkillCard } from './SkillCard';
import styles from './ConfigureSkillStep.module.css';

type Props = {
  view: 'onboarding' | 'library';
  skills: Skill[];
  onSkillsApplied: (skills: Skill[]) => void;
  onUseDefaultSheet: () => void;
  onSyncStudio: () => void;
  onContinue: () => void;
};

export function ConfigureSkillStep({
  view,
  skills,
  onSkillsApplied,
  onUseDefaultSheet,
  onSyncStudio,
  onContinue,
}: Props) {
  const router = useRouter();
  const [selectedLibrary, setSelectedLibrary] = useState<string>('seedcrop');
  const [activeTab, setActiveTab] = useState<SkillLibraryTab>('all');
  const [configureOpen, setConfigureOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  const filteredSkills = useMemo(
    () => filterSkillsByLibraryTab(skills, activeTab),
    [skills, activeTab],
  );

  if (view === 'onboarding') {
    return (
      <div className={styles.root}>
        <div className={styles.onboarding}>
          <div className={styles.onboardingIcon}>
            <ThunderboltOutlined />
          </div>
          <h1 className={styles.onboardingTitle}>welcome to keco simulator!</h1>
          <p className={styles.onboardingDesc}>
            there is no any available skill here, you can create a new skill sheet.
          </p>
          <div className={styles.onboardingActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => router.push('/simulation-system/battle/local-tables')}
            >
              <PlusOutlined /> Create local sheet
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={onSyncStudio}>
              <CloudOutlined /> Sync by keco studio
            </button>
          </div>
          <button type="button" className={styles.linkBtn} onClick={onUseDefaultSheet}>
            use the default skill sheet instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <span>Libraries</span>
            <button type="button" className={styles.addLibBtn} aria-label="Add library">
              +
            </button>
          </div>
          <div className={styles.libraryList}>
            {DESIGN_LIBRARY_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                className={`${styles.libraryItem} ${selectedLibrary === name ? styles.libraryItemActive : ''}`}
                onClick={() => setSelectedLibrary(name)}
              >
                <BookOutlined />
                {name}
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.main}>
          <div className={styles.mainHead}>
            <h2 className={styles.mainTitle}>{selectedLibrary} skill library</h2>
            <button
              type="button"
              className={styles.addSkillBtn}
              aria-label="Configure skills"
              onClick={() => setConfigureOpen(true)}
            >
              +
            </button>
          </div>

          <div className={styles.tabs} role="tablist">
            {SKILL_LIBRARY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {filteredSkills.length === 0 ? (
              <div className={styles.emptyGrid}>
                No skills in this tab. Open Configure skills to bind from tables.
              </div>
            ) : (
              filteredSkills.map((skill) => <SkillCard key={skill.id} skill={skill} />)
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.validateBtn}
          disabled={validating || skills.length === 0}
          onClick={() => {
            setValidating(true);
            onContinue();
            setValidating(false);
          }}
        >
          Validate &amp; Apply
        </button>
      </div>

      <BattleLocalTableSkillSourceModal
        open={configureOpen}
        onClose={() => setConfigureOpen(false)}
        onSkillsApplied={(next) => {
          onSkillsApplied(next);
          setConfigureOpen(false);
        }}
      />
    </div>
  );
}
