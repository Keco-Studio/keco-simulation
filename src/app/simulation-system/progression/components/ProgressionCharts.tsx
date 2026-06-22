'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { Snapshot } from '@/lib/progression/types';

interface Props {
  snapshots: Snapshot[];
  /** Optional map from trackId to a human-friendly display name (e.g. real skill names). */
  labels?: Record<string, string>;
}

export default function ProgressionCharts({ snapshots, labels }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const steps = snapshots.map((s) => s.step);
    const trackIds = snapshots.length
      ? Object.keys(snapshots[snapshots.length - 1].tracks)
      : [];
    const nameOf = (id: string) => labels?.[id] ?? id;
    const seriesNames = trackIds.map(nameOf);
    const series = trackIds.map((id) => ({
      name: nameOf(id),
      type: 'line' as const,
      smooth: true,
      data: snapshots.map((s) => Math.round(s.tracks[id]?.total ?? 0)),
    }));
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: seriesNames, type: 'scroll' },
      grid: { left: 56, right: 24, top: 48, bottom: 40 },
      xAxis: { type: 'category', data: steps, name: 'step' },
      yAxis: { type: 'value', name: 'Total' },
      series,
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [snapshots, labels]);

  return <div ref={ref} style={{ width: '100%', height: 360 }} />;
}
