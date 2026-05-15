'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, Select, Table, Tag, Button, Slider, Tabs, message } from 'antd';
import {
  ShoppingOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  EQUIPMENTS,
  EQUIPMENT_SLOT_NAMES,
  EQUIPMENT_SERIES,
  getEquipmentById,
  calculateEnhanceCost,
  getEquipmentQualityColor,
} from '../data/equipment';
import { type Equipment, QUALITY_COLORS } from '../types';
import styles from './Equipment.module.css';

/** Equipment enhancement calculator and list. */
export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number>(14200001);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [targetLevel, setTargetLevel] = useState<number>(10);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  const selectedEquipment = useMemo(
    () => getEquipmentById(selectedEquipmentId),
    [selectedEquipmentId],
  );

  const enhanceCost = useMemo(() => {
    if (!selectedEquipment) return 0;
    return calculateEnhanceCost(currentLevel, targetLevel, selectedEquipment.enhanceCost);
  }, [selectedEquipment, currentLevel, targetLevel]);

  const equipmentOptions = useMemo(() => {
    let filtered = EQUIPMENTS;

    if (selectedSlot !== null) {
      filtered = filtered.filter((e) => e.subType === selectedSlot);
    }

    if (selectedQuality !== null) {
      filtered = filtered.filter((e) => e.quality === selectedQuality);
    }

    if (selectedSeries !== null) {
      filtered = filtered.filter((e) => e.name.includes(selectedSeries));
    }

    return filtered.map((e) => ({
      value: e.id,
      label: (
        <span>
          <Tag color={getEquipmentQualityColor(e.quality)}>
            {e.qualityText} Lv.{e.level}
          </Tag>
          {e.name}
        </span>
      ),
    }));
  }, [selectedSlot, selectedQuality, selectedSeries]);

  const equipmentColumns: ColumnsType<Equipment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name, record) => (
        <span>
          <Tag color={getEquipmentQualityColor(record.quality)} style={{ marginRight: 8 }}>
            {record.qualityText}
          </Tag>
          {name}
        </span>
      ),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center',
    },
    {
      title: 'Quality',
      dataIndex: 'quality',
      key: 'quality',
      width: 80,
      align: 'center',
      render: (quality) => (
        <Tag color={QUALITY_COLORS[quality]}>
          {quality === 7 ? 'Divine' : quality >= 4 ? 'High' : 'Normal'}
        </Tag>
      ),
    },
    {
      title: 'Slot',
      key: 'slot',
      width: 100,
      align: 'center',
      render: (_, record) => EQUIPMENT_SLOT_NAMES[record.subType] || '-',
    },
    {
      title: 'Open level',
      dataIndex: 'openLevel',
      key: 'openLevel',
      width: 100,
      align: 'center',
    },
    {
      title: 'Enhance cost',
      dataIndex: 'enhanceCost',
      key: 'enhanceCost',
      width: 120,
      align: 'right',
      render: (cost) => (cost > 0 ? cost.toLocaleString() : '-'),
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setSelectedEquipmentId(record.id)}>
          Select
        </Button>
      ),
    },
  ];

  const enhanceTableData = useMemo(() => {
    if (!selectedEquipment) return [];

    const data = [];
    for (let lvl = currentLevel; lvl <= targetLevel; lvl++) {
      const prevCost = calculateEnhanceCost(currentLevel, lvl, selectedEquipment.enhanceCost);
      const isCurrent = lvl === currentLevel;
      const isTarget = lvl === targetLevel;

      data.push({
        key: lvl,
        level: lvl,
        cost: prevCost,
        isCurrent,
        isTarget,
      });
    }

    return data;
  }, [selectedEquipment, currentLevel, targetLevel]);

  const enhanceColumns: ColumnsType<{
    key: number;
    level: number;
    cost: number;
    isCurrent: boolean;
    isTarget: boolean;
  }> = [
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center',
      render: (level, record) => (
        <span>
          {record.isCurrent && (
            <Tag color="blue" style={{ marginRight: 4 }}>
              Current
            </Tag>
          )}
          {record.isTarget && (
            <Tag color="green" style={{ marginRight: 4 }}>
              Target
            </Tag>
          )}
          +{level}
        </span>
      ),
    },
    {
      title: 'Total cost',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: (cost) => `${cost.toLocaleString()} silver`,
    },
  ];

  const handleReset = useCallback(() => {
    setCurrentLevel(0);
    setTargetLevel(10);
    message.success('Reset complete');
  }, []);

  const slotOptions = [
    { value: null, label: 'All' },
    ...Object.entries(EQUIPMENT_SLOT_NAMES).map(([key, name]) => ({
      value: parseInt(key, 10),
      label: name,
    })),
  ];

  const qualityOptions = [
    { value: null, label: 'All' },
    { value: 7, label: 'Divine (tier 7)' },
    { value: 6, label: 'Red (tier 6)' },
    { value: 5, label: 'Orange (tier 5)' },
    { value: 4, label: 'Purple (tier 4)' },
    { value: 3, label: 'Blue (tier 3)' },
    { value: 2, label: 'High (tier 2)' },
    { value: 1, label: 'Normal (tier 1)' },
  ];

  const seriesOptions = [
    { value: null, label: 'All' },
    ...EQUIPMENT_SERIES.map((series) => ({
      value: series,
      label: series,
    })),
  ];

  const tabItems = [
    {
      key: 'calculator',
      label: (
        <span>
          <ToolOutlined /> Calculator
        </span>
      ),
      children: (
        <div className={styles.calcContent}>
          <div className={styles.calcPanel}>
            <Card className={styles.configCard} title="Equipment">
              <Select
                style={{ width: '100%' }}
                value={selectedEquipmentId}
                onChange={setSelectedEquipmentId}
                options={equipmentOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />

              {selectedEquipment && (
                <div className={styles.equipInfo}>
                  <div className={styles.equipHeader}>
                    <Tag color={getEquipmentQualityColor(selectedEquipment.quality)} style={{ fontSize: 14 }}>
                      {selectedEquipment.qualityText}
                    </Tag>
                    <span className={styles.equipLevel}>Level {selectedEquipment.level}</span>
                  </div>
                  <div className={styles.equipName}>{selectedEquipment.name}</div>
                  <div className={styles.equipStats}>
                    <span>Slot: {EQUIPMENT_SLOT_NAMES[selectedEquipment.subType] || '-'}</span>
                    <span>Open level: {selectedEquipment.openLevel}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card className={styles.configCard} title="Enhancement">
              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Current level</span>
                  <strong>+{currentLevel}</strong>
                </div>
                <Slider min={0} max={targetLevel - 1} value={currentLevel} onChange={setCurrentLevel} />
              </div>

              <div className={styles.sliderItem}>
                <div className={styles.sliderLabel}>
                  <span>Target level</span>
                  <strong>+{targetLevel}</strong>
                </div>
                <Slider min={currentLevel + 1} max={50} value={targetLevel} onChange={setTargetLevel} />
              </div>

              <Button type="default" onClick={handleReset} block>
                Reset
              </Button>
            </Card>
          </div>

          <div className={styles.calcResults}>
            <Card className={styles.resultCard}>
              <div className={styles.costSummary}>
                <div className={styles.costIcon}>
                  <ShoppingOutlined />
                </div>
                <div className={styles.costContent}>
                  <div className={styles.costValue}>{enhanceCost.toLocaleString()}</div>
                  <div className={styles.costLabel}>Enhance cost (silver)</div>
                </div>
              </div>

              <div className={styles.levelRange}>
                <Tag color="blue">+{currentLevel}</Tag>
                <span>→</span>
                <Tag color="green">+{targetLevel}</Tag>
                <span className={styles.levelDiff}>(+{targetLevel - currentLevel} levels)</span>
              </div>
            </Card>

            <Card className={styles.resultCard} title="Enhance breakdown">
              <Table
                columns={enhanceColumns}
                dataSource={enhanceTableData}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
                rowKey="key"
              />
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'list',
      label: (
        <span>
          <UnorderedListOutlined /> Equipment list
        </span>
      ),
      children: (
        <div className={styles.listContent}>
          <Card className={styles.filterCard}>
            <div className={styles.filterRow}>
              <div className={styles.filterItem}>
                <label>Slot:</label>
                <Select style={{ width: 120 }} value={selectedSlot} onChange={setSelectedSlot} options={slotOptions} />
              </div>
              <div className={styles.filterItem}>
                <label>Quality:</label>
                <Select
                  style={{ width: 140 }}
                  value={selectedQuality}
                  onChange={setSelectedQuality}
                  options={qualityOptions}
                />
              </div>
              <div className={styles.filterItem}>
                <label>Series:</label>
                <Select
                  style={{ width: 120 }}
                  value={selectedSeries}
                  onChange={setSelectedSeries}
                  options={seriesOptions}
                  showSearch
                />
              </div>
              <Button
                onClick={() => {
                  setSelectedSlot(null);
                  setSelectedQuality(null);
                  setSelectedSeries(null);
                }}
              >
                Reset filters
              </Button>
            </div>
          </Card>

          <Card className={styles.tableCard}>
            <Table
              columns={equipmentColumns}
              dataSource={equipmentOptions.map((opt) => ({
                id: opt.value,
                name: opt.label as unknown as string,
                ...EQUIPMENTS.find((e) => e.id === opt.value),
              }))}
              pagination={{ pageSize: 15 }}
              size="small"
              scroll={{ x: 800 }}
              rowKey="id"
            />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <ShoppingOutlined />
          </span>
          <div className={styles.headerTitle}>
            <h1>Equipment</h1>
            <p>Enhancement costs and stat bands</p>
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
