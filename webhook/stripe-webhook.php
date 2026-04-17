<?php
// ============================================================
// STRIPE WEBHOOK — Duhodah
// ============================================================
// Postavi ovu datoteku na Hostinger u mapu:
//   /public_html/duhodah.com/webhook/stripe-webhook.php
//
// URL za Stripe Dashboard: https://duhodah.com/webhook/stripe-webhook.php
//
// Stripe eventi koje obrađujemo:
//   checkout.session.completed  — kupnja karte ili nova pretplata
//   customer.subscription.deleted — otkazana pretplata
//   customer.subscription.updated — promjena statusa pretplate
//
// Logika client_reference_id:
//   Pretplata:   "{supabase_user_id}"
//   Karta:       "{supabase_user_id}|{event_id}"
// ============================================================

// --- Konfiguracija (popuni s pravim vrijednostima) ---
define('STRIPE_WEBHOOK_SECRET', 'whsec_rldC8DTsCGPVUv1vi1cX0jA4MN0hlGmp');
define('SUPABASE_URL',          'https://zduabiegzfrdvcberxjy.supabase.co');
define('SUPABASE_SERVICE_KEY',  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdWFiaWVnemZyZHZjYmVyeGp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIwMDMzMywiZXhwIjoyMDkxNzc2MzMzfQ.Pp87XtX6b7lf1udJRK13ab8hGDF6Dtx9GXL_wRjjEOM');

// --- Čitaj raw body (Stripe zahtijeva raw body za provjeru potpisa) ---
$payload    = @file_get_contents('php://input');
$sigHeader  = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// --- Verificiraj Stripe potpis ---
try {
    $event = verifyStripeSignature($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
} catch (Exception $e) {
    http_response_code(400);
    echo 'Webhook Error: ' . $e->getMessage();
    exit;
}

// --- Obradi event ---
$handled = false;

switch ($event['type']) {

    // ---- CHECKOUT ZAVRŠEN (karta ili nova pretplata) ----
    case 'checkout.session.completed':
        $session = $event['data']['object'];
        handleCheckoutCompleted($session);
        $handled = true;
        break;

    // ---- PRETPLATA OTKAZANA (ili istekla) ----
    case 'customer.subscription.deleted':
        $subscription = $event['data']['object'];
        handleSubscriptionCancelled($subscription);
        $handled = true;
        break;

    // ---- PRETPLATA AŽURIRANA (npr. naplata prošla/propala) ----
    case 'customer.subscription.updated':
        $subscription = $event['data']['object'];
        handleSubscriptionUpdated($subscription);
        $handled = true;
        break;
}

http_response_code(200);
echo json_encode(['received' => true, 'handled' => $handled]);
exit;


// ============================================================
// HANDLERI
// ============================================================

function handleCheckoutCompleted(array $session): void {
    $mode              = $session['mode'] ?? '';
    $clientReferenceId = $session['client_reference_id'] ?? '';
    $customerEmail     = $session['customer_details']['email'] ?? ($session['customer_email'] ?? '');
    $stripeCustomerId  = $session['customer'] ?? '';
    $stripeSubId       = $session['subscription'] ?? '';

    if (empty($clientReferenceId)) {
        logWebhook('checkout.completed — nema client_reference_id, preskačem');
        return;
    }

    // Razrješi userId i eventId iz client_reference_id
    $parts   = explode('|', $clientReferenceId, 2);
    $userId  = $parts[0] ?? '';
    $eventId = $parts[1] ?? null;

    if (empty($userId)) {
        logWebhook('checkout.completed — nema userId, preskačem');
        return;
    }

    // Spremi stripe_customer_id na profil (korisno za buduće refunde)
    if ($stripeCustomerId) {
        supabaseRequest('PATCH', "/rest/v1/profiles?id=eq.{$userId}", [
            'stripe_customer_id' => $stripeCustomerId,
        ]);
    }

    if ($mode === 'subscription' && $stripeSubId) {
        // ---- NOVA PRETPLATA ----
        // Određi plan iz Stripe metadata ili amount
        $plan = detectPlanFromSession($session);

        // Krajnji datum za godišnje (12 mj od sada), NULL za miesečne (recurring)
        $kraj = ($plan === 'zajednica_120_god')
            ? date('c', strtotime('+1 year'))
            : null;

        // Upsert u pretplate (po user_id — jedan aktivni plan)
        supabaseRequest('POST', '/rest/v1/pretplate', [
            'user_id'                => $userId,
            'plan'                   => $plan,
            'status'                 => 'active',
            'pocetak'                => date('c'),
            'kraj'                   => $kraj,
            'stripe_subscription_id' => $stripeSubId,
            'stripe_customer_id'     => $stripeCustomerId,
        ], ['Prefer: resolution=merge-duplicates']);

        // Zabileži interakciju
        supabaseRequest('POST', '/rest/v1/interakcije', [
            'user_id' => $userId,
            'email'   => $customerEmail ?: null,
            'tip'     => 'pretplata_start',
            'vrijednost' => ['plan' => $plan, 'stripe_sub_id' => $stripeSubId],
        ]);

        logWebhook("Nova pretplata: user={$userId} plan={$plan}");

    } elseif ($mode === 'payment' && $eventId) {
        // ---- JEDNOKRATNA KARTA ZA DOGAĐAJ ----
        // Potvrdi registraciju (ili kreiraj novu ako ne postoji)
        $existing = supabaseRequest('GET', "/rest/v1/registracije?user_id=eq.{$userId}&dogadjaj_id=eq.{$eventId}");
        $existingData = json_decode($existing, true);

        if (!empty($existingData)) {
            // Ažuriraj status na potvrdjena
            supabaseRequest('PATCH', "/rest/v1/registracije?user_id=eq.{$userId}&dogadjaj_id=eq.{$eventId}", [
                'tip_placanja' => 'stripe',
                'status'       => 'potvrdjena',
            ]);
        } else {
            // Kreiraj novu registraciju
            supabaseRequest('POST', '/rest/v1/registracije', [
                'user_id'      => $userId,
                'dogadjaj_id'  => $eventId,
                'tip_placanja' => 'stripe',
                'status'       => 'potvrdjena',
            ]);
        }

        // Zabileži interakciju
        supabaseRequest('POST', '/rest/v1/interakcije', [
            'user_id' => $userId,
            'email'   => $customerEmail ?: null,
            'tip'     => 'event_registracija',
            'vrijednost' => ['dogadjaj_id' => $eventId, 'tip_placanja' => 'stripe'],
        ]);

        logWebhook("Karta kupljena: user={$userId} event={$eventId}");
    }
}

function handleSubscriptionCancelled(array $subscription): void {
    $stripeSubId = $subscription['id'] ?? '';
    if (empty($stripeSubId)) return;

    supabaseRequest('PATCH', "/rest/v1/pretplate?stripe_subscription_id=eq.{$stripeSubId}", [
        'status' => 'cancelled',
        'kraj'   => date('c'),
    ]);

    logWebhook("Pretplata otkazana: stripe_sub_id={$stripeSubId}");
}

function handleSubscriptionUpdated(array $subscription): void {
    $stripeSubId    = $subscription['id'] ?? '';
    $stripeStatus   = $subscription['status'] ?? '';
    if (empty($stripeSubId)) return;

    // Stripe statusi: active, past_due, canceled, unpaid, trialing
    $supabaseStatus = match($stripeStatus) {
        'active', 'trialing' => 'active',
        'canceled'           => 'cancelled',
        default              => 'expired',
    };

    supabaseRequest('PATCH', "/rest/v1/pretplate?stripe_subscription_id=eq.{$stripeSubId}", [
        'status' => $supabaseStatus,
    ]);

    logWebhook("Pretplata ažurirana: stripe_sub_id={$stripeSubId} status={$supabaseStatus}");
}


// ============================================================
// POMOĆNE FUNKCIJE
// ============================================================

// Odredi plan iz Stripe session-a (po metadata ili ukupnom iznosu)
function detectPlanFromSession(array $session): string {
    // Preporučeno: Erni postavi metadata na svakom Payment Linku: { "plan": "starter_35" }
    $meta = $session['metadata'] ?? [];
    if (!empty($meta['plan'])) {
        return $meta['plan'];
    }

    // Fallback: odredi po iznosu (amount_total je u centima)
    // online_35 = 3500c, optimum_50 = 5000c, premium_60 = 6000c, online_god_300 = 30000c
    $amount = $session['amount_total'] ?? 0;
    if ($amount >= 25000) return 'online_god_300';  // godišnji online 300€
    if ($amount >= 5500)  return 'premium_60';       // 60€/mj
    if ($amount >= 4500)  return 'optimum_50';        // 50€/mj
    return 'online_35';                               // 35€/mj (default)
}

// Pošalji HTTP zahtjev na Supabase REST API
function supabaseRequest(string $method, string $path, array $body = [], array $extraHeaders = []): string {
    $url     = SUPABASE_URL . $path;
    $headers = [
        'Content-Type: application/json',
        'apikey: '               . SUPABASE_SERVICE_KEY,
        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        ...$extraHeaders,
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
        ...(!empty($body) ? [CURLOPT_POSTFIELDS => json_encode($body)] : []),
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    // curl_close() deprecated in PHP 8.5 — handle destructs automatically

    if ($httpCode >= 400) {
        logWebhook("Supabase error [$method $path] HTTP $httpCode: $response");
    }

    return $response ?: '';
}

// Verificiraj Stripe webhook potpis (ručna implementacija, bez Stripe PHP SDK-a)
function verifyStripeSignature(string $payload, string $sigHeader, string $secret): array {
    if (empty($sigHeader)) {
        throw new Exception('Nema Stripe-Signature headera');
    }

    // Parsiraj header: t=timestamp,v1=hash,...
    $parts = [];
    foreach (explode(',', $sigHeader) as $pair) {
        [$k, $v] = explode('=', $pair, 2) + [null, null];
        if ($k && $v) $parts[$k] = $v;
    }

    $timestamp = $parts['t'] ?? '';
    $signature = $parts['v1'] ?? '';

    if (empty($timestamp) || empty($signature)) {
        throw new Exception('Neispravan Stripe-Signature format');
    }

    // Provjeri starost (max 5 minuta)
    if (abs(time() - (int)$timestamp) > 300) {
        throw new Exception('Webhook timestamp je prestar');
    }

    // Izračunaj očekivani potpis
    $signedPayload  = $timestamp . '.' . $payload;
    $expectedSig    = hash_hmac('sha256', $signedPayload, $secret);

    if (!hash_equals($expectedSig, $signature)) {
        throw new Exception('Neispravan Stripe potpis');
    }

    $event = json_decode($payload, true);
    if (!$event || !isset($event['type'])) {
        throw new Exception('Neispravan JSON payload');
    }

    return $event;
}

// Zapiši log u datoteku (opcionalno — deaktiviraj na produkciji)
function logWebhook(string $message): void {
    $logFile = __DIR__ . '/webhook.log';
    $line    = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
    // Ograniči veličinu log datoteke na ~100KB
    if (file_exists($logFile) && filesize($logFile) > 100000) {
        file_put_contents($logFile, $line);
    } else {
        file_put_contents($logFile, $line, FILE_APPEND);
    }
}
