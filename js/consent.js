// ============================================================
// CONSENT.JS — Disclaimer modal za Duhodah
// ============================================================
// Prikazuje zdravstvenu napomenu i sprema suglasnost u Supabase
// prije nego korisnik ode na Stripe payment page.
//
// API:
//   window.openConsentModal(stripeUrl, tipProizvoda)
//   — stripeUrl     : puni Stripe Payment Link URL
//   — tipProizvoda  : 'pretplata_online_35' | 'autoskola_hod' | 'event:{uuid}' ...
// ============================================================

import { supabase } from './supabase-config.js';

// ── Tekst disclaimera ────────────────────────────────────────
const DISCLAIMER_HTML = `
<p>Ovo nije obični trening disanja. <strong>Svjesno povezano disanje</strong>
namjerno mijenja fiziologiju i stanje svijesti kroz kontinuiran, ubrzani obrazac
disanja koji snižava razinu CO₂ u krvi. Sudjelovanje je dobrovoljno i na
vlastitu odgovornost.</p>

<h4>Što se može dogoditi u tijelu</h4>
<ul>
  <li><strong>Trnci i obamrlost</strong> — u rukama, stopalima, licu i oko usta (normalno, prolazno)</li>
  <li><strong>Tetanija</strong> — nevoljni grčevi ili "kočenje" prstiju i ruku; iskusi 70–80% sudionika,
      prolazi čim se vrati normalno disanje — nije opasno</li>
  <li><strong>Vrtoglavica i lagana glava</strong></li>
  <li><strong>Ubrzani rad srca i palpitacije</strong></li>
  <li><strong>Intenzivno emocionalno iskustvo</strong> — plač, smijeh, katarza, osjećaji koji isplivaju</li>
  <li><strong>Izmijenjeno stanje svijesti</strong> — namjerno, i srž je prakse</li>
</ul>

<h4>Ne sudjeluj ako imaš</h4>
<ul>
  <li>Srčane bolesti, nereguliran visoki krvni tlak ili infarkt u anamnezi</li>
  <li>Aneurizmu (mozak ili trbušna aorta)</li>
  <li>Epilepsiju ili bilo koji poremećaj s napadajima</li>
  <li>Glaukom ili odignuće mrežnice</li>
  <li>Tešku, nekontroliranu astmu</li>
  <li>Aktivnu psihozu ili shizofreniju</li>
  <li>Bipolarni poremećaj — bez prethodne konzultacije s psihijatrom</li>
  <li>Trudnoću (u bilo kojoj fazi)</li>
  <li>Pacemaker ili drugi srčani uređaj</li>
  <li>Nedavno otpuštanje iz programa liječenja ovisnosti (manje od godinu dana)</li>
</ul>

<h4>Konzultuj se s liječnikom ako imaš</h4>
<ul>
  <li>Kronični krvni tlak (i pod kontrolom lijekova), dijabetes ili bolesti štitnjače</li>
  <li>PTSP, tešku neprocesuiranu traumu ili panični poremećaj</li>
  <li>Disocijativne poremećaje ili tešku anksioznost</li>
  <li>Redovitu upotrebu psihofarmaka — antidepresivi, anksiolitici, antipsihotici</li>
  <li>Nedavnu operaciju ili ozbiljnu ozljedu</li>
</ul>

<h4>Pravna napomena</h4>
<p>Ovo nije medicinska terapija niti tretman. Ernest Madun nije medicinski radnik.
Kupnjom i upisom punog imena potvrđuješ da si pročitao/la i razumio/la sve
navedeno, da nemaš nijednu od apsolutnih kontraindikacija, te da Duhodah i
Ernesta Maduna oslobađaš odgovornosti za posljedice nastale zbog netočnih ili
nepotpunih zdravstvenih informacija koje si naveo/la.</p>
`;

// ── Interni state ────────────────────────────────────────────
let _modalEl      = null;
let _pendingUrl   = null;
let _pendingTip   = null;

