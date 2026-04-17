// ============================================================
// DB.JS — Duhodah Database module
// ============================================================

import { supabase, publicSupabase } from './supabase-config.js';

// ============================================================
// DOGAĐAJI
// ============================================================

// Dohvati sve nadolazeće aktivne događaje
// Koristi publicSupabase — bez auth lock-a, sigurno za poziv pri page loadu
export async function getUpcomingEvents(limit = 20) {
  const { data, error } = await publicSupabase
    .from('dogadjaji')
    .select('*')
    .eq('aktivan', true)
    .order('datum', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Dohvati događaje za određeni mjesec (za month view)
export async function getEventsByMonth(year, month) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();
  const { data, error } = await publicSupabase
    .from('dogadjaji')
    .select('*')
    .eq('aktivan', true)
    .gte('datum', start)
    .lte('datum', end)
    .order('datum', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Dohvati jedan događaj po slug-u
export async function getEventBySlug(slug) {
  const { data, error } = await publicSupabase
    .from('dogadjaji')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

// Broj slobodnih mjesta za događaj
export async function getEventAvailability(eventId) {
  const { data: event } = await publicSupabase
    .from('dogadjaji')
    .select('kapacitet')
    .eq('id', eventId)
    .single();

  const { count } = await publicSupabase
    .from('registracije')
    .select('id', { count: 'exact', head: true })
    .eq('dogadjaj_id', eventId)
    .in('status', ['potvrdjena', 'cekanje']);

  const kapacitet = event?.kapacitet || 15;
  const prijavljeni = count || 0;
  return {
    kapacitet,
    prijavljeni,
    slobodna: Math.max(0, kapacitet - prijavljeni),
    puno: prijavljeni >= kapacitet
  };
}

// ============================================================
// REGISTRACIJE
// ============================================================

// Registracija korisnika na događaj
export async function registerForEvent(userId, eventId, tipPlacanja, poruka = '') {
  const { data, error } = await supabase
    .from('registracije')
    .insert({
      user_id: userId,
      dogadjaj_id: eventId,
      tip_placanja: tipPlacanja,
      status: 'potvrdjena',
      poruka
    })
    .select()
    .single();
  if (error) throw error;

  // Zabilježi interakciju
  await trackInteraction(userId, null, 'event_registracija', {
    dogadjaj_id: eventId,
    tip_placanja: tipPlacanja
  });

  return data;
}

// Anonimna prijava na besplatan događaj (bez auth)
export async function registerAnonymous(ime, email, eventId, poruka = '') {
  const { data, error } = await supabase
    .from('registracije')
    .insert({
      ime: ime.trim(),
      email: email.trim().toLowerCase(),
      dogadjaj_id: eventId,
      tip_placanja: 'besplatno',
      status: 'potvrdjena',
      user_id: null,
      poruka
    })
    .select()
    .single();
  if (error) throw error;
  await trackInteraction(null, email, 'event_registracija', {
    dogadjaj_id: eventId,
    tip_placanja: 'besplatno'
  });
  return data;
}

// Provjeri je li korisnik već registriran
export async function isUserRegistered(userId, eventId) {
  const { data } = await supabase
    .from('registracije')
    .select('id, status')
    .eq('user_id', userId)
    .eq('dogadjaj_id', eventId)
    .single();
  return data || null;
}

// Otkaži registraciju
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

// Ažuriraj profil korisnika
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// Spremi kviz rezultat
export async function saveQuizResult(userId, kvizTip) {
  if (userId) {
    await updateProfile(userId, { kviz_tip: kvizTip });
  }
  await trackInteraction(userId, null, 'kviz_zavrsen', { kviz_tip: kvizTip });
}

// Označi priručnik kao preuzet
export async function markPriručnikDownloaded(userId, email) {
  if (userId) {
    await updateProfile(userId, { priručnik_preuzet: true });
  }
  await trackInteraction(userId, email, 'priručnik_download', {});
}

// ============================================================
// INTERAKCIJE (universal tracker)
// ============================================================

// Zapisi interakciju klijenta
export async function trackInteraction(userId, email, tip, vrijednost = {}) {
  const { error } = await supabase
    .from('interakcije')
    .insert({
      user_id: userId || null,
      email: email || null,
      tip,
      vrijednost
    });
  // Silent fail — ne smijemo blokirati UI zbog tracking errora
  if (error) console.warn('[Duhodah tracker]', error.message);
}

// Zapisi posjet stranici (za anonimne korisnike)
export async function trackPageVisit(stranica, email = null, userId = null) {
  await trackInteraction(userId, email, 'posjet_stranici', { stranica });
}

// ============================================================
// ADMIN (samo za Ernijev admin panel)
// ============================================================

// Svi klijenti s brojem interakcija
export async function getAdminClients(limit = 100) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      pretplate(plan, status),
      registracije(count),
      interakcije(count)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Statistike za dashboard
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

// Događaji s brojem registracija
export async function getAdminEvents() {
  const { data, error } = await supabase
    .from('dogadjaji')
    .select(`
      *,
      registracije(count)
    `)
    .gte('datum', new Date().toISOString())
    .order('datum', { ascending: true });
  if (error) throw error;
  return data || [];
}
