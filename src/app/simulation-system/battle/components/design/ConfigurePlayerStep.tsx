'use client';

import { useCallback, useMemo, useState } from 'react';
import { InputNumber, Select, message } from 'antd';
import {
  DeleteOutlined,
  ImportOutlined,
  LinkOutlined,
  SettingOutlined,
  TableOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  BATCH_MAP_BATTLE_LIMITS,
  type BatchMapBattleSummary,
} from '../../lib/batchArenaSimulation';
import type { Element, Skill } from '../../types';
import { ELEMENT_CONFIG } from '../../types';
import { filterSkillsByTab } from '../../data/skills';
import { BattleLocalTableSkillSourceModal } from '../BattleLocalTableSkillSourceModal';
import { BattleUnitImportModal } from '../BattleUnitImportModal';
import type { BattleUnitConfig } from '../../lib/localTableSkillSource/battleUnitSource';
import {
  type BattleUnitConfigSource,
  type BattleUnitImportBinding,
  formatImportHistoryLabel,
  type UnitImportResult,
} from '../../lib/battleUnitImportHistory';
import { ElementGlyph } from '../ElementGlyph';
import type { EffectiveBattleLoadout } from '@/lib/characterProgression/types';
import { BattleCloudProgressionPanel } from './BattleCloudProgressionPanel';
import { SkillCard } from './SkillCard';
import styles from './ConfigurePlayerStep.module.css';

type PlayerConfig = BattleUnitConfig;

type Props = {
  skillList: Skill[];
  skillSheetLabel: string;
  playerConfig: PlayerConfig;
  monsterConfig: PlayerConfig;
  playerConfigSource: BattleUnitConfigSource;
  monsterConfigSource: BattleUnitConfigSource;
  playerImportHistory: BattleUnitImportBinding[];
  monsterImportHistory: BattleUnitImportBinding[];
  monsterInitialElement: Element | null;
  playerSkillIds: string[];
  monsterSkillIds: string[];
  onSkillsApplied: (skills: Skill[]) => void;
  onUpdatePlayer: (field: string, value: number | string | null) => void;
  onUpdateMonster: (field: string, value: number | string | null) => void;
  onSelectPlayerConfigSource: (source: BattleUnitConfigSource) => void;
  onSelectMonsterConfigSource: (source: BattleUnitConfigSource) => void;
  onSetMonsterElement: (element: Element | null) => void;
  onTogglePlayerSkill: (skillId: string) => void;
  onToggleMonsterSkill: (skillId: string) => void;
  onRemovePlayerSkill: (skillId: string) => void;
  onRemoveMonsterSkill: (skillId: string) => void;
  onImportPlayer: (result: UnitImportResult) => void;
  onImportMonster: (result: UnitImportResult) => void;
  onDeletePlayerBinding: (bindingId: string) => void;
  onDeleteMonsterBinding: (bindingId: string) => void;
  onStartBattle: () => void;
  onRunBatchSimulation: (runs: number) => BatchMapBattleSummary | null;
  onCloudLoadoutApplied?: (loadout: EffectiveBattleLoadout) => void;
  cloudSkillLevels?: Record<string, number>;
  onCloudSkillLevelsChange?: (skillLevels: Record<string, number>) => void;
};

const ELEMENTS: Element[] = ['fire', 'water', 'thunder', 'grass', 'ice'];

