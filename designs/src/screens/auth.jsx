// Auth screen — email/password (V1). Signup → onboarding; signin → dashboard.

function Auth({ mode: initMode, go }) {
  const [mode, setMode] = React.useState(initMode || "signup");
  const [email, setEmail] = React.useState(mode === "signin" ? "you@example.com" : "");
  const [pw, setPw] = React.useState(mode === "signin" ? "••••••••••" : "");

  function submit(e) {
    e.preventDefault();
    if (mode === "signup") go("onboarding");
    else go("dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", position: "relative", zIndex: 1 }}>
      {/* Left: form */}
      <div style={{ padding: "40px 60px", display: "flex", flexDirection: "column" }}>
        <button onClick={() => go("landing")} style={{ display: "inline-flex", alignSelf: "flex-start" }}>
          <Logo size={20} />
        </button>

        <div style={{ margin: "auto 0", maxWidth: 420 }}>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 20 }}>
            {mode === "signup" ? "New student" : "Returning"}
          </div>
          <h1 className="serif" style={{ fontSize: 52, letterSpacing: "-0.03em", margin: "0 0 12px", fontWeight: 400, lineHeight: 1.02 }}>
            {mode === "signup" ? "Start your deck." : "Welcome back."}
          </h1>
          <p style={{ color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 36, textWrap: "pretty" }}>
            {mode === "signup"
              ? "Email and a password. You'll link Chess.com in the next step."
              : "Pick up where you left off — 14 cards are due today."}
          </p>

          <form onSubmit={submit}>
            <Field label="Email">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@domain.com" required />
            </Field>
            <Field label="Password">
              <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="at least 8 characters" required />
            </Field>

            <Button type="submit" size="lg" style={{ width: "100%", marginTop: 8 }}>
              {mode === "signup" ? "Create account →" : "Sign in →"}
            </Button>
          </form>

          <Divider label="or" />

          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mono"
            style={{ color: "var(--muted)", fontSize: 12, letterSpacing: "0.08em" }}>
            {mode === "signup" ? "I already have an account →" : "Create a new account →"}
          </button>
        </div>

        <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Your review data is private. Not sold, not shared.
        </div>
      </div>

      {/* Right: visual */}
      <div style={{ background: "var(--ink)", color: "var(--bg)", padding: "40px 60px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.55 }}>
          A note from the notebook
        </div>
        <div>
          <div className="serif" style={{ fontSize: 56, letterSpacing: "-0.03em", lineHeight: 1.05, fontStyle: "italic", marginBottom: 32 }}>
            "The mistakes you repeat<br/>are the lessons you owe<br/>yourself."
          </div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", opacity: 0.55 }}>
            — UNSIGNED MARGINALIA, OPENING JOURNAL
          </div>
        </div>
        <div style={{ opacity: 0.18, position: "absolute", right: -80, bottom: -80 }}>
          <svg width="400" height="400" viewBox="0 0 8 8">
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((__, c) => (
                (r + c) % 2 === 0
                  ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="var(--bg)" />
                  : null
              ))
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

window.Auth = Auth;
