# Character EXP & Skill Points Cloud Progression — Engineering Spec

> **Status:** Spec ready for implementation plan (`writing-plans`)
> **Date:** 2026-06-23
> **Source:** [`new-design.md`](../../../../new-design.md) v2.1
> **Repos:** `keco-studio` (Layer A config + Supabase migrations), `keco-simulation` (client + battle merge)

## 1. Background & Goals

`keco-simulation` is a battle/economy simulator for designers. Today:

- **Battle skills** can be imported from Keco Studio libraries (`Import from Studio`, `importSkillRowFromTable.ts`) or edited locally (`battleSkillModulesStorage`).
- **Progression engine** (`src/lib/progression/`) supports generic contribution → reward pipelines, including legacy `proficiency` tracks.
- **No persisted character progression**: no cloud save for `level`, `exp`, skill points, or per-skill allocated levels. Login only unlocks Studio library reads.

**Product goal:** Ship a **kill-only EXP** loop and **manual skill-point allocation** loop where:

1. **Configuration** (character stats, skill definitions, level curves) lives in **keco-studio** `library_assets` — shared, designer-editable.
2. **Runtime progression** (`level`, `exp`, `skill_points`, per-skill levels) lives in **Supabase dedicated tables** — **one row per authenticated user**, RLS-isolated, syncs across devices on login.
3. **Battle** merges Studio config + cloud progression at runtime; upgrades never write back to Studio skill rows.

**Hard constraints (from design):**

| Rule | Detail |
|------|--------|
| EXP source | Kill monsters only (`BaseExp × level-diff × rate`) |
| SP source | Character level-up grants only (+ optional respec refund in P3) |
| Skill upgrade | Manual SP spend; no cast-to-proficiency, no auto skill level-up |
| Studio isolation | No `level` / `exp` / `skill_points` / `currentSkillLevel` on skill or character library rows |
| Cloud isolation | `user_id = auth.uid()` RLS; User A's skill levels never affect User B |
| Cross-device | Same Supabase account → same progression on any machine |

**Success criteria (P1):**

- [ ] Logged-in user kills enemies → `sim_user_progression.exp/level` updates in Supabase.
- [ ] Level-up grants SP to `skill_points`; user upgrades a skill → `sim_user_skill_levels` updates atomically.
- [ ] Refresh browser or switch computer → progression restored after login.
- [ ] Two users on the same Studio character template have independent skill levels.
- [ ] Studio skill `power` change + re-import → battle uses new base + existing cloud skill level bonus.
- [ ] Unauthenticated users cannot persist progression (UI gated + RLS).

## 2. Selected Architecture

### 2.1 Three-layer data model

```
Layer A — Studio config (read-only in simulation)
  Characters, Skills, char_level_curve, skill_level_curve, monster_exp
  Storage: library_assets + library_asset_values (project-shared)

Layer B — Cloud progression (read/write per user)
  sim_user_progression, sim_user_skill_levels
  Storage: Supabase (user_id PK / composite PK)

Layer C — Effective battle values (derived, in-memory)
  effectiveSkill = applyLevelBonus(studioSkill, cloudLevel, skillLevelCurve)
  effectiveCharacter = applyCharLevel(studioCharacter, cloudLevel, charLevelCurve)
```

**Rejected alternatives:**

| Option | Why rejected |
|--------|--------------|
| Store level/exp on Studio character rows | Shared row → User A upgrade visible to User B |
| localStorage / IndexedDB as primary save | No cross-device sync |
| Store skill level in `battleSkillModules` | Global module → same isolation bug |
| Proficiency auto-level from casts | Superseded by v2 SP manual allocation design |

### 2.2 Request flow

```
┌─────────────┐   Import (read)    ┌──────────────────┐
│ keco-studio │ ─────────────────► │ keco-simulation  │
│  libraries  │                    │  Studio bundle   │
└─────────────┘                    └────────┬─────────┘
                                            │ merge
┌─────────────┐   CRUD (RLS)       ┌────────▼─────────┐
│  Supabase   │ ◄────────────────► │ characterProgression│
│  sim_user_* │                    │  + BattleArena    │
└─────────────┘                    └──────────────────┘
```

