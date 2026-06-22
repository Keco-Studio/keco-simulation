'use client';

import { Table, Input, Switch, Button, Space, Upload, message } from 'antd';
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

interface Props {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
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
      },
    ]);

  const removeRule = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(rules);
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
        const imported: Rule[] = rows.map((row, i) => ({
          id: String(row.id ?? `rule_${Date.now()}_${i}`),
          enabled: row.enabled === true || row.enabled === 'true' || row.enabled === 1,
          whenType: String(row.whenType ?? ''),
          filter: row.filter ? String(row.filter) : undefined,
          targetTrackId: String(row.targetTrackId ?? ''),
          rewardFormula: String(row.rewardFormula ?? ''),
        }));
        onChange(imported);
        message.success(`导入 ${imported.length} 条规则`);
      } catch {
        message.error('导入失败：文件格式不正确');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const columns: ColumnsType<Rule> = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 70,
      render: (_, r) => (
        <Switch size="small" checked={r.enabled} onChange={(v) => update(r.id, { enabled: v })} />
      ),
    },
    {
      title: '触发事件 (whenType)',
      dataIndex: 'whenType',
      width: 160,
      render: (_, r) => (
        <Input value={r.whenType} onChange={(e) => update(r.id, { whenType: e.target.value })} />
      ),
    },
    {
      title: '过滤条件 (filter)',
      dataIndex: 'filter',
      width: 180,
      render: (_, r) => (
        <Input
          placeholder="可选, 如 enemyLevel >= 20"
          value={r.filter}
          onChange={(e) => update(r.id, { filter: e.target.value })}
        />
      ),
    },
    {
      title: '目标轨道 (targetTrackId)',
      dataIndex: 'targetTrackId',
      width: 180,
      render: (_, r) => (
        <Input
          placeholder="prof_{skillId}"
          value={r.targetTrackId}
          onChange={(e) => update(r.id, { targetTrackId: e.target.value })}
        />
      ),
    },
    {
      title: '奖励公式 (rewardFormula)',
      dataIndex: 'rewardFormula',
      render: (_, r) => (
        <Input
          status={r.rewardFormula && !isValidFormula(r.rewardFormula) ? 'error' : undefined}
          placeholder="amount*0.1 + enemyLevel*5"
          value={r.rewardFormula}
          onChange={(e) => update(r.id, { rewardFormula: e.target.value })}
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
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={addRule}>
          新增规则
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportXlsx}>
          导出 XLSX
        </Button>
        <Upload beforeUpload={importXlsx} showUploadList={false} accept=".xlsx">
          <Button icon={<UploadOutlined />}>导入 XLSX</Button>
        </Upload>
      </Space>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rules}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
