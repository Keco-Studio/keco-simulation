'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Select, Space, Typography, message } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { listStudioLibrariesForSkillImport } from '@/app/simulation-system/battle/lib/localTableSkillSource/simTablePickerData';
import type { CloudProgressionStudioBinding } from '../lib/progressionStudioBindingStorage';

type Props = {
  binding: CloudProgressionStudioBinding | null;
  onImported: (binding: CloudProgressionStudioBinding) => void | Promise<void>;
  importing?: boolean;
};

export function CloudProgressionImportCard({ binding, onImported, importing }: Props) {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const [charactersLibraryId, setCharactersLibraryId] = useState(binding?.charactersLibraryId);
  const [skillsLibraryId, setSkillsLibraryId] = useState(binding?.skillsLibraryId);
  const [charLevelCurveLibraryId, setCharLevelCurveLibraryId] = useState(
    binding?.charLevelCurveLibraryId,
  );
  const [skillLevelCurveLibraryId, setSkillLevelCurveLibraryId] = useState(
    binding?.skillLevelCurveLibraryId,
  );

  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['cloudProgressionStudioLibs', userProfile?.id],
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

  const handleImport = async () => {
    if (
      !charactersLibraryId ||
      !skillsLibraryId ||
      !charLevelCurveLibraryId ||
      !skillLevelCurveLibraryId
    ) {
      message.warning('Select all four Studio libraries before importing');
      return;
    }
    const lib = libraries.find((l) => l.libraryId === charactersLibraryId);
    const next: CloudProgressionStudioBinding = {
      projectId: lib?.projectId,
      charactersLibraryId,
      skillsLibraryId,
      charLevelCurveLibraryId,
      skillLevelCurveLibraryId,
      importedAt: Date.now(),
      cloudLabels: {
        characters: labelFor(charactersLibraryId),
        skills: labelFor(skillsLibraryId),
        charLevelCurve: labelFor(charLevelCurveLibraryId),
        skillLevelCurve: labelFor(skillLevelCurveLibraryId),
      },
    };
    await onImported(next);
    message.success('Studio progression libraries imported');
  };

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <Alert
        type="info"
        showIcon
        message="Sign in to sync progression across devices"
        description="Cloud character level, EXP, and skill points require a Keco Studio account."
      />
    );
  }

  return (
    <Card size="small" title="Import from Keco Studio">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Bind Characters, Skills, char_level_curve, and skill_level_curve libraries. Progression
          syncs to Supabase per account.
        </Typography.Paragraph>
        <Select
          showSearch
          placeholder="Characters library"
          options={libraryOptions}
          value={charactersLibraryId}
          onChange={setCharactersLibraryId}
          loading={librariesLoading}
          style={{ width: '100%' }}
          optionFilterProp="label"
        />
        <Select
          showSearch
          placeholder="Skills library"
          options={libraryOptions}
          value={skillsLibraryId}
          onChange={setSkillsLibraryId}
          loading={librariesLoading}
          style={{ width: '100%' }}
          optionFilterProp="label"
        />
        <Select
          showSearch
          placeholder="Character level curve library"
          options={libraryOptions}
          value={charLevelCurveLibraryId}
          onChange={setCharLevelCurveLibraryId}
          loading={librariesLoading}
          style={{ width: '100%' }}
          optionFilterProp="label"
        />
        <Select
          showSearch
          placeholder="Skill level curve library"
          options={libraryOptions}
          value={skillLevelCurveLibraryId}
          onChange={setSkillLevelCurveLibraryId}
          loading={librariesLoading}
          style={{ width: '100%' }}
          optionFilterProp="label"
        />
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={() => void handleImport()}
          loading={importing}
          disabled={!supabaseReady}
        >
          Import Studio libraries
        </Button>
      </Space>
    </Card>
  );
}
