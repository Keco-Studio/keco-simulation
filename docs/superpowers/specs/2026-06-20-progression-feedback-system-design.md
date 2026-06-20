# 付出与反馈机制（成长/反馈模拟器）设计文档

> 状态：设计已确认，待转入实现计划（writing-plans）
> 日期：2026-06-20
> 仓库：`keco-simulation`（simulation-only，纯本地持久化）

## 1. 背景与目标

`keco-simulation` 是给游戏策划做机制模拟的地方。当前：

- **economy 模块**已有"付出→反馈"雏形（体力/时间 → 银币/经验），但曲线写死在 TypeScript（`economy/data/playerLevel.ts`、`calculator/page.tsx`），策划改不了。
- **battle 模块**有丰富战斗事件（`damage_applied`、`action_executed`、`battle_ended`），但**没有**任何"击杀给经验、用技能涨熟练度"的反馈逻辑。

**目标**：构建一个**通用的「付出 → 反馈」引擎**，让策划用配置/公式（而非改代码）定义任意"投入 X → 收获 Y"机制。用户给出的"攻击敌人获得角色经验 & 技能熟练度"只是其中一个实例；系统必须同样能表达"挂机/在线时长 → 奖励"等机制。

**核心诉求（硬需求）**：

1. **兼容性/可扩展**：新增机制 = 新增一个事件源适配器 + 一张规则表，**不动引擎**。
2. **both 场景**：核心引擎统一，既能接"合成输入"做推演，也能挂到真实战斗事件上。
3. **策划可编辑**：映射规则用"表格 + 公式列"驱动，复用现有 `simLocalTables` 与 `mathjs`。

**成功标准**：

- 三个示例都能仅靠"配置 + 规则表"跑通：①攻击→角色经验 ②攻击→技能熟练度 ③时长→奖励。
- 核心引擎是纯函数，相同输入产出相同结果（确定性可重放），可脱离 UI 单测。
- 在 `simulation-system` 下有一个完整页面：规则表编辑 + 运行推演 + ECharts 图表。

## 2. 选定方案：统一「贡献流水线」引擎 + 适配器

一条确定性、可重放的单向数据流：

```
[事件源适配器] --emit--> Contribution[]
                              │
                     [规则引擎: 匹配 + 过滤 + 公式求值]
                              │
                         RewardGrant[]
                              │
                     [轨道引擎: 按类型累积 / 分段]
                              │
                    Snapshot (每步一帧) ──> ECharts / 明细表
```

核心引擎纯函数化（`simulate(config, contributions) → Snapshot[]`），不依赖 React、不依赖战斗包。"跑 N 天 / N 场看成长曲线"成为确定性可复现的计算。

**未选方案（备忘）**：

- **方案 B（扩展 economy calculator）**：规则写死、与按天循环耦合、接不了真实战斗——与兼容性诉求相悖，否决。
- **方案 C（纯事件总线）**：难做确定性回放与批量推演、状态散落难单测——不适配模拟工具，否决。

## 3. 核心概念

| 概念 | 含义 | 举例 |
|------|------|------|
| **Contribution（贡献事件）** | 一次"付出"的标准化记录 | `{type:'deal_damage', amount:1200, ctx:{enemyLevel:30, skillId:'fireball'}}` |
| **Rule（规则）** | 策划编辑的"付出→反馈"映射 | 当 `deal_damage` 时，给 fireball 熟练度 += `amount*0.1` |
| **RewardGrant（奖励发放）** | 规则求值后产出的奖励 | `{trackId:'prof_fireball', amount:120}` |
| **Track（进度轨道）** | 奖励累积成可感知成长 | 熟练度 480 → 精通段位 LV3 |
| **Snapshot（快照）** | 每个时间步的轨道状态，喂给图表 | 第 30 天：玩家 Lv25、火球精通 LV3 |

## 4. 数据结构

目录：`src/lib/progression/`（纯逻辑，无 React 依赖）。

