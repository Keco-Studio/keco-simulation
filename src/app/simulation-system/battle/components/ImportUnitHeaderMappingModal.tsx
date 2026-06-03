'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Radio, Space, Typography } from 'antd';
import type { BattleUnitColumnMappingKey } from '../lib/localTableSkillSource/battleUnitSource';
import {
  type UnitImportAmbiguity,
  unitFieldLabel,
} from '../lib/localTableSkillSource/importUnitRowFromTable';

type Props = {
  open: boolean;
  ambiguities: UnitImportAmbiguity[];
  onCancel: () => void;
  onConfirm: (resolutions: Record<string, BattleUnitColumnMappingKey>) => void;
};

export function ImportUnitHeaderMappingModal({ open, ambiguities, onCancel, onConfirm }: Props) {
  const [choices, setChoices] = useState<Record<string, BattleUnitColumnMappingKey>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, BattleUnitColumnMappingKey> = {};
    for (const a of ambiguities) {
      if (a.kind === 'header') {
        initial[a.columnKey] = a.candidates[0]!;
      } else {
        initial[a.columns[0]!.columnKey] = a.unitKey;
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
      zIndex={1100}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Some table headers match more than one stat field. Choose how each column should map.
      </Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {items.map((a) => {
          if (a.kind === 'header') {
            return (
              <div key={`header-${a.columnKey}`}>
                <Typography.Text strong>Column &quot;{a.columnLabel}&quot;</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Radio.Group
                    value={choices[a.columnKey]}
                    onChange={(e) =>
                      setChoices((prev) => ({
                        ...prev,
                        [a.columnKey]: e.target.value as BattleUnitColumnMappingKey,
                      }))
                    }
                  >
                    <Space direction="vertical">
                      {a.candidates.map((c) => (
                        <Radio key={c} value={c}>
                          {unitFieldLabel(c)} ({c})
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </div>
              </div>
            );
          }
          return (
            <div key={`collision-${a.unitKey}`}>
              <Typography.Text strong>
                Multiple columns → {unitFieldLabel(a.unitKey)}
              </Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Radio.Group
                  value={
                    a.columns.find((c) => choices[c.columnKey] === a.unitKey)?.columnKey ??
                    choices[a.columns[0]!.columnKey]
                  }
                  onChange={(e) => {
                    const picked = e.target.value as string;
                    setChoices((prev) => {
                      const next = { ...prev };
                      for (const c of a.columns) {
                        delete next[c.columnKey];
                      }
                      next[picked] = a.unitKey;
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
