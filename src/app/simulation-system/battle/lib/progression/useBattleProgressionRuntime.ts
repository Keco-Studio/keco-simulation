'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { BattleSession } from '@keco/battle-core';
import type { ProgressionConfig, TrackState, RewardGrant } from '@/lib/progression/types';
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
  config: ProgressionConfig | null,
  skillNames: Record<string, string>,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false && config !== null;
  const runtimeRef = useRef<TrackRuntimeContext | null>(null);
  const mapperStateRef = useRef<BattleEventMapperState>({ killEmitted: false });
  const processedEventCountRef = useRef(0);
  const [trackStates, setTrackStates] = useState<Record<string, TrackState>>({});

  const reset = useCallback(() => {
    if (!enabled || !config) {
      runtimeRef.current = null;
      mapperStateRef.current = { killEmitted: false };
      processedEventCountRef.current = 0;
      setTrackStates({});
      return;
    }
    runtimeRef.current = createTrackRuntime(config);
    mapperStateRef.current = { killEmitted: false };
    processedEventCountRef.current = 0;
    setTrackStates(trackStatesToRecord(runtimeRef.current));
  }, [config, enabled]);

  const ingestSession = useCallback(
    (session: BattleSession): { grants: RewardGrant[]; trackStates: Record<string, TrackState> } => {
      if (!enabled || !config) return { grants: [], trackStates: {} };
      if (!runtimeRef.current) {
        runtimeRef.current = createTrackRuntime(config);
      }
      const newEvents = session.events.slice(processedEventCountRef.current);
      processedEventCountRef.current = session.events.length;
      if (newEvents.length === 0) {
        return { grants: [], trackStates: trackStatesToRecord(runtimeRef.current) };
      }

      const contributions = contributionsFromBattleEvents(
        newEvents,
        session,
        { step: 0 },
        mapperStateRef.current
      );
      if (contributions.length === 0) {
        return { grants: [], trackStates: trackStatesToRecord(runtimeRef.current) };
      }

      const grants = applyContributionBatch(runtimeRef.current, config, contributions);
      const nextStates = trackStatesToRecord(runtimeRef.current);
      setTrackStates(nextStates);
      return { grants, trackStates: nextStates };
    },
    [config, enabled]
  );

  const rewardSummaryLines = useMemo(
    () => (enabled && config ? buildRewardSummaryLines(config, trackStates, skillNames) : []),
    [config, enabled, trackStates, skillNames]
  );

  const hasActivity = useMemo(
    () =>
      enabled &&
      Object.values(trackStates).some((s) => s.total > 0 || s.unlockedRewards.length > 0),
    [enabled, trackStates]
  );

  return {
    trackStates,
    rewardSummaryLines,
    hasActivity,
    reset,
    ingestSession,
  };
}
