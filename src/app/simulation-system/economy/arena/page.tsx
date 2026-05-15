'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, InputNumber, Table, Tag, Button, Slider, Tabs, message } from 'antd';
import { TrophyOutlined, ThunderboltOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  ARENA_RANK_DATA,
  calculateDailyRankReward,
  calculateChallengeReward,
  getRankTierName,
} from '../data/arena';
import styles from './Arena.module.css';

/** Arena rewards and rank pacing. */
export default function ArenaPage() {
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [playerLevel, setPlayerLevel] = useState<number>(100);
  const [currentRank, setCurrentRank] = useState<number>(100);
  const [targetRank, setTargetRank] = useState<number>(50);
  const [dailyChallenges, setDailyChallenges] = useState<number>(10);
  const [winRate, setWinRate] = useState<number>(0.5);

  const dailyReward = useMemo(() => {
    return calculateDailyRankReward(currentRank, playerLevel);
  }, [currentRank, playerLevel]);

  const challengeReward = useMemo(() => {
    const targetLevel = playerLevel;
    const avgSilver =
      calculateChallengeReward(true, playerLevel, targetLevel, currentRank).silver * winRate +
      calculateChallengeReward(false, playerLevel, targetLevel, currentRank).silver * (1 - winRate);
    const avgPrestige = 200 * winRate + 160 * (1 - winRate);
    return { silver: avgSilver, prestige: avgPrestige };
  }, [playerLevel, currentRank, winRate]);

  const totalDailyReward = useMemo(() => {
    const challengesSilver = challengeReward.silver * dailyChallenges;
    const challengesPrestige = challengeReward.prestige * dailyChallenges;
    return {
      silver: dailyReward.silver + challengesSilver,
      prestige: dailyReward.prestige + Math.floor(challengesPrestige),
    };
  }, [dailyReward, challengeReward, dailyChallenges]);

  const daysToRankUp = useMemo(() => {
    if (targetRank >= currentRank) return Infinity;

    const rankDiff = currentRank - targetRank;
    const netPrestigePerDay = totalDailyReward.prestige;

    if (netPrestigePerDay <= 0) return Infinity;
    return Math.ceil((rankDiff * 100) / netPrestigePerDay);
  }, [currentRank, targetRank, totalDailyReward.prestige]);

  const rankColumns: ColumnsType<{ rank: number; prestigeReward: number; silverReward: number; tier: string }> = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      align: 'center',
      render: (rank) => <strong>#{rank}</strong>,
    },
    {
      title: 'Tier',
      dataIndex: 'tier',
      key: 'tier',
      width: 150,
      render: (tier) => <Tag color="gold">{tier}</Tag>,
    },
    {
      title: 'Prestige / day',
      dataIndex: 'prestigeReward',
      key: 'prestigeReward',
      width: 150,
      align: 'right',
      render: (val) => <span style={{ color: '#eb2f96' }}>{val.toLocaleString()}</span>,
    },
    {
      title: 'Silver / day',
      dataIndex: 'silverReward',
      key: 'silverReward',
      align: 'right',
      render: (val) => <span style={{ color: '#fa8c16' }}>{val.toLocaleString()}</span>,
    },
  ];

  const rankTableData = useMemo(
    () =>
      ARENA_RANK_DATA.slice(0, 50).map((data) => ({
        ...data,
        tier: getRankTierName(data.rank),
      })),
    [],
  );

  const handleReset = useCallback(() => {
    setPlayerLevel(100);
    setCurrentRank(100);
    setTargetRank(50);
    setDailyChallenges(10);
    setWinRate(0.5);
    message.success('Reset complete');
  }, []);

  const tabItems = [
    {
      key: 'calculator',
      label: (
        <span>
          <ThunderboltOutlined /> Calculator
        </span>
      ),
      children: (
        <div className={styles.calcContent}>
          <div className={styles.calcPanel}>
            <Card className={styles.configCard} title="Basics">
              <div className={styles.inputItem}>
                <label>Player level:</label>
                <InputNumber
                  min={1}
                  max={200}
                  value={playerLevel}
                  onChange={(v) => setPlayerLevel(v ?? 1)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className={styles.inputItem}>
                <label>Current rank:</label>
                <InputNumber
                  min={1}
                  max={5000}
                  value={currentRank}
                  onChange={(v) => setCurrentRank(v ?? 1)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className={styles.inputItem}>
                <label>Target rank:</label>
                <InputNumber
                  min={1}
                  max={currentRank}
                  value={targetRank}
                  onChange={(v) => setTargetRank(v ?? 1)}
                  style={{ width: '100%' }}
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
              <div className={styles.rewardHeader}>
                <TrophyOutlined className={styles.rewardIcon} />
                <span>Current rank #{currentRank}</span>
                <Tag color="gold">{getRankTierName(currentRank)}</Tag>
              </div>
              <div className={styles.rewardGrid}>
                <div className={styles.rewardItem}>
                  <DollarOutlined className={styles.silverIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue}>{dailyReward.silver.toLocaleString()}</div>
                    <div className={styles.rewardLabel}>Daily silver</div>
                  </div>
                </div>
                <div className={styles.rewardItem}>
                  <RiseOutlined className={styles.prestigeIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue}>{dailyReward.prestige.toLocaleString()}</div>
                    <div className={styles.rewardLabel}>Daily prestige</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles.resultCard}>
              <div className={styles.rewardHeader}>
                <ThunderboltOutlined className={styles.challengeIcon} />
                <span>Average per challenge</span>
              </div>
              <div className={styles.rewardGrid}>
                <div className={styles.rewardItem}>
                  <DollarOutlined className={styles.silverIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue}>{challengeReward.silver.toLocaleString()}</div>
                    <div className={styles.rewardLabel}>Silver</div>
                  </div>
                </div>
                <div className={styles.rewardItem}>
                  <RiseOutlined className={styles.prestigeIcon} />
                  <div className={styles.rewardContent}>
                    <div className={styles.rewardValue}>{challengeReward.prestige.toFixed(0)}</div>
                    <div className={styles.rewardLabel}>Prestige</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span>Daily total</span>
                <span className={styles.challengesNote}>({dailyChallenges} attempts)</span>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue}>{totalDailyReward.silver.toLocaleString()}</div>
                  <div className={styles.summaryLabel}>Silver</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue}>{totalDailyReward.prestige.toLocaleString()}</div>
                  <div className={styles.summaryLabel}>Prestige</div>
                </div>
              </div>
            </Card>

            <Card className={styles.rankUpCard}>
              <div className={styles.rankUpHeader}>
                <span>Rank-up estimate</span>
              </div>
              <div className={styles.rankUpContent}>
                <div className={styles.rankUpRange}>
                  <Tag color="blue"># {currentRank}</Tag>
                  <span>→</span>
                  <Tag color="green"># {targetRank}</Tag>
                </div>
                {daysToRankUp === Infinity ? (
                  <div className={styles.rankUpWarning}>No net prestige gain; cannot rank up</div>
                ) : daysToRankUp > 365 ? (
                  <div className={styles.rankUpWarning}>About {Math.ceil(daysToRankUp / 30)}+ months</div>
                ) : (
                  <div className={styles.rankUpDays}>
                    <span className={styles.daysNumber}>{daysToRankUp}</span>
                    <span className={styles.daysLabel}>days</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'rankings',
      label: (
        <span>
          <TrophyOutlined /> Rank rewards
        </span>
      ),
      children: (
        <Card className={styles.tableCard}>
          <Table
            columns={rankColumns}
            dataSource={rankTableData}
            pagination={{ pageSize: 10 }}
            size="small"
            rowKey="rank"
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
            <TrophyOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Arena</h1>
            <p>Rewards and rank pacing</p>
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
