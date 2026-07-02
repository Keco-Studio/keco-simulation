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
