// Review session — the centerpiece. Interactive board, 3 attempts, hint on miss,
// FSRS rating post-card (simulated).

function Review({ go, params = {}, tweaks }) {
  const { CARDS, DUE_TODAY } = window.DATA;
  const queue = React.useMemo(() => {
    const initialId = params.cardId;
    const rest = DUE_TODAY.filter(c => c.id !== initialId);
    const first = initialId ? CARDS.find(c => c.id === initialId) : DUE_TODAY[0];
    return [first, ...rest].filter(Boolean);
  }, [params.cardId]);

  const [idx, setIdx] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);   // 0, 1, 2
  const [phase, setPhase] = React.useState("thinking"); // thinking | wrong | hinting | revealed | correct | rating | done
  const [lastPlayed, setLastPlayed] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null); // good | bad | null
  const [sessionLog, setSessionLog] = React.useState([]); // {cardId, rating}

  const card = queue[idx];
  const flipped = card && card.toMove === "b";

  React.useEffect(() => {
    setAttempts(0); setPhase("thinking"); setLastPlayed(null); setFeedback(null);
  }, [idx]);

  if (!card) return null;

  function handleMove(from, to) {
    if (phase !== "thinking" && phase !== "hinting") return;
    const correct = window.ChessLogic.isCorrectMove(card, from, to);
    setLastPlayed({ from, to });
    if (correct) {
      setFeedback("good");
      setPhase("correct");
      // auto-transition to rating after a beat
      setTimeout(() => setPhase("rating"), 900);
    } else {
      setFeedback("bad");
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setPhase("revealed");
      } else {
        setPhase("wrong");
        setTimeout(() => {
          setFeedback(null); setLastPlayed(null); setPhase("hinting");
        }, 1100);
      }
    }
  }

  function reveal() { setPhase("revealed"); }

  function logRating(rating) {
    setSessionLog([...sessionLog, { cardId: card.id, rating, attempts }]);
    if (idx >= queue.length - 1) {
      setPhase("done");
    } else {
      setIdx(idx + 1);
    }
  }

  // When revealed, user presses "next" with an Again-equivalent rating
  function afterReveal() {
    logRating("again");
  }

  return (
    <>
      <Nav route="review" go={go} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "28px 32px 60px" }}>
        {phase === "done" ? (
          <SessionSummary log={sessionLog} go={go} />
        ) : (
          <>
            <SessionHeader idx={idx} total={queue.length} card={card} go={go} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 56, marginTop: 32, alignItems: "start" }}>
              {/* Board column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                {/* who to move */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: card.toMove === "w" ? "#f8f4ea" : "#1a1a1a",
                    border: "1px solid var(--ink)",
                  }} />
                  <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    {card.toMove === "w" ? "White to move" : "Black to move"} — find the move
                  </div>
                </div>

                <Board
                  fen={card.fen}
                  flipped={flipped}
                  onMove={handleMove}
                  hintSquare={phase === "hinting" ? card.correct.from : null}
                  feedback={feedback}
                  playedMove={lastPlayed}
                  overlayMove={phase === "revealed" ? card.correct : null}
                  disabled={phase === "wrong" || phase === "correct" || phase === "revealed" || phase === "rating"}
                  size={560}
                  boardStyle={tweaks.boardStyle}
                  pieceSet={tweaks.pieceSet}
                />

                {/* Attempt pips */}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 26, height: 4,
                      background: i < attempts ? "var(--bad)" : "var(--line)",
                      transition: "background 200ms",
                    }} />
                  ))}
                  <span className="mono" style={{ marginLeft: 12, fontSize: 10, color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Attempts
                  </span>
                </div>
              </div>

              {/* Side panel */}
              <aside style={{ position: "sticky", top: 88 }}>
                <SidePanel
                  card={card}
                  phase={phase}
                  attempts={attempts}
                  onReveal={reveal}
                  onRate={logRating}
                  onAfterReveal={afterReveal}
                />
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SessionHeader({ idx, total, card, go }) {
  const pct = ((idx) / total) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Daily review · {idx + 1} of {total}
          </div>
          <h1 className="serif" style={{ fontSize: 40, letterSpacing: "-0.025em", margin: "6px 0 0", fontWeight: 400 }}>
            {card.theme}
          </h1>
        </div>
        <button onClick={() => go("dashboard")} className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          End session ×
        </button>
      </div>
      <div style={{ height: 1, background: "var(--line)", marginTop: 16, position: "relative" }}>
        <div style={{ height: 1, background: "var(--ink)", width: `${pct}%`, transition: "width 260ms" }} />
      </div>
    </div>
  );
}

function SidePanel({ card, phase, attempts, onReveal, onRate, onAfterReveal }) {
  return (
    <div>
      {/* context block — always visible */}
      <div style={{ border: "1px solid var(--line)", padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Tag kind={card.kind}>{card.kind}</Tag>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            CPL {Math.abs(card.cpl)} · reps {card.reps}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, textWrap: "pretty" }}>
          From a <b>{card.kind === "blunder" || card.kind === "mistake" ? "game you lost" : "line you handled well"}</b>{" "}
          ·{" "}
          {card.kind === "blunder" || card.kind === "mistake"
            ? "find the move you should have played."
            : "replay the move that made this work."}
        </div>
      </div>

      {/* phase-driven content */}
      {phase === "thinking" && (
        <EmptyState>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
            Your turn
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", textWrap: "pretty" }}>
            Click the piece you want to move, then the destination square. No clock.
          </div>
        </EmptyState>
      )}

      {phase === "wrong" && (
        <EmptyState tone="bad">
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--bad)", marginBottom: 10 }}>
            Not that one
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
            That's the move you played in the game. Try again — {3 - attempts} {3 - attempts === 1 ? "attempt" : "attempts"} left.
          </div>
        </EmptyState>
      )}

      {phase === "hinting" && (
        <EmptyState tone="hint">
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--walnut)", marginBottom: 10 }}>
            Hint · piece highlighted
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
            The piece that moves is pulsing on the board. Find its square.
          </div>
          <button onClick={onReveal} className="mono" style={{ marginTop: 14, color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Give up & reveal →
          </button>
        </EmptyState>
      )}

      {phase === "correct" && (
        <EmptyState tone="good">
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--good)", marginBottom: 10 }}>
            ✓ Correct — {card.correct.san}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", textWrap: "pretty" }}>{card.note}</div>
        </EmptyState>
      )}

      {phase === "revealed" && (
        <EmptyState tone="bad">
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
            The move was <b style={{ color: "var(--ink)" }}>{card.correct.san}</b>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", textWrap: "pretty" }}>{card.note}</div>
          <Button size="md" style={{ marginTop: 16, width: "100%" }} onClick={onAfterReveal}>
            I'll see it again soon →
          </Button>
        </EmptyState>
      )}

      {phase === "rating" && (
        <RatingPad attempts={attempts} onRate={onRate} card={card} />
      )}
    </div>
  );
}

