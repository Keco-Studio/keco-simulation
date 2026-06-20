'use client';

import { useMemo, useState } from 'react';
import { Button, Card, InputNumber, Space, Table, Form, Empty } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressionConfig, Snapshot } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { generateSyntheticContributions } from '@/lib/progression/sources/syntheticSource';
import { simulate } from '@/lib/progression/simulate';
import ProgressionCharts from './ProgressionCharts';

interface Props {
  config: ProgressionConfig;
  profile: BehaviorProfile;
  onProfileChange: (profile: BehaviorProfile) => void;
}

interface ResultRow {
  key: string;
  id: string;
  total: number;
  level: number;
  rewards: string;
}

export default function SimulateTab({ config, profile, onProfileChange }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const run = () => {
    const contributions = generateSyntheticContributions(profile);
    setSnapshots(simulate(config, contributions));
    setHasRun(true);
  };

  const finalTracks = useMemo<ResultRow[]>(() => {
    if (!snapshots.length) return [];
    const last = snapshots[snapshots.length - 1];
    return Object.values(last.tracks).map((t) => ({
      key: t.id,
      id: t.id,
      total: Math.round(t.total),
      level: t.level,
      rewards: t.unlockedRewards.join(', '),
    }));
  }, [snapshots]);

  const resultCols: ColumnsType<ResultRow> = [
    { title: '轨道', dataIndex: 'id' },
    { title: '累计', dataIndex: 'total' },
    { title: '等级/段位', dataIndex: 'level' },
    { title: '解锁奖励', dataIndex: 'rewards' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title="模拟输入（行为剖面：每步发生的付出量）">
        <Form layout="inline">
          <Form.Item label="模拟步数 (天/场)">
            <InputNumber
              min={1}
              max={3650}
              value={profile.steps}
              onChange={(v) => onProfileChange({ ...profile, steps: v ?? 1 })}
            />
          </Form.Item>
          {profile.perStep.map((item, idx) => (
            <Form.Item key={`${item.type}-${idx}`} label={item.type}>
              <InputNumber
                value={item.amount}
                onChange={(v) => {
                  const perStep = [...profile.perStep];
                  perStep[idx] = { ...perStep[idx], amount: v ?? 0 };
                  onProfileChange({ ...profile, perStep });
                }}
              />
            </Form.Item>
          ))}
        </Form>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={run}
          style={{ marginTop: 12 }}
        >
          运行推演
        </Button>
      </Card>

      {snapshots.length > 0 ? (
        <>
          <Card size="small" title="成长曲线（各轨道累计）">
            <ProgressionCharts snapshots={snapshots} />
          </Card>
          <Card size="small" title="最终结果">
            <Table size="small" pagination={false} columns={resultCols} dataSource={finalTracks} />
          </Card>
        </>
      ) : (
        hasRun && <Empty description="没有产出，请检查规则与轨道配置" />
      )}
    </Space>
  );
}
