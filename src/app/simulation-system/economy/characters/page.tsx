'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, Select, Table, Tag, Button, Slider, message } from 'antd';
import {
  UserOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  HeartOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  CHARACTERS,
  getCharacterById,
  getTalentById,
  getSkillById,
  calculateCharacterStats,
} from '../data/characters';
import { CAMP_COLORS, RARITY_CONFIG } from '../types';
import styles from './Characters.module.css';

/** Character growth and stat calculator. */
export default function CharactersPage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<number>(1001);
  const [talentLevel, setTalentLevel] = useState<number>(1);
  const [enhanceLevel, setEnhanceLevel] = useState<number>(0);
  const [starLevel, setStarLevel] = useState<number>(1);

  const selectedCharacter = useMemo(() => getCharacterById(selectedCharacterId), [selectedCharacterId]);

  const currentStats = useMemo(() => {
    if (!selectedCharacter) return null;

    const baseStats = calculateCharacterStats(selectedCharacter, talentLevel);
    const enhanceMultiplier = 1 + enhanceLevel * 0.05;
    const starMultiplier = 1 + (starLevel - 1) * 0.1;

    return {
      atk: Math.floor(baseStats.atk * enhanceMultiplier * starMultiplier),
      life: Math.floor(baseStats.life * enhanceMultiplier * starMultiplier),
      def: Math.floor(baseStats.def * enhanceMultiplier * starMultiplier),
      mdf: Math.floor(baseStats.mdf * enhanceMultiplier * starMultiplier),
    };
  }, [selectedCharacter, talentLevel, enhanceLevel, starLevel]);

  const characterTalents = useMemo(() => {
    if (!selectedCharacter) return [];
    return selectedCharacter.talentIds
      .map((id) => getTalentById(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [selectedCharacter]);

  const characterSkills = useMemo(() => {
    if (!selectedCharacter) return [];
    return selectedCharacter.skillIds
      .map((id) => getSkillById(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
  }, [selectedCharacter]);

  const characterOptions = useMemo(
    () =>
      CHARACTERS.map((c) => ({
        value: c.id,
        label: (
          <span>
            <Tag color={CAMP_COLORS[c.camp]} style={{ marginRight: 8 }}>
              {c.camp}
            </Tag>
            <Tag color={RARITY_CONFIG[c.rarity].color}>{RARITY_CONFIG[c.rarity].label}</Tag>
            {c.name} (APT {c.int})
          </span>
        ),
      })),
    [],
  );

  const statColumns: ColumnsType<{ key: string; label: string; base: number; enhanced: number; total: number }> = [
    {
      title: 'Stat',
      dataIndex: 'label',
      key: 'label',
      width: 150,
    },
    {
      title: 'Base',
      dataIndex: 'base',
      key: 'base',
      width: 120,
      align: 'right',
    },
    {
      title: 'From enhance',
      key: 'enhanced',
      width: 120,
      align: 'right',
      render: (_, record) => <span style={{ color: '#52c41a' }}>+{record.enhanced - record.base}</span>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (val) => <strong>{val.toLocaleString()}</strong>,
    },
  ];

  const statTableData = useMemo(() => {
    if (!selectedCharacter || !currentStats) return [];

    return [
      {
        key: 'atk',
        label: 'ATK',
        base: selectedCharacter.baseStats.atk,
        enhanced: currentStats.atk,
        total: currentStats.atk,
      },
      {
        key: 'life',
        label: 'HP',
        base: selectedCharacter.baseStats.life,
        enhanced: currentStats.life,
        total: currentStats.life,
      },
      {
        key: 'def',
        label: 'DEF',
        base: selectedCharacter.baseStats.def,
        enhanced: currentStats.def,
        total: currentStats.def,
      },
      {
        key: 'mdf',
        label: 'MDF',
        base: selectedCharacter.baseStats.mdf,
        enhanced: currentStats.mdf,
        total: currentStats.mdf,
      },
    ];
  }, [selectedCharacter, currentStats]);

  const talentColumns: ColumnsType<{ id: number; name: string; level: number; effect: string; active: boolean }> = [
    {
      title: 'Talent',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Unlock stage',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center',
    },
    {
      title: 'Effect',
      dataIndex: 'effect',
      key: 'effect',
      ellipsis: true,
    },
    {
      title: 'Status',
      key: 'active',
      width: 100,
      align: 'center',
      render: (_, record) =>
        record.active ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
  ];

  const talentTableData = useMemo(
    () =>
      characterTalents.map((t) => ({
        ...t,
        active: t.level <= talentLevel,
      })),
    [characterTalents, talentLevel],
  );

  const skillColumns: ColumnsType<{ id: number; name: string; type: string; description: string }> = [
    {
      title: 'Skill',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      align: 'center',
      render: (type) => (
        <Tag color={type === 'Basic' ? 'blue' : 'red'}>{type}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
  ];

  const handleReset = useCallback(() => {
    setTalentLevel(1);
    setEnhanceLevel(0);
    setStarLevel(1);
    message.success('Reset complete');
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <UserOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Characters</h1>
            <p>Stat growth and talent gates</p>
          </div>
        </div>
        <Link href="/simulation-system/economy/overview" className={styles.backButton}>
          Back
        </Link>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.configPanel}>
          <Card className={styles.configCard} title="Hero">
            <Select
              style={{ width: '100%' }}
              value={selectedCharacterId}
              onChange={setSelectedCharacterId}
              options={characterOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />

            {selectedCharacter && (
              <div className={styles.characterInfo}>
                <div className={styles.characterHeader}>
                  <Tag color={CAMP_COLORS[selectedCharacter.camp]}>{selectedCharacter.camp}</Tag>
                  <Tag color={RARITY_CONFIG[selectedCharacter.rarity].color}>
                    {RARITY_CONFIG[selectedCharacter.rarity].label}
                  </Tag>
                </div>
                <div className={styles.characterStats}>
                  <span>
                    <HeartOutlined /> APT: {selectedCharacter.int}
                  </span>
                </div>
              </div>
            )}
          </Card>

          <Card className={styles.configCard} title="Stats">
            <div className={styles.sliderItem}>
              <div className={styles.sliderLabel}>
                <span>Talent stage</span>
                <strong>{talentLevel}</strong>
              </div>
              <Slider min={1} max={12} value={talentLevel} onChange={setTalentLevel} marks={{ 1: '1', 6: '6', 12: '12' }} />
            </div>

            <div className={styles.sliderItem}>
              <div className={styles.sliderLabel}>
                <span>Enhance level</span>
                <strong>+{enhanceLevel * 5}%</strong>
              </div>
              <Slider
                min={0}
                max={30}
                value={enhanceLevel}
                onChange={setEnhanceLevel}
                marks={{ 0: '0', 15: '+75%', 30: '+150%' }}
              />
            </div>

            <div className={styles.sliderItem}>
              <div className={styles.sliderLabel}>
                <span>Stars</span>
                <strong>
                  {starLevel}★
                </strong>
              </div>
              <Slider min={1} max={6} value={starLevel} onChange={setStarLevel} marks={{ 1: '1', 3: '3', 6: '6' }} />
            </div>

            <Button type="default" onClick={handleReset} block style={{ marginTop: 16 }}>
              Reset
            </Button>
          </Card>
        </div>

        <div className={styles.resultsPanel}>
          <Card className={styles.resultCard} title="Overview">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <ThunderboltOutlined />
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{currentStats?.atk.toLocaleString() || 0}</div>
                  <div className={styles.statLabel}>ATK</div>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <HeartOutlined />
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{currentStats?.life.toLocaleString() || 0}</div>
                  <div className={styles.statLabel}>HP</div>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <SafetyOutlined />
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{currentStats?.def.toLocaleString() || 0}</div>
                  <div className={styles.statLabel}>DEF</div>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <ExperimentOutlined />
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{currentStats?.mdf.toLocaleString() || 0}</div>
                  <div className={styles.statLabel}>MDF</div>
                </div>
              </div>
            </div>

            <div className={styles.bonusSummary}>
              <span className={styles.bonusItem}>
                <Tag color="blue">Talent</Tag>+{talentLevel - 1} stage(s)
              </span>
              <span className={styles.bonusItem}>
                <Tag color="green">Enhance</Tag>+{enhanceLevel * 5}%
              </span>
              <span className={styles.bonusItem}>
                <Tag color="orange">Stars</Tag>+{(starLevel - 1) * 10}%
              </span>
              <span className={styles.bonusItem}>
                <Tag color="purple">Combined</Tag>
                {((1 + enhanceLevel * 0.05) * (1 + (starLevel - 1) * 0.1) - 1).toFixed(0)}%
              </span>
            </div>
          </Card>

          <Card className={styles.resultCard} title="Stat breakdown">
            <Table columns={statColumns} dataSource={statTableData} pagination={false} size="small" rowKey="key" />
          </Card>

          <Card className={styles.resultCard} title={`Talents (${characterTalents.length})`}>
            <Table
              columns={talentColumns}
              dataSource={talentTableData}
              pagination={false}
              size="small"
              rowKey="id"
              rowClassName={(record) => (record.active ? styles.talentActive : '')}
            />
          </Card>

          <Card className={styles.resultCard} title={`Skills (${characterSkills.length})`}>
            <Table columns={skillColumns} dataSource={characterSkills} pagination={false} size="small" rowKey="id" />
          </Card>
        </div>
      </main>
    </div>
  );
}
