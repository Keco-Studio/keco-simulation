'use client';

import { Suspense } from 'react';
import { StudioRuntimeProviders } from '@/components/simulation/StudioRuntimeProviders';

export default function StudioLibrariesLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioRuntimeProviders>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>{children}</Suspense>
    </StudioRuntimeProviders>
  );
}
