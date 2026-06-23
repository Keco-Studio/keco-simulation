'use client';

import { Card, Progress, Typography } from 'antd';
import type { CharLevelCurveRow, UserProgression } from '@/lib/characterProgression/types';

type Props = {
  progression: UserProgression | null;
  charLevelCurve: CharLevelCurveRow[];
  characterName?: string;
};

function expBarPercent(
  progression: UserProgression,
  curve: CharLevelCurveRow[],
): { percent: number; nextNeed: number | null } {
  const sorted = [...curve].sort((a, b) => a.level - b.level);
  const maxLevel = sorted.length > 0 ? sorted[sorted.length - 1].level : progression.level;
  if (progression.level >= maxLevel) return { percent: 100, nextNeed: null };

  const currentNeed = sorted.find((r) => r.level === progression.level)?.needExp ?? 0;
  const nextNeed = sorted.find((r) => r.level === progression.level + 1)?.needExp ?? null;
  if (nextNeed == null || nextNeed <= currentNeed) return { percent: 100, nextNeed: null };

  const span = nextNeed - currentNeed;
  const into = progression.exp - currentNeed;
  const percent = span > 0 ? Math.max(0, Math.min(100, (into / span) * 100)) : 0;
  return { percent, nextNeed };
}

export function CloudProgressionStatusCard({ progression, charLevelCurve, characterName }: Props) {
  if (!progression) {
    return (
      <Card size="small" title="Your progression">
        <Typography.Text type="secondary">Loading progression…</Typography.Text>
      </Card>
    );
  }

  const { percent, nextNeed } = expBarPercent(progression, charLevelCurve);

  return (
    <Card size="small" title="Your progression">
      <Typography.Paragraph style={{ marginBottom: 8 }}>
        {characterName ? (
          <>
            Character: <strong>{characterName}</strong>
          </>
        ) : (
          <Typography.Text type="secondary">No character bound yet</Typography.Text>
        )}
      </Typography.Paragraph>
      <Typography.Paragraph style={{ marginBottom: 4 }}>
        Level <strong>{progression.level}</strong> · EXP <strong>{progression.exp}</strong>
        {nextNeed != null ? ` / ${nextNeed} to next level` : ' (max level)'}
      </Typography.Paragraph>
      <Progress percent={Math.round(percent)} size="small" showInfo={false} />
      <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
        Skill points: <strong>{progression.skillPoints}</strong>
      </Typography.Paragraph>
    </Card>
  );
}
