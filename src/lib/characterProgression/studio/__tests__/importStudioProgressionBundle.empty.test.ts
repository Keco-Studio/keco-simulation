import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimTableRow } from '@/lib/simLocalTables/types';
import type { StudioLibraryBinding } from '../importStudioProgressionBundle';

const mocks = vi.hoisted(() => ({
  loadStudioLibraryTableData: vi.fn(),
  getLibraryAssetsWithProperties: vi.fn(),
}));

vi.mock('@/app/simulation-system/battle/lib/localTableSkillSource/simTablePickerData', () => ({
  ASSET_NAME_COLUMN_KEY: '__asset_name__',
  loadStudioLibraryTableData: mocks.loadStudioLibraryTableData,
}));

vi.mock('@studio/lib/services/libraryAssetsService', () => ({
  getLibraryAssetsWithProperties: mocks.getLibraryAssetsWithProperties,
}));

import { importStudioProgressionBundle } from '../importStudioProgressionBundle';

const binding: StudioLibraryBinding = {
  projectId: 'project-1',
  charactersLibraryId: 'characters-lib',
  skillsLibraryId: 'skills-lib',
  charLevelCurveLibraryId: 'char-curve-lib',
  skillLevelCurveLibraryId: 'skill-curve-lib',
};

const skillColumns = [
  { key: 'id', label: 'id' },
  { key: 'name', label: 'name' },
  { key: 'type', label: 'type' },
  { key: 'power', label: 'power' },
];

const skillRows: SimTableRow[] = [
  {
    id: 'skill-asset-1',
    values: {
      id: 'fireball',
      name: 'Fireball',
      type: 'attack',
      power: '10',
    },
  },
];

const charCurveColumns = [
  { key: 'level', label: 'level' },
  { key: 'need_exp', label: 'need_exp' },
  { key: 'grant_sp', label: 'grant_sp' },
];

const charCurveRows: SimTableRow[] = [
  {
    id: 'level-1',
    values: {
      level: '1',
      need_exp: '0',
      grant_sp: '0',
    },
  },
];

const skillCurveColumns = [
  { key: 'skill_id', label: 'skill_id' },
  { key: 'level', label: 'level' },
  { key: 'cost_sp', label: 'cost_sp' },
];

const skillCurveRows: SimTableRow[] = [
  {
    id: 'fireball-level-1',
    values: {
      skill_id: 'fireball',
      level: '1',
      cost_sp: '1',
    },
  },
];

const characterAssets = [
  {
    id: 'character-asset-1',
    name: 'Hero',
    propertyValues: {
      character_id: 'hero',
      name: 'Hero',
      hp: '100',
      atk: '10',
      def: '5',
      spd: '8',
      mp: '50',
      skill_ids: 'fireball',
    },
  },
];

function mockStudioImportData(overrides?: {
  skillsRows?: SimTableRow[];
  charCurveRows?: SimTableRow[];
  skillCurveRows?: SimTableRow[];
  characterAssets?: typeof characterAssets;
}) {
  mocks.loadStudioLibraryTableData.mockImplementation(async (_supabase, libraryId: string) => {
    if (libraryId === binding.skillsLibraryId) {
      return { columns: skillColumns, rows: overrides?.skillsRows ?? skillRows };
    }
    if (libraryId === binding.charLevelCurveLibraryId) {
      return { columns: charCurveColumns, rows: overrides?.charCurveRows ?? charCurveRows };
    }
    if (libraryId === binding.skillLevelCurveLibraryId) {
      return { columns: skillCurveColumns, rows: overrides?.skillCurveRows ?? skillCurveRows };
    }
    throw new Error(`Unexpected library id ${libraryId}`);
  });
  mocks.getLibraryAssetsWithProperties.mockResolvedValue(
    overrides?.characterAssets ?? characterAssets,
  );
}

describe('importStudioProgressionBundle empty library validation', () => {
  beforeEach(() => {
    mocks.loadStudioLibraryTableData.mockReset();
    mocks.getLibraryAssetsWithProperties.mockReset();
  });

  it.each([
    ['Characters library', { characterAssets: [] }, /Characters library is empty/i],
    ['Skills library', { skillsRows: [] }, /Skills library is empty/i],
    ['Character level curve library', { charCurveRows: [] }, /Character level curve library is empty/i],
    ['Skill level curve library', { skillCurveRows: [] }, /Skill level curve library is empty/i],
  ])('rejects import when the %s has no importable rows', async (_label, overrides, expected) => {
    mockStudioImportData(overrides);

    await expect(
      importStudioProgressionBundle({} as never, binding),
    ).rejects.toThrow(expected);
  });

  it('rejects a characters library that only has blank rows with no configured values', async () => {
    mockStudioImportData({
      characterAssets: [
        {
          id: 'blank-character',
          name: '',
          propertyValues: {},
        },
      ],
    });

    await expect(
      importStudioProgressionBundle({} as never, binding),
    ).rejects.toThrow(/Characters library is empty/i);
  });
});
