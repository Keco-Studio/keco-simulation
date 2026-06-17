'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import type { BattleUnitConfig } from '../lib/localTableSkillSource/battleUnitSource';
import { DEFAULT_MONSTER_STATS, DEFAULT_PLAYER_STATS } from '../types';
import type { UnitImportResult } from '../lib/battleUnitImportHistory';
import {
  listSelectableTablesForSkillPicker,
  type SelectableTableInfo,
} from '../lib/localTableSkillSource/simTablePickerData';
import { ImportUnitByIdBlock } from './ImportUnitByIdBlock';
import panelStyles from './BattleLocalTableSkillSourcePanel.module.css';
import styles from './BattleUnitImportModal.module.css';

type Props = {
  open: boolean;
  target: 'player' | 'enemy';
  fallbackConfig: BattleUnitConfig;
  onClose: () => void;
  onApply: (result: UnitImportResult) => void;
};

export function BattleUnitImportModal({
  open,
  target,
  fallbackConfig,
  onClose,
  onApply,
}: Props) {
  const supabase = useSupabase();
  const { userProfile, isAuthenticated } = useAuth();
  const supabaseReady = Boolean(supabase && isAuthenticated && userProfile?.id);

  const [tables, setTables] = useState<SelectableTableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);

  const refreshTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      setTables(
        await listSelectableTablesForSkillPicker(
          supabaseReady ? supabase : null,
          userProfile?.id,
        ),
      );
    } finally {
      setTablesLoading(false);
    }
  }, [supabase, supabaseReady, userProfile?.id]);

  useEffect(() => {
    if (open) void refreshTables();
  }, [open, refreshTables]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleImportById = useCallback(
    (result: UnitImportResult) => {
      onApply(result);
      onClose();
    },
    [onApply, onClose],
  );

  const title = target === 'player' ? 'Import player stats' : 'Import enemy stats';
  const rowImportFallback: BattleUnitConfig =
    target === 'player' ? { ...DEFAULT_PLAYER_STATS } : { ...DEFAULT_MONSTER_STATS };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="unit-import-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          {!supabaseReady ? (
            <p className={panelStyles.warnLine}>
              Sign in with the same Supabase account as Keco Studio to include project libraries.{' '}
              <Link href="/simulation-system/battle/studio-libraries">Open Studio libraries</Link>
            </p>
          ) : null}

          {tables.length === 0 && !tablesLoading ? (
            <p className={panelStyles.warnLine}>
              No tables found.{' '}
              <Link href="/simulation-system/battle/local-tables">Create a local table</Link>
            </p>
          ) : null}

          <ImportUnitByIdBlock
            tables={tables}
            tablesLoading={tablesLoading}
            supabaseReady={supabaseReady}
            fallbackConfig={rowImportFallback}
            onImport={handleImportById}
          />

          {/*
            Disabled: per-field attribute binding (table → column → value for each stat).

          <div className={styles.divider} />
          <Button type="default" block onClick={() => setView('attributes')}>
            Bind by attributes
          </Button>
          */}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

/*
  --- Commented out: bind-by-attributes flow (kept for reference) ---

import { useMemo, useState } from 'react';
import { Button, Select, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  BATTLE_UNIT_MAPPING_FIELDS,
  type BattleUnitColumnMappingKey,
} from '../lib/localTableSkillSource/battleUnitSource';
import type { LocalTableCellRef } from '../lib/localTableSkillSource/battleSkillDrafts';
import { unitFieldsToConfig } from '../lib/localTableSkillSource/importUnitRowFromTable';
import {
  loadColumnValueOptions,
  loadTableColumns,
  type PickerValueOption,
  type TableColumnInfo,
} from '../lib/localTableSkillSource/simTablePickerData';

type ModalView = 'home' | 'attributes';

function UnitFieldBindingRow({ ... }) { ... }

// attributes view: field picker, binding rows, configured tags, Apply stats button
*/
