'use client';

import { useMemo, useState } from 'react';
import { Button, Card, List, Typography, message } from 'antd';
import { resolveUpgradeCost } from '@/lib/characterProgression/merge';
import type { SkillLevelCurveRow, UserProgression, UserSkillLevel } from '@/lib/characterProgression/types';
import type { Skill } from '@/app/simulation-system/battle/types';

type Props = {
  progression: UserProgression | null;
  skillLevels: UserSkillLevel[];
  skills: Record<string, Skill>;
  skillLevelCurve: SkillLevelCurveRow[];
  onUpgrade: (skillId: string) => Promise<unknown>;
};

export function CloudSkillUpgradePanel({
  progression,
  skillLevels,
  skills,
  skillLevelCurve,
  onUpgrade,
}: Props) {
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const ids = new Set([...Object.keys(skills), ...skillLevels.map((s) => s.skillId)]);
    return [...ids].map((skillId) => {
      const skill = skills[skillId];
      const allocated = skillLevels.find((s) => s.skillId === skillId)?.level ?? 0;
      const cost = resolveUpgradeCost(skillId, allocated, skillLevelCurve);
      return { skillId, skill, allocated, cost };
    });
  }, [skills, skillLevels, skillLevelCurve]);

  const handleUpgrade = async (
    skillId: string,
    skillName: string,
    nextLevel: number,
    cost: number,
  ) => {
    if (!progression || progression.skillPoints < cost) {
      message.error('Insufficient skill points');
      return;
    }
    setUpgradingId(skillId);
    try {
      await onUpgrade(skillId);
      message.success(`${skillName} upgraded to Lv.${nextLevel}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgradingId(null);
    }
  };

  return (
    <Card size="small" title="Skill upgrades">
      {rows.length === 0 ? (
        <Typography.Text type="secondary">Import a Skills library to upgrade skills.</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={rows}
          renderItem={(row) => {
            const name = row.skill?.name ?? row.skillId;
            const canUpgrade = row.cost != null && progression && progression.skillPoints >= row.cost;
            return (
              <List.Item
                actions={[
                  row.cost != null ? (
                    <Button
                      key="upgrade"
                      type="link"
                      size="small"
                      disabled={!canUpgrade}
                      loading={upgradingId === row.skillId}
                      onClick={() =>
                        void handleUpgrade(row.skillId, name, row.allocated + 1, row.cost!)
                      }
                    >
                      Upgrade ({row.cost} SP)
                    </Button>
                  ) : (
                    <Typography.Text key="max" type="secondary">
                      Max
                    </Typography.Text>
                  ),
                ]}
              >
                <List.Item.Meta
                  title={`${name} · Lv.${row.allocated}`}
                  description={row.skill ? `Power ${row.skill.power}` : 'Skill not in Studio bundle'}
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
