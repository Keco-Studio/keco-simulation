'use client';

import type { ReactNode } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LibraryDataProvider } from '@studio/lib/contexts/LibraryDataContext';

/** Same as studio-libraries library layout: binds LibraryDataContext for real Supabase + reference columns. */
export default function LocalTablesStudioLibraryLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const libraryId = params.libraryId as string;
  const projectId = searchParams.get('projectId')?.trim() ?? '';

  if (!libraryId || !projectId) {
    return <>{children}</>;
  }

  return (
    <LibraryDataProvider libraryId={libraryId} projectId={projectId}>
      {children}
    </LibraryDataProvider>
  );
}