// ── Izgradnja DOM-a (jednom) ─────────────────────────────────
function _buildModal() {
  const el = document.createElement('div');
  el.id = 'consent-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'consent-title');

  el.innerHTML = `
    <style>
      #consent-modal {
        position:fixed;inset:0;z-index:99999;
        display:flex;align-items:center;justify-content:center;
        padding:16px;box-sizing:border-box;
        background:rgba(0,0,0,0);
        opacity:0;pointer-events:none;
        transition:opacity 0.25s ease, background 0.25s ease;
      }
      #consent-modal.consent-open {
        opacity:1;pointer-events:auto;
        background:rgba(0,0,0,0.88);
      }
      #consent-dialog {
        position:relative;
        background:#0d0d0d;
        border:1px solid rgba(255,255,255,0.1);
        border-radius:16px;
        width:min(560px,100%);
        max-height:min(88vh,700px);
        display:flex;flex-direction:column;
        box-shadow:0 40px 100px rgba(0,0,0,0.8),0 0 0 1px rgba(4,255,255,0.06);
        transform:translateY(28px) scale(0.98);
        transition:transform 0.32s cubic-bezier(0.34,1.4,0.64,1);
        overflow:hidden;
      }
      #consent-modal.consent-open #consent-dialog {
        transform:translateY(0) scale(1);
      }

      /* Header */
      #consent-header {
        padding:24px 28px 16px;
        flex-shrink:0;
        border-bottom:1px solid rgba(255,255,255,0.06);
      }
      #consent-wordmark {
        font-family:var(--font-brand,'Jura',sans-serif);
        font-size:0.55rem;letter-spacing:0.38em;text-transform:uppercase;
        color:rgba(4,255,255,0.5);margin-bottom:10px;display:block;
      }
      #consent-title {
        font-family:var(--font-head,'Cormorant Garamond',serif);
        font-size:1.4rem;color:rgba(255,255,255,0.92);
        margin:0 0 3px;line-height:1.2;
      }
      #consent-subtitle {
        font-size:0.7rem;color:rgba(255,255,255,0.3);
        font-family:var(--font-brand,'Jura',sans-serif);
        letter-spacing:0.06em;margin:0;
      }
      #consent-close {
        position:absolute;top:18px;right:20px;
        background:none;border:none;
        color:rgba(255,255,255,0.25);font-size:1rem;
        cursor:pointer;transition:color 0.2s;padding:4px 6px;line-height:1;
      }
      #consent-close:hover { color:rgba(255,255,255,0.65); }

      /* Scroll area */
      #consent-scroll {
        overflow-y:auto;
        padding:0 28px;
        flex:1;
        -webkit-mask-image:linear-gradient(to bottom,#000 80%,transparent 100%);
        mask-image:linear-gradient(to bottom,#000 80%,transparent 100%);
      }
      #consent-scroll::-webkit-scrollbar { width:3px; }
      #consent-scroll::-webkit-scrollbar-track { background:transparent; }
      #consent-scroll::-webkit-scrollbar-thumb {
        background:rgba(4,255,255,0.18);border-radius:2px;
      }

      /* Disclaimer tekst */
      #consent-body {
        padding:20px 0 32px;
        font-size:0.79rem;color:rgba(255,255,255,0.42);line-height:1.8;
      }
      #consent-body h4 {
        font-family:var(--font-brand,'Jura',sans-serif);
        font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;
        color:rgba(4,255,255,0.55);margin:1.6rem 0 0.6rem;
      }
      #consent-body h4:first-of-type { margin-top:1rem; }
      #consent-body ul { padding-left:1.1rem;margin:0 0 0.6rem; }
      #consent-body li { margin-bottom:0.25rem; }
      #consent-body p  { margin:0 0 0.7rem; }
      #consent-body strong { color:rgba(255,255,255,0.68); }

      /* Scroll hint */
      #consent-scroll-hint {
        text-align:center;padding:0 0 18px;
        font-size:0.6rem;letter-spacing:0.18em;
        color:rgba(255,255,255,0.18);
        font-family:var(--font-brand,'Jura',sans-serif);
        transition:opacity 0.5s;
        user-select:none;
      }

      /* Footer */
      #consent-footer {
        padding:18px 28px 24px;
        flex-shrink:0;
        border-top:1px solid rgba(255,255,255,0.07);
        background:#0d0d0d;
      }
      #consent-name-label {
        display:block;
        font-family:var(--font-brand,'Jura',sans-serif);
        font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;
        color:rgba(255,255,255,0.38);margin-bottom:8px;
      }
      #consent-name {
        width:100%;box-sizing:border-box;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.1);
        border-radius:8px;padding:11px 14px;
        color:rgba(255,255,255,0.88);
        font-family:var(--font-brand,'Jura',sans-serif);
        font-size:0.85rem;letter-spacing:0.04em;
        outline:none;transition:border-color 0.2s,box-shadow 0.2s;
        margin-bottom:10px;
      }
      #consent-name:focus {
        border-color:rgba(4,255,255,0.4);
        box-shadow:0 0 0 3px rgba(4,255,255,0.07);
      }
      #consent-name.input-err { border-color:rgba(255,80,80,0.55); }
      #consent-err {
        font-size:0.7rem;color:rgba(255,80,80,0.75);
        min-height:1.1rem;margin-bottom:8px;
        font-family:var(--font-brand,'Jura',sans-serif);
      }
      #consent-submit {
        width:100%;padding:13px 20px;
        background:rgba(4,255,255,0.07);
        border:1px solid rgba(4,255,255,0.32);
        border-radius:8px;
        color:#04ffff;
        font-family:var(--font-brand,'Jura',sans-serif);
        font-size:0.78rem;letter-spacing:0.1em;
        cursor:pointer;transition:all 0.2s;
      }
      #consent-submit:hover:not(:disabled) {
        background:rgba(4,255,255,0.14);
        box-shadow:0 0 24px rgba(4,255,255,0.1);
      }
      #consent-submit:disabled {
        opacity:0.45;cursor:not-allowed;
      }
    </style>

    <div id="consent-dialog">
      <button id="consent-close" aria-label="Zatvori">✕</button>

      <div id="consent-header">
        <span id="consent-wordmark">DUHODAH</span>
        <h2 id="consent-title">Zdravstvena napomena</h2>
        <p id="consent-subtitle">Pročitaj pažljivo prije nastavka</p>
      </div>

      <div id="consent-scroll">
        <div id="consent-body">${DISCLAIMER_HTML}</div>
        <div id="consent-scroll-hint">↓ &nbsp; skrolaj za čitanje</div>
      </div>

      <div id="consent-footer">
        <label id="consent-name-label" for="consent-name">Puno ime i prezime</label>
        <input
          id="consent-name"
          type="text"
          placeholder="Ime Prezime"
          autocomplete="name"
          spellcheck="false"
        >
        <div id="consent-err"></div>
        <button id="consent-submit">Razumijem i prihvaćam →</button>
      </div>
    </div>
  `;

  document.body.appendChild(el);

  // Zatvaranje
  el.addEventListener('click', e => { if (e.target === el) _closeModal(); });
  document.getElementById('consent-close').addEventListener('click', _closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && el.classList.contains('consent-open')) _closeModal();
  });

  // Scroll hint fade
  document.getElementById('consent-scroll').addEventListener('scroll', function() {
    if (this.scrollTop > 50) document.getElementById('consent-scroll-hint').style.opacity = '0';
  }, { passive: true });

  // Submit
  document.getElementById('consent-submit').addEventListener('click', _submit);

  // Input: resetiraj grešku na pisanje
  document.getElementById('consent-name').addEventListener('input', () => {
    document.getElementById('consent-name').classList.remove('input-err');
    document.getElementById('consent-err').textContent = '';
  });

  return el;
}

