'use client';

import { Suspense } from 'react';
import { SimLocalTablesBreadcrumb } from '../components/SimLocalTablesBreadcrumb';

/** Supabase/Auth/Query providers come from parent `BattleLayoutShell`. */
export default function LocalTablesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimLocalTablesBreadcrumb />
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>{children}</Suspense>
    </>
  );
}
