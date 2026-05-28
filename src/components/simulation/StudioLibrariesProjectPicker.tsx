'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Collapse, Input, Select, Space, Spin, Typography } from 'antd';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { listProjects } from '@studio/lib/services/projectService';
import AuthForm from '@studio/components/authform/AuthForm';
import hubStyles from '@/app/simulation-system/battle/studio-libraries/StudioLibrariesEmbed.module.css';

function isLikelyProjectId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

type StudioLibrariesProjectPickerProps = {
  /** Route to open with `?projectId=` (no trailing query). */
  hubPath?: string;
};

/**
 * Loads projects the signed-in user collaborates on (same rules as Keco Studio) and opens the hub with `projectId`.
 */
export function StudioLibrariesProjectPicker({
  hubPath = '/simulation-system/battle/studio-libraries',
}: StudioLibrariesProjectPickerProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, userProfile } = useAuth();
  const supabase = useSupabase();
  const [clientMounted, setClientMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [manualId, setManualId] = useState('');

  useEffect(() => {
    setClientMounted(true);
  }, []);

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ['projects', userProfile?.id],
    queryFn: () => listProjects(supabase, userProfile!.id),
    enabled: Boolean(userProfile?.id) && isAuthenticated,
    staleTime: 60_000,
  });

  const options = useMemo(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name?.trim() ? `${p.name} (${p.id.slice(0, 8)}…)` : p.id,
      })),
    [projects],
  );

  const openWithProjectId = (projectId: string) => {
    const id = projectId.trim();
    if (!isLikelyProjectId(id)) return;
    router.push(`${hubPath}?projectId=${encodeURIComponent(id)}`);
  };

  // Keep SSR + first client paint identical: auth may resolve before hydration finishes.
  if (!clientMounted || authLoading) {
    return (
      <Space align="center" direction="horizontal">
        <Spin />
        <Typography.Text type="secondary">Checking session…</Typography.Text>
      </Space>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return (
      <div className={hubStyles.signInCenter}>
        <AuthForm variant="embedded" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Typography.Text strong>Project</Typography.Text>
        <Select
          showSearch
          allowClear
          placeholder="Select a project you collaborate on"
          style={{ width: '100%', marginTop: 8 }}
          value={selectedId}
          onChange={(v) => setSelectedId(v)}
          options={options}
          loading={projectsLoading}
          optionFilterProp="label"
          filterOption={(input, option) => {
            const hay = `${String(option?.label ?? '')} ${String(option?.value ?? '')}`.toLowerCase();
            return hay.includes(input.toLowerCase().trim());
          }}
          notFoundContent={projectsLoading ? <Spin size="small" /> : 'No projects'}
        />
        <Button
          type="primary"
          style={{ marginTop: 12 }}
          disabled={!selectedId || !isLikelyProjectId(selectedId)}
          onClick={() => selectedId && openWithProjectId(selectedId)}
        >
          Open project
        </Button>
      </div>

      {projectsError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load projects"
          description={
            projectsError instanceof Error ? projectsError.message : String(projectsError)
          }
        />
      ) : null}

      {!projectsLoading && projects.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          No projects found. Create a project in Keco Studio or accept a collaboration invite, then refresh this page.
        </Typography.Paragraph>
      ) : null}

      <Collapse
        items={[
          {
            key: 'manual',
            label: 'Enter project UUID manually',
            children: (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Optional fallback (e.g. shared deep link). Same UUID as the first segment in a Studio project URL.
                </Typography.Paragraph>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Project UUID"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onPressEnter={() => openWithProjectId(manualId)}
                  />
                  <Button type="primary" disabled={!isLikelyProjectId(manualId)} onClick={() => openWithProjectId(manualId)}>
                    Open
                  </Button>
                </Space.Compact>
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
