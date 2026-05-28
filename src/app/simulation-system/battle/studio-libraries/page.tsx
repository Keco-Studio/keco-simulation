'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input, Space, Typography } from 'antd';
import CopiedStudioProjectHub from '@/components/simulation/CopiedStudioProjectHub';
import { StudioLibrariesProjectPicker } from '@/components/simulation/StudioLibrariesProjectPicker';
import { getStudioOrigin, isStudioEmbedConfigured } from '../../../../lib/studioEmbedConfig';
import { StudioLibrariesBreadcrumb } from '../components/StudioLibrariesBreadcrumb';
import styles from './StudioLibrariesEmbed.module.css';

function isLikelyProjectId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function useNativeCopiedStudioUi(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function NativeStudioLibrariesInner() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId')?.trim() ?? '';

  if (!urlProjectId || !isLikelyProjectId(urlProjectId)) {
    return (
      <div className={styles.fallback}>
        <StudioLibrariesBreadcrumb />
        <Card title="Project library (Keco Studio UI)" style={{ marginTop: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Pick a project you collaborate on. The list comes from Supabase for the account you sign in with below
              (use the same account as in Keco Studio).
            </Typography.Paragraph>
            <StudioLibrariesProjectPicker />
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <StudioLibrariesBreadcrumb />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Studio project root rendered in this app (copied from keco-studio).{' '}
          <Link href="/simulation-system/battle/studio-libraries">Change project</Link>
        </Typography.Text>
      </div>
      <CopiedStudioProjectHub />
    </div>
  );
}

function IframeStudioLibrariesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = useMemo(() => getStudioOrigin(), []);
  const urlProjectId = searchParams.get('projectId')?.trim() ?? '';
  const [draftId, setDraftId] = useState(urlProjectId);

  useEffect(() => {
    setDraftId(urlProjectId);
  }, [urlProjectId]);

  const iframeSrc =
    origin && urlProjectId && isLikelyProjectId(urlProjectId) ? `${origin}/${urlProjectId}` : '';

  const applyProject = () => {
    const id = draftId.trim();
    if (!isLikelyProjectId(id)) return;
    router.push(`/simulation-system/battle/studio-libraries?projectId=${encodeURIComponent(id)}`);
  };

  if (!isStudioEmbedConfigured() || !origin) {
    return (
      <div className={styles.fallback}>
        <StudioLibrariesBreadcrumb />
        <Card title="Studio embed not configured" style={{ marginTop: 16 }}>
          <Typography.Paragraph>
            Recommended: set <Typography.Text code>NEXT_PUBLIC_SUPABASE_URL</Typography.Text> and{' '}
            <Typography.Text code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Typography.Text> in{' '}
            <Typography.Text code>keco-simulation/.env.local</Typography.Text> (same as Keco Studio) to use the copied
            library UI with a project dropdown.
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary">
            Or set <Typography.Text code>NEXT_PUBLIC_KECO_STUDIO_ORIGIN</Typography.Text> (e.g.{' '}
            <Typography.Text code>http://localhost:3000</Typography.Text>) to embed Studio in an iframe, then restart
            the dev server.
          </Typography.Paragraph>
        </Card>
      </div>
    );
  }

  if (!urlProjectId || !isLikelyProjectId(urlProjectId)) {
    return (
      <div className={styles.fallback}>
        <StudioLibrariesBreadcrumb />
        <Card title="Open a Studio project in iframe" style={{ marginTop: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Paragraph type="secondary">
              Without Supabase in this app, projects cannot be listed here. Paste the project UUID (first segment of a
              Studio project URL); the iframe will load that project from{' '}
              <Typography.Text code>{origin}</Typography.Text>. Sign in to Studio in this browser if the frame is blank.
            </Typography.Paragraph>
            <Input
              placeholder="Project UUID"
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              onPressEnter={applyProject}
            />
            <Button type="primary" disabled={!isLikelyProjectId(draftId)} onClick={applyProject}>
              Load project
            </Button>
            <Typography.Link href={origin} target="_blank" rel="noreferrer">
              Open Keco Studio in a new tab
            </Typography.Link>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <StudioLibrariesBreadcrumb />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Studio project embedded via iframe. If the frame is empty, sign in to Studio in this browser.{' '}
          <Link href="/simulation-system/battle/studio-libraries">Change project</Link>
          {' · '}
          <Link href={`${origin}/${urlProjectId}`} target="_blank" rel="noreferrer">
            Open same page in Studio
          </Link>
        </Typography.Text>
      </div>
      <div className={styles.frameWrap}>
        <iframe className={styles.frame} title="Keco Studio project" src={iframeSrc} />
      </div>
    </div>
  );
}

function StudioLibrariesInner() {
  const native = useNativeCopiedStudioUi();
  if (native) {
    return <NativeStudioLibrariesInner />;
  }
  return <IframeStudioLibrariesInner />;
}

export default function StudioLibrariesPage() {
  return (
    <Suspense fallback={<div className={styles.fallback}>Loading…</div>}>
      <StudioLibrariesInner />
    </Suspense>
  );
}