## 3. Core Concepts

| Concept | Meaning | Example |
|---------|---------|---------|
| **StudioProgressionBundle** | Snapshot of Layer A config imported from Studio libraries | `{ characters, skills, charLevelCurve, skillLevelCurve }` |
| **UserProgression** | Layer B main save row | `{ userId, level: 25, exp: 1200, skillPoints: 3, characterAssetId }` |
| **UserSkillLevel** | Per-skill allocated level for one user | `{ skillId: 'fireball', level: 5, spentSp: 15 }` |
| **EffectiveSkill** | Layer C merged skill used in battle | Studio `power: 1.2` + level 5 bonus → `power: 1.8` |
| **need_exp semantics** | Exp threshold for next level | **P1:** cumulative total exp required to *reach* level N (document in curve import) |

## 4. Supabase Schema (keco-studio migrations)

**File:** `keco-studio/supabase/migrations/20260623100000_sim_user_progression.sql`

```sql
-- Main save: one row per authenticated user
create table if not exists public.sim_user_progression (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  character_asset_id   uuid references public.library_assets(id) on delete set null,
  character_library_id uuid references public.libraries(id) on delete set null,
  level                int not null default 1,
  exp                  int not null default 0,
  skill_points         int not null default 0,
  updated_at           timestamptz not null default now(),

  constraint sim_prog_level_positive check (level >= 1),
  constraint sim_prog_exp_non_negative check (exp >= 0),
  constraint sim_prog_sp_non_negative check (skill_points >= 0)
);

create table if not exists public.sim_user_skill_levels (
  user_id    uuid not null references auth.users(id) on delete cascade,
  skill_id   text not null,
  level      int not null default 0,
  spent_sp   int not null default 0,
  primary key (user_id, skill_id),

  constraint sim_skill_level_non_negative check (level >= 0),
  constraint sim_skill_spent_non_negative check (spent_sp >= 0)
);

create index if not exists idx_sim_user_skill_levels_user
  on public.sim_user_skill_levels(user_id);

alter table public.sim_user_progression enable row level security;
alter table public.sim_user_skill_levels enable row level security;

create policy "progression_select_own" on public.sim_user_progression
  for select using (auth.uid() = user_id);
create policy "progression_insert_own" on public.sim_user_progression
  for insert with check (auth.uid() = user_id);
create policy "progression_update_own" on public.sim_user_progression
  for update using (auth.uid() = user_id);

create policy "skill_levels_select_own" on public.sim_user_skill_levels
  for select using (auth.uid() = user_id);
create policy "skill_levels_insert_own" on public.sim_user_skill_levels
  for insert with check (auth.uid() = user_id);
create policy "skill_levels_update_own" on public.sim_user_skill_levels
  for update using (auth.uid() = user_id);
create policy "skill_levels_delete_own" on public.sim_user_skill_levels
  for delete using (auth.uid() = user_id);
```

### 4.1 RPC: atomic skill upgrade (P1)

```sql
create or replace function public.sim_upgrade_skill(p_skill_id text, p_cost_sp int)
returns public.sim_user_skill_levels
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prog public.sim_user_progression;
  v_row public.sim_user_skill_levels;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_cost_sp < 1 then raise exception 'invalid cost'; end if;

  select * into v_prog from sim_user_progression where user_id = v_uid for update;
  if not found or v_prog.skill_points < p_cost_sp then
    raise exception 'insufficient skill points';
  end if;

  update sim_user_progression
    set skill_points = skill_points - p_cost_sp, updated_at = now()
    where user_id = v_uid;

  insert into sim_user_skill_levels (user_id, skill_id, level, spent_sp)
    values (v_uid, p_skill_id, 1, p_cost_sp)
    on conflict (user_id, skill_id) do update
      set level = sim_user_skill_levels.level + 1,
          spent_sp = sim_user_skill_levels.spent_sp + p_cost_sp
    returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.sim_upgrade_skill(text, int) from public;
grant execute on function public.sim_upgrade_skill(text, int) to authenticated;
```

**P2 hardening:** validate `p_cost_sp` server-side against a config snapshot table; P1 trusts client-calculated cost from imported `skill_level_curve`.

## 5. Studio Library Schemas (Layer A)