```typescript
// 贡献事件：所有"付出"的统一形态
interface Contribution {
  type: string;                 // 'deal_damage' | 'kill_enemy' | 'cast_skill' | 'time_elapsed' | ...
  amount: number;               // 主量级（伤害值、击杀数、流逝秒数）
  ctx: Record<string, number | string>; // 上下文变量，公式可引用：enemyLevel, skillId, isBoss...
  step: number;                 // 第几个时间步（天/回合/tick），保证可重放排序
}

// 规则：策划在表格里编辑的一行
type TrackKind = 'exp_level' | 'proficiency' | 'milestone' | 'rate_accrual';

interface Rule {
  id: string;
  enabled: boolean;
  whenType: string;             // 匹配哪种 Contribution.type
  filter?: string;              // 可选 mathjs 布尔表达式，如 "enemyLevel >= 20 and isBoss == 1"
  targetTrackId: string;        // 奖励发到哪条轨道；支持模板 "prof_{skillId}" 动态路由
  rewardFormula: string;        // mathjs 表达式，如 "amount*0.1 + enemyLevel*5"
}

// 轨道定义：策划配置的"反馈容器"
interface TrackDef {
  id: string;                   // 模板轨道使用占位形式，如 "prof_{skillId}"
  kind: TrackKind;
  label: string;
  params: Record<string, unknown>; // 各类型专属参数，见第 5 节
}

// 轨道运行时状态（累积结果）
interface TrackState {
  id: string;
  total: number;                // 累计获得量
  level: number;                // 当前等级/段位/里程碑序号（rate 轨道恒为 0）
  progressToNext: number;       // 0~1，距下一级进度
  unlockedRewards: string[];    // 已触发的一次性奖励 id（去重）
}

// 一次模拟的完整配置
interface ProgressionConfig {
  tracks: TrackDef[];
  rules: Rule[];
}

interface RewardGrant {
  trackId: string;
  amount: number;
  ruleId: string;
}

// 每个时间步的快照（图表数据点）
interface Snapshot {
  step: number;
  tracks: Record<string, TrackState>;
  grantsThisStep: RewardGrant[]; // 本步发放明细，便于调试/明细表
}
```

**兼容性的两个机关**：

1. `targetTrackId` 支持 `{skillId}` 模板路由——一条规则即可给"任意技能"各自的熟练度轨道发奖励，无需每技能写一行。命中时若目标轨道不存在，按模板轨道定义**懒创建**（复用同一份 `params`）。
2. `ctx` 是开放字典——新机制带来的新上下文变量（如挂机的 `vipLevel`）公式里直接可引用，引擎零改动。

## 5. 四种进度轨道（统一策略接口）

```typescript
interface TrackStrategy {
  kind: TrackKind;
  // 把一次奖励累积进状态，返回新状态（纯函数，不可变）
  accrue(state: TrackState, amount: number, def: TrackDef): TrackState;
}
```

引擎只认接口、不认具体类型；策略注册在 `TRACK_STRATEGIES` 表中。新增第五种轨道只需实现接口并注册，引擎与 UI 无需改动。

| 类型 | params | 行为 |
|------|--------|------|
| **`exp_level`** | `curve`：`{ model:'logarithmic'\|'sqrt'\|'linear'\|'exponential', baseExp, growthFactor }` 或 `expToLevelFormula`（mathjs，如 `50*level^1.5`），复用 `playerLevel.ts` 思路 | `total += amount`，按曲线反查 `level` 与 `progressToNext` |
| **`proficiency`** | `tiers: { threshold:number, label:string }[]`（如 0/100/500/2000 → 生疏/熟练/精通/大师） | 累积后落到对应段位；常配合模板路由 `prof_{skillId}` |
| **`milestone`** | `milestones: { at:number, reward:string }[]` | `total` 越过 `at` 时把 `reward` 推入 `unlockedRewards`（去重，只发一次） |
| **`rate_accrual`** | `{ ratePerUnit:number, cap?:number, decay?:string }` | `total = min(cap, total + amount*ratePerUnit*decayFactor)`；`level` 恒为 0 |
| **`custom`** | `{ accumulator:'add'\|'add_capped'\|'max', cap?, levelMode:'none'\|'formula'\|'tiers', levelFormula?, tiers?, unlocks? }` | **数据/公式驱动的通用轨道**：三个正交轴自由组合 —— 累积方式 + 等级映射（公式 `floor(sqrt(total/100))` 或阈值表）+ 任意点位一次性解锁。让策划纯靠配置造出无穷多种反馈模式（含预设做不到的组合，如"曲线升级 + 里程碑解锁"），无需写代码 |

