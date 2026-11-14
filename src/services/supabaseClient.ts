/**
 * NEXORA RIDE — Supabase Client Configuration
 *
 * Configures Supabase client with AsyncStorage session persistence
 * and react-native-url-polyfill for cross-platform Android/iOS support.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase Project Credentials (Loaded from environment or fallback placeholders)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL !== 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co' &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_URL.startsWith('https://')
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
