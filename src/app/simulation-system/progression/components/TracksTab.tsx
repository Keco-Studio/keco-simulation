'use client';

import { Table, Input, Select, Button, Space, Tag, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TrackDef, TrackKind, TrackParams } from '@/lib/progression/types';

interface Props {
  tracks: TrackDef[];
  onChange: (tracks: TrackDef[]) => void;
}

const KIND_OPTIONS: { value: TrackKind; label: string }[] = [
  { value: 'exp_level', label: '经验→等级（预设）' },
  { value: 'proficiency', label: '熟练度→段位（预设）' },
  { value: 'milestone', label: '里程碑（预设）' },
  { value: 'rate_accrual', label: '速率/挂机（预设）' },
  { value: 'custom', label: '自定义（公式/表格驱动）' },
];

function defaultParams(kind: TrackKind): TrackParams {
  switch (kind) {
    case 'exp_level':
      return { baseExp: 100, growthFactor: 1.08, model: 'logarithmic', maxLevel: 100 };
    case 'proficiency':
      return {
        tiers: [
          { threshold: 0, label: '生疏' },
          { threshold: 100, label: '熟练' },
        ],
      };
    case 'milestone':
      return { milestones: [{ at: 1000, reward: '里程碑1' }] };
    case 'rate_accrual':
      return { ratePerUnit: 1, cap: 10000 };
    case 'custom':
      return {
        accumulator: 'add',
        cap: null,
        levelMode: 'formula',
        levelFormula: 'floor(sqrt(total/100))',
        unlocks: [],
      };
  }
}

export default function TracksTab({ tracks, onChange }: Props) {
  const update = (id: string, patch: Partial<TrackDef>) =>
    onChange(tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const addTrack = () =>
    onChange([
      ...tracks,
      {
        id: `track_${Date.now()}`,
        kind: 'exp_level',
        label: '新轨道',
        params: defaultParams('exp_level'),
      },
    ]);

  const columns: ColumnsType<TrackDef> = [
    {
      title: '轨道ID',
      dataIndex: 'id',
      width: 200,
      render: (_, t) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Input value={t.id} onChange={(e) => update(t.id, { id: e.target.value })} />
          {/\{[A-Za-z0-9_]+\}/.test(t.id) && <Tag color="blue">模板路由</Tag>}
        </Space>
      ),
    },
    {
      title: '名称',
      dataIndex: 'label',
      width: 140,
      render: (_, t) => (
        <Input value={t.label} onChange={(e) => update(t.id, { label: e.target.value })} />
      ),
    },
    {
      title: '类型',
      dataIndex: 'kind',
      width: 160,
      render: (_, t) => (
        <Select
          style={{ width: '100%' }}
          value={t.kind}
          options={KIND_OPTIONS}
          onChange={(kind: TrackKind) => update(t.id, { kind, params: defaultParams(kind) })}
        />
      ),
    },
    {
      title: '参数 (JSON)',
      dataIndex: 'params',
      render: (_, t) => (
        <Input.TextArea
          key={`${t.id}-${t.kind}`}
          autoSize={{ minRows: 1, maxRows: 4 }}
          defaultValue={JSON.stringify(t.params)}
          onBlur={(e) => {
            try {
              update(t.id, { params: JSON.parse(e.target.value) as TrackParams });
            } catch {
              /* ignore invalid JSON until valid */
            }
          }}
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, t) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onChange(tracks.filter((x) => x.id !== t.id))}
        />
      ),
    },
  ];

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="自定义轨道（custom）：用配置组合任意反馈模式，无需写代码"
        description={
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div>
              <code>accumulator</code>：<code>add</code> 累加 / <code>add_capped</code> 封顶累加（配
              <code>cap</code>）/ <code>max</code> 取最大值（破纪录类）
            </div>
            <div>
              <code>levelMode</code>：<code>none</code> 不分级 / <code>formula</code> 用公式算等级（作用域含变量{' '}
              <code>total</code>，如 <code>floor(sqrt(total/100))</code>）/ <code>tiers</code> 阈值表分段
            </div>
            <div>
              <code>unlocks</code>：<code>[{'{'}&quot;at&quot;:100000,&quot;reward&quot;:&quot;称号&quot;{'}'}]</code>{' '}
              在任意累计点位发一次性奖励，可与任何 levelMode 叠加
            </div>
          </div>
        }
      />
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={addTrack}>
          新增轨道
        </Button>
      </Space>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={tracks}
        scroll={{ x: 800 }}
      />
    </div>
  );
}
