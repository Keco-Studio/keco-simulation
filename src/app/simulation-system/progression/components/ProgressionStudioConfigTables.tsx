'use client';

import { useMemo } from 'react';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressionConfig } from '@/lib/progression/types';
import {
  PROGRESSION_RULE_COLUMNS as RC,
  PROGRESSION_TRACK_COLUMNS as TC,
} from '@/lib/progression/studio/columnKeys';
import {
  downloadProgressionRulesXlsx,
  downloadProgressionStudioWorkbook,
  downloadProgressionTracksXlsx,
} from '@/lib/progression/studio/exportProgressionStudioTemplateXlsx';
import {
  buildStudioRuleTableRows,
  buildStudioTrackTableRows,
  type StudioRuleTableRow,
  type StudioTrackTableRow,
} from '@/lib/progression/studio/studioSampleTableRows';

type Props = {
  config: ProgressionConfig;
  /** True when no Keco Studio library has been imported yet. */
  usingBuiltInDefault: boolean;
};

const trackColumns: ColumnsType<StudioTrackTableRow> = [
  { title: TC.trackId, dataIndex: TC.trackId, width: 140, ellipsis: true },
  { title: TC.label, dataIndex: TC.label, width: 160, ellipsis: true },
  { title: TC.kind, dataIndex: TC.kind, width: 120 },
  {
    title: TC.params,
    dataIndex: TC.params,
    ellipsis: true,
    render: (value: string) => (
      <Typography.Text code style={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-all' }}>
        {value}
      </Typography.Text>
    ),
  },
];

const ruleColumns: ColumnsType<StudioRuleTableRow> = [
  { title: RC.ruleId, dataIndex: RC.ruleId, width: 130, ellipsis: true },
  { title: RC.enabled, dataIndex: RC.enabled, width: 72 },
  { title: RC.whenType, dataIndex: RC.whenType, width: 120 },
  { title: RC.filter, dataIndex: RC.filter, width: 120, ellipsis: true },
  { title: RC.targetTrackId, dataIndex: RC.targetTrackId, width: 130, ellipsis: true },
  { title: RC.rewardFormula, dataIndex: RC.rewardFormula, width: 200, ellipsis: true },
  {
    title: RC.params,
    dataIndex: RC.params,
    ellipsis: true,
    render: (value: string) =>
      value ? (
        <Typography.Text code style={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-all' }}>
          {value}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary">—</Typography.Text>
      ),
  },
];

export function ProgressionStudioConfigTables({ config, usingBuiltInDefault }: Props) {
  const trackRows = useMemo(
    () => buildStudioTrackTableRows(config.tracks),
    [config.tracks],
  );
  const ruleRows = useMemo(
    () => buildStudioRuleTableRows(config.rules),
    [config.rules],
  );

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>Tracks &amp; rules tables</span>
          {usingBuiltInDefault ? (
            <Tag color="blue">Built-in default</Tag>
          ) : (
            <Tag color="green">Imported from Studio</Tag>
          )}
        </Space>
      }
      extra={
        <Space wrap>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadProgressionTracksXlsx(config.tracks)}
          >
            Export tracks (.xlsx)
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadProgressionRulesXlsx(config.rules)}
          >
            Export rules (.xlsx)
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => downloadProgressionStudioWorkbook(config)}
          >
            Both in one file
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {usingBuiltInDefault
            ? 'No Keco Studio library imported yet — simulation uses the built-in tables below. Export these files to create matching Studio libraries.'
            : 'Tables below reflect your imported Studio config. Export to back up or re-import elsewhere.'}
        </Typography.Paragraph>

        <div>
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
            Tracks library
          </Typography.Title>
          <Table
            size="small"
            bordered
            pagination={false}
            scroll={{ x: 720 }}
            columns={trackColumns}
            dataSource={trackRows}
          />
        </div>

        <div>
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
            Rules library
          </Typography.Title>
          <Table
            size="small"
            bordered
            pagination={false}
            scroll={{ x: 960 }}
            columns={ruleColumns}
            dataSource={ruleRows}
          />
        </div>
      </Space>
    </Card>
  );
}
