// ============================================================
// CALENDAR.JS — Duhodah Calendar Render Engine
// ============================================================

import { getUpcomingEvents, getEventsByMonth, getEventAvailability, registerForEvent, registerAnonymous, isUserRegistered, cancelRegistration } from './db.js';
import { getAuthState, signInWithEmail } from './auth.js';
import { buildStripeUrl, KARTE_LINKS } from './stripe.js';

// Lokalizirani nazivi dana i mjeseci (HR)
const DANI = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
const DANI_PUNI = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
const MJESECI = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
                 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'];

// Cache događaja za widget
let eventsCache = {};
// Auth state snimljen pri zadnjem renderEventsWidget pozivu
let widgetAuthState = { user: null, profile: null, pretplata: null };

// Tip badge boje i labeli (fallback ako nema tagova)
const TIP_CONFIG = {
  breathwork_journey: { label: 'Breathwork Journey', color: 'cyan' },
  autoskola_1: { label: 'Autoškola — Susret 1', color: 'magenta' },
  autoskola_2: { label: 'Autoškola — Susret 2', color: 'magenta' },
  autoskola_3: { label: 'Autoškola — Susret 3', color: 'magenta' },
  autoskola_4: { label: 'Autoškola — Susret 4', color: 'magenta' },
  individualno: { label: 'Individualna sesija', color: 'cyan' },
};

// Tag definicije — sinkronizirano s hq.html
const TAG_DEFS = [
  { key:'dp_mir',    label:'Disajno putovanje MIR',       color:'#8b9eff', group:'tip' },
  { key:'dp_tok',    label:'Disajno putovanje TOK',       color:'#04e8ff', group:'tip' },
  { key:'as_hod',    label:'Tečaj autoškola HOD',         color:'#d702f1', group:'tip' },
  { key:'as_uhoda',  label:'Tečaj autoškola UHODA',       color:'#ff7043', group:'tip' },
  { key:'dp_free',   label:'Besplatno disajno putovanje', color:'#00e676', group:'tip' },
  { key:'online',    label:'ONLINE',                      color:'#4fc3f7', group:'format' },
  { key:'uzivo_dvo', label:'UŽIVO DVORANA',               color:'#ffd54f', group:'format' },
  { key:'uzivo_pri', label:'UŽIVO PRIRODA',               color:'#69f0ae', group:'format' },
];

// ============================================================
// INTENZITET BADGE
// ============================================================

const INTENZITET_MAP = {
  'lagan':          { label: 'Lagan',           fill: 1,   color: '#04ffff' },
  'lagan/srednji':  { label: 'Lagan / Srednji',  fill: 1.5, color: '#52ffcc' },
  'srednji':        { label: 'Srednji',          fill: 2,   color: '#ffe066' },
  'srednji/visoki': { label: 'Srednji / Visoki', fill: 2.5, color: '#ff9040' },
  'visoki':         { label: 'Visoki',           fill: 3,   color: '#d702f1' },
};

function intenzitetBadge(val) {
  const cfg = INTENZITET_MAP[val];
  if (!cfg) return '';
  const bars = [
    { h: 6,  i: 1 },
    { h: 9,  i: 2 },
    { h: 12, i: 3 },
  ].map(({ h, i }) => {
    const filled = cfg.fill >= i;
    const half   = !filled && cfg.fill >= i - 0.5;
    const op     = filled ? '1' : half ? '0.4' : '0.12';
    return `<span style="display:inline-block;width:3px;height:${h}px;background:${cfg.color};opacity:${op};border-radius:1px;"></span>`;
  }).join('');
  return `<span style="display:inline-flex;align-items:flex-end;gap:2px;vertical-align:middle;margin-right:5px;">${bars}</span>`
       + `<span style="font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.38);">${cfg.label}</span>`;
}

// ============================================================
// FORMATIRANJE
// ============================================================

function formatDatum(isoStr) {
  const d = new Date(isoStr);
  const dan = DANI_PUNI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const gggg = d.getFullYear();
  return `${dan}, ${dd}.${mm}.${gggg}.`;
}

