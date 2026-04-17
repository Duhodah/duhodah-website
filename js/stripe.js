// ============================================================
// STRIPE.JS — Duhodah Stripe integracija
// ============================================================
// Gradi Stripe Payment Link URL-ove s korisničkim kontekstom.
//
// client_reference_id format:
//   - Pretplate:   "{userId}"
//   - Jednokratne: "{userId}|{eventId}"
//
// Ovo PHP webhooку omogućuje da zna koji Supabase user je kupio.
// prefilled_email: Stripe automatski popunjava email polje u checkoutu.
// ============================================================

// ---- Stripe Payment Link URL-ovi ----
// Popuni ove URL-ove nakon što kreiraš Payment Linkove u Stripe Dashboardu.
// Format: https://buy.stripe.com/xxxxxxxx
// NAPOMENA: Ne dodavaj ništa iza URL-a — buildStripeUrl() dodaje parametre automatski.

export const STRIPE_LINKS = {
  online_35:      'https://buy.stripe.com/fZu14na18cui5JPdITdby00',  // Online (Starter) — 35 €/mj
  optimum_50:     'https://buy.stripe.com/9B67sLflseCqa056grdby01',  // Optimum — 50 €/mj
  premium_60:     'https://buy.stripe.com/aFabJ13CKama4FLdITdby02',  // Premium — 60 €/mj
  online_god_300: 'https://buy.stripe.com/28EeVd7T01PEfkpgV5dby03',  // Godišnje online — 300 €/god
};

// ============================================================
// buildStripeUrl — dodaje korisničke parametre na Stripe link
// ============================================================
// @param baseUrl  string  — Stripe Payment Link URL (npr. https://buy.stripe.com/abc)
// @param options  object  — { userId, email, eventId }
//   userId  — Supabase user UUID (obavezan za praćenje)
//   email   — korisnikov email (auto-popunjava Stripe checkout)
//   eventId — UUID događaja (samo za jednokratne karte, ne pretplate)
// @returns string — kompletan URL s parametrima, ili '#' ako baseUrl nije postavljen

export function buildStripeUrl(baseUrl, { userId, email, eventId } = {}) {
  if (!baseUrl || baseUrl.trim() === '') return '#';
  try {
    const url = new URL(baseUrl);
    if (userId) {
      // Za jednokratne karte: "userId|eventId" → webhook zna i user i event
      // Za pretplate: samo "userId" → webhook zna kome aktivirati pretplatu
      url.searchParams.set('client_reference_id', eventId ? `${userId}|${eventId}` : userId);
    }
    if (email) {
      url.searchParams.set('prefilled_email', email);
    }
    return url.toString();
  } catch {
    // Ako URL nije validan (npr. za razvoj bez linkova), vrati original
    return baseUrl;
  }
}

// ============================================================
// buildSubscriptionUrl — shortcut za pretplate
// ============================================================
// @param plan   string — 'online_35' | 'optimum_50' | 'premium_60' | 'online_god_300'
// @param opts   object — { userId, email }

export function buildSubscriptionUrl(plan, { userId, email } = {}) {
  const base = STRIPE_LINKS[plan];
  if (!base) return '#';
  // Pretplate: nema eventId u client_reference_id
  return buildStripeUrl(base, { userId, email });
}