// ── Zatvori modal ────────────────────────────────────────────
function _closeModal() {
  if (!_modalEl) return;
  _modalEl.classList.remove('consent-open');
  document.body.style.overflow = '';
}

// ── Submit suglasnosti ───────────────────────────────────────
async function _submit() {
  const nameInput = document.getElementById('consent-name');
  const errEl     = document.getElementById('consent-err');
  const submitBtn = document.getElementById('consent-submit');
  const name      = nameInput.value.trim();

  // Validacija: treba min. 2 riječi (ime + prezime)
  if (!name || name.split(/\s+/).filter(Boolean).length < 2) {
    nameInput.classList.add('input-err');
    errEl.textContent = 'Upiši puno ime i prezime.';
    nameInput.focus();
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Spremam...';

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('suglasnosti').insert({
      user_id:       user?.id   ?? null,
      ime_prezime:   name,
      email:         user?.email ?? null,
      tip_proizvoda: _pendingTip,
      stripe_url:    _pendingUrl,
    });
    // Greška DB-a nije bloker — suglasnost je iskazana, nastavljamo
  } catch (_) { /* tiho */ }

  _closeModal();
  window.open(_pendingUrl, '_blank', 'noopener,noreferrer');
  submitBtn.disabled    = false;
  submitBtn.textContent = 'Razumijem i prihvaćam →';
}

// ── Public API ───────────────────────────────────────────────
export async function openConsentModal(stripeUrl, tipProizvoda) {
  _pendingUrl = stripeUrl;
  _pendingTip = tipProizvoda || 'nepoznato';

  if (!_modalEl) _modalEl = _buildModal();

  // Reset
  const nameInput = document.getElementById('consent-name');
  const errEl     = document.getElementById('consent-err');
  const scrollEl  = document.getElementById('consent-scroll');
  const hint      = document.getElementById('consent-scroll-hint');

  nameInput.value = '';
  nameInput.classList.remove('input-err');
  errEl.textContent = '';
  scrollEl.scrollTop = 0;
  hint.style.opacity = '1';

  // Predpopuni ime ako je korisnik pretplatnik/prijavljen
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ime')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.ime) nameInput.value = profile.ime;
    }
  } catch (_) { /* ostaje prazno */ }

  // Otvori
  _modalEl.classList.add('consent-open');
  document.body.style.overflow = 'hidden';

  // Focus ime input nakon animacije (samo ako nije predpopunjeno)
  setTimeout(() => { if (!nameInput.value) nameInput.focus(); }, 330);
}

// Exposaj globalno (za inline onclick u HTML-u i calendar.js)
window.openConsentModal = openConsentModal;
