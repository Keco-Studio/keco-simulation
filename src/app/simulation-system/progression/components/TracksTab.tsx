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
  { value: 'exp_level', label: 'EXP → level (preset)' },
  { value: 'proficiency', label: 'Proficiency → tier (preset)' },
  { value: 'milestone', label: 'Milestone (preset)' },
  { value: 'rate_accrual', label: 'Rate / idle (preset)' },
  { value: 'custom', label: 'Custom (formula / table driven)' },
];

function defaultParams(kind: TrackKind): TrackParams {
  switch (kind) {
    case 'exp_level':
      return { baseExp: 100, growthFactor: 1.08, model: 'logarithmic', maxLevel: 100 };
    case 'proficiency':
      return {
        tiers: [
          { threshold: 0, label: 'Unskilled' },
          { threshold: 100, label: 'Practiced' },
        ],
      };
    case 'milestone':
      return { milestones: [{ at: 1000, reward: 'Milestone 1' }] };
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
        label: 'New track',
        params: defaultParams('exp_level'),
      },
    ]);

  const columns: ColumnsType<TrackDef> = [
    {
      title: 'Track ID',
      dataIndex: 'id',
      width: 200,
      render: (_, t) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Input value={t.id} onChange={(e) => update(t.id, { id: e.target.value })} />
          {/\{[A-Za-z0-9_]+\}/.test(t.id) && <Tag color="blue">Template route</Tag>}
        </Space>
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      width: 140,
      render: (_, t) => (
        <Input value={t.label} onChange={(e) => update(t.id, { label: e.target.value })} />
      ),
    },
    {
      title: 'Kind',
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
      title: 'Params (JSON)',
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
        message="Custom tracks: combine any feedback mode via config, no code required"
        description={
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div>
              <code>accumulator</code>: <code>add</code> sum / <code>add_capped</code> capped sum
              (set <code>cap</code>) / <code>max</code> record high-water mark
            </div>
            <div>
              <code>levelMode</code>: <code>none</code> no levels / <code>formula</code> formula
              level (scope includes <code>total</code>, e.g.{' '}
              <code>floor(sqrt(total/100))</code>) / <code>tiers</code> threshold table
            </div>
            <div>
              <code>unlocks</code>:{' '}
              <code>[{'{'}&quot;at&quot;:100000,&quot;reward&quot;:&quot;Title&quot;{'}'}]</code>{' '}
              one-time rewards at cumulative points; stacks with any levelMode
            </div>
          </div>
        }
      />
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={addTrack}>
          Add track
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
