// ============================================================
// DB.JS — Duhodah Database module
// ============================================================

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js?v=2';

// ── Pomoćnik za javne REST upite (bez GoTrueClient/lock-a) ─────────────────
const ANON_H = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
});

async function pgGet(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: ANON_H() });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`DB fetch ${res.status}: ${txt}`);
  }
  return res.json();
}

async function pgCount(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    method: 'HEAD',
    headers: { ...ANON_H(), 'Prefer': 'count=exact' }
  });
  const cr = res.headers.get('Content-Range'); // "0-X/total" ili "*/0"
  return parseInt(cr?.split('/')[1] ?? '0') || 0;
}

// ============================================================
// DOGAĐAJI (javni čisti fetch — nema lock-a)
// ============================================================

export async function getUpcomingEvents(limit = 20) {
  return pgGet(`dogadjaji?aktivan=eq.true&order=datum.asc&limit=${limit}&select=*`);
}

export async function getEventsByMonth(year, month) {
  const start = encodeURIComponent(new Date(year, month - 1, 1).toISOString());
  const end   = encodeURIComponent(new Date(year, month, 0, 23, 59, 59).toISOString());
  return pgGet(`dogadjaji?aktivan=eq.true&datum=gte.${start}&datum=lte.${end}&order=datum.asc&select=*`);
}

export async function getEventBySlug(slug) {
  const rows = await pgGet(`dogadjaji?slug=eq.${encodeURIComponent(slug)}&select=*`);
  return rows[0] || null;
}

export async function getEventAvailability(eventId) {
  const rows = await pgGet(`dogadjaji?id=eq.${eventId}&select=kapacitet`);
  const kapacitet = rows[0]?.kapacitet || 15;
  const prijavljeni = await pgCount(
    `registracije?dogadjaj_id=eq.${eventId}&status=in.(potvrdjena,cekanje)`
  );
  return {
    kapacitet,
    prijavljeni,
    slobodna: Math.max(0, kapacitet - prijavljeni),
    puno: prijavljeni >= kapacitet
  };
}

// ============================================================
// REGISTRACIJE (zahtijeva auth)
// ============================================================

export async function registerForEvent(userId, eventId, tipPlacanja, poruka = '') {
  const { data, error } = await supabase
    .from('registracije')
    .insert({ user_id: userId, dogadjaj_id: eventId, tip_placanja: tipPlacanja, status: 'potvrdjena', poruka })
    .select()
    .single();
  if (error) throw error;
  await trackInteraction(userId, null, 'event_registracija', { dogadjaj_id: eventId, tip_placanja: tipPlacanja });
  return data;
}

export async function registerAnonymous(ime, email, eventId, poruka = '') {
  const { data, error } = await supabase
    .from('registracije')
    .insert({ ime: ime.trim(), email: email.trim().toLowerCase(), dogadjaj_id: eventId, tip_placanja: 'besplatno', status: 'potvrdjena', user_id: null, poruka })
    .select()
    .single();
  if (error) throw error;
  await trackInteraction(null, email, 'event_registracija', { dogadjaj_id: eventId, tip_placanja: 'besplatno' });
  return data;
}

export async function isUserRegistered(userId, eventId) {
  const { data } = await supabase
    .from('registracije')
    .select('id, status')
    .eq('user_id', userId)
    .eq('dogadjaj_id', eventId)
    .maybeSingle();
  return data || null;
}

export async function cancelRegistration(userId, eventId) {
  const { error } = await supabase
    .from('registracije')
    .update({ status: 'otkazana' })
    .eq('user_id', userId)
    .eq('dogadjaj_id', eventId);
  if (error) throw error;
  await trackInteraction(userId, null, 'event_otkazivanje', { dogadjaj_id: eventId });
}

// ============================================================
// PROFILI
// ============================================================

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function saveQuizResult(userId, kvizTip) {
  if (userId) await updateProfile(userId, { kviz_tip: kvizTip });
  await trackInteraction(userId, null, 'kviz_zavrsen', { kviz_tip: kvizTip });
}

export async function markPriručnikDownloaded(userId, email) {
  if (userId) await updateProfile(userId, { priručnik_preuzet: true });
  await trackInteraction(userId, email, 'priručnik_download', {});
}

// ============================================================
// INTERAKCIJE
// ============================================================

export async function trackInteraction(userId, email, tip, vrijednost = {}) {
  const { error } = await supabase
    .from('interakcije')
    .insert({ user_id: userId || null, email: email || null, tip, vrijednost });
  if (error) console.warn('[Duhodah tracker]', error.message);
}

export async function trackPageVisit(stranica, email = null, userId = null) {
  await trackInteraction(userId, email, 'posjet_stranici', { stranica });
}

// ============================================================
// ADMIN
// ============================================================

export async function getAdminClients(limit = 100) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, pretplate(plan, status), registracije(count), interakcije(count)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getAdminStats() {
  const [
    { count: ukupnoKlijenata },
    { count: aktivnihPretplatnika },
    { count: ukupnoRegistracija },
    { data: zadnjeInterakcije }
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('pretplate').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('registracije').select('id', { count: 'exact', head: true }).neq('status', 'otkazana'),
    supabase.from('interakcije').select('*').order('created_at', { ascending: false }).limit(20)
  ]);
  return {
    ukupnoKlijenata: ukupnoKlijenata || 0,
    aktivnihPretplatnika: aktivnihPretplatnika || 0,
    ukupnoRegistracija: ukupnoRegistracija || 0,
    zadnjeInterakcije: zadnjeInterakcije || []
  };
}

export async function getAdminEvents() {
  const { data, error } = await supabase
    .from('dogadjaji')
    .select('*, registracije(count)')
    .gte('datum', new Date().toISOString())
    .order('datum', { ascending: true });
  if (error) throw error;
  return data || [];
}
