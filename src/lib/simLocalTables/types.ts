/** Metadata for IndexedDB scratch tables, or a bookmark that opens a linked Studio library in the same table UI. */
export type SimTableMeta = {
  id: string;
  name: string;
  columnKeys: string[];
  /** Optional display labels aligned with columnKeys. */
  columnLabels?: string[];
  createdAt: number;
  updatedAt: number;
  /** Local edits hint (optional). */
  dirty?: boolean;
  /**
   * When both are set, this entry edits that Studio library in-place (schema + rows from Supabase; reference columns work).
   * The editor should keep `?projectId=` and `?libraryId=` in the URL so Studio table helpers resolve context.
   */
  studioProjectId?: string;
  studioLibraryId?: string;
};

export type SimTableRow = {
  id: string;
  /** Column key → cell string (stable keys, display names separate). */
  values: Record<string, string>;
};

/** Legacy queue payloads (DB v1); no longer produced from UI. */
export type WriteBackQueueItem = {
  id: string;
  tableId: string;
  enqueuedAt: number;
  payload: {
    projectId: string;
    libraryId: string;
    rows: SimTableRow[];
    columnKeys: string[];
  };
};
