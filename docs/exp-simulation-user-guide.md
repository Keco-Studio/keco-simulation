# keco-simulation EXP 养成系统 — 新用户手册

> **适用功能**：击杀获得 EXP → 升级得 SP → 手动升级技能 → 再战斗（完整闭环）  
> **入口**：Battle Simulator — `/simulation-system/battle`  
> **面向**：策划 / 测试 / 首次使用者  
> **更新**：2026-07-01

---

## 1. 这是什么？

EXP 养成系统是 keco-simulation **战斗模拟器**里的云端角色成长模块，与 Economy Calculator 等离线推演工具**不是同一套系统**。

| 层级 | 存什么 | 在哪 |
|------|--------|------|
| **配置（共享）** | 角色模板、技能定义、升级曲线 | Keco Studio 项目库 |
| **养成（个人）** | level / exp / skill_points / 各技能已点等级 | Supabase 云端（按登录账号隔离） |

核心规则：

- **EXP 唯一来源**：战斗胜利并击杀敌人（P1 默认 baseExp = 50）
- **SP 唯一来源**：角色升级时发放（由 `char_level_curve` 表配置）
- **技能升级**：手动消耗 SP；只改你的云端存档，**不会写回 Studio**
- **跨设备同步**：同一 Supabase 账号登录即可

架构示意：

```
Studio 配置 ──Import──► keco-simulation ──读写──► Supabase 养成（user_id）
                              │
                              └──► 战斗合并 effectiveSkill / effectiveCharacter
```

---

## 2. 开始之前

### 2.1 启动应用

```bash
cd keco-simulation
npm install
npm run dev
```

浏览器打开：**http://localhost:3001/simulation-system/battle**

也可从 Keco Studio（端口 3000）侧边栏 iframe 进入；Studio 需配置：

- `NEXT_PUBLIC_SIMULATION_ENABLED=true`
- `NEXT_PUBLIC_SIMULATION_ORIGIN=http://localhost:3001`

### 2.2 环境变量（`.env.local`）