function formatVrijeme(isoStr) {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function isUskoro(isoStr) {
  const d = new Date(isoStr);
  const razlika = d - Date.now();
  return razlika > 0 && razlika < 7 * 24 * 60 * 60 * 1000; // < 7 dana
}

// ============================================================
// GUMB LOGIKA (uvjetno prikazivanje)
// ============================================================

// Vrati pravi Stripe link za event: vlastiti ako postoji, inače generički po formatu
function resolveStripeLink(event) {
  if (event.stripe_link) return event.stripe_link;
  const isOnline = (event.tagovi || []).includes('online');
  return isOnline ? KARTE_LINKS.online : KARTE_LINKS.uzivo;
}

async function buildEventButton(event, authState, availability) {
  const { user, pretplata } = authState;
  const isBesplatno = event.tagovi?.includes('dp_free');
  const pretplataPokriva = pretplata && event.pokriva_plan?.includes(pretplata.plan);

  if (availability.puno) {
    return `<button class="cal-btn cal-btn--disabled" disabled>Popunjeno</button>`;
  }

  // Besplatni događaji — svi se mogu prijaviti, bez plaćanja
  if (isBesplatno) {
    if (user) {
      const regStatus = await isUserRegistered(user.id, event.id);
      if (regStatus?.status === 'potvrdjena') {
        return `<div class="cal-btn-group">
          <span class="cal-registered-badge">Prijavljen/a ✓</span>
          <button class="cal-btn cal-btn--cancel" onclick="cancelReg('${event.id}')">Otkaži</button>
        </div>`;
      }
      return `<button class="cal-btn cal-btn--free" data-reg="${event.id}" onclick="registerFree('${event.id}','besplatno')">
        Prijavi se →
      </button>`;
    } else {
      return `<button class="cal-btn cal-btn--free" onclick="showRegFormModal('${event.id}')">
        Prijavi se →
      </button>`;
    }
  }

  if (user) {
    const regStatus = await isUserRegistered(user.id, event.id);

    if (regStatus && regStatus.status === 'potvrdjena') {
      return `<div class="cal-btn-group">
        <span class="cal-registered-badge">Prijavljen/a ✓</span>
        <button class="cal-btn cal-btn--cancel" onclick="cancelReg('${event.id}')">Otkaži</button>
      </div>`;
    }

    if (pretplataPokriva) {
      return `<button class="cal-btn cal-btn--free" data-reg="${event.id}" onclick="registerFree('${event.id}')">
        Prijavi se besplatno →
      </button>`;
    } else {
      // Prijavljeni korisnik bez pretplate — Stripe link s kontekstom
      const stripeUrl = buildStripeUrl(resolveStripeLink(event), {
        userId:  user.id,
        email:   user.email,
        eventId: event.id,
      });
      const cijenaLabel = event.cijena_eur ? `${event.cijena_eur} €` : 'Upitaj';
      return `<div class="cal-btn-group cal-btn-group--stacked">
        <a class="cal-btn cal-btn--pay" href="${stripeUrl}" target="_blank" rel="noopener">
          Kupi kartu — ${cijenaLabel} →
        </a>
        <span class="cal-member-hint">Ili <a href="zajednica.html">postani pretplatnik</a> i dođi besplatno</span>
      </div>`;
    }
  } else {
    // Anonimni posjetitelj — Stripe link bez konteksta
    const stripeUrl = resolveStripeLink(event);
    const cijenaLabel = event.cijena_eur ? `${event.cijena_eur} €` : 'Upitaj';
    return `<div class="cal-btn-group cal-btn-group--stacked">
      <a class="cal-btn cal-btn--pay" href="${stripeUrl}" target="_blank" rel="noopener">
        Kupi kartu — ${cijenaLabel} →
      </a>
      <span class="cal-member-hint">Pretplatnik? <a href="#" onclick="showLoginModal('${event.id}');return false;">Prijavi se za besplatnu opciju</a></span>
    </div>`;
  }
}

// ============================================================
// SHARED CARD BUILDER — koriste i widget i full calendar
// ============================================================

async function buildEventCardHTML(ev, curAuthState) {
  const avail      = await getEventAvailability(ev.id);
  const btn        = await buildEventButton(ev, curAuthState, avail);
  const tipCfg     = TIP_CONFIG[ev.tip] || { label: ev.tip, color: 'cyan' };
  const uskoro     = isUskoro(ev.datum);
  const d          = new Date(ev.datum);
  const dayNum     = d.getDate();
  const monthAbbr  = MJESECI[d.getMonth()].slice(0, 3).toUpperCase();

  const tagovi       = ev.tagovi || [];
  const resolvedTags = tagovi.map(k => TAG_DEFS.find(t => t.key === k)).filter(Boolean);
  const tipTagObj    = resolvedTags.find(t => t.group === 'tip');
  const tipColor     = tipTagObj?.color || (tipCfg.color === 'cyan' ? '#04e8ff' : '#d702f1');
  const accentBg     = `linear-gradient(90deg, ${tipColor}, transparent)`;
  const primaryLabel = tipTagObj?.label || tipCfg.label;
  const tagChipsHtml = resolvedTags.map(t => t.group === 'format'
    ? `<span class="cwt" style="color:#08081a;border-color:${t.color};background:${t.color};">${t.label}</span>`
    : `<span class="cwt" style="color:${t.color};border-color:${t.color}38;background:${t.color}14;">${t.label}</span>`
  ).join('');

  const imgPos = ev.slika_pos || '50%';
  const heroHtml = ev.slika_url
    ? `<div class="cal-widget-card__hero">
        <img src="${ev.slika_url}" alt="${ev.naziv}" class="cal-widget-card__hero-img" loading="lazy" style="--img-pos:${imgPos}">
        <div class="cal-widget-card__hero-fade"></div>
        <div class="cal-widget-card__hero-line"></div>
      </div>`
    : `<div class="cal-widget-card__accent" style="background:${accentBg};"></div>`;

  return `
    <article class="cal-widget-card${uskoro ? ' cal-widget-card--uskoro' : ''}" data-event-id="${ev.id}" style="--c-border:${tipColor}55;--c-glow:${tipColor}30;--tip-color:${tipColor};">
      ${heroHtml}
      <div class="cal-widget-card__inner">
        <div class="cal-widget-card__top">
          <div class="cal-widget-card__date-block">
            <span class="cal-widget-card__day-num" style="color:${tipColor};">${dayNum}</span>
            <span class="cal-widget-card__month-abbr">${monthAbbr}</span>
          </div>
          <div class="cal-widget-card__badges">
            <span class="cal-badge" style="color:${tipColor};background:${tipColor}18;border-color:${tipColor}50;">${primaryLabel}</span>
            ${uskoro ? '<span class="cal-badge cal-badge--uskoro">Uskoro</span>' : ''}
          </div>
        </div>
        <h3 class="cal-widget-card__naziv">${ev.naziv}</h3>
        <div class="cal-widget-card__meta-row">
          <span>🕐 ${formatVrijeme(ev.datum)} · ${ev.trajanje_min} min</span>
          <span>📍 ${ev.lokacija?.split(',')[0] || '—'}</span>
        </div>
        ${ev.intenzitet ? `<div class="cal-widget-card__meta-row" style="margin-top:0.3rem;">${intenzitetBadge(ev.intenzitet)}</div>` : ''}
        ${tagChipsHtml ? `<div class="cal-widget-card__tags">${tagChipsHtml}</div>` : ''}
        ${ev.opis_kratki ? `<p class="cal-widget-card__opis">${ev.opis_kratki}</p>` : ''}
        <div class="cal-widget-card__footer">
          <div class="cal-widget-card__footer-info">
            <span class="cal-mjesta ${avail.slobodna <= 3 ? 'cal-mjesta--kritican' : ''}">${avail.slobodna} mjesta slobodno</span>
            <button class="cal-ev-details-link" style="--link-color:${tipColor}" onclick="showEventModal('${ev.id}')">Više o događaju →</button>
          </div>
          ${btn}
        </div>
      </div>
    </article>`;
}

// ============================================================
// WIDGET ZA INDEX.HTML (sljedeća 3 događaja)
// ============================================================

export async function renderEventsWidget(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const anonState = { user: null, profile: null, pretplata: null };
    const [events, fetchedAuth] = await Promise.all([
      getUpcomingEvents(6),
      getAuthState().catch(() => anonState)
    ]);
    widgetAuthState = fetchedAuth;

    if (!events.length) {
      container.innerHTML = `<p class="cal-empty">Nema nadolazećih događaja. Provjeri uskoro.</p>`;
      return;
    }

    events.forEach(ev => { eventsCache[ev.id] = ev; });

    const cards = await Promise.all(events.map(ev => buildEventCardHTML(ev, widgetAuthState)));

    container.innerHTML = `
      <div class="cal-widget-grid">${cards.join('')}</div>
      <div class="cal-widget-cta">
        <a href="events.html" class="cal-all-link">Svi termini i kalendar →</a>
      </div>`;

  } catch (err) {
    console.error('[Calendar widget]', err);
    const code = err?.message || err?.code || String(err);
    container.innerHTML = `<p class="cal-empty">Greška pri učitavanju termina<br><span style="font-size:.7rem;opacity:.5">(${code})</span></p>`;
  }
}

