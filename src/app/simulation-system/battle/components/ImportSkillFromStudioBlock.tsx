'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, Select, message } from 'antd';
import { CloudOutlined } from '@ant-design/icons';
import { useAuth } from '@studio/lib/contexts/AuthContext';
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
  listStudioLibrariesForSkillImport,
  loadStudioLibraryColumnValueOptions,
  loadStudioLibraryTableData,
  studioSkillSourceTableId,
  type TableColumnInfo,
} from '../lib/localTableSkillSource/simTablePickerData';
import { ImportSkillHeaderMappingModal } from './ImportSkillHeaderMappingModal';
import styles from './BattleLocalTableSkillSourcePanel.module.css';

type Props = {
  disabled?: boolean;
  onImportDraft: (draft: BattleSkillDraft) => void;
  confirmButtonLabel?: string;
};

export function ImportSkillFromStudioBlock({
  disabled = false,
  onImportDraft,
  confirmButtonLabel = 'Add skill',
}: Props) {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const [libraryId, setLibraryId] = useState<string | undefined>();
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

  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['battleSkillImportStudioLibs', userProfile?.id],
    queryFn: () => listStudioLibrariesForSkillImport(supabase, userProfile!.id),
    enabled: supabaseReady,
  });

  const tableId = libraryId ? studioSkillSourceTableId(libraryId) : undefined;

  useEffect(() => {
    if (!libraryId || !supabaseReady) {
      setColumns([]);
      setIdColumnKey(undefined);
      setSkillIdValue(undefined);
      setIdOptions([]);
      return;
    }
    let cancelled = false;
    setTableLoading(true);
    void loadStudioLibraryTableData(supabase, libraryId)
      .then((res) => {
        if (cancelled) return;
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
  }, [libraryId, supabase, supabaseReady]);

  useEffect(() => {
    if (!libraryId || !idColumnKey || !supabaseReady) {
      setIdOptions([]);
      return;
    }
    let cancelled = false;
    setIdsLoading(true);
    void loadStudioLibraryColumnValueOptions(supabase, libraryId, idColumnKey)
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
  }, [libraryId, idColumnKey, supabase, supabaseReady]);

  const finishImport = useCallback(
    async (resolutions: Record<string, BattleSkillColumnMappingKey>) => {
      if (!tableId || !libraryId || !idColumnKey || !skillIdValue?.trim() || !supabaseReady) return;
      const loaded = await loadStudioLibraryTableData(supabase, libraryId);
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
      message.success(`Imported skill "${draft.fields.id?.value ?? skillIdValue}" from Studio`);
      setPendingAmbiguities(null);
    },
    [tableId, libraryId, idColumnKey, skillIdValue, supabase, supabaseReady, onImportDraft],
  );

  const handleImportClick = useCallback(() => {
    if (!libraryId || !idColumnKey || !skillIdValue?.trim()) {
      message.warning('Select library, id column, and skill id');
      return;
    }
    const plan = planImportColumnMapping(columns, {});
    if (plan.ambiguities.length > 0) {
      setPendingAmbiguities(plan.ambiguities);
      setPendingResolutions({});
      return;
    }
    void finishImport({});
  }, [libraryId, idColumnKey, skillIdValue, columns, finishImport]);

  const handleMappingConfirm = useCallback(
    (resolutions: Record<string, BattleSkillColumnMappingKey>) => {
      const merged = { ...pendingResolutions, ...resolutions };
      setPendingAmbiguities(null);
      void finishImport(merged);
    },
    [finishImport, pendingResolutions],
  );

  const libraryOptions = useMemo(
    () => libraries.map((l) => ({ value: l.libraryId, label: l.label })),
    [libraries],
  );

  const columnOptions = useMemo(
    () => columns.map((c) => ({ value: c.key, label: c.label })),
    [columns],
  );

  if (authLoading) {
    return <p className={styles.metaLine}>Checking sign-in…</p>;
  }

  if (!supabaseReady) {
    return (
      <p className={styles.warnLine}>
        Sign in with the same Supabase account as Keco Studio to import skills from your project
        libraries.{' '}
        <Link href="/simulation-system/battle/studio-libraries">Open Studio libraries</Link>
      </p>
    );
  }

  if (!librariesLoading && libraries.length === 0) {
    return (
      <p className={styles.warnLine}>
        No Studio libraries found for your account. Create a library in Keco Studio first, or open{' '}
        <Link href="/simulation-system/battle/studio-libraries">Project tables</Link>.
      </p>
    );
  }

  return (
    <>
      <div className={styles.importByIdBlockEmbedded}>
        <p className={styles.mappingHint}>
          Pick a <strong>Keco Studio library</strong>, then the row <strong>id</strong> column and skill id.
          Column headers map to battle fields (same rules as local-table import). Skill id is normalized on{' '}
          <strong>Validate &amp; apply</strong>.
        </p>
        <div className={styles.bindingRow}>
          <Select
            className={styles.bindingSelect}
            placeholder="Studio library"
            disabled={disabled || librariesLoading}
            loading={librariesLoading}
            allowClear
            showSearch
            optionFilterProp="label"
            value={libraryId}
            onChange={(v) => {
              setLibraryId(v);
              setSkillIdValue(undefined);
            }}
            options={libraryOptions}
          />
          <Select
            className={styles.bindingSelect}
            placeholder="Id column"
            disabled={disabled || !libraryId || tableLoading}
            loading={tableLoading}
            showSearch
            optionFilterProp="label"
            value={idColumnKey}
            onChange={(v) => {
              setIdColumnKey(v);
              setSkillIdValue(undefined);
            }}
            options={columnOptions}
          />
          <Select
            className={styles.bindingSelect}
            placeholder="Skill id"
            disabled={disabled || !libraryId || !idColumnKey || idsLoading}
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
          icon={<CloudOutlined />}
          disabled={disabled || !libraryId || !idColumnKey || !skillIdValue}
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
