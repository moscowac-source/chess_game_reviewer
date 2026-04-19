// Shared UI: Nav, Button, Tag, Divider, small components

const Logo = ({ size = 20 }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="9" height="9" fill="currentColor" />
      <rect x="12" y="12" width="9" height="9" fill="currentColor" />
      <rect x="12" y="3" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
    <span className="serif" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>Pattern</span>
  </div>
);

function Nav({ route, go, authed = true }) {
  const items = [
    ["dashboard", "Today"],
    ["review",    "Review"],
    ["deck",      "Deck"],
    ["sync",      "Sync"],
  ];
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 28,
      padding: "18px 32px",
      borderBottom: "1px solid var(--line)",
      position: "sticky", top: 0, background: "var(--bg)", zIndex: 10,
    }}>
      <button onClick={() => go("landing")} style={{ display: "flex" }}><Logo /></button>
      {authed && (
        <nav style={{ display: "flex", gap: 24 }}>
          {items.map(([key, label]) => (
            <button key={key}
              onClick={() => go(key)}
              className="mono"
              style={{
                color: route === key ? "var(--ink)" : "var(--muted)",
                borderBottom: route === key ? "1px solid var(--ink)" : "1px solid transparent",
                paddingBottom: 2,
                textTransform: "uppercase", fontSize: 11, letterSpacing: "0.12em",
              }}>
              {label}
            </button>
          ))}
        </nav>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        {authed && (
          <>
            <span className="mono" style={{ color: "var(--muted)" }}>
              synced {window.DATA.STATS.lastSync}
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--ink)", color: "var(--bg)",
              display: "grid", placeItems: "center",
              fontFamily: "var(--serif)", fontSize: 13,
            }}>C</div>
          </>
        )}
      </div>
    </header>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", style, disabled, type }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "var(--sans)", fontWeight: 500,
    borderRadius: "var(--radius)",
    transition: "all 160ms ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
  const sizes = {
    sm: { padding: "8px 14px", fontSize: 13 },
    md: { padding: "12px 20px", fontSize: 14 },
    lg: { padding: "16px 28px", fontSize: 15 },
  };
  const variants = {
    primary: { background: "var(--ink)", color: "var(--bg)", border: "1px solid var(--ink)" },
    secondary: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
    ghost: { background: "transparent", color: "var(--ink)", border: "1px solid transparent" },
    amber: { background: "var(--amber)", color: "var(--ink)", border: "1px solid var(--amber)" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...(style||{}) }}>
      {children}
    </button>
  );
}

function Tag({ children, kind }) {
  const colors = {
    blunder:   { bg: "rgba(166,74,63,0.12)", fg: "var(--bad)" },
    mistake:   { bg: "rgba(166,74,63,0.08)", fg: "#8a5b4a" },
    brilliant: { bg: "rgba(79,107,74,0.15)", fg: "var(--good)" },
    great:     { bg: "rgba(79,107,74,0.10)", fg: "var(--good)" },
    neutral:   { bg: "var(--line-2)", fg: "var(--muted)" },
  };
  const c = colors[kind] || colors.neutral;
  return (
    <span className="mono" style={{
      background: c.bg, color: c.fg,
      padding: "3px 8px",
      textTransform: "uppercase", fontSize: 10, letterSpacing: "0.14em",
      borderRadius: 2,
    }}>{children}</span>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      {label && <span className="mono" style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.14em" }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {children}
      {hint && <div className="mono" style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>{hint}</div>}
    </label>
  );
}

function Input(props) {
  return <input {...props} style={{
    width: "100%", background: "var(--bg)", border: "1px solid var(--line)",
    padding: "12px 14px", fontSize: 14, fontFamily: "var(--sans)",
    borderRadius: "var(--radius)", outline: "none",
    transition: "border-color 120ms",
    ...(props.style || {})
  }} onFocus={e => e.target.style.borderColor = "var(--ink)"}
     onBlur={e => e.target.style.borderColor = "var(--line)"} />;
}

// Small stat block used on landing & dashboard
function Stat({ big, label, mono, sub }) {
  return (
    <div>
      <div style={{ fontFamily: mono ? "var(--mono)" : "var(--serif)", fontSize: mono ? 32 : 44, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {big}
      </div>
      <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 10 }}>{label}</div>
      {sub && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Page({ children, wide }) {
  return (
    <main style={{
      position: "relative", zIndex: 1,
      maxWidth: wide ? 1280 : 1120,
      margin: "0 auto",
      padding: "40px 32px 80px",
    }}>
      {children}
    </main>
  );
}

// Thumbnail board — tiny non-interactive rendering (8x8) for the deck list
function MiniBoard({ fen, size = 48 }) {
  const { board } = window.ChessLogic.parseFEN(fen);
  const GLYPHS = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟︎" };
  return (
    <div style={{
      width: size, height: size, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)",
      border: "1px solid var(--line)",
    }}>
      {board.flatMap((row, r) => row.map((p, c) => {
        const light = (r + c) % 2 === 0;
        return (
          <div key={`${r}-${c}`} style={{
            background: light ? "var(--sq-light)" : "var(--sq-dark)",
            display: "grid", placeItems: "center",
            fontSize: size / 11, lineHeight: 1,
            color: p && p === p.toUpperCase() ? "#f8f4ea" : "#1a1a1a",
          }}>{p ? GLYPHS[p] : ""}</div>
        );
      }))}
    </div>
  );
}

Object.assign(window, { Nav, Button, Tag, Divider, Field, Input, Stat, Page, Logo, MiniBoard });
