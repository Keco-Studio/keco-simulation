'use client';

import { Suspense } from 'react';
import { StudioRuntimeProviders } from '@/components/simulation/StudioRuntimeProviders';
import { SimLocalTablesBreadcrumb } from '../components/SimLocalTablesBreadcrumb';

export default function LocalTablesLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioRuntimeProviders>
      <SimLocalTablesBreadcrumb />
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>{children}</Suspense>
    </StudioRuntimeProviders>
  );
}
