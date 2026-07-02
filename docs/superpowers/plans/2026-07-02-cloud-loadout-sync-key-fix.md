# Cloud Loadout Sync Key Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Step 2 Character progression reapplies the cloud loadout to the right-side player skill area when imported Studio skills become available or change.

**Architecture:** Extract the cloud loadout sync key into a small pure helper and include the effective skills signature in that key. `BattleCloudProgressionPanel` will use the helper instead of the current inline key.

**Tech Stack:** Next.js 16, React 18, TypeScript, Vitest.

## Global Constraints

- No spec document for this task.
- Keep behavior scoped to Step 2 loadout synchronization.
- Do not alter Step 1 skill import behavior.
- Use TDD: failing helper test before implementation.

---

### Task 1: Add Sync Key Helper

**Files:**
- Create: `src/app/simulation-system/battle/components/design/cloudLoadoutSyncKey.ts`
- Test: `src/app/simulation-system/battle/components/design/__tests__/cloudLoadoutSyncKey.test.ts`

**Interfaces:**
- Produces: `buildCloudLoadoutSyncKey(input): string | null`
- Consumes: minimal progression, skill level, and effective loadout fields.

- [ ] **Step 1: Write failing tests**

Cover:
- returns `null` when progression/effective loadout is missing;
- key changes when effective skills change from empty to populated;
- key changes when skill numeric values change.

- [ ] **Step 2: Run test and confirm failure**

Run: `npm test -- src/app/simulation-system/battle/components/design/__tests__/cloudLoadoutSyncKey.test.ts`

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement helper**

Build a stable string key from:
- `progression.characterAssetId`
- `progression.level`
- `progression.exp`
- sorted cloud skill levels
- effective character name/stats
- effective skill signatures: `id`, `name`, `power`, `mpCost`, `maxCooldown`, `cooldown`

- [ ] **Step 4: Run helper test**

Run: `npm test -- src/app/simulation-system/battle/components/design/__tests__/cloudLoadoutSyncKey.test.ts`

Expected: PASS.

### Task 2: Wire Panel

**Files:**
- Modify: `src/app/simulation-system/battle/components/design/BattleCloudProgressionPanel.tsx`

- [ ] **Step 1: Replace inline loadout key**

Import and call `buildCloudLoadoutSyncKey` from the `useMemo`.

- [ ] **Step 2: Run targeted tests**

Run:
- `npm test -- src/app/simulation-system/battle/components/design/__tests__/cloudLoadoutSyncKey.test.ts`
- `npm run build`

Expected: both pass.
