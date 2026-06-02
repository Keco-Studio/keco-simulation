'use client';

import { useMemo, useState } from 'react';
import { InputNumber } from 'antd';
import { SettingOutlined, TableOutlined, UserOutlined } from '@ant-design/icons';
import type { Element, Skill } from '../../types';
import { ELEMENT_CONFIG } from '../../types';
import { filterSkillsByTab, inferSkillTabElement } from '../../data/skills';
import { BattleLocalTableSkillSourceModal } from '../BattleLocalTableSkillSourceModal';
import { ElementGlyph } from '../ElementGlyph';
import { SkillCard } from './SkillCard';
import styles from './ConfigurePlayerStep.module.css';

type PlayerConfig = {
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mp: number;
};

type Props = {
  skillList: Skill[];
  skillSheetLabel: string;
  playerConfig: PlayerConfig;
  monsterConfig: PlayerConfig;
  monsterInitialElement: Element | null;
  playerSkillIds: string[];
  monsterSkillIds: string[];
  onSkillsApplied: (skills: Skill[]) => void;
  onUpdatePlayer: (field: string, value: number | string | null) => void;
  onUpdateMonster: (field: string, value: number | string | null) => void;
  onSetMonsterElement: (element: Element | null) => void;
  onTogglePlayerSkill: (skillId: string) => void;
  onToggleMonsterSkill: (skillId: string) => void;
  onRemovePlayerSkill: (skillId: string) => void;
  onRemoveMonsterSkill: (skillId: string) => void;
  onStartBattle: () => void;
};

const ELEMENTS: Element[] = ['fire', 'water', 'thunder', 'grass', 'ice'];

