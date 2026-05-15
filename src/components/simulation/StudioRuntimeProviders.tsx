'use client';

import { QueryProvider } from '@studio/lib/providers/QueryProvider';
import { SupabaseProvider } from '@studio/lib/SupabaseContext';
import { AuthProvider } from '@studio/lib/contexts/AuthContext';

/** Wraps copied Keco Studio client UI (same providers as Studio root, minus Navigation / dashboard chrome). */
export function StudioRuntimeProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseProvider>
        <AuthProvider>{children}</AuthProvider>
      </SupabaseProvider>
    </QueryProvider>
  );
}
