/**
 * Export battle-simulation static config to a multi-sheet .xlsx.
 *
 * Sources:
 * - `battle/types/index.ts` — elements, reactions, defaults, MP rules
 * - `battle/data/skills.ts` — skill table
 * - `battle/core/battleLogic.ts` — damage formulas, reaction pairs, turn flow (aligned with code)
 * - `src/app/simulation-system/page.tsx` — hub card copy for battle modules (kept in sync here)
 *
 * Run: npm run export:battle-simulation-xlsx
 * Output: `exports/battle-simulation-data.xlsx`
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

import {
  ELEMENT_CONFIG,
  ELEMENT_STRENGTH_CONFIG,
  REACTION_CONFIG,
  DEFAULT_PLAYER_STATS,
  DEFAULT_MONSTER_STATS,
  MP_CONFIG,
} from '../src/app/simulation-system/battle/types';
import { SKILLS } from '../src/app/simulation-system/battle/data/skills';
import { ELEMENT_REACTION_PAIR_MAP } from '../src/app/simulation-system/battle/core/battleLogic';
import type { Element, ReactionType } from '../src/app/simulation-system/battle/types';

type SheetRow = Record<string, string | number | boolean>;

function cellValue(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function flattenForSheet(obj: Record<string, unknown>, prefix = ''): SheetRow {
  const out: SheetRow = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      if (Array.isArray(v)) {
        out[key] = JSON.stringify(v);
      } else {
        Object.assign(out, flattenForSheet(v as Record<string, unknown>, key));
      }
    } else {
      out[key] = cellValue(v) as string | number | boolean;
    }
  }
  return out;
}

function rowsFromObjects(arr: object[]): SheetRow[] {
  return arr.map((item) => flattenForSheet(item as Record<string, unknown>));
}

function rowsFromRecord(record: Record<string, unknown>): SheetRow[] {
  return Object.entries(record).map(([id, value]) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return { id, ...flattenForSheet(value as Record<string, unknown>) };
    }
    return { id, value: cellValue(value) };
  });
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
  return cleaned || 'Sheet';
}

function appendSheet(wb: XLSX.WorkBook, rows: SheetRow[], sheetName: string): void {
  if (rows.length === 0) {
    const ws = XLSX.utils.json_to_sheet([{ _note: '(empty)' }]);
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName));
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName));
}

/** Same intent as `calculateDamage` in battleLogic.ts */
const BATTLE_RULES_FORMULAS: SheetRow[] = [
  {
    id: 'dmg_core',
    category: 'Damage',
    name: 'Final skill damage (main formula)',
    formula:
      'ceil( ATK * power * (ATK / (ATK + DEF)) * reactionMultiplier * extraMultiplier )',
    codeRef: 'battleLogic.ts → calculateDamage',
    notes: 'ATK/DEF are current attacker/defender values; power is skill multiplier; multiply then ceil.',
  },
  {
    id: 'dmg_def_ratio',
    category: 'Damage',
    name: 'Defense ratio term',
    formula: 'ATK / (ATK + DEF)',
    codeRef: 'battleLogic.ts → calculateDamage (defenseReduction)',
    notes: 'Multiplied with (ATK * power); higher ATK yields higher effective penetration.',
  },
  {
    id: 'rxn_mult',
    category: 'Reactions',
    name: 'Amplifying reactionMultiplier',
    formula: 'REACTION_CONFIG[reaction].multiplier if present, else 1',
    codeRef: 'battleLogic.ts → executeSkill',
    notes: 'Vaporize / Melt etc. use configured multiplier.',
  },
  {
    id: 'rxn_quicken_extra',
    category: 'Reactions',
    name: 'Quicken extraMultiplier',
    formula: 'If defender has quicken buff and attach is Thunder/Grass: 1 + buff.value; else 1',
    codeRef: 'battleLogic.ts → executeSkill',
    notes: 'Passed into calculateDamage together with reactionMultiplier.',
  },
  {
    id: 'rxn_pair_lookup',
    category: 'Reactions',
    name: 'Reaction resolution',
    formula: 'attackElement × defender.currentElement → ReactionType | null',
    codeRef: 'battleLogic.ts → ELEMENT_REACTION_PAIR_MAP / checkElementReaction',
    notes:
      'Only when skill has non-random attachElement and defender has an aura; see battle_reaction_pairs sheet.',
  },
  {
    id: 'rxn_config_extraDamage',
    category: 'Reactions',
    name: 'REACTION_CONFIG.extraDamage (transformative)',
    formula: 'Table stores ×ATK coefficient; code may use ceil(ATK*extraDamage) branch',
    codeRef: 'battleLogic.ts → executeSkill (with calculateDamage)',
    notes: 'Verify against current battleLogic; battle_reactions sheet lists multiplier/extraDamage.',
  },
  {
    id: 'heal_skill',
    category: 'Heal',
    name: 'specialEffect.heal',
    formula: 'ceil( attacker.ATK * specialEffect.value ), HP capped at maxHp',
    codeRef: 'battleLogic.ts → executeSkill',
    notes: 'Applied before damage resolution.',
  },
  {
    id: 'dot_turn_end',
    category: 'DOT',
    name: 'Burn tick per turn',
    formula: 'ceil( currentUnit.ATK * dot.damage ), reduce HP; decrement turns',
    codeRef: 'battleLogic.ts → processTurnEnd',
    notes: "Resolved on the afflicted unit's own turn end.",
  },
  {
    id: 'mp_skill',
    category: 'MP',
    name: 'Skill MP spend',
    formula: 'On cast: attacker.mp -= skill.mpCost',
    codeRef: 'battleLogic.ts → executeSkill',
    notes: '',
  },
  {
    id: 'mp_turn_regen',
    category: 'MP',
    name: 'MP regen at turn end',
    formula: 'unit.mp = min(maxMp, unit.mp + MP_CONFIG.mpPerTurn)',
    codeRef: 'battleLogic.ts → processTurnEnd',
    notes: 'Once per unit at end of that unit’s turn.',
  },
  {
    id: 'elem_attach_duration',
    category: 'Aura',
    name: 'Element aura duration',
    formula: 'Skill sets duration; each turn end remainingTurns -= 1, clear at 0',
    codeRef: 'battleLogic.ts → executeSkill / processTurnEnd',
    notes: '',
  },
  {
    id: 'freeze_control',
    category: 'Control',
    name: 'Freeze skips action',
    formula: 'processTurnStart: if control.type===freeze, unit skips acting this turn',
    codeRef: 'battleLogic.ts → processTurnStart',
    notes: 'Decrement remainingTurns in processTurnEnd.',
  },
  {
    id: 'skill_cd',
    category: 'Cooldown',
    name: 'Skill cooldown',
    formula: 'After cast: if maxCooldown>0 set cooldowns[skillId]=maxCooldown; each turn end decrement if >0',
    codeRef: 'battleLogic.ts → setSkillCooldown / reduceCooldowns',
    notes: '',
  },
  {
    id: 'battle_result',
    category: 'Outcome',
    name: 'Battle end',
    formula: 'Compare both HP to 0 → player_win / monster_win / draw',
    codeRef: 'battleLogic.ts → checkBattleResult',
    notes: '',
  },
];

