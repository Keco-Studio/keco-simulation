# keco-simulation 用户使用手册

> **面向**：策划 / 测试 / 首次使用者
> **主入口**：`/simulation-system`
> **重点入口**：Battle Simulator — `/simulation-system/battle`
> **更新**：2026-07-03

---

## 1. 这是什么？

`keco-simulation` 是独立的模拟系统前端，当前主要用于：

| 模块 | 入口 | 用途 |
|------|------|------|
| Battle simulator | `/simulation-system/battle` | 回合制 PVE 战斗、技能验证、批量胜率测试、云端 EXP/SP 养成 |
| Battle skills | `/simulation-system/battle/skills` | 本浏览器技能表编辑、导入/导出 `.xlsx`、恢复内置技能 |
| Project tables (Studio) | `/simulation-system/battle/studio-libraries` | 在 simulation 内查看/编辑 Keco Studio 项目库 |
| Local tables | `/simulation-system/battle/local-tables` | IndexedDB 本地表、技能表模板、Studio 库链接/工作区 |
| Economy simulator | `/simulation-system/economy/overview` | 离线经济数值推演：角色、装备、关卡、竞技场、声望、汇总计算 |

注意：`/simulation-system/progression` 和 `/simulation-system/progression/simulate` 现在都会重定向到 Battle。角色 EXP、等级、SP、技能加点都在 Battle Step 2 左侧面板里完成。

---

## 2. 启动与登录

### 2.1 本地启动

```bash
cd keco-simulation
npm install
npm run dev
```

浏览器打开：

- 总入口：`http://localhost:3001/simulation-system`
- 战斗入口：`http://localhost:3001/simulation-system/battle`

### 2.2 与 Keco Studio 一起使用

如果从 Keco Studio（默认 `3000`）侧边栏 iframe 进入 simulation，需要在 Studio 侧配置：

```env
NEXT_PUBLIC_SIMULATION_ENABLED=true
NEXT_PUBLIC_SIMULATION_ORIGIN=http://localhost:3001
```

