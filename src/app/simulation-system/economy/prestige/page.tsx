'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, Select, InputNumber, Table, Tag, Button, Slider, Tabs, Progress, message } from 'antd';
import { StarOutlined, ThunderboltOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  PRESTIGE_LEVELS,
  PRESTIGE_TIERS,
  getPrestigeLevelByLevel,
  getCurrentPrestigeInfo,
  calculateDailyPrestigeGain,
} from '../data/prestige';
import type { PrestigeLevel } from '../types';
import styles from './Prestige.module.css';

/** Prestige tier pacing and daily tax model. */
export default function PrestigePage() {
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [currentPrestige, setCurrentPrestige] = useState<number>(5000);
  const [targetLevel, setTargetLevel] = useState<number>(10);
  const [dailyChallenges, setDailyChallenges] = useState<number>(10);
  const [winRate, setWinRate] = useState<number>(0.5);

  const prestigeInfo = useMemo(() => {
    return getCurrentPrestigeInfo(currentPrestige);
  }, [currentPrestige]);

  const dailyPrestigeGain = useMemo(() => {
    return calculateDailyPrestigeGain(prestigeInfo.currentLevel, dailyChallenges, winRate);
  }, [prestigeInfo.currentLevel, dailyChallenges, winRate]);

  const daysToTarget = useMemo(() => {
    const targetData = getPrestigeLevelByLevel(targetLevel);
    if (!targetData) return Infinity;

    const required = targetData.requiredPrestige;
    if (currentPrestige >= required) return 0;

    const diff = required - currentPrestige;
    if (dailyPrestigeGain <= 0) return Infinity;

    return Math.ceil(diff / dailyPrestigeGain);
  }, [currentPrestige, targetLevel, dailyPrestigeGain]);

  const currentLevelData = useMemo(() => {
    return getPrestigeLevelByLevel(prestigeInfo.currentLevel);
  }, [prestigeInfo.currentLevel]);

  const prestigeColumns: ColumnsType<PrestigeLevel> = [
    {
      title: 'Tier',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center',
      render: (level) => <strong>{level}</strong>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name) => <Tag color="purple">{name}</Tag>,
    },
    {
      title: 'Required prestige',
      dataIndex: 'requiredPrestige',
      key: 'requiredPrestige',
      width: 120,
      align: 'right',
      render: (val) => val.toLocaleString(),
    },
    {
      title: 'Daily cost',
      dataIndex: 'dailyCost',
      key: 'dailyCost',
      width: 100,
      align: 'right',
      render: (val) => (val > 0 ? val.toLocaleString() : '-'),
    },
    {
      title: 'Daily gain',
      dataIndex: 'dailyGain',
      key: 'dailyGain',
      width: 100,
      align: 'right',
      render: (val) => (
        <span style={{ color: val >= 0 ? '#52c41a' : '#f5222d' }}>
          {val >= 0 ? '+' : ''}
          {val}
        </span>
      ),
    },
    {
      title: 'Silver reward',
      dataIndex: 'silverReward',
      key: 'silverReward',
      width: 120,
      align: 'right',
      render: (val) => val.toLocaleString(),
    },
    {
      title: 'Ultimate reward',
      dataIndex: 'ultimateReward',
      key: 'ultimateReward',
      width: 100,
      align: 'right',
    },
  ];

  const levelOptions = useMemo(
    () =>
      PRESTIGE_LEVELS.map((p) => ({
        value: p.level,
        label: `Lv.${p.level} — ${p.name}`,
      })),
    [],
  );

  const handleReset = useCallback(() => {
    setCurrentPrestige(5000);
    setTargetLevel(10);
    setDailyChallenges(10);
    setWinRate(0.5);
    message.success('Reset complete');
  }, []);

  const tabItems = [
    {
      key: 'calculator',
      label: (
        <span>
          <StarOutlined /> Calculator
        </span>
      ),
      children: (
        <div className={styles.calcContent}>
          <div className={styles.calcPanel}>
            <Card className={styles.configCard} title="Prestige">
              <div className={styles.inputItem}>
                <label>Current prestige points:</label>
                <InputNumber
                  min={0}
                  max={1000000}
                  value={currentPrestige}
                  onChange={(v) => setCurrentPrestige(v ?? 0)}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => (value?.replace(/,/g, '') as unknown as number) ?? 0}
                />
              </div>

              <div className={styles.inputItem}>
                <label>Target tier level:</label>
                <Select
                  style={{ width: '100%' }}
                  value={targetLevel}
                  onChange={setTargetLevel}
                  options={levelOptions}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>
            </Card>

            <Card className={styles.configCard} title="Challenges">
              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Daily attempts</span>
                  <strong>{dailyChallenges}</strong>
                </div>
                <Slider
                  min={0}
                  max={20}
                  value={dailyChallenges}
                  onChange={setDailyChallenges}
                  marks={{ 0: '0', 10: '10', 20: '20' }}
                />
              </div>

              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Win rate</span>
                  <strong>{(winRate * 100).toFixed(0)}%</strong>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={winRate * 100}
                  onChange={(v) => setWinRate(v / 100)}
                  marks={{ 0: '0%', 50: '50%', 100: '100%' }}
                />
              </div>
            </Card>

            <Button type="default" onClick={handleReset} block>
              Reset
            </Button>
          </div>

          <div className={styles.calcResults}>
            <Card className={styles.resultCard}>
              <div className={styles.currentPrestige}>
                <div className={styles.currentHeader}>
                  <StarOutlined className={styles.starIcon} />
                  <span>Current tier</span>
                </div>
                <div className={styles.currentLevel}>
                  <span className={styles.levelNumber}>{prestigeInfo.currentLevel}</span>
                  <span className={styles.levelName}>{prestigeInfo.currentName}</span>
                </div>
                <Progress percent={prestigeInfo.progress * 100} strokeColor="#722ed1" trailColor="#f0f0f0" showInfo={false} />
                <div className={styles.progressText}>
                  {currentPrestige.toLocaleString()} / {prestigeInfo.requiredPrestige.toLocaleString()} prestige
                </div>
              </div>
            </Card>

            <Card className={styles.resultCard}>
              <div className={styles.rewardHeader}>
                <ThunderboltOutlined />
                <span>Daily prestige gain</span>
              </div>
              <div className={styles.rewardContent}>
                <div className={styles.rewardValue} style={{ color: dailyPrestigeGain >= 0 ? '#52c41a' : '#f5222d' }}>
                  {dailyPrestigeGain >= 0 ? '+' : ''}
                  {dailyPrestigeGain.toLocaleString()}
                </div>
                <div className={styles.rewardLabel}>Prestige / day</div>
              </div>
              <div className={styles.rewardBreakdown}>
                <div className={styles.breakdownItem}>
                  <span>Base</span>
                  <span>{currentLevelData?.dailyGain ?? 0}</span>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Challenges</span>
                  <span>{Math.floor(dailyChallenges * winRate * (currentLevelData?.winPrestige ?? 0))}</span>
                </div>
              </div>
            </Card>

            <Card className={styles.rankUpCard}>
              <div className={styles.rankUpHeader}>
                <ArrowUpOutlined />
                <span>Promotion estimate</span>
              </div>
              <div className={styles.rankUpContent}>
                <div className={styles.rankUpRange}>
                  <Tag color="purple">
                    Lv.{prestigeInfo.currentLevel} {prestigeInfo.currentName}
                  </Tag>
                  <span>→</span>
                  <Tag color="gold">
                    Lv.{targetLevel} {getPrestigeLevelByLevel(targetLevel)?.name}
                  </Tag>
                </div>

                {daysToTarget === 0 ? (
                  <div className={styles.rankUpComplete}>
                    <StarOutlined /> Already at or above target tier.
                  </div>
                ) : daysToTarget === Infinity ? (
                  <div className={styles.rankUpWarning}>No net prestige gain; cannot promote</div>
                ) : daysToTarget > 365 ? (
                  <div className={styles.rankUpWarning}>About {Math.ceil(daysToTarget / 30)}+ months</div>
                ) : (
                  <div className={styles.rankUpDays}>
                    <span className={styles.daysNumber}>{daysToTarget}</span>
                    <span className={styles.daysLabel}>days</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className={styles.infoCard}>
              <div className={styles.infoHeader}>Tier bands</div>
              <div className={styles.tierList}>
                {Object.entries(PRESTIGE_TIERS).map(([key, tier]) => (
                  <div key={key} className={styles.tierItem}>
                    <Tag color={tier.color}>{tier.label}</Tag>
                    <span className={styles.tierRange}>
                      Lv.{tier.minLevel}–{tier.maxLevel}
                    </span>
                    {prestigeInfo.currentLevel >= tier.minLevel && prestigeInfo.currentLevel <= tier.maxLevel && (
                      <Tag color="green">Current</Tag>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'levels',
      label: (
        <span>
          <StarOutlined /> Tier table
        </span>
      ),
      children: (
        <Card className={styles.tableCard}>
          <Table
            columns={prestigeColumns}
            dataSource={PRESTIGE_LEVELS}
            pagination={{ pageSize: 10 }}
            size="small"
            rowKey="level"
          />
        </Card>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <StarOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Prestige</h1>
            <p>Tier promotion and daily prestige</p>
          </div>
        </div>
        <Link href="/simulation-system/economy/overview" className={styles.backButton}>
          Back
        </Link>
      </header>

      <main className={styles.mainContent}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ width: '100%' }} />
      </main>
    </div>
  );
}
