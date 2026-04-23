// Mobile nav — handled by unified nav toggle at bottom of file

(function(){
        var v = document.getElementById('vortex-bg');
        if (window.innerWidth <= 768) {
          v.querySelector('source').src = 'video/duhodah-brand.mp4';
          v.load();
          v.style.width     = '92vw';
          v.style.height    = '52vw';
          v.style.top       = '10%';
          v.style.left      = '50%';
          v.style.transform = 'translate(-50%, 0)';
          v.style.objectFit = 'contain';
        } else {
          var clips = [
            'video/vortex-anim.mp4',
            'video/vortex-anim-b.mp4',
            'video/vortex-anim-c.mp4',
            'video/duhodah-brand.mp4'
          ];
          var pick = clips[Math.floor(Math.random() * clips.length)];
          v.querySelector('source').src = pick;
          v.load();
          var base = 46.07;
          var scale = 0.4 + Math.random() * 0.8;
          var size = (base * scale).toFixed(2);
          v.style.width  = size + 'vw';
          v.style.height = size + 'vh';
        }
      })();

// ─── STARFIELD ───────────────────────────────
    const canvas = document.getElementById('stars-canvas');
    const ctx = canvas.getContext('2d');
    let stars = [];
    let W, H;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function createStars(n = 180) {
      stars = [];
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.2 + 0.2,
          o: Math.random() * 0.6 + 0.1,
          speed: Math.random() * 0.15 + 0.02,
          // Color from brand palette
          color: ['#a5ffff','#04ffff','#8bbad8','#808ec1','#e488d1'][Math.floor(Math.random() * 5)]
        });
      }
    }

    function drawStars() {
      ctx.clearRect(0, 0, W, H);

      // Deep space gradient
      const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(21,21,77,0.4)');
      grad.addColorStop(0.5, 'rgba(13,13,34,0.6)');
      grad.addColorStop(1, 'rgba(8,8,26,0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.o;
        ctx.fill();

        // Slow twinkle
        s.o += Math.sin(Date.now() * 0.001 * s.speed) * 0.003;
        s.o = Math.max(0.05, Math.min(0.7, s.o));
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(drawStars);
    }

    window.addEventListener('resize', () => { resize(); createStars(); });
    resize();
    createStars();
    drawStars();

    // ─── NAVBAR SCROLL ───────────────────────────
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    });

    // ─── SCROLL REVEAL ───────────────────────────
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ─── BREATHING TEXT CYCLE ────────────────────
    const breathTexts = ['UDAHNI', 'ZADRŽI', 'IZDAHNI', 'PAUZA'];
    let breathIdx = 0;
    const breathDurations = [4000, 2000, 6000, 2000];

    // ─── FORM SUBMIT ────────────────────────────
    // Inicijalizirano iz ESM modula ispod — placeholder ovdje radi backward compat
    function handleSubmit(e) {
      e.preventDefault();
      if (window._duhodahContactSubmit) {
        window._duhodahContactSubmit(e);
      } else {
        document.getElementById('contact-form').style.display = 'none';
        document.getElementById('form-success').classList.add('show');
      }
    }

    // ─── SMOOTH ANCHOR SCROLL ────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // ─── PARALLAX ORB (subtle) ───────────────────
    document.addEventListener('mousemove', e => {
      const orb = document.querySelector('.orb-wrapper');
      if (!orb) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      orb.style.transform = `translate(${x}px, ${y}px)`;
    });

    // ─── AUDIO PLAYER ────────────────────────────
    // Da dodaš novu pjesmu: dodaj objekt u TRACKS niz i spremi MP3 u website/audio/
    const TRACKS = [
  {
    "title": "++++Doma 1e",
    "desc": "Duhodah · Breathwork",
    "file": "audio/++++Doma 1e.mp3",
    "dur": "6:00",
    "art": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>"
  },
  {
    "title": "++++I Let It Go 1a",
    "desc": "Duhodah · Breathwork",
    "file": "audio/++++I Let It Go 1a.mp3",
    "dur": "5:02",
    "art": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>"
  },
  {
    "title": "+++I Let It Go 1c",
    "desc": "Duhodah · Breathwork",
    "file": "audio/+++I Let It Go 1c.mp3",
    "dur": "5:19",
    "art": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>"
  },
  {
    "title": "+++Vraćam se u tijelo 4a",
    "desc": "Duhodah · Breathwork",
    "file": "audio/+++Vraćam se u tijelo 4a.mp3",
    "dur": "5:27",
    "art": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>"
  }
];

    const ICO_PLAY  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    const ICO_PAUSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
    const ICO_VOL_HI   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>`;
    const ICO_VOL_LO   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>`;
    const ICO_VOL_MUTE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    const ICO_DOWN     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;

    let npIdx    = -1;
    let npActive = false;
    const npAudio = new Audio();
    npAudio.volume = 0.8;

    function npFmt(s) {
      if (!isFinite(s) || isNaN(s)) return '0:00';
      const m = Math.floor(s / 60), sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, '0')}`;
    }

    const WAVEFORM_H = [25,45,65,80,90,70,55,85,95,75,60,80,70,50,85,60,40,25];

    function buildWaveform() {
      return WAVEFORM_H.map((h, i) =>
        `<span class="wbar" style="height:${h}%;animation-delay:${(i * 0.055).toFixed(3)}s"></span>`
      ).join('');
    }

    function npRenderList() {
      const el = document.getElementById('tracks-list');
      if (!el) return;
      el.innerHTML = TRACKS.map((t, i) => `
        <div class="track-item" id="trow-${i}" data-i="${i}">
          <div class="track-first-col">
            <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
            <button class="track-play-btn" data-i="${i}" aria-label="Reproduciraj ${t.title}">${ICO_PLAY}</button>
          </div>
          <div class="track-info">
            <div class="track-title">${t.title}</div>
            <div class="track-desc">${t.desc}</div>
          </div>
          <div class="track-waveform">${buildWaveform()}</div>
          <div class="track-duration" id="tdur-${i}">${t.dur}</div>
          <a class="track-dl" href="${t.file}" download="${t.title}.mp3"
             title="Preuzmi ${t.title}" aria-label="Preuzmi ${t.title}"
             onclick="event.stopPropagation()">${ICO_DOWN}</a>
        </div>
      `).join('');

      el.querySelectorAll('.track-item').forEach(row => {
        row.addEventListener('click', e => {
          if (e.target.closest('.track-dl')) return;
          npToggle(+row.dataset.i);
        });
      });
      el.querySelectorAll('.track-play-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          npToggle(+btn.dataset.i);
        });
      });
    }

    function npSetVisuals(idx) {
      document.querySelectorAll('.track-item').forEach((r, i) => {
        r.classList.toggle('playing', i === idx);
        const btn = r.querySelector('.track-play-btn');
        if (btn) btn.innerHTML = (i === idx && npActive) ? ICO_PAUSE : ICO_PLAY;
      });
      const t = TRACKS[idx];
      document.getElementById('np-stitle').textContent = t.title;
      document.getElementById('np-sdesc').textContent  = t.desc;
      document.getElementById('np-tot').textContent    = t.dur;
      document.getElementById('np-art').innerHTML      = t.art;
    }

    function npLoad(idx) {
      npIdx = idx;
      npAudio.src = TRACKS[idx].file;
      npAudio.load();
      npSetVisuals(idx);
    }

    function npPlay() {
      npAudio.play()
        .then(() => {
          npActive = true;
          const mainBtn = document.getElementById('np-main');
          mainBtn.innerHTML = ICO_PAUSE;
          mainBtn.classList.add('is-playing');
          document.getElementById('np-bar').classList.add('active');
          document.body.style.paddingBottom = '70px';
          const btn = document.querySelector(`.track-play-btn[data-i="${npIdx}"]`);
          if (btn) btn.innerHTML = ICO_PAUSE;
        })
        .catch(() => {
          // Datoteka nije dostupna — kratki vizualni feedback
          const row = document.getElementById(`trow-${npIdx}`);
          if (row) {
            row.style.transition = 'opacity 0.3s';
            row.style.opacity = '0.4';
            setTimeout(() => { row.style.opacity = ''; }, 900);
          }
        });
    }

    function npPause() {
      npAudio.pause();
      npActive = false;
      const mainBtn = document.getElementById('np-main');
      mainBtn.innerHTML = ICO_PLAY;
      mainBtn.classList.remove('is-playing');
      const btn = document.querySelector(`.track-play-btn[data-i="${npIdx}"]`);
      if (btn) btn.innerHTML = ICO_PLAY;
    }

    function npToggle(idx) {
      if (npIdx === idx) {
        npActive ? npPause() : npPlay();
      } else {
        npLoad(idx);
        npPlay();
      }
    }

    // Audio events
    npAudio.addEventListener('loadedmetadata', () => {
      const dur = npFmt(npAudio.duration);
      document.getElementById('np-tot').textContent = dur;
      if (npIdx >= 0) {
        const durEl = document.getElementById(`tdur-${npIdx}`);
        if (durEl) durEl.textContent = dur;
      }
    });

    npAudio.addEventListener('timeupdate', () => {
      if (!npAudio.duration) return;
      const pct = (npAudio.currentTime / npAudio.duration) * 100;
      document.getElementById('np-fill').style.width  = pct + '%';
      document.getElementById('np-thumb').style.left  = pct + '%';
      document.getElementById('np-cur').textContent   = npFmt(npAudio.currentTime);
    });

    npAudio.addEventListener('ended', () => {
      const next = (npIdx + 1) % TRACKS.length;
      npLoad(next);
      npPlay();
    });

    // Kontrole
    document.getElementById('np-main').addEventListener('click', () => {
      if (npIdx < 0) { npLoad(0); npPlay(); return; }
      npActive ? npPause() : npPlay();
    });

    document.getElementById('np-prev').addEventListener('click', () => {
      if (npAudio.currentTime > 3) { npAudio.currentTime = 0; return; }
      const prev = (npIdx - 1 + TRACKS.length) % TRACKS.length;
      npLoad(prev); npPlay();
    });

    document.getElementById('np-next').addEventListener('click', () => {
      const next = (npIdx + 1) % TRACKS.length;
      npLoad(next); npPlay();
    });

    // Seek (klik na progress traku)
    document.getElementById('np-progress').addEventListener('click', e => {
      if (!npAudio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      npAudio.currentTime = ((e.clientX - rect.left) / rect.width) * npAudio.duration;
    });

    // Glasnoća
    document.getElementById('np-vol-range').addEventListener('input', e => {
      const v = +e.target.value;
      npAudio.volume = v;
      document.getElementById('np-vol-btn').innerHTML = v === 0 ? ICO_VOL_MUTE : v < 0.5 ? ICO_VOL_LO : ICO_VOL_HI;
    });

    document.getElementById('np-vol-btn').addEventListener('click', () => {
      if (npAudio.volume > 0) {
        npAudio.volume = 0;
        document.getElementById('np-vol-range').value = 0;
        document.getElementById('np-vol-btn').innerHTML = ICO_VOL_MUTE;
      } else {
        npAudio.volume = 0.8;
        document.getElementById('np-vol-range').value = 0.8;
        document.getElementById('np-vol-btn').innerHTML = ICO_VOL_HI;
      }
    });

    // Zatvori
    document.getElementById('np-close').addEventListener('click', () => {
      npPause();
      document.getElementById('np-bar').classList.remove('active');
      document.body.style.paddingBottom = '';
      document.querySelectorAll('.track-item').forEach(r => r.classList.remove('playing'));
      document.querySelectorAll('.track-play-btn').forEach(b => { b.innerHTML = ICO_PLAY; });
      npIdx = -1;
    });

    // Tipkovnica: Razmaknica = play/pause
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space') return;
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      if (npIdx < 0) return;
      e.preventDefault();
      npActive ? npPause() : npPlay();
    });

    npRenderList();

    // ═══════════════════════════════════════════════════
    //  BREATHING VISUALIZER ENGINE
    // ═══════════════════════════════════════════════════

    // ── Web Audio context (lazy) ──────────────────────
    let bvAC = null;
    function getAC() {
      if (!bvAC) bvAC = new (window.AudioContext || window.webkitAudioContext)();
      if (bvAC.state === 'suspended') bvAC.resume();
      return bvAC;
    }

    // ── Helper: create white-noise buffer ────────────
    function noiseBuffer(ac, secs) {
      const len = Math.ceil(ac.sampleRate * secs);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    // ── 7 Sound Set synthesizers ─────────────────────
    // Each entry: { name, phases: [inhale, holdTop, exhale, holdBot] }
    // Each phase function: (ac, vol, dur) -> AudioNode (already connected to dest, playing/scheduled)

    function playTibetanBowl(ac, vol, dur, freqStart, freqEnd) {
      const g = ac.createGain();
      g.connect(ac.destination);
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqStart, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(freqEnd, ac.currentTime + dur * 0.7);
      // Harmonics
      const osc2 = ac.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freqStart * 2.01, ac.currentTime);
      osc2.frequency.linearRampToValueAtTime(freqEnd * 2.01, ac.currentTime + dur * 0.7);
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(vol * 0.25, ac.currentTime);
      g2.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc2.connect(g2); g2.connect(ac.destination);
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(vol * 0.7, ac.currentTime + 0.06);
      g.gain.linearRampToValueAtTime(vol * 0.5, ac.currentTime + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      osc.connect(g);
      osc.start(); osc.stop(ac.currentTime + dur + 0.1);
      osc2.start(); osc2.stop(ac.currentTime + dur + 0.1);
    }

    function playWater(ac, vol, dur, freqLow, freqHigh) {
      const buf = noiseBuffer(ac, dur + 0.2);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filt = ac.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(freqLow, ac.currentTime);
      filt.frequency.linearRampToValueAtTime(freqHigh, ac.currentTime + dur * 0.6);
      filt.Q.value = 3;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(vol, ac.currentTime + 0.15);
      g.gain.linearRampToValueAtTime(vol * 0.8, ac.currentTime + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      src.connect(filt); filt.connect(g); g.connect(ac.destination);
      src.start(); src.stop(ac.currentTime + dur + 0.1);
    }

    function playCosmic(ac, vol, dur, freqStart, freqEnd) {
      const freqs = [freqStart, freqStart * 1.501, freqStart * 2.002];
      const fEnds = [freqEnd,   freqEnd  * 1.501,  freqEnd  * 2.002];
      freqs.forEach((f, i) => {
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ac.currentTime);
        osc.frequency.linearRampToValueAtTime(fEnds[i], ac.currentTime + dur);
        const g = ac.createGain();
        const v = vol * (i === 0 ? 0.5 : i === 1 ? 0.25 : 0.15);
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(v, ac.currentTime + dur * 0.3);
        g.gain.linearRampToValueAtTime(v * 0.9, ac.currentTime + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
        osc.connect(g); g.connect(ac.destination);
        osc.start(); osc.stop(ac.currentTime + dur + 0.1);
      });
    }

    function playCrystal(ac, vol, dur, freq) {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const osc2 = ac.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 3.01;
      const g = ac.createGain();
      const g2 = ac.createGain();
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + Math.min(dur, 2.5));
      g2.gain.setValueAtTime(vol * 0.3, ac.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + Math.min(dur * 0.6, 1.5));
      osc.connect(g); g.connect(ac.destination);
      osc2.connect(g2); g2.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + dur + 0.1);
      osc2.start(); osc2.stop(ac.currentTime + dur + 0.1);
    }

    function playBreath(ac, vol, dur, freqLow, freqHigh, attackRatio, decayRatio) {
      const buf = noiseBuffer(ac, dur + 0.2);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filt = ac.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(freqLow, ac.currentTime);
      filt.frequency.linearRampToValueAtTime(freqHigh, ac.currentTime + dur * attackRatio);
      filt.frequency.linearRampToValueAtTime(freqLow * 0.8, ac.currentTime + dur);
      filt.Q.value = 5;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(vol * 0.9, ac.currentTime + dur * attackRatio);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur * (attackRatio + decayRatio));
      src.connect(filt); filt.connect(g); g.connect(ac.destination);
      src.start(); src.stop(ac.currentTime + dur + 0.1);
    }

    function playDrum(ac, vol, dur, pitchStart) {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitchStart, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ac.currentTime + 0.4);
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + Math.min(0.8, dur));
      osc.connect(g); g.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + dur + 0.1);
    }

    function playForest(ac, vol, dur, freqCenter, chirp) {
      const buf = noiseBuffer(ac, dur + 0.2);
      const src = ac.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filt = ac.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = freqCenter;
      filt.Q.value = 1.5;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(vol * 0.4, ac.currentTime + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
      src.connect(filt); filt.connect(g); g.connect(ac.destination);
      src.start(); src.stop(ac.currentTime + dur + 0.1);
      if (chirp) {
        for (let i = 0; i < 3; i++) {
          const co = ac.createOscillator(); co.type = 'sine';
          const cStart = 1200 + i * 300;
          co.frequency.setValueAtTime(cStart, ac.currentTime + i * dur * 0.25);
          co.frequency.linearRampToValueAtTime(cStart * 1.4, ac.currentTime + i * dur * 0.25 + 0.15);
          const cg = ac.createGain();
          cg.gain.setValueAtTime(vol * 0.18, ac.currentTime + i * dur * 0.25);
          cg.gain.linearRampToValueAtTime(0, ac.currentTime + i * dur * 0.25 + 0.25);
          co.connect(cg); cg.connect(ac.destination);
          co.start(ac.currentTime + i * dur * 0.25);
          co.stop(ac.currentTime + i * dur * 0.25 + 0.35);
        }
      }
    }

    // Sound dispatch: SOUND_MAP[setIdx][phaseKey](ac, vol, dur)
    const SOUND_MAP = {
      // Set 0: Tibetska posuda
      0: {
        inhale:  (ac, v, d) => playTibetanBowl(ac, v, d, 220, 330),
        holdtop: (ac, v, d) => playTibetanBowl(ac, v, d, 330, 330),
        exhale:  (ac, v, d) => playTibetanBowl(ac, v, d, 330, 196),
        holdbot: (ac, v, d) => playTibetanBowl(ac, v * 0.4, d, 196, 196),
      },
      // Set 1: Voda
      1: {
        inhale:  (ac, v, d) => playWater(ac, v, d, 300, 1200),
        holdtop: (ac, v, d) => playWater(ac, v * 0.7, d, 800, 900),
        exhale:  (ac, v, d) => playWater(ac, v, d, 1200, 250),
        holdbot: (ac, v, d) => playWater(ac, v * 0.3, d, 150, 200),
      },
      // Set 2: Kozmički dron
      2: {
        inhale:  (ac, v, d) => playCosmic(ac, v, d, 55, 110),
        holdtop: (ac, v, d) => playCosmic(ac, v, d, 110, 110),
        exhale:  (ac, v, d) => playCosmic(ac, v, d, 110, 55),
        holdbot: (ac, v, d) => playCosmic(ac, v * 0.5, d, 40, 40),
      },
      // Set 3: Kristal
      3: {
        inhale:  (ac, v, d) => { playCrystal(ac, v, d, 523); },
        holdtop: (ac, v, d) => { playCrystal(ac, v, d, 784); },
        exhale:  (ac, v, d) => { playCrystal(ac, v, d, 392); },
        holdbot: (ac, v, d) => { /* silence */ },
      },
      // Set 4: Dah
      4: {
        inhale:  (ac, v, d) => playBreath(ac, v, d, 200, 600, 0.7, 0.3),
        holdtop: (ac, v, d) => playBreath(ac, v * 0.3, d, 400, 450, 0.1, 0.8),
        exhale:  (ac, v, d) => playBreath(ac, v, d, 600, 150, 0.2, 0.7),
        holdbot: (ac, v, d) => { /* silence */ },
      },
      // Set 5: Bubanj
      5: {
        inhale:  (ac, v, d) => {
          const steps = Math.max(2, Math.floor(d * 2));
          for (let i = 0; i < steps; i++)
            setTimeout(() => { try { playDrum(getAC(), v * (0.4 + i / steps * 0.6), 0.5, 60 + i * 8); } catch(e){} }, i * (d * 1000 / steps));
        },
        holdtop: (ac, v, d) => playDrum(ac, v, d, 80),
        exhale:  (ac, v, d) => {
          const steps = Math.max(2, Math.floor(d * 1.5));
          for (let i = 0; i < steps; i++)
            setTimeout(() => { try { playDrum(getAC(), v * (1 - i / steps * 0.5), 0.5, 55 - i * 3); } catch(e){} }, i * (d * 1000 / steps));
        },
        holdbot: (ac, v, d) => playDrum(ac, v * 0.3, d, 40),
      },
      // Set 6: Šuma
      6: {
        inhale:  (ac, v, d) => playForest(ac, v, d, 800, true),
        holdtop: (ac, v, d) => playForest(ac, v * 0.6, d, 600, true),
        exhale:  (ac, v, d) => playForest(ac, v, d, 400, false),
        holdbot: (ac, v, d) => playForest(ac, v * 0.25, d, 200, false),
      },
    };

    // ── Breathing state machine ───────────────────────
    const PHASES = ['inhale', 'holdtop', 'exhale', 'holdbot'];
    const PHASE_LABELS = { inhale: 'UDAHNI', holdtop: 'ZADRŽI', exhale: 'IZDAHNI', holdbot: 'PAUZA' };
    const PHASE_CLASSES = { inhale: 'phase-inhale', holdtop: 'phase-holdtop', exhale: 'phase-exhale', holdbot: 'phase-holdbot' };
    const PHASE_COLORS  = { inhale: 'rgba(4,255,255,', holdtop: 'rgba(215,2,241,', exhale: 'rgba(228,136,209,', holdbot: 'rgba(139,186,216,' };

    let bvRunning   = false;
    let bvPhaseIdx  = 0;
    let bvCycleNum  = 0;
    let bvPhaseStart = 0;
    let bvPhaseDur  = 0;
    let bvRafId     = null;
    let bvTimerTimeout = null;

    function bvGetTimings() {
      return {
        inhale:  +document.getElementById('rng-inhale').value,
        holdtop: +document.getElementById('rng-holdtop').value,
        exhale:  +document.getElementById('rng-exhale').value,
        holdbot: +document.getElementById('rng-holdbot').value,
      };
    }

    function bvGetSoundEnabled(phase) {
      return document.getElementById('track-' + phase).classList.contains('on');
    }

    function bvGetSoundSet(phase)  { return +document.getElementById('sel-' + phase).value; }
    function bvGetSoundVol(phase)  { return +document.getElementById('vol-' + phase).value; }

    function bvPlayPhaseSound(phase, dur) {
      if (!bvGetSoundEnabled(phase)) return;
      const setIdx = bvGetSoundSet(phase);
      const vol    = bvGetSoundVol(phase);
      if (vol <= 0) return;
      try {
        const ac = getAC();
        SOUND_MAP[setIdx][phase](ac, vol, dur);
      } catch(e) { /* ignore synthesis errors */ }
    }

    // Orb scale range
    const ORB_MIN = 0.88, ORB_MAX = 1.18;
    const CIRC = 2 * Math.PI * 140; // 879.6

    function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

    function bvSetOrb(scale, phaseClass) {
      const ring = document.getElementById('bv-ring');
      const ri   = document.getElementById('bv-ring-inner');
      const glow = document.getElementById('bv-glow');
      if (!ring) return;
      ring.style.transform = `scale(${scale})`;
      ri.style.transform   = `scale(${scale * 0.97})`;
      // glow intensity
      const t = (scale - ORB_MIN) / (ORB_MAX - ORB_MIN);
      glow.style.opacity = 0.4 + t * 0.6;
    }

    function bvSetProgress(fraction, phaseKey) {
      const fill = document.getElementById('bv-prog-fill');
      if (!fill) return;
      const offset = CIRC * (1 - fraction);
      fill.style.strokeDashoffset = offset;
      fill.className.baseVal = 'bv-progress-fill ' + PHASE_CLASSES[phaseKey];
    }

    function bvSetLabel(phaseKey) {
      const el = document.getElementById('bv-phase-text');
      el.textContent = PHASE_LABELS[phaseKey];
      el.className = 'bv-phase-text ' + PHASE_CLASSES[phaseKey];
    }

    function bvSetTimer(secs) {
      document.getElementById('bv-timer').textContent = Math.ceil(secs);
    }

    function bvAnimate(now) {
      if (!bvRunning) return;
      const elapsed  = (now - bvPhaseStart) / 1000;
      const fraction = Math.min(elapsed / bvPhaseDur, 1);
      const phase    = PHASES[bvPhaseIdx];

      // Update progress ring
      bvSetProgress(fraction, phase);

      // Update timer
      const remaining = Math.max(0, bvPhaseDur - elapsed);
      bvSetTimer(remaining);

      // Update orb scale based on phase
      let scale;
      if (phase === 'inhale') {
        scale = ORB_MIN + (ORB_MAX - ORB_MIN) * easeInOut(fraction);
      } else if (phase === 'holdtop') {
        scale = ORB_MAX;
      } else if (phase === 'exhale') {
        scale = ORB_MAX - (ORB_MAX - ORB_MIN) * easeInOut(fraction);
      } else { // holdbot
        scale = ORB_MIN;
      }
      bvSetOrb(scale, phase);

      if (fraction < 1) {
        bvRafId = requestAnimationFrame(bvAnimate);
      }
    }

    function bvStartPhase(idx) {
      bvPhaseIdx = idx % PHASES.length;
      if (bvPhaseIdx === 0) bvCycleNum++;
      const phase   = PHASES[bvPhaseIdx];
      const timings = bvGetTimings();
      bvPhaseDur    = timings[phase];

      // Skip 0-second phases
      if (bvPhaseDur === 0) {
        bvStartPhase(bvPhaseIdx + 1);
        return;
      }

      bvPhaseStart = performance.now();
      bvSetLabel(phase);
      bvSetTimer(bvPhaseDur);
      bvPlayPhaseSound(phase, bvPhaseDur);

      const cycleEl = document.getElementById('bv-cycle-count');
      cycleEl.textContent = `CIKLUS ${bvCycleNum}`;

      bvRafId = requestAnimationFrame(bvAnimate);
      bvTimerTimeout = setTimeout(() => {
        if (bvRunning) bvStartPhase(bvPhaseIdx + 1);
      }, bvPhaseDur * 1000);
    }

    function bvStart() {
      bvRunning  = true;
      bvCycleNum = 0;
      bvPhaseIdx = -1;
      bvStartPhase(0);
      const btn = document.getElementById('bv-start-btn');
      btn.textContent = 'ZAUSTAVI';
      btn.classList.add('active');
    }

    function bvStop() {
      bvRunning = false;
      if (bvRafId) cancelAnimationFrame(bvRafId);
      if (bvTimerTimeout) clearTimeout(bvTimerTimeout);
      const btn = document.getElementById('bv-start-btn');
      btn.textContent = 'POKRENI';
      btn.classList.remove('active');
      // Reset orb
      bvSetOrb(1.0, 'inhale');
      bvSetProgress(0, 'inhale');
      document.getElementById('bv-phase-text').textContent = '— PRITISNITE POKRENI —';
      document.getElementById('bv-phase-text').className = 'bv-phase-text';
      document.getElementById('bv-timer').innerHTML = '&nbsp;';
      document.getElementById('bv-cycle-count').innerHTML = '&nbsp;';
    }

    document.getElementById('bv-start-btn').addEventListener('click', () => {
      if (bvRunning) bvStop(); else bvStart();
    });

    // ── Settings toggle ───────────────────────────────
    document.getElementById('bv-settings-toggle').addEventListener('click', () => {
      const panel = document.getElementById('bv-settings-panel');
      panel.classList.toggle('open');
      const btn = document.getElementById('bv-settings-toggle');
      btn.innerHTML = panel.classList.contains('open')
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:13px;height:13px;vertical-align:middle;margin-right:6px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>ZATVORI`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:13px;height:13px;vertical-align:middle;margin-right:6px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>POSTAVKE`;
    });

    // ── Timing sliders → live label update ───────────
    ['inhale','holdtop','exhale','holdbot'].forEach(p => {
      const rng = document.getElementById('rng-' + p);
      const lbl = document.getElementById('lbl-' + p);
      rng.addEventListener('input', () => { lbl.textContent = rng.value; });
    });

    // ── Sound toggles ─────────────────────────────────
    ['inhale','holdtop','exhale','holdbot'].forEach(phase => {
      document.getElementById('tog-' + phase).addEventListener('click', () => {
        const track = document.getElementById('track-' + phase);
        track.classList.toggle('on');
      });
    });

    // ── Preset patterns ───────────────────────────────
    document.querySelectorAll('.bv-pattern-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bv-pattern-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const [i, ht, e, hb] = btn.dataset.p.split('-').map(Number);
        document.getElementById('rng-inhale').value  = i;
        document.getElementById('rng-holdtop').value = ht;
        document.getElementById('rng-exhale').value  = e;
        document.getElementById('rng-holdbot').value = hb;
        document.getElementById('lbl-inhale').textContent  = i;
        document.getElementById('lbl-holdtop').textContent = ht;
        document.getElementById('lbl-exhale').textContent  = e;
        document.getElementById('lbl-holdbot').textContent = hb;
        if (bvRunning) { bvStop(); bvStart(); }
      });
    });


var navLinks = document.querySelector('.nav-links') || document.querySelector('.nav__links');
      var burger   = document.getElementById('hamburger');

      if (burger && navLinks) {
        burger.addEventListener('click', function() {
          navLinks.classList.toggle('mobile-open');
          burger.classList.toggle('active');
        });

        var links = navLinks.querySelectorAll('a');
        links.forEach(function(l){
          l.addEventListener('click', function() {
            navLinks.classList.remove('mobile-open');
            burger.classList.remove('active');
          });
        });
      }