import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const POINT_LABELS = ["0", "15", "30", "40"];

function emptyState() {
  return {
    started: false,
    team1Name: "PAREJA 1",
    team2Name: "PAREJA 2",
    player1A: "",
    player1B: "",
    player2A: "",
    player2B: "",
    points1: 0,
    points2: 0,
    games1: 0,
    games2: 0,
    sets1: 0,
    sets2: 0,
    server: 1,
    goldenPoint: true,
    voiceEnabled: true,
    matchFinished: false,
    winnerLabel: "",
    lastWinner: null,
    lastAnnouncement: "",
    matchStartAt: null,
    updatedAt: Date.now(),
    sideChangeMode: "odd-games",
    sidesSwapped: false,
  };
}

function buildStorageKey(matchId) {
  return `padelscore-match-${matchId}`;
}

function buildHistoryKey(matchId) {
  return `padelscore-history-${matchId}`;
}

function parseMode() {
  const params = new URLSearchParams(window.location.search);
  return {
    matchId: params.get("id") || "pista1",
    mode: params.get("mode") || "view",
    action: params.get("action") || "",
  };
}

function nextPointState(p1, p2, winner, goldenPoint = true) {
  let points1 = p1;
  let points2 = p2;
  let gameWinner = null;

  const atDeuce = points1 === 3 && points2 === 3;

  if (goldenPoint && atDeuce) {
    gameWinner = winner;
    return { points1, points2, gameWinner };
  }

  if (winner === 1) {
    if (points1 <= 2) points1 += 1;
    else if (points1 === 3 && points2 <= 2) gameWinner = 1;
    else if (points1 === 3 && points2 === 3) {
      points1 = 4;
      points2 = 3;
    } else if (points1 === 3 && points2 === 4) {
      points1 = 3;
      points2 = 3;
    } else if (points1 === 4) {
      gameWinner = 1;
    }
  }

  if (winner === 2) {
    if (points2 <= 2) points2 += 1;
    else if (points2 === 3 && points1 <= 2) gameWinner = 2;
    else if (points2 === 3 && points1 === 3) {
      points2 = 4;
      points1 = 3;
    } else if (points2 === 3 && points1 === 4) {
      points2 = 3;
      points1 = 3;
    } else if (points2 === 4) {
      gameWinner = 2;
    }
  }

  return { points1, points2, gameWinner };
}

function resolveSet(g1, g2, s1, s2, winner) {
  let games1 = g1;
  let games2 = g2;
  let sets1 = s1;
  let sets2 = s2;
  let setWinner = null;
  let matchWinner = null;

  if (winner === 1) games1 += 1;
  if (winner === 2) games2 += 1;

  const team1WinsSet = games1 >= 6 && games1 - games2 >= 2;
  const team2WinsSet = games2 >= 6 && games2 - games1 >= 2;

  if (team1WinsSet) {
    sets1 += 1;
    games1 = 0;
    games2 = 0;
    setWinner = 1;
  }

  if (team2WinsSet) {
    sets2 += 1;
    games1 = 0;
    games2 = 0;
    setWinner = 2;
  }

  if (sets1 === 2) matchWinner = 1;
  if (sets2 === 2) matchWinner = 2;

  return { games1, games2, sets1, sets2, setWinner, matchWinner };
}

function pointText(pointsSelf, pointsOther, goldenPoint = true) {
  if (goldenPoint && pointsSelf === 3 && pointsOther === 3) return "40";
  if (pointsSelf === 4 && pointsOther === 3) return "AD";
  if (pointsSelf === 3 && pointsOther === 4) return "40";
  return POINT_LABELS[Math.min(pointsSelf, 3)] || "0";
}

