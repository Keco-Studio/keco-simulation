'use client';

import Link from 'next/link';
import { Radio } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { readProgressionState } from '@/app/simulation-system/progression/lib/progressionStorage';
import type { BattleProgressionSource } from '../../lib/battleProgressionSource';
import styles from './BattleProgressionSettingsCard.module.css';

type Props = {
  value: BattleProgressionSource;
  onChange: (value: BattleProgressionSource) => void;
};

export function BattleProgressionSettingsCard({ value, onChange }: Props) {
  const ruleMeta = useMemo(() => {
    const { config } = readProgressionState();
    const enabledRules = config.rules.filter((r) => r.enabled).length;
    const tracks = config.tracks.length;
    return { enabledRules, tracks };
  }, [value]);

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
        </p>
      ) : (
        <p className={styles.metaMuted}>不显示侧栏成长、飘字与结算奖励摘要。</p>
      )}

      <Link href="/simulation-system/progression" className={styles.editLink} target="_blank">
        编辑规则 →
      </Link>
    </div>
  );
}
