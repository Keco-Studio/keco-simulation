'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { App, Button, Modal, Select, Space, Spin, Typography, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { YjsProvider } from '@studio/lib/contexts/YjsContext';
import { LibraryAssetsTable } from '@studio/components/libraries/LibraryAssetsTable';
import type { AddColumnFormPayload } from '@studio/components/libraries/components/AddColumnModal';
import type { AssetRow, PropertyConfig, SectionConfig } from '@studio/lib/types/libraryAssets';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { queryKeys } from '@studio/lib/utils/queryKeys';
import {
  addLibraryField,
  createAsset,
  deleteAsset,
  deleteAssets,
  getLibraryAssetsWithProperties,
  getLibrarySchema,
  updateAsset,
} from '@studio/lib/services/libraryAssetsService';
import { listLibraries } from '@studio/lib/services/libraryService';
import type { SimTableMeta, SimTableRow } from '@/lib/simLocalTables/types';
import { SIM_LOCAL_WORKSPACE_TABLE_ID } from '@/lib/simLocalTables/constants';
import { deleteTableCascade, getTableMeta, getTableRows, putTableMeta, putTableRows } from '@/lib/simLocalTables/simLocalTablesDb';
import pageStyles from '../studio-libraries/library/[libraryId]/page.module.css';

function defaultSection(tableId: string): SectionConfig {
  return { id: `${tableId}:Default`, libraryId: tableId, name: 'Default', orderIndex: 0 };
}

function propertiesFromMeta(meta: SimTableMeta, tableId: string): PropertyConfig[] {
  const sectionId = `${tableId}:Default`;
  return meta.columnKeys.map((key, i) => ({
    id: `local-field-${key}`,
    sectionId,
    key,
    name: i === 0 ? 'name' : (meta.columnLabels?.[i]?.trim() || `Column ${i + 1}`),
    valueType: 'string',
    dataType: 'string',
    orderIndex: i,
  }));
}

function assetRowsFromSim(meta: SimTableMeta, tableId: string, rows: SimTableRow[]): AssetRow[] {
  const first = meta.columnKeys[0];
  return rows.map((r, idx) => ({
    id: r.id,
    libraryId: tableId,
    name: (first ? String(r.values[first] ?? '').trim() : '') || 'Untitled',
    propertyValues: { ...r.values },
    rowIndex: idx,
  }));
}

