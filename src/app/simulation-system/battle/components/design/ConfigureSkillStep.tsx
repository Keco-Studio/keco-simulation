'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CloudOutlined,
  ImportOutlined,
  PlusOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { Element, Skill } from '../../types';
import { ELEMENT_CONFIG } from '../../types';
import { filterSkillsByTab } from '../../data/skills';
import { BattleLocalTableSkillSourceModal } from '../BattleLocalTableSkillSourceModal';
import { ElementGlyph } from '../ElementGlyph';
import { SkillCard } from './SkillCard';
import styles from './ConfigureSkillStep.module.css';

type Props = {
  skills: Skill[];
  skillSheetLabel: string;
  isAuthenticated: boolean;
  onSkillsApplied: (skills: Skill[]) => void;
  onUseDefaultSheet: () => void;
  onOpenLogin: () => void;
  onContinue: () => void;
};

const ELEMENTS: Element[] = ['fire', 'water', 'thunder', 'grass', 'ice'];

export function ConfigureSkillStep({
  skills,
  skillSheetLabel,
  isAuthenticated,
  onSkillsApplied,
  onUseDefaultSheet,
  onOpenLogin,
  onContinue,
}: Props) {
  const router = useRouter();
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [configureOpen, setConfigureOpen] = useState(false);

  const filteredSkills = useMemo(() => {
    if (selectedElement === 'all') return skills;
    return filterSkillsByTab(skills, selectedElement);
  }, [skills, selectedElement]);

  const openImportModal = () => setConfigureOpen(true);

  if (skills.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.onboarding}>
          <div className={styles.onboardingIcon}>
            <ThunderboltOutlined />
          </div>
          <h1 className={styles.onboardingTitle}>Welcome to Keco simulator</h1>
          <p className={styles.onboardingDesc}>
            Import skills from a local table or Keco Studio library (import by id or bind attributes),
            then continue to configure players and start battle.
          </p>
          {!isAuthenticated ? (
            <p className={styles.onboardingHint}>
              Sign in with the same account as Keco Studio to list project libraries in the import
              dialog.
            </p>
          ) : null}
          <div className={styles.onboardingActions}>
            <button type="button" className={styles.primaryBtn} onClick={openImportModal}>
              <ImportOutlined /> Import skills
            </button>
            {!isAuthenticated ? (
              <button type="button" className={styles.secondaryBtn} onClick={onOpenLogin}>
                <CloudOutlined /> Sign in
              </button>
            ) : null}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => router.push('/simulation-system/battle/local-tables')}
            >
              <PlusOutlined /> Create local table
            </button>
          </div>
          <button type="button" className={styles.linkBtn} onClick={onUseDefaultSheet}>
            Use the default skill sheet instead
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

  return (
    <div className={styles.root}>
      <div className={styles.layoutSingle}>
        <section className={styles.main}>
          <div className={styles.mainHead}>
            <div>
              <h2 className={styles.mainTitle}>{skillSheetLabel}</h2>
              <p className={styles.mainSubtitle}>{skills.length} skill(s) ready for battle</p>
            </div>
            <button
              type="button"
              className={styles.configureBtn}
              onClick={openImportModal}
            >
              <SettingOutlined /> Configure skills
            </button>
          </div>

          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              className={`${styles.tab} ${selectedElement === 'all' ? styles.tabActive : ''}`}
              onClick={() => setSelectedElement('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              className={`${styles.tab} ${selectedElement === 'none' ? styles.tabActive : ''}`}
              onClick={() => setSelectedElement('none')}
            >
              <ThunderboltOutlined style={{ marginRight: 4 }} />
              Basic
            </button>
            {ELEMENTS.map((elem) => (
              <button
                key={elem}
                type="button"
                role="tab"
                className={`${styles.tab} ${selectedElement === elem ? styles.tabActive : ''}`}
                onClick={() => setSelectedElement(elem)}
              >
                <ElementGlyph element={elem} size={12} /> {ELEMENT_CONFIG[elem].name}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {filteredSkills.length === 0 ? (
              <div className={styles.emptyGrid}>
                No skills in this category. Use Configure skills to import from tables.
              </div>
            ) : (
              filteredSkills.map((skill) => <SkillCard key={skill.id} skill={skill} />)
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.validateBtn} onClick={onContinue}>
          Continue
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
