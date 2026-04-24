// hod-components.jsx — HUD/dashboard components za Autoškolu HOD

// ═══════════════════════════════════════════════════════════════
// BRZINOMJER (Speedometer / RPM gauge)
// ═══════════════════════════════════════════════════════════════
function HodGauge({ value = 0.72, label = "SIMPATIKUS", sublabel = "krvni tlak / disanje / kortizol", accent = "var(--hod-accent-hot)", size = 320 }) {
  // gauge od -135° do +135° (270° ukupno)
  const startAngle = -225;
  const endAngle = 45;
  const totalArc = 270;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 24;

  const polar = (deg, radius) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius];
  };

  // generate tick marks every 10%
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const angle = startAngle + totalArc * t;
    const major = i % 2 === 0;
    const [x1, y1] = polar(angle, r);
    const [x2, y2] = polar(angle, r - (major ? 14 : 8));
    ticks.push({ x1, y1, x2, y2, major, label: i * 10 });
  }

  const valueAngle = startAngle + totalArc * value;
  const [nx, ny] = polar(valueAngle, r - 20);

  // arc path
  const [ax1, ay1] = polar(startAngle, r);
  const [ax2, ay2] = polar(valueAngle, r);
  const largeArc = totalArc * value > 180 ? 1 : 0;
  const arcPath = `M ${ax1} ${ay1} A ${r} ${r} 0 ${largeArc} 1 ${ax2} ${ay2}`;

  const [bgx1, bgy1] = polar(startAngle, r);
  const [bgx2, bgy2] = polar(endAngle, r);
  const bgPath = `M ${bgx1} ${bgy1} A ${r} ${r} 0 1 1 ${bgx2} ${bgy2}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: size, height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--hod-accent-cool)" />
          <stop offset="50%" stopColor="var(--hod-accent-mid)" />
          <stop offset="100%" stopColor="var(--hod-accent-hot)" />
        </linearGradient>
      </defs>
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {/* background arc */}
      <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      {/* value arc */}
      <path d={arcPath} fill="none" stroke="url(#gaugeGrad)" strokeWidth="3" strokeLinecap="round" />

      {/* ticks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)"} strokeWidth={t.major ? 1.5 : 1} />
          {t.major && (() => {
            const angle = startAngle + totalArc * (t.label / 100);
            const [lx, ly] = polar(angle, r - 30);
            return (
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--hod-font-mono)" letterSpacing="0.08em">{t.label}</text>
            );
          })()}
        </g>
      ))}

      {/* needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="var(--hod-bg)" stroke={accent} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="2" fill={accent} />

      {/* center label */}
      <text x={cx} y={cy + r * 0.45} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="14" fontFamily="var(--hod-font-mono)" letterSpacing="0.22em" fontWeight="600">{label}</text>
      <text x={cx} y={cy + r * 0.62} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--hod-font-mono)" letterSpacing="0.15em">{sublabel}</text>

      {/* value readout */}
      <text x={cx} y={cy - r * 0.35} textAnchor="middle" fill={accent} fontSize="36" fontFamily="var(--hod-font-display)" fontWeight="700">{Math.round(value * 100)}</text>
      <text x={cx + 32} y={cy - r * 0.35} textAnchor="start" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="var(--hod-font-mono)" letterSpacing="0.1em">%</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// HUD CARD — framed dashboard widget
// ═══════════════════════════════════════════════════════════════
function HudCard({ label, code, children, accent, style = {} }) {
  return (
    <div className="hud-card" style={{ '--accent': accent || 'var(--hod-accent-hot)', ...style }}>
      <div className="hud-card-header">
        <span className="hud-card-label">{label}</span>
        {code && <span className="hud-card-code">{code}</span>}
      </div>
      <div className="hud-card-body">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROAD SIGN — prometni znak (diamond / circle / triangle)
// ═══════════════════════════════════════════════════════════════
function RoadSign({ shape = "diamond", color = "var(--hod-accent-hot)", children, small = false }) {
  const size = small ? 64 : 92;
  const inner = (
    <div className="sign-inner" style={{ color }}>
      {children}
    </div>
  );
  if (shape === "diamond") {
    return (
      <div className={`sign-diamond ${small ? 'sm' : ''}`} style={{ borderColor: color, width: size, height: size }}>
        <div className="sign-content">{children}</div>
      </div>
    );
  }
  if (shape === "circle") {
    return (
      <div className={`sign-circle ${small ? 'sm' : ''}`} style={{ borderColor: color, width: size, height: size, color }}>
        {children}
      </div>
    );
  }
  if (shape === "triangle") {
    return (
      <div className={`sign-triangle ${small ? 'sm' : ''}`} style={{ '--sign-color': color, width: size, height: size }}>
        <div className="sign-tri-content">{children}</div>
      </div>
    );
  }
  return inner;
}

// ═══════════════════════════════════════════════════════════════
// TICK BAR — horizontal scale with reading
// ═══════════════════════════════════════════════════════════════
function TickBar({ value = 0.5, label, unit = "", accent = "var(--hod-accent-hot)", steps = 20 }) {
  return (
    <div className="tickbar">
      {label && <div className="tickbar-label"><span>{label}</span><span className="tickbar-val" style={{ color: accent }}>{Math.round(value * 100)}{unit}</span></div>}
      <div className="tickbar-track">
        {Array.from({ length: steps }).map((_, i) => {
          const active = i / steps < value;
          return (
            <span
              key={i}
              className={`tickbar-tick ${active ? 'on' : ''}`}
              style={{ background: active ? accent : undefined }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CROSSHAIR — corner markers for "instrument panel" sections
// ═══════════════════════════════════════════════════════════════
function Crosshair({ children, label, code, onHover }) {
  return (
    <div className="crosshair" onMouseEnter={onHover}>
      <span className="ch ch-tl" /><span className="ch ch-tr" /><span className="ch ch-bl" /><span className="ch ch-br" />
      {(label || code) && (
        <div className="crosshair-head">
          {label && <span className="crosshair-label">{label}</span>}
          {code && <span className="crosshair-code">{code}</span>}
        </div>
      )}
      <div className="crosshair-body">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EYEBROW / LABEL
// ═══════════════════════════════════════════════════════════════
function Eyebrow({ children, code, accent }) {
  return (
    <div className="hod-eyebrow" style={{ color: accent || 'var(--hod-accent-hot)' }}>
      {code && <span className="hod-eyebrow-code">{code}</span>}
      <span className="hod-eyebrow-dot" />
      <span>{children}</span>
    </div>
  );
}

Object.assign(window, { HodGauge, HudCard, RoadSign, TickBar, Crosshair, Eyebrow });
