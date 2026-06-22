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
        Progression rule source
      </div>
      <p className={styles.hint}>
        Whether this battle applies EXP, skill proficiency, and other rewards from the progression
        simulator rules.
      </p>

      <Radio.Group
        className={styles.radioGroup}
        value={value}
        onChange={(e) => onChange(e.target.value as BattleProgressionSource)}
      >
        <Radio value="simulator" className={styles.radio}>
          Use current progression simulator config
        </Radio>
        <Radio value="disabled" className={styles.radio}>
          Disable progression feedback for this battle
        </Radio>
      </Radio.Group>

      {value === 'simulator' ? (
        <p className={styles.meta}>
          {ruleMeta.enabledRules} enabled rule(s) · {ruleMeta.tracks} track(s)
          {ruleMeta.binding
            ? ` · Studio: ${ruleMeta.binding.tracksLibraryLabel || 'tracks'}`
            : ' · Not imported from Studio yet'}
        </p>
      ) : (
        <p className={styles.metaMuted}>
          Hides the side growth panel, float text, and result reward summary.
        </p>
      )}

      <button type="button" className={styles.editLink} onClick={openSimulate}>
        Edit rules →
      </button>
    </div>
  );
}
