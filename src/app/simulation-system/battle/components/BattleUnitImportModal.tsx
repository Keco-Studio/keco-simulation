'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Select, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import {
  BATTLE_UNIT_MAPPING_FIELDS,
  type BattleUnitColumnMappingKey,
  type BattleUnitConfig,
} from '../lib/localTableSkillSource/battleUnitSource';
import { DEFAULT_MONSTER_STATS, DEFAULT_PLAYER_STATS } from '../types';
import type { LocalTableCellRef } from '../lib/localTableSkillSource/battleSkillDrafts';
import type { UnitImportResult } from '../lib/battleUnitImportHistory';
import { unitFieldsToConfig } from '../lib/localTableSkillSource/importUnitRowFromTable';
import {
  listSelectableTablesForSkillPicker,
  loadColumnValueOptions,
  loadTableColumns,
  type PickerValueOption,
  type SelectableTableInfo,
  type TableColumnInfo,
} from '../lib/localTableSkillSource/simTablePickerData';
import { ImportUnitByIdBlock } from './ImportUnitByIdBlock';
import panelStyles from './BattleLocalTableSkillSourcePanel.module.css';
import styles from './BattleUnitImportModal.module.css';

type ModalView = 'home' | 'attributes';

type Props = {
  open: boolean;
  target: 'player' | 'enemy';
  fallbackConfig: BattleUnitConfig;
  onClose: () => void;
  onApply: (result: UnitImportResult) => void;
};

const FIELD_OPTIONS = BATTLE_UNIT_MAPPING_FIELDS.map((f) => ({
  value: f.key,
  label: f.required ? `${f.label} *` : f.label,
}));