const BATTLE_FLOW_EXECUTE_SKILL: SheetRow[] = [
  { step: 1, phase: 'executeSkill', action: 'Spend MP', detail: 'skill.mpCost; log mp_cost if >0' },
  { step: 2, phase: 'executeSkill', action: 'Heal branch', detail: 'If specialEffect.type===heal, heal by ATK×value' },
  {
    step: 3,
    phase: 'executeSkill',
    action: 'Damage branch',
    detail:
      'If power>0: resolve reaction → calculateDamage → subtract defender.hp → log damage / element_reaction',
  },
  { step: 4, phase: 'executeSkill', action: 'Apply aura', detail: 'attachElement: random picks element, else fixed' },
  { step: 5, phase: 'executeSkill', action: 'DOT', detail: 'skill.dot → defender.dot' },
  { step: 6, phase: 'executeSkill', action: 'Freeze', detail: 'crowdControl.type===freeze' },
  {
    step: 7,
    phase: 'executeSkill',
    action: 'Debuff',
    detail: 'specialEffect atk_debuff / def_debuff → defender.buffs',
  },
];

const BATTLE_FLOW_TURN_END: SheetRow[] = [
  { step: 1, phase: 'processTurnEnd', action: 'Resolve DOT', detail: 'See dot_turn_end row' },
  { step: 2, phase: 'processTurnEnd', action: 'Decay auras', detail: 'remainingTurns-1, clear at 0' },
  { step: 3, phase: 'processTurnEnd', action: 'Decay buffs', detail: 'Each buff turns -1, remove at 0' },
  { step: 4, phase: 'processTurnEnd', action: 'Decay control', detail: 'freeze turns -1, clear at 0' },
  { step: 5, phase: 'processTurnEnd', action: 'MP regen', detail: 'See mp_turn_regen row' },
];

