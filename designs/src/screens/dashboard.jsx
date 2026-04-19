// Dashboard — "Today" view. Shows due count, new cards, streak, recent games,
// a prominent "Begin review" CTA, and a peek at upcoming cards.

function Dashboard({ go }) {
  const { STATS, DUE_TODAY, GAMES, CARDS } = window.DATA;

  return (
    <>
      <Nav route="dashboard" go={go} />
      <Page wide>
        {/* Hero: greeting + primary CTA */}
        <section style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 60, alignItems: "end", paddingBottom: 48, borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
              Friday · April 19 · Day {STATS.streakDays} of your streak
            </div>
            <h1 className="serif" style={{ fontSize: 72, letterSpacing: "-0.035em", margin: 0, lineHeight: 1, fontWeight: 400 }}>
              Good morning.<br/>
              <em style={{ color: "var(--walnut)" }}>{STATS.due}</em> cards are waiting.
            </h1>
            <p style={{ color: "var(--ink-2)", fontSize: 17, lineHeight: 1.55, maxWidth: 560, marginTop: 24, textWrap: "pretty" }}>
              {STATS.due - STATS.newToday} due for review, {STATS.newToday} new from last night's
              sync — three blunders from your Caro‑Kann and a brilliancy you should memorize.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <Button size="lg" onClick={() => go("review")}>Begin review →</Button>
              <Button size="lg" variant="secondary" onClick={() => go("deck")}>Browse deck</Button>
            </div>
          </div>

          {/* Next-up peek */}
          <div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>Next up</div>
            <div style={{ border: "1px solid var(--line)", background: "var(--bg)", padding: "20px 22px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
              <MiniBoard fen={DUE_TODAY[0].fen} size={88} />
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Tag kind={DUE_TODAY[0].kind}>{DUE_TODAY[0].kind}</Tag>
                  <span className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {DUE_TODAY[0].toMove === "w" ? "White to move" : "Black to move"}
                  </span>
                </div>
                <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.01em", marginBottom: 4 }}>{DUE_TODAY[0].theme}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Reviewed {DUE_TODAY[0].reps} time{DUE_TODAY[0].reps === 1 ? "" : "s"} · CPL {Math.abs(DUE_TODAY[0].cpl)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 36, padding: "40px 0", borderBottom: "1px solid var(--line)" }}>
          <Stat big={STATS.due} label="Due today" mono />
          <Stat big={STATS.newToday} label="New cards" mono />
          <Stat big={STATS.streakDays} label="Day streak" mono />
          <Stat big={`${Math.round(STATS.accuracy7d * 100)}%`} label="7-day accuracy" mono />
          <Stat big={STATS.cardsGenerated} label="Total in deck" mono />
        </section>

        {/* Two columns: Due queue preview + Recent games */}
        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 60, marginTop: 48 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 28, letterSpacing: "-0.02em", margin: 0, fontWeight: 400 }}>Today's queue</h2>
              <button onClick={() => go("deck")} className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                All {STATS.cardsGenerated} cards →
              </button>
            </div>
            <div style={{ border: "1px solid var(--line)" }}>
              {DUE_TODAY.map((c, i) => (
                <button key={c.id} onClick={() => go("review", { cardId: c.id })}
                  style={{
                    width: "100%", display: "grid",
                    gridTemplateColumns: "auto 1.5fr 1fr auto",
                    alignItems: "center", gap: 20,
                    padding: "14px 18px",
                    borderBottom: i < DUE_TODAY.length - 1 ? "1px solid var(--line)" : "none",
                    textAlign: "left", background: "var(--bg)",
                  }}>
                  <MiniBoard fen={c.fen} size={52} />
                  <div>
                    <div className="serif" style={{ fontSize: 17, letterSpacing: "-0.01em", marginBottom: 4 }}>{c.theme}</div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                      {c.toMove === "w" ? "White" : "Black"} · reps {c.reps} · cpl {Math.abs(c.cpl)}
                    </div>
                  </div>
                  <div><Tag kind={c.kind}>{c.kind}</Tag></div>
                  <div className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>→</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h2 className="serif" style={{ fontSize: 28, letterSpacing: "-0.02em", margin: 0, fontWeight: 400 }}>Recent games</h2>
              <button onClick={() => go("sync")} className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Sync log →</button>
            </div>
            <div style={{ border: "1px solid var(--line)" }}>
              {GAMES.slice(0, 6).map((g, i) => (
                <div key={g.id} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto",
                  gap: 12, padding: "12px 16px", alignItems: "center",
                  borderBottom: i < 5 ? "1px solid var(--line)" : "none",
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: g.result === "win" ? "var(--good)" : g.result === "loss" ? "var(--bad)" : "var(--muted)",
                  }} />
                  <div>
                    <div style={{ fontSize: 14 }}>
                      vs <b>{g.opp}</b>
                      <span className="mono" style={{ color: "var(--muted)", fontSize: 11, marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        {g.result}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginTop: 2 }}>
                      {g.date} · {g.tc} · {g.eco}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>{g.found}</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>cards</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Weakness breakdown strip */}
        <section style={{ marginTop: 60, padding: "28px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
            By classification · all time
          </div>
          <BreakdownBar />
        </section>
      </Page>
    </>
  );
}

function BreakdownBar() {
  const { STATS } = window.DATA;
  const total = STATS.blunders + STATS.mistakes + STATS.brilliant + STATS.great;
  const parts = [
    { k: "blunder", v: STATS.blunders, c: "#a64a3f", label: "Blunders" },
    { k: "mistake", v: STATS.mistakes, c: "#c88b6e", label: "Mistakes" },
    { k: "great",   v: STATS.great,    c: "#7a8471", label: "Great" },
    { k: "brilliant", v: STATS.brilliant, c: "#4f6b4a", label: "Brilliant" },
  ];
  return (
    <div>
      <div style={{ display: "flex", height: 28, border: "1px solid var(--line)" }}>
        {parts.map(p => (
          <div key={p.k} style={{ flex: p.v / total, background: p.c, position: "relative" }} title={`${p.label}: ${p.v}`} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginTop: 18 }}>
        {parts.map(p => (
          <div key={p.k} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ width: 8, height: 8, background: p.c }} />
            <div>
              <div className="serif" style={{ fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1 }}>{p.v}</div>
              <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4 }}>{p.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
