// Onboarding — 3 steps: link Chess.com account, import progress, settings.

function Onboarding({ go }) {
  const [step, setStep] = React.useState(0);
  const [username, setUsername] = React.useState("Catalyst030119");
  const [newPerDay, setNewPerDay] = React.useState(12);
  const [timeControls, setTimeControls] = React.useState({
    daily: true, rapid: true, blitz: true, bullet: false,
  });

  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <header style={{ display: "flex", alignItems: "center", padding: "22px 40px", borderBottom: "1px solid var(--line)" }}>
        <Logo size={20} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 40, alignItems: "center" }}>
          {["Link account", "Import", "Cadence"].map((s, i) => (
            <div key={s} className="mono" style={{
              display: "flex", alignItems: "center", gap: 10,
              color: i <= step ? "var(--ink)" : "var(--muted)",
              fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                display: "grid", placeItems: "center",
                border: "1px solid currentColor",
                fontSize: 10,
                background: i < step ? "var(--ink)" : "transparent",
                color: i < step ? "var(--bg)" : "inherit",
              }}>{i < step ? "✓" : i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "72px 40px" }}>
        {step === 0 && <LinkStep username={username} setUsername={setUsername} onNext={() => setStep(1)} />}
        {step === 1 && <ImportStep username={username} timeControls={timeControls} setTimeControls={setTimeControls} onDone={() => setStep(2)} />}
        {step === 2 && <CadenceStep newPerDay={newPerDay} setNewPerDay={setNewPerDay} onDone={() => go("dashboard")} />}
      </div>
    </div>
  );
}

function LinkStep({ username, setUsername, onNext }) {
  const [verifying, setVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  function verify() {
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerified(true); }, 1200);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 80, alignItems: "center" }}>
      <div>
        <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Step 01</div>
        <h1 className="serif" style={{ fontSize: 64, letterSpacing: "-0.03em", margin: 0, lineHeight: 1, fontWeight: 400 }}>
          Point us at<br/>your <em style={{ color: "var(--walnut)" }}>games.</em>
        </h1>
        <p style={{ color: "var(--ink-2)", lineHeight: 1.55, marginTop: 28, fontSize: 16, maxWidth: 460, textWrap: "pretty" }}>
          Chess.com's public API returns everything we need. No password, no OAuth —
          just your handle. You can change it later.
        </p>

        <div style={{ marginTop: 40, maxWidth: 460 }}>
          <Field label="Chess.com username" hint="Case-insensitive. We'll verify it exists before moving on.">
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={username} onChange={e => { setUsername(e.target.value); setVerified(false); }}
                style={{ flex: 1 }} placeholder="your_handle" />
              <Button variant="secondary" onClick={verify} disabled={verifying || verified}>
                {verifying ? "Checking…" : verified ? "✓ Verified" : "Verify"}
              </Button>
            </div>
          </Field>

          {verified && (
            <div style={{ border: "1px solid var(--line)", padding: "14px 16px", background: "var(--bg-2)", marginBottom: 24 }}>
              <div className="mono" style={{ color: "var(--good)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
                ✓ Account found
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                <b>{username}</b> · Rapid 1487 · Blitz 1512 · Bullet 1398 · joined Jan 2020 · <b>2,143 total games</b> across all time controls.
              </div>
            </div>
          )}

          <Button size="lg" onClick={onNext} disabled={!verified}>
            Import these games →
          </Button>
        </div>
      </div>

      {/* Right-side visual: "card" depicting the username capture */}
      <div style={{ position: "relative" }}>
        <div style={{
          padding: "40px 44px",
          background: "var(--bg)", border: "1px solid var(--line)",
          boxShadow: "0 30px 60px -30px rgba(0,0,0,0.3)",
          transform: "rotate(-1.2deg)",
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
            api.chess.com/pub/player/{username.toLowerCase() || "your_handle"}
          </div>
          <pre className="mono" style={{ fontSize: 11, lineHeight: 1.7, color: "var(--ink-2)", margin: 0, whiteSpace: "pre-wrap" }}>
{`{
  "username": "${username || "your_handle"}",
  "joined":   1579500000,
  "status":   "premium",
  "followers": 42,
  "country":  "/pub/country/US"
}`}
          </pre>
        </div>
        <div style={{
          position: "absolute", right: -30, bottom: -30,
          padding: "14px 18px", background: "var(--ink)", color: "var(--bg)",
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}>
          GET 200 · 124ms
        </div>
      </div>
    </div>
  );
}

function ImportStep({ username, timeControls, setTimeControls, onDone }) {
  const [progress, setProgress] = React.useState(0);
  const [logIdx, setLogIdx] = React.useState(0);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    let p = 0, l = 0;
    const iv = setInterval(() => {
      p += Math.random() * 5 + 2;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(onDone, 900); }
      setProgress(p);
      if (l < window.DATA.IMPORT_LOG.length && p > (l + 1) * (100 / window.DATA.IMPORT_LOG.length)) {
        l += 1; setLogIdx(l);
      }
    }, 260);
    return () => clearInterval(iv);
  }, [running, onDone]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
      <div>
        <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Step 02</div>
        <h1 className="serif" style={{ fontSize: 56, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.02, fontWeight: 400 }}>
          Pull the history.
        </h1>
        <p style={{ color: "var(--ink-2)", lineHeight: 1.55, marginTop: 24, fontSize: 15, maxWidth: 460, textWrap: "pretty" }}>
          We'll walk back through every monthly archive Chess.com has for <b>{username}</b>.
          Stockfish runs on our servers — your laptop doesn't need to do anything.
        </p>

        <div style={{ marginTop: 36 }}>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Include time controls</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 380 }}>
            {[
              ["daily", "Daily"], ["rapid", "Rapid"], ["blitz", "Blitz"], ["bullet", "Bullet"],
            ].map(([k, label]) => (
              <label key={k} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                border: "1px solid var(--line)", cursor: "pointer",
                background: timeControls[k] ? "var(--ink)" : "var(--bg)",
                color: timeControls[k] ? "var(--bg)" : "var(--ink)",
              }}>
                <input type="checkbox" checked={timeControls[k]}
                  onChange={e => setTimeControls({ ...timeControls, [k]: e.target.checked })}
                  style={{ accentColor: "var(--amber)" }} />
                <span style={{ fontSize: 14 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          {!running
            ? <Button size="lg" onClick={() => setRunning(true)}>Begin import →</Button>
            : <Button size="lg" disabled>Importing… {Math.round(progress)}%</Button>
          }
        </div>
      </div>

      {/* Progress console */}
      <div style={{ background: "var(--ink)", color: "var(--bg)", padding: "32px 36px", minHeight: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.6, textTransform: "uppercase" }}>sync.pipeline</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.6, textTransform: "uppercase" }}>{running ? "RUNNING" : "IDLE"}</span>
        </div>
        <div className="serif" style={{ fontSize: 72, letterSpacing: "-0.04em", lineHeight: 1, fontWeight: 400 }}>
          {Math.round(progress)}<span style={{ fontSize: 32, opacity: 0.5 }}>%</span>
        </div>
        <div style={{ height: 1, background: "rgba(245,242,236,0.15)", marginTop: 24, position: "relative" }}>
          <div style={{ height: 1, background: "var(--amber)", width: `${progress}%`, transition: "width 240ms" }} />
        </div>
        <div style={{ marginTop: 28, fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.9, color: "rgba(245,242,236,0.7)" }}>
          {window.DATA.IMPORT_LOG.slice(0, logIdx).map((line, i) => (
            <div key={i} style={{ opacity: 1 - (logIdx - i - 1) * 0.08 }}>
              <span style={{ opacity: 0.4 }}>{String(i + 1).padStart(2, "0")} · </span>{line}
            </div>
          ))}
          {running && logIdx < window.DATA.IMPORT_LOG.length && (
            <div style={{ opacity: 0.6 }}>
              <span className="blink">▋</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: "auto", position: "absolute" }} />
        <style>{`.blink { animation: blink 1s steps(2) infinite; } @keyframes blink { 50% { opacity: 0 } }`}</style>
      </div>
    </div>
  );
}