function rowsFromReactionPairMap(
  map: Record<Element, Partial<Record<Element, ReactionType>>>
): SheetRow[] {
  const rows: SheetRow[] = [];
  for (const [attackElement, targets] of Object.entries(map) as [
    Element,
    Partial<Record<Element, ReactionType>>,
  ][]) {
    for (const [defenderElement, reaction] of Object.entries(targets)) {
      rows.push({
        attackElement,
        defenderElement,
        reaction: reaction as string,
      });
    }
  }
  return rows;
}

/** Matches `BATTLE_MODULES` in `src/app/simulation-system/page.tsx` (no React icon column). */
const UI_MAIN_BATTLE_MODULES: SheetRow[] = [
  {
    id: 'battle-simulator',
    name: 'Battle Simulator',
    nameEn: 'Battle Simulator',
    path: '/simulation-system/battle',
    description: 'Turn-based PVE battle simulation and difficulty checks',
    color: '#fa541c',
  },
];

const outDir = path.join(process.cwd(), 'exports');
const outFile = path.join(outDir, 'battle-simulation-data.xlsx');

const wb = XLSX.utils.book_new();

appendSheet(wb, BATTLE_RULES_FORMULAS, 'battle_rules_formulas');
appendSheet(wb, rowsFromReactionPairMap(ELEMENT_REACTION_PAIR_MAP), 'battle_reaction_pairs');
appendSheet(wb, BATTLE_FLOW_EXECUTE_SKILL, 'battle_flow_execute_skill');
appendSheet(wb, BATTLE_FLOW_TURN_END, 'battle_flow_turn_end');

appendSheet(wb, rowsFromRecord(ELEMENT_CONFIG as unknown as Record<string, unknown>), 'battle_elements');
appendSheet(
  wb,
  rowsFromRecord(ELEMENT_STRENGTH_CONFIG as unknown as Record<string, unknown>),
  'battle_element_strength'
);
appendSheet(wb, rowsFromRecord(REACTION_CONFIG as unknown as Record<string, unknown>), 'battle_reactions');
appendSheet(wb, rowsFromObjects(Object.values(SKILLS) as object[]), 'battle_skills');
appendSheet(wb, [flattenForSheet({ ...DEFAULT_PLAYER_STATS } as Record<string, unknown>)], 'battle_default_player');
appendSheet(wb, [flattenForSheet({ ...DEFAULT_MONSTER_STATS } as Record<string, unknown>)], 'battle_default_monster');
appendSheet(wb, [flattenForSheet({ ...MP_CONFIG } as Record<string, unknown>)], 'battle_mp_config');
appendSheet(wb, UI_MAIN_BATTLE_MODULES, 'ui_main_battle_modules');

fs.mkdirSync(outDir, { recursive: true });
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(outFile, buf);

// eslint-disable-next-line no-console -- CLI script
console.log(`Wrote: ${outFile}`);
