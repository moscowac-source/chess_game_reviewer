// App shell — client-side router between screens, with tweaks wired in.

function App() {
  const [route, setRoute] = React.useState("landing");
  const [params, setParams] = React.useState({});
  const { tweaks, setTweaks, editMode } = window.useTweaks();

  // Persist route across reloads
  React.useEffect(() => {
    const saved = localStorage.getItem("pattern.route");
    if (saved) {
      try {
        const { route: r, params: p } = JSON.parse(saved);
        if (r) { setRoute(r); setParams(p || {}); }
      } catch {}
    }
  }, []);
  React.useEffect(() => {
    localStorage.setItem("pattern.route", JSON.stringify({ route, params }));
  }, [route, params]);

  function go(nextRoute, nextParams = {}) {
    setRoute(nextRoute);
    setParams(nextParams);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const screens = {
    landing:     <window.Landing go={go} />,
    auth:        <window.Auth mode={params.mode} go={go} />,
    onboarding:  <window.Onboarding go={go} />,
    dashboard:   <window.Dashboard go={go} />,
    review:      <window.Review go={go} params={params} tweaks={tweaks} />,
    deck:        <window.Deck go={go} tweaks={tweaks} />,
    sync:        <window.Sync go={go} />,
  };

  return (
    <>
      {screens[route] || screens.landing}
      {editMode && <window.TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
