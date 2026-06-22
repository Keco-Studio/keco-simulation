'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Select, Space, Typography, message } from 'antd';
import { CloudDownloadOutlined, LinkOutlined } from '@ant-design/icons';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { listStudioLibrariesForSkillImport } from '@/app/simulation-system/battle/lib/localTableSkillSource/simTablePickerData';
import {
  PROGRESSION_TRACK_COLUMNS,
  PROGRESSION_RULE_COLUMNS,
} from '@/lib/progression/studio/columnKeys';
import {
  readProgressionStudioBinding,
  parseProgressionSimulateSearchParams,
  type ProgressionStudioBinding,
} from '../lib/progressionStudioBindingStorage';

type Props = {
  onImported: (binding: ProgressionStudioBinding) => void | Promise<void>;
};

const STUDIO_ORIGIN =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_KECO_STUDIO_ORIGIN?.trim() : '';

export function ProgressionStudioImportCard({ onImported }: Props) {
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const savedBinding = useMemo(() => readProgressionStudioBinding(), []);

  const [tracksLibraryId, setTracksLibraryId] = useState<string | undefined>(
    savedBinding?.tracksLibraryId,
  );
  const [rulesLibraryId, setRulesLibraryId] = useState<string | undefined>(
    savedBinding?.rulesLibraryId,
  );
  const [importing, setImporting] = useState(false);

  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['progressionStudioLibs', userProfile?.id],
    queryFn: () => listStudioLibrariesForSkillImport(supabase!, userProfile!.id),
    enabled: supabaseReady,
  });

  const libraryOptions = useMemo(
    () => libraries.map((l) => ({ value: l.libraryId, label: l.label })),
    [libraries],
  );

  const labelFor = useCallback(
    (libraryId: string | undefined) =>
      libraries.find((l) => l.libraryId === libraryId)?.label ?? libraryId ?? '',
    [libraries],
  );

  const runImport = useCallback(async () => {
    if (!tracksLibraryId || !rulesLibraryId) {
      message.warning('Select both Studio libraries before importing');
      return;
    }
    setImporting(true);
    try {
      const lib = libraries.find((l) => l.libraryId === tracksLibraryId);
      const binding: ProgressionStudioBinding = {
        projectId: lib?.projectId,
        tracksLibraryId,
        rulesLibraryId,
        tracksLibraryLabel: labelFor(tracksLibraryId),
        rulesLibraryLabel: labelFor(rulesLibraryId),
        importedAt: Date.now(),
      };
      await onImported(binding);
    } finally {
      setImporting(false);
    }
  }, [tracksLibraryId, rulesLibraryId, libraries, labelFor, onImported]);

  useEffect(() => {
    const fromUrl = parseProgressionSimulateSearchParams(searchParams);
    if (fromUrl?.tracksLibraryId) setTracksLibraryId(fromUrl.tracksLibraryId);
    if (fromUrl?.rulesLibraryId) setRulesLibraryId(fromUrl.rulesLibraryId);
  }, [searchParams]);

  useEffect(() => {
    if (!supabaseReady || !savedBinding) return;
    if (tracksLibraryId && rulesLibraryId) return;
    setTracksLibraryId(savedBinding.tracksLibraryId);
    setRulesLibraryId(savedBinding.rulesLibraryId);
  }, [supabaseReady, savedBinding, tracksLibraryId, rulesLibraryId]);

  return (
    <Card size="small" title="Import from Keco Studio libraries">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Edit tracks and rules in Keco Studio, then import here. Column keys must match the
          progression simulator schema.
        </Typography.Paragraph>

        <Alert
          type="info"
          showIcon
          message="Required Studio column keys"
          description={
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>Tracks library:</strong>{' '}
                <Typography.Text code>{PROGRESSION_TRACK_COLUMNS.trackId}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_TRACK_COLUMNS.label}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_TRACK_COLUMNS.kind}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_TRACK_COLUMNS.params}</Typography.Text>
              </li>
              <li>
                <strong>Rules library:</strong>{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.ruleId}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.enabled}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.whenType}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.filter}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.targetTrackId}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.rewardFormula}</Typography.Text>,{' '}
                <Typography.Text code>{PROGRESSION_RULE_COLUMNS.params}</Typography.Text>
              </li>
            </ul>
          }
        />

        {!authLoading && !supabaseReady ? (
          <Alert
            type="warning"
            showIcon
            message="Sign in with the same Keco Studio account to list project libraries."
          />
        ) : null}

        <Select
          showSearch
          allowClear
          loading={librariesLoading}
          disabled={!supabaseReady}
          style={{ width: '100%' }}
          placeholder="Progress tracks library (Studio)"
          optionFilterProp="label"
          value={tracksLibraryId}
          onChange={setTracksLibraryId}
          options={libraryOptions}
        />
        <Select
          showSearch
          allowClear
          loading={librariesLoading}
          disabled={!supabaseReady}
          style={{ width: '100%' }}
          placeholder="Rules library (Studio)"
          optionFilterProp="label"
          value={rulesLibraryId}
          onChange={setRulesLibraryId}
          options={libraryOptions}
        />

        <Space wrap>
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            loading={importing}
            disabled={!supabaseReady || !tracksLibraryId || !rulesLibraryId}
            onClick={() => void runImport()}
          >
            Import tracks &amp; rules
          </Button>
          {STUDIO_ORIGIN ? (
            <Button
              type="link"
              icon={<LinkOutlined />}
              href={STUDIO_ORIGIN}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Keco Studio
            </Button>
          ) : null}
        </Space>

        {savedBinding ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Last import: {savedBinding.tracksLibraryLabel || savedBinding.tracksLibraryId} +{' '}
            {savedBinding.rulesLibraryLabel || savedBinding.rulesLibraryId}
            {savedBinding.importedAt
              ? ` · ${new Date(savedBinding.importedAt).toLocaleString()}`
              : ''}
          </Typography.Text>
        ) : null}
      </Space>
    </Card>
  );
}
