'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, InputNumber, Space, Table, Form, Empty, Select, Spin } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressionConfig, Snapshot } from '@/lib/progression/types';
import type { BehaviorProfile, SkillUsage } from '@/lib/progression/sources/syntheticSource';
import { generateSyntheticContributions } from '@/lib/progression/sources/syntheticSource';
import { simulate } from '@/lib/progression/simulate';
import {
  loadProgressionSkillOptions,
  type ProgressionSkillOption,
} from '../lib/loadBattleSkills';
import ProgressionCharts from './ProgressionCharts';

interface Props {
  config: ProgressionConfig;
  profile: BehaviorProfile;
  onProfileChange: (profile: BehaviorProfile) => void;
}

interface ResultRow {
  key: string;
  id: string;
  name: string;
  total: number;
  level: number;
  rewards: string;
}

const DEFAULT_CASTS_PER_STEP = 12;

export default function SimulateTab({ config, profile, onProfileChange }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [skillOptions, setSkillOptions] = useState<ProgressionSkillOption[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);

  useEffect(() => {
    let alive = true;
    loadProgressionSkillOptions()
      .then((opts) => {
        if (alive) setSkillOptions(opts);
      })
      .finally(() => {
        if (alive) setLoadingSkills(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedSkills = useMemo(() => profile.skills ?? [], [profile.skills]);

  /** trackId (prof_<id>) → display label using real skill names. */
  const trackLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of selectedSkills) {
      map[`prof_${s.id}`] = `${s.name} 熟练度`;
    }
    return map;
  }, [selectedSkills]);

  const onSelectSkills = (ids: string[]) => {
    const byId = new Map(selectedSkills.map((s) => [s.id, s]));
    const nameById = new Map(skillOptions.map((o) => [o.id, o.name]));
    const skills: SkillUsage[] = ids.map((id) => {
      const existing = byId.get(id);
      if (existing) return existing;
      return { id, name: nameById.get(id) ?? id, castsPerStep: DEFAULT_CASTS_PER_STEP };
    });
    onProfileChange({ ...profile, skills });
  };

  const setSkillCasts = (id: string, casts: number) => {
    const skills = selectedSkills.map((s) =>
      s.id === id ? { ...s, castsPerStep: casts } : s
    );
    onProfileChange({ ...profile, skills });
  };

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
      name: trackLabels[t.id] ?? t.id,
      total: Math.round(t.total),
      level: t.level,
      rewards: t.unlockedRewards.join(', '),
    }));
  }, [snapshots, trackLabels]);

  const resultCols: ColumnsType<ResultRow> = [
    { title: '轨道', dataIndex: 'name' },
    { title: '累计', dataIndex: 'total' },
    { title: '等级/段位', dataIndex: 'level' },
    { title: '解锁奖励', dataIndex: 'rewards' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title="技能来源（来自真实战斗技能表）">
        {loadingSkills ? (
          <Spin size="small" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="选择参与熟练度成长的技能（来自 /battle/skills 编辑的技能表）"
              value={selectedSkills.map((s) => s.id)}
              onChange={onSelectSkills}
              optionFilterProp="label"
              options={skillOptions.map((o) => ({ value: o.id, label: o.name }))}
            />
            {selectedSkills.length > 0 && (
              <Form layout="inline">
                {selectedSkills.map((s) => (
                  <Form.Item key={s.id} label={`${s.name} 每步释放`}>
                    <InputNumber
                      min={0}
                      value={s.castsPerStep}
                      onChange={(v) => setSkillCasts(s.id, v ?? 0)}
                    />
                  </Form.Item>
                ))}
              </Form>
            )}
            {skillOptions.length === 0 && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="未找到技能：请先到「战斗技能」页编辑技能表"
              />
            )}
          </Space>
        )}
      </Card>

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
            <ProgressionCharts snapshots={snapshots} labels={trackLabels} />
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