必须与 **Keco Studio 使用同一 Supabase 项目**：

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_KECO_STUDIO_ORIGIN=http://localhost:3000
```

修改 `.env.local` 后需 **重启** `npm run dev`。

### 2.3 登录

Battle 页右上角点击账号区域 → **Sign in**，使用与 Keco Studio **相同的账号**。

未登录时：

- 无法列出 Studio 项目库
- 击杀 EXP **不会保存**到云端

---

## 3. 三步向导总览

战斗页分为 3 步：

```
Step 1  Configure skill   → 导入 / 选择技能表
Step 2  Configure player  → 配置玩家 / 敌人 + 【EXP 养成面板】
Step 3  Start battle      → 开战，胜利后自动结算 EXP
```

| 目标 | 最少需要 |
|------|----------|
| 只打一场战斗 | Step 1 有技能 + Step 2 配好双方属性 |
| **完整 EXP 闭环** | 登录 + Step 2 导入四库 + 绑定角色 + 开战 |

> `/simulation-system/progression` 已重定向到 Battle Step 2。独立 Progression 推演页与战斗云端养成是两套系统，新用户以 Battle 向导为准。

---

## 4. 快速上手（完整 EXP 闭环）

### Step 1 — 导入技能

1. 进入 **Battle → Step 1: Configure skill**
2. 点击 **Import skills**
3. 任选一种来源：
   - **Keco Studio**：从项目 Skills 库导入（需登录）
   - **Local tables**：浏览器 IndexedDB 本地表
   - **Use default sheet**：内置示例技能（最快试玩）
4. 确认技能列表有内容 → **Continue**

### Step 2 — 配置养成（重点）

左侧 **Character progression** 面板是 EXP 系统的核心。

#### 4.1 导入四库

展开 **Studio library setup**，依次选择 4 个 Studio 库：

| 下拉项 | 建什么库 | 用途 |
|--------|----------|------|
| Characters | 角色模板库 | 基础属性 + 初始技能引用 |
| Skills | 技能库 | 技能定义（可与 Step 1 共用同一库） |
| Level curve | `char_level_curve` | 每级累计 EXP 门槛 + 升级发 SP |
| Skill curve | `skill_level_curve` | 每技能每级耗 SP + 属性加成 |

选齐后点击 **Import libraries**（必须点；只选下拉不算导入）。

#### 4.2 绑定角色

导入成功后：

1. **Character** 下拉选一个角色（如 Knight）
2. 左侧显示 **Lv / EXP / SP** 和 EXP 进度条
3. 右侧玩家属性、技能卡同步该角色的基础数值

#### 4.3 分配技能点（有 SP 时）

在 **Skill upgrades** 区域：

- 每个技能显示当前等级，如 `Fireball · Lv.0`
- 点击 **+1 (x SP)** 消耗技能点升级
- SP 为 0 时提示：需先通过战斗获得 EXP 并升级

#### 4.4 配置敌人（右侧）

- **Enemy** 卡片可 Import 敌人属性，或用手动默认值
- 敌人初始元素在 UI 里手动选（暂不从 Studio 导入）
- 为玩家 / 敌人勾选本场要用的技能

完成后点击 **Start battle** 进入 Step 3。

### Step 3 — 战斗与 EXP 结算

1. 地图上进行回合制 PVE 战斗
2. **玩家胜利** 后自动结算击杀 EXP：
   - 未升级：提示 `+50 EXP`（默认 baseExp）
   - 升级：提示 `Level up! You gained x skill points`
3. 点击 **Stop battle** 返回 Step 2，可继续加点、再开一场

左下角说明：**Kill EXP saves to your account on victory. Upgrade skills in step 2.**

---

## 5. EXP 怎么算？

当前 P1 默认（敌人等级默认 1，baseExp 默认 50）：

```
最终 EXP = baseExp × 等级差倍率 × rate
```

等级差倍率（玩家等级 vs 怪物等级）：

| 情况 | 倍率 |
|------|------|
| 怪物更高 | 最多 ×1.5（每高 1 级 +5%） |
| 同级 | ×1.0 |
| 怪物更低 | 最少 ×0.05（每低 1 级 -15%） |

最低获得 **1 EXP**。

升级判定：累计 EXP 达到 `char_level_curve` 中下一级的 `need_exp` 阈值即升级，并按 `grant_sp` 发放 SP。

---

## 6. Studio 配表最小清单

在同一 Studio 项目下建议至少建 **5 个 Library**：

| 库名（示例） | 最少内容 |
|-------------|----------|
| `Skills` | ≥1 行：`id` + `name` |
| `Characters` | ≥1 角色：`name`, `hp/atk/def/spd/mp`, `skill_ids` 引用 Skills |
| `Enemies` | ≥1 敌人（Step 2 Import 用，可选） |
| `CharLevelCurve` | 至少 Lv.1 和 Lv.2 |
| `SkillLevelCurve` | 每个可升级技能 ≥1 行 |

**禁止**：在 Studio 技能 / 角色表里加 `level`、`exp`、`skill_points`、技能当前等级等养成字段。

### 示例：`CharLevelCurve`

| level | need_exp | grant_sp |
|-------|----------|----------|
| 1 | 0 | 0 |
| 2 | 100 | 1 |
| 3 | 300 | 2 |

语义：Lv.1、EXP=80，击杀 +30 → EXP=110 ≥ 100 → 升到 Lv.2，SP +1。

### 示例：`SkillLevelCurve`

| skill_id | level | cost_sp | power_bonus |
|----------|-------|---------|-------------|
| fireball | 1 | 1 | 0.1 |
| fireball | 2 | 2 | 0.2 |

语义：云端 `fireball` Lv.2 时，战斗伤害 = Studio 基础 power + 曲线加成。

完整列定义与别名见：[studio-progression-four-libraries-import-guide.md](./studio-progression-four-libraries-import-guide.md)

---

## 7. 两种使用模式

### 模式 A — 纯战斗试玩（无云端养成）

1. Step 1 用默认技能或本地导入
2. Step 2 **跳过**左侧 Character progression
3. 手动配玩家 / 敌人 → 开战

适合：测技能数值、跑批量模拟；**不保存 EXP**。

### 模式 B — 完整 EXP 养成（推荐）

1. 登录
2. Step 1 导入 Skills
3. Step 2 四库 Import → 绑定 Character → 用 SP 加点
4. Step 3 战斗胜利 → EXP 写云端 → 回 Step 2 继续

适合：验证升级曲线、SP 分配、跨设备存档。

---

## 8. Step 2 左侧面板说明

```
Character progression
├── Studio library setup（折叠）
│   ├── Characters / Skills / Level curve / Skill curve
│   └── [Import libraries]
├── 状态行：角色名 · Lv.x · EXP a/b · SP n
├── EXP 进度条
├── Character 下拉（绑定角色）
└── Skill upgrades
    └── Fireball · Lv.0  [+1 (1 SP)]
