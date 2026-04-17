// ============================================================
// CALENDAR.JS — Duhodah Calendar Render Engine
// ============================================================

import { getUpcomingEvents, getEventsByMonth, getEventAvailability, registerForEvent, isUserRegistered, cancelRegistration } from './db.js';
import { getAuthState, signInWithEmail } from './auth.js';
import { supabase } from './supabase-config.js';

// Lokalizirani nazivi dana i mjeseci (HR)
const DANI = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
const DANI_PUNI = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
const MJESECI = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
                 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'];

// Cache događaja za widget (koristi se za Realtime refresh)
let eventsCache = {};

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
      return `<div class="cal-btn-group cal-btn-group--stacked">
        <button class="cal-btn cal-btn--free" onclick="showLoginModal('${event.id}')">
          Prijavi se →
        </button>
        <span class="cal-member-hint">Besplatno — unesite email za prijavu</span>
      </div>`;
    }
  }

  if (user) {
    const regStatus = await isUserRegistered(user.id, event.id);

    if (regStatus && regStatus.status === 'potvrdjena') {
      return `<div class="cal-btn-group">
        <span class="cal-registered-badge">Prijavljen/a</span>
        <button class="cal-btn cal-btn--cancel" onclick="cancelReg('${event.id}')">Otkaži</button>
      </div>`;
    }

    if (pretplataPokriva) {
      return `<button class="cal-btn cal-btn--free" data-reg="${event.id}" onclick="registerFree('${event.id}')">
        Prijavi se besplatno →
      </button>`;
    } else {
      const stripeLink = event.stripe_link || '#';
      return `<a class="cal-btn cal-btn--pay" href="${stripeLink}" target="_blank" rel="noopener">
        Kupi kartu — ${event.cijena_eur ? event.cijena_eur + ' €' : 'upitaj'} →
      </a>`;
    }
  } else {
    const stripeLink = event.stripe_link || '#';
    return `<div class="cal-btn-group cal-btn-group--stacked">
      <a class="cal-btn cal-btn--pay" href="${stripeLink}" target="_blank" rel="noopener">
        Kupi kartu — ${event.cijena_eur ? event.cijena_eur + ' €' : 'upitaj'} →
      </a>
      <span class="cal-member-hint">Pretplatnik? <a href="#" onclick="showLoginModal('${event.id}');return false;">Prijavi se za besplatnu opciju</a></span>
    </div>`;
  }
}

// ============================================================
// WIDGET ZA INDEX.HTML (sljedeća 3 događaja)
// ============================================================

export async function renderEventsWidget(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const [events, authState] = await Promise.all([
      getUpcomingEvents(6),
      getAuthState()
    ]);

    if (!events.length) {
      container.innerHTML = `<p class="cal-empty">Nema nadolazećih događaja. Provjeri uskoro.</p>`;
      return;
    }

    // Spremi događaje u cache za Realtime refresh
    events.forEach(ev => { eventsCache[ev.id] = ev; });

    const cards = await Promise.all(events.map(async (ev) => {
      const avail = await getEventAvailability(ev.id);
      const btn = await buildEventButton(ev, authState, avail);
      const tipCfg = TIP_CONFIG[ev.tip] || { label: ev.tip, color: 'cyan' };
      const uskoro = isUskoro(ev.datum);
      const d = new Date(ev.datum);
      const dayNum = d.getDate();
      const monthAbbr = MJESECI[d.getMonth()].slice(0, 3).toUpperCase();

      // Razriješi tagove i izvuci boje
      const tagovi = ev.tagovi || [];
      const resolvedTags = tagovi.map(k => TAG_DEFS.find(t => t.key === k)).filter(Boolean);
      const tipTagObj    = resolvedTags.find(t => t.group === 'tip');
      const tipColor     = tipTagObj?.color || (tipCfg.color === 'cyan' ? '#04e8ff' : '#d702f1');
      const accentBg     = `linear-gradient(90deg, ${tipColor}, transparent)`;
      const primaryLabel = tipTagObj?.label || tipCfg.label;
      const tagChipsHtml = resolvedTags.map(t =>
        `<span class="cwt" style="color:${t.color};border-color:${t.color}38;background:${t.color}14;">${t.label}</span>`
      ).join('');

      return `
        <article class="cal-widget-card${uskoro ? ' cal-widget-card--uskoro' : ''}" data-event-id="${ev.id}" style="--c-border:${tipColor}55;--c-glow:${tipColor}30;">
          <div class="cal-widget-card__accent" style="background:${accentBg};"></div>
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
              <span>📍 ${ev.lokacija.split(',')[0]}</span>
            </div>
            ${tagChipsHtml ? `<div class="cal-widget-card__tags">${tagChipsHtml}</div>` : ''}
            ${ev.opis_kratki ? `<p class="cal-widget-card__opis">${ev.opis_kratki}</p>` : ''}
            <div class="cal-widget-card__footer">
              <span class="cal-mjesta ${avail.slobodna <= 3 ? 'cal-mjesta--kritican' : ''}">${avail.slobodna} mjesta slobodno</span>
              ${btn}
            </div>
          </div>
        </article>`;
    }));

    container.innerHTML = `
      <div class="cal-widget-grid">${cards.join('')}</div>
      <div class="cal-widget-cta">
        <a href="events.html" class="cal-all-link">Svi termini i kalendar →</a>
      </div>`;

    // Realtime: smanji broj mjesta čim netko novi dođe ili ode
    supabase.channel('registracije-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registracije' }, async (payload) => {
        const evId = payload.new?.dogadjaj_id || payload.old?.dogadjaj_id;
        if (evId) await refreshWidgetCard(evId);
      })
      .subscribe();

  } catch (err) {
    console.error('[Calendar widget]', err);
    container.innerHTML = `<p class="cal-empty">Nema nadolazećih događaja. Provjeri uskoro.</p>`;
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
  const btn = await buildEventButton(event, authState, avail);
  const footer = card.querySelector('.cal-widget-card__footer');
  if (footer) {
    footer.innerHTML = `
      <span class="cal-mjesta${avail.slobodna <= 3 ? ' cal-mjesta--kritican' : ''}">${avail.slobodna} mjesta slobodno</span>
      ${btn}`;
  }
}

