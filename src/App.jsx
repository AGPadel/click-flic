function ViewMode({ state, undo }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startAt = state.matchStartAt || Date.now();
    const timer = setInterval(() => {
      setElapsed(Date.now() - startAt);
    }, 1000);
    return () => clearInterval(timer);
  }, [state.matchStartAt]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="view-page">
      <div className="view-grid">
        <TeamPanel
          name={state.team1Name}
          players={[state.player1A, state.player1B]}
          pointsSelf={state.points1}
          pointsOther={state.points2}
          games={state.games1}
          sets={state.sets1}
          accentClass="blue-score"
          active={state.server === 1}
          goldenPoint={state.goldenPoint}
        />

        <TeamPanel
          name={state.team2Name}
          players={[state.player2A, state.player2B]}
          pointsSelf={state.points2}
          pointsOther={state.points1}
          games={state.games2}
          sets={state.sets2}
          accentClass="red-score"
          active={state.server === 2}
          goldenPoint={state.goldenPoint}
        />

        <div className="center-box">
          <div className="center-title">MARCADOR</div>
          <div className="center-time">TIEMPO {minutes}:{seconds}</div>

          <div className="center-games">
            <span>{state.games1}</span>
            <span>-</span>
            <span>{state.games2}</span>
          </div>

          <div className="center-sets">
            <span>{state.sets1}</span>
            <span>-</span>
            <span>{state.sets2}</span>
          </div>
        </div>

        <button
          className="undo-bottom"
          onClick={undo}
          title="Deshacer último punto"
          aria-label="Deshacer último punto"
        >
          <UndoArrowIcon />
          <span>Deshacer</span>
        </button>
      </div>
    </div>
  );
}