```

常见提示：

| 提示 | 含义 |
|------|------|
| Sign in to sync progression | 未登录，无法云端同步 |
| Click Import libraries to enable… | 四库已选但未点 Import |
| No skill points yet… | SP=0，需先战斗升级 |
| Insufficient skill points | SP 不够升级 |
| Import Studio libraries in step 2 first | Step 3 胜利但未在 Step 2 导入四库 |

---

## 9. 常见问题

**Q：左侧显示 Lv.1 · EXP 0 · SP 0，但没法加点？**  
A：这是账号默认云端数据。必须 **Import libraries** 并 **绑定 Character** 后，Skill upgrades 才会出现可点按钮。

**Q：打赢了没加 EXP？**  
A：检查：① 是否登录；② Step 2 是否已 Import libraries；③ 是否 **玩家胜利**；④ 同一场战斗只结算一次。

**Q：Studio 里改了技能 power，战斗会变吗？**  
A：会。Studio 配置是共享只读的；**技能加点等级**存在云端，合并后生效。

**Q：养成会写回 Studio 吗？**  
A：**不会**。EXP / SP / 技能等级只写 Supabase。

**Q：和 Economy Calculator 的 EXP 一样吗？**  
A：**不一样**。Economy 是离线经济推演；EXP 养成是 Battle + Supabase 云端存档。

---

## 10. 推荐第一次体验（约 15 分钟）

1. 启动 simulation（3001）+ studio（3000），确认 Supabase 一致
2. 在 Studio 建最小 5 库（或用已有项目）
3. 登录 simulation → Battle Step 1 导入 Skills
4. Step 2 四库 Import → 绑定角色 → 选 2～3 个技能
5. Step 3 开战至胜利 → 看到 `+50 EXP`
6. 多打几场直到升级 → 回 Step 2 用 SP 点 `+1`
7. 再开战，观察技能伤害 / MP 变化

---

## 11. 相关文档

| 文档 | 内容 |
|------|------|
| [studio-progression-four-libraries-import-guide.md](./studio-progression-four-libraries-import-guide.md) | Studio 四库列定义、别名、操作流程 |
| [superpowers/specs/2026-06-23-character-exp-skill-points-cloud-sync-design.md](./superpowers/specs/2026-06-23-character-exp-skill-points-cloud-sync-design.md) | 工程 Spec |
| `new-design.md`（monorepo 根目录） | 策划案 v2.1 |



如何使用gpt
1. 打开vpn（随云） 连接
2. 访问https://chatgpt.com/
3. 用谷歌账号登录（现在不确定是否需要手机账号登陆）
如果gpt不行（需要手机号）
用claude 地址https://claude.ai/ 其他步骤一样

如果都不行 下载codex（不确定是否能成功安装）
cmd运行pm install -g @openai/codex
用codex --version查看是否成功安装
参考https://doc.penguinsaichat.dpdns.org/的教程做
登录用生成的密钥登录（免手机号）
密钥分组选择gpt 在密钥有个界面可以直接帮你配置cc-siwtch
