# 付出与反馈机制（成长/反馈模拟器）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `keco-simulation` 中实现一个通用「付出→反馈」引擎及配套模拟页面，让策划用表格+公式配置任意"投入X→收获Y"机制。

**Architecture:** 纯函数流水线 `Contribution → 规则引擎 → RewardGrant → 轨道策略 → Snapshot`。核心引擎位于 `src/lib/progression/`（无 React/无战斗包依赖），UI 位于 `src/app/simulation-system/progression/`。公式用 mathjs `evaluate(expr, scope)` 直接求值（平面作用域，支持 `^`/比较运算，比列导向的 formula.ts 更合适）。

**Tech Stack:** TypeScript、mathjs（已有依赖）、antd v5、echarts（已有）、vitest（新增 devDependency，仅测纯逻辑）、localStorage 持久化。

**对 spec 的实现决策（已确认偏离）:**
1. 规则公式不复用 `studio-lib/.../formula.ts`（列/行导向且简单解析器不支持 `^`），改用 mathjs `evaluate` + 平面 scope。更简单、更强、更安全。
2. 规则/轨道/输入剖面统一存 localStorage（自洽存储模块），不接 `simLocalTables` 的 IndexedDB schema（其与 skill/unit 强耦合）。XLSX 导入导出用已有 `xlsx` 依赖在规则 Tab 内实现。

---

## 文件结构

```
src/lib/progression/
  types.ts                 # 全部接口与类型
  formulaAdapter.ts        # mathjs evaluate 封装：求值 + 布尔过滤 + 语法校验
  templateRoute.ts         # targetTrackId 模板解析（prof_{skillId}）
  tracks/
    index.ts               # TRACK_STRATEGIES 注册表 + initTrackState
    expLevel.ts
    proficiency.ts
    milestone.ts
    rateAccrual.ts
  ruleEngine.ts            # 单个 Contribution → RewardGrant[]
  simulate.ts              # 主引擎纯函数 simulate(config, contributions)
  sources/
    syntheticSource.ts     # 行为剖面 → Contribution[]
  defaults.ts              # 三个示例的默认 config + 默认剖面
  __tests__/
    formulaAdapter.test.ts
    tracks.test.ts
    ruleEngine.test.ts
    simulate.test.ts
    syntheticSource.test.ts

src/app/simulation-system/progression/
  layout.tsx
  page.tsx                 # 'use client' 三 Tab 容器
  Progression.module.css
  lib/progressionStorage.ts
  components/
    TracksTab.tsx
    RulesTab.tsx
    SimulateTab.tsx
    ProgressionCharts.tsx

src/app/simulation-system/page.tsx   # 修改：加 hub 入口卡片
vitest.config.ts                      # 新增
package.json                          # 新增 devDeps + test 脚本
```

---

## Task 0: 安装 vitest 测试框架

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 安装 vitest**

Run（在 `keco-simulation` 目录）:
```bash
npm install -D vitest@^2.1.0
```
Expected: `package.json` devDependencies 出现 `vitest`。

- [ ] **Step 2: 添加 test 脚本**

修改 `package.json` 的 `scripts`，新增：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: 创建 vitest 配置**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: 冒烟验证**

Run: `npx vitest run --reporter=dot`
Expected: 退出码 0，提示 "No test files found"（此时还没测试文件，正常）。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for progression engine tests"
```

---

## Task 1: 核心类型定义

**Files:**
- Create: `src/lib/progression/types.ts`

- [ ] **Step 1: 写类型文件**

Create `src/lib/progression/types.ts`:
```typescript
export type TrackKind = 'exp_level' | 'proficiency' | 'milestone' | 'rate_accrual';

export interface Contribution {
  type: string;
  amount: number;
  ctx: Record<string, number | string>;
  step: number;
}

export interface Rule {
  id: string;
  enabled: boolean;
  whenType: string;
  filter?: string;
  targetTrackId: string;
  rewardFormula: string;
}

export interface ExpLevelParams {
  baseExp: number;
  growthFactor: number;
  model: 'logarithmic' | 'sqrt' | 'linear' | 'exponential';
  maxLevel: number;
}
export interface ProficiencyTier { threshold: number; label: string; }
export interface ProficiencyParams { tiers: ProficiencyTier[]; }
export interface MilestoneDef { at: number; reward: string; }
export interface MilestoneParams { milestones: MilestoneDef[]; }
export interface RateAccrualParams { ratePerUnit: number; cap: number | null; }

export type TrackParams =
  | ExpLevelParams
  | ProficiencyParams
  | MilestoneParams
  | RateAccrualParams;

export interface TrackDef {
  id: string;
  kind: TrackKind;
  label: string;
  params: TrackParams;
}

export interface TrackState {
  id: string;
  total: number;
  level: number;
  progressToNext: number;
  unlockedRewards: string[];
}

export interface RewardGrant {
  trackId: string;
  amount: number;
  ruleId: string;
}

export interface ProgressionConfig {
  tracks: TrackDef[];
  rules: Rule[];
}

export interface Snapshot {
  step: number;
  tracks: Record<string, TrackState>;
  grantsThisStep: RewardGrant[];
}

export interface TrackStrategy {
  kind: TrackKind;
  init(def: TrackDef): TrackState;
  accrue(state: TrackState, amount: number, def: TrackDef): TrackState;
}
```

- [ ] **Step 2: 类型编译验证**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无与 `types.ts` 相关的错误。

- [ ] **Step 3: Commit**

```bash
git add src/lib/progression/types.ts
git commit -m "feat(progression): add core types"
```

---

## Task 2: 公式适配器（mathjs）

**Files:**
- Create: `src/lib/progression/formulaAdapter.ts`
- Test: `src/lib/progression/__tests__/formulaAdapter.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/progression/__tests__/formulaAdapter.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { evalNumber, evalBoolean, isValidFormula } from '../formulaAdapter';

describe('evalNumber', () => {
  it('evaluates arithmetic with scope vars', () => {
    expect(evalNumber('amount*0.1 + enemyLevel*5', { amount: 1200, enemyLevel: 30 })).toBe(270);
  });
  it('supports power operator', () => {
    expect(evalNumber('50 * level^1.5', { level: 4 })).toBe(400);
  });
  it('returns 0 for invalid expression', () => {
    expect(evalNumber('amount +', { amount: 1 })).toBe(0);
  });
  it('treats missing vars as 0', () => {
    expect(evalNumber('amount + bonus', { amount: 5 })).toBe(5);
  });
});

