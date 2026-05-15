'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, InputNumber, Button, Slider, message, Row, Col, Progress, Select, Tag } from 'antd';
import {
  ExperimentOutlined,
  DollarOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  StarOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { calculateDailyPrestigeGain } from '../data/prestige';
import {
  getLevelData,
  getLevelByExp,
  calcLevelProgress,
  formatExp,
  getTierColor,
} from '../data/playerLevel';
import {
  LEVELS,
  calculateLevelReward,
  parseLevelCost,
} from '../data/levels';
import type { Level } from '../types';
import styles from './Calculator.module.css';

type EChartsInstance = echarts.ECharts;

/** Economy calculator — revenue and progression overview. */
export default function CalculatorPage() {
  // Base stats
  const [playerLevel, setPlayerLevel] = useState<number>(100);
  const [prestigeLevel, setPrestigeLevel] = useState<number>(10);
  const [arenaRank, setArenaRank] = useState<number>(100);

  // Arena challenge sliders
  const [arenaChallenges, setArenaChallenges] = useState<number>(10);
  const [arenaWinRate, setArenaWinRate] = useState<number>(50);
  const [levelChallenges, setLevelChallenges] = useState<number>(5);

  // Selected stage ids for daily rewards
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([100001, 100002, 100003, 100004, 100005]);

  // Simulation horizon (days)
  const [simDays, setSimDays] = useState<number>(30);

  // ECharts refs
  const silverChartRef = useRef<HTMLDivElement>(null);
  const prestigeChartRef = useRef<HTMLDivElement>(null);
  const expChartRef = useRef<HTMLDivElement>(null);
  const dailyChartRef = useRef<HTMLDivElement>(null);
  const silverChartInstance = useRef<EChartsInstance | null>(null);
  const prestigeChartInstance = useRef<EChartsInstance | null>(null);
  const expChartInstance = useRef<EChartsInstance | null>(null);
  const dailyChartInstance = useRef<EChartsInstance | null>(null);

  // Current level row
  const currentLevelData = useMemo(() => {
    return getLevelData(playerLevel);
  }, [playerLevel]);

  // Daily totals at a given level
  const calculateDailyTotal = useCallback((level: number) => {
    const levelData = getLevelData(level);

    // --- Silver income ---
    // Targets:
    // - Lv100: ~12k–18k silver/day (~7 days to +50 enhance)
    // - Lv200: ~35k–50k silver/day (~10 days to +50 enhance)
    const silverCurve = (lv: number): number => {
      if (lv <= 50) {
        // 1–50: logarithmic
        return 2000 + 1500 * Math.log(lv + 1);
      } else if (lv <= 100) {
        // 51–100: sqrt
        return 6000 + 2500 * Math.sqrt(lv - 50) * 0.8;
      } else if (lv <= 150) {
        // 101–150: sqrt + linear blend
        return 10000 + 3500 * Math.sqrt(lv - 100) * 0.6 + 60 * (lv - 100);
      } else {
        // 151–200: slower tail
        return 18000 + 2500 * Math.sqrt(lv - 150) * 0.4 + 40 * (lv - 150);
      }
    };

    // Arena daily rank payout (log curve)
    const baseArenaSilver = 3000;
    const arenaMultiplier = Math.log(50 / Math.min(arenaRank, 50)) / Math.log(50) * 2 + 0.8;
    const arenaDailyReward = Math.floor(baseArenaSilver * arenaMultiplier);

    // Arena challenge payout
    const challengeBase = 200;
    const challengeLevelFactor = 1 + Math.log(level + 1) * 0.35;
    const avgChallengeReward = challengeBase * challengeLevelFactor;
    const totalChallengeSilver = Math.floor(avgChallengeReward * arenaChallenges);

    // Stage payout from selection
    const selectedLevels = selectedLevelIds
      .map(id => LEVELS.find(l => l.id === id))
      .filter(Boolean);
    let levelSilver = 0;
    let levelExp = 0;
    for (const lvl of selectedLevels) {
      if (lvl) {
        const reward = calculateLevelReward(lvl, level, false);
        levelSilver += reward.silver;
        levelExp += reward.exp;
      }
    }

    // --- EXP income ---
    const tierMultipliers: Record<string, number> = {
      beginner: 1.0,
      growth: 1.3,
      mid: 1.5,
      late: 1.8,
      end: 2.0,
      apex: 2.5,
    };
    const expMultiplier = tierMultipliers[levelData?.tier || 'beginner'];
    const totalExp = Math.floor(levelExp * expMultiplier);

    // --- Prestige income ---
    const prestigeGain = calculateDailyPrestigeGain(prestigeLevel, arenaChallenges, arenaWinRate / 100);

    // Stamina spend
    const totalStamina = selectedLevels.reduce((sum, lvl) => {
      if (lvl) {
        const cost = parseLevelCost(lvl.cost);
        return sum + (cost?.type === 'stamina' ? cost.amount : 0);
      }
      return sum;
    }, 0);

    return {
      silver: arenaDailyReward + totalChallengeSilver + levelSilver,
      exp: totalExp,
      prestige: prestigeGain,
      staminaCost: totalStamina,
    };
  }, [arenaRank, arenaChallenges, arenaWinRate, prestigeLevel, selectedLevelIds]);

  // Daily totals at current level (summary)
  const dailyTotal = useMemo(() => {
    return calculateDailyTotal(playerLevel);
  }, [calculateDailyTotal, playerLevel]);

  // Day-by-day simulation (level shifts with EXP)
  const simulationData = useMemo(() => {
    const days = [];
    const silverData = [];
    const prestigeData = [];
    const expData = [];
    const levelData = [];
    const dailyExpData = [];
    const dailySilverData = [];

    let cumulativeSilver = 0;
    let cumulativePrestige = 0;
    let cumulativeExp = 0;
    const initialCumulativeExp = currentLevelData?.cumulativeExp || 0;

    for (let i = 1; i <= simDays; i++) {
      days.push(`Day ${i}`);

      // Level from cumulative EXP
      const currentDayLevel = getLevelByExp(initialCumulativeExp + cumulativeExp);

      // Payout curve uses that day level
      const dayTotal = calculateDailyTotal(currentDayLevel);

      cumulativeSilver += dayTotal.silver;
      cumulativePrestige += dayTotal.prestige;
      cumulativeExp += dayTotal.exp;

      silverData.push(cumulativeSilver);
      prestigeData.push(cumulativePrestige);
      expData.push(cumulativeExp);
      levelData.push(currentDayLevel);
      dailyExpData.push(dayTotal.exp);
      dailySilverData.push(dayTotal.silver);
    }

    return {
      days,
      silverData,
      prestigeData,
      expData,
      levelData,
      dailyExpData,
      dailySilverData,
    };
  }, [simDays, currentLevelData, calculateDailyTotal]);

  // Level snapshot at end of horizon
  const levelPrediction = useMemo(() => {
    const finalLevel = simulationData.levelData[simulationData.levelData.length - 1] || playerLevel;
    const totalExp = simulationData.expData[simulationData.expData.length - 1] || 0;
    const progress = calcLevelProgress(
      finalLevel,
      (currentLevelData?.cumulativeExp || 0) + totalExp
    );
    return {
      targetLevel: finalLevel,
      progress: progress.progress,
      totalExp,
      levelsGained: finalLevel - playerLevel,
    };
  }, [simulationData, playerLevel, currentLevelData]);

  // Init charts
  useEffect(() => {
    const initChart = (ref: React.RefObject<HTMLDivElement | null>, instance: React.MutableRefObject<EChartsInstance | null>, title: string, data: number[], color: string, formatter?: (val: number) => string) => {
      if (!ref.current) return;

      if (instance.current) {
        instance.current.dispose();
      }

      const chart = echarts.init(ref.current);
      instance.current = chart;

      const option: echarts.EChartsOption = {
        title: {
          text: title,
          left: 'center',
          textStyle: {
            fontSize: 14,
            fontWeight: 500,
            color: '#595959',
          },
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const day = params[0].name;
            const value = params[0].value;
            return `${day}<br/>${formatter ? formatter(value) : value.toLocaleString()}`;
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: simulationData.days,
          axisLabel: {
            interval: Math.floor(simDays / 5) - 1,
            rotate: 0,
            fontSize: 10,
          },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            fontSize: 10,
            formatter: (val: number) => {
              if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
              if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
              return val.toString();
            },
          },
        },
        series: [
          {
            name: title,
            type: 'line',
            smooth: true,
            data: data,
            lineStyle: {
              color: color,
              width: 3,
            },
            itemStyle: {
              color: color,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: color + '80' },
                { offset: 1, color: color + '10' },
              ]),
            },
            symbol: 'circle',
            symbolSize: 4,
          },
        ],
      };

      chart.setOption(option as any);
    };

    initChart(silverChartRef, silverChartInstance, 'Cumulative silver', simulationData.silverData, '#fa8c16', (val) => `Silver: ${val.toLocaleString()}`);
    initChart(prestigeChartRef, prestigeChartInstance, 'Cumulative prestige', simulationData.prestigeData, '#eb2f96', (val) => `Prestige: ${val.toLocaleString()}`);
    initChart(expChartRef, expChartInstance, 'Cumulative EXP', simulationData.expData, '#1890ff', (val) => `EXP: ${formatExp(val)}`);

    // Level curve
    if (expChartRef.current && expChartInstance.current) {
      expChartInstance.current.dispose();
    }
    const levelChart = echarts.init(expChartRef.current);
    expChartInstance.current = levelChart;
    levelChart.setOption({
      title: {
        text: 'Level over time',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 500, color: '#595959' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const day = params[0].name;
          const level = params[0].value;
          return `${day}<br/>Level: ${level}`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: simulationData.days,
        axisLabel: { interval: Math.floor(simDays / 5) - 1, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        min: playerLevel,
        axisLabel: { fontSize: 10 },
      },
      series: [{
        name: 'Level',
        type: 'line',
        smooth: true,
        data: simulationData.levelData,
        lineStyle: { color: '#52c41a', width: 3 },
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#52c41a80' },
            { offset: 1, color: '#52c41a10' },
          ]),
        },
        symbol: 'circle',
        symbolSize: 4,
      }],
    });

    // Daily silver/exp vs level
    if (dailyChartRef.current && dailyChartInstance.current) {
      dailyChartInstance.current.dispose();
    }
    const dailyChart = echarts.init(dailyChartRef.current);
    dailyChartInstance.current = dailyChart;
    dailyChart.setOption({
      title: {
        text: 'Daily payouts and level',
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 500, color: '#595959' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const day = params[0].name;
          let result = `${day}<br/>`;
          for (const param of params) {
            if (param.seriesName === 'Level') {
              result += `Level: ${param.value}<br/>`;
            } else {
              result += `${param.marker} ${param.seriesName}: ${param.value.toLocaleString()}<br/>`;
            }
          }
          return result;
        },
      },
      legend: {
        data: ['Level', 'Daily silver', 'Daily EXP'],
        top: '15%',
        textStyle: { fontSize: 10 },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '25%', containLabel: true },
      xAxis: {
        type: 'category',
        data: simulationData.days,
        axisLabel: { interval: Math.floor(simDays / 5) - 1, fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Value',
          axisLabel: { fontSize: 10, formatter: (val: number) => val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val },
        },
        {
          type: 'value',
          name: 'Level',
          min: playerLevel,
          max: Math.max(playerLevel + 20, ...simulationData.levelData) + 5,
          axisLabel: { fontSize: 10 },
        },
      ],
      series: [
        {
          name: 'Daily silver',
          type: 'line',
          yAxisIndex: 0,
          data: simulationData.dailySilverData,
          lineStyle: { color: '#fa8c16', width: 2 },
          itemStyle: { color: '#fa8c16' },
          symbol: 'circle',
          symbolSize: 3,
        },
        {
          name: 'Daily EXP',
          type: 'line',
          yAxisIndex: 0,
          data: simulationData.dailyExpData,
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' },
          symbol: 'circle',
          symbolSize: 3,
        },
        {
          name: 'Level',
          type: 'line',
          yAxisIndex: 1,
          data: simulationData.levelData,
          lineStyle: { color: '#52c41a', width: 3 },
          itemStyle: { color: '#52c41a' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#52c41a40' },
              { offset: 1, color: '#52c41a05' },
            ]),
          },
          symbol: 'circle',
          symbolSize: 4,
        },
      ],
    });

    return () => {
      silverChartInstance.current?.dispose();
      prestigeChartInstance.current?.dispose();
      expChartInstance.current?.dispose();
      dailyChartInstance.current?.dispose();
    };
  }, [simulationData, simDays, playerLevel]);

  // Reset form
  const handleReset = useCallback(() => {
    setPlayerLevel(100);
    setPrestigeLevel(10);
    setArenaRank(100);
    setArenaChallenges(10);
    setArenaWinRate(50);
    setLevelChallenges(5);
    setSimDays(30);
    message.success('Reset');
  }, []);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ExperimentOutlined className={styles.headerIcon} />
          <div className={styles.headerTitle}>
            <h1>Economy calculator</h1>
            <p>Revenue, EXP, and progression planning</p>
          </div>
        </div>
        <Link href="/simulation-system/economy/characters" className={styles.backButton}>
          Back
        </Link>
      </header>

      {/* Body */}
      <main className={styles.mainContent}>
        <div className={styles.calcContent}>
          {/* Left column */}
          <div className={styles.calcPanel}>
            <Card className={styles.configCard} title="Basics">
              <div className={styles.inputItem}>
                <label>Hero level</label>
                <InputNumber
                  min={1}
                  max={200}
                  value={playerLevel}
                  onChange={(v) => setPlayerLevel(v ?? 1)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className={styles.inputItem}>
                <label>Prestige rank</label>
                <InputNumber
                  min={1}
                  max={36}
                  value={prestigeLevel}
                  onChange={(v) => setPrestigeLevel(v ?? 1)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className={styles.inputItem}>
                <label>Arena rank</label>
                <InputNumber
                  min={1}
                  max={5000}
                  value={arenaRank}
                  onChange={(v) => setArenaRank(v ?? 1)}
                  style={{ width: '100%' }}
                />
              </div>
            </Card>

            <Card className={styles.configCard} title="Arena">
              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Daily attempts</span>
                  <strong>{arenaChallenges}</strong>
                </div>
                <Slider
                  min={0}
                  max={20}
                  value={arenaChallenges}
                  onChange={setArenaChallenges}
                />
              </div>

              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Win rate</span>
                  <strong>{arenaWinRate}%</strong>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={arenaWinRate}
                  onChange={(v) => setArenaWinRate(v)}
                />
              </div>
            </Card>

            <Card className={styles.configCard} title="Stages">
              <div className={styles.inputItem}>
                <label>Select stages</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  value={selectedLevelIds}
                  onChange={setSelectedLevelIds}
                  options={LEVELS.map(l => ({
                    value: l.id,
                    label: (
                      <span>
                        <Tag color={l.type === 'main_story' ? '#1890ff' : l.type === 'conquest' ? '#fa8c16' : '#52c41a'} style={{ fontSize: 10 }}>
                          {l.type.split('·')[0]}
                        </Tag>
                        {l.name} ({parseLevelCost(l.cost)?.type === 'stamina' ? `${parseLevelCost(l.cost)?.amount} stamina` : 'Free'})
                      </span>
                    ),
                  }))}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Pick daily stages..."
                />
              </div>
              <div className={styles.levelInfo}>
                <span>{selectedLevelIds.length} stage(s) selected</span>
                <span>Total stamina: {selectedLevelIds.reduce((sum, id) => {
                  const lvl = LEVELS.find(l => l.id === id);
                  const cost = lvl ? parseLevelCost(lvl.cost) : null;
                  return sum + (cost?.type === 'stamina' ? cost.amount : 0);
                }, 0)}</span>
              </div>
            </Card>

            <Card className={styles.configCard} title="Simulation">
              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Horizon (days)</span>
                  <strong>{simDays} days</strong>
                </div>
                <Slider
                  min={1}
                  max={90}
                  value={simDays}
                  onChange={setSimDays}
                  marks={{ 1: '1', 30: '30', 60: '60', 90: '90' }}
                />
              </div>
            </Card>

            <Button type="default" onClick={handleReset} block>
              Reset
            </Button>
          </div>

          {/* Results */}
          <div className={styles.calcResults}>
            {/* Daily summary */}
            <Card className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <ExperimentOutlined />
                <span>Daily totals</span>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue} style={{ color: '#fa8c16' }}>
                      {dailyTotal.silver.toLocaleString()}
                    </div>
                    <div className={styles.statLabel}>
                      <DollarOutlined style={{ color: '#fa8c16' }} /> Silver
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue} style={{ color: '#1890ff' }}>
                      {formatExp(dailyTotal.exp)}
                    </div>
                    <div className={styles.statLabel}>
                      <ThunderboltOutlined style={{ color: '#1890ff' }} /> EXP
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue} style={{ color: '#eb2f96' }}>
                      {dailyTotal.prestige.toLocaleString()}
                    </div>
                    <div className={styles.statLabel}>
                      <RiseOutlined style={{ color: '#eb2f96' }} /> Prestige
                    </div>
                  </div>
                </Col>
              </Row>
              <div className={styles.staminaNote}>
                Stamina/day: {dailyTotal.staminaCost} | Tier mult.: {currentLevelData?.tier === 'beginner' ? '1.0x' : currentLevelData?.tier === 'growth' ? '1.3x' : currentLevelData?.tier === 'mid' ? '1.8x' : currentLevelData?.tier === 'late' ? '2.5x' : currentLevelData?.tier === 'end' ? '3.5x' : '5.0x'}
              </div>
            </Card>

            {/* Level progress */}
            <Card className={styles.summaryCard} style={{ background: `linear-gradient(135deg, ${getTierColor(currentLevelData?.tier || 'beginner')}15, ${getTierColor(currentLevelData?.tier || 'beginner')}05)` }}>
              <div className={styles.summaryHeader}>
                <StarOutlined style={{ color: getTierColor(currentLevelData?.tier || 'beginner') }} />
                <span>Level progress ({currentLevelData?.tier === 'beginner' ? 'Beginner' : currentLevelData?.tier === 'growth' ? 'Growth' : currentLevelData?.tier === 'mid' ? 'Mid' : currentLevelData?.tier === 'late' ? 'Late' : currentLevelData?.tier === 'end' ? 'Endgame' : 'Apex'})</span>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue} style={{ color: getTierColor(currentLevelData?.tier || 'beginner') }}>
                      Lv.{playerLevel}
                    </div>
                    <div className={styles.statLabel}>Current level</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue} style={{ color: '#52c41a' }}>
                      Lv.{levelPrediction.targetLevel}
                    </div>
                    <div className={styles.statLabel}>After {simDays} days</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue} style={{ color: '#1890ff' }}>
                      +{levelPrediction.targetLevel - playerLevel}
                    </div>
                    <div className={styles.statLabel}>Level-up</div>
                  </div>
                </Col>
              </Row>
              <Progress
                percent={Math.min(100, levelPrediction.progress * 100)}
                strokeColor={getTierColor(currentLevelData?.tier || 'beginner')}
                showInfo={false}
                style={{ marginTop: 12 }}
              />
              <div className={styles.staminaNote}>
                Total EXP gained: {formatExp(levelPrediction.totalExp)} | Next level needs: {formatExp(currentLevelData?.expToNext || 0)}
              </div>
            </Card>

            {/* Charts */}
            <Card className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <ExperimentOutlined />
                <span>{simDays}-day cumulative curves</span>
              </div>
              <div className={styles.chartsGrid4}>
                <div className={styles.chartItem}>
                  <div ref={silverChartRef} className={styles.chart} />
                </div>
                <div className={styles.chartItem}>
                  <div ref={prestigeChartRef} className={styles.chart} />
                </div>
                <div className={styles.chartItem}>
                  <div ref={expChartRef} className={styles.chart} />
                </div>
                <div className={styles.chartItem}>
                  <div ref={dailyChartRef} className={styles.chart} />
                </div>
              </div>
            </Card>

            {/* Horizon totals */}
            <Card className={styles.simCard}>
              <div className={styles.simHeader}>
                <span>{simDays}-day totals (dynamic levels)</span>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <div className={styles.simItem}>
                    <div className={styles.simValue} style={{ color: '#fa8c16' }}>
                      {simulationData.silverData[simulationData.silverData.length - 1]?.toLocaleString() || '0'}
                    </div>
                    <div className={styles.simLabel}>Silver</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className={styles.simItem}>
                    <div className={styles.simValue} style={{ color: '#1890ff' }}>
                      {formatExp(simulationData.expData[simulationData.expData.length - 1] || 0)}
                    </div>
                    <div className={styles.simLabel}>EXP</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className={styles.simItem}>
                    <div className={styles.simValue} style={{ color: '#eb2f96' }}>
                      {simulationData.prestigeData[simulationData.prestigeData.length - 1]?.toLocaleString() || '0'}
                    </div>
                    <div className={styles.simLabel}>Prestige</div>
                  </div>
                </Col>
              </Row>
              <div className={styles.simNote}>
                Level change: {playerLevel} → {levelPrediction.targetLevel} (+{levelPrediction.levelsGained})
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