export function ConfigurePlayerStep({
  skillList,
  skillSheetLabel,
  playerConfig,
  monsterConfig,
  monsterInitialElement,
  playerSkillIds,
  monsterSkillIds,
  onSkillsApplied,
  onUpdatePlayer,
  onUpdateMonster,
  onSetMonsterElement,
  onTogglePlayerSkill,
  onToggleMonsterSkill,
  onRemovePlayerSkill,
  onRemoveMonsterSkill,
  onStartBattle,
}: Props) {
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [loadoutTarget, setLoadoutTarget] = useState<'player' | 'monster'>('player');
  const [configureOpen, setConfigureOpen] = useState(false);

  const displayedSkills = useMemo(() => {
    if (selectedElement === 'all') return skillList;
    return filterSkillsByTab(skillList, selectedElement);
  }, [skillList, selectedElement]);

  const activeLoadoutIds = loadoutTarget === 'player' ? playerSkillIds : monsterSkillIds;
  const loadoutFull = activeLoadoutIds.length >= 6;

  const selectedChips = useMemo(() => {
    const ids = new Set([...playerSkillIds, ...monsterSkillIds]);
    return skillList.filter((s) => ids.has(s.id));
  }, [playerSkillIds, monsterSkillIds, skillList]);

  const handleSkillClick = (skillId: string) => {
    if (loadoutTarget === 'player') {
      if (playerSkillIds.includes(skillId)) onRemovePlayerSkill(skillId);
      else if (playerSkillIds.length < 6) onTogglePlayerSkill(skillId);
    } else if (monsterSkillIds.includes(skillId)) onRemoveMonsterSkill(skillId);
    else if (monsterSkillIds.length < 6) onToggleMonsterSkill(skillId);
  };

  return (
    <div className={styles.root}>
      <div className={styles.contentRow}>
        <aside className={styles.sidebar}>
        <div className={styles.skillsCard}>
          <div className={styles.skillsCardTitle}>
            <TableOutlined />
            Skills ({skillSheetLabel})
          </div>
          <p className={styles.skillsMeta}>{skillList.length} skill(s) configured for battle</p>
          <button type="button" className={styles.configureBtn} onClick={() => setConfigureOpen(true)}>
            <SettingOutlined /> Configure skills
          </button>
        </div>

        <div className={styles.configCard}>
          <div className={styles.cardTitle}>
            <UserOutlined /> Player
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statFull}>
              <span className={styles.label}>Name</span>
              <input
                className={styles.nameInput}
                value={playerConfig.name}
                onChange={(e) => onUpdatePlayer('name', e.target.value)}
                maxLength={20}
              />
            </div>
            {(['hp', 'atk', 'def', 'spd', 'mp'] as const).map((field) => (
              <div key={field}>
                <span className={styles.label}>{field.toUpperCase()}</span>
                <InputNumber
                  className={styles.statInput}
                  min={field === 'def' ? 0 : 1}
                  max={field === 'hp' ? 99999 : field === 'mp' ? 999 : 9999}
                  value={playerConfig[field]}
                  onChange={(v) => onUpdatePlayer(field, v)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.configCard}>
          <div className={styles.cardTitle}>Enemy</div>
          <div className={styles.statsGrid}>
            <div className={styles.statFull}>
              <span className={styles.label}>Name</span>
              <input
                className={styles.nameInput}
                value={monsterConfig.name}
                onChange={(e) => onUpdateMonster('name', e.target.value)}
                maxLength={20}
              />
            </div>
            {(['hp', 'atk', 'def', 'spd', 'mp'] as const).map((field) => (
              <div key={field}>
                <span className={styles.label}>{field.toUpperCase()}</span>
                <InputNumber
                  className={styles.statInput}
                  min={field === 'def' ? 0 : 1}
                  max={field === 'hp' ? 99999 : field === 'mp' ? 999 : 9999}
                  value={monsterConfig[field]}
                  onChange={(v) => onUpdateMonster(field, v)}
                />
              </div>
            ))}
          </div>
          <div className={styles.elementSection}>
            <div className={styles.elementTitle}>Enemy starting category</div>
            <div className={styles.elementGrid}>
              <button
                type="button"
                className={`${styles.elementBtn} ${monsterInitialElement === null ? styles.elementBtnActive : ''}`}
                onClick={() => onSetMonsterElement(null)}
              >
                None
              </button>
              {ELEMENTS.map((elem) => (
                <button
                  key={elem}
                  type="button"
                  className={`${styles.elementBtn} ${monsterInitialElement === elem ? styles.elementBtnActive : ''}`}
                  onClick={() => onSetMonsterElement(elem)}
                  style={
                    monsterInitialElement === elem
                      ? { color: ELEMENT_CONFIG[elem].color }
                      : undefined
                  }
                >
                  {ELEMENT_CONFIG[elem].emoji} {ELEMENT_CONFIG[elem].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className={styles.main}>
        <h2 className={styles.mainTitle}>select skills, then start battle.</h2>

        <div className={styles.loadoutRow}>
          <button
            type="button"
            className={`${styles.loadoutTab} ${loadoutTarget === 'player' ? styles.loadoutTabActive : ''}`}
            onClick={() => setLoadoutTarget('player')}
          >
            Player {playerSkillIds.length}/6
          </button>
          <button
            type="button"
            className={`${styles.loadoutTab} ${loadoutTarget === 'monster' ? styles.loadoutTabActive : ''}`}
            onClick={() => setLoadoutTarget('monster')}
          >
            Enemy {monsterSkillIds.length}/6
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${selectedElement === 'all' ? styles.tabActive : ''}`}
            onClick={() => setSelectedElement('all')}
          >
            All
          </button>
          {ELEMENTS.map((elem) => (
            <button
              key={elem}
              type="button"
              className={`${styles.tab} ${selectedElement === elem ? styles.tabActive : ''}`}
              onClick={() => setSelectedElement(elem)}
            >
              <ElementGlyph element={elem} size={12} /> {ELEMENT_CONFIG[elem].name}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {displayedSkills.map((skill) => {
            const inPlayer = playerSkillIds.includes(skill.id);
            const inMonster = monsterSkillIds.includes(skill.id);
            const selected = inPlayer || inMonster;
            return (
              <SkillCard
                key={skill.id}
                skill={skill}
                selectable={!loadoutFull || selected}
                selected={selected}
                onClick={() => handleSkillClick(skill.id)}
              />
            );
          })}
        </div>
      </section>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.chips}>
          {selectedChips.map((skill) => (
            <span key={skill.id} className={styles.chip}>
              {skill.name}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${skill.name}`}
                onClick={() => {
                  if (playerSkillIds.includes(skill.id)) onRemovePlayerSkill(skill.id);
                  if (monsterSkillIds.includes(skill.id)) onRemoveMonsterSkill(skill.id);
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          className={styles.startBtn}
          disabled={playerSkillIds.length === 0 || monsterSkillIds.length === 0}
          onClick={onStartBattle}
        >
          Start battle
        </button>
      </div>

      <BattleLocalTableSkillSourceModal
        open={configureOpen}
        onClose={() => setConfigureOpen(false)}
        onSkillsApplied={(skills) => {
          onSkillsApplied(skills);
          setConfigureOpen(false);
        }}
      />
    </div>
  );
}