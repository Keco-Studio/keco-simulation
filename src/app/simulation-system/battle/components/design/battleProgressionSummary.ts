export type BattleProgressionSummaryInput = {
  progression: {
    level: number;
    exp: number;
    skillPoints: number;
  } | null | undefined;
  characterName?: string;
  nextNeed?: number | null;
};

export type BattleProgressionSummary = {
  title: string | null;
  tokens: Array<{ label: 'Lv' | 'EXP' | 'SP'; value: string }>;
};

export function buildBattleProgressionSummary(
  input: BattleProgressionSummaryInput,
): BattleProgressionSummary | null {
  const { progression } = input;
  if (!progression) return null;

  const expValue =
    input.nextNeed != null
      ? `${progression.exp} / ${input.nextNeed}`
      : String(progression.exp);

  return {
    title: input.characterName?.trim() || null,
    tokens: [
      { label: 'Lv', value: String(progression.level) },
      { label: 'EXP', value: expValue },
      { label: 'SP', value: String(progression.skillPoints) },
    ],
  };
}
