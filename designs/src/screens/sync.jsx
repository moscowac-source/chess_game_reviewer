// Sync status + history.

function Sync({ go }) {
  const { STATS, GAMES } = window.DATA;
  const [syncing, setSyncing] = React.useState(false);

  function runSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2400);
  }

  const logs = [
    { at: "Apr 19 · 02:14", kind: "auto", games: 3, cards: 8, status: "ok" },
    { at: "Apr 18 · 02:14", kind: "auto", games: 5, cards: 12, status: "ok" },
    { at: "Apr 17 · 02:14", kind: "auto", games: 2, cards: 5, status: "ok" },
    { at: "Apr 16 · 17:03", kind: "manual", games: 1, cards: 2, status: "ok" },
    { at: "Apr 16 · 02:14", kind: "auto", games: 4, cards: 9, status: "ok" },
    { at: "Apr 15 · 02:14", kind: "auto", games: 6, cards: 14, status: "partial", note: "Stockfish timed out on 1 position" },
    { at: "Apr 14 · 02:14", kind: "auto", games: 3, cards: 6, status: "ok" },
  ];

  return (
    <>
      <Nav route="sync" go={go} />
      <Page wide>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "end", paddingBottom: 28, borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>
              Sync pipeline · Chess.com → Parser → Stockfish → Cards
            </div>
            <h1 className="serif" style={{ fontSize: 56, letterSpacing: "-0.03em", margin: 0, lineHeight: 1, fontWeight: 400 }}>
              Everything in order.
            </h1>
            <p style={{ color: "var(--ink-2)", lineHeight: 1.55, marginTop: 20, fontSize: 16, maxWidth: 540, textWrap: "pretty" }}>
              Nightly job at 02:14 UTC. Last run succeeded. Next scheduled for tonight.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
            <Button size="lg" onClick={runSync} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync now →"}
            </Button>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Bypasses schedule · pulls Apr
            </div>
          </div>
        </div>

        {/* Status dashboard */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 36, padding: "40px 0", borderBottom: "1px solid var(--line)" }}>
          <Stat big={STATS.gamesImported} label="Games imported" mono />
          <Stat big={STATS.cardsGenerated} label="Cards in deck" mono />
          <Stat big="97.8%" label="Sync success rate" mono />
          <Stat big={STATS.lastSync.replace("last night · ", "")} label="Last successful run" mono />
        </div>

        {/* Pipeline diagram */}
        <div style={{ marginTop: 48 }}>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 24 }}>
            The pipeline
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 0, alignItems: "stretch" }}>
            {[
              { t: "Fetch", s: "Chess.com archive API", d: "Monthly PGN archives, throttled 1 req/s" },
              { t: "Parse", s: "PGN → FEN ply-by-ply", d: "Normalized game records" },
              { t: "Analyze", s: "Stockfish WASM · d18", d: "CPL per move, best-move detection" },
              { t: "Write", s: "Dedupe by FEN → FSRS init", d: "One card per unique position" },
            ].map((p, i, arr) => (
              <React.Fragment key={p.t}>
                <div style={{ padding: "24px 24px", border: "1px solid var(--line)", borderRight: i === arr.length - 1 ? "1px solid var(--line)" : "none", background: "var(--bg)" }}>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Stage {i + 1}</div>
                  <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.02em", marginBottom: 6 }}>{p.t}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--walnut)", marginBottom: 8 }}>{p.s}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{p.d}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Sync log */}
        <div style={{ marginTop: 56 }}>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
            Sync history · last 7 runs
          </div>
          <div style={{ border: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 100px 1fr 120px 120px", gap: 20, padding: "12px 20px", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
              {["When", "Trigger", "Note", "Games", "Cards"].map(h => (
                <span key={h} className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</span>
              ))}
            </div>
            {logs.map((l, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "200px 100px 1fr 120px 120px", gap: 20,
                padding: "14px 20px", alignItems: "center",
                borderBottom: i < logs.length - 1 ? "1px solid var(--line)" : "none",
                background: "var(--bg)",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: l.status === "ok" ? "var(--good)" : "var(--amber)",
                  }} />
                  <span className="mono" style={{ fontSize: 12 }}>{l.at}</span>
                </div>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {l.kind}
                </span>
                <span style={{ fontSize: 13, color: l.note ? "var(--ink-2)" : "var(--muted)" }}>
                  {l.note || "All stages green"}
                </span>
                <span className="serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>{l.games}</span>
                <span className="serif" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>{l.cards}</span>
              </div>
            ))}
          </div>
        </div>
      </Page>
    </>
  );
}

window.Sync = Sync;