// ============================================================
// WIDGET REFRESH (ažurira broj mjesta na kartici bez re-rendera)
// ============================================================

async function refreshWidgetCard(eventId) {
  const card = document.querySelector(`article[data-event-id="${eventId}"]`);
  if (!card) return;
  const event = eventsCache[eventId];
  if (!event) return;
  const avail = await getEventAvailability(eventId);
  const btn = await buildEventButton(event, widgetAuthState, avail);
  const footer = card.querySelector('.cal-widget-card__footer');
  if (footer) {
    const tagovi = event.tagovi || [];
    const tipTag = tagovi.map(k => TAG_DEFS.find(t => t.key === k)).filter(Boolean).find(t => t.group === 'tip');
    const linkColor = tipTag?.color || '#04e8ff';
    footer.innerHTML = `
      <div class="cal-widget-card__footer-info">
        <span class="cal-mjesta${avail.slobodna <= 3 ? ' cal-mjesta--kritican' : ''}">${avail.slobodna} mjesta slobodno</span>
        <button class="cal-ev-details-link" style="--link-color:${linkColor}" onclick="showEventModal('${eventId}')">Više o događaju →</button>
      </div>
      ${btn}`;
  }
}

// ============================================================
// FORMA ZA PRIJAVU (anonimni korisnici, dp_free eventi)
// ============================================================

