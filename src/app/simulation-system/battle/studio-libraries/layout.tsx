'use client';

import { Suspense } from 'react';

/** Supabase/Auth/Query providers come from parent `BattleLayoutShell`. */
export default function StudioLibrariesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>{children}</Suspense>;
}
