'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, Spin } from 'antd';
import { BookOutlined, FolderOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import { listFolders } from '@studio/lib/services/folderService';
import { listLibraries } from '@studio/lib/services/libraryService';
import { listProjects } from '@studio/lib/services/projectService';
import styles from './StudioSyncModal.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onSynced?: () => void;
};

export function StudioSyncModal({ open, onClose, onSynced }: Props) {
  const router = useRouter();
  const supabase = useSupabase();
  const { userProfile, isAuthenticated } = useAuth();
  const [projectId, setProjectId] = useState<string>();
  const [folderId, setFolderId] = useState<string>();
  const [libraryId, setLibraryId] = useState<string>();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['syncModalProjects', userProfile?.id],
    queryFn: () => listProjects(supabase, userProfile!.id),
    enabled: open && Boolean(isAuthenticated && userProfile?.id),
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['syncModalFolders', projectId],
    queryFn: () => listFolders(supabase, projectId!),
    enabled: open && Boolean(projectId),
  });

  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['syncModalLibraries', projectId, folderId],
    queryFn: () => listLibraries(supabase, projectId!, folderId),
    enabled: open && Boolean(projectId),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (projects.length === 1 && !projectId) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (folders.length === 1 && !folderId) setFolderId(folders[0].id);
  }, [folders, folderId]);

  useEffect(() => {
    if (libraries.length === 1 && !libraryId) setLibraryId(libraries[0].id);
  }, [libraries, libraryId]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name || p.id })),
    [projects],
  );

  const folderOptions = useMemo(
    () => folders.map((f) => ({ value: f.id, label: f.name || f.id })),
    [folders],
  );

  const libraryOptions = useMemo(
    () =>
      libraries
        .filter((lib) => !folderId || lib.folder_id === folderId || !lib.folder_id)
        .map((lib) => ({ value: lib.id, label: lib.name || lib.id })),
    [libraries, folderId],
  );

  if (!open || typeof document === 'undefined') return null;

  const handleSync = () => {
    if (!projectId || !libraryId) return;
    onSynced?.();
    onClose();
    router.push(
      `/simulation-system/battle/studio-libraries/library/${encodeURIComponent(libraryId)}?projectId=${encodeURIComponent(projectId)}`,
    );
  };

  return createPortal(
    <>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
        <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="sync-modal-title" className={styles.title}>
          Select a library to sync
        </h2>

        {!isAuthenticated ? (
          <p className={styles.error}>Sign in first to sync from Keco Studio.</p>
        ) : null}

        {projectsLoading ? (
          <Spin />
        ) : (
          <>
            {projects.length > 1 ? (
              <div className={styles.field}>
                <span className={styles.label}>Project</span>
                <Select
                  className={styles.select}
                  placeholder="Select project"
                  value={projectId}
                  onChange={(v) => {
                    setProjectId(v);
                    setFolderId(undefined);
                    setLibraryId(undefined);
                  }}
                  options={projectOptions}
                />
              </div>
            ) : null}

            <div className={styles.field}>
              <span className={styles.label}>Select a folder</span>
              <Select
                className={styles.select}
                placeholder="Select a folder"
                loading={foldersLoading}
                value={folderId}
                onChange={(v) => {
                  setFolderId(v);
                  setLibraryId(undefined);
                }}
                options={folderOptions}
                suffixIcon={<FolderOutlined />}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Select a library</span>
              <Select
                className={styles.select}
                placeholder="Select a library"
                loading={librariesLoading}
                value={libraryId}
                onChange={setLibraryId}
                options={libraryOptions}
                suffixIcon={<BookOutlined />}
              />
            </div>

            <p className={styles.hint}>
              Opens the library in the simulator. Bind skills via Configure skills, then Validate &amp; apply.
            </p>

            <button
              type="button"
              className={styles.syncBtn}
              disabled={!projectId || !libraryId}
              onClick={handleSync}
            >
              Sync
            </button>
          </>
        )}

        <p className={styles.footer}>
          Don&apos;t have an account? <Link href="/simulation-system/battle/studio-libraries" className={styles.footerLink}>Sign Up Now</Link>
        </p>
      </div>
    </>,
    document.body,
  );
}
