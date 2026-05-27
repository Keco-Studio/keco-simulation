'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Collapse, Select, Tag, message } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FormOutlined,
  ImportOutlined,
  PlusOutlined,
  TableOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import type { Skill } from '../types';
import {
  BATTLE_SKILL_MAPPING_FIELDS,
  type BattleSkillColumnMappingKey,
} from '../lib/localTableSkillSource/battleLocalTableSkillSource';
import {
  type BattleSkillDraft,
  type LocalTableCellRef,
  createEmptyDraft,
  loadBattleSkillDrafts,
  saveBattleSkillDrafts,
  validateSkillDrafts,
  type SkillDraftValidationResult,
} from '../lib/localTableSkillSource/battleSkillDrafts';
import {
  listSelectableTablesForSkillPicker,
  loadColumnValueOptions,
  loadTableColumns,
  type PickerValueOption,
  type SelectableTableInfo,
  type TableColumnInfo,
} from '../lib/localTableSkillSource/simTablePickerData';
import { ImportSkillByIdBlock } from './ImportSkillByIdBlock';
import styles from './BattleLocalTableSkillSourcePanel.module.css';

const FIELD_OPTIONS = BATTLE_SKILL_MAPPING_FIELDS.map((f) => ({
  value: f.key,
  label: f.required ? `${f.label} *` : f.label,
}));

export type BattleLocalTableSkillSourcePanelHandle = {
  runValidate: (silent?: boolean) => SkillDraftValidationResult;
  refreshTables: () => Promise<void>;
};

type ModalView = 'home' | 'createAttributes' | 'createById';

type Props = {
  disabled?: boolean;
  onSkillsApplied: (skills: Skill[]) => void;
  /** embedded = sidebar card; modal = inside Studio-style popup */
  layout?: 'embedded' | 'modal';
  /** When modal opens, reset to home view */
  modalOpen?: boolean;
  onDraftsChange?: (count: number) => void;
};

function FieldBindingRow({
  fieldKey,
  cellRef,
  disabled,
  tables,
  tablesLoading,
  supabaseReady,
  onChange,
}: {
  fieldKey: BattleSkillColumnMappingKey;
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

  const fieldDef = BATTLE_SKILL_MAPPING_FIELDS.find((f) => f.key === fieldKey);
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
    <div className={styles.bindingBlock}>
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
          className={styles.bindingSelect}
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
          className={styles.bindingSelect}
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
      {fieldDef?.hint && <span className={styles.mappingHint}>{fieldDef.hint}</span>}
      {fieldKey === 'id' ? (
        <span className={styles.mappingHint}>
          Value list matches the table cell. <strong>Validate &amp; apply</strong> converts skill id to
          battle code form (spaces → underscores) if needed.
        </span>
      ) : null}
    </div>
  );
}

