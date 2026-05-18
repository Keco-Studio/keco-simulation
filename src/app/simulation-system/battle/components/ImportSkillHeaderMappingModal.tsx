'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Radio, Space, Typography } from 'antd';
import type { BattleSkillColumnMappingKey } from '../lib/localTableSkillSource/battleLocalTableSkillSource';
import {
  type ImportAmbiguity,
  skillFieldLabel,
} from '../lib/localTableSkillSource/importSkillRowFromTable';

type Props = {
  open: boolean;
  ambiguities: ImportAmbiguity[];
  onCancel: () => void;
  onConfirm: (resolutions: Record<string, BattleSkillColumnMappingKey>) => void;
};

export function ImportSkillHeaderMappingModal({ open, ambiguities, onCancel, onConfirm }: Props) {
  const [choices, setChoices] = useState<Record<string, BattleSkillColumnMappingKey>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, BattleSkillColumnMappingKey> = {};
    for (const a of ambiguities) {
      if (a.kind === 'header') {
        initial[a.columnKey] = a.candidates[0]!;
      } else {
        initial[a.columns[0]!.columnKey] = a.skillKey;
      }
    }
    setChoices(initial);
  }, [open, ambiguities]);

  const items = useMemo(() => ambiguities, [ambiguities]);

  return (
    <Modal
      title="Resolve column mapping"
      open={open}
      onCancel={onCancel}
      onOk={() => onConfirm(choices)}
      okText="Import"
      cancelText="Cancel"
      destroyOnHidden
      width={480}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Some table headers match more than one skill field. Choose how each column should map.
      </Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {items.map((a) => {
          if (a.kind === 'header') {
            return (
              <div key={`header-${a.columnKey}`}>
                <Typography.Text strong>
                  Column &quot;{a.columnLabel}&quot;
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Radio.Group
                    value={choices[a.columnKey]}
                    onChange={(e) =>
                      setChoices((prev) => ({
                        ...prev,
                        [a.columnKey]: e.target.value as BattleSkillColumnMappingKey,
                      }))
                    }
                  >
                    <Space direction="vertical">
                      {a.candidates.map((c) => (
                        <Radio key={c} value={c}>
                          {skillFieldLabel(c)} ({c})
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </div>
              </div>
            );
          }
          return (
            <div key={`collision-${a.skillKey}`}>
              <Typography.Text strong>
                Multiple columns → {skillFieldLabel(a.skillKey)}
              </Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Radio.Group
                  value={
                    a.columns.find((c) => choices[c.columnKey] === a.skillKey)?.columnKey ??
                    choices[a.columns[0]!.columnKey]
                  }
                  onChange={(e) => {
                    const picked = e.target.value as string;
                    setChoices((prev) => {
                      const next = { ...prev };
                      for (const c of a.columns) {
                        delete next[c.columnKey];
                      }
                      next[picked] = a.skillKey;
                      return next;
                    });
                  }}
                >
                  <Space direction="vertical">
                    {a.columns.map((c) => (
                      <Radio key={c.columnKey} value={c.columnKey}>
                        Use column &quot;{c.columnLabel}&quot;
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </div>
            </div>
          );
        })}
      </Space>
    </Modal>
  );
}