describe('evalBoolean', () => {
  it('evaluates comparison', () => {
    expect(evalBoolean('enemyLevel >= 20', { enemyLevel: 30 })).toBe(true);
    expect(evalBoolean('enemyLevel >= 20', { enemyLevel: 10 })).toBe(false);
  });
  it('empty filter is true', () => {
    expect(evalBoolean('', {})).toBe(true);
    expect(evalBoolean(undefined, {})).toBe(true);
  });
  it('supports and/or', () => {
    expect(evalBoolean('enemyLevel >= 20 and isBoss == 1', { enemyLevel: 30, isBoss: 1 })).toBe(true);
  });
});

describe('isValidFormula', () => {
  it('valid', () => expect(isValidFormula('amount*0.1')).toBe(true));
  it('invalid', () => expect(isValidFormula('amount *')).toBe(false));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/progression/__tests__/formulaAdapter.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 formulaAdapter**

Create `src/lib/progression/formulaAdapter.ts`:
```typescript
import { evaluate, parse } from 'mathjs';

type Scope = Record<string, number | string>;

function toNumericScope(scope: Scope): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scope)) {
    const n = typeof v === 'number' ? v : Number(v);
    out[k] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

/** Free variables referenced by an expression, so missing ones default to 0. */
function freeSymbols(expr: string): string[] {
  const names = new Set<string>();
  parse(expr).traverse((node: { type: string; name?: string }) => {
    if (node.type === 'SymbolNode' && node.name) names.add(node.name);
  });
  return Array.from(names);
}

export function evalNumber(expr: string, scope: Scope): number {
  if (!expr || !expr.trim()) return 0;
  try {
    const numeric = toNumericScope(scope);
    for (const sym of freeSymbols(expr)) {
      if (!(sym in numeric)) numeric[sym] = 0;
    }
    const result = evaluate(expr, numeric);
    const n = Number(result);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function evalBoolean(expr: string | undefined, scope: Scope): boolean {
  if (!expr || !expr.trim()) return true;
  try {
    const numeric = toNumericScope(scope);
    for (const sym of freeSymbols(expr)) {
      if (!(sym in numeric)) numeric[sym] = 0;
    }
    return Boolean(evaluate(expr, numeric));
  } catch {
    return false;
  }
}

export function isValidFormula(expr: string | undefined): boolean {
  if (!expr || !expr.trim()) return false;
  try {
    parse(expr);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/progression/__tests__/formulaAdapter.test.ts`
Expected: PASS（全部用例）。

注意：若 `50 * level^1.5` 在 mathjs 中 `^` 为幂运算，`4^1.5 = 8`，`50*8 = 400`，与断言一致。

- [ ] **Step 5: Commit**

```bash
git add src/lib/progression/formulaAdapter.ts src/lib/progression/__tests__/formulaAdapter.test.ts
git commit -m "feat(progression): mathjs formula adapter with scope vars"
```

---

## Task 3: 模板路由解析

**Files:**
- Create: `src/lib/progression/templateRoute.ts`
- Test: 并入 `ruleEngine.test.ts`（Task 5），此处仅做内联导出

- [ ] **Step 1: 实现模板解析**

Create `src/lib/progression/templateRoute.ts`:
```typescript
import type { Contribution } from './types';

/** Resolve "prof_{skillId}" against contribution ctx → "prof_fireball". */
export function resolveTrackId(template: string, contribution: Contribution): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => {
    const v = contribution.ctx[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** True when the id still contains an unresolved placeholder. */
export function isTemplateId(id: string): boolean {
  return /\{[A-Za-z0-9_]+\}/.test(id);
}
```

- [ ] **Step 2: 类型编译验证**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无 `templateRoute.ts` 相关错误。

- [ ] **Step 3: Commit**

```bash
git add src/lib/progression/templateRoute.ts
git commit -m "feat(progression): template route resolver"
```

---

## Task 4: 四种轨道策略

**Files:**
- Create: `src/lib/progression/tracks/expLevel.ts`, `proficiency.ts`, `milestone.ts`, `rateAccrual.ts`, `index.ts`
- Test: `src/lib/progression/__tests__/tracks.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/progression/__tests__/tracks.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { TRACK_STRATEGIES, initTrackState } from '../tracks';
import type { TrackDef } from '../types';

const expDef: TrackDef = {
  id: 'char_exp', kind: 'exp_level', label: 'EXP',
  params: { baseExp: 100, growthFactor: 1.5, model: 'linear', maxLevel: 100 },
};
const profDef: TrackDef = {
  id: 'prof_fireball', kind: 'proficiency', label: 'Fireball',
  params: { tiers: [{ threshold: 0, label: '生疏' }, { threshold: 100, label: '熟练' }, { threshold: 500, label: '精通' }] },
};
const mileDef: TrackDef = {
  id: 'damage_total', kind: 'milestone', label: 'Damage',
  params: { milestones: [{ at: 1000, reward: 'title_a' }, { at: 5000, reward: 'title_b' }] },
};
const rateDef: TrackDef = {
  id: 'idle', kind: 'rate_accrual', label: 'Idle',
  params: { ratePerUnit: 2, cap: 1000 },
};

describe('exp_level', () => {
  it('accrues and computes level via linear model', () => {
    const s = TRACK_STRATEGIES.exp_level.accrue(initTrackState(expDef), 250, expDef);
    expect(s.total).toBe(250);
    expect(s.level).toBe(3); // 100+100+100 <= 250 < 400 → level 3 (lvl1 at 0)
    expect(s.progressToNext).toBeGreaterThan(0);
  });
});

describe('proficiency', () => {
  it('lands on tier by threshold', () => {
    let s = initTrackState(profDef);
    s = TRACK_STRATEGIES.proficiency.accrue(s, 120, profDef);
    expect(s.total).toBe(120);
    expect(s.level).toBe(2); // 熟练 (index 1) → level 2
  });
});

describe('milestone', () => {
  it('unlocks rewards once when crossing', () => {
    let s = initTrackState(mileDef);
    s = TRACK_STRATEGIES.milestone.accrue(s, 1200, mileDef);
    expect(s.unlockedRewards).toEqual(['title_a']);
    s = TRACK_STRATEGIES.milestone.accrue(s, 4000, mileDef);
    expect(s.unlockedRewards).toEqual(['title_a', 'title_b']);
    s = TRACK_STRATEGIES.milestone.accrue(s, 1, mileDef);
    expect(s.unlockedRewards).toEqual(['title_a', 'title_b']); // no dup
  });
});

describe('rate_accrual', () => {
  it('accrues with cap', () => {
    let s = initTrackState(rateDef);
    s = TRACK_STRATEGIES.rate_accrual.accrue(s, 100, rateDef); // 100*2=200
    expect(s.total).toBe(200);
    s = TRACK_STRATEGIES.rate_accrual.accrue(s, 1000, rateDef); // would be 2200, capped 1000
    expect(s.total).toBe(1000);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/progression/__tests__/tracks.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 expLevel**

Create `src/lib/progression/tracks/expLevel.ts`:
```typescript
import type { TrackStrategy, TrackDef, TrackState, ExpLevelParams } from '../types';

function expForLevel(level: number, p: ExpLevelParams): number {
  const n = level - 1;
  if (n <= 0) return 0;
  switch (p.model) {
    case 'linear': return p.baseExp * n;
    case 'sqrt': return Math.round(p.baseExp * Math.pow(n, 0.5) * p.growthFactor);
    case 'logarithmic': return Math.round(p.baseExp * Math.log2(n + 1) * p.growthFactor);
    case 'exponential': return Math.round(p.baseExp * Math.pow(p.growthFactor, n));
    default: return p.baseExp * n;
  }
}

export const expLevelStrategy: TrackStrategy = {
  kind: 'exp_level',
  init: (def: TrackDef): TrackState => ({
    id: def.id, total: 0, level: 1, progressToNext: 0, unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const p = def.params as ExpLevelParams;
    const total = state.total + amount;
    let level = 1;
    while (level < p.maxLevel && expForLevel(level + 1, p) <= total) level += 1;
    const curr = expForLevel(level, p);
    const next = expForLevel(level + 1, p);
    const progressToNext = level >= p.maxLevel || next <= curr
      ? 1
      : Math.min(1, Math.max(0, (total - curr) / (next - curr)));
    return { ...state, total, level, progressToNext };
  },
};
```

- [ ] **Step 4: 实现 proficiency**

Create `src/lib/progression/tracks/proficiency.ts`:
```typescript
import type { TrackStrategy, TrackDef, TrackState, ProficiencyParams } from '../types';

export const proficiencyStrategy: TrackStrategy = {
  kind: 'proficiency',
  init: (def: TrackDef): TrackState => ({
    id: def.id, total: 0, level: 1, progressToNext: 0, unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const tiers = [...(def.params as ProficiencyParams).tiers].sort((a, b) => a.threshold - b.threshold);
    const total = state.total + amount;
    let idx = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (total >= tiers[i].threshold) idx = i;
    }
    const next = tiers[idx + 1];
    const curr = tiers[idx];
    const progressToNext = next
      ? Math.min(1, Math.max(0, (total - curr.threshold) / (next.threshold - curr.threshold)))
      : 1;
    return { ...state, total, level: idx + 1, progressToNext };
  },
};
```

- [ ] **Step 5: 实现 milestone**

Create `src/lib/progression/tracks/milestone.ts`:
```typescript
import type { TrackStrategy, TrackDef, TrackState, MilestoneParams } from '../types';

export const milestoneStrategy: TrackStrategy = {
  kind: 'milestone',
  init: (def: TrackDef): TrackState => ({
    id: def.id, total: 0, level: 0, progressToNext: 0, unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const milestones = [...(def.params as MilestoneParams).milestones].sort((a, b) => a.at - b.at);
    const total = state.total + amount;
    const unlocked = [...state.unlockedRewards];
    let level = state.level;
    for (const m of milestones) {
      if (total >= m.at && !unlocked.includes(m.reward)) {
        unlocked.push(m.reward);
        level += 1;
      }
    }
    const nextMilestone = milestones.find((m) => total < m.at);
    const progressToNext = nextMilestone ? Math.min(1, total / nextMilestone.at) : 1;
    return { ...state, total, level, progressToNext, unlockedRewards: unlocked };
  },
};
```

- [ ] **Step 6: 实现 rateAccrual**

Create `src/lib/progression/tracks/rateAccrual.ts`:
```typescript
import type { TrackStrategy, TrackDef, TrackState, RateAccrualParams } from '../types';

export const rateAccrualStrategy: TrackStrategy = {
  kind: 'rate_accrual',
  init: (def: TrackDef): TrackState => ({
    id: def.id, total: 0, level: 0, progressToNext: 0, unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const p = def.params as RateAccrualParams;
    let total = state.total + amount * p.ratePerUnit;
    if (p.cap !== null && total > p.cap) total = p.cap;
    const progressToNext = p.cap && p.cap > 0 ? Math.min(1, total / p.cap) : 0;
    return { ...state, total, progressToNext };
  },
};
```

- [ ] **Step 7: 实现注册表 index**

Create `src/lib/progression/tracks/index.ts`:
```typescript
import type { TrackKind, TrackStrategy, TrackDef, TrackState } from '../types';
import { expLevelStrategy } from './expLevel';
import { proficiencyStrategy } from './proficiency';
import { milestoneStrategy } from './milestone';
import { rateAccrualStrategy } from './rateAccrual';

export const TRACK_STRATEGIES: Record<TrackKind, TrackStrategy> = {
  exp_level: expLevelStrategy,
  proficiency: proficiencyStrategy,
  milestone: milestoneStrategy,
  rate_accrual: rateAccrualStrategy,
};

export function initTrackState(def: TrackDef): TrackState {
  return TRACK_STRATEGIES[def.kind].init(def);
}
```

- [ ] **Step 8: 运行测试确认通过**

Run: `npx vitest run src/lib/progression/__tests__/tracks.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 9: Commit**

```bash
git add src/lib/progression/tracks src/lib/progression/__tests__/tracks.test.ts
git commit -m "feat(progression): four track strategies"
```

---

## Task 5: 规则引擎

**Files:**
- Create: `src/lib/progression/ruleEngine.ts`
- Test: `src/lib/progression/__tests__/ruleEngine.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/progression/__tests__/ruleEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { applyRules } from '../ruleEngine';
import type { Rule, Contribution } from '../types';

const dmg: Contribution = { type: 'deal_damage', amount: 1000, ctx: { enemyLevel: 30, skillId: 'fireball' }, step: 0 };

describe('applyRules', () => {
  it('matches type and evaluates reward formula', () => {
    const rules: Rule[] = [{ id: 'r1', enabled: true, whenType: 'deal_damage', targetTrackId: 'char_exp', rewardFormula: 'amount*0.1 + enemyLevel*5' }];
    expect(applyRules(dmg, rules)).toEqual([{ trackId: 'char_exp', amount: 250, ruleId: 'r1' }]);
  });
  it('skips disabled and non-matching', () => {
    const rules: Rule[] = [
      { id: 'r1', enabled: false, whenType: 'deal_damage', targetTrackId: 'x', rewardFormula: '1' },
      { id: 'r2', enabled: true, whenType: 'kill_enemy', targetTrackId: 'x', rewardFormula: '1' },
    ];
    expect(applyRules(dmg, rules)).toEqual([]);
  });
  it('applies filter', () => {
    const rules: Rule[] = [{ id: 'r1', enabled: true, whenType: 'deal_damage', filter: 'enemyLevel >= 50', targetTrackId: 'x', rewardFormula: '1' }];
    expect(applyRules(dmg, rules)).toEqual([]);
  });
  it('resolves template track id from ctx', () => {
    const rules: Rule[] = [{ id: 'r1', enabled: true, whenType: 'deal_damage', targetTrackId: 'prof_{skillId}', rewardFormula: 'amount*0.05' }];
    expect(applyRules(dmg, rules)).toEqual([{ trackId: 'prof_fireball', amount: 50, ruleId: 'r1' }]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/progression/__tests__/ruleEngine.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 ruleEngine**

Create `src/lib/progression/ruleEngine.ts`:
```typescript
import type { Rule, Contribution, RewardGrant } from './types';
import { evalNumber, evalBoolean } from './formulaAdapter';
import { resolveTrackId } from './templateRoute';

export function applyRules(contribution: Contribution, rules: Rule[]): RewardGrant[] {
  const scope = { amount: contribution.amount, ...contribution.ctx };
  const grants: RewardGrant[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.whenType !== contribution.type) continue;
    if (!evalBoolean(rule.filter, scope)) continue;
    const trackId = resolveTrackId(rule.targetTrackId, contribution);
    if (!trackId) continue;
    const amount = evalNumber(rule.rewardFormula, scope);
    if (!Number.isFinite(amount) || amount === 0) continue;
    grants.push({ trackId, amount, ruleId: rule.id });
  }
  return grants;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/progression/__tests__/ruleEngine.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/progression/ruleEngine.ts src/lib/progression/__tests__/ruleEngine.test.ts
git commit -m "feat(progression): rule engine with filter + template routing"
```

---

## Task 6: 主引擎 simulate

**Files:**
- Create: `src/lib/progression/simulate.ts`
- Test: `src/lib/progression/__tests__/simulate.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/progression/__tests__/simulate.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { simulate } from '../simulate';
import type { ProgressionConfig, Contribution } from '../types';

const config: ProgressionConfig = {
  tracks: [
    { id: 'char_exp', kind: 'exp_level', label: 'EXP', params: { baseExp: 100, growthFactor: 1.5, model: 'linear', maxLevel: 100 } },
    { id: 'prof_{skillId}', kind: 'proficiency', label: 'Skill prof', params: { tiers: [{ threshold: 0, label: '生疏' }, { threshold: 100, label: '熟练' }] } },
  ],
  rules: [
    { id: 'exp', enabled: true, whenType: 'deal_damage', targetTrackId: 'char_exp', rewardFormula: 'amount*0.1' },
    { id: 'prof', enabled: true, whenType: 'deal_damage', targetTrackId: 'prof_{skillId}', rewardFormula: 'amount*0.05' },
  ],
};
const contributions: Contribution[] = [
  { type: 'deal_damage', amount: 1000, ctx: { skillId: 'fireball' }, step: 0 },
  { type: 'deal_damage', amount: 1000, ctx: { skillId: 'fireball' }, step: 1 },
];

describe('simulate', () => {
  it('produces one snapshot per step and accumulates', () => {
    const snaps = simulate(config, contributions);
    expect(snaps).toHaveLength(2);
    expect(snaps[1].tracks['char_exp'].total).toBe(200);
    expect(snaps[1].tracks['prof_fireball'].total).toBe(100);
  });
  it('is deterministic (same input → same output)', () => {
    expect(simulate(config, contributions)).toEqual(simulate(config, contributions));
  });
  it('lazily creates template-routed tracks', () => {
    const snaps = simulate(config, contributions);
    expect(snaps[0].tracks['prof_fireball']).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/progression/__tests__/simulate.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 simulate**

Create `src/lib/progression/simulate.ts`:
```typescript
import type { ProgressionConfig, Contribution, Snapshot, TrackState, TrackDef } from './types';
import { applyRules } from './ruleEngine';
import { TRACK_STRATEGIES, initTrackState } from './tracks';
import { isTemplateId } from './templateRoute';

function cloneState(s: TrackState): TrackState {
  return { ...s, unlockedRewards: [...s.unlockedRewards] };
}

export function simulate(config: ProgressionConfig, contributions: Contribution[]): Snapshot[] {
  // Concrete (non-template) track defs become live state immediately.
  const concreteDefs = config.tracks.filter((d) => !isTemplateId(d.id));
  const templateDefs = config.tracks.filter((d) => isTemplateId(d.id));

  const states = new Map<string, TrackState>();
  const defById = new Map<string, TrackDef>();
  for (const def of concreteDefs) {
    states.set(def.id, initTrackState(def));
    defById.set(def.id, def);
  }

  // Match a resolved trackId back to the template def that spawned it.
  const matchTemplate = (trackId: string): TrackDef | undefined => {
    for (const tpl of templateDefs) {
      const prefix = tpl.id.split('{')[0];
      if (trackId.startsWith(prefix)) {
        return { ...tpl, id: trackId };
      }
    }
    return undefined;
  };

  const sorted = [...contributions].sort((a, b) => a.step - b.step);
  const snapshots: Snapshot[] = [];
  let currentStep: number | null = null;
  let grantsThisStep: Snapshot['grantsThisStep'] = [];

  const flush = (step: number) => {
    const tracks: Record<string, TrackState> = {};
    for (const [id, st] of states) tracks[id] = cloneState(st);
    snapshots.push({ step, tracks, grantsThisStep });
    grantsThisStep = [];
  };

  for (const c of sorted) {
    if (currentStep === null) currentStep = c.step;
    if (c.step !== currentStep) {
      flush(currentStep);
      currentStep = c.step;
    }
    const grants = applyRules(c, config.rules);
    for (const g of grants) {
      let def = defById.get(g.trackId);
      if (!def) {
        def = matchTemplate(g.trackId);
        if (!def) continue;
        defById.set(g.trackId, def);
        states.set(g.trackId, initTrackState(def));
      }
      const strategy = TRACK_STRATEGIES[def.kind];
      states.set(g.trackId, strategy.accrue(states.get(g.trackId)!, g.amount, def));
      grantsThisStep.push(g);
    }
  }
  if (currentStep !== null) flush(currentStep);
  return snapshots;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/progression/__tests__/simulate.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/progression/simulate.ts src/lib/progression/__tests__/simulate.test.ts
git commit -m "feat(progression): deterministic simulate engine"
```

---

## Task 7: 合成事件源 + 默认配置

**Files:**
- Create: `src/lib/progression/sources/syntheticSource.ts`
- Create: `src/lib/progression/defaults.ts`
- Test: `src/lib/progression/__tests__/syntheticSource.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/progression/__tests__/syntheticSource.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateSyntheticContributions } from '../sources/syntheticSource';
import type { BehaviorProfile } from '../sources/syntheticSource';

const profile: BehaviorProfile = {
  steps: 2,
  perStep: [
    { type: 'deal_damage', amount: 5000, ctx: { skillId: 'fireball' } },
    { type: 'time_elapsed', amount: 1800, ctx: {} },
  ],
};

describe('generateSyntheticContributions', () => {
  it('expands profile across steps with step index', () => {
    const out = generateSyntheticContributions(profile);
    expect(out).toHaveLength(4);
    expect(out[0].step).toBe(0);
    expect(out[2].step).toBe(1);
    expect(out[0].type).toBe('deal_damage');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/progression/__tests__/syntheticSource.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 syntheticSource**

Create `src/lib/progression/sources/syntheticSource.ts`:
```typescript
import type { Contribution } from '../types';

export interface PerStepContribution {
  type: string;
  amount: number;
  ctx: Record<string, number | string>;
}

export interface BehaviorProfile {
  steps: number;
  perStep: PerStepContribution[];
}

export function generateSyntheticContributions(profile: BehaviorProfile): Contribution[] {
  const out: Contribution[] = [];
  for (let step = 0; step < profile.steps; step++) {
    for (const item of profile.perStep) {
      out.push({ type: item.type, amount: item.amount, ctx: { ...item.ctx }, step });
    }
  }
  return out;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/progression/__tests__/syntheticSource.test.ts`
Expected: PASS。

- [ ] **Step 5: 创建默认配置（三个示例）**

Create `src/lib/progression/defaults.ts`:
```typescript
import type { ProgressionConfig } from './types';
import type { BehaviorProfile } from './sources/syntheticSource';

export const DEFAULT_CONFIG: ProgressionConfig = {
  tracks: [
    { id: 'char_exp', kind: 'exp_level', label: '角色经验', params: { baseExp: 100, growthFactor: 1.08, model: 'logarithmic', maxLevel: 100 } },
    { id: 'prof_{skillId}', kind: 'proficiency', label: '技能熟练度', params: { tiers: [{ threshold: 0, label: '生疏' }, { threshold: 100, label: '熟练' }, { threshold: 500, label: '精通' }, { threshold: 2000, label: '大师' }] } },
    { id: 'idle_reward', kind: 'rate_accrual', label: '挂机产出', params: { ratePerUnit: 0.5, cap: 50000 } },
    { id: 'playtime_milestone', kind: 'milestone', label: '时长里程碑', params: { milestones: [{ at: 3600, reward: '1小时奖励' }, { at: 86400, reward: '24小时奖励' }] } },
  ],
  rules: [
    { id: 'exp_from_damage', enabled: true, whenType: 'deal_damage', targetTrackId: 'char_exp', rewardFormula: 'amount*0.1 + enemyLevel*5' },
    { id: 'exp_from_kill', enabled: true, whenType: 'kill_enemy', targetTrackId: 'char_exp', rewardFormula: 'enemyLevel*20' },
    { id: 'prof_from_cast', enabled: true, whenType: 'cast_skill', targetTrackId: 'prof_{skillId}', rewardFormula: '10' },
    { id: 'prof_from_damage', enabled: true, whenType: 'deal_damage', targetTrackId: 'prof_{skillId}', rewardFormula: 'amount*0.02' },
    { id: 'idle_from_time', enabled: true, whenType: 'time_elapsed', targetTrackId: 'idle_reward', rewardFormula: 'amount' },
    { id: 'milestone_from_time', enabled: true, whenType: 'time_elapsed', targetTrackId: 'playtime_milestone', rewardFormula: 'amount' },
  ],
};

export const DEFAULT_PROFILE: BehaviorProfile = {
  steps: 30,
  perStep: [
    { type: 'deal_damage', amount: 5000, ctx: { enemyLevel: 30, skillId: 'fireball' } },
    { type: 'kill_enemy', amount: 8, ctx: { enemyLevel: 30 } },
    { type: 'cast_skill', amount: 12, ctx: { skillId: 'fireball' } },
    { type: 'time_elapsed', amount: 1800, ctx: {} },
  ],
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/progression/sources src/lib/progression/defaults.ts src/lib/progression/__tests__/syntheticSource.test.ts
git commit -m "feat(progression): synthetic source + default example config"
```

---

## Task 8: localStorage 持久化

**Files:**
- Create: `src/app/simulation-system/progression/lib/progressionStorage.ts`

- [ ] **Step 1: 实现存储模块**

Create `src/app/simulation-system/progression/lib/progressionStorage.ts`:
```typescript
import type { ProgressionConfig } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { DEFAULT_CONFIG, DEFAULT_PROFILE } from '@/lib/progression/defaults';

const STORAGE_KEY = 'keco-sim:progression:v1';

interface PersistedState {
  version: 1;
  config: ProgressionConfig;
  profile: BehaviorProfile;
}

export function readProgressionState(): { config: ProgressionConfig; profile: BehaviorProfile } {
  if (typeof window === 'undefined') return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1 || !parsed.config || !parsed.profile) {
      return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
    }
    return { config: parsed.config, profile: parsed.profile };
  } catch {
    return { config: DEFAULT_CONFIG, profile: DEFAULT_PROFILE };
  }
}

export function writeProgressionState(config: ProgressionConfig, profile: BehaviorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedState = { version: 1, config, profile };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}
```

注意：需确认 `@/` alias 指向 `src/`。若 `tsconfig.json` 的 paths 不是 `@/*`，改用相对路径 `../../../../lib/progression/...`。先读 `tsconfig.json` 确认。

- [ ] **Step 2: 类型编译验证**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无该文件相关错误。

- [ ] **Step 3: Commit**

```bash
git add src/app/simulation-system/progression/lib/progressionStorage.ts
git commit -m "feat(progression): localStorage persistence"
```

---

## Task 9: 图表组件

**Files:**
- Create: `src/app/simulation-system/progression/components/ProgressionCharts.tsx`

- [ ] **Step 1: 实现 ECharts 组件**

Create `src/app/simulation-system/progression/components/ProgressionCharts.tsx`:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { Snapshot } from '@/lib/progression/types';

interface Props {
  snapshots: Snapshot[];
}

export default function ProgressionCharts({ snapshots }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const steps = snapshots.map((s) => s.step);
    const trackIds = snapshots.length
      ? Object.keys(snapshots[snapshots.length - 1].tracks)
      : [];
    const series = trackIds.map((id) => ({
      name: id,
      type: 'line' as const,
      smooth: true,
      data: snapshots.map((s) => s.tracks[id]?.total ?? 0),
    }));
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: trackIds, type: 'scroll' },
      grid: { left: 48, right: 24, top: 48, bottom: 40 },
      xAxis: { type: 'category', data: steps, name: 'step' },
      yAxis: { type: 'value', name: '累计' },
      series,
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [snapshots]);

  return <div ref={ref} style={{ width: '100%', height: 360 }} />;
}
```

- [ ] **Step 2: 类型编译验证**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无该文件相关错误。

- [ ] **Step 3: Commit**

```bash
git add src/app/simulation-system/progression/components/ProgressionCharts.tsx
git commit -m "feat(progression): echarts cumulative chart"
```

---

## Task 10: 三个 Tab 组件

**Files:**
- Create: `src/app/simulation-system/progression/components/TracksTab.tsx`
- Create: `src/app/simulation-system/progression/components/RulesTab.tsx`
- Create: `src/app/simulation-system/progression/components/SimulateTab.tsx`

- [ ] **Step 1: 实现 RulesTab（含公式校验 + XLSX 导入导出）**

Create `src/app/simulation-system/progression/components/RulesTab.tsx`:
```typescript
'use client';

import { Table, Input, Switch, Button, Space, Upload, message } from 'antd';
import { PlusOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import type { Rule } from '@/lib/progression/types';
import { isValidFormula } from '@/lib/progression/formulaAdapter';

interface Props {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

export default function RulesTab({ rules, onChange }: Props) {
  const update = (id: string, patch: Partial<Rule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () =>
    onChange([
      ...rules,
      { id: `rule_${Date.now()}`, enabled: true, whenType: 'deal_damage', targetTrackId: '', rewardFormula: '' },
    ]);

  const removeRule = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(rules);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'rules');
    XLSX.writeFile(wb, 'progression-rules.xlsx');
  };

  const importXlsx = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const imported: Rule[] = rows.map((row, i) => ({
          id: String(row.id ?? `rule_${Date.now()}_${i}`),
          enabled: row.enabled === true || row.enabled === 'true' || row.enabled === 1,
          whenType: String(row.whenType ?? ''),
          filter: row.filter ? String(row.filter) : undefined,
          targetTrackId: String(row.targetTrackId ?? ''),
          rewardFormula: String(row.rewardFormula ?? ''),
        }));
        onChange(imported);
        message.success(`导入 ${imported.length} 条规则`);
      } catch {
        message.error('导入失败：文件格式不正确');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const columns: ColumnsType<Rule> = [
    {
      title: '启用', dataIndex: 'enabled', width: 70,
      render: (_, r) => <Switch size="small" checked={r.enabled} onChange={(v) => update(r.id, { enabled: v })} />,
    },
    {
      title: '触发事件 (whenType)', dataIndex: 'whenType', width: 160,
      render: (_, r) => <Input value={r.whenType} onChange={(e) => update(r.id, { whenType: e.target.value })} />,
    },
    {
      title: '过滤条件 (filter)', dataIndex: 'filter', width: 180,
      render: (_, r) => <Input placeholder="可选, 如 enemyLevel >= 20" value={r.filter} onChange={(e) => update(r.id, { filter: e.target.value })} />,
    },
    {
      title: '目标轨道 (targetTrackId)', dataIndex: 'targetTrackId', width: 180,
      render: (_, r) => <Input placeholder="prof_{skillId}" value={r.targetTrackId} onChange={(e) => update(r.id, { targetTrackId: e.target.value })} />,
    },
    {
      title: '奖励公式 (rewardFormula)', dataIndex: 'rewardFormula',
      render: (_, r) => (
        <Input
          status={r.rewardFormula && !isValidFormula(r.rewardFormula) ? 'error' : undefined}
          placeholder="amount*0.1 + enemyLevel*5"
          value={r.rewardFormula}
          onChange={(e) => update(r.id, { rewardFormula: e.target.value })}
        />
      ),
    },
    {
      title: '', width: 50,
      render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRule(r.id)} />,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={addRule}>新增规则</Button>
        <Button icon={<DownloadOutlined />} onClick={exportXlsx}>导出 XLSX</Button>
        <Upload beforeUpload={importXlsx} showUploadList={false} accept=".xlsx">
          <Button icon={<UploadOutlined />}>导入 XLSX</Button>
        </Upload>
      </Space>
      <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={rules} scroll={{ x: 900 }} />
    </div>
  );
}
```

- [ ] **Step 2: 实现 TracksTab**

Create `src/app/simulation-system/progression/components/TracksTab.tsx`:
```typescript
'use client';

import { Table, Input, Select, Button, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TrackDef, TrackKind } from '@/lib/progression/types';

interface Props {
  tracks: TrackDef[];
  onChange: (tracks: TrackDef[]) => void;
}

const KIND_OPTIONS: { value: TrackKind; label: string }[] = [
  { value: 'exp_level', label: '经验→等级' },
  { value: 'proficiency', label: '熟练度→段位' },
  { value: 'milestone', label: '里程碑' },
  { value: 'rate_accrual', label: '速率/挂机' },
];

function defaultParams(kind: TrackKind): TrackDef['params'] {
  switch (kind) {
    case 'exp_level': return { baseExp: 100, growthFactor: 1.08, model: 'logarithmic', maxLevel: 100 };
    case 'proficiency': return { tiers: [{ threshold: 0, label: '生疏' }, { threshold: 100, label: '熟练' }] };
    case 'milestone': return { milestones: [{ at: 1000, reward: '里程碑1' }] };
    case 'rate_accrual': return { ratePerUnit: 1, cap: 10000 };
  }
}

export default function TracksTab({ tracks, onChange }: Props) {
  const update = (id: string, patch: Partial<TrackDef>) =>
    onChange(tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const addTrack = () =>
    onChange([...tracks, { id: `track_${Date.now()}`, kind: 'exp_level', label: '新轨道', params: defaultParams('exp_level') }]);

  const columns: ColumnsType<TrackDef> = [
    {
      title: '轨道ID', dataIndex: 'id', width: 200,
      render: (_, t) => (
        <Space direction="vertical" size={2}>
          <Input value={t.id} onChange={(e) => update(t.id, { id: e.target.value })} />
          {/\{[A-Za-z0-9_]+\}/.test(t.id) && <Tag color="blue">模板路由</Tag>}
        </Space>
      ),
    },
    {
      title: '名称', dataIndex: 'label', width: 140,
      render: (_, t) => <Input value={t.label} onChange={(e) => update(t.id, { label: e.target.value })} />,
    },
    {
      title: '类型', dataIndex: 'kind', width: 160,
      render: (_, t) => (
        <Select
          style={{ width: '100%' }}
          value={t.kind}
          options={KIND_OPTIONS}
          onChange={(kind: TrackKind) => update(t.id, { kind, params: defaultParams(kind) })}
        />
      ),
    },
    {
      title: '参数 (JSON)', dataIndex: 'params',
      render: (_, t) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={JSON.stringify(t.params)}
          onChange={(e) => {
            try {
              update(t.id, { params: JSON.parse(e.target.value) });
            } catch {
              /* keep typing; ignore parse errors until valid */
            }
          }}
        />
      ),
    },
    {
      title: '', width: 50,
      render: (_, t) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onChange(tracks.filter((x) => x.id !== t.id))} />,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={addTrack}>新增轨道</Button>
      </Space>
      <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={tracks} scroll={{ x: 800 }} />
    </div>
  );
}
```

参数用 JSON 文本框编辑（v1 务实做法，避免为四种类型各写一套动态表单；后续可替换为结构化表单）。

- [ ] **Step 3: 实现 SimulateTab**

Create `src/app/simulation-system/progression/components/SimulateTab.tsx`:
```typescript
'use client';

import { useMemo, useState } from 'react';
import { Button, Card, InputNumber, Space, Table, Form } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ProgressionConfig, Snapshot } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { generateSyntheticContributions } from '@/lib/progression/sources/syntheticSource';
import { simulate } from '@/lib/progression/simulate';
import ProgressionCharts from './ProgressionCharts';

interface Props {
  config: ProgressionConfig;
  profile: BehaviorProfile;
  onProfileChange: (profile: BehaviorProfile) => void;
}

export default function SimulateTab({ config, profile, onProfileChange }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const run = () => {
    const contributions = generateSyntheticContributions(profile);
    setSnapshots(simulate(config, contributions));
  };

  const finalTracks = useMemo(() => {
    if (!snapshots.length) return [];
    const last = snapshots[snapshots.length - 1];
    return Object.values(last.tracks).map((t) => ({
      key: t.id, id: t.id, total: Math.round(t.total), level: t.level,
      rewards: t.unlockedRewards.join(', '),
    }));
  }, [snapshots]);

  const resultCols: ColumnsType<{ id: string; total: number; level: number; rewards: string }> = [
    { title: '轨道', dataIndex: 'id' },
    { title: '累计', dataIndex: 'total' },
    { title: '等级/段位', dataIndex: 'level' },
    { title: '解锁奖励', dataIndex: 'rewards' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title="模拟输入（行为剖面）">
        <Form layout="inline">
          <Form.Item label="模拟步数">
            <InputNumber
              min={1}
              max={3650}
              value={profile.steps}
              onChange={(v) => onProfileChange({ ...profile, steps: v ?? 1 })}
            />
          </Form.Item>
          {profile.perStep.map((item, idx) => (
            <Form.Item key={idx} label={`${item.type}`}>
              <InputNumber
                value={item.amount}
                onChange={(v) => {
                  const perStep = [...profile.perStep];
                  perStep[idx] = { ...perStep[idx], amount: v ?? 0 };
                  onProfileChange({ ...profile, perStep });
                }}
              />
            </Form.Item>
          ))}
        </Form>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={run} style={{ marginTop: 12 }}>
          运行推演
        </Button>
      </Card>

      {snapshots.length > 0 && (
        <>
          <Card size="small" title="成长曲线">
            <ProgressionCharts snapshots={snapshots} />
          </Card>
          <Card size="small" title="最终结果">
            <Table size="small" pagination={false} columns={resultCols} dataSource={finalTracks} />
          </Card>
        </>
      )}
    </Space>
  );
}
```

- [ ] **Step 4: 类型/lint 验证**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无这三个文件相关错误。

- [ ] **Step 5: Commit**

```bash
git add src/app/simulation-system/progression/components
git commit -m "feat(progression): tracks/rules/simulate tabs"
```

---

## Task 11: 页面容器 + layout + 样式

**Files:**
- Create: `src/app/simulation-system/progression/page.tsx`
- Create: `src/app/simulation-system/progression/layout.tsx`
- Create: `src/app/simulation-system/progression/Progression.module.css`

- [ ] **Step 1: 实现 layout**

Create `src/app/simulation-system/progression/layout.tsx`:
```typescript
export default function ProgressionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: 实现 page（三 Tab 容器 + 自动保存）**

Create `src/app/simulation-system/progression/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs, Button } from 'antd';
import { RiseOutlined } from '@ant-design/icons';
import type { ProgressionConfig, TrackDef, Rule } from '@/lib/progression/types';
import type { BehaviorProfile } from '@/lib/progression/sources/syntheticSource';
import { readProgressionState, writeProgressionState } from './lib/progressionStorage';
import TracksTab from './components/TracksTab';
import RulesTab from './components/RulesTab';
import SimulateTab from './components/SimulateTab';
import styles from './Progression.module.css';

export default function ProgressionPage() {
  const [config, setConfig] = useState<ProgressionConfig>({ tracks: [], rules: [] });
  const [profile, setProfile] = useState<BehaviorProfile>({ steps: 30, perStep: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = readProgressionState();
    setConfig(s.config);
    setProfile(s.profile);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeProgressionState(config, profile);
  }, [ready, config, profile]);

  const setTracks = (tracks: TrackDef[]) => setConfig((c) => ({ ...c, tracks }));
  const setRules = (rules: Rule[]) => setConfig((c) => ({ ...c, rules }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.icon}><RiseOutlined /></span>
        <div className={styles.title}>
          <h1>成长 / 反馈模拟器</h1>
          <p>通用「付出→反馈」引擎：配置事件规则与进度轨道，推演成长曲线</p>
        </div>
        <Link href="/simulation-system" className={styles.back}>返回</Link>
      </header>
      <main className={styles.main}>
        <Tabs
          defaultActiveKey="simulate"
          items={[
            { key: 'tracks', label: '进度轨道', children: <TracksTab tracks={config.tracks} onChange={setTracks} /> },
            { key: 'rules', label: '规则表', children: <RulesTab rules={config.rules} onChange={setRules} /> },
            { key: 'simulate', label: '运行推演', children: <SimulateTab config={config} profile={profile} onProfileChange={setProfile} /> },
          ]}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: 实现样式**

Create `src/app/simulation-system/progression/Progression.module.css`:
```css
.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
.header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.icon { font-size: 28px; color: #13c2c2; }
.title h1 { margin: 0; font-size: 22px; }
.title p { margin: 4px 0 0; color: #888; font-size: 13px; }
.back { margin-left: auto; color: #1890ff; }
.main { background: #fff; border-radius: 8px; padding: 16px; }
```

- [ ] **Step 4: 启动 dev server 手动验证页面可加载**

Run: `npm run dev`（后台），访问 `http://localhost:3001/simulation-system/progression`
Expected: 页面渲染三 Tab；运行推演后出现 ECharts 曲线与结果表，无控制台报错。

- [ ] **Step 5: Commit**

```bash
git add src/app/simulation-system/progression/page.tsx src/app/simulation-system/progression/layout.tsx src/app/simulation-system/progression/Progression.module.css
git commit -m "feat(progression): page container with three tabs + autosave"
```

---

## Task 12: hub 入口卡片

**Files:**
- Modify: `src/app/simulation-system/page.tsx`

- [ ] **Step 1: 加入 import 图标**

在 `src/app/simulation-system/page.tsx` 顶部图标 import 中加入 `RiseOutlined`：
```typescript
import {
  UserOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BankOutlined,
  StarOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  DollarOutlined,
  TableOutlined,
  RiseOutlined,
} from '@ant-design/icons';
```

- [ ] **Step 2: 在 BATTLE_MODULES/ECONOMY_MODULES 之外，新增一个独立卡片到顶部 systemGrid**

在 `src/app/simulation-system/page.tsx` 的 `systemGrid` 内（economy 卡片之后）新增：
```typescript
            <Link href="/simulation-system/progression" className={styles.systemCard}>
              <div className={styles.systemCardIcon} style={{ backgroundColor: '#13c2c2' }}>
                <RiseOutlined />
              </div>
              <div className={styles.systemCardContent}>
                <div className={styles.systemCardTitle}>成长 / 反馈模拟器</div>
                <div className={styles.systemCardDesc}>
                  通用「付出→反馈」引擎：经验、技能熟练度、挂机时长奖励等
                </div>
              </div>
            </Link>
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增错误。访问 hub 页确认卡片出现且可跳转。

- [ ] **Step 4: Commit**

```bash
git add src/app/simulation-system/page.tsx
git commit -m "feat(progression): add hub entry card"
```

---

## Task 13: 全量验证

- [ ] **Step 1: 跑全部测试**

Run: `npm run test`
Expected: 全部 PASS（formulaAdapter / tracks / ruleEngine / simulate / syntheticSource）。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无 progression 相关错误。

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 无 progression 相关错误（修复发现的问题）。

- [ ] **Step 4: 生产构建**

Run: `npm run build`
Expected: 构建成功，包含 `/simulation-system/progression` 路由。

- [ ] **Step 5: Commit（若有 lint/build 修复）**

```bash
git add -A
git commit -m "chore(progression): fix lint/build issues"
```

---

## 可选增强（非 v1 必须）：Task 14 — BattleEventSource

**Files:**
- Create: `src/app/simulation-system/battle/lib/progression/battleEventSource.ts`

把 `BattleSession.events`（`damage_applied`/`battle_ended`/`action_executed`）映射为 `Contribution[]`，依赖方向单向 battle → progression。需先确认 `BattleEvent` 的具体字段（`packages/keco-battle-core/src/battle-core/domain/types/event-types.ts`）。本任务作为后续闭环验证 both 场景，v1 可暂缓。

---

## Self-Review 记录

- **Spec 覆盖**：①通用引擎(Task1-7) ②四轨道(Task4) ③表格+公式规则(Task2/5/10) ④合成源(Task7) ⑤页面三Tab+图表(Task9-11) ⑥持久化(Task8) ⑦hub入口(Task12) ⑧确定性测试(Task6) ⑨三个示例默认配置(Task7)。`BattleEventSource`(spec §6.2 预留增强) → Task14 可选。
- **类型一致性**：`TrackStrategy.init/accrue`、`applyRules`、`simulate(config, contributions)`、`generateSyntheticContributions(profile)`、`readProgressionState/writeProgressionState` 跨任务签名一致。
- **占位符**：无 TBD/TODO；每个代码步骤含完整代码。
- **已知校验点**：Task8/9/10 依赖 `@/` alias → 执行前读 `tsconfig.json` 确认 paths，否则改相对路径。