// ============================================================
// FULL PAGE CALENDAR (events.html)
// ============================================================

let currentView = 'list'; // 'list' | 'month'
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let allEvents = [];
let authState = {};
let activePanel = null;

export async function initFullCalendar() {
  try {
    [allEvents, authState] = await Promise.all([
      getUpcomingEvents(50),
      getAuthState()
    ]);

    renderListView();
    bindViewToggle();
    bindMonthNavigation();
    bindLoginModal();

    // Expose global functions za onclick handlere
    window.registerFree = registerFree;
    window.cancelReg = cancelReg;
    window.showLoginModal = showLoginModal;
    window.openEventPanel = openEventPanel;
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

  const cards = await Promise.all(allEvents.map(async (ev) => {
    const avail = await getEventAvailability(ev.id);
    const btn = await buildEventButton(ev, authState, avail);
    const tipCfg = TIP_CONFIG[ev.tip] || { label: ev.tip, color: 'cyan' };
    const uskoro = isUskoro(ev.datum);

    return `
      <article class="cal-list-card reveal-cal" onclick="openEventPanel('${ev.id}')">
        <div class="cal-list-card__left">
          <div class="cal-list-datum ${uskoro ? 'cal-list-datum--uskoro' : ''}">
            <span class="cal-list-datum__day">${new Date(ev.datum).getDate()}</span>
            <span class="cal-list-datum__mon">${MJESECI[new Date(ev.datum).getMonth()].slice(0,3)}</span>
          </div>
        </div>
        <div class="cal-list-card__body">
          <div class="cal-list-card__meta">
            <span class="cal-badge cal-badge--${tipCfg.color}">${tipCfg.label}</span>
            <span class="cal-list-time">${formatVrijeme(ev.datum)} h · ${ev.trajanje_min} min</span>
          </div>
          <h3 class="cal-list-card__naziv">${ev.naziv}</h3>
          <p class="cal-list-card__lokacija">📍 ${ev.lokacija}</p>
          <div class="cal-list-card__footer" onclick="event.stopPropagation()">
            <span class="cal-mjesta ${avail.slobodna <= 3 ? 'cal-mjesta--kritican' : ''}">${avail.slobodna}/${avail.kapacitet} mjesta</span>
            ${btn}
          </div>
        </div>
      </article>`;
  }));

  if (!cards.length) {
    container.innerHTML = `<p class="cal-empty">Nema nadolazećih događaja.<br>Provjeri uskoro ili <a href="index.html#kontakt">kontaktiraj Ernesta</a>.</p>`;
    return;
  }

  container.innerHTML = `<div class="cal-list">${cards.join('')}</div>`;

  // Animate cards in
  requestAnimationFrame(() => {
    document.querySelectorAll('.reveal-cal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
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

  const [avail, btn] = await Promise.all([
    getEventAvailability(eventId),
    buildEventButton(event, authState, avail || { puno: false, slobodna: 0, kapacitet: 0, prijavljeni: 0 })
  ]);

  // Re-build button with actual avail
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

    await registerForEvent(user.id, eventId, tipPlacanja);

    // Ažuriraj widget karticu (index.html)
    await refreshWidgetCard(eventId);
    // Otvori/osvježi panel (events.html)
    if (document.getElementById('cal-panel')) await openEventPanel(eventId);
  } catch (err) {
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