Designers create these libraries in a Studio project. Simulation imports them read-only. **No runtime progression columns.**

### 5.1 Characters library

| Column key | `data_type` | Required | Notes |
|------------|-------------|:--------:|-------|
| `character_id` | string | yes | Stable business id |
| `name` | string | yes | Display name |
| `hp` | int | no | Lv.1 base HP |
| `atk` | int | no | Attack |
| `def` | int | no | Defense |
| `spd` | int | no | Speed |
| `mp` | int | no | Mana |
| `skill_ids` | reference → Skills | no | Initial skill list |
| `portrait` | image | no | Optional |

**Forbidden columns:** `level`, `exp`, `skill_points`, any per-skill current level.

### 5.2 Skills library

Align with existing battle skill **17 fields** (`id`, `name`, `type`, `power`, `mpCost`, `maxCooldown`, …). See `keco-simulation-battle-poc-import-data-field-statistics.md` §2.

Reuse `importSkillRowFromTable.ts` / `BATTLE_SKILL_MAPPING_FIELDS` header aliases.

**Forbidden column:** `level`.

### 5.3 char_level_curve library

| Column key | Type | Notes |
|------------|------|-------|
| `level` | int | Character level (1..max) |
| `need_exp` | int | Cumulative exp required to reach this level |
| `grant_sp` | int | SP granted when reaching this level |

### 5.4 skill_level_curve library

| Column key | Type | Notes |
|------------|------|-------|
| `skill_id` | string | Matches Skills.id |
| `level` | int | Target skill level (1..N) |
| `cost_sp` | int | SP to upgrade *to* this level |
| `power_bonus` | float | Optional damage multiplier addend |
| `mp_cost_delta` | int | Optional MP change |
| `cooldown_delta` | int | Optional cooldown change |

### 5.5 Optional P2 libraries

- `monster_exp`: `monster_id`, `base_exp`, `monster_type`
- `skill_unlock`: `skill_id`, `unlock_char_level`, `prerequisite_skill_id`, `prerequisite_level`

### 5.6 Studio column registry (simulation)

Add constants mirroring `PROGRESSION_TRACK_COLUMNS` pattern:

**File:** `src/lib/characterProgression/studio/columnKeys.ts`

```typescript
export const CHARACTER_COLUMNS = ['character_id', 'name', 'hp', 'atk', 'def', 'spd', 'mp', 'skill_ids'] as const;
export const CHAR_LEVEL_CURVE_COLUMNS = ['level', 'need_exp', 'grant_sp'] as const;
export const SKILL_LEVEL_CURVE_COLUMNS = ['skill_id', 'level', 'cost_sp', 'power_bonus', 'mp_cost_delta', 'cooldown_delta'] as const;
```

## 6. TypeScript Data Model (keco-simulation)

**Directory:** `src/lib/characterProgression/` (pure logic + Supabase adapters, no React).

```typescript
// types.ts
export interface UserProgression {
  userId: string;
  characterAssetId: string | null;
  characterLibraryId: string | null;
  level: number;
  exp: number;
  skillPoints: number;
  updatedAt: string; // ISO
}

export interface UserSkillLevel {
  skillId: string;
  level: number;
  spentSp: number;
}

export interface StudioCharacterRow {
  assetId: string;
  characterId: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mp: number;
  skillIds: string[];
}

export interface CharLevelCurveRow {
  level: number;
  needExp: number;
  grantSp: number;
}

export interface SkillLevelCurveRow {
  skillId: string;
  level: number;
  costSp: number;
  powerBonus?: number;
  mpCostDelta?: number;
  cooldownDelta?: number;
}

export interface StudioProgressionBundle {
  characters: Record<string, StudioCharacterRow>; // keyed by assetId
  skills: Record<string, import('@/app/simulation-system/battle/types').Skill>;
  charLevelCurve: CharLevelCurveRow[];
  skillLevelCurve: SkillLevelCurveRow[];
}

export interface ApplyBattleExpResult {
  progression: UserProgression;
  leveledUp: boolean;
  levelsGained: number;
  spGranted: number;
  expGained: number;
}

export interface EffectiveBattleLoadout {
  character: {
    name: string;
    stats: { maxHp: number; atk: number; def: number; spd: number; maxMp: number };
    level: number;
    exp: number;
    skillPoints: number;
  };
  skills: import('@/app/simulation-system/battle/types').Skill[];
  skillLevels: Record<string, number>;
}
```

