// Deck browser — all cards, filterable.

function Deck({ go, tweaks }) {
  const { CARDS, STATS } = window.DATA;
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const visible = CARDS.filter(c => {
    if (filter !== "all" && c.kind !== filter) return false;
    if (search && !c.theme.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: CARDS.length,
    blunder: CARDS.filter(c => c.kind === "blunder").length,
    mistake: CARDS.filter(c => c.kind === "mistake").length,
    brilliant: CARDS.filter(c => c.kind === "brilliant").length,
    great: CARDS.filter(c => c.kind === "great").length,
  };

  return (
    <>
      <Nav route="deck" go={go} />
      <Page wide>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="mono" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>
              Your deck · {STATS.cardsGenerated} positions from {STATS.gamesImported} games
            </div>
            <h1 className="serif" style={{ fontSize: 56, letterSpacing: "-0.03em", margin: 0, lineHeight: 1, fontWeight: 400 }}>
              Every position, filed.
            </h1>
          </div>
          <Button onClick={() => go("review")}>Review due cards →</Button>
        </div>

        {/* filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            ["all", "All", counts.all],
            ["blunder", "Blunders", counts.blunder],
            ["mistake", "Mistakes", counts.mistake],
            ["brilliant", "Brilliant", counts.brilliant],
            ["great", "Great", counts.great],
          ].map(([k, label, n]) => (
            <button key={k} onClick={() => setFilter(k)}
              className="mono"
              style={{
                padding: "8px 14px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                border: "1px solid",
                borderColor: filter === k ? "var(--ink)" : "var(--line)",
                background: filter === k ? "var(--ink)" : "transparent",
                color: filter === k ? "var(--bg)" : "var(--ink)",
              }}>
              {label} <span style={{ opacity: 0.6, marginLeft: 6 }}>{n}</span>
            </button>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <Input placeholder="Search themes…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }} />
          </div>
        </div>

        {/* grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {visible.map(c => <DeckCard key={c.id} card={c} go={go} tweaks={tweaks} />)}
        </div>

        {visible.length === 0 && (
          <div style={{ padding: 80, textAlign: "center", color: "var(--muted)" }}>
            No cards match.
          </div>
        )}
      </Page>
    </>
  );
}

function DeckCard({ card, go, tweaks }) {
  const dueColor =
    card.nextDue === "today" ? "var(--bad)"
    : card.nextDue.startsWith("+") ? "var(--muted)"
    : "var(--muted)";

  return (
    <button onClick={() => go("review", { cardId: card.id })}
      style={{ textAlign: "left", background: "var(--bg)", border: "1px solid var(--line)", padding: 0, display: "block" }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "center", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
        <MiniBoardLarge fen={card.fen} size={200} />
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Tag kind={card.kind}>{card.kind}</Tag>
          <span className="mono" style={{ fontSize: 10, color: dueColor, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            due {card.nextDue}
          </span>
        </div>
        <div className="serif" style={{ fontSize: 19, letterSpacing: "-0.01em", marginBottom: 6, lineHeight: 1.15 }}>
          {card.theme}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {card.toMove === "w" ? "White" : "Black"} · reps {card.reps} · cpl {Math.abs(card.cpl)}
        </div>
      </div>
    </button>
  );
}

function MiniBoardLarge({ fen, size }) {
  const { board } = window.ChessLogic.parseFEN(fen);
  const GLYPHS = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟︎" };
  return (
    <div style={{
      width: size, height: size, display: "grid",
      gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)",
      border: "1px solid var(--line)",
    }}>
      {board.flatMap((row, r) => row.map((p, c) => {
        const light = (r + c) % 2 === 0;
        return (
          <div key={`${r}-${c}`} style={{
            background: light ? "var(--sq-light)" : "var(--sq-dark)",
            display: "grid", placeItems: "center",
            fontSize: size / 9.5, lineHeight: 1,
            color: p && p === p.toUpperCase() ? "#f8f4ea" : "#1a1a1a",
            textShadow: p && p === p.toUpperCase() ? "0 1px 0 rgba(0,0,0,0.35), 0 0 1px #000" : "none",
          }}>{p ? GLYPHS[p] : ""}</div>
        );
      }))}
    </div>
  );
}

window.Deck = Deck;