export default function SimLocalTableEditorClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = params.tableId as string;
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const [meta, setMeta] = useState<SimTableMeta | null>(null);
  const [rows, setRows] = useState<SimTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const metaRef = useRef<SimTableMeta | null>(null);

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  const linked = Boolean(meta?.studioProjectId && meta?.studioLibraryId);
  const studioProjectId = meta?.studioProjectId ?? '';
  const studioLibraryId = meta?.studioLibraryId ?? '';

  const spProject = searchParams.get('projectId')?.trim() ?? '';
  const spLibrary = searchParams.get('libraryId')?.trim() ?? '';
  const defaultStudioProjectId = process.env.NEXT_PUBLIC_SIM_STUDIO_DEFAULT_PROJECT_ID?.trim() ?? '';

  useEffect(() => {
    if (!meta || !linked) return;
    if (spProject === studioProjectId && spLibrary === studioLibraryId) return;
    const q = new URLSearchParams();
    q.set('projectId', studioProjectId);
    q.set('libraryId', studioLibraryId);
    const next = `/simulation-system/battle/local-tables/${encodeURIComponent(tableId)}?${q.toString()}`;
    router.replace(next);
  }, [meta, linked, studioProjectId, studioLibraryId, tableId, router, spProject, spLibrary]);

  const load = useCallback(async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      if (tableId === SIM_LOCAL_WORKSPACE_TABLE_ID) {
        const projectId = spProject || defaultStudioProjectId;
        if (!projectId) {
          message.error(
            'Add ?projectId=… to the URL, or set NEXT_PUBLIC_SIM_STUDIO_DEFAULT_PROJECT_ID in .env.local',
          );
          router.replace('/simulation-system/battle/local-tables');
          return;
        }
        const libraryId = spLibrary;
        const now = Date.now();
        setMeta({
          id: SIM_LOCAL_WORKSPACE_TABLE_ID,
          name: 'Studio workspace',
          columnKeys: [],
          createdAt: now,
          updatedAt: now,
          dirty: false,
          studioProjectId: projectId,
          studioLibraryId: libraryId,
        });
        setRows([]);
        return;
      }

      const m = await getTableMeta(tableId);
      if (!m) {
        message.error('Table not found');
        router.replace('/simulation-system/battle/local-tables');
        return;
      }
      setMeta(m);
      const hasLink = Boolean(m.studioProjectId && m.studioLibraryId);
      if (!hasLink) {
        const r = await getTableRows(tableId);
        setRows(
          r.length > 0
            ? r
            : [{ id: crypto.randomUUID(), values: Object.fromEntries(m.columnKeys.map((k) => [k, ''])) }],
        );
      } else {
        setRows([]);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router, tableId, spProject, spLibrary, defaultStudioProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tableId !== SIM_LOCAL_WORKSPACE_TABLE_ID) return;
    if (!studioProjectId) return;
    if (studioLibraryId) return;
    let cancelled = false;
    void (async () => {
      try {
        const libs = await listLibraries(supabase, studioProjectId);
        if (cancelled) return;
        if (!libs.length) {
          message.error('No libraries in this project');
          return;
        }
        const first = libs[0].id;
        setMeta((m) =>
          m && m.id === SIM_LOCAL_WORKSPACE_TABLE_ID ? { ...m, studioLibraryId: first, updatedAt: Date.now() } : m,
        );
        router.replace(
          `/simulation-system/battle/local-tables/${SIM_LOCAL_WORKSPACE_TABLE_ID}?projectId=${encodeURIComponent(studioProjectId)}&libraryId=${encodeURIComponent(first)}`,
        );
      } catch (e) {
        if (!cancelled) message.error(e instanceof Error ? e.message : 'Failed to list libraries');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId, studioProjectId, studioLibraryId, supabase, router]);

  useEffect(() => {
    if (!meta || loading) return;
    if (meta.id === SIM_LOCAL_WORKSPACE_TABLE_ID) return;
    if (linked) {
      const t = window.setTimeout(() => {
        void putTableMeta({ ...meta, updatedAt: Date.now(), dirty: meta.dirty }).catch((e) =>
          message.error(e instanceof Error ? e.message : 'Failed to save'),
        );
      }, 450);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await putTableMeta({ ...meta, updatedAt: Date.now(), dirty: meta.dirty });
          await putTableRows(tableId, rows);
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Failed to save');
        }
      })();
    }, 450);
    return () => window.clearTimeout(t);
  }, [meta, rows, tableId, loading, linked]);

  const { data: linkedSchema, isLoading: schemaLoading } = useQuery({
    queryKey: queryKeys.librarySchema(studioLibraryId),
    queryFn: () => getLibrarySchema(supabase, studioLibraryId),
    enabled: linked && Boolean(studioLibraryId),
  });

  const { data: linkedAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: queryKeys.libraryAssets(studioLibraryId),
    queryFn: () => getLibraryAssetsWithProperties(supabase, studioLibraryId),
    enabled: linked && Boolean(studioLibraryId),
  });

  const isWorkspaceRoute = tableId === SIM_LOCAL_WORKSPACE_TABLE_ID;
  const studioPickerEnabled = Boolean(studioProjectId) && (linked || isWorkspaceRoute);

  const { data: projectLibraries = [], isLoading: projectLibsLoading } = useQuery({
    queryKey: ['simLocalPickLibs', studioProjectId],
    queryFn: () => listLibraries(supabase, studioProjectId),
    enabled: studioPickerEnabled,
  });

  const sectionsScratch = useMemo(() => (meta && !linked ? [defaultSection(tableId)] : []), [meta, linked, tableId]);
  const propertiesScratch = useMemo(() => (meta && !linked ? propertiesFromMeta(meta, tableId) : []), [meta, linked, tableId]);
  const assetRowsScratch = useMemo(() => (meta && !linked ? assetRowsFromSim(meta, tableId, rows) : []), [meta, linked, tableId, rows]);

  const sections = linked ? linkedSchema?.sections ?? [] : sectionsScratch;
  const properties = linked ? linkedSchema?.properties ?? [] : propertiesScratch;
  const assetRows: AssetRow[] = linked ? linkedAssets : assetRowsScratch;

  const invalidateLinked = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.libraryAssets(studioLibraryId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.librarySchema(studioLibraryId) });
  }, [queryClient, studioLibraryId]);

  const handleSaveAssetScratch = useCallback(
    async (assetName: string, propertyValues: Record<string, unknown>) => {
      const m = metaRef.current;
      if (!m) return;
      const values: Record<string, string> = {};
      for (const k of m.columnKeys) {
        values[k] = String(propertyValues[k] ?? '');
      }
      if (m.columnKeys[0]) values[m.columnKeys[0]] = assetName;
      const newRow: SimTableRow = { id: crypto.randomUUID(), values };
      setRows((prev) => [...prev, newRow]);
      setMeta((prev) => (prev ? { ...prev, dirty: true } : prev));
    },
    [],
  );

  const handleSaveAssetLinked = useCallback(
    async (assetName: string, propertyValues: Record<string, unknown>) => {
      await createAsset(supabase, studioLibraryId, assetName, propertyValues as Record<string, unknown>);
      await invalidateLinked();
      message.success('Row created');
    },
    [supabase, studioLibraryId, invalidateLinked],
  );

  const handleUpdateAssetScratch = useCallback(
    async (assetId: string, assetName: string, propertyValues: Record<string, unknown>) => {
      const m = metaRef.current;
      if (!m) return;
      const first = m.columnKeys[0];
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== assetId) return r;
          const next = { ...r.values };
          for (const k of m.columnKeys) {
            next[k] = String(propertyValues[k] ?? '');
          }
          if (first) next[first] = assetName;
          return { ...r, values: next };
        }),
      );
      setMeta((prev) => (prev ? { ...prev, dirty: true } : prev));
    },
    [],
  );

  const handleUpdateAssetLinked = useCallback(
    async (assetId: string, assetName: string, propertyValues: Record<string, unknown>) => {
      await updateAsset(supabase, assetId, assetName, propertyValues as Record<string, unknown>);
      await invalidateLinked();
    },
    [supabase, studioLibraryId, invalidateLinked],
  );

  const handleUpdateAssets = useCallback(
    async (updates: Array<{ assetId: string; assetName: string; propertyValues: Record<string, any> }>) => {
      const fn = linked ? handleUpdateAssetLinked : handleUpdateAssetScratch;
      for (const u of updates) {
        await fn(u.assetId, u.assetName, u.propertyValues);
      }
    },
    [linked, handleUpdateAssetLinked, handleUpdateAssetScratch],
  );

  const handleDeleteAssetScratch = useCallback(async (assetId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        message.warning('Keep at least one row');
        return prev;
      }
      return prev.filter((r) => r.id !== assetId);
    });
    setMeta((prev) => (prev ? { ...prev, dirty: true } : prev));
  }, []);

  const handleDeleteAssetLinked = useCallback(
    async (assetId: string) => {
      await deleteAsset(supabase, assetId);
      await invalidateLinked();
      message.success('Row deleted');
    },
    [supabase, invalidateLinked],
  );

  const handleDeleteAssetsScratch = useCallback(async (assetIds: string[]) => {
    setRows((prev) => {
      if (prev.length - assetIds.length < 1) {
        message.warning('Keep at least one row');
        return prev;
      }
      const drop = new Set(assetIds);
      return prev.filter((r) => !drop.has(r.id));
    });
    setMeta((prev) => (prev ? { ...prev, dirty: true } : prev));
  }, []);

  const handleDeleteAssetsLinked = useCallback(
    async (assetIds: string[]) => {
      await deleteAssets(supabase, assetIds);
      await invalidateLinked();
      message.success('Rows deleted');
    },
    [supabase, invalidateLinked],
  );

  const handleAddPropertyScratch = useCallback(async (_sectionId: string, _sectionName: string, payload: AddColumnFormPayload) => {
    const m = metaRef.current;
    if (!m) return;
    const key = `col_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const label = payload.name?.trim() || `Column ${m.columnKeys.length + 1}`;
    const nextLabels = [...(m.columnLabels ?? m.columnKeys.map((_, i) => (i === 0 ? 'name' : `Column ${i + 1}`))), label];
    setMeta({
      ...m,
      columnKeys: [...m.columnKeys, key],
      columnLabels: nextLabels,
      dirty: true,
    });
    setRows((prev) => prev.map((r) => ({ ...r, values: { ...r.values, [key]: '' } })));
  }, []);

  const handleAddPropertyLinked = useCallback(
    async (sectionId: string, sectionName: string, payload: AddColumnFormPayload) => {
      await addLibraryField(supabase, studioLibraryId, sectionId, sectionName, {
        label: payload.name,
        dataType: payload.dataType as PropertyConfig['dataType'],
        description: payload.description,
        required: false,
        enumOptions: payload.dataType === 'enum' ? (payload.enumOptions ?? []) : undefined,
        referenceLibraries: payload.dataType === 'reference' ? (payload.referenceLibraries ?? []) : undefined,
        formulaExpression: payload.dataType === 'formula' ? payload.formulaExpression : undefined,
      });
      await invalidateLinked();
      message.success('Column added');
    },
    [supabase, studioLibraryId, invalidateLinked],
  );

  const handleScratchDeleteColumn = useCallback(
    async ({ propertyKey, propertyId: _fieldId }: { propertyId: string; propertyKey: string }) => {
      const m = metaRef.current;
      if (!m) return;
      const idx = m.columnKeys.indexOf(propertyKey);
      if (idx < 0) return;
      if (m.columnKeys.length <= 1) {
        message.warning('Keep at least one column');
        return;
      }
      const nextKeys = m.columnKeys.filter((k) => k !== propertyKey);
      const baseLabels = m.columnLabels ?? m.columnKeys.map((_, i) => (i === 0 ? 'name' : `Column ${i + 1}`));
      const nextLabels = baseLabels.filter((_, i) => i !== idx);
      setMeta({ ...m, columnKeys: nextKeys, columnLabels: nextLabels, dirty: true });
      setRows((prev) =>
        prev.map((r) => {
          const { [propertyKey]: _removed, ...rest } = r.values;
          return { ...r, values: rest };
        }),
      );
    },
    [],
  );

  const clearStudioLink = useCallback(() => {
    if (tableId === SIM_LOCAL_WORKSPACE_TABLE_ID) {
      Modal.confirm({
        title: 'Leave Studio workspace?',
        content: 'You will return to the local tables list.',
        okText: 'Leave',
        cancelText: 'Cancel',
        onOk: () => {
          router.push('/simulation-system/battle/local-tables');
        },
      });
      return;
    }
    const m = metaRef.current;
    if (!m) return;
    Modal.confirm({
      title: 'Disconnect Studio library?',
      content:
        'You will switch to a local scratch sheet. Nothing is deleted in Studio. A default text column will be created.',
      okText: 'Disconnect',
      cancelText: 'Cancel',
      onOk: async () => {
        const firstKey = 'col_1';
        const now = Date.now();
        const next: SimTableMeta = {
          ...m,
          studioProjectId: undefined,
          studioLibraryId: undefined,
          columnKeys: [firstKey],
          columnLabels: ['Column 1'],
          updatedAt: now,
          dirty: true,
        };
        setMeta(next);
        setRows([{ id: crypto.randomUUID(), values: { [firstKey]: '' } }]);
        await putTableMeta(next);
        await putTableRows(tableId, [{ id: crypto.randomUUID(), values: { [firstKey]: '' } }]);
        router.replace(`/simulation-system/battle/local-tables/${encodeURIComponent(tableId)}`);
        message.success('Switched to local scratch mode');
      },
    });
  }, [router, tableId]);

  const handlePickStudioLibrary = useCallback(
    (libId: string) => {
      if (!studioProjectId || libId === studioLibraryId) return;
      setMeta((m) => (m ? { ...m, studioLibraryId: libId, updatedAt: Date.now() } : m));
      const q = new URLSearchParams();
      q.set('projectId', studioProjectId);
      q.set('libraryId', libId);
      router.replace(`/simulation-system/battle/local-tables/${encodeURIComponent(tableId)}?${q.toString()}`);
      if (tableId !== SIM_LOCAL_WORKSPACE_TABLE_ID) {
        const cur = metaRef.current;
        if (cur) {
          void putTableMeta({ ...cur, studioLibraryId: libId, updatedAt: Date.now(), dirty: cur.dirty }).catch((e) =>
            message.error(e instanceof Error ? e.message : 'Failed to save'),
          );
        }
      }
    },
    [router, tableId, studioProjectId, studioLibraryId],
  );

  const handleDeleteTable = () => {
    if (tableId === SIM_LOCAL_WORKSPACE_TABLE_ID) return;
    Modal.confirm({
      title: 'Delete this entire table?',
      content: linked
        ? 'Removes this bookmark from this browser only. Your Studio library and assets are not deleted.'
        : 'This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        await deleteTableCascade(tableId);
        message.success('Table deleted');
        router.push('/simulation-system/battle/local-tables');
      },
    });
  };

  if (!meta) {
    return loading ? <Typography.Paragraph>Loading…</Typography.Paragraph> : null;
  }

  const yjsLibraryId = linked ? `local-table-linked-${tableId}-${studioLibraryId}` : `sim-local-${tableId}`;
  const workspaceResolvingLibrary =
    isWorkspaceRoute && Boolean(studioProjectId) && !studioLibraryId;
  const tableLoading = workspaceResolvingLibrary || (linked && (schemaLoading || assetsLoading));

  return (
    <App>
      <div className={pageStyles.container}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Link href="/simulation-system/battle/local-tables">← Back to list</Link>
            <Link href="/simulation-system/battle/studio-libraries">Project tables</Link>
            {tableId !== SIM_LOCAL_WORKSPACE_TABLE_ID ? (
              <Typography.Link onClick={handleDeleteTable} type="danger">
                Delete entire table
              </Typography.Link>
            ) : null}
            {linked || isWorkspaceRoute ? (
              <Button type="default" onClick={clearStudioLink}>
                {tableId === SIM_LOCAL_WORKSPACE_TABLE_ID ? 'Leave workspace' : 'Disconnect Studio library'}
              </Button>
            ) : null}
          </Space>
          {studioPickerEnabled ? (
            <Space align="center" wrap>
              <Typography.Text type="secondary">Library</Typography.Text>
              <Select
                style={{ minWidth: 280 }}
                value={studioLibraryId || undefined}
                placeholder={projectLibsLoading ? 'Loading libraries…' : 'Select library'}
                options={projectLibraries.map((l) => ({ value: l.id, label: l.name || l.id }))}
                onChange={handlePickStudioLibrary}
                loading={projectLibsLoading}
                showSearch
                optionFilterProp="label"
              />
            </Space>
          ) : null}
          {isWorkspaceRoute && studioProjectId ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Switch libraries in this project with the picker above. <Typography.Text code>reference</Typography.Text>{' '}
              columns use the same asset pickers as Project tables; edits are saved to Supabase.
            </Typography.Paragraph>
          ) : linked ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Linked to Studio library <Typography.Text code>{studioLibraryId}</Typography.Text> in project{' '}
              <Typography.Text code>{studioProjectId}</Typography.Text>. Reference columns use the same pickers as
              Project tables; edits are saved to Supabase.
            </Typography.Paragraph>
          ) : (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Local scratch sheet (IndexedDB). To use reference columns against Keco Studio data, create a table with
              &quot;Link Studio library&quot; enabled on the list page, or open the Studio workspace from the list page.
            </Typography.Paragraph>
          )}
        </Space>

        <div className={pageStyles.mainContent}>
          <div className={pageStyles.tableContainer}>
            {tableLoading ? (
              <Spin style={{ margin: 24 }} />
            ) : (
              <YjsProvider libraryId={yjsLibraryId}>
                <LibraryAssetsTable
                  library={{
                    id: linked ? studioLibraryId : tableId,
                    name: meta.name,
                    description: linked ? 'Studio library (linked)' : 'Local scratch table (IndexedDB)',
                  }}
                  sections={sections}
                  properties={properties}
                  rows={assetRows}
                  onSaveAsset={linked ? handleSaveAssetLinked : handleSaveAssetScratch}
                  onUpdateAsset={linked ? handleUpdateAssetLinked : handleUpdateAssetScratch}
                  onUpdateAssets={handleUpdateAssets}
                  onUpdateAssetsWithBatchBroadcast={handleUpdateAssets}
                  onDeleteAsset={linked ? handleDeleteAssetLinked : handleDeleteAssetScratch}
                  onDeleteAssets={linked ? handleDeleteAssetsLinked : handleDeleteAssetsScratch}
                  onAddProperty={linked ? handleAddPropertyLinked : handleAddPropertyScratch}
                  enableRealtime={false}
                  bypassProjectRoleForUi
                  scratchColumnOps={
                    linked
                      ? undefined
                      : {
                          onDeleteColumn: handleScratchDeleteColumn,
                          hideEditColumn: true,
                        }
                  }
                />
              </YjsProvider>
            )}
          </div>
        </div>
      </div>
    </App>
  );
}
