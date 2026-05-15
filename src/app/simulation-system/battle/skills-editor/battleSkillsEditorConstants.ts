/** Autosave debounce (ms) — cell edits only */
export const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Page size for the skills table */
export const PAGE_SIZE = 10;

export const TABLE_SCROLL_X = 2212;

export const ATTACH_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'random', label: 'Random' },
  { value: 'fire', label: 'Fire' },
  { value: 'water', label: 'Water' },
  { value: 'thunder', label: 'Thunder' },
  { value: 'grass', label: 'Grass' },
  { value: 'ice', label: 'Ice' },
];

export const STRENGTH_OPTIONS = [
  { value: 'weak', label: 'Weak' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
];

export const SPECIAL_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'heal', label: 'Heal (coef × ATK)' },
  { value: 'atk_debuff', label: 'ATK debuff (ratio)' },
  { value: 'def_debuff', label: 'DEF debuff (ratio)' },
];
