// ============================================================
// SUPABASE CONFIG — Duhodah
// ============================================================

export const SUPABASE_URL = 'https://zduabiegzfrdvcberxjy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdWFiaWVnemZyZHZjYmVyeGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDAzMzMsImV4cCI6MjA5MTc3NjMzM30.WPAkEe9IQwd9EhXBV3NiLW13KTjbGdHFsukFww6Qc0g';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Auth klijent — koristi se za login, session, pretplate, registracije (s auth)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
  }
});

// Javni klijent — NIKAD ne dotiče Web Lock API jer nema session management
// Koristi se za sve javne SELECT upite (događaji, dostupnost) — rock-solid, bez lock conflicta
export const publicSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-public-readonly', // zasebni key — nema konflikta s auth klijentom
  }
});
