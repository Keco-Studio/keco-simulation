'use client';

import { useRouter } from 'next/navigation';
import { Radio } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { readProgressionState } from '@/app/simulation-system/progression/lib/progressionStorage';
import {
  buildProgressionSimulatePath,
  readProgressionStudioBinding,
  PROGRESSION_CONFIG_UPDATED_EVENT,
} from '@/app/simulation-system/progression/lib/progressionStudioBindingStorage';
import type { BattleProgressionSource } from '../../lib/battleProgressionSource';
import styles from './BattleProgressionSettingsCard.module.css';

type Props = {
  value: BattleProgressionSource;
  onChange: (value: BattleProgressionSource) => void;
};

export function BattleProgressionSettingsCard({ value, onChange }: Props) {
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(PROGRESSION_CONFIG_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(PROGRESSION_CONFIG_UPDATED_EVENT, refresh);
  }, []);

  const ruleMeta = useMemo(() => {
    const { config } = readProgressionState();
    const enabledRules = config.rules.filter((r) => r.enabled).length;
    const tracks = config.tracks.length;
    const binding = readProgressionStudioBinding();
    return { enabledRules, tracks, binding };
  }, [value, tick]);

  const openSimulate = () => {
    router.push(buildProgressionSimulatePath(ruleMeta.binding ?? undefined));
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>
        <RiseOutlined />
        成长规则来源
      </div>
      <p className={styles.hint}>本场战斗是否按成长模拟器规则累积 EXP / 熟练度等反馈。</p>

      <Radio.Group
        className={styles.radioGroup}
        value={value}
        onChange={(e) => onChange(e.target.value as BattleProgressionSource)}
      >
        <Radio value="simulator" className={styles.radio}>
          使用成长模拟器当前配置
        </Radio>
        <Radio value="disabled" className={styles.radio}>
          本场禁用成长反馈
        </Radio>
      </Radio.Group>

      {value === 'simulator' ? (
        <p className={styles.meta}>
          {ruleMeta.enabledRules} 条启用规则 · {ruleMeta.tracks} 条轨道
          {ruleMeta.binding
            ? ` · Studio: ${ruleMeta.binding.tracksLibraryLabel || 'tracks'}`
            : ' · 尚未从 Studio 导入'}
        </p>
      ) : (
        <p className={styles.metaMuted}>不显示侧栏成长、飘字与结算奖励摘要。</p>
      )}

      <button type="button" className={styles.editLink} onClick={openSimulate}>
        编辑规则 →
      </button>
    </div>
  );
}
