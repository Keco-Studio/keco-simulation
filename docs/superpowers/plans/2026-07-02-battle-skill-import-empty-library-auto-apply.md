# Battle Skill Import Empty Library Auto Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Battle Step 1 skill import stable for empty libraries and allow modal Import by id users to select skills then use `Validate & apply` without an extra Add button.

**Architecture:** Keep the existing modal/panel split. Add small pure helpers for empty-source warning and apply enablement, then wire them into `ImportSkillByIdBlock` and `BattleLocalTableSkillSourcePanel`.

**Tech Stack:** Next.js 16, React 18, TypeScript, Ant Design, Vitest.

## Global Constraints

- Empty Studio/local sources must not crash, redirect, close the modal, or reset the current import view.
- Modal Import by id must hide the visible Add button.
- Footer `Validate & apply` must auto-commit pending Import by id selections.
- Existing embedded/sidebar behavior keeps its explicit commit button by default.
- Do not change battle runtime skill resolution or Step 2 Character progression.

---

### Task 1: Extract Import Flow Helpers

**Files:**
- Create: `src/app/simulation-system/battle/components/importSkillByIdFlow.ts`
- Test: `src/app/simulation-system/battle/components/__tests__/importSkillByIdFlow.test.ts`

**Interfaces:**
- Produces: `shouldWarnEmptyImportSource(input): boolean`
- Produces: `importByIdEmptySourceMessage = 'This library has no skills to import.'`
- Produces: `canApplySkillImport(input): boolean`

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  canApplySkillImport,
  importByIdEmptySourceMessage,
  shouldWarnEmptyImportSource,
} from '../importSkillByIdFlow';

describe('importSkillByIdFlow', () => {
  it('warns only after an import source has loaded empty options', () => {
    expect(
      shouldWarnEmptyImportSource({
        tableSelected: true,
        tableLoading: false,
        idsLoading: false,
        columnCount: 1,
        idOptionCount: 0,
      }),
    ).toBe(true);
    expect(importByIdEmptySourceMessage).toBe('This library has no skills to import.');
  });

  it('does not warn while the table or ids are still loading', () => {
    expect(
      shouldWarnEmptyImportSource({
        tableSelected: true,
        tableLoading: true,
        idsLoading: false,
        columnCount: 0,
        idOptionCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldWarnEmptyImportSource({
        tableSelected: true,
        tableLoading: false,
        idsLoading: true,
        columnCount: 1,
        idOptionCount: 0,
      }),
    ).toBe(false);
  });

  it('enables apply for committed drafts, pending attributes, or selected import-by-id rows', () => {
    expect(canApplySkillImport({ draftCount: 1, pendingAttributeReady: false, importByIdSelectionCount: 0 })).toBe(true);
    expect(canApplySkillImport({ draftCount: 0, pendingAttributeReady: true, importByIdSelectionCount: 0 })).toBe(true);
    expect(canApplySkillImport({ draftCount: 0, pendingAttributeReady: false, importByIdSelectionCount: 2 })).toBe(true);
    expect(canApplySkillImport({ draftCount: 0, pendingAttributeReady: false, importByIdSelectionCount: 0 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/simulation-system/battle/components/__tests__/importSkillByIdFlow.test.ts`

Expected: FAIL because `importSkillByIdFlow` does not exist.

- [ ] **Step 3: Implement minimal helpers**

```ts
export const importByIdEmptySourceMessage = 'This library has no skills to import.';

export function shouldWarnEmptyImportSource(input: {
  tableSelected: boolean;
  tableLoading: boolean;
  idsLoading: boolean;
  columnCount: number;
  idOptionCount: number;
}): boolean {
  if (!input.tableSelected || input.tableLoading || input.idsLoading) return false;
  return input.columnCount === 0 || input.idOptionCount === 0;
}

export function canApplySkillImport(input: {
  draftCount: number;
  pendingAttributeReady: boolean;
  importByIdSelectionCount: number;
}): boolean {
  return (
    input.draftCount > 0 ||
    input.pendingAttributeReady ||
    input.importByIdSelectionCount > 0
  );
}
```

- [ ] **Step 4: Run helper test to verify pass**

Run: `npm test -- src/app/simulation-system/battle/components/__tests__/importSkillByIdFlow.test.ts`

Expected: PASS.

### Task 2: Wire Auto-Apply and Empty-Source Handling

**Files:**
- Modify: `src/app/simulation-system/battle/components/ImportSkillByIdBlock.tsx`
- Modify: `src/app/simulation-system/battle/components/BattleLocalTableSkillSourcePanel.tsx`

**Interfaces:**
- Consumes helpers from Task 1.
- Produces optional prop `showCommitButton?: boolean` on `ImportSkillByIdBlock`.

- [ ] **Step 1: Hide commit button in modal create-by-id**

In `ImportSkillByIdBlock` props, add:

```ts
showCommitButton?: boolean;
```

Default it to `true`, and wrap the primary button with:

```tsx
{showCommitButton ? (
  <Button ...>
    ...
  </Button>
) : null}
```

In `BattleLocalTableSkillSourcePanel` modal `createById` usage, pass:

```tsx
showCommitButton={false}
```

- [ ] **Step 2: Use helper for empty-source warning**

In `ImportSkillByIdBlock`, import:

```ts
import {
  importByIdEmptySourceMessage,
  shouldWarnEmptyImportSource,
} from './importSkillByIdFlow';
```

At the start of `commitSelection`, before returning `none` for missing selected ids, add:

```ts
if (
  selectedIds.length === 0 &&
  shouldWarnEmptyImportSource({
    tableSelected: Boolean(tableId),
    tableLoading,
    idsLoading,
    columnCount: columns.length,
    idOptionCount: idOptions.length,
  })
) {
  message.warning(importByIdEmptySourceMessage);
  return { status: 'none', drafts: [] };
}
```

- [ ] **Step 3: Use helper for can-apply and update warning copy**

In `BattleLocalTableSkillSourcePanel`, import:

```ts
import { canApplySkillImport } from './importSkillByIdFlow';
```

Replace inline can-apply calculation with:

```ts
const canApply = canApplySkillImport({
  draftCount: drafts.length,
  pendingAttributeReady,
  importByIdSelectionCount,
});
```

Replace:

```ts
message.warning('Configure and add at least one skill before applying.');
```

with:

```ts
message.warning('Select at least one skill before applying.');
```

- [ ] **Step 4: Run targeted tests**

Run: `npm test -- src/app/simulation-system/battle/components/__tests__/importSkillByIdFlow.test.ts`

Expected: PASS.

### Task 3: Verification

**Files:**
- No code changes unless verification catches an issue.

- [ ] **Step 1: Run TypeScript build check**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Inspect diff**

Run: `git diff -- src/app/simulation-system/battle/components/ImportSkillByIdBlock.tsx src/app/simulation-system/battle/components/BattleLocalTableSkillSourcePanel.tsx src/app/simulation-system/battle/components/importSkillByIdFlow.ts src/app/simulation-system/battle/components/__tests__/importSkillByIdFlow.test.ts`

Expected: Diff only covers helper, tests, hidden modal button, warning behavior, and can-apply wiring.
