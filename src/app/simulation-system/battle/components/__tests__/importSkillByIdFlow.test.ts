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
    expect(
      canApplySkillImport({
        draftCount: 1,
        pendingAttributeReady: false,
        importByIdSelectionCount: 0,
      }),
    ).toBe(true);
    expect(
      canApplySkillImport({
        draftCount: 0,
        pendingAttributeReady: true,
        importByIdSelectionCount: 0,
      }),
    ).toBe(true);
    expect(
      canApplySkillImport({
        draftCount: 0,
        pendingAttributeReady: false,
        importByIdSelectionCount: 2,
      }),
    ).toBe(true);
    expect(
      canApplySkillImport({
        draftCount: 0,
        pendingAttributeReady: false,
        importByIdSelectionCount: 0,
      }),
    ).toBe(false);
  });
});
