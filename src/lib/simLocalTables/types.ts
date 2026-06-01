/** Column schema for IndexedDB scratch tables (linked tables use Supabase field definitions). */
export type SimLocalColumnDef = {
  key: string;
  label: string;
  dataType:
    | 'string'
    | 'string_array'
    | 'int'
    | 'int_array'
    | 'float'
    | 'float_array'
    | 'boolean'
    | 'enum'
    | 'date'
    | 'image'
    | 'file'
    | 'reference'
    | 'multimedia'
    | 'audio'
    | 'formula';
  referenceLibraries?: string[];
  enumOptions?: string[];
};

/** Metadata for IndexedDB scratch tables, or a bookmark that opens a linked Studio library in the same table UI. */
export type SimTableMeta = {
  id: string;
  name: string;
  columnKeys: string[];
  /** Optional display labels aligned with columnKeys. */
  columnLabels?: string[];
  /** Scratch-only: per-column types (reference, enum, …). When absent, all columns are string. */
  columns?: SimLocalColumnDef[];
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
  /**
   * When true with studio ids set, this bookmark can switch to any library across all Studio projects
   * you have access to (picker is populated from every project). Created from “link all” flow.
   */
  studioMultiProject?: boolean;
  /** Scratch table created from the battle skill sheet column template. */
  skillSheetTemplate?: boolean;
};

export type SimTableRow = {
  id: string;
  /** Column key → cell value (strings, numbers, reference selections, etc.). */
  values: Record<string, unknown>;
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
