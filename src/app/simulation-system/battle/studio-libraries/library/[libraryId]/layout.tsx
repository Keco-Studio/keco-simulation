'use client';

import { ReactNode } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LibraryDataProvider } from '@studio/lib/contexts/LibraryDataContext';

export default function CopiedStudioLibraryLayout({ children }: { children: ReactNode }) {
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
