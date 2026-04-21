<?php
// ============================================================
// SEND-CONFIRMATION.PHP — Duhodah email potvrda registracije
// ============================================================
// Triggera ga Supabase Database Webhook pri INSERT na registracije.
//
// Supabase Dashboard → Integrations → Database Webhooks → New:
//   Table:  registracije
//   Event:  INSERT
//   URL:    https://duhodah.com/webhook/send-confirmation.php
//   Header: X-Webhook-Secret: <WEBHOOK_SECRET>
// ============================================================

define('WEBHOOK_SECRET',    'duhodah-reg-2026');   // postavi isti u Supabase webhook header
define('SUPABASE_URL',      'https://zduabiegzfrdvcberxjy.supabase.co');
define('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdWFiaWVnemZyZHZjYmVyeGp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIwMDMzMywiZXhwIjoyMDkxNzc2MzMzfQ.Pp87XtX6b7lf1udJRK13ab8hGDF6Dtx9GXL_wRjjEOM');
define('FROM_EMAIL',        'noreply@duhodah.com');
define('FROM_NAME',         'Duhodah');

// --- Verificiraj secret ---
$secret = $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
if ($secret !== WEBHOOK_SECRET) {
    http_response_code(401);
    exit('Unauthorized');
}

// --- Pročitaj payload ---
$payload = json_decode(file_get_contents('php://input'), true);
if (!$payload || ($payload['type'] ?? '') !== 'INSERT') {
    http_response_code(200);
    exit('Ignored');
}

$reg = $payload['record'] ?? [];
$userId    = $reg['user_id']     ?? null;
$anonEmail = $reg['email']       ?? null;
$anonIme   = $reg['ime']         ?? null;
$dogadjajId = $reg['dogadjaj_id'] ?? null;
$tipPlacanja = $reg['tip_placanja'] ?? '';
$status    = $reg['status']      ?? '';

// Šalji samo za potvrđene registracije
if ($status !== 'potvrdjena') {
    http_response_code(200);
    exit('Not confirmed, skipping');
}

if (!$dogadjajId) {
    http_response_code(200);
    exit('No event ID');
}

// --- Dohvati podatke o događaju ---
$event = supabaseGet("/rest/v1/dogadjaji?id=eq.{$dogadjajId}&select=naziv,datum,lokacija,cijena_eur,trajanje_min");
if (empty($event)) {
    logMsg("Event not found: {$dogadjajId}");
    http_response_code(200);
    exit('Event not found');
}
$event = $event[0];

// --- Dohvati email korisnika ---
$toEmail = null;
$toIme   = null;

if ($userId) {
    $profile = supabaseGet("/rest/v1/profiles?id=eq.{$userId}&select=email,ime");
    if (!empty($profile)) {
        $toEmail = $profile[0]['email'] ?? null;
        $toIme   = $profile[0]['ime']   ?? null;
    }
}

// Fallback na anonimne podatke
if (!$toEmail && $anonEmail) {
    $toEmail = $anonEmail;
    $toIme   = $anonIme;
}

if (!$toEmail) {
    logMsg("No email for registration, userId={$userId}");
    http_response_code(200);
    exit('No email');
}

// --- Formatiraj datum na hrvatski ---
$datumFormatiran = formatDatumHR($event['datum']);

// --- Formatiraj tip plaćanja ---
$kartaLabel = formatTipPlacanja($tipPlacanja, $event['cijena_eur']);

// --- Pošalji email ---
$subject = "Rezervacija potvrđena — " . $event['naziv'];
$body    = buildEmailBody($toIme, $event['naziv'], $datumFormatiran, $event['lokacija'], $kartaLabel);

$sent = sendEmail($toEmail, $toIme, $subject, $body);

logMsg($sent
    ? "Email poslan: {$toEmail} za '{$event['naziv']}'"
    : "Greška slanja emaila: {$toEmail}"
);

http_response_code(200);
echo json_encode(['sent' => $sent]);
exit;


// ============================================================
// EMAIL TEMPLATE
// ============================================================

