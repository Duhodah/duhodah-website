// hod-sections.jsx — sekcije za Autoškolu HOD landing

// ─── HERO ───────────────────────────────────────────────
function HeroSection({ variant, onCTA }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1600);
    return () => clearInterval(id);
  }, []);
  // breathing needle that oscillates
  const breath = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(tick * 0.7));

  return (
    <section id="hod-hero" className="hod-hero">
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="hero-scanline" aria-hidden="true" />

      <div className="hero-inner">
        <div className="hero-text">
          <Eyebrow code="PRG/01">Autoškola za živčani sustav · HOD</Eyebrow>
          <h1 className="hod-h1">
            Tvoj živčani sustav ima prekidač.
            <br />
            <span className="hod-h1-accent">Nauči gdje je — i kako ga koristiti.</span>
          </h1>
          <p className="hero-sub">
            4-tjedni operativni priručnik za tvoj živčani sustav. Bez meditacije,
            bez tableta, bez duhovnosti kojoj moraš vjerovati.
            Samo fiziologija. Samo dah.
          </p>
          <div className="hero-actions">
            <a href="#hod-upisi" className="hod-btn-primary">
              <span>Rezerviraj mjesto</span>
              <span className="btn-arrow">→</span>
            </a>
            <a href="#hod-program" className="hod-btn-ghost">
              <span className="dot" />
              Otvori priručnik
            </a>
          </div>

          <div className="hero-meta">
            <div><span className="hm-k">MODUL</span><span className="hm-v">4 TJEDNA</span></div>
            <div><span className="hm-k">GRUPA</span><span className="hm-v">≤ 10 OSOBA</span></div>
            <div><span className="hm-k">FORMAT</span><span className="hm-v">UŽIVO · ONLINE</span></div>
            <div><span className="hm-k">LOKACIJA</span><span className="hm-v">OSIJEK · HR</span></div>
          </div>
        </div>

        <div className="hero-hud">
          {variant === 'gauge' && (
            <div className="hero-gauge-stack">
              <HudCard label="STANJE ŽIVČANOG SUSTAVA" code="ANS · LIVE" accent="var(--hod-accent-hot)">
                <HodGauge value={breath} label="SIMPATIKUS" sublabel="pripravnost / alarm" accent="var(--hod-accent-hot)" />
                <div className="hud-row">
                  <TickBar label="KORTIZOL" value={0.81} unit="%" accent="var(--hod-accent-hot)" />
                  <TickBar label="VARIJABILNOST DAHA" value={0.24} unit="%" accent="var(--hod-accent-mid)" />
                  <TickBar label="KOHERENTNOST" value={0.31} unit="%" accent="var(--hod-accent-cool)" />
                </div>
                <div className="hud-readout">
                  <span className="hud-warn">◉ REC</span>
                  <span>02:47 · 04.24.26</span>
                  <span>TEMP 36.9°</span>
                </div>
              </HudCard>
              <div className="hero-hud-caption">
                <span className="arrow-down">↓</span>
                <p>Ovo je prosječni polaznik <em>prije</em> tečaja.<br />Za 4 tjedna — ista skala, drugačije brojke.</p>
              </div>
            </div>
          )}
          {variant === 'circle' && (
            <HudCard label="BREATHING CYCLE" code="4·4·6·2" accent="var(--hod-accent-cool)">
              <div className="breath-circle-wrap">
                <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 320 }}>
                  <defs>
                    <radialGradient id="bgrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="var(--hod-accent-cool)" stopOpacity="0.35" />
                      <stop offset="70%" stopColor="var(--hod-accent-cool)" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="var(--hod-accent-cool)" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {[0, 1, 2, 3].map(i => (
                    <circle key={i} cx="160" cy="160" r={40 + i * 30} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '4 6'} />
                  ))}
                  <circle cx="160" cy="160" r={60 + breath * 80} fill="url(#bgrad)" stroke="var(--hod-accent-cool)" strokeWidth="1.5" />
                  <text x="160" y="156" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="14" fontFamily="var(--hod-font-mono)" letterSpacing="0.3em">
                    {breath > 0.5 ? 'UDAH' : 'IZDAH'}
                  </text>
                  <text x="160" y="175" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="var(--hod-font-mono)" letterSpacing="0.2em">
                    4·4·6·2
                  </text>
                </svg>
              </div>
              <div className="hud-row">
                <TickBar label="UDAH" value={breath > 0.5 ? breath : 0} unit="%" accent="var(--hod-accent-cool)" />
                <TickBar label="IZDAH" value={breath <= 0.5 ? 1 - breath : 0} unit="%" accent="var(--hod-accent-mid)" />
              </div>
            </HudCard>
          )}
          {variant === 'vitals' && (
            <HudCard label="VITALNI ZAPIS · 02:47" code="REM/— · SWS/—" accent="var(--hod-accent-hot)">
              <div className="vitals-grid">
                <div className="vital-big">
                  <span className="vital-v" style={{ color: 'var(--hod-accent-hot)' }}>86</span>
                  <span className="vital-u">BPM</span>
                </div>
                <div className="vital-big">
                  <span className="vital-v" style={{ color: 'var(--hod-accent-mid)' }}>22</span>
                  <span className="vital-u">UD/MIN</span>
                </div>
                <div className="vital-big">
                  <span className="vital-v" style={{ color: 'var(--hod-accent-cool)' }}>4.2</span>
                  <span className="vital-u">HRV ms</span>
                </div>
              </div>
              <svg viewBox="0 0 320 80" style={{ width: '100%', marginTop: '1rem' }}>
                <path
                  d="M0,40 L30,40 L40,40 L50,20 L55,60 L60,40 L100,40 L110,40 L120,18 L125,62 L130,40 L180,40 L200,40 L210,15 L215,65 L220,40 L280,40 L320,40"
                  fill="none" stroke="var(--hod-accent-hot)" strokeWidth="1.5" />
              </svg>
              <div className="hud-readout">
                <span className="hud-warn">◉ ALARM: SIMPATIKUS ON</span>
                <span>SAN 34%</span>
              </div>
            </HudCard>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── PREPOZNAJ SE (pain grid) ─────────────────────────────
function PainSection() {
  const pains = [
    { code: "01:14", title: "Padaš bez trunke energije. Mozak se pali.", body: "01:14... 02:47... 04:22. Poznaješ te brojeve. Lebiš između umora i budnosti — tijelo je iscrpljeno, ali živčani sustav ne daje dozvolu za san." },
    { code: "02:03", title: "Ramena kao beton. Čeljust u grču.", body: "Masaža pomogne dva-tri dana. Četvrti dan — sve isto. Jer napetost nije samo u mišiću. Napetost je naredba koju mozak stalno šalje tijelu." },
    { code: "03:21", title: "Tijelo reagira prije uma.", body: "Eksplodiraš zbog sitnice, pa ti je žao. Ili se potpuno zamrzneš kad bi trebao reagirati. I ne znaš kako to zaustaviti — jer okidač nije misao, nego signal u tijelu." },
    { code: "04:07", title: "Kava da se pokreneš. Vino da se ugasiš.", body: "Stimulans da kreneš. Depresant da staneš. Dva kemijska haka za sustav koji sam po sebi ne zna prebaciti brzinu. Nije navika — to je kompenzacija." },
    { code: "05:18", title: "Izvana funkcioniraš. Iznutra goriš.", body: "Pišeš, radiš, ideš na sastanke. Nitko ne vidi. Ali ti znaš da negdje ispod površine gori nešto što ne bi trebalo. I svaki dan malo više." },
    { code: "06:44", title: "Razumiješ da je stres — tijelo ne sluša.", body: "Svjesnost nije dovoljna. Čitaš knjige, znaš teoriju, razumiješ okidače. Tijelo i dalje radi svoje — jer informacija ne putuje od uma prema živcima. Putuje obrnuto." },
  ];

  return (
    <section className="hod-section wide" id="hod-prepoznaj">
      <SectionHeader
        code="MOD/01"
        eyebrow="DIJAGNOSTIČKI ZAPIS"
        title="Zvuči li ti ovo poznato?"
        subtitle="Šest najčešćih očitanja kod polaznika prije tečaja. Prepoznaj sebe."
      />
      <div className="pain-grid">
        {pains.map((p, i) => (
          <Crosshair key={i} label={p.title} code={p.code}>
            <p>{p.body}</p>
          </Crosshair>
        ))}
      </div>

      <div className="epiphany-note">
        <span className="ep-badge">◎ NAPOMENA</span>
        <p>
          Ako ti je barem jedna zvučala poznato — <strong>nisi jedini u tome.</strong>
          I nije to karakter. To je <strong>fiziologija</strong>.
          A fiziologija se može prekalibrirati.
        </p>
      </div>
    </section>
  );
}

// ─── ALTERNATIVES ─────────────────────────────────
function AlternativesSection() {
  const alts = [
    { label: "MEDITACIJA", sign: "✕", body: "Radi odozgo prema dolje — um pokušava smiriti tijelo. Ali anksioznost nije misao koja se pojavila. To je signal koji je tijelo poslalo mozgu. Smiriš misao, signal ostaje. Frustracija na vrhu anksioznosti." },
    { label: "MASAŽA", sign: "✕", body: "Opušta mišiće — ali ne gasi signal koji ga steže. Dok je simpatikus zaglavio na ON, tijelo se automatski vraća u napetost. Ne zato što nešto radiš krivo. Već zato što noga još uvijek stišće papučicu gasa." },
    { label: "MELATONIN · CBD · Mg", sign: "✕", body: "Flaster, ne lijek. Pomognu večeras. Ne dotaknu korijen: živčani sustav koji ne zna kako sam sebe isključiti. Sutra ujutro — isti dan, iste reakcije, isti umor." },
    { label: "VJEŽBANJE", sign: "✕", body: "Za nekoga tko je u deficitu — spas. Za nekoga tko je stalno u pogonu — dolivanje ulja na vatru. Vježbanje aktivira simpatikus. Ako on već gori 16 sati na dan, trening ga ne gasi. Još ga više opterećuje." },
    { label: "TERAPIJA", sign: "✕", body: "Liječi priču — i to vrijedi. Razumiješ odakle stres dolazi, što ga hrani, zašto traje. Ali razumijevanje ne putuje do amigdale. Tijelo i dalje reagira kao da priča nije ispričana. Dvije različite adrese." },
  ];

  return (
    <section className="hod-section" id="hod-alt">
      <SectionHeader
        code="MOD/02"
        eyebrow="ISKLJUČENE RUTE"
        title="Sve je već prošlo kroz tvoje ruke."
        subtitle="Svaki alat ispod radi — ali na krivi sustav. To nije tvoja greška."
      />
      <div className="alt-list">
        {alts.map((a, i) => (
          <div key={i} className="alt-row">
            <div className="alt-sign">
              <RoadSign shape="circle" color="var(--hod-accent-hot)" small>
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{a.sign}</span>
              </RoadSign>
            </div>
            <div className="alt-body">
              <div className="alt-label">
                <span className="alt-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="alt-name">{a.label}</span>
                <span className="alt-line" />
              </div>
              <p>{a.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="alt-footnote">
        — — — Nijedan od tih alata ne pristupa <em>direktno</em> živčanom sustavu.
        A to je <strong>jedino</strong> mjesto gdje se problem rješava.
      </p>
    </section>
  );
}

// ─── EPIPHANY / NOVI MEHANIZAM ─────────────────────────
function EpiphanySection() {
  return (
    <section className="hod-section" id="hod-mehanizam">
      <SectionHeader
        code="MOD/03"
        eyebrow="NOVI MEHANIZAM"
        title="Postoji samo jedan backdoor."
        subtitle="Dok god simpatikus zuji, tijelo ne može spavati, probavljati, fokusirati, smiriti se. Razlog ovakav:"
      />

      <div className="cannot-grid">
        {[
          ['01', 'spavati duboko'],
          ['02', 'probavljati'],
          ['03', 'zadržati fokus'],
          ['04', 'osjećati mir bez "razloga"'],
        ].map(([n, t], i) => (
          <div key={i} className="cannot-row">
            <span className="cannot-num">{n}</span>
            <span className="cannot-x">✕</span>
            <span className="cannot-text">{t}</span>
          </div>
        ))}
      </div>

      <div className="epiphany-box">
        <div className="ep-head">
          <span className="ep-code">◉ PRISTUP · 01</span>
          <span className="ep-div" />
        </div>
        <h3 className="ep-title">Disanje.</h3>
        <p>
          Jedini sustav u tijelu koji je <strong>automatski</strong>, ali kojim možeš
          upravljati <strong>voljom</strong>. Jedini direktan ulaz u parasimpatikus.
        </p>
        <p>
          Nije wellness. Nije duhovnost. <strong>Fiziologija</strong> — ista ona iza
          kliničkih protokola u kriznim intervencijama.
        </p>
        <div className="ep-facts">
          <div><span>23 000</span>×/dan koristiš ga</div>
          <div><span>27%</span>rast GABA <em>(Streeter, 2010)</em></div>
          <div><span>60s</span>do mjerljive promjene u ANS-u</div>
        </div>
      </div>
    </section>
  );
}

// ─── FASCINATIONS (što ćeš naučiti) ─────────────────
function FascinationsSection() {
  const items = [
    ['◉', 'Zašto "duboko udahni" zapravo pogoršava anksioznost — i što raditi umjesto toga.'],
    ['◉', '90-sekundni obrazac koji prebacuje tijelo iz panike u sigurnost — isti koji koriste psiholozi u kriznim intervencijama.'],
    ['◉', 'Zašto nema energije cijeli dan, a noću ne možeš zaspati — i to nema veze s ekranima ni kavom.'],
    ['◉', 'Kako preživjeti pad energije u 14h bez treće kave — 3-minutni aktivacijski obrazac koji djeluje odmah.'],
    ['◉', 'Obrazac koji za 27% podiže GABA-u — tvar za smirenje i anti-anksioznost.'],
    ['◉', 'Tvoj mozak troši 20% kisika — a možda dišeš na 40% kapaciteta. Matematika ne laže.'],
    ['◉', 'Zašto masaža drži 2 dana — i što zapravo drži tvoje mišiće u grču bez tvog znanja.'],
    ['◉', 'Točna veza između stisnute čeljusti i živčanog sustava — i zašto udica nije u čeljusti.'],
    ['◉', 'Zašto se razboljavaš baš kad "staneš" — godišnji, vikend — i to nije slučajnost.'],
    ['◉', 'Jedna stvar koju rade svi koji zaspe lako — a ni ne znaju da je rade.'],
  ];

  return (
    <section className="hod-section" id="hod-naucit-ces">
      <SectionHeader
        code="MOD/04"
        eyebrow="NASTAVNI PLAN"
        title="Evo samo dijela onoga što ćeš otkriti:"
      />
      <ul className="fasc-list">
        {items.map(([icon, text], i) => (
          <li key={i} className="fasc-item">
            <span className="fasc-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="fasc-dot">{icon}</span>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── PROGRAM INTRO ─────────────────────────────
function ProgramIntroSection() {
  return (
    <section className="hod-section narrow" id="hod-program">
      <SectionHeader
        code="PRG/01"
        eyebrow="PROGRAM"
        title={<>Zato sam stvorio <span className="accent-cool">Autoškolu za živčani sustav.</span></>}
      />
      <p className="hod-p">
        Ovo nije "još jedan tečaj disanja." Nema mantri. Nema meditacije.
        Nema duhovnosti kojoj moraš vjerovati.
      </p>
      <p className="hod-p">
        Ovo je <strong>4-tjedni operativni priručnik za tvoj živčani sustav</strong> —
        utemeljen na neuroznanosti autonomnog živčanog sustava, primijenjen
        na tvoj svakodnevni život.
      </p>

      <div className="author-card">
        <div className="author-avatar">
          <svg viewBox="0 0 80 80" width="72" height="72">
            <circle cx="40" cy="40" r="38" fill="none" stroke="var(--hod-accent-cool)" strokeWidth="1" strokeDasharray="3 4" />
            <text x="40" y="48" textAnchor="middle" fill="var(--hod-accent-cool)" fontSize="28" fontFamily="var(--hod-font-display)" fontWeight="700">E</text>
          </svg>
        </div>
        <div className="author-text">
          <p>
            Ja sam <strong>Ernest (Erni)</strong>, osnivač Duhodaha.
            Dedicirani i certificirani breathwork instruktor u Slavoniji. Nisam ovdje
            da ti prodam zen. Ovdje sam da ti dam alat koji radi — i koji
            možeš koristiti u autu, na poslu, u krevetu u 02:47.
          </p>
          <cite>— ERNEST · OSNIVAČ · OSIJEK</cite>
        </div>
      </div>
    </section>
  );
}

// ─── CURRICULUM (4 tjedna) ─────────────────────────
function CurriculumSection() {
  const weeks = [
    { n: '01', tag: 'KOČNICA', sign: '▢', color: 'var(--hod-accent-hot)', title: '"Zašto sam uvijek na rubu?"', body: 'Upoznaješ svog unutarnjeg krokodila — simpatikus. Prepoznaješ osobne okidače i rane signale prije nego eksplodiraš ili implodiraš. Prve vježbe regulacije za iste večeri.', km: '0 km' },
    { n: '02', tag: 'GAS', sign: '◈', color: 'var(--hod-accent-mid)', title: '"Kako se aktivirati bez stimulansa?"', body: 'Punjenje energije bez kofeina i adrenalina. Nosno disanje, jutarnji protokol, obrazac koji zamjenjuje drugi espresso — bez crasha u 15h.', km: '25 km' },
    { n: '03', tag: 'MJENJAČ', sign: '◇', color: 'var(--hod-accent-cool)', title: '"Regulacija u hodu — u pravom životu."', body: 'Tehnike za situacije koje ne čekaju: stresni sastanak, svađa, gužva, napad panike u trgovini. Prebacuješ brzine za <2 min, bez da netko primijeti.', km: '50 km' },
    { n: '04', tag: 'TEMPOMAT', sign: '◎', color: 'var(--hod-accent-soft)', title: '"Autonomija — novi temelj."', body: 'Integracija u osobni protokol od 5-10 min dnevno. Dugoročna regulacija. Postavljaš novi bazalni tonus živčanog sustava — radi i kad ti ne misliš na to.', km: '100 km' },
  ];

  return (
    <section className="hod-section" id="hod-curriculum">
      <SectionHeader
        code="PRG/02"
        eyebrow="DIONICE PUTA"
        title="4 tjedna. 4 modula. 1 alat koji nosiš zauvijek."
        subtitle="120 minuta tjedno uživo u Osijeku (ili online). Promjene se osjete već u prvom tjednu."
      />

      <div className="route">
        <div className="route-line" />
        {weeks.map((w, i) => (
          <div key={i} className="route-stop">
            <div className="route-marker" style={{ '--marker-color': w.color }}>
              <span className="marker-sign">{w.sign}</span>
              <span className="marker-km">{w.km}</span>
            </div>
            <div className="route-card">
              <div className="route-head">
                <span className="route-tjedan">TJEDAN</span>
                <span className="route-n" style={{ color: w.color }}>{w.n}</span>
                <span className="route-tag" style={{ color: w.color, borderColor: w.color }}>{w.tag}</span>
              </div>
              <h4>{w.title}</h4>
              <p>{w.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bonus-strip">
        <span className="bonus-badge">+ BONUS</span>
        <div>
          <strong>1 mjesec Online Pretplate — besplatno</strong>
          <span className="bonus-val">vrijednost 35€</span>
          <p>Polaznici dobivaju prvi mjesec online pristupa svim budućim sesijama. Nastavljaš vježbati bez da ti išta ispadne iz navike.</p>
        </div>
      </div>
    </section>
  );
}

// ─── ZA KOGA / NIJE ZA KOGA ─────────────────────────
function FitSection() {
  const isFor = [
    'Pod kroničnim stresom si — i hoćeš promjenu od korijena',
    'Dosta ti je kave da uspiješ probuditi i vina da se ugasiš',
    'Eksplodiraš, ili se smrzneš — tijelo reagira prije uma',
    'Uložit ćeš 10 min dnevno i 4 × 120 min u alat koji nosiš zauvijek',
    'Skepticizam je dobrodošao — ne trebaš vjerovati, testiraj!',
    'Živiš u Osijeku ili online — svugdje',
  ];
  const notFor = [
    'Tražiš brzi fix, bez ikakve prakse',
    'Svjesno disanje je woo-woo — i zatvorenost za dokaze vlastite fiziologije',
    'Čekaš da netko drugi odradi posao za tebe',
    'U aktivnoj psihijatrijskoj krizi — ovo nije klinička zamjena',
    'Tražiš instant rezultate — promjene se grade 4 tjedna, ne 4 minute',
  ];

  return (
    <section className="hod-section wide" id="hod-fit">
      <SectionHeader
        code="PRG/03"
        eyebrow="FILTER"
        title="Ovo nije za svakoga."
        subtitle="Volim biti direktan. Iskustvo je bolje kad smo svi na istoj stranici."
      />

      <div className="fit-grid">
        <div className="fit-col is-for">
          <div className="fit-head">
            <RoadSign shape="triangle" color="var(--hod-accent-cool)" small>
              <span className="tri-txt">✓</span>
            </RoadSign>
            <div>
              <span className="fit-label">PRISTUP DOZVOLJEN</span>
              <h3>Ovo JE za tebe ako…</h3>
            </div>
          </div>
          <ul>
            {isFor.map((t, i) => (
              <li key={i}><span className="li-num">{String(i + 1).padStart(2, '0')}</span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="fit-col not-for">
          <div className="fit-head">
            <RoadSign shape="circle" color="var(--hod-accent-hot)" small>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>✕</span>
            </RoadSign>
            <div>
              <span className="fit-label">PRISTUP OGRANIČEN</span>
              <h3>NIJE za tebe ako…</h3>
            </div>
          </div>
          <ul>
            {notFor.map((t, i) => (
              <li key={i}><span className="li-num">{String(i + 1).padStart(2, '0')}</span>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ─────────────────────────
function TestimonialsSection() {
  const t = [
    {
      body: 'Naučila sam primijeniti disanje na razne situacije — podizanje energije kad mi nedostaje, spuštanje kad me preuzme simpatikus, kako biti prisutna i fokusirana. Dobrobit se već osjeti jer uz našeg krokodila spavam kao beba. Veselija sam, smirenija, poletnija.',
      author: 'RENATA ŠTERN',
      role: 'POLAZNICA',
      metric: ['SAN', '+62%'],
    },
    {
      body: 'Autoškola me praktično naučila kako svjesnim disanjem proći kroz napad panike. Kao osoba koja živi s astmom cijeli život, smanjila sam kortikosteroidnu terapiju za više od pola. Kad jednom naučiš — ne vraćaš se na staro.',
      author: 'VESNA SAPLAIĆ',
      role: 'POLAZNICA',
      metric: ['LIJEKOVI', '−54%'],
    },
    {
      body: 'Uletjelo u moj život u stresnom periodu — simptomi imaju naziv Burnout. U Autoškoli sam dobila uvid što se događa u tijelu i ono najbitnije — kako se brzo izbaciti iz stanja stresa samo svjesnim disanjem. Nadam se da nastavak slijedi.',
      author: 'TIHANA KOVAČIĆ',
      role: 'POLAZNICA',
      metric: ['BURNOUT', 'RECOVERY'],
    },
    {
      body: 'Naučila sam ono što bi svi trebali znati, a ne znamo. Imamo dah, to nam je život, a tako malo znamo o njemu. Svjesno disanje primjenjujem svakodnevno — u autu, kad mi nešto digne živac, sada se znam smiriti vrlo brzo.',
      author: 'IVA ZAVAGNI',
      role: 'POLAZNICA',
      metric: ['DNEVNO', '100%'],
    },
  ];

  return (
    <section className="hod-section wide" id="hod-testimonials">
      <SectionHeader
        code="EVAL/01"
        eyebrow="TERENSKI ZAPIS"
        title="Ne vjeruj meni. Čitaj njih."
      />

      <div className="t-grid">
        {t.map((x, i) => (
          <div key={i} className="t-card">
            <div className="t-head">
              <span className="t-idx">{String(i + 1).padStart(2, '0')} / 04</span>
              <span className="t-metric">
                <span className="t-m-k">{x.metric[0]}</span>
                <span className="t-m-v">{x.metric[1]}</span>
              </span>
            </div>
            <p>{x.body}</p>
            <div className="t-foot">
              <span className="t-author">{x.author}</span>
              <span className="t-role">{x.role}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── GARANCIJA ─────────────────────────
function GuaranteeSection() {
  return (
    <section className="hod-section narrow" id="hod-garancija">
      <div className="guarantee">
        <div className="guarantee-stamp">
          <svg viewBox="0 0 140 140" width="120" height="120">
            <circle cx="70" cy="70" r="66" fill="none" stroke="var(--hod-accent-cool)" strokeWidth="1" />
            <circle cx="70" cy="70" r="58" fill="none" stroke="var(--hod-accent-cool)" strokeWidth="0.5" strokeDasharray="2 4" />
            <text x="70" y="60" textAnchor="middle" fill="var(--hod-accent-cool)" fontSize="10" fontFamily="var(--hod-font-mono)" letterSpacing="0.2em">100% GUARANTEE</text>
            <text x="70" y="80" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="22" fontFamily="var(--hod-font-display)" fontWeight="700">OSJETI</text>
            <text x="70" y="100" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="22" fontFamily="var(--hod-font-display)" fontWeight="700">RAZLIKU</text>
          </svg>
        </div>
        <div>
          <Eyebrow code="POLICA/01" accent="var(--hod-accent-cool)">Garancija</Eyebrow>
          <h3>Nakon prvog tjedna — ili novac natrag.</h3>
          <p>
            Ne osjetiš <strong>mjerljivu razliku</strong> u razini stresa ili
            kvaliteti sna nakon prvog tjedna — vraćam ti novac. Bez pitanja.
            Bez objašnjavanja. Bez sitnog tiska.
          </p>
          <p className="gu-sig">
            Znam da ovo radi. Želim da i ti to znaš — bez rizika.
            <br />— ERNEST · OSNIVAČ
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── URGENCIJA / VALUE STACK / CTA ─────────────────────────
function UpisiSection() {
  const rows = [
    ['4 × 120 min uživo (ili online)', 'core program'],
    ['Osobni protokol disanja za tvoj profil', 'individualno'],
    ['Materijali i vježbe za svaki tjedan', 'tvoje zauvijek'],
    ['Bonus: 1 mj. online pristupa (35€)', 'besplatno', 'cool'],
    ['100% garancija povrata — bez pitanja', 'bez rizika', 'cool'],
  ];

  return (
    <section className="hod-section narrow urgencija" id="hod-upisi">
      <SectionHeader
        code="UPIS/NOW"
        eyebrow="REZERVACIJA MJESTA"
        title="Sljedeća grupa — max 10 polaznika."
        subtitle="Kad se popune, zatvaramo prijave. Sljedeća nije sigurno za tjedan dana."
      />

      <div className="stack-card">
        <div className="stack-head">
          <span className="stack-label">INVESTICIJA · HOD</span>
          <span className="stack-code">SKU · AUT-HOD-01</span>
        </div>
        <div className="stack-rows">
          {rows.map(([k, v, tone], i) => (
            <div key={i} className="stack-row">
              <span className="sr-k">{k}</span>
              <span className={`sr-v ${tone || ''}`}>{v}</span>
            </div>
          ))}
          <div className="stack-row total">
            <span className="sr-k">Tvoja investicija</span>
            <span className="sr-total">149<em>€</em></span>
          </div>
        </div>
        <a href="https://duhodah.com/napomena.html?go=https%3A%2F%2Fbuy.stripe.com%2F5kQ00j0qygKyc8d0W7dby07&tip=autoskola_hod" className="hod-btn-primary full">
          <span>Rezerviraj svoje mjesto</span>
          <span className="btn-arrow">→</span>
        </a>
        <p className="stack-note">Plaćanje sigurno putem Stripe-a. Mjesta se popunjavaju redoslijedom prijava.</p>
      </div>
    </section>
  );
}

// ─── COST OF INACTION ─────────────────────────
function InactionSection() {
  return (
    <section className="hod-section narrow" id="hod-inaction">
      <SectionHeader
        code="ALT/00"
        eyebrow="ALTERNATIVNA RUTA"
        title="Možeš i zatvoriti ovu stranicu."
        accent="var(--hod-accent-hot)"
      />
      <div className="inaction">
        <p>
          Možeš nastaviti piti tri kave da uspeš — i čašu vina da staneš.
          Okretati se u krevetu u 02:47. Eksplodirati na ljude koje voliš
          i osjećati grižnju koja dolazi za tim.
        </p>
        <p>
          Možeš ići na masažu. Trošiti na suplemente. Pokušavati meditirati.
          <strong> I vraćati se na isto.</strong>
        </p>
        <p>
          Legitimna opcija. Bez osude. Ali znaš što će biti za godinu dana
          ako se ništa ne promijeni. Jer se nije promijenilo u zadnjih pet.
          <strong> Stres koji ignoriraš — ne jenjava. Akumulira se.</strong>
        </p>
      </div>
      <p className="inaction-close">
        Ili možeš uložiti 4 tjedna u alat koji nosiš zauvijek.
      </p>
      <div className="center">
        <a href="#hod-upisi" className="hod-btn-primary">
          <span>Rezerviraj mjesto</span>
          <span className="btn-arrow">→</span>
        </a>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────
function FaqSection() {
  const faqs = [
    {
      q: 'Nemam vremena za još jedan program.',
      a: 'Jednom tjedno, 120 min — kroz 4 tjedna. 8 sati ukupno. Između: 5–10 min dnevno. Ako nalaziš 10 min za kavu, nalaziš 10 min za ovo. A kava ne rješava problem.',
    },
    {
      q: 'Je li ovo sigurno? Imam zdravstvenih problema.',
      a: 'Svjesno disanje je sigurno za veliku većinu odraslih. Ako imaš kardiovaskularne probleme, epilepsiju, trudnoću ili aktivnu psihijatrijsku krizu — konzultiraj liječnika prije. Prijaviš li na prvom susretu, prilagodbe su moguće.',
    },
    {
      q: 'Dostupno online? Ne živim u Osijeku.',
      a: 'Da. Autoškola HOD dostupna je i u potpunosti online — live sesije putem videopoziva. Materijali, vježbe i interakcija su isti.',
    },
    {
      q: 'Nema iskustva s meditacijom ni breathworkom. Je li ovo za mene?',
      a: 'Savršeno si polaznik. Ovo nije meditacija — nema potrebe za prethodnim iskustvom. Kreće od nule. Skeptici su često naši najbolji polaznici — testiraju sve i budu iznenađeni.',
    },
    {
      q: 'Što ako ne osjetim razliku?',
      a: '100% garancija povrata nakon prvog tjedna. Ako ne osjećaš mjerljivu razliku u razini stresa ili kvaliteti sna — vraćam novac. Bez pitanja. Uzimam rizik na sebe.',
    },
    {
      q: 'Zašto su grupe male?',
      a: 'Max 10 polaznika po grupi — to je granica, ne "otprilike toliko." Mali format znači da svaki susret dobije moju pažnju i prilagodbu grupi. Kad se popune, zatvaramo prijave.',
    },
  ];

  return (
    <section className="hod-section" id="hod-faq">
      <SectionHeader
        code="FAQ/00"
        eyebrow="PROVJERA"
        title="Česta pitanja"
      />
      <div className="faq-list">
        {faqs.map((f, i) => (
          <details key={i}>
            <summary>
              <span className="faq-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="faq-q">{f.q}</span>
              <span className="faq-plus">+</span>
            </summary>
            <div className="faq-a">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

// ─── FOOTER ─────────────────────────
function FooterSection() {
  return (
    <footer id="hod-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-mark">◎ DUHODAH</span>
          <span className="footer-dot">·</span>
          <span>SPIRIT · BREATH · OSIJEK</span>
        </div>
        <div className="footer-links">
          <a href="https://duhodah.com">duhodah.com</a>
          <a href="mailto:duhodahos@gmail.com">duhodahos@gmail.com</a>
          <a href="https://instagram.com/duhodahos">@duhodahos</a>
        </div>
        <div className="footer-meta">© 2026 · Ivana Gundulića 5, Osijek · HR</div>
      </div>
    </footer>
  );
}

// ─── SECTION HEADER (shared) ─────────────────────────
function SectionHeader({ code, eyebrow, title, subtitle, accent }) {
  return (
    <div className="section-head">
      <div className="section-head-top">
        <span className="section-code">{code}</span>
        <span className="section-line" />
        <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
      </div>
      <h2 className="hod-h2">{title}</h2>
      {subtitle && <p className="section-sub">{subtitle}</p>}
    </div>
  );
}

Object.assign(window, {
  HeroSection, PainSection, AlternativesSection, EpiphanySection,
  FascinationsSection, ProgramIntroSection, CurriculumSection, FitSection,
  TestimonialsSection, GuaranteeSection, UpisiSection, InactionSection,
  FaqSection, FooterSection, SectionHeader,
});
