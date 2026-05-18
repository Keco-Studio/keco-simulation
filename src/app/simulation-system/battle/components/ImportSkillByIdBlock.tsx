'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { useSupabase } from '@studio/lib/SupabaseContext';
import type { BattleSkillDraft } from '../lib/localTableSkillSource/battleSkillDrafts';
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
  onImportDraft: (draft: BattleSkillDraft) => void;
  /** When false, parent supplies the section heading (e.g. modal create-by-id view). */
  showSectionTitle?: boolean;
  confirmButtonLabel?: string;
};

export function ImportSkillByIdBlock({
  disabled = false,
  tables,
  tablesLoading,
  supabaseReady,
  onImportDraft,
  showSectionTitle = true,
  confirmButtonLabel = 'Import row as skill',
}: Props) {
  const supabase = useSupabase();
  const [tableId, setTableId] = useState<string | undefined>();
  const [columns, setColumns] = useState<TableColumnInfo[]>([]);
  const [idColumnKey, setIdColumnKey] = useState<string | undefined>();
  const [skillIdValue, setSkillIdValue] = useState<string | undefined>();
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
      setSkillIdValue(undefined);
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

  const finishImport = useCallback(
    async (resolutions: Record<string, BattleSkillColumnMappingKey>) => {
      if (!tableId || !idColumnKey || !skillIdValue?.trim()) return;
      const loaded = await loadTableRows(supabaseReady ? supabase : null, tableId);
      if (!loaded) {
        message.error('Failed to load table');
        return;
      }
      const row = findRowByIdCell(loaded.rows, idColumnKey, skillIdValue);
      if (!row) {
        message.error(`No row with id "${skillIdValue}" in that column`);
        return;
      }
      const plan = planImportColumnMapping(loaded.columns, resolutions);
      if (plan.ambiguities.length > 0) {
        setPendingAmbiguities(plan.ambiguities);
        setPendingResolutions(resolutions);
        return;
      }
      const draft = buildDraftFromTableRow({
        tableId,
        row,
        columnToField: plan.columnToField,
        idColumnKey,
        skillIdValue,
      });
      onImportDraft(draft);
      message.success(`Imported skill "${draft.fields.id?.value ?? skillIdValue}"`);
      setPendingAmbiguities(null);
    },
    [tableId, idColumnKey, skillIdValue, supabase, supabaseReady, onImportDraft],
  );

  const handleImportClick = useCallback(() => {
    if (!tableId || !idColumnKey || !skillIdValue?.trim()) {
      message.warning('Select table, id column, and skill id');
      return;
    }
    const plan = planImportColumnMapping(columns, {});
    if (plan.ambiguities.length > 0) {
      setPendingAmbiguities(plan.ambiguities);
      setPendingResolutions({});
      return;
    }
    void finishImport({});
  }, [tableId, idColumnKey, skillIdValue, columns, finishImport]);

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
          Pick a row by its <strong>id</strong> column (same spelling as in the table, including spaces).
          Other headers map to skill fields (case-insensitive). Missing columns use defaults. On{' '}
          <strong>Validate &amp; apply</strong>, skill id is normalized for battle code (e.g. spaces
          → underscores).
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
              setSkillIdValue(undefined);
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
              setSkillIdValue(undefined);
            }}
            options={columnOptions}
            notFoundContent={
              tableKind === 'studio' && !supabaseReady
                ? 'Sign in (same as Studio) to load columns'
                : undefined
            }
          />
          <Select
            className={styles.bindingSelect}
            placeholder="Skill id"
            disabled={disabled || !tableId || !idColumnKey || idsLoading}
            loading={idsLoading}
            allowClear
            showSearch
            optionFilterProp="label"
            value={skillIdValue}
            onChange={setSkillIdValue}
            options={idOptions}
            notFoundContent={idOptions.length === 0 ? 'No ids in this column' : undefined}
          />
        </div>
        <Button
          type="primary"
          icon={<ImportOutlined />}
          disabled={disabled || !tableId || !idColumnKey || !skillIdValue}
          onClick={handleImportClick}
          block
        >
          {confirmButtonLabel}
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
