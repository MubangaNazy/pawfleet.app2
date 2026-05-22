import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ftgoofjexthuzvlyhcsw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z29vZmpleHRodXp2bHloY3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDc5NDcsImV4cCI6MjA5NTAyMzk0N30.QCDHzNcap69eh8PVXC1KewHjxMhfVOu9ALNCacaFlMY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
