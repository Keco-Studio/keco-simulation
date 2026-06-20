'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs, Button, Popconfirm } from 'antd';
import { RiseOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ProgressionConfig, TrackDef, Rule } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import {
  readProgressionState,
  writeProgressionState,
  resetProgressionState,
} from './lib/progressionStorage';
import TracksTab from './components/TracksTab';
import RulesTab from './components/RulesTab';
import SimulateTab from './components/SimulateTab';
import styles from './Progression.module.css';

export default function ProgressionPage() {
  const [config, setConfig] = useState<ProgressionConfig>({ tracks: [], rules: [] });
  const [profile, setProfile] = useState<BehaviorProfile>({ steps: 30, perStep: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = readProgressionState();
    setConfig(s.config);
    setProfile(s.profile);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeProgressionState(config, profile);
  }, [ready, config, profile]);

  const setTracks = (tracks: TrackDef[]) => setConfig((c) => ({ ...c, tracks }));
  const setRules = (rules: Rule[]) => setConfig((c) => ({ ...c, rules }));

  const handleReset = () => {
    const s = resetProgressionState();
    setConfig(s.config);
    setProfile(s.profile);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden>
          <RiseOutlined />
        </span>
        <div className={styles.title}>
          <h1>成长 / 反馈模拟器</h1>
          <p>通用「付出→反馈」引擎：配置事件规则与进度轨道，推演成长曲线</p>
        </div>
        <div className={styles.actions}>
          <Popconfirm title="恢复默认示例配置？当前编辑将丢失" onConfirm={handleReset}>
            <Button icon={<ReloadOutlined />}>恢复默认</Button>
          </Popconfirm>
          <Link href="/simulation-system" className={styles.back}>
            返回
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <Tabs
          defaultActiveKey="simulate"
          items={[
            {
              key: 'tracks',
              label: '进度轨道',
              children: <TracksTab tracks={config.tracks} onChange={setTracks} />,
            },
            {
              key: 'rules',
              label: '规则表',
              children: <RulesTab rules={config.rules} onChange={setRules} />,
            },
            {
              key: 'simulate',
              label: '运行推演',
              children: (
                <SimulateTab config={config} profile={profile} onProfileChange={setProfile} />
              ),
            },
          ]}
        />
      </main>
    </div>
  );
}
