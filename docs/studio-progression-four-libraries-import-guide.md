# keco-simulation Studio 配表导入说明书

> 面向策划 / 测试 / 使用者  
> 说明在 **Keco Studio** 里需要建哪些库、每张表有哪些列、示例值怎么填，以及 **keco-simulation** 在哪些页面会读取它们。

---

## 使用前须知

1. **先登录**：Battle 与 Studio 导入需使用**同一 Supabase 账号**登录 keco-simulation，才能列出 Studio 项目库。
2. **配置 ≠ 养成**：
   - **Studio 库（Layer A）**：角色/技能/曲线等**共享配置**，策划协作编辑。
   - **Supabase 云端（Layer B）**：每个登录账号独立的 **level / exp / skill_points / 技能已点等级**，不在 Studio 表里。
3. **禁止列**：Studio 技能库、角色库里**不要**加 `level`、`exp`、`skill_points`、技能当前等级等养成字段。

---

## 一、总览：keco-simulation 会从 Studio 读什么

| 模块 | 入口位置 | 需要几个 Studio 库 | 库用途 |
|------|----------|:------------------:|--------|
| **战斗 · 技能** | Battle Step 1「Import skills」 | 1（Skills） | 战斗可用技能列表 |
| **战斗 · 玩家属性** | Battle Step 2 玩家卡片「Import」 | 1（任意，常用 Characters） | 玩家 HP/ATK/DEF/SPD/MP |
| **战斗 · 敌人属性** | Battle Step 2 敌人卡片「Import」 | 1（任意，常用 Enemies / Monsters） | 敌人 HP/ATK/DEF/SPD/MP |
| **战斗 · 云端养成** | Battle Step 2 左侧「Import libraries」 | **4** | 角色模板 + 技能 + 两条升级曲线 |
| **成长推演**（独立页） | Progression → Import from Studio | 2 | Tracks + Rules 推演规则 |

下面按表逐一说明**表头（列键）**和**参考示例**。

---

## 二、战斗技能表（Skills）

### 2.1 在哪里用

| 方式 | 入口 |
|------|------|
| 从 Studio 导入 | Battle **Step 1** → Import skills → Import from Studio |
| 云端养成四库 | Step 2 左侧 **Skills library**（与 Step 1 技能库可以是同一个库） |
| 本地 XLSX | Battle Skills 编辑器 Upload（不走 Studio，列名与下表一致） |

### 2.2 表头（17 列）

| # | 列键（Studio 推荐） | 类型 | 必填 | 说明 | 可识别别名 |
|---|---------------------|------|:----:|------|------------|
| 1 | `id` | string | **是** | 技能代码键，仅字母数字下划线 | `skillid` |
| 2 | `name` | string | **是** | 显示名 | `displayname`, `skillname`, `title` |
| 3 | `type` | enum | 否 | `attack` 或 `heal`，默认 `attack` | `skilltype` |
| 4 | `power` | number | 否 | 伤害/治疗倍率，默认 `1` | — |
| 5 | `mpCost` | int | 否 | MP 消耗，默认 `0` | `mp`, `manacost` |
| 6 | `maxCooldown` | int | 否 | 最大冷却（回合），默认 `0` | `cooldown`, `cd`, `maxcd` |
| 7 | `description` | string | 否 | 描述 | `desc` |
| 8 | `attachElement` | enum | 否 | 附着元素；空=无 | `element` |
| 9 | `attachStrength` | enum | 否 | `weak` / `medium` / `strong` | `strength` |
| 10 | `attachDuration` | int | 否 | 附着持续回合 | `attachturns`, `attachturn` |
| 11 | `dotDamage` | number | 否 | DOT 每 tick 伤害 | `dotpower` |
| 12 | `dotDuration` | int | 否 | DOT 持续回合 | `dotturns` |
| 13 | `freezeDuration` | int | 否 | 冻结回合 | `freezeturns`, `freeze` |
| 14 | `specialType` | enum | 否 | `heal` / `atk_debuff` / `def_debuff` | `special` |
| 15 | `specialValue` | number | 否 | 特殊效果数值 | — |
| 16 | `specialDuration` | int | 否 | 特殊效果持续 | — |
| 17 | `reactionTriggersJson` | JSON / string | 否 | 元素反应 JSON 数组 | `reactions`, `reactiontriggers` |

