'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Modal, message } from 'antd';
import { saveBattleSkillDrafts } from '../lib/localTableSkillSource/battleSkillDrafts';
import { loadBattleSkillModulesState } from '../lib/skills/battleSkillModulesStorage';
import { resetActiveBattleSkillModuleToBuiltin, saveBattleSkillsToStorage } from '../lib/skills/battleSkillsStorage';
import {
  importSkillItemsFromArray,
  mergeImportedSkillsIntoFlatRows,
  type ImportSkillFailure,
} from '../lib/skills/battleSkillsImportExport';
import { parseBattleSkillsXlsxToSkillItems } from '../lib/skills/battleSkillsImportXlsx';
import { buildBattleSkillsXlsxBuffer, downloadBattleSkillsXlsx } from '../lib/skills/battleSkillsExportXlsx';
import { getBuiltinSkills } from '../data/skills';
import {
  collectValidSkillsFromRows,
  emptySkillFlatRow,
  skillsToFlatRows,
  type SkillFlatRow,
} from '../lib/skills/skillTableCodec';
import { AUTOSAVE_DEBOUNCE_MS, PAGE_SIZE } from './battleSkillsEditorConstants';
import { createBattleSkillsTableColumns } from './createBattleSkillsTableColumns';

export function useBattleSkillsEditor(moduleId: string) {
  const [persistReady, setPersistReady] = useState(false);
  const [rows, setRows] = useState<SkillFlatRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const lastSavedSigRef = useRef<string | null>(null);
  const pendingJumpToLastPageRef = useRef(false);
  const rowsRef = useRef(rows);
  const debounceTimerRef = useRef<number | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failures: ImportSkillFailure[];
  } | null>(null);

  rowsRef.current = rows;

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const flushSaveFlatRows = useCallback(
    (flatRows: SkillFlatRow[]) => {
      clearDebounceTimer();
      const skills = collectValidSkillsFromRows(flatRows);
      const sig = JSON.stringify(skills);
      saveBattleSkillsToStorage(moduleId, skills);
      lastSavedSigRef.current = sig;
      setLastSavedAt(Date.now());
    },
    [clearDebounceTimer, moduleId],
  );

  useEffect(() => {
    if (!moduleId) {
      setPersistReady(false);
      return;
    }
    let cancelled = false;
    setPersistReady(false);
    void loadBattleSkillModulesState().then((state) => {
      if (cancelled) return;
      const mod = state.modules.find((m) => m.id === moduleId);
      const skills = mod !== undefined ? mod.skills : getBuiltinSkills();
      const next = skills.length > 0 ? skillsToFlatRows(skills) : [];
      setRows(next);
      lastSavedSigRef.current = JSON.stringify(collectValidSkillsFromRows(next));
      setCurrentPage(1);
      setPersistReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (pendingJumpToLastPageRef.current) {
      pendingJumpToLastPageRef.current = false;
      setCurrentPage(maxPage);
      return;
    }
    setCurrentPage((p) => Math.min(p, maxPage));
  }, [rows.length]);

  useEffect(() => {
    if (!persistReady || !moduleId || lastSavedSigRef.current === null) return;

    clearDebounceTimer();
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      const flat = rowsRef.current;
      const skills = collectValidSkillsFromRows(flat);
      const sig = JSON.stringify(skills);
      if (sig === lastSavedSigRef.current) return;
      saveBattleSkillsToStorage(moduleId, skills);
      lastSavedSigRef.current = sig;
      setLastSavedAt(Date.now());
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      clearDebounceTimer();
    };
  }, [rows, clearDebounceTimer, persistReady, moduleId]);

  const updateRow = useCallback((index: number, patch: Partial<SkillFlatRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    pendingJumpToLastPageRef.current = true;
    setRows((prev) => {
      const next = [...prev, emptySkillFlatRow()];
      flushSaveFlatRows(next);
      return next;
    });
  }, [flushSaveFlatRows]);

  const removeRow = useCallback(
    (index: number) => {
      setRows((prev) => {
        const next = prev.filter((_, i) => i !== index);
        flushSaveFlatRows(next);
        return next;
      });
    },
    [flushSaveFlatRows],
  );

  const handleResetBuiltin = useCallback(() => {
    clearDebounceTimer();
    resetActiveBattleSkillModuleToBuiltin(moduleId);
    saveBattleSkillDrafts([]);
    const builtin = getBuiltinSkills();
    const flat = skillsToFlatRows(builtin);
    setRows(flat);
    lastSavedSigRef.current = JSON.stringify(builtin);
    setLastSavedAt(null);
    setCurrentPage(1);
    message.success('Restored built-in skills for this module');
  }, [clearDebounceTimer, moduleId]);

  const handleClearTable = useCallback(() => {
    Modal.confirm({
      title: 'Clear the entire table?',
      content:
        'All rows in this module will be removed and saved immediately. Add rows again or use Reset to built-in defaults.',
      okText: 'Clear',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        clearDebounceTimer();
        saveBattleSkillDrafts([]);
        setRows([]);
        flushSaveFlatRows([]);
        setCurrentPage(1);
        message.success('Table cleared');
      },
    });
  }, [clearDebounceTimer, flushSaveFlatRows]);

  const handleExportSkills = useCallback(() => {
    const skills = collectValidSkillsFromRows(rowsRef.current);
    const buf = buildBattleSkillsXlsxBuffer(skills);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-');
    downloadBattleSkillsXlsx(`battle-skills-export-${stamp}.xlsx`, buf);
    message.success(`Exported ${skills.length} valid skill(s) to Excel (.xlsx)`);
  }, []);

  const handlePickImportFile = useCallback(() => {
    importFileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (!(result instanceof ArrayBuffer)) {
          message.error('Failed to read file');
          return;
        }
        const buf = new Uint8Array(result);
        let items: unknown[];
        try {
          items = parseBattleSkillsXlsxToSkillItems(buf);
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to parse Excel');
          return;
        }
        if (items.length === 0) {
          message.error('No data rows found (need at least id and name below the header row)');
          return;
        }
        const { successes, failures } = importSkillItemsFromArray(items);

        if (successes.length > 0) {
          setRows((prev) => {
            const merged = mergeImportedSkillsIntoFlatRows(prev, successes);
            flushSaveFlatRows(merged);
            return merged;
          });
          message.success(`Imported ${successes.length} skill(s)`);
        } else if (failures.length > 0) {
          message.warning('Nothing imported; see failure reasons');
        }

        if (failures.length > 0) {
          setImportSummary({
            total: items.length,
            success: successes.length,
            failures,
          });
        } else {
          setImportSummary(null);
        }
      };
      reader.onerror = () => {
        message.error('Failed to read file');
      };
      reader.readAsArrayBuffer(file);
    },
    [flushSaveFlatRows],
  );

  const handleCloseImportSummary = useCallback(() => {
    setImportSummary(null);
  }, []);

  const columns = useMemo(
    () => createBattleSkillsTableColumns({ updateRow, removeRow, editorDisabled: !persistReady }),
    [updateRow, removeRow, persistReady],
  );

  const start = (currentPage - 1) * PAGE_SIZE;
  const dataSource = rows.slice(start, start + PAGE_SIZE).map((row, i) => ({
    ...row,
    _idx: start + i,
  }));

  return {
    persistReady,
    rows,
    currentPage,
    setCurrentPage,
    lastSavedAt,
    columns,
    dataSource,
    addRow,
    handleClearTable,
    handleResetBuiltin,
    importFileInputRef,
    importSummary,
    handleExportSkills,
    handlePickImportFile,
    handleImportFileChange,
    handleCloseImportSummary,
  };
}
