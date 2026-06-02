export type WizardStep = 1 | 2 | 3;

export const SKILL_SHEET_READY_KEY = 'keco_battle_skill_sheet_ready';

export const DESIGN_LIBRARY_NAMES = [
  'seedcrop',
  'livestock',
  'seedcrop (copy)',
  'buildings',
  'pets',
  'npc',
  'Independent library',
] as const;

export type SkillLibraryTab = 'all' | 'visual' | 'base' | 'battle' | 'item';

export const SKILL_LIBRARY_TABS: { key: SkillLibraryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'visual', label: 'Visual Info' },
  { key: 'base', label: 'Base Stats' },
  { key: 'battle', label: 'Battle Data' },
  { key: 'item', label: 'Item' },
];