function EmptyState({ children, tone }) {
  const bg = {
    good: "rgba(79,107,74,0.06)",
    bad: "rgba(166,74,63,0.06)",
    hint: "rgba(212,165,116,0.1)",
  }[tone] || "var(--bg-2)";
  const border = {
    good: "var(--good)",
    bad: "var(--bad)",
    hint: "var(--amber)",
  }[tone] || "var(--line)";
  return (
    <div style={{
      padding: "20px 22px", background: bg, border: `1px solid ${border}`,
      transition: "all 200ms",
    }}>{children}</div>
  );
}

function RatingPad({ attempts, onRate, card }) {
  const options = attempts === 0
    ? [{ k: "easy", label: "Easy", sub: "I knew it instantly", interval: "+9d" }, { k: "good", label: "Good", sub: "Correct after thought", interval: "+3d" }]
    : attempts === 1
    ? [{ k: "good", label: "Good", sub: "Got it with a hint", interval: "+2d" }, { k: "hard", label: "Hard", sub: "Needed more time", interval: "+1d" }]
    : [{ k: "hard", label: "Hard", sub: "Many attempts", interval: "+18h" }, { k: "again", label: "Again", sub: "See sooner", interval: "+4h" }];

  return (
    <EmptyState tone="good">
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--good)", marginBottom: 10 }}>
        How did it feel?
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14, textWrap: "pretty" }}>
        {card.note}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {options.map(o => (
          <button key={o.k} onClick={() => onRate(o.k)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", border: "1px solid var(--line)",
            background: "var(--bg)", textAlign: "left",
            transition: "all 120ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "var(--bg)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--ink)"; }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{o.label}</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", opacity: 0.7, marginTop: 2 }}>{o.sub}</div>
            </div>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>next · {o.interval}</span>
          </button>
        ))}
      </div>
    </EmptyState>
  );
}

function SessionSummary({ log, go }) {
  const correct = log.filter(l => l.rating !== "again").length;
  const pct = log.length ? Math.round((correct / log.length) * 100) : 0;
  return (
    <div style={{ maxWidth: 760, margin: "40px auto", textAlign: "center" }}>
      <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
        Session complete
      </div>
      <h1 className="serif" style={{ fontSize: 80, letterSpacing: "-0.035em", margin: 0, lineHeight: 1, fontWeight: 400 }}>
        {correct} of {log.length}<br/>
        <em style={{ color: "var(--walnut)" }}>{pct}% accuracy</em>
      </h1>
      <p style={{ color: "var(--ink-2)", lineHeight: 1.55, fontSize: 17, marginTop: 28, textWrap: "pretty" }}>
        FSRS has rescheduled your cards. The hard ones return tomorrow; the rest
        drift further out.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
        <Button size="lg" onClick={() => go("dashboard")}>Back to today →</Button>
        <Button size="lg" variant="secondary" onClick={() => go("deck")}>Browse deck</Button>
      </div>
    </div>
  );
}

window.Review = Review;
