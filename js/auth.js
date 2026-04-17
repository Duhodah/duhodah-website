// ============================================================
// AUTH.JS — Duhodah Auth module (magic link, no passwords)
// ============================================================

import { supabase } from './supabase-config.js';

// --- Magic link login ---
// Šalje magic link na email; korisnik klikne → automatski prijavljen
export async function signInWithEmail(email, options = {}) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: options.redirectTo || window.location.href,
      data: options.metadata || {}
    }
  });
  if (error) throw error;
}

// --- Odjava ---
export async function signOut() {
  await supabase.auth.signOut();
  updateAuthUI(null);
}

// --- Dohvati trenutnog korisnika ---
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// --- Dohvati profil korisnika ---
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Provjeri je li korisnik aktivni pretplatnik ---
export async function checkSubscription(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('pretplate')
    .select('plan, status, kraj')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) return null;
  return data;
}

// --- Kombinacija: user + pretplata ---
export async function getAuthState() {
  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null, pretplata: null };

  const [profile, pretplata] = await Promise.all([
    getProfile(user.id),
    checkSubscription(user.id)
  ]);

  return { user, profile, pretplata };
}

// --- UI update: auth indicator u navigaciji ---
export function updateAuthUI(user) {
  const indicator = document.getElementById('auth-indicator');
  const authDot = document.getElementById('auth-dot');
  if (!indicator) return;

  if (user) {
    indicator.style.display = 'flex';
    if (authDot) authDot.title = user.email;
  } else {
    indicator.style.display = 'none';
  }
}

// --- Inicijalizacija: sluša promjene auth stanja ---
export function initAuth(onStateChange) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user || null;
    updateAuthUI(user);

    if (event === 'SIGNED_IN' && user) {
      // Stvori ili ažuriraj profil pri prijavi
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id', ignoreDuplicates: false });
    }

    if (onStateChange) onStateChange(event, session, user);
  });
}