> `id` 不是任意中文名：带空格会自动规范为下划线（如 `Arc Spark` → `Arc_Spark`）。**不要**在技能表加 `level` 列。

### 2.3 参考示例行

| id | name | type | power | mpCost | maxCooldown | description |
|----|------|------|-------|--------|-------------|-------------|
| fireball | Fireball | attack | 1.2 | 10 | 3 | Basic fire attack |
| heal | Minor Heal | heal | 0.8 | 8 | 2 | Restore HP |
| arc_spark | Arc Spark | attack | 1.35 | 4 | 2 | Lightning strike |

XLSX 导入时 Sheet 名：`Battle skills`；MP 列头可写 `MP`（映射到 `mpCost`）。

---

## 三、战斗单位属性表（玩家 & 敌人）

### 3.1 在哪里用

| 对象 | 入口 |
|------|------|
| **玩家** | Battle Step 2 → Player 卡片右上角 **Import** |
| **敌人** | Battle Step 2 → Enemy 卡片右上角 **Import** |

玩家和敌人使用**完全相同的 6 个属性字段**，可从任意 Studio 库或本地表**按行 ID 导入**。  
系统**没有**强制库名；建议：

| 建议库名 | 用途 |
|----------|------|
| `Characters` | 玩家角色（也可给云端养成四库复用，见第五节） |
| `Enemies` 或 `Monsters` | 敌人 / 怪物 |

导入后可选 **Manual (editable)** 手改，或保持 **Linked to table row** 与 Studio 行同步。

### 3.2 表头（6 列）

| # | 列键 | 类型 | 必填 | 说明 | 可识别别名 |
|---|------|------|:----:|------|------------|
| 1 | `name` | string | **是** | 战斗显示名 | `displayname`, `unitname`, `charactername` |
| 2 | `hp` | int | 否 | 生命值，> 0 | `maxhp`, `health` |
| 3 | `atk` | int | 否 | 攻击力，> 0 | `attack` |
| 4 | `def` | int | 否 | 防御力，≥ 0 | `defense` |
| 5 | `spd` | int | 否 | 速度，> 0 | `speed` |
| 6 | `mp` | int | 否 | 法力值，> 0 | `maxmp`, `mana` |

**定位行用（不参与属性写入，但导入时要选）：**

| 列键 | 说明 |
|------|------|
| `id` / `unitid` / `characterid` | 选表 → 选 ID 列 → 选具体行 |

缺省值（未填列时使用）：

| 对象 | name | hp | atk | def | spd | mp |
|------|------|----|----|-----|-----|-----|
| 玩家默认 | Player | 1000 | 150 | 80 | 100 | 100 |
| 敌人默认 | Slime | 800 | 120 | 60 | 90 | 80 |

### 3.3 参考示例 — 玩家（Characters 库）

| id | name | hp | atk | def | spd | mp |
|----|------|----|----|-----|-----|-----|
| hero_knight | Knight | 1200 | 150 | 80 | 100 | 100 |
| hero_mage | Mage | 800 | 180 | 50 | 90 | 120 |

### 3.4 参考示例 — 敌人（Enemies 库）

| id | name | hp | atk | def | spd | mp |
|----|------|----|----|-----|-----|-----|
| slime | Slime | 800 | 120 | 60 | 90 | 80 |
| goblin | Goblin | 600 | 140 | 40 | 110 | 60 |
| boss_dragon | Dragon | 5000 | 200 | 120 | 70 | 150 |

> **说明**：敌人初始元素（火/水/雷等）目前在 Step 2 UI 里手动选择，**不**从 Studio 表导入。击杀经验 P1 使用内置默认值（baseExp=50），`monster_exp` 库为 P2 可选。

---

## 四、云端养成四库（Battle Step 2 左侧）

### 4.1 在哪里用

Battle **Step 2** → 左侧 **BattleCloudProgressionPanel** → 选齐 4 个库 → **Import libraries** → 绑定 Character → Skill upgrades 加点。

| # | UI 下拉名称 | 建什么库 |
|---|-------------|----------|
| 1 | Characters library | 角色模板（属性 + 初始技能） |
| 2 | Skills library | 技能定义（同第二节） |
| 3 | char_level_curve library | 角色升级：经验门槛 + 发 SP |
| 4 | skill_level_curve library | 技能升级：耗 SP + 属性加成 |