function buildEmailBody(
    ?string $ime,
    string $nazivEventa,
    string $datum,
    string $lokacija,
    string $kartaLabel
): string {
    $naslov = $ime
        ? "{$ime}, tvoje mjesto te čeka."
        : "Tvoje mjesto te čeka.";
    $podNaslov = "Vidimo se " . strtolower(explode(',', $datum)[0]) . ". Do tada — udiši polako.";
    $lokacijaLine = htmlspecialchars($lokacija);
    $logoUrl = 'https://duhodah.com/images/duhodah-logo.jpg';

    return <<<HTML
<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Rezervacija potvrđena — Duhodah</title>
</head>
<body style="margin:0;padding:0;background:#0e0718;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0718;padding:48px 16px 64px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

      <!-- WORDMARK -->
      <tr><td style="padding-bottom:36px;text-align:center;">
        <img src="{$logoUrl}" alt="Duhodah" width="56" height="56"
             style="border-radius:50%;object-fit:cover;display:inline-block;
                    border:1px solid rgba(215,2,241,0.3);
                    box-shadow:0 0 24px rgba(215,2,241,0.2),0 0 48px rgba(4,255,255,0.08);">
        <div style="margin-top:12px;font-size:10px;font-weight:700;letter-spacing:0.45em;
                    text-transform:uppercase;color:rgba(4,255,255,0.65);">DUHODAH</div>
      </td></tr>

      <!-- CARD -->
      <tr><td style="background:#160b28;
                     border:1px solid rgba(215,2,241,0.18);
                     border-top:3px solid #d702f1;
                     border-radius:0 0 12px 12px;
                     padding:0;">

        <!-- Magenta top accent bar -->
        <div style="height:3px;background:linear-gradient(90deg,#d702f1 0%,rgba(4,255,255,0.6) 100%);
                    border-radius:0;margin-bottom:0;"></div>

        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 36px 36px;">
          <tr><td>

            <!-- Heading -->
            <h1 style="margin:0 0 10px;font-size:21px;font-weight:400;letter-spacing:0.02em;
                        color:#f0e8ff;text-align:center;line-height:1.3;">{$naslov}</h1>
            <p style="margin:0 0 36px;font-size:13px;color:rgba(240,232,255,0.45);
                       text-align:center;line-height:1.6;">{$podNaslov}</p>

            <!-- Divider -->
            <div style="height:1px;background:rgba(215,2,241,0.15);margin-bottom:28px;"></div>

            <!-- Event details -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                               color:#d702f1;font-family:Arial;">DOGAĐAJ</span><br>
                  <span style="font-size:15px;color:#f0e8ff;font-weight:500;
                               letter-spacing:0.01em;">{$nazivEventa}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                               color:#d702f1;font-family:Arial;">DATUM</span><br>
                  <span style="font-size:15px;color:#f0e8ff;">{$datum}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                               color:#d702f1;font-family:Arial;">LOKACIJA</span><br>
                  <span style="font-size:15px;color:#f0e8ff;">{$lokacijaLine}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 0;">
                  <span style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                               color:#d702f1;font-family:Arial;">KARTA</span><br>
                  <span style="font-size:15px;color:#04ffff;">{$kartaLabel}</span>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px;background:rgba(215,2,241,0.15);margin:28px 0 24px;"></div>

            <!-- Priprema -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:rgba(215,2,241,0.05);
                          border-left:2px solid rgba(215,2,241,0.5);
                          padding:16px 18px;">
              <tr><td>
                <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                           color:#d702f1;font-family:Arial;">PRIPREMI SE</p>
                <p style="margin:0;font-size:13px;color:rgba(240,232,255,0.6);line-height:1.8;">
                  Dođi 5 minuta ranije &nbsp;·&nbsp; Udobna odjeća<br>
                  Maska za spavanje ako imaš &nbsp;·&nbsp; Čaša vode<br>
                  Mirno mjesto gdje možeš leći ili sjesti
                </p>
              </td></tr>
            </table>

            <!-- Osobna nota -->
            <p style="margin:28px 0 0;font-size:13px;color:rgba(240,232,255,0.38);
                       line-height:1.8;text-align:center;font-style:italic;">
              Napravio/la si nešto dobro za sebe.<br>
              Jedva čekam da te upoznam.
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:rgba(215,2,241,0.6);
                       text-align:center;letter-spacing:0.05em;">Erni · Duhodah</p>

          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:28px;text-align:center;">
        <span style="font-size:11px;color:rgba(255,255,255,0.18);letter-spacing:0.06em;">
          duhodah.com &nbsp;·&nbsp; Osijek, Hrvatska
        </span>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
}


// ============================================================
// POMOĆNE FUNKCIJE
// ============================================================

function formatDatumHR(string $isoStr): string {
    $dani   = ['Nedjelja','Ponedjeljak','Utorak','Srijeda','Četvrtak','Petak','Subota'];
    $mjeseci = ['siječnja','veljače','ožujka','travnja','svibnja','lipnja',
                'srpnja','kolovoza','rujna','listopada','studenog','prosinca'];
    $d = new DateTime($isoStr);
    $dan     = $dani[(int)$d->format('w')];
    $dayNum  = (int)$d->format('j');
    $mjesec  = $mjeseci[(int)$d->format('n') - 1];
    $god     = $d->format('Y');
    $sat     = $d->format('H:i');
    return "{$dan}, {$dayNum}. {$mjesec} {$god}. u {$sat}";
}

function formatTipPlacanja(string $tip, ?float $cijena): string {
    return match(true) {
        str_contains($tip, 'besplatno'),
        str_contains($tip, 'pretplatnik') => 'Besplatno (pretplatnik)',
        $tip === 'stripe'                 => $cijena ? number_format($cijena, 0) . ' € (plaćeno)' : 'Plaćeno',
        $tip === 'gotovina'               => 'Gotovina na ulazu',
        default                           => ucfirst($tip),
    };
}

function supabaseGet(string $path): array {
    $url = SUPABASE_URL . $path;
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'apikey: '               . SUPABASE_SERVICE_KEY,
            'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,
        ],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code >= 400 || !$resp) return [];
    return json_decode($resp, true) ?? [];
}

function sendEmail(string $to, ?string $name, string $subject, string $body): bool {
    $toFormatted = $name ? "{$name} <{$to}>" : $to;
    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
        'Reply-To: ' . FROM_EMAIL,
        'X-Mailer: PHP/' . PHP_VERSION,
    ]);
    return mail($toFormatted, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

function logMsg(string $message): void {
    $logFile = __DIR__ . '/confirmation.log';
    $line    = '[' . date('Y-m-d H:i:s') . '] ' . $message . PHP_EOL;
    if (file_exists($logFile) && filesize($logFile) > 100000) {
        file_put_contents($logFile, $line);
    } else {
        file_put_contents($logFile, $line, FILE_APPEND);
    }
}
