/**
 * NEXORA RIDE — Supabase Client Configuration (Production-Ready)
 *
 * Configures Supabase client with:
 * - AsyncStorage session persistence
 * - react-native-url-polyfill for cross-platform Android/iOS support
 * - Network resilience with connection health checks
 * - Proper validation for both legacy JWT and new sb_publishable_ key formats
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// 1. Credentials from environment (Expo Public env vars are inlined at build)
// ---------------------------------------------------------------------------
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// ---------------------------------------------------------------------------
// 2. Configuration validator — supports both legacy JWT and new opaque keys
// ---------------------------------------------------------------------------
export const isSupabaseConfigured = (): boolean => {
  // Reject obvious placeholders
  if (
    SUPABASE_URL === 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co' ||
    SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY'
  ) {
    return false;
  }

  // URL must be a valid Supabase endpoint
  if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
    return false;
  }

  // Key must be either legacy JWT (eyJ...) or new publishable format (sb_publishable_...)
  const isLegacyJWT = SUPABASE_ANON_KEY.startsWith('eyJ');
  const isPublishableKey = SUPABASE_ANON_KEY.startsWith('sb_publishable_');

  return isLegacyJWT || isPublishableKey;
};

// ---------------------------------------------------------------------------
// 3. Client instance with production-grade auth settings
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native (no browser URL bar)
  },
  global: {
    headers: {
      'x-client-info': 'nexora-ride-mobile',
    },
  },
});

// ---------------------------------------------------------------------------
// 4. Connection health check utility (use on app startup / network recovery)
// ---------------------------------------------------------------------------
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  database: boolean;
  storage: boolean;
  latencyMs: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { connected: false, database: false, storage: false, latencyMs: -1, error: 'Not configured' };
  }

  const start = Date.now();
  try {
    // Lightweight query — just checks if the rides table is reachable
    const { error: dbError } = await supabase
      .from('rides')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - start;

    // Storage check — try to list files in avatars (empty is fine)
    const { error: storageError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });

    return {
      connected: true,
      database: !dbError,
      storage: !storageError,
      latencyMs,
      error: dbError?.message || storageError?.message,
    };
  } catch (err: any) {
    return {
      connected: false,
      database: false,
      storage: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Network error',
    };
  }
}
