'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button, InputNumber, Select, Card, Table, Tag, Space, message, Alert } from 'antd';
import { BankOutlined, DollarOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  LEVELS,
  LEVEL_TYPE_CONFIG,
  STAMINA_CONFIG,
  getLevelById,
  getLevelsByType,
  parseLevelCost,
  calculateLevelReward,
  calculateTotalStaminaCost,
  formatRecoveryTime,
} from '../data/levels';
import type { Level, LevelType } from '../types';
import styles from './Levels.module.css';

/** Stage stamina and reward calculator. */
export default function LevelsPage() {
  const [playerLevel, setPlayerLevel] = useState<number>(100);
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([100001, 100002, 100003]);
  const [selectedType, setSelectedType] = useState<LevelType | null>(null);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);

  const filteredLevels = useMemo(() => {
    const selected = selectedLevelIds
      .map((id) => getLevelById(id))
      .filter((l): l is Level => l !== undefined);

    if (!selectedType) {
      return selected;
    }
    return selected.filter((l) => l.type === selectedType);
  }, [selectedLevelIds, selectedType]);

  const typeStats = useMemo(() => {
    const selected = selectedLevelIds
      .map((id) => getLevelById(id))
      .filter((l): l is Level => l !== undefined);

    if (!selectedType) {
      return {
        count: selected.length,
        avgStamina:
          selected.length > 0
            ? Math.round(
                selected.reduce((sum, l) => {
                  const cost = parseLevelCost(l.cost);
                  return sum + (cost?.type === 'stamina' ? cost.amount : 0);
                }, 0) / selected.length,
              )
            : 0,
        totalStamina: calculateTotalStaminaCost(selectedLevelIds),
      };
    }
    const levels = selected.filter((l) => l.type === selectedType);
    return {
      count: levels.length,
      avgStamina:
        levels.length > 0
          ? Math.round(
              levels.reduce((sum, l) => {
                const cost = parseLevelCost(l.cost);
                return sum + (cost?.type === 'stamina' ? cost.amount : 0);
              }, 0) / levels.length,
            )
          : 0,
      totalStamina: calculateTotalStaminaCost(levels.map((l) => l.id)),
    };
  }, [selectedLevelIds, selectedType]);

  const totalStaminaCost = useMemo(() => {
    return calculateTotalStaminaCost(filteredLevels.map((l) => l.id));
  }, [filteredLevels]);

  const totalRewards = useMemo(() => {
    let silver = 0;
    let exp = 0;
    let gold = 0;

    for (const level of filteredLevels) {
      const reward = calculateLevelReward(level, playerLevel, isFirstTime);
      silver += reward.silver;
      exp += reward.exp;
      gold += reward.gold;
    }

    return { silver, exp, gold };
  }, [filteredLevels, playerLevel, isFirstTime]);

  const recoveryTime = useMemo(() => {
    if (totalStaminaCost <= STAMINA_CONFIG.maxStamina) {
      return 0;
    }
    const needed = totalStaminaCost - STAMINA_CONFIG.maxStamina;
    return needed * STAMINA_CONFIG.recoveryInterval;
  }, [totalStaminaCost]);

  const toggleLevel = useCallback((id: number) => {
    setSelectedLevelIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return [...prev, id];
    });
  }, []);

  const selectAllCurrentType = useCallback(() => {
    const levels = selectedType ? getLevelsByType(selectedType) : LEVELS;
    setSelectedLevelIds(levels.map((l) => l.id));
    message.success(`Selected all: ${levels.length}`);
  }, [selectedType]);

  const clearAllSelection = useCallback(() => {
    setSelectedLevelIds([]);
    message.success('Selection cleared');
  }, []);

  const handleReset = useCallback(() => {
    setSelectedLevelIds([]);
    setPlayerLevel(100);
    setSelectedType(null);
    message.success('Reset complete');
  }, []);

  const levelColumns: ColumnsType<Level> = [
    {
      title: 'Stage',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (name, record) => (
        <span>
          <Tag color={LEVEL_TYPE_CONFIG[record.type].color} style={{ marginRight: 6, fontSize: 10 }}>
            {record.type.split('·')[0]}
          </Tag>
          {name}
        </span>
      ),
    },
    {
      title: 'Cost',
      key: 'cost',
      width: 90,
      align: 'center',
      render: (_, record) => {
        const cost = parseLevelCost(record.cost);
        if (!cost) return '-';
        if (cost.type === 'none') return <Tag color="green">Free</Tag>;
        if (cost.type === 'stamina') return <Tag color="blue">{cost.amount}</Tag>;
        if (cost.type === 'reset') return <Tag color="orange">Reset</Tag>;
        return '-';
      },
    },
    {
      title: 'Silver',
      key: 'silver',
      width: 90,
      align: 'right',
      render: (_, record) => {
        const r = calculateLevelReward(record, playerLevel, isFirstTime);
        return <span style={{ color: '#fa8c16' }}>{r.silver.toLocaleString()}</span>;
      },
    },
    {
      title: 'EXP',
      key: 'exp',
      width: 70,
      align: 'right',
      render: (_, record) => {
        const r = calculateLevelReward(record, playerLevel, isFirstTime);
        return <span style={{ color: '#1890ff' }}>{r.exp.toLocaleString()}</span>;
      },
    },
    {
      title: 'Gold',
      key: 'gold',
      width: 70,
      align: 'right',
      render: (_, record) => {
        const r = calculateLevelReward(record, playerLevel, isFirstTime);
        return <span style={{ color: '#722ed1' }}>{r.gold}</span>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Button
          type={selectedLevelIds.includes(record.id) ? 'primary' : 'default'}
          size="small"
          onClick={() => toggleLevel(record.id)}
        >
          {selectedLevelIds.includes(record.id) ? 'Selected' : 'Select'}
        </Button>
      ),
    },
  ];

  const rewardColumns: ColumnsType<{
    key: number;
    name: string;
    type: LevelType;
    costAmount: number;
    silver: number;
    exp: number;
    gold: number;
  }> = [
    {
      title: 'Stage',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: 'Stamina',
      dataIndex: 'costAmount',
      key: 'costAmount',
      width: 70,
      align: 'center',
      render: (val) => (val > 0 ? `${val}` : 'Free'),
    },
    {
      title: 'Silver',
      dataIndex: 'silver',
      key: 'silver',
      width: 100,
      align: 'right',
      render: (val) => val.toLocaleString(),
    },
    {
      title: 'EXP',
      dataIndex: 'exp',
      key: 'exp',
      width: 80,
      align: 'right',
      render: (val) => val.toLocaleString(),
    },
    {
      title: 'Gold',
      dataIndex: 'gold',
      key: 'gold',
      width: 70,
      align: 'right',
      render: (val) => (
        <span style={{ color: val > 0 ? '#722ed1' : '#8c8c8c' }}>{val > 0 ? val : '-'}</span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Button type="text" danger size="small" onClick={() => toggleLevel(record.key)}>
          Remove
        </Button>
      ),
    },
  ];

  const rewardTableData = useMemo(() => {
    return filteredLevels.map((level) => {
      const reward = calculateLevelReward(level, playerLevel, isFirstTime);
      const cost = parseLevelCost(level.cost);
      return {
        key: level.id,
        name: level.name,
        type: level.type,
        costAmount: cost?.type === 'stamina' ? cost.amount : 0,
        silver: reward.silver,
        exp: reward.exp,
        gold: reward.gold,
      };
    });
  }, [filteredLevels, playerLevel, isFirstTime]);

  const typeOptions = useMemo(() => {
    const selected = selectedLevelIds
      .map((id) => getLevelById(id))
      .filter((l): l is Level => l !== undefined);

    const typeCounts: Record<string, number> = {};
    selected.forEach((l) => {
      typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
    });

    return [
      { value: null, label: `All (${selected.length})` },
      ...Object.entries(LEVEL_TYPE_CONFIG).map(([key, config]) => ({
        value: key as LevelType,
        label: `${config.label} (${typeCounts[key] || 0})`,
      })),
    ];
  }, [selectedLevelIds]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <BankOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Levels</h1>
            <p>Stamina spend and clear rewards</p>
          </div>
        </div>
        <Link href="/simulation-system/economy/overview" className={styles.backButton}>
          Back
        </Link>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.calcContent}>
          <div className={styles.calcPanel}>
            <Card className={styles.configCard} title="Basics">
              <div className={styles.inputItem}>
                <label>Player level</label>
                <InputNumber
                  min={1}
                  max={200}
                  value={playerLevel}
                  onChange={(v) => setPlayerLevel(v ?? 1)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className={styles.inputItem}>
                <label>Level type</label>
                <Select style={{ width: '100%' }} value={selectedType} onChange={setSelectedType} options={typeOptions} />
                {selectedType && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                    <Tag color={LEVEL_TYPE_CONFIG[selectedType].color}>{LEVEL_TYPE_CONFIG[selectedType].label}</Tag>
                    <span>
                      {' '}
                      {typeStats.count} stages · avg {typeStats.avgStamina} stamina
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.inputItem}>
                <label>Clear mode</label>
                <Select
                  style={{ width: '100%' }}
                  value={isFirstTime}
                  onChange={(v) => setIsFirstTime(v ?? false)}
                  options={[
                    { value: false, label: 'Repeat clears (normal rewards)' },
                    { value: true, label: 'First clear (2.5× rewards + gold)' },
                  ]}
                />
                {isFirstTime && (
                  <div style={{ marginTop: 8 }}>
                    <Tag color="gold">First-clear bonus ×2.5</Tag>
                    <Tag color="purple">Extra gold</Tag>
                  </div>
                )}
              </div>
            </Card>

            <Card className={styles.configCard} title="Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Button onClick={selectAllCurrentType}>Select all (filtered type)</Button>
                <Button onClick={clearAllSelection}>Clear selection</Button>
                <Button danger onClick={handleReset}>
                  Reset
                </Button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#8c8c8c' }}>
                <div>Recovery interval: {STAMINA_CONFIG.recoveryInterval} min</div>
                <div>Max stamina: {STAMINA_CONFIG.maxStamina}</div>
              </div>
            </Card>
          </div>

          <div className={styles.calcResults}>
            <Card className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span>{typeStats.count} stage(s) selected</span>
                <Tag color={isFirstTime ? 'gold' : 'blue'}>{isFirstTime ? 'First clear' : 'Repeat'}</Tag>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue} style={{ color: '#52c41a' }}>
                    {typeStats.count}
                  </div>
                  <div className={styles.summaryLabel}>Selected</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue} style={{ color: '#1890ff' }}>
                    {totalStaminaCost}
                  </div>
                  <div className={styles.summaryLabel}>Stamina cost</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue} style={{ color: recoveryTime > 0 ? '#fa8c16' : '#52c41a' }}>
                    {recoveryTime > 0 ? formatRecoveryTime(recoveryTime) : 'Enough cap'}
                  </div>
                  <div className={styles.summaryLabel}>Recovery ETA</div>
                </div>
              </div>
            </Card>

            <Card className={styles.resultCard}>
              <div className={styles.rewardHeader}>
                <span>Rewards</span>
              </div>
              <div className={styles.rewardGrid}>
                <div className={styles.rewardItem}>
                  <DollarOutlined className={styles.rewardIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue}>{totalRewards.silver.toLocaleString()}</div>
                    <div className={styles.rewardLabel}>Silver</div>
                  </div>
                </div>
                <div className={styles.rewardItem}>
                  <ExperimentOutlined className={styles.expIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue}>{totalRewards.exp.toLocaleString()}</div>
                    <div className={styles.rewardLabel}>EXP</div>
                  </div>
                </div>
                <div className={styles.rewardItem}>
                  <DollarOutlined className={styles.goldIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue} style={{ color: '#722ed1' }}>
                      {totalRewards.gold > 0 ? totalRewards.gold : '-'}
                    </div>
                    <div className={styles.rewardLabel}>Gold</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles.tableCard}>
              <div className={styles.rewardHeader}>
                <span>Details</span>
                <Tag>{filteredLevels.length} stage(s)</Tag>
              </div>
              {rewardTableData.length > 0 ? (
                <Table
                  columns={rewardColumns}
                  dataSource={rewardTableData}
                  pagination={false}
                  size="small"
                  rowKey="key"
                  scroll={{ y: 250 }}
                />
              ) : (
                <Alert message="Select at least one stage" type="info" showIcon />
              )}
            </Card>

            <Card className={styles.tableCard} title="Stage list">
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Select
                  placeholder="Filter by type"
                  style={{ width: 180 }}
                  value={selectedType}
                  onChange={setSelectedType}
                  options={typeOptions}
                />
                <Space>
                  <Button type="primary" onClick={selectAllCurrentType}>
                    Select all (this type)
                  </Button>
                  <Button onClick={clearAllSelection}>Clear selection</Button>
                </Space>
              </div>
              <Table
                columns={levelColumns}
                dataSource={selectedType ? getLevelsByType(selectedType) : LEVELS}
                pagination={{ pageSize: 10 }}
                size="small"
                rowKey="id"
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