function pointCall(pointsServer, pointsReceiver, goldenPoint = true) {
  if (goldenPoint && pointsServer === 3 && pointsReceiver === 3) return "Punto de oro";
  if (!goldenPoint && pointsServer === 3 && pointsReceiver === 3) return "Iguales";
  if (!goldenPoint && pointsServer === 4 && pointsReceiver === 3) return "Ventaja servicio";
  if (!goldenPoint && pointsServer === 3 && pointsReceiver === 4) return "Ventaja resto";

  const calls = ["Nada", "Quince", "Treinta", "Cuarenta"];
  return `${calls[Math.min(pointsServer, 3)]} ${calls[Math.min(pointsReceiver, 3)]}`;
}

function spokenTeamName(name) {
  return (name || "")
    .replace(/\s*\/\s*/g, " y ")
    .replace(/\s*-\s*/g, " y ")
    .trim();
}

function buildAnnouncement(nextState, type = "point") {
  const serverIsTeam1 = nextState.server === 1;
  const serverPoints = serverIsTeam1 ? nextState.points1 : nextState.points2;
  const receiverPoints = serverIsTeam1 ? nextState.points2 : nextState.points1;

  const team1Spoken = spokenTeamName(nextState.team1Name);
  const team2Spoken = spokenTeamName(nextState.team2Name);

  if (type === "match") {
    return `Juego, set y partido para ${nextState.lastWinner === 1 ? team1Spoken : team2Spoken}`;
  }
  if (type === "set") {
    return `Set para ${nextState.lastWinner === 1 ? team1Spoken : team2Spoken}`;
  }
  if (type === "game") {
    return `Juego de ${nextState.lastWinner === 1 ? team1Spoken : team2Spoken}`;
  }

  return pointCall(serverPoints, receiverPoints, nextState.goldenPoint);
}