**引用关系：**

```
Characters.skill_ids  ──reference──►  Skills.id
skill_level_curve.skill_id          ──string──►  Skills.id
char_level_curve                    ──按 level 独立查表
```

绑定角色后，左侧养成会**覆盖同步**右侧玩家属性与技能；云端 Lv.x 与 Studio 基础值合并后参与战斗。

---

### 4.2 库 1 — Characters（角色模板）

在「战斗单位属性表」基础上，云端养成还需要：

| 列键 | Studio 类型 | 必填 | 说明 |
|------|-------------|:----:|------|
| `character_id` | string | 推荐 | 稳定业务 ID；缺省用资产 UUID |
| `name` | string | 是 | 显示名 |
| `hp` | int | 否 | 基础生命，默认 `100` |
| `atk` | int | 否 | 攻击，默认 `10` |
| `def` | int | 否 | 防御，默认 `5` |
| `spd` | int | 否 | 速度，默认 `8` |
| `mp` | int | 否 | 法力，默认 `50` |
| `skill_ids` | **reference → Skills 库** | 否 | 初始技能（多选引用） |
| `portrait` | image | 否 | 头像（可选） |

参考示例：

| character_id | name | hp | atk | def | spd | mp | skill_ids |
|--------------|------|----|----|-----|-----|-----|-----------|
| hero_knight | Knight | 120 | 14 | 8 | 6 | 40 | → Fireball, → Heal |
| hero_mage | Mage | 80 | 18 | 4 | 7 | 80 | → Fireball, → Arc_Spark |

---

### 4.3 库 2 — Skills

与 **第二节「战斗技能表」完全相同**。四库里的 Skills 可与 Step 1 共用同一个 Studio 库。

---

### 4.4 库 3 — char_level_curve（角色升级曲线）

| 列键 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `level` | int | **是** | 角色等级，≥ 1 |
| `need_exp` | int | **是** | 升到该级的**累计经验**阈值 |
| `grant_sp` | int | **是** | 升到该级发放的 SP |

参考示例：

| level | need_exp | grant_sp |
|-------|----------|----------|
| 1 | 0 | 0 |
| 2 | 100 | 1 |
| 3 | 300 | 2 |
| 4 | 600 | 3 |
| 5 | 1000 | 3 |

语义：Lv.1、exp=80，击杀 +30 → exp=110 ≥ 100 → 升到 Lv.2，SP +1。

---

### 4.5 库 4 — skill_level_curve（技能升级曲线）

| 列键 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `skill_id` | string | **是** | 对应 Skills 库的 `id` |
| `level` | int | **是** | 技能等级 1..N |
| `cost_sp` | int | **是** | 升到该级消耗 SP，≥ 1 |
| `power_bonus` | float | 否 | 该级伤害倍率加成 |
| `mp_cost_delta` | int | 否 | 该级 MP 变化（可为负） |
| `cooldown_delta` | int | 否 | 该级冷却变化（可为负） |

参考示例：

| skill_id | level | cost_sp | power_bonus | mp_cost_delta | cooldown_delta |
|----------|-------|---------|-------------|---------------|----------------|
| fireball | 1 | 1 | 0.1 | | |
| fireball | 2 | 2 | 0.2 | -1 | |
| fireball | 3 | 3 | 0.3 | | -1 |
| heal | 1 | 1 | 0.05 | | |
| heal | 2 | 2 | 0.1 | -1 | |

语义：`fireball` 云端 Lv.2 → `power = 1.2 + 0.1 + 0.2 = 1.5`，`mpCost = 10 - 1 = 9`。

---

## 五、成长推演双库（Progression 模块，可选）

与战斗云端养成**不是同一套系统**。用于 **Progression 推演页**试算规则，入口：Progression → **Import from Studio**。

| # | UI 名称 | 库用途 |
|---|---------|--------|
| 1 | Progress tracks library | 进度轨道定义 |
| 2 | Rules library | 事件 → 奖励规则 |

### 5.1 Tracks 库表头