function UnitFieldBindingRow({
  fieldKey,
  cellRef,
  disabled,
  tables,
  tablesLoading,
  supabaseReady,
  onChange,
}: {
  fieldKey: BattleUnitColumnMappingKey;
  cellRef?: LocalTableCellRef;
  disabled?: boolean;
  tables: SelectableTableInfo[];
  tablesLoading: boolean;
  supabaseReady: boolean;
  onChange: (ref: LocalTableCellRef | undefined) => void;
}) {
  const supabase = useSupabase();
  const [columns, setColumns] = useState<TableColumnInfo[]>([]);
  const [valueOptions, setValueOptions] = useState<PickerValueOption[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [valuesLoading, setValuesLoading] = useState(false);

  const fieldDef = BATTLE_UNIT_MAPPING_FIELDS.find((f) => f.key === fieldKey);
  const tableId = cellRef?.tableId;
  const columnKey = cellRef?.columnKey;
  const tableKind = tables.find((t) => t.id === tableId)?.kind;

  useEffect(() => {
    if (!tableId) {
      setColumns([]);
      return;
    }
    let cancelled = false;
    setColumnsLoading(true);
    void loadTableColumns(supabaseReady ? supabase : null, tableId)
      .then((res) => {
        if (!cancelled) setColumns(res?.columns ?? []);
      })
      .finally(() => {
        if (!cancelled) setColumnsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, supabase, supabaseReady]);

  useEffect(() => {
    if (!tableId || !columnKey) {
      setValueOptions([]);
      return;
    }
    let cancelled = false;
    setValuesLoading(true);
    void loadColumnValueOptions(supabaseReady ? supabase : null, tableId, columnKey)
      .then((opts) => {
        if (!cancelled) setValueOptions(opts);
      })
      .finally(() => {
        if (!cancelled) setValuesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, columnKey, supabase, supabaseReady]);

  return (
    <div className={panelStyles.bindingBlock}>
      <div className={panelStyles.bindingRow}>
        <Select
          className={panelStyles.bindingSelect}
          placeholder="Table"
          disabled={disabled || tablesLoading}
          loading={tablesLoading}
          allowClear
          showSearch
          optionFilterProp="label"
          value={tableId}
          onChange={(tid) => {
            if (!tid) {
              onChange(undefined);
              return;
            }
            onChange({ tableId: tid, columnKey: '', value: '' });
          }}
          options={tables.map((t) => ({ value: t.id, label: t.name }))}
        />
        <Select
          className={panelStyles.bindingSelect}
          placeholder="Column"
          disabled={disabled || !tableId || columnsLoading}
          loading={columnsLoading}
          allowClear
          showSearch
          optionFilterProp="label"
          value={columnKey || undefined}
          onChange={(col) => {
            if (!tableId) return;
            if (!col) {
              onChange({ tableId, columnKey: '', value: '' });
              return;
            }
            onChange({ tableId, columnKey: col, value: '' });
          }}
          options={columns.map((c) => ({ value: c.key, label: c.label }))}
          notFoundContent={
            tableKind === 'studio' && !supabaseReady
              ? 'Sign in (same as Studio) to load columns'
              : undefined
          }
        />
        <Select
          className={panelStyles.bindingSelect}
          placeholder="Value"
          disabled={disabled || !tableId || !columnKey || valuesLoading}
          loading={valuesLoading}
          allowClear
          showSearch
          optionFilterProp="label"
          value={cellRef?.value || undefined}
          onChange={(val) => {
            if (!tableId || !columnKey) return;
            onChange({ tableId, columnKey, value: val ?? '' });
          }}
          options={valueOptions.map((o) => ({ value: o.value, label: o.label || o.value }))}
          notFoundContent={valueOptions.length === 0 ? 'No values in this column' : undefined}
        />
      </div>
      {fieldDef?.hint ? <span className={panelStyles.mappingHint}>{fieldDef.hint}</span> : null}
    </div>
  );
}

export function BattleUnitImportModal({
  open,
  target,
  fallbackConfig,
  onClose,
  onApply,
}: Props) {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const [view, setView] = useState<ModalView>('home');
  const [tables, setTables] = useState<SelectableTableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [activeField, setActiveField] = useState<BattleUnitColumnMappingKey>('name');
  const [fields, setFields] = useState<
    Partial<Record<BattleUnitColumnMappingKey, LocalTableCellRef>>
  >({});

  const refreshTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      setTables(
        await listSelectableTablesForSkillPicker(
          supabaseReady ? supabase : null,
          userProfile?.id,
        ),
      );
    } finally {
      setTablesLoading(false);
    }
  }, [supabase, supabaseReady, userProfile?.id]);

  useEffect(() => {
    if (open) void refreshTables();
  }, [open, refreshTables]);

  useEffect(() => {
    if (!open) return;
    setView('home');
    setFields({});
    setActiveField('name');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const configuredEntries = useMemo(
    () =>
      BATTLE_UNIT_MAPPING_FIELDS.filter((f) => {
        const ref = fields[f.key];
        return Boolean(ref?.value?.trim());
      }).map((f) => ({
        key: f.key,
        label: f.label,
        display: fields[f.key]?.value?.trim() ?? '',
      })),
    [fields],
  );

  const handleFieldChange = useCallback(
    (fieldKey: BattleUnitColumnMappingKey, ref: LocalTableCellRef | undefined) => {
      setFields((prev) => {
        const next = { ...prev };
        if (!ref) delete next[fieldKey];
        else next[fieldKey] = ref;
        return next;
      });
    },
    [],
  );

  const handleApplyAttributes = useCallback(() => {
    const result = unitFieldsToConfig(fields, fallbackConfig);
    if ('error' in result) {
      message.error(result.error);
      return;
    }
    onApply({ config: result.config });
    message.success(`Applied stats for "${result.config.name}"`);
    onClose();
  }, [fields, fallbackConfig, onApply, onClose]);

  const handleImportById = useCallback(
    (result: UnitImportResult) => {
      onApply(result);
      onClose();
    },
    [onApply, onClose],
  );

  const title = target === 'player' ? 'Import player stats' : 'Import enemy stats';
  const rowImportFallback: BattleUnitConfig =
    target === 'player' ? { ...DEFAULT_PLAYER_STATS } : { ...DEFAULT_MONSTER_STATS };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="unit-import-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          {!supabaseReady ? (
            <p className={panelStyles.warnLine}>
              Sign in with the same Supabase account as Keco Studio to include project libraries.{' '}
              <Link href="/simulation-system/battle/studio-libraries">Open Studio libraries</Link>
            </p>
          ) : null}

          {tables.length === 0 && !tablesLoading ? (
            <p className={panelStyles.warnLine}>
              No tables found.{' '}
              <Link href="/simulation-system/battle/local-tables">Create a local table</Link>
            </p>
          ) : null}

          {view === 'home' ? (
            <>
              <ImportUnitByIdBlock
                tables={tables}
                tablesLoading={tablesLoading}
                supabaseReady={supabaseReady}
                fallbackConfig={rowImportFallback}
                onImport={handleImportById}
              />
              <div className={styles.divider} />
              <Button type="default" block onClick={() => setView('attributes')}>
                Bind by attributes
              </Button>
            </>
          ) : (
            <>
              <Button
                type="link"
                size="small"
                className={panelStyles.backLink}
                icon={<ArrowLeftOutlined />}
                onClick={() => setView('home')}
              >
                Back
              </Button>
              <h3 className={panelStyles.sectionTitle}>Bind by attributes</h3>
              <p className={panelStyles.mappingHint}>
                Pick table → column → value for each stat. Unmapped stats keep current values.
              </p>
              <div className={panelStyles.fieldSelectRow}>
                <span className={panelStyles.fieldSelectLabel}>Field</span>
                <Select
                  className={panelStyles.fieldSelect}
                  value={activeField}
                  showSearch
                  options={FIELD_OPTIONS}
                  onChange={(k) => setActiveField(k as BattleUnitColumnMappingKey)}
                />
              </div>
              <UnitFieldBindingRow
                fieldKey={activeField}
                cellRef={fields[activeField]}
                tables={tables}
                tablesLoading={tablesLoading}
                supabaseReady={supabaseReady}
                onChange={(ref) => handleFieldChange(activeField, ref)}
              />
              {configuredEntries.length > 0 ? (
                <div className={panelStyles.configuredFields}>
                  <span className={panelStyles.configuredLabel}>Set:</span>
                  {configuredEntries.map((e) => (
                    <Tag
                      key={e.key}
                      closable
                      onClose={(ev) => {
                        ev.preventDefault();
                        handleFieldChange(e.key, undefined);
                      }}
                      onClick={() => setActiveField(e.key)}
                    >
                      {e.label}: {e.display}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          {view === 'attributes' ? (
            <button type="button" className={styles.applyBtn} onClick={handleApplyAttributes}>
              Apply stats
            </button>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
