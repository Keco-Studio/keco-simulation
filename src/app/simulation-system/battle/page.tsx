'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { InputNumber, message } from 'antd';
import {
  UserOutlined,
  BugOutlined,
  ThunderboltOutlined,
  FireOutlined,
  CloudOutlined,
  BulbOutlined,
  SettingOutlined,
  HistoryOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  AimOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { Combatant, BattleUnit, BattleState, Element, Skill, BattleLogEntry } from './types';
import {
  DEFAULT_PLAYER_STATS,
  DEFAULT_MONSTER_STATS,
  ELEMENT_CONFIG,
  ELEMENT_STRENGTH_CONFIG,
  REACTION_CONFIG,
} from './types';
import { filterSkillsByTab, getBuiltinSkills, inferSkillTabElement } from './data/skills';
import { BattleLocalTableSkillSourceLauncher } from './components/BattleLocalTableSkillSourceLauncher';
import { ElementGlyph } from './components/ElementGlyph';
import { BattleArena, type BattleArenaConfig } from './components/BattleArena/BattleArena';
import {
  createInitialBattleState,
  canUseSkill,
  executeSkill,
  processTurnEnd,
  setSkillCooldown,
  reduceCooldowns,
  checkBattleResult,
  addLog,
} from './core/battleLogic';
import styles from './BattleSimulator.module.css';

// --- Helpers ---

/** Element tab for a skill (UI tint; matches editor tabs). */
const getSkillElement = (skill: Skill): Element | 'none' => inferSkillTabElement(skill);

/** Render one battle-log row. */
const formatLogEntry = (entry: BattleLogEntry, index: number, playerName: string) => {
  const getClassName = () => {
    switch (entry.type) {
      case 'skill_use':
        return styles.logActor;
      case 'damage':
        return styles.logDamage;
      case 'heal':
        return styles.logHeal;
      case 'mp_cost':
      case 'mp_recover':
        return styles.logMp;
      case 'element_reaction':
        return styles.logReaction;
      default:
        return '';
    }
  };

  return (
    <div key={entry.id || index} className={styles.battleLogLine}>
      <span className={styles.logTurn}>[T{entry.turn}]</span>{' '}
      {entry.actor && <span className={entry.actor === playerName ? styles.logActorPlayer : styles.logActorMonster}>{entry.actor}</span>}
      {entry.actor && ' → '}
      {entry.skillName && <span>{entry.skillName}</span>}
      {entry.statusText && (
        <span style={{ color: entry.color || 'inherit' }}> {entry.statusText}</span>
      )}
    </div>
  );
};

// --- Page ---

type BattleMode = 'turn' | 'map';

export default function BattleSimulatorPage() {
  // --- State ---

  // Player stats
  const [playerConfig, setPlayerConfig] = useState({
    name: DEFAULT_PLAYER_STATS.name,
    hp: DEFAULT_PLAYER_STATS.hp,
    atk: DEFAULT_PLAYER_STATS.atk,
    def: DEFAULT_PLAYER_STATS.def,
    spd: DEFAULT_PLAYER_STATS.spd,
    mp: DEFAULT_PLAYER_STATS.mp,
  });

  // Enemy stats
  const [monsterConfig, setMonsterConfig] = useState({
    name: DEFAULT_MONSTER_STATS.name,
    hp: DEFAULT_MONSTER_STATS.hp,
    atk: DEFAULT_MONSTER_STATS.atk,
    def: DEFAULT_MONSTER_STATS.def,
    spd: DEFAULT_MONSTER_STATS.spd,
    mp: DEFAULT_MONSTER_STATS.mp,
  });

  // Enemy starting element
  const [monsterInitialElement, setMonsterInitialElement] = useState<Element | null>(null);

  // Battle runtime
  const [battleState, setBattleState] = useState<BattleState | null>(null);

  // Selected skill
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Active element tab
  const [selectedElement, setSelectedElement] = useState<string>('all');

  // Skills from local table mapping (fallback: built-in until first successful validate)
  const [skillList, setSkillList] = useState<Skill[]>(() => getBuiltinSkills());

  // Loadouts (max 6 each)
  const [playerSkillIds, setPlayerSkillIds] = useState<string[]>([]);
  const [monsterSkillIds, setMonsterSkillIds] = useState<string[]>([]);
  const [loadoutTarget, setLoadoutTarget] = useState<'player' | 'monster'>('player');

  // Battle mode: null = pick on right; turn = manual clicks; map = arena
  const [battleMode, setBattleMode] = useState<BattleMode | null>(null);
  const [arenaConfig, setArenaConfig] = useState<BattleArenaConfig | null>(null);

  const sessionLocked = battleState !== null || arenaConfig !== null;

  // Log scroll ref
  const logRef = useRef<HTMLDivElement>(null);

  const handleSkillsFromLocalTable = useCallback((skills: Skill[]) => {
    if (skills.length > 0) setSkillList(skills);
  }, []);

  const defaultLoadoutIds = useCallback(
    () => skillList.slice(0, Math.min(6, skillList.length)).map((s) => s.id),
    [skillList],
  );

  useEffect(() => {
    const fallback = defaultLoadoutIds();
    setPlayerSkillIds((prev) => {
      const valid = prev.filter((id) => skillList.some((s) => s.id === id));
      if (valid.length > 0) return valid;
      return fallback;
    });
    setMonsterSkillIds((prev) => {
      const valid = prev.filter((id) => skillList.some((s) => s.id === id));
      if (valid.length > 0) return valid;
      return fallback;
    });
  }, [skillList, defaultLoadoutIds]);

  useEffect(() => {
    if (!logRef.current || !battleState?.battleLogs.length) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleState?.battleLogs.length]);

  // --- Derived ---

  // All configured skills
  const playerConfiguredSkills = useMemo(() => {
    return playerSkillIds
      .map((id) => skillList.find((s) => s.id === id))
      .filter((s): s is Skill => s !== undefined);
  }, [playerSkillIds, skillList]);

  const monsterConfiguredSkills = useMemo(() => {
    return monsterSkillIds
      .map((id) => skillList.find((s) => s.id === id))
      .filter((s): s is Skill => s !== undefined);
  }, [monsterSkillIds, skillList]);

  const activeLoadoutIds = loadoutTarget === 'player' ? playerSkillIds : monsterSkillIds;

  // Skills shown depend on phase
  const displayedSkills = useMemo(() => {
    const byTab = (tab: string) =>
      tab === 'all' ? skillList : filterSkillsByTab(skillList, tab);
    if (!battleState) {
      return byTab(selectedElement);
    }
    if (battleState.phase === 'setup') {
      return byTab(selectedElement);
    }
    if (battleState.phase === 'finished') {
      return playerConfiguredSkills;
    }
    return playerConfiguredSkills;
  }, [selectedElement, battleState, playerConfiguredSkills, skillList]);

  // In-combat list with cooldown overlay
  const skillsWithCooldown = useMemo(() => {
    if (!battleState || battleState.phase === 'setup' || battleState.phase === 'finished') {
      return displayedSkills;
    }
    // Only configured skills with cooldown overlay
    return displayedSkills.map(skill => ({
      ...skill,
      currentCooldown: battleState.skillCooldowns[skill.id] || 0,
    }));
  }, [displayedSkills, battleState]);

  // --- Handlers ---

  // Update player field
  const updatePlayerStat = useCallback((field: string, value: number | string | null) => {
    setPlayerConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update enemy field
  const updateMonsterStat = useCallback((field: string, value: number | string | null) => {
    setMonsterConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  /** Turn-based: open skill loadout (setup phase). */
  const handleStartBattle = useCallback(() => {
    if (!playerConfig.name || !monsterConfig.name) {
      message.warning('Enter both unit names');
      return;
    }
    if (skillList.length === 0) {
      message.warning('Open Configure skills… and apply validated skills before battle');
      return;
    }

    const player: Combatant = {
      id: 'player',
      name: playerConfig.name,
      hp: playerConfig.hp,
      atk: playerConfig.atk,
      def: playerConfig.def,
      spd: playerConfig.spd,
      mp: playerConfig.mp,
      type: 'player',
    };

    const monster: Combatant = {
      id: 'monster',
      name: monsterConfig.name,
      hp: monsterConfig.hp,
      atk: monsterConfig.atk,
      def: monsterConfig.def,
      spd: monsterConfig.spd,
      mp: monsterConfig.mp,
      type: 'monster',
    };

    const initialState = createInitialBattleState({
      player,
      monster,
      monsterInitialElement: monsterInitialElement || undefined,
      maxTurns: 100,
    });

    initialState.battleLogs.push(addLog(initialState, {
      type: 'battle_start',
      statusText: 'Pre-battle: pick up to 6 skills below, then Confirm to begin',
      color: '#8b949e',
    }));

    setBattleState(initialState);
    setSelectedSkill(null);
  }, [playerConfig, monsterConfig, monsterInitialElement, skillList.length]);

  const buildArenaConfig = useCallback(
    (playerLoadout: string[], enemyLoadout: string[]): BattleArenaConfig => ({
      mapWidth: 16,
      mapHeight: 16,
      playerName: playerConfig.name,
      playerStats: {
        maxHp: playerConfig.hp,
        atk: playerConfig.atk,
        def: playerConfig.def,
        spd: playerConfig.spd,
      },
      playerHp: playerConfig.hp,
      playerMp: playerConfig.mp,
      playerMaxMp: playerConfig.mp,
      playerSkillIds: playerLoadout,
      enemyName: monsterConfig.name,
      enemyStats: {
        maxHp: monsterConfig.hp,
        atk: monsterConfig.atk,
        def: monsterConfig.def,
        spd: monsterConfig.spd,
      },
      enemyHp: monsterConfig.hp,
      enemyMp: monsterConfig.mp,
      enemyMaxMp: monsterConfig.mp,
      enemySkillIds: enemyLoadout,
      skills: skillList,
      monsterInitialElement,
    }),
    [playerConfig, monsterConfig, monsterInitialElement, skillList],
  );

  const handleSelectBattleMode = useCallback(
    (mode: BattleMode) => {
      if (!playerConfig.name || !monsterConfig.name) {
        message.warning('Enter both unit names');
        return;
      }
      if (skillList.length === 0) {
        message.warning('Open Configure skills… and apply validated skills before battle');
        return;
      }
      setBattleMode(mode);
    },
    [playerConfig.name, monsterConfig.name, skillList.length],
  );

  /** Map arena: open skill loadout (setup phase). */
  const handleEnterLoadout = useCallback(() => {
    if (!playerConfig.name || !monsterConfig.name) {
      message.warning('Enter both unit names');
      return;
    }
    if (skillList.length === 0) {
      message.warning('Open Configure skills… and apply validated skills before battle');
      return;
    }

    setArenaConfig(null);
    setSelectedSkill(null);

    const initialState = createInitialBattleState({
      player: {
        id: 'player',
        type: 'player',
        name: playerConfig.name,
        hp: playerConfig.hp,
        atk: playerConfig.atk,
        def: playerConfig.def,
        spd: playerConfig.spd,
        mp: playerConfig.mp,
      },
      monster: {
        id: 'monster',
        type: 'monster',
        name: monsterConfig.name,
        hp: monsterConfig.hp,
        atk: monsterConfig.atk,
        def: monsterConfig.def,
        spd: monsterConfig.spd,
        mp: monsterConfig.mp,
      },
      monsterInitialElement: monsterInitialElement ?? undefined,
      maxTurns: 100,
    });

    initialState.battleLogs.push(addLog(initialState, {
      type: 'battle_start',
      statusText: 'Pre-battle: pick up to 6 skills below, then Launch arena',
      color: '#8b949e',
    }));

    setBattleState(initialState);
    setSelectedSkill(null);
  }, [playerConfig, monsterConfig, monsterInitialElement, skillList.length]);

  const handleLaunchArena = useCallback(() => {
    const fallback = defaultLoadoutIds();
    const playerLoadout = playerSkillIds.length > 0 ? playerSkillIds : fallback;
    const enemyLoadout = monsterSkillIds.length > 0 ? monsterSkillIds : fallback;

    if (playerLoadout.length === 0 || enemyLoadout.length === 0) {
      message.warning('Select at least one skill for player and enemy');
      return;
    }

    if (playerLoadout.length !== playerSkillIds.length) {
      setPlayerSkillIds(playerLoadout);
    }
    if (enemyLoadout.length !== monsterSkillIds.length) {
      setMonsterSkillIds(enemyLoadout);
    }

    setBattleState(null);
    setArenaConfig(buildArenaConfig(playerLoadout, enemyLoadout));
    setSelectedSkill(null);
  }, [playerSkillIds, monsterSkillIds, defaultLoadoutIds, buildArenaConfig]);

  const handleCancelLoadout = useCallback(() => {
    setBattleState(null);
    setSelectedSkill(null);
  }, []);

  // Leave setup → turn 1
  const handleConfirmBeginCombat = useCallback(() => {
    if (!battleState || battleState.phase !== 'setup') return;
    if (playerSkillIds.length === 0) {
      message.warning('Pick at least one player skill');
      return;
    }
    if (monsterSkillIds.length === 0) {
      message.warning('Pick at least one enemy skill');
      return;
    }
    const base = { ...battleState, currentTurn: 1, phase: 'player_turn' as const };
    let logs = [...battleState.battleLogs];
    logs.push(addLog(base, {
      type: 'battle_start',
      statusText: 'Combat started!',
      color: '#dcdcaa',
    }));
    logs.push(addLog(base, {
      type: 'battle_start',
      statusText: `Speed — ${base.player.name} ${base.player.spd} vs ${base.monster.name} ${base.monster.spd}`,
      color: '#8b949e',
    }));
    setBattleState({
      ...base,
      battleLogs: logs,
    });
    setSelectedSkill(null);
  }, [battleState, playerSkillIds.length, monsterSkillIds.length]);

  // Player skill
  const handleUseSkill = useCallback(() => {
    if (!battleState || !selectedSkill || battleState.phase !== 'player_turn') return;

    const { player, monster } = battleState;

    if (!playerSkillIds.includes(selectedSkill.id)) {
      message.warning('Only loadout skills can be used.');
      return;
    }

    const check = canUseSkill(selectedSkill, player, battleState.skillCooldowns);
    if (!check.canUse) {
      message.warning(check.reason);
      return;
    }

    if (player.control?.type === 'freeze') {
      message.warning('You are frozen and skip this turn.');
      handleEnemyTurn({ ...battleState, phase: 'enemy_turn' }, player, monster);
      return;
    }

    let newState = { ...battleState };
    let logs = [...battleState.battleLogs];
    let newPlayer = { ...player };
    let newMonster = { ...monster };

    // Resolve skill
    const result = executeSkill(newState, newPlayer, newMonster, selectedSkill, logs);
    newPlayer = result.newAttacker;
    newMonster = result.newDefender;
    logs = result.newLogs;

    // Apply cooldown
    const newCooldowns = setSkillCooldown(battleState.skillCooldowns, selectedSkill);

    newState = {
      ...newState,
      player: newPlayer,
      monster: newMonster,
      skillCooldowns: newCooldowns,
      battleLogs: logs,
    };

    // Win / lose / draw
    const result2 = checkBattleResult(newPlayer, newMonster);
    if (result2) {
      newState.phase = 'finished';
      newState.result = result2;
      logs.push(addLog(newState, {
        type: 'battle_end',
        statusText: result2 === 'player_win' ? 'Victory — player wins!' :
          result2 === 'monster_win' ? 'Defeat — enemy wins!' : 'Draw!',
        color: result2 === 'player_win' ? '#51cf66' : result2 === 'monster_win' ? '#ff6b6b' : '#ffd43b',
      }));
      setBattleState(newState);
      return;
    }

    // Enemy phase
    newState.phase = 'enemy_turn';
    setBattleState(newState);

    // Defer enemy action
    setTimeout(() => {
      handleEnemyTurn(newState, newPlayer, newMonster);
    }, 500);
  }, [battleState, selectedSkill, playerSkillIds]);

  // Enemy turn
  const handleEnemyTurn = useCallback((currentState: BattleState, currentPlayer: BattleUnit, currentMonster: BattleUnit) => {
    let newState = { ...currentState };
    let logs = [...currentState.battleLogs];
    let player = { ...currentPlayer };
    let monster = { ...currentMonster };

    // Enemy frozen?
    if (monster.control?.type === 'freeze') {
      logs.push(addLog(newState, {
        type: 'control',
        actor: monster.name,
        statusText: `${monster.name} is frozen and skips the turn!`,
        color: '#74c0fc',
      }));

      newState = {
        ...newState,
        battleLogs: logs,
        phase: 'round_end',
      };

      handleRoundEnd(newState, player, monster);
      return;
    }

    // Enemy picks a skill from loadout (fallback: full skill list)
    const enemyPool =
      monsterSkillIds.length > 0
        ? monsterSkillIds
            .map((id) => skillList.find((s) => s.id === id))
            .filter((s): s is Skill => s !== undefined)
        : skillList;
    const enemySkills = enemyPool.filter((s) => s.mpCost <= monster.mp);

    // Prefer reactions when possible
    let enemySkill: Skill | null = null;

    for (const skill of enemySkills) {
      if (skill.attachElement && player.element) {
        const skillElem = skill.attachElement.element;
        if (skillElem !== 'random') {
          // Reaction possible?
          if ((skillElem === 'fire' && player.element.element === 'water') ||
            (skillElem === 'fire' && player.element.element === 'ice') ||
            (skillElem === 'water' && player.element.element === 'fire') ||
            (skillElem === 'thunder' && player.element.element === 'water') ||
            (skillElem === 'grass' && player.element.element === 'fire')) {
            enemySkill = skill;
            break;
          }
        }
      }
    }

    if (!enemySkill && enemySkills.length > 0) {
      // Otherwise random among top few
      enemySkill = enemySkills[Math.floor(Math.random() * Math.min(3, enemySkills.length))];
    }

    if (enemySkill) {
      const result = executeSkill(newState, monster, player, enemySkill, logs);
      player = result.newDefender;
      monster = result.newAttacker;
      logs = result.newLogs;

      // Enemy cooldown
      const newCooldowns = setSkillCooldown(newState.skillCooldowns, enemySkill);
      newState.skillCooldowns = newCooldowns;
    }

    newState.player = player;
    newState.monster = monster;
    newState.battleLogs = logs;

    // Win / lose / draw
    const battleResult = checkBattleResult(player, monster);
    if (battleResult) {
      newState.phase = 'finished';
      newState.result = battleResult;
      logs.push(addLog(newState, {
        type: 'battle_end',
        statusText: battleResult === 'player_win' ? 'Victory — player wins!' :
          battleResult === 'monster_win' ? 'Defeat — enemy wins!' : 'Draw!',
        color: battleResult === 'player_win' ? '#51cf66' : battleResult === 'monster_win' ? '#ff6b6b' : '#ffd43b',
      }));
      setBattleState(newState);
      return;
    }

    // Round cleanup
    newState.phase = 'round_end';
    setBattleState(newState);

    // Defer round end
    setTimeout(() => {
      handleRoundEnd(newState, player, monster);
    }, 500);
  }, [skillList, monsterSkillIds]);

  // Round end
  const handleRoundEnd = useCallback((currentState: BattleState, currentPlayer: BattleUnit, currentMonster: BattleUnit) => {
    let newState = { ...currentState };
    let logs = [...currentState.battleLogs];
    let player = { ...currentPlayer };
    let monster = { ...currentMonster };

    logs.push(addLog(newState, {
      type: 'turn_end',
      statusText: '─'.repeat(30),
      color: '#6e7681',
    }));

    // Tick player end-of-turn
    const playerResult = processTurnEnd(newState, player, logs);
    player = playerResult.newUnit;
    logs = playerResult.newLogs;

    // Tick enemy end-of-turn
    const monsterResult = processTurnEnd(newState, monster, logs);
    monster = monsterResult.newUnit;
    logs = monsterResult.newLogs;

    // Reduce cooldowns
    const newCooldowns = reduceCooldowns(newState.skillCooldowns);

    // Win / lose / draw
    const battleResult = checkBattleResult(player, monster);
    if (battleResult) {
      newState = {
        ...newState,
        player,
        monster,
        battleLogs: logs,
        skillCooldowns: newCooldowns,
        phase: 'finished',
        result: battleResult,
      };
      logs.push(addLog(newState, {
        type: 'battle_end',
        statusText: battleResult === 'player_win' ? 'Victory — player wins!' :
          battleResult === 'monster_win' ? 'Defeat — enemy wins!' : 'Draw!',
        color: battleResult === 'player_win' ? '#51cf66' : battleResult === 'monster_win' ? '#ff6b6b' : '#ffd43b',
      }));
      setBattleState(newState);
      return;
    }

    // Next round
    const newTurn = newState.currentTurn + 1;
    logs.push(addLog(newState, {
      type: 'turn_start',
      statusText: `Round ${newTurn} begins`,
      color: '#569cd6',
    }));

    newState = {
      ...newState,
      player,
      monster,
      battleLogs: logs,
      skillCooldowns: newCooldowns,
      currentTurn: newTurn,
      phase: 'player_turn',
    };

    setBattleState(newState);
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setBattleState(null);
    setArenaConfig(null);
    setBattleMode(null);
    setSelectedSkill(null);
    setMonsterInitialElement(null);
  }, []);

  // --- Render ---

  // Stat form
  const renderConfigPanel = () => (
    <div className={styles.configPanel}>
      <BattleLocalTableSkillSourceLauncher
        disabled={sessionLocked}
        activeSkillCount={skillList.length}
        onSkillsApplied={handleSkillsFromLocalTable}
      />

      {/* Player */}
      <div className={`${styles.configCard} ${styles.playerCard} ${battleState && battleState.phase !== 'setup' ? styles.inCombat : ''}`}>
        <div className={styles.configCardTitle}>
          <UserOutlined className={styles.playerIcon} />
          Player
        </div>
        <div className={styles.statsGrid}>
          <div className={`${styles.statItem} ${styles.statItemFull}`}>
            <span className={styles.statLabel}>Name</span>
            <input
              type="text"
              className={styles.nameInput}
              value={playerConfig.name}
              onChange={(e) => updatePlayerStat('name', e.target.value)}
              disabled={sessionLocked}
              maxLength={20}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>HP</span>
            <InputNumber
              className={styles.statInput}
              min={1}
              max={99999}
              value={playerConfig.hp}
              onChange={(v) => updatePlayerStat('hp', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>ATK</span>
            <InputNumber
              className={styles.statInput}
              min={1}
              max={9999}
              value={playerConfig.atk}
              onChange={(v) => updatePlayerStat('atk', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>DEF</span>
            <InputNumber
              className={styles.statInput}
              min={0}
              max={9999}
              value={playerConfig.def}
              onChange={(v) => updatePlayerStat('def', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>SPD</span>
            <InputNumber
              className={styles.statInput}
              min={1}
              max={9999}
              value={playerConfig.spd}
              onChange={(v) => updatePlayerStat('spd', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.mpSection}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>MP</span>
              <InputNumber
                className={styles.statInput}
                min={1}
                max={999}
                value={playerConfig.mp}
                onChange={(v) => updatePlayerStat('mp', v)}
                disabled={sessionLocked}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enemy */}
      <div className={`${styles.configCard} ${styles.monsterCard} ${battleState && battleState.phase !== 'setup' ? styles.inCombat : ''}`}>
        <div className={styles.configCardTitle}>
          <span className={styles.monsterIcon}>💀</span>
          Enemy
        </div>
        <div className={styles.statsGrid}>
          <div className={`${styles.statItem} ${styles.statItemFull}`}>
            <span className={styles.statLabel}>Name</span>
            <input
              type="text"
              className={styles.nameInput}
              value={monsterConfig.name}
              onChange={(e) => updateMonsterStat('name', e.target.value)}
              disabled={sessionLocked}
              maxLength={20}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>HP</span>
            <InputNumber
              className={styles.statInput}
              min={1}
              max={99999}
              value={monsterConfig.hp}
              onChange={(v) => updateMonsterStat('hp', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>ATK</span>
            <InputNumber
              className={styles.statInput}
              min={1}
              max={9999}
              value={monsterConfig.atk}
              onChange={(v) => updateMonsterStat('atk', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>DEF</span>
            <InputNumber
              className={styles.statInput}
              min={0}
              max={9999}
              value={monsterConfig.def}
              onChange={(v) => updateMonsterStat('def', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>SPD</span>
            <InputNumber
              className={styles.statInput}
              min={1}
              max={9999}
              value={monsterConfig.spd}
              onChange={(v) => updateMonsterStat('spd', v)}
              disabled={sessionLocked}
            />
          </div>
          <div className={styles.mpSection}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>MP</span>
              <InputNumber
                className={styles.statInput}
                min={1}
                max={999}
                value={monsterConfig.mp}
                onChange={(v) => updateMonsterStat('mp', v)}
                disabled={sessionLocked}
              />
            </div>
          </div>
        </div>

        {/* Enemy starting element */}
        <div className={styles.elementPreset}>
          <div className={styles.elementPresetTitle}>Enemy starting element</div>
          <div className={styles.elementButtons}>
            <button
              className={`${styles.elementButton} ${monsterInitialElement === null ? styles.elementButtonActive : ''}`}
              onClick={() => setMonsterInitialElement(null)}
              disabled={sessionLocked}
            >
              None
            </button>
            {(['fire', 'water', 'thunder', 'grass', 'ice'] as Element[]).map((elem) => (
              <button
                key={elem}
                className={`${styles.elementButton} ${monsterInitialElement === elem ? styles.elementButtonActive : ''}`}
                onClick={() => setMonsterInitialElement(elem)}
                disabled={sessionLocked}
                style={{ color: monsterInitialElement === elem ? ELEMENT_CONFIG[elem].color : undefined }}
              >
                {ELEMENT_CONFIG[elem].emoji} {ELEMENT_CONFIG[elem].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actionButtons}>
        {battleMode === null ? (
          <p className={styles.modeHint}>Choose a battle mode on the right →</p>
        ) : battleMode === 'map' ? (
          arenaConfig ? (
            <button type="button" className={styles.resetButton} onClick={handleReset}>
              Stop arena
            </button>
          ) : battleState === null ? (
            <>
              <button type="button" className={styles.startButton} onClick={handleEnterLoadout}>
                Select skills
              </button>
              <button type="button" className={styles.resetButton} onClick={() => setBattleMode(null)}>
                Change mode
              </button>
            </>
          ) : battleState.phase === 'setup' ? (
            <>
              <button
                type="button"
                className={styles.startButton}
                onClick={handleLaunchArena}
                disabled={playerSkillIds.length === 0 || monsterSkillIds.length === 0}
              >
                Launch arena
              </button>
              <button type="button" className={styles.resetButton} onClick={handleCancelLoadout}>
                Back
              </button>
            </>
          ) : null
        ) : battleState === null ? (
          <>
            <button className={styles.startButton} onClick={handleStartBattle}>
              Start battle
            </button>
            <button type="button" className={styles.resetButton} onClick={() => setBattleMode(null)}>
              Change mode
            </button>
          </>
        ) : battleState.phase === 'finished' ? (
          <button className={styles.startButton} onClick={handleReset}>
            Restart
          </button>
        ) : battleState.phase === 'setup' ? (
          <>
            <button
              className={styles.startButton}
              onClick={handleConfirmBeginCombat}
              disabled={playerSkillIds.length === 0 || monsterSkillIds.length === 0}
            >
              Confirm
            </button>
            <button className={styles.resetButton} onClick={handleReset}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className={styles.executeButton}
              onClick={handleUseSkill}
              disabled={!selectedSkill}
            >
              Use skill
            </button>
            <button className={styles.resetButton} onClick={handleReset}>
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderModePicker = () => (
    <div className={styles.battleStage}>
      <div className={`${styles.mapSlot} ${styles.emptyState}`}>
        <div className={styles.emptyStateIcon}>
          <ThunderboltOutlined />
        </div>
        <div className={styles.emptyStateTitle}>Choose battle mode</div>
        <div className={styles.emptyStateDesc}>
          Configure stats and skills on the left, then pick how you want to fight.
        </div>
        <div className={styles.modePickerGrid}>
          <button
            type="button"
            className={`${styles.modeCard} ${styles.modeCardMap}`}
            onClick={() => handleSelectBattleMode('map')}
          >
            <span className={`${styles.modeCardIcon} ${styles.modeCardIconMap}`}>
              <EnvironmentOutlined />
            </span>
            <span className={styles.modeCardTitle}>Map arena</span>
            <span className={styles.modeCardDesc}>
              Top-down map battle with AI movement, skills, and visual combat effects.
            </span>
          </button>
          <button
            type="button"
            className={`${styles.modeCard} ${styles.modeCardTurn}`}
            onClick={() => handleSelectBattleMode('turn')}
          >
            <span className={`${styles.modeCardIcon} ${styles.modeCardIconTurn}`}>
              <AimOutlined />
            </span>
            <span className={styles.modeCardTitle}>Manual turn-based</span>
            <span className={styles.modeCardDesc}>
              Classic turn flow — pick skills each round and click to execute attacks.
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  // Battle stage
  const renderBattleStage = () => {
    if (!battleState) {
      if (battleMode === null) {
        return renderModePicker();
      }

      return (
        <div className={styles.battleStage}>
          <div className={`${styles.mapSlot} ${styles.emptyState}`}>
            <div className={styles.emptyStateIcon}>
              {battleMode === 'map' ? <EnvironmentOutlined /> : <AimOutlined />}
            </div>
            <div className={styles.emptyStateTitle}>Ready</div>
            <div className={styles.emptyStateDesc}>
              {battleMode === 'map'
                ? 'Click Select skills on the left, configure loadouts, then Launch arena.'
                : 'Click Start battle on the left, configure loadouts, then Confirm to begin.'}
            </div>
          </div>
        </div>
      );
    }

    if (battleState.phase === 'setup' && battleMode === 'map') {
      return (
        <div className={styles.battleStage}>
          <div className={`${styles.mapSlot} ${styles.emptyState}`} style={{ minHeight: 140 }}>
            <div className={styles.emptyStateIcon}>
              <SettingOutlined />
            </div>
            <div className={styles.emptyStateTitle}>Skill loadout</div>
            <div className={styles.emptyStateDesc}>
              Choose up to 6 skills each for player and enemy below, then click Launch arena.
            </div>
          </div>
        </div>
      );
    }

    if (battleState.phase === 'finished') {
      return (
        <div className={styles.battleStage}>
          <div className={styles.battleResult}>
            <div className={styles.resultIcon}>
              {battleState.result === 'player_win' ? (
                <ThunderboltOutlined />
              ) : battleState.result === 'monster_win' ? (
                <BugOutlined />
              ) : (
                <span style={{ fontSize: 22 }}>=</span>
              )}
            </div>
            <div className={`${styles.resultTitle} ${battleState.result === 'player_win' ? styles.resultPlayerWin :
              battleState.result === 'monster_win' ? styles.resultMonsterWin :
                styles.resultDraw
              }`}>
              {battleState.result === 'player_win' ? 'Player wins!' :
                battleState.result === 'monster_win' ? 'Enemy wins!' : 'Draw!'}
            </div>
            <div className={styles.resultStats}>
              Turns: {battleState.currentTurn} |
              Player HP: {battleState.player.hp}/{battleState.player.maxHp} |
              Enemy HP: {battleState.monster.hp}/{battleState.monster.maxHp}
            </div>
            <div className={styles.actionButtons} style={{ marginTop: 24 }}>
              <button className={styles.startButton} onClick={handleReset}>
                Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    const { player, monster } = battleState;

    return (
      <div className={styles.battleStage}>
        {/* Player status */}
        <div className={styles.combatantStatus}>
          <div className={styles.statusHeader}>
            <div className={styles.statusName}>
              <UserOutlined />
              <span>{player.name}</span>
              {battleState.phase === 'player_turn' && <span style={{ color: '#51cf66', fontSize: 12 }}>Acting</span>}
            </div>
            <div className={styles.statusTurn}>
              Round {battleState.currentTurn}
            </div>
          </div>
          <div className={styles.progressBars}>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>HP</span>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${player.hp / player.maxHp < 0.3 ? styles.hpFillLow : styles.hpFill}`}
                  style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                />
              </div>
              <span className={styles.progressValue}>{player.hp}/{player.maxHp}</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>MP</span>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(player.mp / player.maxMp) * 100}%`, background: 'linear-gradient(90deg, #845ef7 0%, #9d7dea 100%)' }}
                />
              </div>
              <span className={styles.progressValue}>{player.mp}/{player.maxMp}</span>
            </div>
          </div>
          <div className={styles.statusTags}>
            {player.element && (
              <span
                className={`${styles.statusTag} ${styles.elementTag}`}
                style={{ color: ELEMENT_CONFIG[player.element.element].color }}
              >
                {ELEMENT_CONFIG[player.element.element].name} ·{' '}
                {ELEMENT_STRENGTH_CONFIG[player.element.strength].name}
                ({player.element.remainingTurns})
              </span>
            )}
            {player.dot && (
              <span className={`${styles.statusTag} ${styles.dotTag}`}>
                <FireOutlined /> Burn {Math.ceil(player.atk * player.dot.damage)}/turn ({player.dot.remainingTurns})
              </span>
            )}
            {player.control?.type === 'freeze' && (
              <span className={`${styles.statusTag} ${styles.freezeTag}`}>
                <CloudOutlined /> Frozen
              </span>
            )}
            {player.buffs.map((buff, i) => (
              <span key={i} className={`${styles.statusTag} ${styles.buffTag}`}>
                {buff.type === 'atk_debuff' && `ATK-${Math.round(buff.value * 100)}%(${buff.remainingTurns})`}
                {buff.type === 'def_debuff' && `DEF-${Math.round(buff.value * 100)}%(${buff.remainingTurns})`}
                {buff.type === 'quicken' && (
                  <>
                    <BulbOutlined /> Quicken +{Math.round(buff.value * 100)}% ({buff.remainingTurns})
                  </>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* VS */}
        <div className={styles.vsDivider}>
          <span className={styles.vsText}>VS</span>
        </div>

        {/* Enemy status */}
        <div className={styles.combatantStatus}>
          <div className={styles.statusHeader}>
            <div className={styles.statusName}>
              <BugOutlined />
              <span>{monster.name}</span>
              {battleState.phase === 'enemy_turn' && <span style={{ color: '#ff6b6b', fontSize: 12 }}>Acting</span>}
            </div>
          </div>
          <div className={styles.progressBars}>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>HP</span>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${monster.hp / monster.maxHp < 0.3 ? styles.hpFillLow : styles.hpFill}`}
                  style={{ width: `${(monster.hp / monster.maxHp) * 100}%` }}
                />
              </div>
              <span className={styles.progressValue}>{monster.hp}/{monster.maxHp}</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>MP</span>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(monster.mp / monster.maxMp) * 100}%`, background: 'linear-gradient(90deg, #845ef7 0%, #9d7dea 100%)' }}
                />
              </div>
              <span className={styles.progressValue}>{monster.mp}/{monster.maxMp}</span>
            </div>
          </div>
          <div className={styles.statusTags}>
            {monster.element && (
              <span
                className={`${styles.statusTag} ${styles.elementTag}`}
                style={{ color: ELEMENT_CONFIG[monster.element.element].color }}
              >
                {ELEMENT_CONFIG[monster.element.element].name} ·{' '}
                {ELEMENT_STRENGTH_CONFIG[monster.element.strength].name}
                ({monster.element.remainingTurns})
              </span>
            )}
            {monster.dot && (
              <span className={`${styles.statusTag} ${styles.dotTag}`}>
                <FireOutlined /> Burn {Math.ceil(monster.atk * monster.dot.damage)}/turn ({monster.dot.remainingTurns})
              </span>
            )}
            {monster.control?.type === 'freeze' && (
              <span className={`${styles.statusTag} ${styles.freezeTag}`}>
                <CloudOutlined /> Frozen
              </span>
            )}
            {monster.buffs.map((buff, i) => (
              <span key={i} className={`${styles.statusTag} ${buff.type.includes('debuff') ? styles.debuffTag : styles.buffTag}`}>
                {buff.type === 'atk_debuff' && `ATK-${Math.round(buff.value * 100)}%(${buff.remainingTurns})`}
                {buff.type === 'def_debuff' && `DEF-${Math.round(buff.value * 100)}%(${buff.remainingTurns})`}
                {buff.type === 'quicken' && (
                  <>
                    <BulbOutlined /> Quicken +{Math.round(buff.value * 100)}% ({buff.remainingTurns})
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Skill picker (setup vs combat)
  const renderSkillSelector = () => {
    if (!battleState || battleState.phase === 'finished') {
      return null;
    }

    const { player, skillCooldowns } = battleState;
    const isSetup = battleState.phase === 'setup';

    return (
      <div className={styles.skillSelector}>
        <div className={styles.skillSelectorTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isSetup ? (
            <>
              <SettingOutlined />{' '}
              {battleMode === 'map' ? 'Configure loadouts for arena' : 'Configure loadouts (max 6 each)'}
            </>
          ) : (
            <>
              <AimOutlined /> Select skill
            </>
          )}
        </div>

        {/* Pre-battle: configured list + library */}
        {isSetup && (
          <>
            <div className={styles.loadoutTargetRow}>
              <button
                type="button"
                className={`${styles.loadoutTargetTab} ${styles.loadoutTargetTabPlayer} ${loadoutTarget === 'player' ? styles.loadoutTargetTabActive : ''}`}
                onClick={() => setLoadoutTarget('player')}
              >
                <UserOutlined />
                Player {playerSkillIds.length}/6
              </button>
              <button
                type="button"
                className={`${styles.loadoutTargetTab} ${styles.loadoutTargetTabMonster} ${loadoutTarget === 'monster' ? styles.loadoutTargetTabActive : ''}`}
                onClick={() => setLoadoutTarget('monster')}
              >
                <BugOutlined />
                Enemy {monsterSkillIds.length}/6
              </button>
            </div>
            <p className={styles.loadoutSectionTitle}>Player loadout</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {playerConfiguredSkills.map((skill) => {
                const skillElement = getSkillElement(skill);
                const elementColor = skillElement !== 'none' ? ELEMENT_CONFIG[skillElement as Element]?.color : undefined;
                return (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: elementColor ? `${elementColor}20` : '#2d2d2d',
                      border: `1px solid ${elementColor || '#51cf66'}`,
                      borderRadius: 4,
                      fontSize: 12,
                      color: elementColor || '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setPlayerSkillIds((prev) => prev.filter((id) => id !== skill.id));
                    }}
                    title="Click to remove from player"
                  >
                    {skillElement !== 'none' && <ElementGlyph element={skillElement as Element} />}
                    {skill.name}
                    <span style={{ color: '#888', marginLeft: 4 }}>×</span>
                  </div>
                );
              })}
              {playerConfiguredSkills.length === 0 && (
                <div style={{ color: '#666', fontSize: 12 }}>No player skills selected</div>
              )}
            </div>
            <p className={styles.loadoutSectionTitle}>Enemy loadout</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {monsterConfiguredSkills.map((skill) => {
                const skillElement = getSkillElement(skill);
                const elementColor = skillElement !== 'none' ? ELEMENT_CONFIG[skillElement as Element]?.color : undefined;
                return (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: elementColor ? `${elementColor}20` : '#2d2d2d',
                      border: `1px solid ${elementColor || '#ff6b6b'}`,
                      borderRadius: 4,
                      fontSize: 12,
                      color: elementColor || '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setMonsterSkillIds((prev) => prev.filter((id) => id !== skill.id));
                    }}
                    title="Click to remove from enemy"
                  >
                    {skillElement !== 'none' && <ElementGlyph element={skillElement as Element} />}
                    {skill.name}
                    <span style={{ color: '#888', marginLeft: 4 }}>×</span>
                  </div>
                );
              })}
              {monsterConfiguredSkills.length === 0 && (
                <div style={{ color: '#666', fontSize: 12 }}>No enemy skills selected</div>
              )}
            </div>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#8b949e' }}>
              Switch Player / Enemy above, then click skill cards below to add to that loadout (max 6
              each). Skills come from Configure skills on the left.
            </div>
            <div className={styles.actionButtons} style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={styles.startButton}
                onClick={handleConfirmBeginCombat}
                disabled={playerSkillIds.length === 0 || monsterSkillIds.length === 0}
              >
                Confirm
              </button>
              <button type="button" className={styles.resetButton} onClick={handleCancelLoadout}>
                Back
              </button>
            </div>
          </>
        )}

        <div className={styles.elementTabs}>
          <button
            className={`${styles.elementTab} ${selectedElement === 'all' ? styles.elementTabActive : ''}`}
            onClick={() => setSelectedElement('all')}
          >
            All
          </button>
          <button
            className={`${styles.elementTab} ${selectedElement === 'none' ? styles.elementTabActive : ''}`}
            onClick={() => setSelectedElement('none')}
          >
            <ThunderboltOutlined style={{ marginRight: 4 }} />
            Basic
          </button>
          {(['fire', 'water', 'thunder', 'grass', 'ice'] as Element[]).map((elem) => (
            <button
              key={elem}
              className={`${styles.elementTab} ${styles[`elementTab${elem.charAt(0).toUpperCase() + elem.slice(1)}`]} ${selectedElement === elem ? styles.elementTabActive : ''}`}
              onClick={() => setSelectedElement(elem)}
            >
              <ElementGlyph element={elem} size={12} />
            </button>
          ))}
        </div>

        <div className={styles.skillGrid}>
          {skillsWithCooldown.map((skill) => {
            const cooldown = skillCooldowns[skill.id] || 0;
            const canUse = canUseSkill(skill, player, skillCooldowns);
            const isSelected = selectedSkill?.id === skill.id;
            const inPlayerLoadout = playerSkillIds.includes(skill.id);
            const inEnemyLoadout = monsterSkillIds.includes(skill.id);
            const inActiveLoadout = activeLoadoutIds.includes(skill.id);
            const loadoutFull = activeLoadoutIds.length >= 6;
            const skillElement = getSkillElement(skill);
            const elementColor = skillElement !== 'none' ? ELEMENT_CONFIG[skillElement as Element]?.color : undefined;

            return (
              <div
                key={skill.id}
                className={`
                  ${styles.skillCard}
                  ${isSelected ? styles.skillCardSelected : ''}
                  ${isSetup && inActiveLoadout ? styles.skillCardSelected : ''}
                  ${!isSetup && !canUse.canUse && cooldown === 0 ? styles.skillCardDisabled : ''}
                  ${cooldown > 0 ? styles.skillCardCooldown : ''}
                `}
                style={
                  elementColor
                    ? {
                        borderColor: elementColor,
                        boxShadow:
                          isSelected || (isSetup && inActiveLoadout)
                            ? `0 0 0 2px ${elementColor}33`
                            : undefined,
                      }
                    : isSetup && inActiveLoadout
                      ? { boxShadow: '0 0 0 2px rgba(81, 207, 102, 0.35)' }
                      : undefined
                }
                onClick={() => {
                  if (isSetup) {
                    if (loadoutFull || inActiveLoadout) return;
                    if (loadoutTarget === 'player') {
                      setPlayerSkillIds((prev) => [...prev, skill.id]);
                    } else {
                      setMonsterSkillIds((prev) => [...prev, skill.id]);
                    }
                  } else if (canUse.canUse) {
                    setSelectedSkill(skill);
                  }
                }}
              >
                {isSetup && (inPlayerLoadout || inEnemyLoadout) && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                    {inPlayerLoadout && (
                      <span style={{ fontSize: 10, color: '#51cf66', border: '1px solid #51cf66', borderRadius: 3, padding: '0 4px' }}>
                        P
                      </span>
                    )}
                    {inEnemyLoadout && (
                      <span style={{ fontSize: 10, color: '#ff6b6b', border: '1px solid #ff6b6b', borderRadius: 3, padding: '0 4px' }}>
                        E
                      </span>
                    )}
                  </div>
                )}
                <div className={styles.skillCardHeader}>
                  <span className={styles.skillName} style={{ color: elementColor }}>
                    {skillElement !== 'none' && <ElementGlyph element={skillElement as Element} />}
                    {skill.name}
                  </span>
                  <span className={styles.skillMp}>
                    <ThunderboltOutlined /> {skill.mpCost}
                  </span>
                </div>
                <div className={styles.skillCardStats}>
                  <span className={styles.skillDamage}>{skill.power}×ATK</span>
                  {skill.maxCooldown > 0 && (
                    <span className={styles.skillCooldown}>
                      CD:{' '}
                      {cooldown > 0 ? (
                        <>
                          <ClockCircleOutlined /> {cooldown}
                        </>
                      ) : (
                        skill.maxCooldown
                      )}
                    </span>
                  )}
                </div>
                {skill.attachElement && skill.attachElement.element !== 'random' && (
                  <div className={styles.skillElement} style={{ color: elementColor }}>
                    Attach: {ELEMENT_CONFIG[skill.attachElement.element].emoji}
                    {ELEMENT_CONFIG[skill.attachElement.element].name}·
                    {ELEMENT_STRENGTH_CONFIG[skill.attachElement.strength].name}
                  </div>
                )}
                {skill.reactionTrigger && skill.reactionTrigger.length > 0 && (
                  <div className={styles.skillReaction}>
                    {skill.reactionTrigger.map((rt, i) => (
                      <span key={i}>
                        vs {ELEMENT_CONFIG[rt.element].emoji}
                        {ELEMENT_CONFIG[rt.element].name} → {REACTION_CONFIG[rt.reaction].emoji}
                        {REACTION_CONFIG[rt.reaction].name}
                      </span>
                    ))}
                  </div>
                )}
                {!isSetup && !canUse.canUse && cooldown === 0 && (
                  <div style={{ color: '#ff8787', fontSize: 11, marginTop: 4 }}>
                    {canUse.reason}
                  </div>
                )}
                {cooldown > 0 && (
                  <div style={{ color: '#ffd43b', fontSize: 11, marginTop: 4 }}>
                    <ClockCircleOutlined /> On cooldown ({cooldown} turn{cooldown === 1 ? '' : 's'})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBattleLog = () => {
    if (!battleState) {
      return null;
    }

    return (
      <div className={styles.battleLog}>
        <div className={styles.battleLogHeader}>
          <span className={styles.battleLogTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <HistoryOutlined /> Battle log
          </span>
        </div>
        <div className={styles.battleLogContent} ref={logRef}>
          {battleState.battleLogs.map((entry, index) => formatLogEntry(entry, index, playerConfig.name))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleState?.battleLogs.length]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <ThunderboltOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Battle simulator v2.0</h1>
            <p>Element reactions · Deterministic combat · Strategy</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/simulation-system/battle/skills" className={styles.backButton}>
            Skill sheet
          </Link>
          <Link href="/simulation-system" className={styles.backButton}>
            <ArrowLeftOutlined /> Back
          </Link>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.battleRow}>
          {renderConfigPanel()}
          <div className={styles.rightColumn}>
            {arenaConfig ? (
              <div className={styles.battleStage}>
                <div className={styles.mapSlot}>
                  <BattleArena config={arenaConfig} onStop={handleReset} />
                </div>
              </div>
            ) : (
              <>
                {renderBattleStage()}
                {renderSkillSelector()}
                {renderBattleLog()}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
