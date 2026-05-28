'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { useSupabase } from '@studio/lib/SupabaseContext';
import {
  type BattleSkillDraft,
  type DraftImportReject,
  partitionDraftsBySkillId,
} from '../lib/localTableSkillSource/battleSkillDrafts';
import type { BattleSkillColumnMappingKey } from '../lib/localTableSkillSource/battleLocalTableSkillSource';
import {
  buildDraftFromTableRow,
  detectIdColumnKey,
  findRowByIdCell,
  planImportColumnMapping,
  type ImportAmbiguity,
} from '../lib/localTableSkillSource/importSkillRowFromTable';
import {
  loadColumnValueOptions,
  loadTableRows,
  type SelectableTableInfo,
  type TableColumnInfo,
} from '../lib/localTableSkillSource/simTablePickerData';
import { ImportSkillHeaderMappingModal } from './ImportSkillHeaderMappingModal';
import styles from './BattleLocalTableSkillSourcePanel.module.css';

type Props = {
  disabled?: boolean;
  tables: SelectableTableInfo[];
  tablesLoading: boolean;
  supabaseReady: boolean;
  existingDrafts: BattleSkillDraft[];
  onImportDraft: (draft: BattleSkillDraft | BattleSkillDraft[]) => void;
  /** When false, parent supplies the section heading (e.g. modal create-by-id view). */
  showSectionTitle?: boolean;
  confirmButtonLabel?: string;
};