## 7. Pure Functions (testable core)

**File:** `src/lib/characterProgression/merge.ts`

```typescript
/** Apply skill level curve row onto base Studio skill definition. */
export function applyLevelBonus(
  base: Skill,
  skillLevel: number,
  curveByLevel: Map<number, SkillLevelCurveRow>
): Skill;

/** Apply character level to base Studio stats (P1: optional stat scaling hook; min pass-through). */
export function applyCharLevel(
  base: StudioCharacterRow,
  charLevel: number,
  curve: CharLevelCurveRow[]
): { maxHp: number; atk: number; def: number; spd: number; maxMp: number };

/** Compute exp after kills with level-diff modifier (pure). */
export function calcKillExp(input: {
  baseExp: number;
  playerLevel: number;
  monsterLevel: number;
  expRateMultiplier?: number;
}): number;

/** Apply gained exp in-memory; returns new progression + meta. */
export function accrueCharacterExp(
  prog: Pick<UserProgression, 'level' | 'exp' | 'skillPoints'>,
  gainedExp: number,
  curve: CharLevelCurveRow[]
): { progression: typeof prog; leveledUp: boolean; levelsGained: number; spGranted: number };

/** Resolve SP cost to upgrade skill from currentLevel → currentLevel+1. */
export function resolveUpgradeCost(
  skillId: string,
  currentLevel: number,
  curve: SkillLevelCurveRow[]
): number | null;

/** Build effective loadout for BattleArena. */
export function buildEffectiveLoadout(input: {
  progression: UserProgression;
  skillLevels: UserSkillLevel[];
  studio: StudioProgressionBundle;
}): EffectiveBattleLoadout;
```

**P1 stat scaling:** `applyCharLevel` may return base stats unchanged if char level only gates unlocks; document choice in implementation plan.

## 8. Supabase Storage Layer

**File:** `src/lib/characterProgression/supabaseProgressionStorage.ts`

Uses `@studio/lib/useSupabaseClient` / `SupabaseClient` from existing `StudioRuntimeProviders` on battle routes.

```typescript
export async function loadUserProgression(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProgression | null>;

export async function ensureUserProgression(
  supabase: SupabaseClient,
  userId: string,
  bind: { characterAssetId: string; characterLibraryId: string }
): Promise<UserProgression>;

export async function applyBattleExp(
  supabase: SupabaseClient,
  userId: string,
  gainedExp: number,
  curve: CharLevelCurveRow[],
  expectedUpdatedAt?: string
): Promise<ApplyBattleExpResult>;

export async function upgradeSkill(
  supabase: SupabaseClient,
  skillId: string,
  costSp: number
): Promise<UserSkillLevel>;

export async function listUserSkillLevels(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSkillLevel[]>;

export async function bindCharacter(
  supabase: SupabaseClient,
  userId: string,
  characterAssetId: string,
  characterLibraryId: string
): Promise<UserProgression>;
```

**Concurrency (P1):** `applyBattleExp` uses `updated_at` optimistic check — if update affects 0 rows, reload and retry once.

## 9. Studio Import Layer

**File:** `src/lib/characterProgression/studio/importStudioProgressionBundle.ts`

Pattern: extend `loadProgressionConfigFromStudio.ts` + `getLibraryAssetsWithProperties` from `@studio/lib/services/libraryAssetsService`.

```typescript
export interface StudioLibraryBinding {
  projectId: string;
  charactersLibraryId: string;
  skillsLibraryId: string;
  charLevelCurveLibraryId: string;
  skillLevelCurveLibraryId: string;
}

export async function importStudioProgressionBundle(
  supabase: SupabaseClient,
  binding: StudioLibraryBinding
): Promise<StudioProgressionBundle>;
```

**Skill import:** delegate row → `Skill` mapping to existing `importSkillRowFromTable` / `draftToFlatRow` pipeline.