function showRegFormModal(eventId) {
  const MODAL_ID = 'cal-regform-modal';
  if (!document.getElementById(MODAL_ID)) {
    const m = document.createElement('div');
    m.id = MODAL_ID;
    m.className = 'cal-modal';
    m.innerHTML = `
      <div class="cal-modal__box">
        <button class="cal-modal__close" id="cal-regform-close">✕</button>
        <h3 class="cal-modal__title">Prijava na događaj</h3>
        <p class="cal-modal__sub">Upiši svoje podatke — rezervirat ćemo ti mjesto odmah.</p>
        <form id="cal-regform">
          <input type="text"  id="cal-rf-ime"    placeholder="Ime i prezime *" required class="cal-modal__input">
          <input type="email" id="cal-rf-email"  placeholder="Email adresa *"  required class="cal-modal__input">
          <textarea           id="cal-rf-poruka" placeholder="Napomena (opcionalno)" class="cal-modal__input" rows="2" style="resize:vertical;min-height:56px;"></textarea>
          <button type="submit" class="cal-modal__submit" id="cal-rf-submit">Rezerviraj mjesto →</button>
          <div id="cal-rf-msg" style="margin-top:.7rem;font-size:.76rem;color:rgba(255,80,80,.85);min-height:1rem;"></div>
        </form>
        <div id="cal-rf-success" style="display:none;text-align:center;padding:1.5rem 0;font-size:.88rem;color:rgba(255,255,255,.65);line-height:1.7;"></div>
      </div>`;
    document.body.appendChild(m);
    document.getElementById('cal-regform-close').addEventListener('click', () => m.classList.remove('cal-modal--open'));
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('cal-modal--open'); });
  }

  const modal  = document.getElementById(MODAL_ID);
  const form   = document.getElementById('cal-regform');
  const success = document.getElementById('cal-rf-success');

  form.style.display = '';
  form.reset();
  success.style.display = 'none';
  document.getElementById('cal-rf-msg').textContent = '';
  modal.dataset.eventId = eventId;
  modal.classList.add('cal-modal--open');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const ime    = document.getElementById('cal-rf-ime').value.trim();
    const email  = document.getElementById('cal-rf-email').value.trim();
    const poruka = document.getElementById('cal-rf-poruka').value.trim();
    const btn    = document.getElementById('cal-rf-submit');
    const msgEl  = document.getElementById('cal-rf-msg');

    try {
      btn.disabled = true;
      btn.textContent = 'Prijavljujem...';
      await registerAnonymous(ime, email, eventId, poruka);

      form.style.display = 'none';
      success.style.display = 'block';
      success.innerHTML = `✓ Uspješno prijavljeno!<br><strong style="color:rgba(4,232,255,.85)">${ime}</strong>, vidimo se.<br><span style="font-size:.78rem;opacity:.6">Potvrda stiže na ${email}</span>`;
      await refreshWidgetCard(eventId);
    } catch (err) {
      const dup = err.message?.toLowerCase().includes('duplicate') || err.code === '23505';
      msgEl.textContent = dup
        ? 'Ta email adresa je već prijavljena za ovaj događaj.'
        : 'Greška pri prijavi. Pokušaj ponovo.';
      btn.disabled = false;
      btn.textContent = 'Rezerviraj mjesto →';
    }
  };
}

window.showRegFormModal = showRegFormModal;

// ============================================================
// EVENT DETAIL MODAL (popup s punim opisom)
// ============================================================

