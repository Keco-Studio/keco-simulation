/**
 * Serialize / deserialize scratch table cell values for IndexedDB (parity with Studio value_json).
 */

import type { SimLocalColumnDef, SimTableMeta } from './types';

export function columnsFromMeta(meta: SimTableMeta): SimLocalColumnDef[] {
  if (meta.columns?.length) return meta.columns;
  return meta.columnKeys.map((key, i) => ({
    key,
    label: meta.columnLabels?.[i]?.trim() || (i === 0 ? 'name' : `Column ${i + 1}`),
    dataType: 'string' as const,
  }));
}

export function dataTypeForKey(meta: SimTableMeta, columnKey: string): SimLocalColumnDef['dataType'] {
  return columnsFromMeta(meta).find((c) => c.key === columnKey)?.dataType ?? 'string';
}

const COMPLEX_TYPES = new Set<SimLocalColumnDef['dataType']>([
  'reference',
  'boolean',
  'image',
  'file',
  'enum',
  'string_array',
  'int_array',
  'float_array',
  'formula',
  'multimedia',
  'audio',
]);

/** Persist a table cell value from LibraryAssetsTable propertyValues. */
export function propertyValueToScratchCell(
  value: unknown,
  dataType: SimLocalColumnDef['dataType'],
): unknown {
  if (value === null || value === undefined) {
    if (dataType === 'boolean') return false;
    return '';
  }
  if (COMPLEX_TYPES.has(dataType)) {
    return value;
  }
  if (dataType === 'int') {
    if (value === '') return '';
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isFinite(n) ? n : '';
  }
  if (dataType === 'float') {
    if (value === '') return '';
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : '';
  }
  if (dataType === 'date') {
    return value === '' ? '' : String(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Read a scratch cell into propertyValues for the table UI. */
export function scratchCellToPropertyValue(
  stored: unknown,
  dataType: SimLocalColumnDef['dataType'],
): unknown {
  if (stored === null || stored === undefined) {
    return dataType === 'boolean' ? false : null;
  }
  if (COMPLEX_TYPES.has(dataType)) {
    return stored;
  }
  return stored;
}

/** First-column / name display string. */
export function scratchCellDisplayString(stored: unknown): string {
  if (stored === null || stored === undefined) return '';
  if (typeof stored === 'string') return stored.trim();
  if (typeof stored === 'number' || typeof stored === 'boolean') return String(stored).trim();
  if (typeof stored === 'object') {
    const o = stored as Record<string, unknown>;
    if (typeof o.displayValue === 'string' && o.displayValue.trim()) return o.displayValue.trim();
    if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
    if (typeof o.assetId === 'string' && o.assetId.trim()) return o.assetId.trim();
  }
  return String(stored).trim();
}