**Character import:** new mapper `mapStudioRowToCharacter(row, fieldIds)` — resolve `skill_ids` reference column via `normalizeReferenceSelections`.

**Persistence of binding:** `localStorage` key `keco-sim:progression-studio-binding:v1` (library IDs only, not progression).

## 10. Battle Integration

### 10.1 Entry points

| Location | Change |
|----------|--------|
| `BattleArena.tsx` | Accept optional `cloudProgression?: EffectiveBattleLoadout` or build from hook |
| Battle wizard / design battle page | Require login for progression-enabled battles |
| `useBattleProgressionRuntime.ts` | **P1:** keep for contribution export; **separate** from cloud EXP (do not double-apply) |
| `battleProgressionSource` | Add `source: 'cloud'` mode that writes kill exp via `applyBattleExp` on `battle_ended` |

### 10.2 Kill EXP hook

On `battle_ended` when player wins and `progressionSource.mode === 'cloud'`:

1. Sum kill contributions from session (enemy level + monster_exp table lookup).
2. `calcKillExp` per kill → total `gainedExp`.
3. `applyBattleExp(supabase, userId, gainedExp, curve)`.
4. Emit UI: yellow float (exp), purple modal on level-up (+SP).

**Do not** emit proficiency grants in cloud mode.

### 10.3 BattleArenaConfig wiring

```typescript
// Existing BattleArenaConfig.playerStats / skills populated from:
const loadout = buildEffectiveLoadout({ progression, skillLevels, studio });
config.playerStats = { maxHp, atk, def, spd: loadout.character.stats.spd };
config.skills = loadout.skills;
config.playerSkillIds = loadout.skills.map(s => s.id);
```

## 11. UI & Routes

### 11.1 New route

`src/app/simulation-system/character-progression/`

| Page | Purpose |
|------|---------|
| `page.tsx` | Hub: login gate, bind Studio libraries, pick character, show level/exp/SP |
| `skills/page.tsx` | Skill list with upgrade buttons (calls `sim_upgrade_skill`) |

Add hub card on `simulation-system/page.tsx`: **Character Progression**.

### 11.2 Login gate

Reuse `useSupabase` + `userProfile` from `@studio/lib/SupabaseContext` (already on battle routes via `StudioRuntimeProviders`).

- Not logged in → show sign-in prompt; disable SP upgrade and cloud EXP persistence.
- Logged in → load `sim_user_progression` on mount.

### 11.3 Copy (English per `english-simulation.mdc`)

- "Sign in to sync progression across devices"
- "Insufficient skill points"
- "Level up! You gained {n} skill points"
- "{skillName} upgraded to Lv.{n}"

## 12. File Structure (locked)

```
keco-studio/
  supabase/migrations/
    20260623100000_sim_user_progression.sql

keco-simulation/
  src/lib/characterProgression/
    types.ts
    merge.ts                          # applyLevelBonus, accrueCharacterExp, buildEffectiveLoadout
    supabaseProgressionStorage.ts
    studio/
      columnKeys.ts
      importStudioProgressionBundle.ts
      mapStudioRowToCharacter.ts
    __tests__/
      merge.test.ts
      accrueCharacterExp.test.ts
      calcKillExp.test.ts

  src/app/simulation-system/character-progression/
    page.tsx
    layout.tsx
    skills/page.tsx
    components/
      CharacterBindPanel.tsx          # Studio library picker + character row select
      ProgressionStatusCard.tsx       # level, exp bar, SP
      SkillUpgradePanel.tsx
    lib/
      useCloudProgression.ts            # React hook: load/save progression
      progressionStudioBindingStorage.ts

  src/app/simulation-system/battle/
    lib/progression/
      cloudBattleProgression.ts         # battle_ended → applyBattleExp adapter
```

## 13. EXP Formula (P1 scope)

```typescript
// Level diff: Δ = monsterLevel - playerLevel
// multiplier:
//   Δ > 0: min(1.5, 1 + Δ * 0.05)   // over-level bonus, capped
//   Δ < 0: max(0.05, 1 + Δ * 0.15)  // under-level decay
//   Δ === 0: 1
// floor: max(1, round(baseExp * multiplier * expRateMultiplier))
```

