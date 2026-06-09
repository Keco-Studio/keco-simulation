'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { useSupabase } from '@studio/lib/SupabaseContext';
import type { BattleUnitConfig } from '../lib/localTableSkillSource/battleUnitSource';
import type { BattleUnitColumnMappingKey } from '../lib/localTableSkillSource/battleUnitSource';
import { columnMapToResolutions, type UnitImportResult } from '../lib/battleUnitImportHistory';
import {
  detectUnitIdColumnKey,
  findRowByIdCell,
  planUnitImportColumnMapping,
  resolveUnitConfigFromTableRow,
  type UnitImportAmbiguity,
} from '../lib/localTableSkillSource/importUnitRowFromTable';
import {
  loadColumnValueOptions,
  loadTableRows,
  type SelectableTableInfo,
  type TableColumnInfo,
} from '../lib/localTableSkillSource/simTablePickerData';
import { ImportUnitHeaderMappingModal } from './ImportUnitHeaderMappingModal';
import styles from './BattleLocalTableSkillSourcePanel.module.css';

type Props = {
  disabled?: boolean;
  tables: SelectableTableInfo[];
  tablesLoading: boolean;
  supabaseReady: boolean;
  fallbackConfig: BattleUnitConfig;
  onImport: (result: UnitImportResult) => void;
};

export function ImportUnitByIdBlock({
  disabled = false,
  tables,
  tablesLoading,
  supabaseReady,
  fallbackConfig,
  onImport,
}: Props) {
  const supabase = useSupabase();
  const [tableId, setTableId] = useState<string | undefined>();
  const [columns, setColumns] = useState<TableColumnInfo[]>([]);
  const [idColumnKey, setIdColumnKey] = useState<string | undefined>();
  const [unitIdValue, setUnitIdValue] = useState<string | undefined>();
  const [idOptions, setIdOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [idsLoading, setIdsLoading] = useState(false);
  const [pendingAmbiguities, setPendingAmbiguities] = useState<UnitImportAmbiguity[] | null>(null);
  const [pendingResolutions, setPendingResolutions] = useState<
    Record<string, BattleUnitColumnMappingKey>
  >({});

  const tableKind = tables.find((t) => t.id === tableId)?.kind;

  useEffect(() => {
    if (!tableId) {
      setColumns([]);
      setIdColumnKey(undefined);
      setUnitIdValue(undefined);
      setIdOptions([]);
      return;
    }
    let cancelled = false;
    setTableLoading(true);
    void loadTableRows(supabaseReady ? supabase : null, tableId)
      .then((res) => {
        if (cancelled || !res) return;
        setColumns(res.columns);
        const detected = detectUnitIdColumnKey(res.columns);
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
    async (resolutions: Record<string, BattleUnitColumnMappingKey>) => {
      if (!tableId || !idColumnKey || !unitIdValue?.trim()) return;
      const loaded = await loadTableRows(supabaseReady ? supabase : null, tableId);
      if (!loaded) {
        message.error('Failed to load table');
        return;
      }
      const plan = planUnitImportColumnMapping(loaded.columns, resolutions);
      if (plan.ambiguities.length > 0) {
        setPendingAmbiguities(plan.ambiguities);
        setPendingResolutions(resolutions);
        return;
      }

      const row = findRowByIdCell(loaded.rows, idColumnKey, unitIdValue);
      if (!row) {
        message.error(`No row found for id "${unitIdValue.trim()}"`);
        return;
      }

      const result = resolveUnitConfigFromTableRow({
        tableId,
        row,
        columnToField: plan.columnToField,
        idColumnKey,
        idValue: unitIdValue,
        fallback: fallbackConfig,
      });
      if ('error' in result) {
        message.error(result.error);
        return;
      }

      const tableName = tables.find((t) => t.id === tableId)?.name ?? tableId;
      onImport({
        config: result.config,
        binding: {
          tableId,
          tableName,
          idColumnKey,
          unitIdValue: unitIdValue.trim(),
          columnResolutions: columnMapToResolutions(plan.columnToField),
        },
      });
      message.success(`Imported stats for "${result.config.name}"`);
      setUnitIdValue(undefined);
      setPendingAmbiguities(null);
    },
    [tableId, idColumnKey, unitIdValue, supabase, supabaseReady, fallbackConfig, onImport],
  );

  const handleImportClick = useCallback(() => {
    if (!tableId || !idColumnKey || !unitIdValue?.trim()) {
      message.warning('Select table, id column, and unit id');
      return;
    }
    const plan = planUnitImportColumnMapping(columns, {});
    if (plan.ambiguities.length > 0) {
      setPendingAmbiguities(plan.ambiguities);
      setPendingResolutions({});
      return;
    }
    void finishImport({});
  }, [tableId, idColumnKey, unitIdValue, columns, finishImport]);

  const handleMappingConfirm = useCallback(
    (resolutions: Record<string, BattleUnitColumnMappingKey>) => {
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
      <div className={styles.importByIdBlockEmbedded}>
        <p className={styles.mappingHint}>
          Pick a row by its <strong>id</strong> column. Other headers map to stat fields
          (case-insensitive). Missing columns keep current values.
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
              setUnitIdValue(undefined);
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
              setUnitIdValue(undefined);
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
            placeholder="Unit id"
            disabled={disabled || !tableId || !idColumnKey || idsLoading}
            loading={idsLoading}
            allowClear
            showSearch
            optionFilterProp="label"
            value={unitIdValue}
            onChange={setUnitIdValue}
            options={idOptions}
            notFoundContent={idOptions.length === 0 ? 'No ids in this column' : undefined}
          />
        </div>
        <Button
          type="primary"
          icon={<ImportOutlined />}
          disabled={disabled || !tableId || !idColumnKey || !unitIdValue?.trim()}
          onClick={handleImportClick}
          block
        >
          Import row
        </Button>
      </div>

      <ImportUnitHeaderMappingModal
        open={pendingAmbiguities !== null && pendingAmbiguities.length > 0}
        ambiguities={pendingAmbiguities ?? []}
        onCancel={() => setPendingAmbiguities(null)}
        onConfirm={handleMappingConfirm}
      />
    </>
  );
}