function SkillDraftEditor({
  draft,
  disabled,
  tables,
  tablesLoading,
  supabaseReady,
  onFieldChange,
  onRemove,
  hideRemoveButton = false,
}: {
  draft: BattleSkillDraft;
  disabled?: boolean;
  tables: SelectableTableInfo[];
  tablesLoading: boolean;
  supabaseReady: boolean;
  onFieldChange: (fieldKey: BattleSkillColumnMappingKey, ref: LocalTableCellRef | undefined) => void;
  onRemove: () => void;
  hideRemoveButton?: boolean;
}) {
  const [activeField, setActiveField] = useState<BattleSkillColumnMappingKey>('id');

  const configuredEntries = useMemo(
    () =>
      BATTLE_SKILL_MAPPING_FIELDS.filter((f) => {
        const ref = draft.fields[f.key];
        return Boolean(ref?.value?.trim());
      }).map((f) => ({
        key: f.key,
        label: f.label,
        display: draft.fields[f.key]?.value?.trim() ?? '',
      })),
    [draft.fields],
  );

  return (
    <div className={styles.draftEditor}>
      <div className={styles.fieldSelectRow}>
        <span className={styles.fieldSelectLabel}>Field</span>
        <Select
          className={styles.fieldSelect}
          value={activeField}
          disabled={disabled}
          showSearch
          options={FIELD_OPTIONS}
          filterOption={(input, option) => {
            const key = option?.value as BattleSkillColumnMappingKey | undefined;
            const f = BATTLE_SKILL_MAPPING_FIELDS.find((x) => x.key === key);
            if (!f) return false;
            const hay = `${f.label} ${f.typeDescription ?? ''} ${f.hint ?? ''}`.toLowerCase();
            return hay.includes(input.trim().toLowerCase());
          }}
          optionRender={(option) => {
            const key = option.value as BattleSkillColumnMappingKey;
            const f = BATTLE_SKILL_MAPPING_FIELDS.find((x) => x.key === key);
            if (!f) return option.label;
            const desc = f.typeDescription ?? f.hint;
            return (
              <div className={styles.fieldOption}>
                <span className={styles.fieldOptionName}>
                  {f.required ? `${f.label} *` : f.label}
                </span>
                {desc ? <span className={styles.fieldOptionDesc}>{desc}</span> : null}
              </div>
            );
          }}
          onChange={(k) => setActiveField(k as BattleSkillColumnMappingKey)}
        />
      </div>

      <FieldBindingRow
        fieldKey={activeField}
        cellRef={draft.fields[activeField]}
        disabled={disabled}
        tables={tables}
        tablesLoading={tablesLoading}
        supabaseReady={supabaseReady}
        onChange={(ref) => onFieldChange(activeField, ref)}
      />

      {configuredEntries.length > 0 && (
        <div className={styles.configuredFields}>
          <span className={styles.configuredLabel}>Set:</span>
          {configuredEntries.map((e) => (
            <Tag
              key={e.key}
              className={styles.configuredTag}
              closable={!disabled}
              onClose={(ev) => {
                ev.preventDefault();
                onFieldChange(e.key, undefined);
              }}
              onClick={() => !disabled && setActiveField(e.key)}
            >
              {e.label}: {e.display}
            </Tag>
          ))}
        </div>
      )}

      {!hideRemoveButton ? (
        <Button
          type="text"
          size="small"
          danger
          disabled={disabled}
          icon={<DeleteOutlined />}
          className={styles.removeDraftBtn}
          onClick={onRemove}
        >
          Remove skill
        </Button>
      ) : null}
    </div>
  );
}