**P1 non-goals:** daily cap, same-monster streak decay, death penalty, level breakthrough (30/60/90) — stub hooks only.

## 14. Progression Engine Relationship

Existing `src/lib/progression/` remains for **designer simulation / charts**.

| Track | P1 | P2 |
|-------|----|----|
| `exp_level` / `char_exp` | Keep for synthetic simulate | Optional: feed from cloud curve import |
| `prof_{skillId}` proficiency | **Disable in cloud battle mode** | Mark legacy in defaults |
| `char_sp` custom track | — | Add for offline SP projection simulate |

Cloud battle path **does not** run `simulate()` per kill; it writes directly to Supabase. Progression page may later import battle contributions for charts only.

## 15. Test Strategy (TDD)

| File | Cases |
|------|-------|
| `merge.test.ts` | `applyLevelBonus` stacks power_bonus; level 0 = base skill |
| `accrueCharacterExp.test.ts` | single level-up, multi level-up, SP grant sum, max level cap |
| `calcKillExp.test.ts` | over-level cap, under-level floor 1, rate multiplier |
| `resolveUpgradeCost.test.ts` | missing curve row → null |
| `buildEffectiveLoadout.test.ts` | orphan skill level ignored; missing character asset throws |
| `supabaseProgressionStorage.test.ts` | mock Supabase client: ensure insert, optimistic lock retry |

**Integration (manual P1):** two browser profiles, same character template, independent upgrades.

## 16. Phased Delivery

### P1 (this spec)

- Supabase migration + RPC
- Pure merge/accrue functions + unit tests
- Studio bundle import (Characters, Skills, both curves)
- `character-progression` UI: bind character, show status, upgrade skills
- Battle cloud mode: kill EXP → Supabase
- Login gate + RLS verification

### P2

- `monster_exp` / `skill_unlock` Studio libraries
- Progression simulate SP track
- Server-side `p_cost_sp` validation
- Optimistic lock polish for multi-tab

### P3

- Level breakthrough, respec/refund, daily exp cap
- Offline cache merge
- JSON backup export

## 17. Non-Goals (YAGNI for P1)

- Multi-character slots per user (one `sim_user_progression` row per user only)
- Writing progression into `library_asset_values`
- Proficiency-from-casts in cloud mode
- PVP exp steal / death penalty
- Studio schema migration tooling (manual library setup + docs)

## 18. Migration & Compatibility

| Legacy | Action |
|--------|--------|
| `battleSkillModules` local skills | Remain as fallback when Studio binding unset |
| `progressionStorage` localStorage | Unchanged; rules/simulate only |
| Proficiency tracks in defaults | Set `enabled: false` for cloud battle profile |

## 19. Acceptance Checklist (P1)

- [ ] Login → kill enemies → `sim_user_progression` updates in Supabase dashboard
- [ ] Level-up increases `skill_points` per `char_level_curve.grant_sp`
- [ ] Skill upgrade decreases `skill_points`, increases `sim_user_skill_levels.level`
- [ ] Second browser + same account → same numbers after refresh
- [ ] User B does not see User A's skill levels
- [ ] Studio Skills row `power` edit + re-import → battle damage reflects new base + cloud level
- [ ] No `level` column written to any Studio library row
- [ ] `sim_upgrade_skill` double-click does not drive `skill_points` negative
- [ ] Logged-out user cannot call write RPC successfully

## 20. References

- Design doc: [`new-design.md`](../../../../new-design.md)
- Skill field inventory: [`keco-simulation-battle-poc-import-data-field-statistics.md`](../../../../keco-simulation-battle-poc-import-data-field-statistics.md)
- Existing progression engine spec: [`2026-06-20-progression-feedback-system-design.md`](./2026-06-20-progression-feedback-system-design.md)
- Studio import pattern: `src/lib/progression/studio/loadProgressionConfigFromStudio.ts`
- Skill row import: `src/app/simulation-system/battle/lib/localTableSkillSource/importSkillRowFromTable.ts`
- Repo boundary: `keco-simulation/.cursor/rules/keco-simulation-vs-keco-studio.mdc`

---

**Next step:** Run `writing-plans` → `docs/superpowers/plans/2026-06-23-character-exp-skill-points-cloud-sync.md`