| 列键 | 类型 | 必填 | 说明 | 示例 |
|------|------|:----:|------|------|
| `track_id` | string | **是** | 轨道 ID | `player_exp` |
| `label` | string | 否 | 显示名 | `Player EXP` |
| `kind` | enum | **是** | `exp_level` / `proficiency` / `milestone` / `rate_accrual` / `custom` | `exp_level` |
| `params` | JSON | **是** | 随 kind 变化的参数对象 | `{"baseExp":100,"growthFactor":1.2,...}` |

### 5.2 Rules 库表头

| 列键 | 类型 | 必填 | 说明 | 示例 |
|------|------|:----:|------|------|
| `rule_id` | string | **是** | 规则 ID | `damage_to_exp` |
| `enabled` | boolean | 否 | 默认 `true` | `true` |
| `when_type` | string | **是** | 触发事件类型 | `deal_damage` |
| `filter` | string | 否 | 过滤表达式 | `enemyLevel >= 20` |
| `target_track_id` | string | **是** | 目标 Track | `player_exp` |
| `reward_formula` | string | **是** | mathjs 奖励公式 | `amount * params.damageRatio` |
| `params` | JSON | 否 | 公式常量 | `{"damageRatio":0.1}` |

---

## 六、P2 可选库（当前可不建）

| 库 | 列键 | 说明 |
|----|------|------|
| `monster_exp` | `monster_id`, `base_exp`, `monster_type` | 按怪物查击杀经验（P1 用内置默认 50） |
| `skill_unlock` | `skill_id`, `unlock_char_level`, `prerequisite_skill_id`, `prerequisite_level` | 技能解锁条件 |

---

## 七、推荐建库清单（最小可跑）

在同一 Studio 项目下建议建 **6～7 个 Library**：

| 库名（示例） | 用于 | 最少行数 |
|-------------|------|----------|
| `Skills` | Step 1 技能 + 四库 Skills | ≥ 1 技能（`id` + `name`） |
| `Characters` | 四库角色 + 可选玩家 Import | ≥ 1 角色 |
| `Enemies` | 敌人 Import | ≥ 1 敌人 |
| `CharLevelCurve` | 四库角色升级 | ≥ Lv.1 + Lv.2 |
| `SkillLevelCurve` | 四库技能升级 | 每个可升级技能 ≥ 1 行 |
| `ProgressTracks` | 推演（可选） | 按推演需求 |
| `ProgressRules` | 推演（可选） | 按推演需求 |

---

## 八、标准操作流程

### 8.1 只打一场战斗（不配云端养成）

1. 登录 → Battle Step 1 导入 **Skills**
2. Step 2 分别 Import **玩家**、**敌人** 属性（或用手动默认值）
3. 右侧选技能 → Start battle

### 8.2 完整云端养成闭环

1. 登录
2. Step 1 导入 Skills（可与四库共用同一 Skills 库）
3. Step 2 左侧选齐 **4 库** → **Import libraries**
4. **Character** 下拉绑定角色
5. **Skill upgrades** 用 SP 点 `+1 (x SP)`
6. 右侧选技能 → 战斗击杀 → 云端 EXP / 升级 / 得 SP

> 左侧显示的 `Lv.1 · EXP 0 · SP 0` 是账号默认云端数据，**不代表**四库已导入；必须点 **Import libraries** 后才会出现角色绑定和加点。

---

## 九、常见问题

| 问题 | 说明 |
|------|------|
| 技能卡没有 Lv.0？ | 刷新页面；未导入四库时右侧仍显示 Lv.0，加点需先 Import libraries |
| 看不到加点按钮？ | 四库只选未点 Import；或未完成 Character 绑定 |
| 玩家/敌人 Import 找不到表？ | 需登录；表来自 Studio 项目库或本地 Local tables |
| Characters 和玩家 Import 有什么区别？ | Characters 有四库专用列 `character_id`、`skill_ids`；玩家 Import 只需 6 属性 + 定位用 `id` |
| 养成会写回 Studio 吗？ | **不会**。只读写 Supabase 云端存档 |

---

## 十、相关文档

| 文档 | 内容 |
|------|------|
| `new-design.md` | 策划案 v2.1（玩法、表规范） |
| `keco-simulation-battle-poc-import-data-field-statistics.md` | 全项目导入字段统计 |
| `docs/superpowers/specs/2026-06-23-character-exp-skill-points-cloud-sync-design.md` | 云端养成工程 Spec |
