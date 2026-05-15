'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Checkbox, Card, Form, Input, List, Modal, Select, Space, Typography, message } from 'antd';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { listLibraries } from '@studio/lib/services/libraryService';
import { listProjects } from '@studio/lib/services/projectService';
import type { SimTableMeta } from '@/lib/simLocalTables/types';
import { SIM_LOCAL_WORKSPACE_TABLE_ID } from '@/lib/simLocalTables/constants';
import { deleteTableCascade, listTableMetas, putTableMeta, putTableRows } from '@/lib/simLocalTables/simLocalTablesDb';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export default function LocalTablesHubClient() {
  const router = useRouter();
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const [metas, setMetas] = useState<SimTableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [workspaceProjectId, setWorkspaceProjectId] = useState<string>('');
  const [form] = Form.useForm<{
    name: string;
    linkStudio: boolean;
    studioProjectId?: string;
    studioLibraryId?: string;
  }>();

  const linkStudio = Form.useWatch('linkStudio', form);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', userProfile?.id],
    queryFn: () => listProjects(supabase, userProfile!.id),
    enabled: Boolean(open && isAuthenticated && userProfile?.id && linkStudio),
  });

  const selectedProjectId = Form.useWatch('studioProjectId', form);

  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['projectLibraries', selectedProjectId],
    queryFn: () => listLibraries(supabase, selectedProjectId!),
    enabled: Boolean(open && linkStudio && selectedProjectId && isUuid(selectedProjectId)),
  });

  const { data: hubWorkspaceProjects = [], isLoading: hubWsProjectsLoading } = useQuery({
    queryKey: ['hubWorkspaceProjects', userProfile?.id],
    queryFn: () => listProjects(supabase, userProfile!.id),
    enabled: Boolean(isAuthenticated && userProfile?.id),
  });

  const hubWorkspaceProjectOptions = useMemo(
    () => hubWorkspaceProjects.map((p) => ({ value: p.id, label: p.name || p.id })),
    [hubWorkspaceProjects],
  );

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name || p.id })),
    [projects],
  );
  const libraryOptions = useMemo(
    () => libraries.map((lib) => ({ value: lib.id, label: lib.name || lib.id })),
    [libraries],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setMetas(await listTableMetas());
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    try {
      const v = await form.validateFields();
      const id = crypto.randomUUID();
      const now = Date.now();
      const link = Boolean(v.linkStudio && v.studioProjectId && v.studioLibraryId);
      if (v.linkStudio) {
        if (!v.studioProjectId || !isUuid(v.studioProjectId)) {
          message.error('Choose a valid project');
          return;
        }
        if (!v.studioLibraryId || !isUuid(v.studioLibraryId)) {
          message.error('Choose a valid library');
          return;
        }
      }
      const firstKey = 'col_1';
      const meta: SimTableMeta = {
        id,
        name: v.name.trim() || 'Untitled table',
        columnKeys: link ? [] : [firstKey],
        columnLabels: link ? undefined : ['Column 1'],
        createdAt: now,
        updatedAt: now,
        dirty: false,
        studioProjectId: link ? v.studioProjectId?.trim() : undefined,
        studioLibraryId: link ? v.studioLibraryId?.trim() : undefined,
      };
      await putTableMeta(meta);
      if (link) {
        await putTableRows(id, []);
      } else {
        await putTableRows(id, [{ id: crypto.randomUUID(), values: { [firstKey]: '' } }]);
      }
      message.success('Table created');
      setOpen(false);
      form.resetFields();
      await refresh();
      const q = link
        ? `?projectId=${encodeURIComponent(v.studioProjectId!.trim())}&libraryId=${encodeURIComponent(v.studioLibraryId!.trim())}`
        : '';
      router.push(`/simulation-system/battle/local-tables/${id}${q}`);
    } catch {
      /* validateFields */
    }
  };

  const handleDelete = (m: SimTableMeta) => {
    Modal.confirm({
      title: 'Delete this table?',
      content: m.studioLibraryId
        ? 'Removes this bookmark from this browser. Your Studio library is not deleted.'
        : 'All rows for this table will be removed. This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        await deleteTableCascade(m.id);
        message.success('Table deleted');
        await refresh();
      },
    });
  };

  return (
    <div style={{ padding: '16px 24px 32px', maxWidth: 960 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Local tables
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Scratch tables live in IndexedDB. Optionally <strong>link a Keco Studio library</strong>: you get the same
        table UI (including <Typography.Text code>reference</Typography.Text> columns), and edits are written to
        Supabase like Project tables. Sign in on this app (same Supabase as Studio) before linking.
      </Typography.Paragraph>
      <Card size="small" title="Studio workspace" style={{ marginBottom: 20 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Browse and edit <strong>every library</strong> in a project from one screen (library switcher on the next
          page). Same <Typography.Text code>reference</Typography.Text> pickers as Project tables; nothing is saved to
          IndexedDB for this mode.
        </Typography.Paragraph>
        <Space wrap>
          <Select
            style={{ minWidth: 260 }}
            showSearch
            optionFilterProp="label"
            placeholder="Select project"
            loading={hubWsProjectsLoading}
            options={hubWorkspaceProjectOptions}
            value={workspaceProjectId || undefined}
            onChange={(v) => setWorkspaceProjectId(v)}
            disabled={!isAuthenticated}
          />
          <Button
            type="primary"
            disabled={!workspaceProjectId}
            onClick={() =>
              router.push(
                `/simulation-system/battle/local-tables/${SIM_LOCAL_WORKSPACE_TABLE_ID}?projectId=${encodeURIComponent(workspaceProjectId)}`,
              )
            }
          >
            Open workspace
          </Button>
        </Space>
        {!authLoading && !isAuthenticated ? (
          <Typography.Paragraph type="warning" style={{ marginTop: 12, marginBottom: 0 }}>
            Sign in (same Supabase account as Studio) to list projects.
          </Typography.Paragraph>
        ) : null}
      </Card>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          New table
        </Button>
        <Button onClick={() => void refresh()} loading={loading}>
          Refresh
        </Button>
        <Link href="/simulation-system/battle/studio-libraries">
          <Button>Open project tables</Button>
        </Link>
      </Space>

      <List
        loading={loading}
        dataSource={metas}
        locale={{ emptyText: 'No local tables yet' }}
        renderItem={(m) => (
          <List.Item
            actions={[
              <Link
                key="open"
                href={
                  m.studioProjectId && m.studioLibraryId
                    ? `/simulation-system/battle/local-tables/${m.id}?projectId=${encodeURIComponent(m.studioProjectId)}&libraryId=${encodeURIComponent(m.studioLibraryId)}`
                    : `/simulation-system/battle/local-tables/${m.id}`
                }
              >
                Open
              </Link>,
              <Button key="del" type="link" danger onClick={() => handleDelete(m)}>
                Delete
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={<span>{m.name}</span>}
              description={
                m.studioLibraryId ? (
                  <span>
                    Linked Studio library · project <Typography.Text code>{m.studioProjectId}</Typography.Text> ·
                    library <Typography.Text code>{m.studioLibraryId}</Typography.Text>
                  </span>
                ) : (
                  'This device only (IndexedDB scratch)'
                )
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title="New local table"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreate()}
        destroyOnHidden
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ linkStudio: false }}
          onValuesChange={(changed) => {
            if (changed.linkStudio === false) {
              form.setFieldsValue({ studioProjectId: undefined, studioLibraryId: undefined });
            }
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter a table name' }]}>
            <Input placeholder="e.g. Battle notes or Library mirror" />
          </Form.Item>
          <Form.Item name="linkStudio" valuePropName="checked">
            <Checkbox>Link Keco Studio library (Supabase + reference columns)</Checkbox>
          </Form.Item>
          {linkStudio ? (
            <>
              {!authLoading && !isAuthenticated ? (
                <Typography.Paragraph type="warning">
                  Sign in (same Supabase account as Studio) to list projects and libraries.
                </Typography.Paragraph>
              ) : null}
              <Form.Item
                name="studioProjectId"
                label="Project"
                rules={[{ required: true, message: 'Select a project' }]}
              >
                <Select
                  showSearch
                  placeholder="Select project"
                  options={projectOptions}
                  loading={projectsLoading}
                  optionFilterProp="label"
                  disabled={!isAuthenticated}
                  onChange={() => form.setFieldsValue({ studioLibraryId: undefined })}
                />
              </Form.Item>
              <Form.Item
                name="studioLibraryId"
                label="Library"
                rules={[{ required: true, message: 'Select a library' }]}
              >
                <Select
                  showSearch
                  placeholder="Select library"
                  options={libraryOptions}
                  loading={librariesLoading}
                  optionFilterProp="label"
                  disabled={!selectedProjectId}
                />
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