**扩展性说明**：前四种是固定枚举（程序员扩展点），`custom` 是面向策划的开放扩展点 —— 把"累积 + 等级映射 + 解锁"全部做成配置，所以反馈侧不再是封闭的四选一，而是可由策划无限组合。预设保留为常用快捷项。

**三个示例如何落在结构上**：

| 示例 | 事件源 | 规则 | 轨道 |
|------|--------|------|------|
| 攻击敌人获得**角色经验** | `deal_damage`、`kill_enemy` | `exp = amount*0.1 + enemyLevel*5` → `char_exp` | `exp_level` |
| 攻击获得**技能熟练度** | `cast_skill`、`deal_damage` | `prof = amount*0.05` → `prof_{skillId}` | `proficiency`（模板路由，每技能一条状态） |
| **时长付出**收获奖励 | `time_elapsed`（合成，每步发 N 秒） | `gain = amount*ratePerUnit` → `idle_reward` | `rate_accrual` + `milestone` |

## 6. 规则引擎与事件源适配器

### 6.1 规则引擎 `src/lib/progression/ruleEngine.ts`（纯函数）

处理单个 `Contribution`：

1. 筛出 `enabled && whenType === contribution.type` 的规则。
2. 若有 `filter`，用 mathjs 在 `ctx` 作用域求值为布尔，false 则跳过。
3. 解析 `targetTrackId` 模板：`prof_{skillId}` + `ctx.skillId='fireball'` → `prof_fireball`；目标轨道不存在则按模板懒创建。
4. 用 mathjs 在 `{ amount, ...ctx }` 作用域求值 `rewardFormula` → `RewardGrant`。

复用 `src/studio-lib/lib/utils/formula.ts` 的 mathjs 封装（已支持 IF/SUM、列引用、安全求值）。求值前做白名单/安全校验，杜绝注入。

### 6.2 事件源适配器（统一产出 `Contribution[]`）

```typescript
interface ContributionSource {
  generate(): Contribution[]; // 一次性产出全部带 step 的贡献流（可重放）
}
```

- **`SyntheticSource`（推演用，v1 主路径）**：位于 `src/lib/progression/sources/syntheticSource.ts`。策划填"模拟步数（天/场）+ 每步行为剖面"（如"每天打 20 场，平均每场造成 5000 伤害、击杀 8 个 Lv30 怪、释放火球 12 次、在线 30 分钟"），展开成逐步 `Contribution[]`。确定性可复现。
- **`BattleEventSource`（接真实战斗，预留增强）**：位于 `src/app/simulation-system/battle/lib/progression/battleEventSource.ts`。订阅 `BattleSession.events`，映射：`damage_applied`→`deal_damage`、`battle_ended`(击杀)→`kill_enemy`、`action_executed`(技能)→`cast_skill`。**依赖方向单向：battle → progression**，核心引擎对 battle 零依赖。

### 6.3 主引擎 `src/lib/progression/simulate.ts`

```typescript
function simulate(config: ProgressionConfig, contributions: Contribution[]): Snapshot[]
```

按 `step` 排序 → 初始化轨道状态 → 逐个 contribution 过规则引擎 → grant 喂给对应轨道策略 → 每个 step 边界打一帧 Snapshot。全程不可变更新；输入相同则输出必然相同。

