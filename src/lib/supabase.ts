import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Clean up any legacy localStorage configuration keys to ensure strict environment-only configuration
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('invoiceforge_supabase_url');
    localStorage.removeItem('invoiceforge_supabase_anon_key');
  } catch (_e) {
    // Ignore storage errors
  }
}

// Default project credentials (code configuration fallback)
const DEFAULT_SUPABASE_URL = 'https://ebkorrlmqyxnhmtgixvn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_OGqH5qFR4RBL8XZGrpggrg_OVHTe-Zl';

// Retrieve configuration from build/runtime environment variables or code configuration
const supabaseUrl = (
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  DEFAULT_SUPABASE_URL
).trim();

const supabaseKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  DEFAULT_SUPABASE_KEY
).trim();

// Fallback placeholder so createClient does not crash module evaluation if variables are empty
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== fallbackUrl &&
    supabaseKey !== fallbackKey &&
    supabaseUrl.startsWith('https://')
  );
};

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabaseKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase credentials are not configured in environment variables.' };
    }
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to connect to Supabase';
    return { success: false, error: message };
  }
};