function speakText(text, enabled = true) {
  if (!enabled || !text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function useMatchState(matchId) {
  const storageKey = useMemo(() => buildStorageKey(matchId), [matchId]);
  const historyKey = useMemo(() => buildHistoryKey(matchId), [matchId]);

  const [state, setState] = useState(() => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : emptyState();
  });

  const historyRef = useRef([]);

  useEffect(() => {
    const rawHistory = localStorage.getItem(historyKey);
    historyRef.current = rawHistory ? JSON.parse(rawHistory) : [];
  }, [historyKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const persistHistory = () => {
    localStorage.setItem(historyKey, JSON.stringify(historyRef.current));
  };

  const clearHistory = () => {
    historyRef.current = [];
    localStorage.setItem(historyKey, JSON.stringify([]));
  };

  const pushHistory = () => {
    historyRef.current.push(JSON.parse(JSON.stringify(state)));
    if (historyRef.current.length > 100) historyRef.current.shift();
    persistHistory();
  };

  const save = (next) => setState({ ...next, updatedAt: Date.now() });

  const startMatch = (config) => {
    clearHistory();
    save({
      ...emptyState(),
      ...config,
      started: true,
      matchStartAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const scorePoint = (winner) => {
    if (state.matchFinished) return;

    pushHistory();

    const pointResult = nextPointState(state.points1, state.points2, winner, state.goldenPoint);
    let next = { ...state, ...pointResult, lastWinner: winner };
    let type = "point";

    if (pointResult.gameWinner) {
      const rawGames1 = state.games1 + (pointResult.gameWinner === 1 ? 1 : 0);
      const rawGames2 = state.games2 + (pointResult.gameWinner === 2 ? 1 : 0);
      const totalGamesPlayedInSet = rawGames1 + rawGames2;

      const setResult = resolveSet(
        state.games1,
        state.games2,
        state.sets1,
        state.sets2,
        pointResult.gameWinner
      );

      let nextSidesSwapped = state.sidesSwapped;

      if (state.sideChangeMode === "odd-games") {
        if (totalGamesPlayedInSet % 2 === 1) {
          nextSidesSwapped = !nextSidesSwapped;
        }
      } else if (state.sideChangeMode === "end-set") {
        if (setResult.setWinner) {
          nextSidesSwapped = !nextSidesSwapped;
        }
      }

      next = {
        ...next,
        points1: 0,
        points2: 0,
        games1: setResult.games1,
        games2: setResult.games2,
        sets1: setResult.sets1,
        sets2: setResult.sets2,
        server: state.server === 1 ? 2 : 1,
        matchFinished: Boolean(setResult.matchWinner),
        winnerLabel: setResult.matchWinner
          ? setResult.matchWinner === 1
            ? state.team1Name
            : state.team2Name
          : "",
        sidesSwapped: nextSidesSwapped,
      };

      type = setResult.matchWinner ? "match" : setResult.setWinner ? "set" : "game";
    }

    next.lastAnnouncement = buildAnnouncement(next, type);
    save(next);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (prev) {
      persistHistory();
      setState(prev);
    }
  };

  const reset = () => {
    clearHistory();
    save(emptyState());
  };

  return { state, startMatch, scorePoint, undo, reset };
}

function UndoArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="undo-inline-icon" aria-hidden="true">
      <path
        d="M9 7H5v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 11c1.8-3.6 5-5.5 8.6-5.5 4.6 0 8.4 3.5 8.4 8s-3.8 8-8.4 8c-2.3 0-4.4-.8-6-2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NewMatchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="new-match-icon" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TeamPanel({
  players = [],
  pointsSelf,
  pointsOther,
  games,
  sets,
  accentClass,
  active,
  goldenPoint,
}) {
  return (
    <div className={`team-panel ${active ? "service-active" : ""}`}>
      <div className="team-top">
        <div className="team-players">{players.filter(Boolean).join(" - ")}</div>
      </div>

      {active && <div className="service-pill">SERVICIO</div>}

      <div className="sets-pill">
        <span className="sets-pill-label">SETS</span>
        <span className="sets-pill-value">{sets}</span>
      </div>

      <div className={`big-score ${accentClass}`}>
        {pointText(pointsSelf, pointsOther, goldenPoint)}
      </div>

      <div className="games-pill">
        <span className="games-pill-label">JUEGOS</span>
        <span className="games-pill-value">{games}</span>
      </div>
    </div>
  );
}

function StartScreen({ startMatch }) {
  const [p1a, setP1a] = useState("");
  const [p1b, setP1b] = useState("");
  const [p2a, setP2a] = useState("");
  const [p2b, setP2b] = useState("");
  const [server, setServer] = useState(1);
  const [golden, setGolden] = useState(true);
  const [sideChangeMode, setSideChangeMode] = useState("odd-games");

  return (
    <div className="start-wrap">
      <div className="card start-card">
        <h1>Iniciar partido</h1>

        <div className="form-grid">
          <input placeholder="Jugador 1 pareja 1" value={p1a} onChange={(e) => setP1a(e.target.value)} />
          <input placeholder="Jugador 2 pareja 1" value={p1b} onChange={(e) => setP1b(e.target.value)} />
          <input placeholder="Jugador 1 pareja 2" value={p2a} onChange={(e) => setP2a(e.target.value)} />
          <input placeholder="Jugador 2 pareja 2" value={p2b} onChange={(e) => setP2b(e.target.value)} />
        </div>

        <div className="section-title">Primer servicio</div>
        <div className="row-buttons">
          <button className={server === 1 ? "btn primary" : "btn"} onClick={() => setServer(1)}>
            Saca pareja 1
          </button>
          <button className={server === 2 ? "btn primary" : "btn"} onClick={() => setServer(2)}>
            Saca pareja 2
          </button>
        </div>

        <div className="section-title">Tipo de punto</div>
        <div className="row-buttons">
          <button className={golden ? "btn primary" : "btn"} onClick={() => setGolden(true)}>
            Punto de oro
          </button>
          <button className={!golden ? "btn primary" : "btn"} onClick={() => setGolden(false)}>
            Ventaja
          </button>
        </div>

        <div className="section-title">Cambio de lado</div>
        <div className="row-buttons">
          <button
            className={sideChangeMode === "odd-games" ? "btn primary" : "btn"}
            onClick={() => setSideChangeMode("odd-games")}
          >
            Juegos impares
          </button>
          <button
            className={sideChangeMode === "end-set" ? "btn primary" : "btn"}
            onClick={() => setSideChangeMode("end-set")}
          >
            Al acabar set
          </button>
          <button
            className={sideChangeMode === "none" ? "btn primary" : "btn"}
            onClick={() => setSideChangeMode("none")}
          >
            Sin cambio automático
          </button>
        </div>

        <button
          className="btn primary full"
          onClick={() =>
            startMatch({
              team1Name: `${p1a || "Jugador 1"} / ${p1b || "Jugador 2"}`,
              team2Name: `${p2a || "Jugador 3"} / ${p2b || "Jugador 4"}`,
              player1A: p1a,
              player1B: p1b,
              player2A: p2a,
              player2B: p2b,
              server,
              goldenPoint: golden,
              sideChangeMode,
              sidesSwapped: false,
            })
          }
        >
          Comenzar partido
        </button>
      </div>
    </div>
  );
}

function ViewMode({ state, undo, scorePoint, resetMatch }) {
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

  const leftTeam = state.sidesSwapped ? 2 : 1;
  const rightTeam = state.sidesSwapped ? 1 : 2;

  const leftData =
    leftTeam === 1
      ? {
          players: [state.player1A, state.player1B],
          pointsSelf: state.points1,
          pointsOther: state.points2,
          games: state.games1,
          sets: state.sets1,
          active: state.server === 1,
          accentClass: "blue-score",
        }
      : {
          players: [state.player2A, state.player2B],
          pointsSelf: state.points2,
          pointsOther: state.points1,
          games: state.games2,
          sets: state.sets2,
          active: state.server === 2,
          accentClass: "red-score",
        };

  const rightData =
    rightTeam === 1
      ? {
          players: [state.player1A, state.player1B],
          pointsSelf: state.points1,
          pointsOther: state.points2,
          games: state.games1,
          sets: state.sets1,
          active: state.server === 1,
          accentClass: "blue-score",
        }
      : {
          players: [state.player2A, state.player2B],
          pointsSelf: state.points2,
          pointsOther: state.points1,
          games: state.games2,
          sets: state.sets2,
          active: state.server === 2,
          accentClass: "red-score",
        };

  return (
    <div className="view-page">
      <div className="view-grid">
        <div className="tap-half tap-left" onClick={() => scorePoint(leftTeam)} />
        <div className="tap-half tap-right" onClick={() => scorePoint(rightTeam)} />

        <TeamPanel
          players={leftData.players}
          pointsSelf={leftData.pointsSelf}
          pointsOther={leftData.pointsOther}
          games={leftData.games}
          sets={leftData.sets}
          accentClass={leftData.accentClass}
          active={leftData.active}
          goldenPoint={state.goldenPoint}
        />

        <TeamPanel
          players={rightData.players}
          pointsSelf={rightData.pointsSelf}
          pointsOther={rightData.pointsOther}
          games={rightData.games}
          sets={rightData.sets}
          accentClass={rightData.accentClass}
          active={rightData.active}
          goldenPoint={state.goldenPoint}
        />

        <div className="score-center-wrap">
          <div className="score-timer">{minutes}:{seconds}</div>
        </div>

        <button
          className="new-match-side"
          onClick={resetMatch}
          title="Nuevo partido"
          aria-label="Nuevo partido"
        >
          <span className="new-match-plus">+</span>
          <span className="new-match-text">NEW</span>
        </button>

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

function ControlMode({ state, scorePoint, undo, reset }) {
  const action1Url = `${window.location.origin}${window.location.pathname}?id=pista1&action=team1`;
  const action2Url = `${window.location.origin}${window.location.pathname}?id=pista1&action=team2`;
  const actionUndoUrl = `${window.location.origin}${window.location.pathname}?id=pista1&action=undo`;

  return (
    <div className="control-page">
      <div className="control-grid">
        <div className="card">
          <h2>Control del partido</h2>

          <div className="control-buttons">
            <button className="big-btn blue-btn" onClick={() => scorePoint(1)}>
              + Punto {state.team1Name}
            </button>
            <button className="big-btn red-btn" onClick={() => scorePoint(2)}>
              + Punto {state.team2Name}
            </button>
            <button className="big-btn gray-btn" onClick={undo}>
              Deshacer
            </button>
            <button className="big-btn gray-btn" onClick={reset}>
              Reiniciar
            </button>
          </div>

          <div className="audio-box">
            <h3>Demo de audio</h3>
            <div className="audio-grid">
              <button className="btn" onClick={() => speakText("Quince nada", true)}>Probar "Quince nada"</button>
              <button className="btn" onClick={() => speakText("Treinta iguales", true)}>Probar "Treinta iguales"</button>
              <button className="btn" onClick={() => speakText("Ventaja servicio", true)}>Probar "Ventaja servicio"</button>
              <button className="btn" onClick={() => speakText("Punto de oro", true)}>Probar "Punto de oro"</button>
              <button className="btn" onClick={() => speakText(`Juego para ${state.team1Name}`, true)}>Probar juego pareja 1</button>
              <button className="btn" onClick={() => speakText(`Juego, set y partido para ${state.team2Name}`, true)}>Probar final de partido</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Conexión Flic</h2>

          <div className="url-box">
            <strong>1 clic - suma punto pareja 1</strong>
            <div>{action1Url}</div>
          </div>

          <div className="url-box">
            <strong>2 clics - suma punto pareja 2</strong>
            <div>{action2Url}</div>
          </div>

          <div className="url-box">
            <strong>Pulsación larga - deshacer</strong>
            <div>{actionUndoUrl}</div>
          </div>

          <div className="note-box">
            Usa en Flic la acción Open browser con estas URLs, sin mode=control.
          </div>
        </div>
      </div>
    </div>
  );
}

function WinnerScreen({ state, reset }) {
  const duration = state.matchStartAt
    ? Math.floor((Date.now() - state.matchStartAt) / 1000)
    : 0;

  const minutes = String(Math.floor(duration / 60)).padStart(2, "0");
  const seconds = String(duration % 60).padStart(2, "0");

  return (
    <div className="winner-screen">
      <div className="winner-card">
        <div className="winner-trophy">🏆</div>

        <div className="winner-title">
          GANADORES DEL PARTIDO
        </div>

        <div className="winner-name">
          {state.winnerLabel.replace("/", " Y ")}
        </div>

        <div className="winner-score">
          {state.sets1} - {state.sets2}
        </div>

        <div className="winner-time">
          ⏱ {minutes}:{seconds}
        </div>

        <button
          className="winner-button"
          onClick={reset}
        >
          NUEVO PARTIDO
        </button>
      </div>
    </div>
  );
}
export default function App() {
  const { matchId, mode, action } = parseMode();
  const { state, startMatch, scorePoint, undo, reset } = useMatchState(matchId);

  useEffect(() => {
    if (state.lastAnnouncement) {
      speakText(state.lastAnnouncement, state.voiceEnabled);
    }
  }, [state.lastAnnouncement, state.voiceEnabled]);

useEffect(() => {
  if (!state.started || !action) return;

  if (action === "team1") scorePoint(1);
  if (action === "team2") scorePoint(2);
  if (action === "undo") undo();

  const params = new URLSearchParams(window.location.search);
  params.delete("action");

  const nextUrl =
    params.toString().length > 0
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

  setTimeout(() => {
    window.history.replaceState({}, "", nextUrl);
  }, 10);
}, [action]);

if (!state.started) return <StartScreen startMatch={startMatch} />;
if (state.matchFinished) return <WinnerScreen state={state} reset={reset} />;
if (mode === "control") return <ControlMode state={state} scorePoint={scorePoint} undo={undo} reset={reset} />;
return <ViewMode state={state} undo={undo} scorePoint={scorePoint} resetMatch={reset} />;
}