/**
 * IndexedDB persistence for simulation-local scratch tables (optional legacy write-back queue store).
 */

import type { SimTableMeta, SimTableRow, WriteBackQueueItem } from './types';

const DB_NAME = 'keco-simulation-sim-local-tables-v1';
const DB_VERSION = 1;
const STORE_META = 'tableMeta';
const STORE_ROWS = 'tableRows';
const STORE_QUEUE = 'writeBackQueue';

let dbPromise: Promise<IDBDatabase> | null = null;

function resetDb(): void {
  dbPromise = null;
}

/** Coerce persisted rows from older builds (e.g. reference_studio + studio ids) into current shape. */
function coerceMeta(raw: unknown): SimTableMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  if (!id) return null;
  const name = typeof r.name === 'string' && r.name.trim() ? r.name : 'Untitled table';
  const columnKeys = Array.isArray(r.columnKeys)
    ? (r.columnKeys as unknown[]).filter((k): k is string => typeof k === 'string')
    : [];
  const columnLabels = Array.isArray(r.columnLabels)
    ? (r.columnLabels as unknown[]).filter((k): k is string => typeof k === 'string')
    : undefined;
  const studioProjectId =
    typeof r.studioProjectId === 'string' && r.studioProjectId.trim() ? r.studioProjectId.trim() : undefined;
  const studioLibraryId =
    typeof r.studioLibraryId === 'string' && r.studioLibraryId.trim() ? r.studioLibraryId.trim() : undefined;
  return {
    id,
    name,
    columnKeys,
    columnLabels: columnLabels?.length ? columnLabels : undefined,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Number(r.createdAt) || 0,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Number(r.updatedAt) || 0,
    dirty: Boolean(r.dirty),
    studioProjectId,
    studioLibraryId,
  };
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => {
      resetDb();
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ROWS)) {
        db.createObjectStore(STORE_ROWS, { keyPath: 'tableId' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
  });
  return dbPromise;
}

export async function listTableMetas(): Promise<SimTableMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const getAll = store.getAll();
    getAll.onerror = () => reject(getAll.error ?? new Error('listTableMetas failed'));
    getAll.onsuccess = () => {
      const rows = (getAll.result as unknown[]) ?? [];
      resolve(rows.map((x) => coerceMeta(x)).filter((m): m is SimTableMeta => m != null));
    };
  });
}

export async function getTableMeta(id: string): Promise<SimTableMeta | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).get(id);
    req.onerror = () => reject(req.error ?? new Error('getTableMeta failed'));
    req.onsuccess = () => resolve(coerceMeta(req.result));
  });
}

export async function putTableMeta(meta: SimTableMeta): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('putTableMeta failed'));
  });
}

export async function deleteTableCascade(tableId: string): Promise<void> {
  const pending = (await listWriteBackQueue()).filter((q) => q.tableId === tableId).map((q) => q.id);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_META, STORE_ROWS, STORE_QUEUE], 'readwrite');
    tx.objectStore(STORE_META).delete(tableId);
    tx.objectStore(STORE_ROWS).delete(tableId);
    const qStore = tx.objectStore(STORE_QUEUE);
    for (const qid of pending) {
      qStore.delete(qid);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('deleteTableCascade failed'));
  });
}

export type TableRowsRecord = { tableId: string; rows: SimTableRow[] };

export async function getTableRows(tableId: string): Promise<SimTableRow[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ROWS, 'readonly');
    const req = tx.objectStore(STORE_ROWS).get(tableId);
    req.onerror = () => reject(req.error ?? new Error('getTableRows failed'));
    req.onsuccess = () => {
      const rec = req.result as TableRowsRecord | undefined;
      resolve(rec?.rows ?? []);
    };
  });
}

export async function putTableRows(tableId: string, rows: SimTableRow[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ROWS, 'readwrite');
    tx.objectStore(STORE_ROWS).put({ tableId, rows });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('putTableRows failed'));
  });
}

export async function listWriteBackQueue(): Promise<WriteBackQueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onerror = () => reject(req.error ?? new Error('listWriteBackQueue failed'));
    req.onsuccess = () => resolve((req.result as WriteBackQueueItem[]) ?? []);
  });
}

export async function enqueueWriteBack(item: WriteBackQueueItem): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('enqueueWriteBack failed'));
  });
}

export async function removeWriteBackItem(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('removeWriteBackItem failed'));
  });
}
