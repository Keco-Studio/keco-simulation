/** Excel sheet name (export / import). */
export const BATTLE_SKILLS_SHEET_NAME = 'Battle skills';

/** Column header order (export / import; import matches by header name, order may vary). */
export const BATTLE_SKILLS_SHEET_HEADERS = [
  'id',
  'name',
  'type',
  'power',
  'MP',
  'maxCooldown',
  'description',
  'attachElement',
  'attachStrength',
  'attachTurns',
  'dotDamage',
  'dotTurns',
  'freezeTurns',
  'specialEffect',
  'specialEffectValue',
  'specialEffectDuration',
  'reactionTriggers',
] as const;

export type BattleSkillsSheetHeader = (typeof BATTLE_SKILLS_SHEET_HEADERS)[number];

/** Legacy sheet headers from older exports → canonical English keys (Unicode escapes avoid non-ASCII in source). */
export const LEGACY_BATTLE_SKILLS_HEADER_MAP: Readonly<Record<string, BattleSkillsSheetHeader>> = {
  '\u540d\u79f0': 'name',
  '\u7c7b\u578b': 'type',
  '\u4f24\u5bb3\u500d\u7387': 'power',
  '\u51b7\u5374': 'maxCooldown',
  '\u63cf\u8ff0': 'description',
  '\u9644\u7740\u5143\u7d20': 'attachElement',
  '\u9644\u7740\u5f3a\u5ea6': 'attachStrength',
  '\u9644\u7740\u56de\u5408': 'attachTurns',
  'DOT\u500d\u7387': 'dotDamage',
  'DOT\u56de\u5408': 'dotTurns',
  '\u51bb\u7ed3\u56de\u5408': 'freezeTurns',
  '\u7279\u6b8a\u6548\u679c': 'specialEffect',
  '\u7279\u6b8a\u6570\u503c': 'specialEffectValue',
  '\u7279\u6b8a\u6301\u7eed': 'specialEffectDuration',
  '\u5173\u8054\u53cd\u5e94': 'reactionTriggers',
};

/** Legacy localized sheet tab name from exports before English rename. */
export const LEGACY_BATTLE_SKILLS_SHEET_NAME = '\u6280\u80fd\u914d\u8868';