export const BattleLocalTableSkillSourcePanel = forwardRef<BattleLocalTableSkillSourcePanelHandle, Props>(
  function BattleLocalTableSkillSourcePanel(
    { disabled = false, onSkillsApplied, layout = 'embedded', modalOpen = false, onDraftsChange },
    ref,
  ) {
    const supabase = useSupabase();
    const { userProfile, isAuthenticated } = useAuth();
    const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);
    const isModal = layout === 'modal';
    const [modalView, setModalView] = useState<ModalView>('home');
    /** Draft being edited in create-by-attributes; committed only on confirm */
    const [pendingDraft, setPendingDraft] = useState<BattleSkillDraft | null>(null);
    const [expandedDraftKey, setExpandedDraftKey] = useState<string | undefined>();
    const [tables, setTables] = useState<SelectableTableInfo[]>([]);
    const [tablesLoading, setTablesLoading] = useState(true);
    const [drafts, setDrafts] = useState<BattleSkillDraft[]>(() => loadBattleSkillDrafts());
    const [validating, setValidating] = useState(false);
    const [lastResult, setLastResult] = useState<SkillDraftValidationResult | null>(null);

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
      void refreshTables();
    }, [refreshTables]);

    useEffect(() => {
      if (isModal && modalOpen) {
        setModalView('home');
        setPendingDraft(null);
        setExpandedDraftKey(undefined);
      }
    }, [isModal, modalOpen]);

    useEffect(() => {
      saveBattleSkillDrafts(drafts);
    }, [drafts]);

    useEffect(() => {
      onDraftsChange?.(drafts.length);
    }, [drafts.length, onDraftsChange]);

    const updateDraftField = useCallback(
      (draftId: string, fieldKey: BattleSkillColumnMappingKey, ref: LocalTableCellRef | undefined) => {
        setDrafts((prev) =>
          prev.map((d) => {
            if (d.draftId !== draftId) return d;
            const fields = { ...d.fields };
            if (!ref) delete fields[fieldKey];
            else fields[fieldKey] = ref;
            return { ...d, fields };
          }),
        );
        setLastResult(null);
      },
      [],
    );

    const addDraft = useCallback(() => {
      setDrafts((prev) => [...prev, createEmptyDraft()]);
      setLastResult(null);
    }, []);

    const handleImportDraft = useCallback((draft: BattleSkillDraft) => {
      setDrafts((prev) => [...prev, draft]);
      setLastResult(null);
      if (isModal) {
        setExpandedDraftKey(draft.draftId);
        setModalView('home');
      }
    }, [isModal]);

    const openCreateByAttributes = useCallback(() => {
      setPendingDraft(createEmptyDraft());
      setLastResult(null);
      setModalView('createAttributes');
    }, []);

    const cancelPendingCreate = useCallback(() => {
      setPendingDraft(null);
      setModalView('home');
    }, []);

    const confirmPendingCreate = useCallback(() => {
      if (!pendingDraft) return;
      setDrafts((prev) => [...prev, pendingDraft]);
      setExpandedDraftKey(pendingDraft.draftId);
      setPendingDraft(null);
      setLastResult(null);
      setModalView('home');
      message.success('Skill added to list.');
    }, [pendingDraft]);

    const updatePendingDraftField = useCallback(
      (fieldKey: BattleSkillColumnMappingKey, ref: LocalTableCellRef | undefined) => {
        setPendingDraft((prev) => {
          if (!prev) return prev;
          const fields = { ...prev.fields };
          if (!ref) delete fields[fieldKey];
          else fields[fieldKey] = ref;
          return { ...prev, fields };
        });
        setLastResult(null);
      },
      [],
    );

    const removeDraft = useCallback((draftId: string) => {
      setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
      setLastResult(null);
    }, []);

    const runValidate = useCallback(
      (silent = false) => {
        setValidating(true);
        try {
          const result = validateSkillDrafts(drafts);
          setLastResult(result);
          if (result.ok) {
            onSkillsApplied(result.skills);
            if (!silent) message.success(`Applied ${result.skills.length} skill(s).`);
          } else if (!silent) {
            message.error('Fix validation issues below.');
          }
          return result;
        } finally {
          setValidating(false);
        }
      },
      [drafts, onSkillsApplied],
    );

    useEffect(() => {
      if (isModal) return;
      if (drafts.length === 0) return;
      const hasRequired = drafts.some(
        (d) => d.fields.id?.value?.trim() && d.fields.name?.value?.trim(),
      );
      if (!hasRequired) return;
      runValidate(true);
    }, [drafts, runValidate, isModal]);

    useImperativeHandle(
      ref,
      () => ({
        runValidate,
        refreshTables,
      }),
      [runValidate, refreshTables],
    );

    const collapseItems = useMemo(
      () =>
        drafts.map((draft, index) => {
          const title =
            draft.fields.name?.value?.trim() ||
            draft.fields.id?.value?.trim() ||
            `New skill ${index + 1}`;
          return {
            key: draft.draftId,
            label: title,
            children: (
              <SkillDraftEditor
                draft={draft}
                disabled={disabled}
                tables={tables}
                tablesLoading={tablesLoading}
                supabaseReady={supabaseReady}
                onFieldChange={(fieldKey, ref) => updateDraftField(draft.draftId, fieldKey, ref)}
                onRemove={() => removeDraft(draft.draftId)}
              />
            ),
          };
        }),
      [drafts, disabled, removeDraft, tables, tablesLoading, supabase, updateDraftField],
    );

    const rootClass = isModal ? styles.modalLayout : styles.card;

    const validationBlock = (
      <>
        {lastResult && !lastResult.ok && (
          <div className={styles.resultFail}>
            <WarningOutlined /> Validation issues
            <ul className={styles.errorList}>
              {lastResult.draftErrors.map((e) => (
                <li key={`${e.draftId}-${e.error}`}>
                  {e.label ? `${e.label}: ` : ''}
                  {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        {lastResult?.ok && (
          <div className={isModal ? styles.resultOkModal : styles.resultOk}>
            <CheckCircleOutlined /> {lastResult.skills.length} skill(s) active in battle
          </div>
        )}
      </>
    );

    const draftsList =
      drafts.length > 0 ? (
        <Collapse
          className={styles.draftsCollapse}
          accordion
          activeKey={expandedDraftKey}
          onChange={(key) => setExpandedDraftKey(typeof key === 'string' ? key : undefined)}
          items={collapseItems}
        />
      ) : (
        <p className={styles.metaLine}>No skills configured yet.</p>
      );

    const studioSignInHint = !supabaseReady ? (
      <p className={styles.warnLine}>
        Sign in with the same Supabase account as Keco Studio to include project libraries in the table
        list.{' '}
        <Link href="/simulation-system/battle/studio-libraries">Open Studio libraries</Link>
      </p>
    ) : null;

    const tablesWarning =
      tables.length === 0 && !tablesLoading ? (
        <p className={styles.warnLine}>
          No tables found.{' '}
          <Link href="/simulation-system/battle/local-tables">Create a local table</Link>
          {!supabaseReady ? ' or sign in to list Keco Studio libraries.' : null}
        </p>
      ) : null;

    if (isModal && modalView === 'createAttributes') {
      return (
        <div className={rootClass}>
          <Button
            type="link"
            size="small"
            className={styles.backLink}
            icon={<ArrowLeftOutlined />}
            onClick={cancelPendingCreate}
          >
            Back
          </Button>
          <h3 className={styles.sectionTitle}>Create by attributes</h3>
          <p className={styles.hint}>
            Pick a field, then table (local scratch, Studio-linked bookmark, or a Studio library), column,
            and value. Switch fields from the dropdown to bind more properties. Nothing is added until you
            confirm.
          </p>
          {pendingDraft ? (
            <SkillDraftEditor
              draft={pendingDraft}
              disabled={disabled}
              tables={tables}
              tablesLoading={tablesLoading}
              supabaseReady={supabaseReady}
              onFieldChange={updatePendingDraftField}
              onRemove={cancelPendingCreate}
              hideRemoveButton
            />
          ) : (
            <p className={styles.metaLine}>No draft in progress.</p>
          )}
          {studioSignInHint}
          {tablesWarning}
          <div className={styles.createConfirmRow}>
            <Button disabled={disabled} onClick={cancelPendingCreate}>
              Cancel
            </Button>
            <Button type="primary" disabled={disabled || !pendingDraft} onClick={confirmPendingCreate}>
              Add skill
            </Button>
          </div>
        </div>
      );
    }

    if (isModal && modalView === 'createById') {
      return (
        <div className={rootClass}>
          <Button
            type="link"
            size="small"
            className={styles.backLink}
            icon={<ArrowLeftOutlined />}
            onClick={() => setModalView('home')}
          >
            Back
          </Button>
          <h3 className={styles.sectionTitle}>Import by id</h3>
          <p className={styles.hint}>
            Select a local or Studio library table, id column, and row id, then confirm to add the skill to
            the list.
          </p>
          <ImportSkillByIdBlock
            disabled={disabled}
            tables={tables}
            tablesLoading={tablesLoading}
            supabaseReady={supabaseReady}
            onImportDraft={handleImportDraft}
            showSectionTitle={false}
            confirmButtonLabel="Add skill"
          />
          {studioSignInHint}
          {tablesWarning}
        </div>
      );
    }

    if (isModal && modalView === 'home') {
      return (
        <div className={rootClass}>
          <h3 className={styles.sectionTitle}>Configured skills</h3>
          <p className={styles.hint}>Expand a skill to edit bindings. Apply when ready to use in battle.</p>
          {draftsList}
          {tablesWarning}

          <h3 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>Create skill</h3>
          <div className={styles.createSkillActions}>
            <Button icon={<FormOutlined />} disabled={disabled} onClick={openCreateByAttributes} block>
              By attributes
            </Button>
            <Button
              icon={<ImportOutlined />}
              disabled={disabled}
              onClick={() => setModalView('createById')}
              block
            >
              By id (table row)
            </Button>
          </div>
          {validationBlock}
        </div>
      );
    }

    return (
      <div className={rootClass}>
        {!isModal ? (
          <div className={styles.cardTitle}>
            <TableOutlined /> Skills (local tables)
          </div>
        ) : null}
        <p className={styles.hint}>
          Pick a field, then table, column, and value. Switch fields from the dropdown to bind more properties.
        </p>

        <ImportSkillByIdBlock
          disabled={disabled}
          tables={tables}
          tablesLoading={tablesLoading}
          supabaseReady={supabaseReady}
          onImportDraft={handleImportDraft}
        />

        <div className={styles.actions}>
          <Button icon={<PlusOutlined />} disabled={disabled} onClick={addDraft} block>
            New skill
          </Button>
          {!isModal ? (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={validating}
                disabled={disabled || drafts.length === 0}
                onClick={() => runValidate(false)}
                block
              >
                Validate &amp; apply
              </Button>
              <Button type="link" size="small" disabled={tablesLoading} onClick={() => void refreshTables()}>
                Refresh tables
              </Button>
            </>
          ) : null}
        </div>

        {studioSignInHint}
        {tablesWarning}
        {draftsList}
        {validationBlock}
      </div>
    );
  },
);
