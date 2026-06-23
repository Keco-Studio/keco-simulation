# Battle Step 2 — Studio 四库导入字段说明

> 适用：keco-simulation → Battle simulator → Step 2 Configure player → 左侧 **Import libraries**
> 依据：`new-design.md` v2.1、`importStudioProgressionBundle.ts`、`mapStudioAssetToCharacter.ts`

---

## 一、四个库分别是什么

左侧面板需要选齐 **4 个 Keco Studio 库**，点击 **Import libraries** 后才会加载养成配置：

| # | UI 下拉名称 | 库用途 | Studio 里建什么 |
|---|-------------|--------|-----------------|
| 1 | **Characters library** | 角色模板（基础属性 + 初始技能引用） | 角色库，每行一个可玩角色 |
| 2 | **Skills library** | 技能定义（伤害、MP、冷却等） | 技能库，每行一个技能 |
| 3 | **char_level_curve library** | 角色升级曲线（经验门槛 + 升级发 SP） | 数值曲线库，每行一个角色等级 |
| 4 | **skill_level_curve library** | 技能升级曲线（消耗 SP + 属性加成） | 数值曲线库，每行一个「技能 × 等级」 |

**关系简述：**

```
Characters.skill_ids  ──reference──►  Skills.id
skill_level_curve.skill_id          ──string──►  Skills.id
char_level_curve                    ──独立表，按 level 查 need_exp / grant_sp
```

养成数据（玩家 level / exp / skill_points / 各技能已点等级）**不在**这四个库里，存在 Supabase `sim_user_progression` + `sim_user_skill_levels`。

---

## 二、禁止出现在 Studio 四库里的列

以下列 **不要** 建在 Characters / Skills 库里（养成走云端）：

| 禁止列 | 原因 |
|--------|------|
| `level`、`exp`、`skill_points` | 账号级养成，存 Supabase |
| 任意「技能当前等级」列 | 存 `sim_user_skill_levels` |
| `currentSkillLevel`、`skillLevel` 等 | 同上 |

---

## 三、库 1 — Characters（角色库）

### 3.1 表头（列键）

| 列键 | Studio 类型 | 必填 | 说明 |
|------|-------------|:----:|------|
| `character_id` | string | 推荐 | 稳定业务 ID；缺省时用资产 UUID |
| `name` | string | 是 | 显示名；也可用 Studio 资产默认 Name |
| `hp` | int | 否 | Lv.1 基础生命，默认 `100` |
| `atk` | int | 否 | 攻击，默认 `10` |
| `def` | int | 否 | 防御，默认 `5` |
| `spd` | int | 否 | 速度，默认 `8` |
| `mp` | int | 否 | 法力，默认 `50` |
| `skill_ids` | **reference → Skills 库** | 否 | 初始技能列表（多选引用） |
| `portrait` | image | 否 | 头像（P1 可选，战斗 UI 预留） |

> 列键别名：`characterId` 等同 `character_id`；`skillIds` 等同 `skill_ids`。

### 3.2 参考示例行

| character_id | name | hp | atk | def | spd | mp | skill_ids |
|--------------|------|----|----|-----|-----|-----|-----------|
| hero_knight | Knight | 120 | 14 | 8 | 6 | 40 | → Fireball, → Heal |
| hero_mage | Mage | 80 | 18 | 4 | 7 | 80 | → Fireball, → Arc_Spark |

`skill_ids` 填 **Skills 库行的引用**（Reference 列指向 Skills library）；导入时会解析为 Skills 表的 `id` 字段。

---

## 四、库 2 — Skills（技能库）

### 4.1 表头（17 字段，与战斗技能 XLSX 对齐）

| # | 列键（推荐） | 类型 | 必填 | 说明 | 表头别名（自动识别） |
|---|-------------|------|:----:|------|----------------------|
| 1 | `id` | string | **是** | 技能代码键，仅字母数字下划线 | `skillid` |
| 2 | `name` | string | **是** | 显示名 | `displayname`, `skillname`, `title` |
| 3 | `type` | enum | 否 | `attack` \| `heal`，默认 `attack` | `skilltype` |
| 4 | `power` | number | 否 | 伤害/治疗倍率，默认 `1` | — |
| 5 | `mpCost` | int | 否 | MP 消耗，默认 `0` | `mp`, `manacost` |
| 6 | `maxCooldown` | int | 否 | 最大冷却（回合），默认 `0` | `cooldown`, `cd`, `maxcd` |
| 7 | `description` | string | 否 | 描述 | `desc` |
| 8 | `attachElement` | enum | 否 | 附着元素：`fire`/`water`/…/`random`，空=无 | `element` |
| 9 | `attachStrength` | enum | 否 | `weak`/`medium`/`strong`，默认 `weak` | `strength` |
| 10 | `attachDuration` | int | 否 | 附着持续回合 | `attachturns`, `attachturn` |
| 11 | `dotDamage` | number | 否 | DOT 每 tick 伤害 | `dotpower` |
| 12 | `dotDuration` | int | 否 | DOT 持续回合 | `dotturns` |
| 13 | `freezeDuration` | int | 否 | 冻结回合（>0 生效），默认 `0` | `freezeturns`, `freeze` |
| 14 | `specialType` | enum | 否 | `heal`/`atk_debuff`/`def_debuff` | `special` |
| 15 | `specialValue` | number | 否 | 特殊效果数值 | — |
| 16 | `specialDuration` | int | 否 | 特殊效果持续 | — |
| 17 | `reactionTriggersJson` | JSON / string | 否 | 元素反应，如 `[{"element":"fire","reaction":"vaporize"}]` | `reactions`, `reactiontriggers` |

