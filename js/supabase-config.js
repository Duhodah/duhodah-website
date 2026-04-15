// ============================================================
// SUPABASE CONFIG — Duhodah
// ============================================================

export const SUPABASE_URL = 'https://zduabiegzfrdvcberxjy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdWFiaWVnemZyZHZjYmVyeGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDAzMzMsImV4cCI6MjA5MTc3NjMzM30.WPAkEe9IQwd9EhXBV3NiLW13KTjbGdHFsukFww6Qc0g';

// Supabase JS client (v2, ESM module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