export function ImportSkillByIdBlock({
  disabled = false,
  tables,
  tablesLoading,
  supabaseReady,
  existingDrafts,
  onImportDraft,
  showSectionTitle = true,
  confirmButtonLabel = 'Import selected',
}: Props) {
  const supabase = useSupabase();
  const [tableId, setTableId] = useState<string | undefined>();
  const [columns, setColumns] = useState<TableColumnInfo[]>([]);
  const [idColumnKey, setIdColumnKey] = useState<string | undefined>();
  const [skillIdValues, setSkillIdValues] = useState<string[]>([]);
  const [idOptions, setIdOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [idsLoading, setIdsLoading] = useState(false);
  const [pendingAmbiguities, setPendingAmbiguities] = useState<ImportAmbiguity[] | null>(null);
  const [pendingResolutions, setPendingResolutions] = useState<
    Record<string, BattleSkillColumnMappingKey>
  >({});

  const tableKind = tables.find((t) => t.id === tableId)?.kind;

  useEffect(() => {
    if (!tableId) {
      setColumns([]);
      setIdColumnKey(undefined);
      setSkillIdValues([]);
      setIdOptions([]);
      return;
    }
    let cancelled = false;
    setTableLoading(true);
    void loadTableRows(supabaseReady ? supabase : null, tableId)
      .then((res) => {
        if (cancelled || !res) return;
        setColumns(res.columns);
        const detected = detectIdColumnKey(res.columns);
        setIdColumnKey(detected ?? res.columns[0]?.key);
      })
      .finally(() => {
        if (!cancelled) setTableLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, supabase, supabaseReady]);

  useEffect(() => {
    if (!tableId || !idColumnKey) {
      setIdOptions([]);
      return;
    }
    let cancelled = false;
    setIdsLoading(true);
    void loadColumnValueOptions(supabaseReady ? supabase : null, tableId, idColumnKey)
      .then((opts) => {
        if (cancelled) return;
        setIdOptions(opts.map((o) => ({ value: o.value, label: o.label || o.value })));
      })
      .finally(() => {
        if (!cancelled) setIdsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, idColumnKey, supabase, supabaseReady]);

  const selectedIds = useMemo(
    () => [...new Set(skillIdValues.map((v) => v.trim()).filter(Boolean))],
    [skillIdValues],
  );

  const reportImportRejections = useCallback((rejected: DraftImportReject[]) => {
    if (rejected.length === 0) return;
    if (rejected.length === 1) {
      const r = rejected[0]!;
      message.error(`Failed to import "${r.displayId}": ${r.reason}`);
      return;
    }
    const preview = rejected
      .slice(0, 5)
      .map((r) => `"${r.displayId}" (${r.reason})`)
      .join('; ');
    const more = rejected.length > 5 ? ` (+${rejected.length - 5} more)` : '';
    message.error(`Failed to import ${rejected.length} skill(s): ${preview}${more}`);
  }, []);

  const finishImport = useCallback(
    async (resolutions: Record<string, BattleSkillColumnMappingKey>) => {
      if (!tableId || !idColumnKey || selectedIds.length === 0) return;
      const loaded = await loadTableRows(supabaseReady ? supabase : null, tableId);
      if (!loaded) {
        message.error('Failed to load table');
        return;
      }
      const plan = planImportColumnMapping(loaded.columns, resolutions);
      if (plan.ambiguities.length > 0) {
        setPendingAmbiguities(plan.ambiguities);
        setPendingResolutions(resolutions);
        return;
      }

      const drafts: BattleSkillDraft[] = [];
      const missing: string[] = [];
      for (const skillId of selectedIds) {
        const row = findRowByIdCell(loaded.rows, idColumnKey, skillId);
        if (!row) {
          missing.push(skillId);
          continue;
        }
        drafts.push(
          buildDraftFromTableRow({
            tableId,
            row,
            columnToField: plan.columnToField,
            idColumnKey,
            skillIdValue: skillId,
          }),
        );
      }

      if (missing.length > 0) {
        const preview = missing.slice(0, 3).join(', ');
        const more = missing.length > 3 ? ` (+${missing.length - 3} more)` : '';
        message.warning(`Skipped ${missing.length} id(s) not found: ${preview}${more}`);
      }
      if (drafts.length === 0) {
        message.error('No rows imported');
        return;
      }

      const { accepted, rejected } = partitionDraftsBySkillId(drafts, existingDrafts);
      reportImportRejections(rejected);

      if (accepted.length === 0) {
        return;
      }

      onImportDraft(accepted.length === 1 ? accepted[0]! : accepted);
      message.success(
        accepted.length === 1
          ? `Imported skill "${accepted[0]!.fields.id?.value ?? selectedIds[0]}"`
          : `Imported ${accepted.length} skills`,
      );
      setSkillIdValues([]);
      setPendingAmbiguities(null);
    },
    [
      tableId,
      idColumnKey,
      selectedIds,
      supabase,
      supabaseReady,
      existingDrafts,
      onImportDraft,
      reportImportRejections,
    ],
  );

  const handleImportClick = useCallback(() => {
    if (!tableId || !idColumnKey || selectedIds.length === 0) {
      message.warning('Select table, id column, and at least one skill id');
      return;
    }
    const plan = planImportColumnMapping(columns, {});
    if (plan.ambiguities.length > 0) {
      setPendingAmbiguities(plan.ambiguities);
      setPendingResolutions({});
      return;
    }
    void finishImport({});
  }, [tableId, idColumnKey, selectedIds.length, columns, finishImport]);

  const handleMappingConfirm = useCallback(
    (resolutions: Record<string, BattleSkillColumnMappingKey>) => {
      const merged = { ...pendingResolutions, ...resolutions };
      setPendingAmbiguities(null);
      void finishImport(merged);
    },
    [finishImport, pendingResolutions],
  );

  const columnOptions = useMemo(
    () => columns.map((c) => ({ value: c.key, label: c.label })),
    [columns],
  );

  return (
    <>
      <div className={showSectionTitle ? styles.importByIdBlock : styles.importByIdBlockEmbedded}>
        {showSectionTitle ? <div className={styles.importByIdTitle}>Import by id</div> : null}
        <p className={styles.mappingHint}>
          Pick one or more rows by their <strong>id</strong> column (same spelling as in the table,
          including spaces). Other headers map to skill fields (case-insensitive). Missing columns use
          defaults. On <strong>Validate &amp; apply</strong>, skill id is normalized for battle code
          (e.g. spaces → underscores).
        </p>
        <div className={styles.bindingRow}>
          <Select
            className={styles.bindingSelect}
            placeholder="Table"
            disabled={disabled || tablesLoading}
            loading={tablesLoading}
            allowClear
            showSearch
            optionFilterProp="label"
            value={tableId}
            onChange={(v) => {
              setTableId(v);
              setSkillIdValues([]);
            }}
            options={tables.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Select
            className={styles.bindingSelect}
            placeholder="Id column"
            disabled={disabled || !tableId || tableLoading}
            loading={tableLoading}
            showSearch
            optionFilterProp="label"
            value={idColumnKey}
            onChange={(v) => {
              setIdColumnKey(v);
              setSkillIdValues([]);
            }}
            options={columnOptions}
            notFoundContent={
              tableKind === 'studio' && !supabaseReady
                ? 'Sign in (same as Studio) to load columns'
                : undefined
            }
          />
          <Select
            className={`${styles.bindingSelect} ${styles.bindingSelectMulti}`}
            placeholder="Skill id(s)"
            disabled={disabled || !tableId || !idColumnKey || idsLoading}
            loading={idsLoading}
            mode="multiple"
            allowClear
            showSearch
            maxTagCount="responsive"
            optionFilterProp="label"
            value={skillIdValues}
            onChange={(v) => setSkillIdValues(v)}
            options={idOptions}
            notFoundContent={idOptions.length === 0 ? 'No ids in this column' : undefined}
          />
        </div>
        <Button
          type="primary"
          icon={<ImportOutlined />}
          disabled={disabled || !tableId || !idColumnKey || selectedIds.length === 0}
          onClick={handleImportClick}
          block
        >
          {selectedIds.length > 1
            ? `${confirmButtonLabel} (${selectedIds.length})`
            : confirmButtonLabel}
        </Button>
      </div>

      <ImportSkillHeaderMappingModal
        open={pendingAmbiguities !== null && pendingAmbiguities.length > 0}
        ambiguities={pendingAmbiguities ?? []}
        onCancel={() => setPendingAmbiguities(null)}
        onConfirm={handleMappingConfirm}
      />
    </>
  );
}
