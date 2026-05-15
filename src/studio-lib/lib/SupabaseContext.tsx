/**
 * Supabase Context Provider
 * 
 * Provides a tab-isolated Supabase client instance to all child components.
 * Each browser tab gets its own independent client with separate session storage.
 */

'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createHybridStorageAdapter } from './hybridStorageAdapter';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Use hybrid storage adapter: cookies for persistence + sessionStorage for tab isolation
        storage: createHybridStorageAdapter(),
      },
    });
  }, []); // Empty deps - create once per component mount (which is per tab)

  if (!supabase) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <p>
          Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> (same as Keco Studio) and restart the
          dev server.
        </p>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}