async function showEventModal(eventId) {
  const MODAL_ID = 'cal-ev-modal';

  // Kreiraj modal DOM jednom
  if (!document.getElementById(MODAL_ID)) {
    const m = document.createElement('div');
    m.id = MODAL_ID;
    m.className = 'cal-ev-modal';
    m.innerHTML = `
      <div class="cal-ev-modal__backdrop"></div>
      <div class="cal-ev-modal__dialog" id="cal-ev-dialog">
        <div class="cal-ev-modal__skeleton">
          <div class="cal-ev-modal__sk-hero"></div>
          <div class="cal-ev-modal__sk-body">
            <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--sm"></div>
            <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--lg"></div>
            <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--md"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('.cal-ev-modal__backdrop').addEventListener('click', closeEventModal);
  }

  const modal  = document.getElementById(MODAL_ID);
  const dialog = document.getElementById('cal-ev-dialog');

  // Otvori odmah sa skeleton-om
  modal.classList.add('cal-ev-modal--open');
  document.body.style.overflow = 'hidden';
  dialog.innerHTML = `
    <div class="cal-ev-modal__skeleton">
      <div class="cal-ev-modal__sk-hero"></div>
      <div class="cal-ev-modal__sk-body">
        <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--sm"></div>
        <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--lg"></div>
        <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--md"></div>
        <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--sm"></div>
        <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--full"></div>
        <div class="cal-ev-modal__sk-line cal-ev-modal__sk-line--full"></div>
      </div>
    </div>`;

  // ESC zatvaranje
  const onEsc = e => { if (e.key === 'Escape') { closeEventModal(); document.removeEventListener('keydown', onEsc); } };
  document.addEventListener('keydown', onEsc);

  try {
    // Dohvati događaj — iz cache-a ili svježe iz baze
    let ev = eventsCache[eventId];
    if (!ev) {
      const { data } = await import('./db.js').then(m => m.getUpcomingEvents(50));
      ev = (data || []).find(e => e.id === eventId);
    }
    if (!ev) { closeEventModal(); return; }

    // Razriješi tagove i boje
    const tagovi        = ev.tagovi || [];
    const resolvedTags  = tagovi.map(k => TAG_DEFS.find(t => t.key === k)).filter(Boolean);
    const tipTagObj     = resolvedTags.find(t => t.group === 'tip');
    const accentColor   = tipTagObj?.color || '#04e8ff';
    const uskoro        = isUskoro(ev.datum);

    const d         = new Date(ev.datum);
    const dan       = DANI_PUNI[d.getDay()];
    const dayNum    = d.getDate();
    const monthName = MJESECI[d.getMonth()];
    const year      = d.getFullYear();

    const tagChipsHtml = resolvedTags.map(t => t.group === 'format'
      ? `<span class="cwt" style="color:#08081a;border-color:${t.color};background:${t.color};">${t.label}</span>`
      : `<span class="cwt" style="color:${t.color};border-color:${t.color}38;background:${t.color}14;">${t.label}</span>`
    ).join('');

    const heroHtml = ev.slika_url
      ? `<img class="cal-ev-modal__hero-img" src="${ev.slika_url}" alt="${ev.naziv}" loading="lazy">`
      : `<div class="cal-ev-modal__hero-ph" style="--accent:${accentColor}"></div>`;

    const lokacijaHtml = ev.lokacija
      ? `<a href="https://maps.google.com/?q=${encodeURIComponent(ev.lokacija)}" target="_blank" rel="noopener">${ev.lokacija}</a>`
      : '—';

    dialog.style.setProperty('--accent-color', accentColor);
    dialog.innerHTML = `
      <div class="cal-ev-modal__hero">
        ${heroHtml}
        <div class="cal-ev-modal__hero-fade" style="--fade-to:#111116"></div>
        <button class="cal-ev-modal__close" onclick="closeEventModal()">✕</button>
        <div class="cal-ev-modal__hero-chips">
          <span class="cal-badge" style="color:${accentColor};background:${accentColor}22;border:1px solid ${accentColor}50;backdrop-filter:blur(8px);">${tipTagObj?.label || ev.tip || 'Događaj'}</span>
          ${uskoro ? '<span class="cal-badge cal-badge--uskoro">Uskoro</span>' : ''}
        </div>
      </div>
      <div class="cal-ev-modal__content">
        <div class="cal-ev-modal__date-accent" style="color:${accentColor}">${dan}, ${dayNum}. ${monthName} ${year}.</div>
        <h2 class="cal-ev-modal__title">${ev.naziv}</h2>
        <div class="cal-ev-modal__meta">
          <div class="cal-ev-modal__meta-item">
            <span class="cal-ev-modal__meta-icon">🕐</span>
            <div class="cal-ev-modal__meta-body">
              <span class="cal-ev-modal__meta-label">Vrijeme</span>
              <span class="cal-ev-modal__meta-value">${formatVrijeme(ev.datum)} · ${ev.trajanje_min} min</span>
            </div>
          </div>
          <div class="cal-ev-modal__meta-item">
            <span class="cal-ev-modal__meta-icon">📍</span>
            <div class="cal-ev-modal__meta-body">
              <span class="cal-ev-modal__meta-label">Lokacija</span>
              <span class="cal-ev-modal__meta-value">${lokacijaHtml}</span>
            </div>
          </div>
          ${ev.intenzitet ? `
          <div class="cal-ev-modal__meta-item">
            <span class="cal-ev-modal__meta-icon" style="font-size:0.9rem;">⚡</span>
            <div class="cal-ev-modal__meta-body">
              <span class="cal-ev-modal__meta-label">Intenzitet</span>
              <span class="cal-ev-modal__meta-value" style="display:inline-flex;align-items:center;gap:6px;">${intenzitetBadge(ev.intenzitet)}</span>
            </div>
          </div>` : ''}
          ${ev.cijena_eur ? `
          <div class="cal-ev-modal__meta-item">
            <span class="cal-ev-modal__meta-icon">💶</span>
            <div class="cal-ev-modal__meta-body">
              <span class="cal-ev-modal__meta-label">Cijena</span>
              <span class="cal-ev-modal__meta-value">${ev.cijena_eur} €</span>
            </div>
          </div>` : ''}
          <div class="cal-ev-modal__meta-item">
            <span class="cal-ev-modal__meta-icon">👥</span>
            <div class="cal-ev-modal__meta-body">
              <span class="cal-ev-modal__meta-label">Prijavljeni / Kapacitet</span>
              <span class="cal-ev-modal__meta-value" id="cal-evm-kapacitet">—</span>
            </div>
          </div>
        </div>
        ${tagChipsHtml ? `<div class="cal-ev-modal__tags">${tagChipsHtml}</div>` : ''}
        ${ev.opis ? `
          <div class="cal-ev-modal__opis-label">O događaju</div>
          <div class="cal-ev-modal__opis">${ev.opis}</div>` : ''}
        <div class="cal-ev-modal__footer">
          <span class="cal-ev-modal__spots" id="cal-evm-spots">…</span>
          <div id="cal-evm-btn"></div>
        </div>
      </div>`;

    // Async: dohvati dostupnost + gumb
    const avail = await getEventAvailability(eventId);
    const btn   = await buildEventButton(ev, widgetAuthState, avail);

    const spotsEl = document.getElementById('cal-evm-spots');
    const kapEl   = document.getElementById('cal-evm-kapacitet');
    const btnEl   = document.getElementById('cal-evm-btn');

    if (spotsEl) {
      if (avail.puno) {
        spotsEl.textContent = 'Popunjeno';
        spotsEl.style.color = 'rgba(255,80,80,0.7)';
      } else {
        spotsEl.textContent = `${avail.slobodna} mjesta slobodno`;
        if (avail.slobodna <= 3) spotsEl.classList.add('cal-ev-modal__spots--warn');
      }
    }
    if (kapEl) kapEl.textContent = `${avail.prijavljeni} / ${avail.kapacitet}`;
    if (btnEl) btnEl.innerHTML = btn;

  } catch (err) {
    console.error('[EventModal]', err);
    dialog.innerHTML += `<p style="padding:20px;color:rgba(255,80,80,.6);font-size:.8rem;">Greška pri učitavanju (${err?.message || err})</p>`;
  }
}

function closeEventModal() {
  const modal = document.getElementById('cal-ev-modal');
  if (!modal) return;
  modal.classList.remove('cal-ev-modal--open');
  document.body.style.overflow = '';
}

window.showEventModal  = showEventModal;
window.closeEventModal = closeEventModal;

// ============================================================
// FULL PAGE CALENDAR (events.html)
// ============================================================

let currentView = 'list'; // 'list' | 'month'
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let allEvents = [];
let authState = {};
let activePanel = null;
let activeFilters = new Set(); // prazan Set = sve

let filtersInitialized = false;

function initTagFilters() {
  const container = document.getElementById('cal-filter-tags');
  if (!container) return;

  // Inicijaliziraj samo jednom — sprečava dvostruki listener od višestrukih initFullCalendar poziva
  if (filtersInitialized) return;
  filtersInitialized = true;

  let html = `<button class="cal-filter-tag cal-filter-tag--active" data-tag="sve">Sve</button>`;
  let lastGroup = null;
  TAG_DEFS.forEach(t => {
    if (lastGroup && lastGroup !== t.group) {
      html += `<span class="cal-filter-sep"></span>`;
    }
    lastGroup = t.group;
    html += `<button class="cal-filter-tag" data-tag="${t.key}" style="--tag-color:${t.color}">${t.label}</button>`;
  });
  container.innerHTML = html;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.cal-filter-tag');
    if (!btn) return;
    const tag = btn.dataset.tag;

    if (tag === 'sve') {
      activeFilters.clear();
      container.querySelectorAll('.cal-filter-tag').forEach(b => b.classList.remove('cal-filter-tag--active'));
      btn.classList.add('cal-filter-tag--active');
    } else {
      if (activeFilters.has(tag)) {
        activeFilters.delete(tag);
        btn.classList.remove('cal-filter-tag--active');
      } else {
        activeFilters.add(tag);
        btn.classList.add('cal-filter-tag--active');
      }
      const sveBtn = container.querySelector('[data-tag="sve"]');
      if (sveBtn) sveBtn.classList.toggle('cal-filter-tag--active', activeFilters.size === 0);
    }
    renderListView();
  });
}

export async function initFullCalendar() {
  try {
    const anonState = { user: null, profile: null, pretplata: null };
    [allEvents, authState] = await Promise.all([
      getUpcomingEvents(200),
      getAuthState().catch(() => anonState)
    ]);

    initTagFilters();
    renderListView();
    bindViewToggle();
    bindMonthNavigation();
    bindLoginModal();

    // Expose global functions za onclick handlere
    window.registerFree    = registerFree;
    window.cancelReg       = cancelReg;
    window.showLoginModal  = showLoginModal;
    window.showRegFormModal = showRegFormModal;
    window.openEventPanel  = openEventPanel;
    window.closeEventPanel = closeEventPanel;

  } catch (err) {
    console.error('[Full calendar init]', err);
    document.getElementById('cal-main').innerHTML =
      '<p class="cal-empty">Greška pri učitavanju kalendara.</p>';
  }
}

// --- List View ---
async function renderListView() {
  const container = document.getElementById('cal-main');
  if (!container) return;
  container.innerHTML = '<div class="cal-loading">Učitavam...</div>';

  if (!allEvents.length) {
    container.innerHTML = `<p class="cal-empty">Nema nadolazećih događaja.<br>Provjeri uskoro ili <a href="index.html#kontakt">kontaktiraj Ernesta</a>.</p>`;
    return;
  }

  // Spremi sve u cache da showEventModal radi
  allEvents.forEach(ev => { eventsCache[ev.id] = ev; });

  // Filtriraj — OR logika: prikaži ako događaj ima BILO KOJI od aktivnih tagova
  const filtered = activeFilters.size > 0
    ? allEvents.filter(ev => (ev.tagovi || []).some(t => activeFilters.has(t)))
    : allEvents;

  if (!filtered.length) {
    container.innerHTML = `<p class="cal-empty">Nema događaja za odabrani filter.</p>`;
    return;
  }

  const cards = await Promise.all(filtered.map(ev => buildEventCardHTML(ev, authState)));

  container.innerHTML = `<div class="cal-events-grid">${cards.join('')}</div>`;

  requestAnimationFrame(() => {
    container.querySelectorAll('.cal-widget-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 60);
    });
  });
}

// --- Month View ---
async function renderMonthView() {
  const container = document.getElementById('cal-main');
  if (!container) return;

  const monthEvents = await getEventsByMonth(currentYear, currentMonth);
  const eventsByDay = {};
  monthEvents.forEach(ev => {
    const day = new Date(ev.datum).getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push(ev);
  });

  // Update month label
  const label = document.getElementById('cal-month-label');
  if (label) label.textContent = `${MJESECI[currentMonth - 1]} ${currentYear}`;

  // Grid
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const offset = (firstDay + 6) % 7; // Monday start
  const today = new Date();

  let cells = '';
  // Day headers
  cells += DANI.map(d => `<div class="cal-month-header">${d}</div>`).join('');

  // Empty offset cells
  for (let i = 0; i < offset; i++) {
    cells += `<div class="cal-month-cell cal-month-cell--empty"></div>`;
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getFullYear() === currentYear &&
                    today.getMonth() + 1 === currentMonth &&
                    today.getDate() === day;
    const dayEvents = eventsByDay[day] || [];
    const isPast = new Date(currentYear, currentMonth - 1, day) < today && !isToday;

    const dots = dayEvents.slice(0, 3).map(ev => {
      const tipCfg = TIP_CONFIG[ev.tip] || { color: 'cyan' };
      return `<span class="cal-month-dot cal-month-dot--${tipCfg.color}" title="${ev.naziv}"></span>`;
    }).join('');

    cells += `
      <div class="cal-month-cell ${isToday ? 'cal-month-cell--today' : ''} ${isPast ? 'cal-month-cell--past' : ''} ${dayEvents.length ? 'cal-month-cell--has-events' : ''}"
           ${dayEvents.length ? `onclick="openEventPanel('${dayEvents[0].id}')"` : ''}>
        <span class="cal-month-cell__day">${day}</span>
        <div class="cal-month-cell__dots">${dots}</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="cal-month-nav">
      <button class="cal-month-nav__btn" id="cal-prev">←</button>
      <span id="cal-month-label">${MJESECI[currentMonth - 1]} ${currentYear}</span>
      <button class="cal-month-nav__btn" id="cal-next">→</button>
    </div>
    <div class="cal-month-grid">${cells}</div>`;

  bindMonthNavigation();
}

// --- Event detail panel ---
export async function openEventPanel(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;

  const avail = await getEventAvailability(eventId);
  const btnHtml = await buildEventButton(event, authState, avail);
  const tipCfg = TIP_CONFIG[event.tip] || { label: event.tip, color: 'cyan' };

  const panel = document.getElementById('cal-panel');
  if (!panel) return;

  panel.innerHTML = `
    <button class="cal-panel__close" onclick="closeEventPanel()">✕</button>
    <div class="cal-panel__inner">
      <span class="cal-badge cal-badge--${tipCfg.color}">${tipCfg.label}</span>
      <h2 class="cal-panel__naziv">${event.naziv}</h2>
      <div class="cal-panel__meta">
        <div class="cal-panel__meta-item">
          <span class="cal-panel__meta-icon">📅</span>
          <span>${formatDatum(event.datum)}</span>
        </div>
        <div class="cal-panel__meta-item">
          <span class="cal-panel__meta-icon">🕐</span>
          <span>${formatVrijeme(event.datum)} h · ${event.trajanje_min} min</span>
        </div>
        <div class="cal-panel__meta-item">
          <span class="cal-panel__meta-icon">📍</span>
          <a href="https://maps.google.com/?q=${encodeURIComponent(event.lokacija)}" target="_blank" rel="noopener">${event.lokacija}</a>
        </div>
        <div class="cal-panel__meta-item">
          <span class="cal-panel__meta-icon">👥</span>
          <span class="${avail.slobodna <= 3 ? 'cal-mjesta--kritican' : ''}">${avail.slobodna} slobodnih od ${avail.kapacitet} mjesta</span>
        </div>
      </div>
      ${event.opis ? `<div class="cal-panel__opis">${event.opis.replace(/\n/g, '<br>')}</div>` : ''}
      <div class="cal-panel__cta">${btnHtml}</div>
    </div>`;

  panel.classList.add('cal-panel--open');
  document.body.classList.add('cal-panel-active');
  activePanel = eventId;
}

export function closeEventPanel() {
  const panel = document.getElementById('cal-panel');
  if (panel) panel.classList.remove('cal-panel--open');
  document.body.classList.remove('cal-panel-active');
  activePanel = null;
}

// --- View toggle ---
function bindViewToggle() {
  const listBtn = document.getElementById('cal-view-list');
  const monthBtn = document.getElementById('cal-view-month');

  listBtn?.addEventListener('click', () => {
    currentView = 'list';
    listBtn.classList.add('active');
    monthBtn?.classList.remove('active');
    renderListView();
  });

  monthBtn?.addEventListener('click', () => {
    currentView = 'month';
    monthBtn.classList.add('active');
    listBtn?.classList.remove('active');
    renderMonthView();
  });
}

// --- Month navigation ---
function bindMonthNavigation() {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    renderMonthView();
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    renderMonthView();
  });
}

// ============================================================
// AKCIJE (global window functions)
// ============================================================

async function registerFree(eventId, tipPlacanja = 'pretplatnik_besplatno') {
  const user = authState.user;
  if (!user) { showLoginModal(eventId); return; }

  try {
    const btn = document.querySelector(`[data-reg="${eventId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = 'Registriram...'; }

    // Re-check kapacitet tik prije registracije (race condition zaštita)
    const avail = await getEventAvailability(eventId);
    if (avail.puno) {
      await refreshWidgetCard(eventId);
      if (document.getElementById('cal-panel')) await openEventPanel(eventId);
      alert('Žao nam je — sva mjesta su upravo popunjena.');
      return;
    }

    await registerForEvent(user.id, eventId, tipPlacanja);

    // Ažuriraj widget karticu (index.html)
    await refreshWidgetCard(eventId);
    // Otvori/osvježi panel (events.html)
    if (document.getElementById('cal-panel')) await openEventPanel(eventId);
  } catch (err) {
    const dup = err.message?.toLowerCase().includes('duplicate') || err.code === '23505';
    if (dup) {
      await refreshWidgetCard(eventId);
      return;
    }
    console.error('[Register free]', err);
    alert('Greška pri registraciji. Pokušaj ponovo.');
  }
}

async function cancelReg(eventId) {
  const user = authState.user;
  if (!user) return;

  if (!confirm('Otkazuješ registraciju za ovaj događaj?')) return;

  try {
    await cancelRegistration(user.id, eventId);
    await openEventPanel(eventId);
  } catch (err) {
    console.error('[Cancel reg]', err);
  }
}

// ============================================================
// LOGIN MODAL
// ============================================================

function showLoginModal(eventId) {
  const modal = document.getElementById('cal-login-modal');
  if (!modal) return;
  modal.dataset.pendingEvent = eventId || '';
  modal.classList.add('cal-modal--open');
}

function bindLoginModal() {
  const modal = document.getElementById('cal-login-modal');
  if (!modal) return;

  const form = modal.querySelector('#cal-login-form');
  const closeBtn = modal.querySelector('.cal-modal__close');

  closeBtn?.addEventListener('click', () => modal.classList.remove('cal-modal--open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('cal-modal--open');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const successMsg = modal.querySelector('.cal-modal__success');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Šaljem...';
      await signInWithEmail(email, { redirectTo: window.location.href });

      form.style.display = 'none';
      successMsg.style.display = 'block';
      successMsg.innerHTML = `Magični link poslan na <strong>${email}</strong>.<br>Provjeri inbox i klikni link za prijavu.`;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pošalji magični link';
      alert('Greška: ' + err.message);
    }
  });
}
