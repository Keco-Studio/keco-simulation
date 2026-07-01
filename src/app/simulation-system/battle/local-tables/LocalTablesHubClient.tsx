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
import { parseMarkdownTablesToLocalTableDrafts } from '@/lib/simLocalTables/importDocumentTables';
import { BATTLE_SKILLS_SHEET_HEADERS } from '@/app/simulation-system/battle/lib/skills/battleSkillsSheetSpec';
import {
  buildSkillSheetEmptyRow,
  buildSkillSheetScratchMeta,
} from '@/lib/simLocalTables/skillSheetTableTemplate';
import { deleteTableCascade, listTableMetas, putTableMeta, putTableRows } from '@/lib/simLocalTables/simLocalTablesDb';

export type LocalTableCreateTemplate = 'blank' | 'skill_sheet';

export default function LocalTablesHubClient() {
  const router = useRouter();
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const [metas, setMetas] = useState<SimTableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [workspaceProjectId, setWorkspaceProjectId] = useState<string>('');
  const [form] = Form.useForm<{
    name: string;
    linkStudio: boolean;
    template: LocalTableCreateTemplate;
  }>();

  const linkStudio = Form.useWatch('linkStudio', form);
  const createTemplate = Form.useWatch('template', form);

  const { data: hubWorkspaceProjects = [], isLoading: hubWsProjectsLoading } = useQuery({
    queryKey: ['hubWorkspaceProjects', userProfile?.id],
    queryFn: () => listProjects(supabase, userProfile!.id),
    enabled: Boolean(isAuthenticated && userProfile?.id),
  });

  const hubWorkspaceProjectOptions = useMemo(
    () => hubWorkspaceProjects.map((p) => ({ value: p.id, label: p.name || p.id })),
    [hubWorkspaceProjects],
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
      const firstKey = 'col_1';

      if (v.linkStudio) {
        if (!isAuthenticated || !userProfile?.id) {
          message.error('Sign in (same Supabase as Studio) to link all projects');
          return;
        }
        const projects = await listProjects(supabase, userProfile.id);
        type Pair = { projectId: string; libraryId: string; sort: string };
        const pairs: Pair[] = [];
        for (const p of projects) {
          const libs = await listLibraries(supabase, p.id);
          const pname = (p.name || p.id).toLowerCase();
          for (const lib of libs) {
            const lname = (lib.name || lib.id).toLowerCase();
            pairs.push({
              projectId: p.id,
              libraryId: lib.id,
              sort: `${pname}\t${lname}\t${p.id}\t${lib.id}`,
            });
          }
        }
        if (!pairs.length) {
          message.error('No libraries found in any of your Studio projects');
          return;
        }
        pairs.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
        const first = pairs[0];
        const meta: SimTableMeta = {
          id,
          name: v.name.trim() || 'Untitled table',
          columnKeys: [],
          createdAt: now,
          updatedAt: now,
          dirty: false,
          studioProjectId: first.projectId,
          studioLibraryId: first.libraryId,
          studioMultiProject: true,
        };
        await putTableMeta(meta);
        await putTableRows(id, []);
        message.success('Table created');
        setOpen(false);
        form.resetFields();
        await refresh();
        router.push(
          `/simulation-system/battle/local-tables/${id}?projectId=${encodeURIComponent(first.projectId)}&libraryId=${encodeURIComponent(first.libraryId)}`,
        );
        return;
      }

      if (v.template === 'skill_sheet') {
        const sheet = buildSkillSheetScratchMeta(id, v.name.trim() || 'Untitled table', now);
        const meta: SimTableMeta = {
          id,
          name: v.name.trim() || 'Untitled table',
          ...sheet,
          createdAt: now,
          updatedAt: now,
          dirty: false,
          skillSheetTemplate: true,
        };
        await putTableMeta(meta);
        await putTableRows(id, [buildSkillSheetEmptyRow(crypto.randomUUID())]);
      } else {
        const meta: SimTableMeta = {
          id,
          name: v.name.trim() || 'Untitled table',
          columnKeys: [firstKey],
          columnLabels: ['Column 1'],
          createdAt: now,
          updatedAt: now,
          dirty: false,
        };
        await putTableMeta(meta);
        await putTableRows(id, [{ id: crypto.randomUUID(), values: { [firstKey]: '' } }]);
      }
      message.success('Table created');
      setOpen(false);
      form.resetFields();
      await refresh();
      router.push(`/simulation-system/battle/local-tables/${id}`);
    } catch {
      /* validateFields */
    }
  };

  const handleDelete = (m: SimTableMeta) => {
    Modal.confirm({
      title: 'Delete this table?',
      content: m.studioLibraryId
        ? m.studioMultiProject
          ? 'Removes this bookmark from this browser. Your Studio projects and libraries are not deleted.'
          : 'Removes this bookmark from this browser. Your Studio library is not deleted.'
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

  const handleImportDocumentTables = async () => {
    const drafts = parseMarkdownTablesToLocalTableDrafts(importText);
    if (drafts.length === 0) {
      message.error('No markdown tables found');
      return;
    }
    for (const draft of drafts) {
      await putTableMeta(draft.meta);
      await putTableRows(draft.meta.id, draft.rows);
    }
    message.success(`Imported ${drafts.length} table${drafts.length === 1 ? '' : 's'}`);
    setImportOpen(false);
    setImportText('');
    await refresh();
  };

  return (
    <div style={{ padding: '16px 24px 32px', maxWidth: 960 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Local tables
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        <strong>Without</strong> Link Studio: rows stay in IndexedDB; you can still add <strong>reference</strong>{' '}
        columns that point at other Studio libraries (sign in required). <strong>With</strong> Link Studio: the editor
        mirrors a live library from Supabase (same data as Project tables).
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
        <Button onClick={() => setImportOpen(true)}>Import document tables</Button>
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
                    {m.studioMultiProject ? (
                      <>
                        Linked to <strong>all</strong> Studio projects — switch library in the editor. Current: project{' '}
                        <Typography.Text code>{m.studioProjectId}</Typography.Text> · library{' '}
                        <Typography.Text code>{m.studioLibraryId}</Typography.Text>
                      </>
                    ) : (
                      <>
                        Linked Studio library · project <Typography.Text code>{m.studioProjectId}</Typography.Text> ·
                        library <Typography.Text code>{m.studioLibraryId}</Typography.Text>
                      </>
                    )}
                  </span>
                ) : m.skillSheetTemplate ? (
                  'This device only · Skill battle template'
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
          initialValues={{ linkStudio: false, template: 'blank' }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter a table name' }]}>
            <Input placeholder="e.g. Battle notes or Library mirror" />
          </Form.Item>
          <Form.Item name="linkStudio" valuePropName="checked">
            <Checkbox
              onChange={(e) => {
                if (e.target.checked) form.setFieldValue('template', 'blank');
              }}
            >
              Link all Keco Studio projects (every library; Supabase + reference columns)
            </Checkbox>
          </Form.Item>
          {!linkStudio ? (
            <Form.Item
              name="template"
              label="Table template"
              extra="Skill battle template: columns match the skills editor sheet (id, name, MP, attachTurns, …) for Import by id and skill binding."
            >
              <Select
                options={[
                  { value: 'blank', label: 'Blank (one string column)' },
                  { value: 'skill_sheet', label: 'Skill battle template' },
                ]}
              />
            </Form.Item>
          ) : null}
          {linkStudio ? (
            !authLoading && !isAuthenticated ? (
              <Typography.Paragraph type="warning">
                Sign in (same Supabase account as Studio). We will load every project and library you can access — no
                manual selection.
              </Typography.Paragraph>
            ) : (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                On create, we discover <strong>all</strong> libraries in <strong>all</strong> your Studio projects and
                open the first one; you can switch to any other library in the editor.
              </Typography.Paragraph>
            )
          ) : createTemplate === 'skill_sheet' ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Opens with {BATTLE_SKILLS_SHEET_HEADERS.length} columns and one empty row. Headers align with{' '}
              <Typography.Text code>Battle skills</Typography.Text> Excel export and{' '}
              <strong>Import by id</strong> on the skills editor.
            </Typography.Paragraph>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title="Import document tables"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={() => void handleImportDocumentTables()}
        okText="Import"
        width={720}
      >
        <Typography.Paragraph type="secondary">
          Paste Markdown content with one or more tables. Each table is saved as an independent local table.
        </Typography.Paragraph>
        <Input.TextArea
          rows={12}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={'## Characters\n| id | name |\n| --- | --- |\n| c1 | Hero |'}
        />
      </Modal>
    </div>
  );
}
