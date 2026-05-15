'use client';

import { Button, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ImportSkillFailure } from '../lib/skills/battleSkillsImportExport';
import { buildBattleSkillsFailuresDownloadPayload, downloadJsonFile } from '../lib/skills/battleSkillsImportExport';
import styles from './ImportSkillsSummaryModal.module.css';

export type ImportSkillsSummaryModalProps = {
  open: boolean;
  totalInFile: number;
  successCount: number;
  failures: ImportSkillFailure[];
  onClose: () => void;
};

export function ImportSkillsSummaryModal(props: ImportSkillsSummaryModalProps) {
  const { open, totalInFile, successCount, failures, onClose } = props;

  const handleDownloadFailures = () => {
    const text = buildBattleSkillsFailuresDownloadPayload(failures);
    downloadJsonFile(`battle-skills-import-failures-${Date.now()}.json`, text);
  };

  const columns: ColumnsType<ImportSkillFailure> = [
    {
      title: '#',
      dataIndex: 'index',
      width: 64,
      render: (v: number) => v + 1,
    },
    {
      title: 'Label',
      dataIndex: 'label',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ellipsis: true,
    },
  ];

  return (
    <Modal
      title="Import result"
      open={open}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          Close
        </Button>
      }
      width={720}
      destroyOnHidden
    >
      <Typography.Paragraph className={styles.summary}>
        File has <strong>{totalInFile}</strong> row(s): <strong>{successCount}</strong> imported,{' '}
        <strong>{failures.length}</strong> failed.
      </Typography.Paragraph>
      {failures.length > 0 ? (
        <>
          <Table<ImportSkillFailure>
            size="small"
            rowKey={(r) => String(r.index)}
            columns={columns}
            dataSource={failures}
            pagination={false}
            scroll={{ y: 280 }}
            className={styles.failTable}
          />
          <Button type="primary" onClick={handleDownloadFailures}>
            Download failed rows (JSON)
          </Button>
        </>
      ) : null}
    </Modal>
  );
}
