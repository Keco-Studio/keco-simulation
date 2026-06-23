'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, message } from 'antd';
import { RiseOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ProgressionConfig } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { DEFAULT_CONFIG, DEFAULT_PROFILE } from '@/lib/progression/defaults';
import { loadProgressionConfigFromStudio } from '@/lib/progression/studio/loadProgressionConfigFromStudio';
import { useSupabase } from '@studio/lib/SupabaseContext';
import {
  readProgressionState,
  writeProgressionState,
  PROGRESSION_BATTLE_IMPORTED_EVENT,
  type BattleImportRecord,
} from '../lib/progressionStorage';
import {
  readProgressionStudioBinding,
  writeProgressionStudioBinding,
  notifyProgressionConfigUpdated,
  PROGRESSION_CONFIG_UPDATED_EVENT,
  type ProgressionStudioBinding,
} from '../lib/progressionStudioBindingStorage';
import { ProgressionStudioImportCard } from '../components/ProgressionStudioImportCard';
import { ProgressionStudioConfigTables } from '../components/ProgressionStudioConfigTables';
import SimulateTab from '../components/SimulateTab';
import styles from '../Progression.module.css';

export default function ProgressionSimulatePage() {
  const router = useRouter();
  const supabase = useSupabase();

  const [config, setConfig] = useState<ProgressionConfig>(DEFAULT_CONFIG);
  const [profile, setProfile] = useState<BehaviorProfile>(DEFAULT_PROFILE);
  const [battleImports, setBattleImports] = useState<BattleImportRecord[]>([]);
  const [binding, setBinding] = useState<ProgressionStudioBinding | null>(null);
  const [ready, setReady] = useState(false);

  const reloadLocalState = useCallback(() => {
    const s = readProgressionState();
    const b = readProgressionStudioBinding();
    setBinding(b);
    if (!b) {
      setConfig(DEFAULT_CONFIG);
    } else {
      setConfig(s.config);
    }
    setProfile(s.profile);
    setBattleImports(s.battleImports);
  }, []);

  useEffect(() => {
    reloadLocalState();
    setReady(true);
    const onImported = () => reloadLocalState();
    window.addEventListener(PROGRESSION_BATTLE_IMPORTED_EVENT, onImported);
    window.addEventListener(PROGRESSION_CONFIG_UPDATED_EVENT, onImported);
    return () => {
      window.removeEventListener(PROGRESSION_BATTLE_IMPORTED_EVENT, onImported);
      window.removeEventListener(PROGRESSION_CONFIG_UPDATED_EVENT, onImported);
    };
  }, [reloadLocalState]);

  useEffect(() => {
    if (!ready) return;
    writeProgressionState(config, profile, battleImports);
  }, [ready, config, profile, battleImports]);

  const handleStudioImported = useCallback(
    async (nextBinding: ProgressionStudioBinding) => {
      if (!supabase) return;
      try {
        const result = await loadProgressionConfigFromStudio(
          supabase,
          nextBinding.tracksLibraryId,
          nextBinding.rulesLibraryId,
        );
        if (result.config.tracks.length === 0 && result.config.rules.length === 0) {
          message.error('No valid rows found. Check column keys and row data.');
          return;
        }
        writeProgressionStudioBinding(nextBinding);
        writeProgressionState(result.config, profile, battleImports);
        setConfig(result.config);
        setBinding(nextBinding);
        notifyProgressionConfigUpdated();
        const skipped = result.skippedTracks + result.skippedRules;
        message.success(
          `Imported ${result.config.tracks.length} tracks and ${result.config.rules.length} rules` +
            (skipped > 0 ? ` (${skipped} row(s) skipped)` : ''),
        );
        const q = new URLSearchParams();
        if (nextBinding.projectId) q.set('projectId', nextBinding.projectId);
        q.set('tracksLibraryId', nextBinding.tracksLibraryId);
        q.set('rulesLibraryId', nextBinding.rulesLibraryId);
        router.replace(`/simulation-system/progression/simulate?${q.toString()}`);
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to import from Studio');
      }
    },
    [supabase, profile, battleImports, router],
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden>
          <RiseOutlined />
        </span>
        <div className={styles.title}>
          <h1>Progression / feedback simulator · Run simulation</h1>
          <p>
            Import tracks and rules from Keco Studio libraries, then run progression simulation.
            {binding
              ? ` · ${binding.tracksLibraryLabel || 'tracks'} + ${binding.rulesLibraryLabel || 'rules'}`
              : ''}
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/simulation-system">
            <Button icon={<ArrowLeftOutlined />}>Back to hub</Button>
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <Suspense fallback={null}>
          <ProgressionStudioImportCard onImported={handleStudioImported} />
        </Suspense>
        <div style={{ marginTop: 16 }}>
          <ProgressionStudioConfigTables config={config} usingBuiltInDefault={!binding} />
        </div>
        <div style={{ marginTop: 16 }}>
          <SimulateTab
            config={config}
            profile={profile}
            battleImports={battleImports}
            onProfileChange={setProfile}
            onBattleImportsChange={setBattleImports}
          />
        </div>
      </main>
    </div>
  );
}
