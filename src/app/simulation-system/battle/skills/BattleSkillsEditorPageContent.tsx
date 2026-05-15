'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Pagination, Space, Table, Typography } from 'antd';
import { useMemo } from 'react';
import { PAGE_SIZE, TABLE_SCROLL_X } from '../skills-editor/battleSkillsEditorConstants';
import { BattleSkillsEditorHelpCollapse } from '../skills-editor/BattleSkillsEditorHelpCollapse';
import { ImportSkillsSummaryModal } from '../skills-editor/ImportSkillsSummaryModal';
import { useBattleSkillsEditor } from '../skills-editor/useBattleSkillsEditor';
import { DEFAULT_BATTLE_SKILL_MODULE_ID } from '../lib/skills/battleSkillModulesStorage';
import styles from './BattleSkillsEditor.module.css';

export function BattleSkillsEditorPageContent() {
  const {
    persistReady,
    lastSavedAt,
    columns,
    dataSource,
    currentPage,
    setCurrentPage,
    rows,
    addRow,
    handleClearTable,
    handleResetBuiltin,
    importFileInputRef,
    importSummary,
    handleExportSkills,
    handlePickImportFile,
    handleImportFileChange,
    handleCloseImportSummary,
  } = useBattleSkillsEditor(DEFAULT_BATTLE_SKILL_MODULE_ID);

  const tableMinWidth = useMemo(
    () => ({ ['--battle-skills-table-min-width' as string]: `${TABLE_SCROLL_X}px` }),
    [],
  );

  const savedLabel = useMemo(() => {
    if (!lastSavedAt) return null;
    return new Date(lastSavedAt).toLocaleString();
  }, [lastSavedAt]);

  return (
    <div className={styles.root} style={tableMinWidth}>
      <div className={styles.stack}>
        <BattleSkillsEditorHelpCollapse />
        <div className={styles.toolbar} style={{ marginTop: 16 }}>
          <div>
            <Typography.Title level={4} className={styles.title}>
              Battle skills sheet
            </Typography.Title>
            <div className={styles.savedAtWrap}>
              {savedLabel ? (
                <Typography.Text type="secondary" className={styles.savedAt}>
                  Last saved: {savedLabel}
                </Typography.Text>
              ) : null}
            </div>
          </div>
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={addRow} disabled={!persistReady}>
              Add row
            </Button>
            <Button onClick={handleClearTable} disabled={!persistReady}>
              Clear table
            </Button>
            <Button onClick={handleResetBuiltin} disabled={!persistReady}>
              Reset to built-in defaults
            </Button>
            <Button onClick={handleExportSkills}>Export .xlsx</Button>
            <Button onClick={handlePickImportFile}>Import .xlsx</Button>
          </Space>
        </div>

        <input
          ref={importFileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={styles.hiddenFileInput}
          onChange={handleImportFileChange}
        />

        <Card className={styles.cardNoBodyPad} style={{ marginTop: 16 }}>
          <div className={styles.tableScroll}>
            <Table
              rowKey={(r) => r._idx}
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              loading={!persistReady}
              tableLayout="fixed"
            />
          </div>
          <div className={styles.summaryRow}>
            <Button type="dashed" block className={styles.addRowButton} onClick={addRow} disabled={!persistReady}>
              <PlusOutlined className={styles.addRowIcon} /> Add row
            </Button>
          </div>
          <div className={styles.paginationBar}>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={rows.length}
              showSizeChanger={false}
              onChange={(p) => setCurrentPage(p)}
            />
          </div>
        </Card>
      </div>

      {importSummary ? (
        <ImportSkillsSummaryModal
          open
          totalInFile={importSummary.total}
          successCount={importSummary.success}
          failures={importSummary.failures}
          onClose={handleCloseImportSummary}
        />
      ) : null}
    </div>
  );
}