## 7. 页面与持久化

**路由**：`src/app/simulation-system/progression/`（与 economy、battle 平级）；在 `simulation-system/page.tsx` hub 增加入口卡片「成长 / 反馈模拟器」。

**布局**（antd，沿用项目约定）三个 Tab：

1. **轨道配置（Tracks）**：`antd Table` 增删轨道；选 `kind` 后动态渲染对应 params 表单（经验曲线 / 段位阈值 / 里程碑点 / 速率上限）。
2. **规则表（Rules）**：复用 `simLocalTables` 通用表格，每行一条 `Rule`（whenType、filter、targetTrackId、rewardFormula 列）；公式列即时校验红框提示；支持 XLSX 导入导出（沿用 `xlsx`）。
3. **运行推演（Simulate）**：左侧 `SyntheticSource` 输入面板（步数、行为剖面）；「运行」调 `simulate()`；右侧 ECharts（经验/熟练度累计曲线、等级/段位阶梯、里程碑触发标记、挂机产出含 cap 封顶线）；下方明细表展示每步 `grantsThisStep`。

**持久化**（沿用现有模式，纯本地）：

- 规则表 → `simLocalTables`（IndexedDB，已有导入导出/表格 UI）。
- 轨道定义 + 推演输入剖面 → localStorage（参考 `battleWizardPreferencesStorage.ts` 的 KV 封装），key 如 `keco-sim:progression:v1`。
- 不引入 Supabase/Yjs，符合 simulation-only、本地持久化的仓库边界规则。

**接真实战斗（可选增强，非 v1 必须但预留接口）**：battle 结果页加「导出为成长贡献」按钮，把本场 `BattleEventSource` 产出的 `Contribution[]` 灌进 progression 推演，验证 both 闭环。

## 8. 文件结构（决策锁定）

```
src/lib/progression/
  types.ts                      # 第 4 节全部接口
  ruleEngine.ts                 # 规则匹配/过滤/模板路由/公式求值
  simulate.ts                   # 主引擎纯函数
  formulaAdapter.ts             # 包装 studio-lib formula.ts，提供安全求值
  tracks/
    index.ts                    # TRACK_STRATEGIES 注册表
    expLevel.ts
    proficiency.ts
    milestone.ts
    rateAccrual.ts
  sources/
    syntheticSource.ts          # 行为剖面 → Contribution[]

src/app/simulation-system/progression/
  page.tsx                      # 三 Tab 容器
  layout.tsx
  components/
    TracksTab.tsx
    RulesTab.tsx
    SimulateTab.tsx
    ProgressionCharts.tsx       # ECharts 封装
  lib/
    progressionStorage.ts       # localStorage KV（轨道+剖面）

src/app/simulation-system/battle/lib/progression/
  battleEventSource.ts          # 可选增强：BattleSession.events → Contribution[]
```

## 9. 测试策略（TDD）

引擎纯函数化带来高可测性，逻辑全部压在引擎测试，UI 仅轻量冒烟：

- `ruleEngine.test.ts`：过滤命中/不命中、模板路由懒创建、公式求值（含 ctx 变量、IF）。
- `tracks/*.test.ts`：四种轨道各自的累积/分段/封顶/里程碑去重边界。
- `simulate.test.ts`：**确定性**（同输入两次跑结果全等）、多规则命中同一轨道叠加、三个示例各一条端到端用例。
- `battleEventSource.test.ts`：用假事件数组断言映射正确。

## 10. 非目标（YAGNI）

- 不做云端同步 / 多人协作（Supabase/Yjs）。
- v1 不做可视化规则构建器（拖拽 UI）；保留表格+公式即可。
- 不在 v1 强制接入真实战斗；`BattleEventSource` 作为预留接口与可选增强。
- 不改写 economy 现有写死曲线；新系统独立，后续可选迁移。
