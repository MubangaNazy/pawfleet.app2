import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoordnjsigllzjzkqxb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb29yZG5qc2lnbGx6anprcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDYxOTcsImV4cCI6MjEwMDM4MjE5N30.DypPuG561fF_kJcUC83P2XNIZXrLO48-EPs_O_f7V5M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // prevents hanging on malformed URL tokens
  },
});