function UnitConfigSourceSelect({
  configSource,
  importHistory,
  resolvedConfig,
  onSelect,
  onDeleteBinding,
}: {
  configSource: BattleUnitConfigSource;
  importHistory: BattleUnitImportBinding[];
  resolvedConfig: BattleUnitConfig;
  onSelect: (source: BattleUnitConfigSource) => void;
  onDeleteBinding: (bindingId: string) => void;
}) {
  const selectValue =
    configSource.kind === 'manual' ? 'manual' : configSource.bindingId;

  const options = useMemo(() => {
    const historyOptions = importHistory.map((binding) => ({
      value: binding.id,
      label: formatImportHistoryLabel(
        binding,
        configSource.kind === 'binding' && configSource.bindingId === binding.id
          ? resolvedConfig.name
          : undefined,
      ),
    }));
    return [{ value: 'manual', label: 'Manual (editable)' }, ...historyOptions];
  }, [importHistory, configSource, resolvedConfig.name]);

  return (
    <Select
      className={styles.sourceSelect}
      value={selectValue}
      options={options}
      optionRender={(option) => {
        if (option.value === 'manual') {
          return <span>{option.label}</span>;
        }
        return (
          <div className={styles.sourceOptionRow}>
            <span className={styles.sourceOptionLabel}>{option.label}</span>
            <button
              type="button"
              className={styles.sourceOptionDelete}
              aria-label={`Remove ${option.label}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteBinding(String(option.value));
              }}
            >
              <DeleteOutlined />
            </button>
          </div>
        );
      }}
      onChange={(value) => {
        if (value === 'manual') {
          onSelect({ kind: 'manual' });
          return;
        }
        onSelect({ kind: 'binding', bindingId: value });
      }}
      placeholder="Data source"
    />
  );
}

function UnitStatsPanel({
  title,
  titleIcon,
  config,
  configSource,
  importHistory,
  onUpdate,
  onSelectSource,
  onDeleteBinding,
  onImportClick,
  extra,
}: {
  title: string;
  titleIcon?: React.ReactNode;
  config: PlayerConfig;
  configSource: BattleUnitConfigSource;
  importHistory: BattleUnitImportBinding[];
  onUpdate: (field: string, value: number | string | null) => void;
  onSelectSource: (source: BattleUnitConfigSource) => void;
  onDeleteBinding: (bindingId: string) => void;
  onImportClick: () => void;
  extra?: React.ReactNode;
}) {
  const readOnly = configSource.kind === 'binding';

  return (
    <div className={styles.configCard}>
      <div className={styles.cardTitleRow}>
        <div className={styles.cardTitle}>
          {titleIcon}
          {title}
        </div>
        <button type="button" className={styles.importBtn} onClick={onImportClick}>
          <ImportOutlined /> Import
        </button>
      </div>

      <UnitConfigSourceSelect
        configSource={configSource}
        importHistory={importHistory}
        resolvedConfig={config}
        onSelect={onSelectSource}
        onDeleteBinding={onDeleteBinding}
      />

      {readOnly ? (
        <p className={styles.linkedHint}>
          <LinkOutlined /> Linked to table row — stats update when source data changes.
        </p>
      ) : null}

      <div className={`${styles.statsGrid} ${readOnly ? styles.statsGridReadOnly : ''}`}>
        <div className={styles.statFull}>
          <span className={styles.label}>Name</span>
          <input
            className={styles.nameInput}
            value={config.name}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => onUpdate('name', e.target.value)}
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
              value={config[field]}
              disabled={readOnly}
              onChange={(v) => onUpdate(field, v)}
            />
          </div>
        ))}
      </div>
      {extra}
    </div>
  );
}

export function ConfigurePlayerStep({
  skillList,
  skillSheetLabel,
  playerConfig,
  monsterConfig,
  playerConfigSource,
  monsterConfigSource,
  playerImportHistory,
  monsterImportHistory,
  monsterInitialElement,
  playerSkillIds,
  monsterSkillIds,
  onSkillsApplied,
  onUpdatePlayer,
  onUpdateMonster,
  onSelectPlayerConfigSource,
  onSelectMonsterConfigSource,
  onSetMonsterElement,
  onTogglePlayerSkill,
  onToggleMonsterSkill,
  onRemovePlayerSkill,
  onRemoveMonsterSkill,
  onImportPlayer,
  onImportMonster,
  onDeletePlayerBinding,
  onDeleteMonsterBinding,
  onStartBattle,
  onRunBatchSimulation,
  onCloudLoadoutApplied,
  cloudSkillLevels = {},
  onCloudSkillLevelsChange,
}: Props) {
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [batchRuns, setBatchRuns] = useState<number | null>(BATCH_MAP_BATTLE_LIMITS.defaultRuns);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchMapBattleSummary | null>(null);
  const [loadoutTarget, setLoadoutTarget] = useState<'player' | 'monster'>('player');
  const [configureOpen, setConfigureOpen] = useState(false);
  const [unitImportTarget, setUnitImportTarget] = useState<'player' | 'enemy' | null>(null);

  const displayedSkills = useMemo(() => {
    if (selectedElement === 'all') return skillList;
    return filterSkillsByTab(skillList, selectedElement);
  }, [skillList, selectedElement]);

  const activeLoadoutIds = loadoutTarget === 'player' ? playerSkillIds : monsterSkillIds;
  const loadoutFull = activeLoadoutIds.length >= 6;
  const activeLoadoutLabel = loadoutTarget === 'player' ? 'Player' : 'Enemy';

  const activeLoadoutChips = useMemo(() => {
    return skillList.filter((s) => activeLoadoutIds.includes(s.id));
  }, [skillList, activeLoadoutIds]);

  const handleRunBatch = useCallback(() => {
    if (playerSkillIds.length === 0 || monsterSkillIds.length === 0 || batchRuns == null) return;
    setBatchLoading(true);
    setBatchSummary(null);
    window.setTimeout(() => {
      const summary = onRunBatchSimulation(batchRuns);
      setBatchLoading(false);
      if (!summary) return;
      setBatchSummary(summary);
      message.success(`Batch complete: ${summary.runs} battle(s)`);
    }, 0);
  }, [batchRuns, monsterSkillIds.length, onRunBatchSimulation, playerSkillIds.length]);

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
        <BattleCloudProgressionPanel
          onLoadoutApplied={onCloudLoadoutApplied}
          onSkillLevelsChange={onCloudSkillLevelsChange}
        />

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

        <UnitStatsPanel
          title="Player"
          titleIcon={<UserOutlined />}
          config={playerConfig}
          configSource={playerConfigSource}
          importHistory={playerImportHistory}
          onUpdate={onUpdatePlayer}
          onSelectSource={onSelectPlayerConfigSource}
          onDeleteBinding={onDeletePlayerBinding}
          onImportClick={() => setUnitImportTarget('player')}
        />

        <UnitStatsPanel
          title="Enemy"
          config={monsterConfig}
          configSource={monsterConfigSource}
          importHistory={monsterImportHistory}
          onUpdate={onUpdateMonster}
          onSelectSource={onSelectMonsterConfigSource}
          onDeleteBinding={onDeleteMonsterBinding}
          onImportClick={() => setUnitImportTarget('enemy')}
          extra={
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
          }
        />
      </aside>

      <section className={styles.main}>
        <h2 className={styles.mainTitle}>
          Select {activeLoadoutLabel.toLowerCase()} skills (up to 6), then start battle.
        </h2>

        <div className={styles.loadoutRow}>
          <button
            type="button"
            className={`${styles.loadoutTab} ${styles.loadoutTabPlayer} ${loadoutTarget === 'player' ? styles.loadoutTabPlayerActive : ''}`}
            onClick={() => setLoadoutTarget('player')}
          >
            Player {playerSkillIds.length}/6
          </button>
          <button
            type="button"
            className={`${styles.loadoutTab} ${styles.loadoutTabEnemy} ${loadoutTarget === 'monster' ? styles.loadoutTabEnemyActive : ''}`}
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
            const selected = activeLoadoutIds.includes(skill.id);
            const cloudLevel = cloudSkillLevels[skill.id] ?? 0;
            return (
              <SkillCard
                key={skill.id}
                skill={skill}
                allocatedLevel={cloudLevel}
                alwaysShowLevel
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
        <div
          className={`${styles.chipsSection} ${loadoutTarget === 'player' ? styles.chipsSectionPlayer : styles.chipsSectionEnemy}`}
        >
          <div className={styles.chipsLabel}>
            {activeLoadoutLabel} loadout · {activeLoadoutIds.length}/6
          </div>
          <div className={styles.chips}>
            {activeLoadoutChips.length === 0 ? (
              <span className={styles.chipsEmpty}>No {activeLoadoutLabel.toLowerCase()} skills selected yet</span>
            ) : (
              activeLoadoutChips.map((skill) => (
                <span key={skill.id} className={styles.chip}>
                  {skill.name}
                  <span className={styles.chipLevel}>
                    Lv.{cloudSkillLevels[skill.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label={`Remove ${skill.name} from ${activeLoadoutLabel}`}
                    onClick={() => {
                      if (loadoutTarget === 'player') onRemovePlayerSkill(skill.id);
                      else onRemoveMonsterSkill(skill.id);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
        <div className={styles.batchSection}>
          <div className={styles.batchHeader}>
            <span className={styles.batchTitle}>Batch simulation</span>
            <label className={styles.batchRunsLabel}>
              Battles
              <InputNumber
                min={1}
                max={BATCH_MAP_BATTLE_LIMITS.maxRuns}
                value={batchRuns}
                disabled={batchLoading}
                onChange={(v) => setBatchRuns(typeof v === 'number' ? v : null)}
                onBlur={() => {
                  setBatchRuns((current) => {
                    if (current == null || !Number.isFinite(current)) {
                      return BATCH_MAP_BATTLE_LIMITS.defaultRuns;
                    }
                    return Math.min(
                      BATCH_MAP_BATTLE_LIMITS.maxRuns,
                      Math.max(1, Math.floor(current)),
                    );
                  });
                }}
                className={styles.batchRunsInput}
              />
            </label>
          </div>
          <button
            type="button"
            className={styles.batchBtn}
            disabled={
              batchLoading ||
              batchRuns == null ||
              playerSkillIds.length === 0 ||
              monsterSkillIds.length === 0
            }
            onClick={handleRunBatch}
          >
            {batchLoading ? 'Running…' : 'Run batch'}
          </button>
          {batchSummary ? (
            <div className={styles.batchResults} role="status">
              <div className={styles.batchResultsTitle}>
                Results ({batchSummary.runs} runs)
              </div>
              <div className={styles.batchResultRow}>
                <span className={styles.batchResultPlayer}>{playerConfig.name}</span>
                <span className={styles.batchResultWins}>{batchSummary.leftWins} wins</span>
              </div>
              <div className={styles.batchResultRow}>
                <span className={styles.batchResultEnemy}>{monsterConfig.name}</span>
                <span className={styles.batchResultWins}>{batchSummary.rightWins} wins</span>
              </div>
              {(batchSummary.draws > 0 || batchSummary.fled > 0 || batchSummary.incomplete > 0) ? (
                <div className={styles.batchResultMeta}>
                  {batchSummary.draws > 0 ? <span>Draws: {batchSummary.draws}</span> : null}
                  {batchSummary.fled > 0 ? <span>Fled: {batchSummary.fled}</span> : null}
                  {batchSummary.incomplete > 0 ? (
                    <span>Timeout: {batchSummary.incomplete}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
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

      <BattleUnitImportModal
        open={unitImportTarget !== null}
        target={unitImportTarget === 'enemy' ? 'enemy' : 'player'}
        fallbackConfig={unitImportTarget === 'enemy' ? monsterConfig : playerConfig}
        onClose={() => setUnitImportTarget(null)}
        onApply={(result) => {
          if (unitImportTarget === 'enemy') onImportMonster(result);
          else onImportPlayer(result);
        }}
      />
    </div>
  );
}
