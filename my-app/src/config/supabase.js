import { createClient } from '@supabase/supabase-js';

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Check if Firebase is configured (for backward compatibility)
export const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

// Determine which backend to use
export const useSupabase = isSupabaseConfigured;
export const useFirebase = !isSupabaseConfigured && isFirebaseConfigured;

// Initialize Supabase client
let supabase = null;

if (isSupabaseConfigured) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  console.log('✅ Supabase initialized successfully');
} else if (!isFirebaseConfigured) {
  console.warn('⚠️ No backend configured - Running in LocalStorage mode');
  console.warn('📖 To enable cloud features, add Supabase or Firebase credentials to .env file');
  console.warn('📖 See DEPLOYMENT_GUIDE.md for setup instructions');
}

export { supabase };
export default supabase;
