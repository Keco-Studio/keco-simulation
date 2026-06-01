/** Fired after scratch table rows are persisted to IndexedDB. */
export const SIM_LOCAL_TABLE_ROWS_UPDATED_EVENT = 'keco-sim-local-table-rows-updated';

export type SimLocalTableRowsUpdatedDetail = {
  tableId: string;
};

export function notifySimLocalTableRowsUpdated(tableId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SimLocalTableRowsUpdatedDetail>(SIM_LOCAL_TABLE_ROWS_UPDATED_EVENT, {
      detail: { tableId },
    }),
  );
}
