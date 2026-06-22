'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { BattleSession } from '@keco/battle-core';
import type { ProgressionConfig, TrackState } from '@/lib/progression/types';
import {
  createTrackRuntime,
  applyContributionBatch,
  trackStatesToRecord,
  type TrackRuntimeContext,
} from '@/lib/progression/runtime';
import {
  contributionsFromBattleEvents,
  type BattleEventMapperState,
} from '@/lib/progression/sources/battleEventSource';
import { buildRewardSummaryLines } from '@/lib/progression/formatRewardSummary';
import { readProgressionState } from '@/app/simulation-system/progression/lib/progressionStorage';

export function loadBattleProgressionConfig(): ProgressionConfig {
  return readProgressionState().config;
}

export function useBattleProgressionRuntime(
  config: ProgressionConfig,
  skillNames: Record<string, string>
) {
  const runtimeRef = useRef<TrackRuntimeContext | null>(null);
  const mapperStateRef = useRef<BattleEventMapperState>({ killEmitted: false });
  const processedEventCountRef = useRef(0);
  const [trackStates, setTrackStates] = useState<Record<string, TrackState>>({});

  const reset = useCallback(() => {
    runtimeRef.current = createTrackRuntime(config);
    mapperStateRef.current = { killEmitted: false };
    processedEventCountRef.current = 0;
    setTrackStates(trackStatesToRecord(runtimeRef.current));
  }, [config]);

  const ingestSession = useCallback(
    (session: BattleSession) => {
      if (!runtimeRef.current) {
        runtimeRef.current = createTrackRuntime(config);
      }
      const newEvents = session.events.slice(processedEventCountRef.current);
      processedEventCountRef.current = session.events.length;
      if (newEvents.length === 0) return;

      const contributions = contributionsFromBattleEvents(
        newEvents,
        session,
        { step: 0 },
        mapperStateRef.current
      );
      if (contributions.length === 0) return;

      applyContributionBatch(runtimeRef.current, config, contributions);
      setTrackStates(trackStatesToRecord(runtimeRef.current));
    },
    [config]
  );

  const rewardSummaryLines = useMemo(
    () => buildRewardSummaryLines(config, trackStates, skillNames),
    [config, trackStates, skillNames]
  );

  const hasActivity = useMemo(
    () => Object.values(trackStates).some((s) => s.total > 0 || s.unlockedRewards.length > 0),
    [trackStates]
  );

  return {
    trackStates,
    rewardSummaryLines,
    hasActivity,
    reset,
    ingestSession,
  };
}
