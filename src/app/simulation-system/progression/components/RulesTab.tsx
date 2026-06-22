'use client';

import { useEffect, useState } from 'react';
import { Table, Input, Switch, Button, Space, Upload, message, Typography } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import type { Rule } from '@/lib/progression/types';
import { isValidFormula } from '@/lib/progression/formulaAdapter';
import {
  isValidRuleParamsJson,
  parseRuleParamsJson,
  stringifyRuleParams,
} from '@/lib/progression/ruleParams';

interface Props {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

function parseImportedRule(row: Record<string, unknown>, index: number): Rule {
  let params: Rule['params'];
  const rawParams = row.params;
  if (typeof rawParams === 'string' && rawParams.trim()) {
    params = parseRuleParamsJson(rawParams);
  } else if (rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)) {
    params = parseRuleParamsJson(JSON.stringify(rawParams));
  }

  return {
    id: String(row.id ?? `rule_${Date.now()}_${index}`),
    enabled: row.enabled === true || row.enabled === 'true' || row.enabled === 1,
    whenType: String(row.whenType ?? ''),
    filter: row.filter ? String(row.filter) : undefined,
    targetTrackId: String(row.targetTrackId ?? ''),
    rewardFormula: String(row.rewardFormula ?? ''),
    params,
  };
}

function RuleParamsInput({
  ruleId,
  params,
  onCommit,
}: {
  ruleId: string;
  params?: Record<string, number>;
  onCommit: (params: Rule['params']) => void;
}) {
  const committedText = stringifyRuleParams(params);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [ruleId, committedText]);

  const display = draft ?? committedText;

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!next) {
      onCommit(undefined);
      setDraft(null);
      return;
    }
    if (!isValidRuleParamsJson(next)) return;
    onCommit(parseRuleParamsJson(next));
    setDraft(null);
  };

  return (
    <Input
      status={display.trim() && !isValidRuleParamsJson(display) ? 'error' : undefined}
      placeholder='{"damageRatio":0.1,"levelBonus":5,"enemyLevel":30}'
      value={display}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onPressEnter={(e) => commit(e.currentTarget.value)}
    />
  );
}

export default function RulesTab({ rules, onChange }: Props) {
  const update = (id: string, patch: Partial<Rule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () =>
    onChange([
      ...rules,
      {
        id: `rule_${Date.now()}`,
        enabled: true,
        whenType: 'deal_damage',
        targetTrackId: '',
        rewardFormula: '',
        params: {},
      },
    ]);

  const removeRule = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const exportXlsx = () => {
    const rows = rules.map((r) => ({
      ...r,
      params: stringifyRuleParams(r.params),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'rules');
    XLSX.writeFile(wb, 'progression-rules.xlsx');
  };

  const importXlsx = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const imported = rows.map((row, i) => parseImportedRule(row, i));
        onChange(imported);
        message.success(`Imported ${imported.length} rule(s)`);
      } catch {
        message.error('Import failed: invalid file format');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const columns: ColumnsType<Rule> = [
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      width: 70,
      render: (_, r) => (
        <Switch size="small" checked={r.enabled} onChange={(v) => update(r.id, { enabled: v })} />
      ),
    },
    {
      title: 'Trigger (whenType)',
      dataIndex: 'whenType',
      width: 140,
      render: (_, r) => (
        <Input value={r.whenType} onChange={(e) => update(r.id, { whenType: e.target.value })} />
      ),
    },
    {
      title: 'Filter',
      dataIndex: 'filter',
      width: 160,
      render: (_, r) => (
        <Input
          placeholder="Optional, e.g. enemyLevel >= 20"
          value={r.filter}
          onChange={(e) => update(r.id, { filter: e.target.value })}
        />
      ),
    },
    {
      title: 'Target track (targetTrackId)',
      dataIndex: 'targetTrackId',
      width: 150,
      render: (_, r) => (
        <Input
          placeholder="prof_{skillId}"
          value={r.targetTrackId}
          onChange={(e) => update(r.id, { targetTrackId: e.target.value })}
        />
      ),
    },
    {
      title: 'Reward formula (rewardFormula)',
      dataIndex: 'rewardFormula',
      width: 220,
      render: (_, r) => (
        <Input
          status={r.rewardFormula && !isValidFormula(r.rewardFormula) ? 'error' : undefined}
          placeholder="amount * damageRatio + enemyLevel * levelBonus"
          value={r.rewardFormula}
          onChange={(e) => update(r.id, { rewardFormula: e.target.value })}
        />
      ),
    },
    {
      title: 'Formula params (params JSON)',
      dataIndex: 'params',
      width: 220,
      render: (_, r) => (
        <RuleParamsInput
          ruleId={r.id}
          params={r.params}
          onCommit={(params) => update(r.id, { params })}
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, r) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRule(r.id)} />
      ),
    },
  ];

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Formulas may reference <Typography.Text code>amount</Typography.Text> (event quantity), fixed
        values in <Typography.Text code>params</Typography.Text> (e.g. damageRatio, enemyLevel,
        expPerKill), and dynamic fields from event ctx (e.g. skillId, enemyName). When names
        collide, <Typography.Text code>params</Typography.Text> overrides ctx.
      </Typography.Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={addRule}>
          Add rule
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportXlsx}>
          Export XLSX
        </Button>
        <Upload beforeUpload={importXlsx} showUploadList={false} accept=".xlsx">
          <Button icon={<UploadOutlined />}>Import XLSX</Button>
        </Upload>
      </Space>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rules}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}
