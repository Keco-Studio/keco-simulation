'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  InputNumber,
  Space,
  Table,
  Form,
  Empty,
  Select,
  Spin,
  Checkbox,
  Tag,
} from 'antd';
import { PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Contribution, ProgressionConfig, Snapshot } from '@/lib/progression/types';
import type { BehaviorProfile, SkillUsage } from '@/lib/progression/sources/syntheticSource';
import { generateSyntheticContributions } from '@/lib/progression/sources/syntheticSource';
import { simulate } from '@/lib/progression/simulate';
import {
  loadProgressionSkillOptions,
  type ProgressionSkillOption,
} from '../lib/loadBattleSkills';
import {
  clearBattleImports,
  flattenBattleImports,
  type BattleImportRecord,
} from '../lib/progressionStorage';
import ProgressionCharts from './ProgressionCharts';

interface Props {
  config: ProgressionConfig;
  profile: BehaviorProfile;
  battleImports: BattleImportRecord[];
  onProfileChange: (profile: BehaviorProfile) => void;
  onBattleImportsChange: (imports: BattleImportRecord[]) => void;
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

export default function SimulateTab({
  config,
  profile,
  battleImports,
  onProfileChange,
  onBattleImportsChange,
}: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [skillOptions, setSkillOptions] = useState<ProgressionSkillOption[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [mergeSynthetic, setMergeSynthetic] = useState(true);
  const [mergeBattle, setMergeBattle] = useState(true);

  useEffect(() => {
    if (battleImports.length > 0) setMergeBattle(true);
  }, [battleImports.length]);

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
  const nameBySkillId = useMemo(
    () => new Map(skillOptions.map((o) => [o.id, o.name])),
    [skillOptions]
  );

  /** trackId (prof_<id>) → display label using real skill names. */
  const trackLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of selectedSkills) {
      map[`prof_${s.id}`] = `${s.name} 熟练度`;
    }
    for (const rec of battleImports) {
      for (const c of rec.contributions) {
        const sid = c.ctx.skillId;
        if (typeof sid === 'string' && sid) {
          const label = nameBySkillId.get(sid) ?? sid;
          map[`prof_${sid}`] = `${label} 熟练度`;
        }
      }
    }
    return map;
  }, [selectedSkills, battleImports, nameBySkillId]);

  const onSelectSkills = (ids: string[]) => {
    const byId = new Map(selectedSkills.map((s) => [s.id, s]));
    const skills: SkillUsage[] = ids.map((id) => {
      const existing = byId.get(id);
      if (existing) return existing;
      return { id, name: nameBySkillId.get(id) ?? id, castsPerStep: DEFAULT_CASTS_PER_STEP };
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
    const contributions: Contribution[] = [];
    if (mergeSynthetic) {
      contributions.push(...generateSyntheticContributions(profile));
    }
    if (mergeBattle && battleImports.length > 0) {
      const offset = mergeSynthetic ? profile.steps : 0;
      contributions.push(...flattenBattleImports(battleImports, offset));
    }
    setSnapshots(simulate(config, contributions));
    setHasRun(true);
  };

  const handleClearBattleImports = () => {
    clearBattleImports();
    onBattleImportsChange([]);
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

  const importCols: ColumnsType<BattleImportRecord> = [
    {
      title: '对手',
      dataIndex: 'enemyName',
      render: (name, rec) => (
        <Space size={4}>
          <span>{name}</span>
          <Tag color={rec.outcome === 'win' ? 'green' : rec.outcome === 'fled' ? 'gold' : 'red'}>
            {rec.outcome}
          </Tag>
        </Space>
      ),
    },
    {
      title: '贡献事件数',
      render: (_, rec) => rec.contributions.length,
    },
    {
      title: '导入时间',
      dataIndex: 'importedAt',
      render: (t: number) => new Date(t).toLocaleString(),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        size="small"
        title="真实战斗贡献（BattleEventSource）"
        extra={
          battleImports.length > 0 ? (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleClearBattleImports}
            >
              清空
            </Button>
          ) : null
        }
      >
        {battleImports.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无导入：在战斗模拟器结束界面点击「导入成长贡献」"
          />
        ) : (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            columns={importCols}
            dataSource={battleImports}
          />
        )}
      </Card>

      <Card size="small" title="技能来源（合成推演 · 来自真实战斗技能表）">
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
        <Space style={{ marginTop: 12 }} wrap>
          <Checkbox checked={mergeSynthetic} onChange={(e) => setMergeSynthetic(e.target.checked)}>
            合并合成推演
          </Checkbox>
          <Checkbox
            checked={mergeBattle}
            disabled={battleImports.length === 0}
            onChange={(e) => setMergeBattle(e.target.checked)}
          >
            合并真实战斗贡献 ({battleImports.length} 场)
          </Checkbox>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={run}>
            运行推演
          </Button>
        </Space>
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