> **注意**：`id` 是战斗代码键，不是任意显示字符串。带空格的名称需规范化为下划线（如 `Arc Spark` → `Arc_Spark`）。**禁止**加 `level` 列。

### 4.2 参考示例行

| id | name | type | power | mpCost | maxCooldown | description |
|----|------|------|-------|--------|-------------|-------------|
| fireball | Fireball | attack | 1.2 | 10 | 3 | Basic fire attack |
| heal | Minor Heal | heal | 0.8 | 8 | 2 | Restore HP |
| arc_spark | Arc Spark | attack | 1.35 | 4 | 2 | Lightning strike |

完整 17 列模板可参考本地表模板 `buildSkillSheetColumnDefs()` 或 XLSX Sheet `Battle skills`。

---

## 五、库 3 — char_level_curve（角色升级曲线）

### 5.1 表头

| 列键 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `level` | int | **是** | 角色等级，≥ 1 |
| `need_exp` | int | **是** | 升到该级所需的**累计经验**（见下方语义） |
| `grant_sp` | int | **是** | 升到该级时发放的 SP 数量 |

> 解析逻辑：`importStudioProgressionBundle` 读取列键 `level`、`need_exp`、`grant_sp`（snake_case）。`level < 1` 的行会被丢弃。

### 5.2 经验语义（与代码一致）

`need_exp` 表示 **累计经验阈值**：当前 `exp >= need_exp(level+1)` 时升到下一级，并累加 `grant_sp`。

### 5.3 参考示例行

| level | need_exp | grant_sp |
|-------|----------|----------|
| 1 | 0 | 0 |
| 2 | 100 | 1 |
| 3 | 300 | 2 |
| 4 | 600 | 3 |
| 5 | 1000 | 3 |

含义示例：Lv.1、exp=80 时击杀 +30 → exp=110 ≥ 100 → 升到 Lv.2，SP +1。

---

## 六、库 4 — skill_level_curve（技能升级曲线）

### 6.1 表头

| 列键 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `skill_id` | string | **是** | 对应 Skills 库的 `id` |
| `level` | int | **是** | 技能等级（1..N），表示「升到该级」 |
| `cost_sp` | int | **是** | 从上一级升到该级消耗的 SP，≥ 1 |
| `power_bonus` | float | 否 | 该级叠加的伤害倍率加成 |
| `mp_cost_delta` | int | 否 | 该级 MP 变化（可为负） |
| `cooldown_delta` | int | 否 | 该级冷却变化（可为负） |

> 解析过滤：`skill_id` 为空、`level < 1`、`cost_sp < 1` 的行会被跳过。

### 6.2 参考示例行

| skill_id | level | cost_sp | power_bonus | mp_cost_delta | cooldown_delta |
|----------|-------|---------|-------------|---------------|----------------|
| fireball | 1 | 1 | 0.1 | | |
| fireball | 2 | 2 | 0.2 | -1 | |
| fireball | 3 | 3 | 0.3 | | -1 |
| heal | 1 | 1 | 0.05 | | |
| heal | 2 | 2 | 0.1 | -1 | |

含义示例：`fireball` 云端 Lv.2 时，`power = 1.2 + 0.1 + 0.2 = 1.5`，`mpCost = 10 - 1 = 9`。

---

## 七、四库最小可跑示例（建表清单）

在 Studio 同一项目下建 **4 个独立 Library**，建议命名：

| Library 名称（示例） | 至少需要的行 |
|---------------------|-------------|
| `Characters` | ≥ 1 个角色，含 `character_id` + 属性 + `skill_ids` 引用 |
| `Skills` | ≥ 1 个技能，含 `id` + `name`；被 Characters / skill_level_curve 引用 |
| `CharLevelCurve` | ≥ 2 级（Lv.1 + Lv.2），含 `need_exp` / `grant_sp` |
| `SkillLevelCurve` | 每个可升级技能 ≥ 1 行（level=1, cost_sp≥1） |

导入成功后左侧面板会出现：**Character 下拉**、**Skill upgrades 加点**、右侧技能卡显示 **Lv.0**（未加点）或 **Lv.x**（已加点）。

---

## 八、P2 可选库（当前四库之外）

| 库 | 列键 | 说明 |
|----|------|------|
| `monster_exp` | `monster_id`, `base_exp`, `monster_type` | 怪物击杀经验（P1 可用默认值） |
| `skill_unlock` | `skill_id`, `unlock_char_level`, `prerequisite_skill_id`, `prerequisite_level` | 技能解锁条件 |

---

## 九、关键源码

| 内容 | 路径 |
|------|------|
| 四库导入入口 | `keco-simulation/src/lib/characterProgression/studio/importStudioProgressionBundle.ts` |
| 角色行映射 | `keco-simulation/src/lib/characterProgression/studio/mapStudioRowToCharacter.ts` |
| 技能行映射 | `keco-simulation/src/app/simulation-system/battle/lib/localTableSkillSource/importSkillRowFromTable.ts` |
| 左侧面板 UI | `keco-simulation/src/app/simulation-system/battle/components/design/BattleCloudProgressionPanel.tsx` |
| 策划案 | `/home/hetu/project/new-design.md` §4.4 |
| 字段统计 | `/home/hetu/project/keco-simulation-battle-poc-import-data-field-statistics.md` §2、§3 |
