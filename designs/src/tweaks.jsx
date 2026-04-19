// Tweaks — theme / board style / piece set / density, with host protocol.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "editorial",
  "boardStyle": "paper",
  "pieceSet": "classic",
  "density": "comfortable"
}/*EDITMODE-END*/;

function useTweaks() {
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = React.useState(false);

  React.useEffect(() => {
    function onMsg(e) {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setEditMode(true);
      if (d.type === "__deactivate_edit_mode") setEditMode(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme === "editorial" ? "" : tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.theme, tweaks.density]);

  function update(patch) {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  }

  return { tweaks, setTweaks: update, editMode };
}

function TweaksPanel({ tweaks, setTweaks }) {
  return (
    <div style={{
      position: "fixed", right: 20, bottom: 20, zIndex: 100,
      background: "var(--bg)", border: "1px solid var(--ink)",
      padding: "16px 18px", width: 260,
      boxShadow: "0 20px 60px -20px rgba(0,0,0,0.35)",
      fontFamily: "var(--sans)",
    }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 14 }}>
        Tweaks
      </div>

      <TweakGroup label="Theme">
        {[
          ["editorial", "Editorial"],
          ["walnut", "Walnut"],
          ["mono", "Mono"],
        ].map(([v, l]) => (
          <TweakChip key={v} active={tweaks.theme === v} onClick={() => setTweaks({ theme: v })}>{l}</TweakChip>
        ))}
      </TweakGroup>

      <TweakGroup label="Board">
        {[["paper", "Paper"], ["wood", "Wood"], ["flat", "Flat"]].map(([v, l]) => (
          <TweakChip key={v} active={tweaks.boardStyle === v} onClick={() => setTweaks({ boardStyle: v })}>{l}</TweakChip>
        ))}
      </TweakGroup>

      <TweakGroup label="Pieces">
        {[["classic", "Classic"], ["outline", "Outline"], ["bold", "Bold"]].map(([v, l]) => (
          <TweakChip key={v} active={tweaks.pieceSet === v} onClick={() => setTweaks({ pieceSet: v })}>{l}</TweakChip>
        ))}
      </TweakGroup>

      <TweakGroup label="Density">
        {[["comfortable", "Comfortable"], ["compact", "Compact"]].map(([v, l]) => (
          <TweakChip key={v} active={tweaks.density === v} onClick={() => setTweaks({ density: v })}>{l}</TweakChip>
        ))}
      </TweakGroup>
    </div>
  );
}

function TweakGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}
function TweakChip({ children, active, onClick }) {
  return (
    <button onClick={onClick} className="mono" style={{
      padding: "5px 10px", fontSize: 10, letterSpacing: "0.08em",
      border: "1px solid " + (active ? "var(--ink)" : "var(--line)"),
      background: active ? "var(--ink)" : "transparent",
      color: active ? "var(--bg)" : "var(--ink)",
      textTransform: "uppercase",
    }}>{children}</button>
  );
}

Object.assign(window, { useTweaks, TweaksPanel });