如果要在 simulation 内打开 Studio 项目库，需要在 `keco-simulation/.env.local` 使用与 Studio 相同的 Supabase 项目：

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_KECO_STUDIO_ORIGIN=http://localhost:3000
```

修改 `.env.local` 后需要重启 `npm run dev`。

### 2.3 登录

Battle、Project tables、Local tables 里访问 Studio 项目库时，需要使用与 Keco Studio 相同的 Supabase 账号登录。

未登录时：

- 无法列出 Studio 项目和库；
- Battle 胜利后的 EXP 不会保存到云端；
- Local tables 仍可使用本地 IndexedDB 草稿表。

---

## 3. Battle Simulator 快速流程

Battle 页是三步向导：

```text
Step 1 Configure skill  ->  Step 2 Configure player  ->  Step 3 Start battle
```

### Step 1 — Configure skill

目标：准备本场战斗可用技能列表。

可选方式：

1. **Import skills**：打开技能来源弹窗，选择 Local table 或 Keco Studio library。
2. **Create local table**：跳转到 Local tables 创建技能表。
3. **Use the default skill sheet instead**：使用内置默认技能，适合快速试玩。

技能来源弹窗有两种常用模式：

| 模式 | 适合场景 |
|------|----------|
| Import by id | 表里一行就是一个技能，按 `id` 批量导入 |
| Bind attributes | 从表格列里绑定技能字段，点击 `Validate & apply` 后应用 |

至少需要 `id` 和 `name`。技能 ID 是战斗代码键，建议使用字母、数字、下划线。

### Step 2 — Configure player

目标：配置玩家、敌人、技能装配和可选的云端养成。

左侧包含：

- **Character progression**：云端 EXP/SP 养成，完整闭环需要配置这里；
- **Skills**：显示当前技能表，可再次 Configure skills；
- **Player**：玩家属性，可手动编辑或从表行 Import；
- **Enemy**：敌人属性，可手动编辑或从表行 Import，并可设置初始元素。

右侧包含：

- Player / Enemy 技能装配切换；
- 每方最多选择 6 个技能；
- 按元素筛选技能；
- 底部显示当前装配；
- **Batch simulation**：输入战斗次数，点击 Run batch 统计胜场、平局、逃跑或超时；
- **Start battle**：进入 Step 3。

玩家和敌人 Import 后会出现在数据源下拉里：

| 数据源 | 行为 |
|--------|------|
| Manual (editable) | 当前页面手动编辑 |
| Linked to table row | 只读；来源表行更新后，回到页面会同步刷新 |

### Step 3 — Start battle

目标：实际运行地图战斗。

页面左侧显示 Battle logs，右侧显示地图和双方 HP/MP 状态。点击 **Stop battle** 返回 Step 2。

如果满足云端养成条件，玩家胜利后会自动结算击杀 EXP：

- 未升级：提示 `+x EXP`；
- 升级：提示 `Level up! You gained x skill points`；
- 未登录：提示需要登录；
- 未导入四库：提示先在 Step 2 导入 Studio libraries。

同一场战斗只会结算一次 EXP。

---

## 4. 完整 EXP/SP 养成闭环

EXP 养成是 Battle 内的云端角色成长模块，与 Economy Simulator 的离线推演不是同一套系统。

| 层级 | 存什么 | 在哪 |
|------|--------|------|
| 共享配置 | 角色模板、技能定义、角色升级曲线、技能升级曲线 | Keco Studio 项目库 |
| 个人养成 | level / exp / skill_points / 各技能已点等级 | Supabase，按登录账号隔离 |

核心规则：

- **EXP 来源**：玩家胜利并击杀敌人；
- **SP 来源**：角色升级时由 `char_level_curve.grant_sp` 发放；
- **技能升级**：手动消耗 SP，只写入个人云端存档；
- **不会写回 Studio**：Studio 只存共享配置，不存个人等级和 EXP。

### 4.1 Studio 最少建库

完整验证建议同一 Studio 项目下准备 5 个库：

| 库名示例 | 用途 | 是否必须 |
|----------|------|----------|
| `Skills` | 战斗技能 + 四库 Skills | 必须 |
| `Characters` | 角色模板、基础属性、初始技能引用 | 必须 |
| `CharLevelCurve` | 角色等级、累计 EXP 门槛、升级发 SP | 必须 |
| `SkillLevelCurve` | 技能升级消耗和加成 | 必须 |
| `Enemies` | 敌人属性 Import | 可选，但推荐 |

不要在 Studio 的 Skills 或 Characters 表里加入 `level`、`exp`、`skill_points`、技能当前等级等个人养成字段。

完整列定义见：[studio-progression-four-libraries-import-guide.md](./studio-progression-four-libraries-import-guide.md)。

### 4.2 Step 2 导入四库

在 Battle Step 2 左侧 **Character progression** 面板中：

1. 展开 **Studio library setup**；
2. 选择 `Characters`、`Skills`、`Level curve`、`Skill curve` 四个库；
3. 点击 **Import libraries**；
4. 在 **Character** 下拉中绑定角色；
5. 确认左侧显示角色名、Lv、EXP、SP 和进度条。

只选下拉不算导入，必须点击 **Import libraries**。

### 4.3 用 SP 升级技能

绑定角色后，**Skill upgrades** 会显示该角色可升级技能：

```text
Fireball · Lv.0    +1 (1 SP)
Heal · Lv.0        +1 (1 SP)
```

点击 `+1 (x SP)` 会消耗个人 SP，并把技能等级保存到云端。SP 为 0 时，需要先通过战斗获得 EXP 并升级。

技能等级会同步到右侧技能卡和底部装配标签，例如 `Lv.2`。

### 4.4 战斗结算

进入 Step 3 后，玩家胜利时会按当前 P1 规则结算击杀经验：

```text
最终 EXP = baseExp × 等级差倍率 × rate
```

当前敌人默认 `baseExp = 50`。

等级差倍率：

| 情况 | 倍率 |
|------|------|
| 怪物等级更高 | 每高 1 级 +5%，最多 ×1.5 |
| 同级 | ×1.0 |
| 怪物等级更低 | 每低 1 级 -15%，最少 ×0.05 |

最低获得 1 EXP。累计 EXP 达到 `char_level_curve` 中下一级 `need_exp` 后升级，并按该级 `grant_sp` 发放 SP。

---

## 5. 数据表与编辑入口

### 5.1 Battle Skills

入口：`/simulation-system/battle/skills`

用途：

- 新增、清空、重置技能表；
- 导入/导出 `.xlsx`；
- 编辑结果保存在当前浏览器；
- Battle Step 1/2 会读取已保存的技能表。

XLSX 的 Sheet 名为 `Battle skills`，推荐表头：

```text
id, name, type, power, MP, maxCooldown, description,
attachElement, attachStrength, attachTurns,
dotDamage, dotTurns, freezeTurns,
specialEffect, specialEffectValue, specialEffectDuration,
reactionTriggers
```

### 5.2 Project tables (Studio)

入口：`/simulation-system/battle/studio-libraries`

当前有两种打开方式：

| 环境 | 行为 |
|------|------|
| 配置了 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 在 simulation 内使用复制过来的 Studio 项目库 UI，可登录后选择项目 |
| 只配置了 `NEXT_PUBLIC_KECO_STUDIO_ORIGIN` | 通过 iframe 打开 Studio，需要手动输入 project UUID |

这个入口适合直接查看或编辑 Studio 项目库，和 Keco Studio 使用同一份 Supabase 数据。

### 5.3 Local tables

入口：`/simulation-system/battle/local-tables`

Local tables 支持三类工作方式：

| 方式 | 数据位置 | 用途 |
|------|----------|------|
| Blank / Skill battle template | 当前浏览器 IndexedDB | simulation 专用草稿表、技能导入模板 |
| Link all Keco Studio projects | Supabase Studio 库 | 在 local-table 编辑器中链接并编辑 Studio 库 |
| Studio workspace | Supabase Studio 库 | 选择一个项目后，在同一界面切换该项目的所有库 |

未链接 Studio 的本地表不会自动写入 Supabase。链接或 workspace 模式使用 Studio 实时数据，需登录并有对应项目权限。

---

## 6. 常见使用模式

### 模式 A — 快速打一场

1. 打开 `/simulation-system/battle`；
2. Step 1 使用默认技能或导入技能；
3. Step 2 手动配置玩家和敌人；
4. 给双方各选至少 1 个技能；
5. 点击 **Start battle**。

这种模式不要求登录，也不会保存 EXP。

### 模式 B — 用 Studio 配置打一场

1. 登录 simulation；
2. Step 1 从 Studio 或 Local table 导入 Skills；
3. Step 2 分别 Import Player / Enemy 表行；
4. 选择双方技能；
5. 可先 Run batch 看胜率，再 Start battle。

### 模式 C — 完整云端养成

1. 登录 simulation；
2. Step 1 导入 Skills；
3. Step 2 左侧导入四库；
4. 绑定 Character；
5. 给玩家和敌人选择技能；
6. Step 3 战斗胜利获得 EXP；
7. 回 Step 2 用 SP 升级技能；
8. 再开战观察技能等级带来的变化。

---

## 7. Economy Simulator

Economy 模块入口在 `/simulation-system/economy/overview`。

它用于离线经济数值推演，包括角色成长、装备、竞技场、关卡、声望和总收益计算。它不读写 Battle 云端养成存档，也不参与 Step 3 的 EXP 结算。

如果目标是验证“战斗胜利 -> EXP -> 升级 -> SP -> 技能加点 -> 再战斗”的闭环，请使用 Battle Simulator。

---

## 8. 常见问题

| 问题 | 处理方式 |
|------|----------|
| 看不到 Studio 项目库 | 确认已登录 simulation，且 `.env.local` 使用与 Studio 相同的 Supabase URL 和 anon key |
| Step 1 没有技能 | 使用默认技能，或去 Battle Skills / Local tables 创建并导入 |
| 点击了四库下拉但不能绑定角色 | 需要点击 **Import libraries**，只选下拉不会导入 |
| 左侧显示 Lv.1 / EXP 0 / SP 0，但没法加点 | 需要导入四库并绑定 Character；SP 为 0 时先通过战斗升级 |
| 打赢了没有 EXP | 检查是否登录、是否导入四库、是否玩家胜利、是否同一场已经结算过 |
| 玩家/敌人属性不能编辑 | 当前数据源是 Linked to table row；切回 Manual (editable) 才能手动改 |
| Studio 改了技能 power，Battle 会变吗 | 会。重新导入/刷新来源后，Studio 配置会和云端技能等级合并生效 |
| 养成会写回 Studio 吗 | 不会。EXP、SP、技能等级只保存到个人 Supabase 存档 |
| Local table 会写回 Studio 吗 | 只有链接 Studio 或 workspace 模式才操作 Studio 数据；普通本地表只在当前浏览器 |

---

## 9. 相关文档

| 文档 | 内容 |
|------|------|
| [studio-progression-four-libraries-import-guide.md](./studio-progression-four-libraries-import-guide.md) | Studio 配表、技能/角色/四库列定义 |
| [superpowers/specs/2026-06-23-character-exp-skill-points-cloud-sync-design.md](./superpowers/specs/2026-06-23-character-exp-skill-points-cloud-sync-design.md) | 云端 EXP/SP 工程设计说明 |
