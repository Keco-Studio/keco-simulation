# Battle Skill Import Empty Library & Auto Apply — Engineering Spec

> **Status:** Spec ready for implementation
> **Date:** 2026-07-02
> **Area:** Battle Step 1 skill import modal
> **Primary files:** `BattleLocalTableSkillSourcePanel.tsx`, `ImportSkillByIdBlock.tsx`, `simTablePickerData.ts`

## 1. Background

Battle Step 1 lets users import battle skills from local tables or Studio libraries. Two recent guardrails were added:

- warn when a selected import source is empty;
- warn when the user selects skills but validates before pressing the explicit add/import button.

The current behavior is too disruptive:

- selecting an empty Studio library can leave the user effectively unable to continue in the skill-selection modal, appearing like a crash or redirect to an unresolved page;
- Import by id still exposes an explicit `Add skills` step, so users can select skills, press `Validate & apply`, get a warning, and be forced back through redundant UI.

## 2. Goals

1. Selecting an empty local table or Studio library must not crash, redirect, close the modal, or reset the current import view.
2. Empty sources should produce a clear warning or empty state in-place.
3. Import by id should not require a separate Add button in modal flow.
4. When the user selects skill ids and clicks `Validate & apply`, the modal should automatically commit that selection and apply it.
5. Existing embedded/sidebar behavior should remain compatible unless it is sharing the same safer auto-commit logic.

## 3. Non-goals

- No changes to battle runtime skill resolution.
- No changes to Character progression / Step 2 four-library loading.
- No changes to Studio library schema or Supabase storage.
- No broad redesign of the skill import modal.

## 4. Current Code Shape

### 4.1 Modal shell

`BattleLocalTableSkillSourceModal` owns the footer `Validate & apply` button and calls:

```ts
panelRef.current?.applyWithPending()
```

The modal closes only when the result is `ok`.

### 4.2 Import panel

`BattleLocalTableSkillSourcePanel` supports three modal views:

- `home`
- `createAttributes`
- `createById`

It already has `applyWithPending()` intended to flush:

- a pending attribute-based draft;
- a selected-but-not-imported Import by id selection.

The failure mode is that `commitSelection()` may return `none`, then `applyWithPending()` falls through to the old warning path:

```ts
Configure and add at least one skill before applying.
```

This preserves the old two-step mental model.

### 4.3 Import by id

`ImportSkillByIdBlock` owns:

- table selection;
- id column selection;
- skill id multi-select;
- optional header mapping modal;
- commit logic via imperative `commit()`.

It currently also renders an explicit primary button with label such as `Add skills`.

## 5. Desired UX

### 5.1 Empty library/table

When the user selects a table or Studio library with no importable rows:

- remain in the current modal view;
- keep the selected table visible;
- show empty-state copy in the relevant selector area;
- do not call `onSkillsApplied`;
- do not clear existing committed drafts;
- do not close the modal;
- do not navigate.

Recommended messages:

- no columns: `No columns found in this library.`
- no ids in chosen id column: `No ids in this column.`
- validate with no selected ids: `Select at least one skill before applying.`
- validate after selecting an empty source: `This library has no skills to import.`

### 5.2 Import by id auto-apply

In modal `createById` view:

- remove the visible `Add skills` button;
- the user selects table, id column, and skill ids;
- the footer `Validate & apply` becomes enabled when there is at least one selected id;
- clicking footer Validate:
  1. commits the pending Import by id selection;
  2. handles header mapping if needed;
  3. validates the resulting drafts;
  4. applies skills and closes the modal if validation succeeds.

If header mapping is required:

- open the mapping modal;
- keep the main modal open;
- after mapping confirmation, finish importing;
- the user can press `Validate & apply` again if needed.

### 5.3 Existing committed drafts

If there are already committed drafts and the current Import by id selection is empty:

- `Validate & apply` validates existing drafts as before.

If there are no committed drafts and no pending selection:

- show `Select at least one skill before applying.`
- do not mention Add.

## 6. Design

### 6.1 Make Import by id button optional

Add a prop to `ImportSkillByIdBlock`:

```ts
showCommitButton?: boolean
```

Default: `true`, preserving embedded behavior.

In modal `createById`, pass `showCommitButton={false}`.

The imperative handle remains the source of truth for modal footer behavior:

```ts
hasPendingSelection(): boolean
commit(): Promise<{ status: 'committed' | 'interactive' | 'none'; drafts: BattleSkillDraft[] }>
```

### 6.2 Distinguish empty source from no pending work

Extend `ImportSkillByIdBlock` internal state enough to know:

- selected table has loaded;
- selected table has zero rows or selected id column has zero options;
- table load failed vs. table loaded empty.

Do not throw for empty sources. Empty is a valid selectable state.

`commit()` should return `none` for no selection, but should emit a targeted warning when a source is selected and empty.

Suggested rule:

```ts
if (tableId && idOptions.length === 0 && !idsLoading) {
  message.warning('This library has no skills to import.');
  return { status: 'none', drafts: [] };
}
```

### 6.3 Update applyWithPending warning path

Replace old Add-oriented message:

```ts
Configure and add at least one skill before applying.
```

with:

```ts
Select at least one skill before applying.
```

`applyWithPending()` should not reset `modalView` when `commit()` returns `none`.

### 6.4 Keep view stable

When table/column/id options are empty:

- do not call `setModalView('home')`;
- do not clear `tableId`;
- do not clear existing committed drafts except when user explicitly changes table/column, which already clears pending id selection.

### 6.5 Can-apply logic

The modal footer should be enabled when:

- committed drafts exist; or
- pending attribute import has an id-column binding; or
- Import by id has selected ids.

It should not become enabled merely because an empty table is selected.

This keeps empty-library validation from looking like an actionable apply state.

## 7. Error Handling

| Case | Behavior |
|------|----------|
| Studio auth unavailable | existing sign-in hint remains |
| Studio access denied | existing safe empty return remains |
| table load returns no columns | show empty column state, no crash |
| id column has no values | show empty id state, no crash |
| Validate with no committed or pending skills | warning only, modal stays open |
| selected ids missing from live rows | warn skipped ids; do not close unless at least one valid skill applies |
| duplicate selected/imported skill id | report rejection; keep modal open if none accepted |

## 8. Tests

Add focused tests around pure or near-pure behavior where possible.

Required coverage:

1. `ImportSkillByIdBlock` / modal behavior:
   - selecting skill ids and invoking `commit()` returns committed drafts without requiring button click;
   - empty loaded table/id options does not throw and returns `none`.

2. `BattleLocalTableSkillSourcePanel.applyWithPending` behavior:
   - pending Import by id selection is committed before validation;
   - no pending selection and no drafts produces the new non-Add warning.

If component tests are too heavy for the existing Vitest setup, extract small helper functions for:

- can-apply calculation;
- empty-source warning decision;
- commit button visibility default.

Then unit-test those helpers and manually verify the UI path.

## 9. Manual Verification

1. Open Battle Step 1.
2. Open `Import skills`.
3. Choose `By id (table row)`.
4. Select an empty Studio library.
5. Confirm the modal remains open and shows empty id/column state.
6. Click `Validate & apply`; confirm warning appears and modal remains in `Import by id`.
7. Select a non-empty library, id column, and one or more skill ids.
8. Click footer `Validate & apply` without pressing any Add button.
9. Confirm skills apply and the modal closes.
10. Confirm Step 1 shows imported skills.

## 10. Rollout Notes

This change removes a redundant modal action but keeps the underlying commit API intact. If embedded use still needs an explicit button, it keeps it by default. Modal flow becomes single-action: select skills, then validate.