function CadenceStep({ newPerDay, setNewPerDay, onDone }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>Step 03</div>
      <h1 className="serif" style={{ fontSize: 60, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.02, fontWeight: 400 }}>
        Set your <em style={{ color: "var(--walnut)" }}>cadence.</em>
      </h1>
      <p style={{ color: "var(--ink-2)", lineHeight: 1.55, marginTop: 20, fontSize: 16, textWrap: "pretty" }}>
        FSRS works best with a steady trickle of new cards. You have <b>412</b> waiting.
        We suggest 10–20 new per day.
      </p>

      <div style={{ marginTop: 48, padding: "32px 36px", border: "1px solid var(--line)", background: "var(--bg-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>New cards per day</div>
            <div className="serif" style={{ fontSize: 88, letterSpacing: "-0.04em", lineHeight: 1, marginTop: 4 }}>{newPerDay}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>Deck cleared in</div>
            <div className="serif" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>≈ {Math.ceil(412 / newPerDay)} days</div>
          </div>
        </div>

        <input type="range" min="4" max="30" step="1" value={newPerDay}
          onChange={e => setNewPerDay(parseInt(e.target.value, 10))}
          style={{ width: "100%", marginTop: 24, accentColor: "var(--ink)" }} />
        <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span>4 · light</span><span>12 · recommended</span><span>30 · firehose</span>
        </div>
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
        <Button size="lg" onClick={onDone}>Enter the deck →</Button>
        <Button size="lg" variant="secondary" onClick={onDone}>Skip for now</Button>
      </div>
    </div>
  );
}

window.Onboarding = Onboarding;
