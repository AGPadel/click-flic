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
    inTieBreak: false,
    tieBreak1: 0,
    tieBreak2: 0,
    tieBreakStartServer: 1,
    setResults: [],
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

function spokenTeamName(name) {
  return (name || "").replace(/\s*\/\s*/g, " y ").trim();
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

function buildAnnouncement(nextState, type = "point") {
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

  if (type === "tiebreak-start") {
    return "Tie break";
  }

  if (type === "tiebreak-point") {
    const serverSidePoints = nextState.server === 1 ? nextState.tieBreak1 : nextState.tieBreak2;
    const receiverSidePoints = nextState.server === 1 ? nextState.tieBreak2 : nextState.tieBreak1;
    return `${serverSidePoints} ${receiverSidePoints}`;
  }

  const serverIsTeam1 = nextState.server === 1;
  const serverPoints = serverIsTeam1 ? nextState.points1 : nextState.points2;
  const receiverPoints = serverIsTeam1 ? nextState.points2 : nextState.points1;

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

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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
    if (historyRef.current.length > 200) historyRef.current.shift();
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

  const applySideSwapForTieBreak = (currentState, nextTieBreak1, nextTieBreak2, currentSidesSwapped) => {
    if (currentState.sideChangeMode !== "odd-games") return currentSidesSwapped;

    const totalPoints = nextTieBreak1 + nextTieBreak2;
    const previousTotal = currentState.tieBreak1 + currentState.tieBreak2;

    if (totalPoints > 0 && totalPoints % 6 === 0 && totalPoints !== previousTotal) {
      return !currentSidesSwapped;
    }

    return currentSidesSwapped;
  };

  const scoreTieBreakPoint = (winner) => {
    pushHistory();

    const nextTieBreak1 = state.tieBreak1 + (winner === 1 ? 1 : 0);
    const nextTieBreak2 = state.tieBreak2 + (winner === 2 ? 1 : 0);

    let nextSidesSwapped = applySideSwapForTieBreak(state, nextTieBreak1, nextTieBreak2, state.sidesSwapped);

    let next = {
      ...state,
      tieBreak1: nextTieBreak1,
      tieBreak2: nextTieBreak2,
      lastWinner: winner,
      sidesSwapped: nextSidesSwapped,
    };

    const winsTieBreak =
      (nextTieBreak1 >= 7 || nextTieBreak2 >= 7) &&
      Math.abs(nextTieBreak1 - nextTieBreak2) >= 2;

    if (winsTieBreak) {
      const tieBreakWinner = nextTieBreak1 > nextTieBreak2 ? 1 : 2;
      const finalSetScore1 = 6 + (tieBreakWinner === 1 ? 1 : 0);
      const finalSetScore2 = 6 + (tieBreakWinner === 2 ? 1 : 0);

      const updatedSetResults = [
        ...state.setResults,
        { team1: finalSetScore1, team2: finalSetScore2 },
      ];

      let nextSets1 = state.sets1;
      let nextSets2 = state.sets2;

      if (tieBreakWinner === 1) nextSets1 += 1;
      if (tieBreakWinner === 2) nextSets2 += 1;

      let nextSidesAfterSet = nextSidesSwapped;
      if (state.sideChangeMode === "end-set") {
        nextSidesAfterSet = !nextSidesAfterSet;
      }

      const matchWinner = nextSets1 === 2 ? 1 : nextSets2 === 2 ? 2 : null;

      next = {
        ...next,
        points1: 0,
        points2: 0,
        games1: 0,
        games2: 0,
        sets1: nextSets1,
        sets2: nextSets2,
        inTieBreak: false,
        tieBreak1: 0,
        tieBreak2: 0,
        tieBreakStartServer: state.server === 1 ? 2 : 1,
        server: state.tieBreakStartServer === 1 ? 2 : 1,
        matchFinished: Boolean(matchWinner),
        winnerLabel: matchWinner
          ? matchWinner === 1
            ? state.team1Name
            : state.team2Name
          : "",
        lastWinner: tieBreakWinner,
        sidesSwapped: nextSidesAfterSet,
        setResults: updatedSetResults,
      };

      next.lastAnnouncement = buildAnnouncement(next, matchWinner ? "match" : "set");
      save(next);
      return;
    }

    next.lastAnnouncement = buildAnnouncement(next, "tiebreak-point");
    save(next);
  };

  const scoreNormalPoint = (winner) => {
    pushHistory();

    let points1 = state.points1;
    let points2 = state.points2;
    let gameWinner = null;

    const atDeuce = points1 === 3 && points2 === 3;

    if (state.goldenPoint && atDeuce) {
      gameWinner = winner;
    } else if (winner === 1) {
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
    } else if (winner === 2) {
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

    let next = {
      ...state,
      points1,
      points2,
      lastWinner: winner,
    };

    if (!gameWinner) {
      next.lastAnnouncement = buildAnnouncement(next, "point");
      save(next);
      return;
    }

    const rawGames1 = state.games1 + (gameWinner === 1 ? 1 : 0);
    const rawGames2 = state.games2 + (gameWinner === 2 ? 1 : 0);

    if (rawGames1 === 6 && rawGames2 === 6) {
      next = {
        ...state,
        points1: 0,
        points2: 0,
        inTieBreak: true,
        tieBreak1: 0,
        tieBreak2: 0,
        tieBreakStartServer: state.server,
        lastWinner: winner,
      };
      next.lastAnnouncement = buildAnnouncement(next, "tiebreak-start");
      save(next);
      return;
    }

    let nextGames1 = rawGames1;
    let nextGames2 = rawGames2;
    let nextSets1 = state.sets1;
    let nextSets2 = state.sets2;
    let nextSidesSwapped = state.sidesSwapped;
    let updatedSetResults = [...state.setResults];
    let type = "game";

    const team1WinsSet = nextGames1 >= 6 && nextGames1 - nextGames2 >= 2;
    const team2WinsSet = nextGames2 >= 6 && nextGames2 - nextGames1 >= 2;

    if (team1WinsSet || team2WinsSet) {
      updatedSetResults.push({ team1: nextGames1, team2: nextGames2 });

      if (team1WinsSet) nextSets1 += 1;
      if (team2WinsSet) nextSets2 += 1;

      nextGames1 = 0;
      nextGames2 = 0;
      type = "set";

      if (state.sideChangeMode === "end-set") {
        nextSidesSwapped = !nextSidesSwapped;
      }
    } else if (state.sideChangeMode === "odd-games") {
      const totalGamesPlayed = rawGames1 + rawGames2;
      if (totalGamesPlayed % 2 === 1) {
        nextSidesSwapped = !nextSidesSwapped;
      }
    }

    const matchWinner = nextSets1 === 2 ? 1 : nextSets2 === 2 ? 2 : null;
    if (matchWinner) type = "match";

    next = {
      ...state,
      points1: 0,
      points2: 0,
      games1: nextGames1,
      games2: nextGames2,
      sets1: nextSets1,
      sets2: nextSets2,
      server: state.server === 1 ? 2 : 1,
      matchFinished: Boolean(matchWinner),
      winnerLabel: matchWinner
        ? matchWinner === 1
          ? state.team1Name
          : state.team2Name
        : "",
      lastWinner: gameWinner,
      sidesSwapped: nextSidesSwapped,
      setResults: updatedSetResults,
    };

    next.lastAnnouncement = buildAnnouncement(next, type);
    save(next);
  };

  const scorePoint = (winner) => {
    if (state.matchFinished) return;
    if (state.inTieBreak) {
      scoreTieBreakPoint(winner);
    } else {
      scoreNormalPoint(winner);
    }
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

function TeamPanel({
  players = [],
  pointsSelf,
  pointsOther,
  games,
  sets,
  accentClass,
  active,
  goldenPoint,
  inTieBreak,
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
        {inTieBreak ? pointsSelf : pointText(pointsSelf, pointsOther, goldenPoint)}
      </div>

      <div className="games-pill">
        <span className="games-pill-label">JUEGOS</span>
        <span className="games-pill-value">{games}</span>
      </div>
    </div>
  );
}

function WinnerScreen({ state, resetMatch }) {
  const winnerName = spokenTeamName(state.winnerLabel);
  const elapsed = state.matchStartAt ? Date.now() - state.matchStartAt : 0;
  const duration = formatDuration(elapsed);

  return (
    <div className="winner-page">
      <div className="winner-card">
        <div className="winner-trophy">🏆</div>
        <div className="winner-subtitle">GANADOR DEL PARTIDO</div>
        <div className="winner-name">{winnerName}</div>

        <div className="winner-set-results">
          {state.setResults.map((setResult, index) => (
            <span key={index} className="winner-set-item">
              {setResult.team1}-{setResult.team2}
            </span>
          ))}
        </div>

        <div className="winner-duration">⏱ {duration}</div>

        <button className="winner-new-match" onClick={resetMatch}>
          NUEVO PARTIDO
        </button>
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
          pointsSelf: state.inTieBreak ? state.tieBreak1 : state.points1,
          pointsOther: state.inTieBreak ? state.tieBreak2 : state.points2,
          games: state.games1,
          sets: state.sets1,
          active: state.server === 1,
          accentClass: "blue-score",
        }
      : {
          players: [state.player2A, state.player2B],
          pointsSelf: state.inTieBreak ? state.tieBreak2 : state.points2,
          pointsOther: state.inTieBreak ? state.tieBreak1 : state.points1,
          games: state.games2,
          sets: state.sets2,
          active: state.server === 2,
          accentClass: "red-score",
        };

  const rightData =
    rightTeam === 1
      ? {
          players: [state.player1A, state.player1B],
          pointsSelf: state.inTieBreak ? state.tieBreak1 : state.points1,
          pointsOther: state.inTieBreak ? state.tieBreak2 : state.points2,
          games: state.games1,
          sets: state.sets1,
          active: state.server === 1,
          accentClass: "blue-score",
        }
      : {
          players: [state.player2A, state.player2B],
          pointsSelf: state.inTieBreak ? state.tieBreak2 : state.points2,
          pointsOther: state.inTieBreak ? state.tieBreak1 : state.points1,
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
          inTieBreak={state.inTieBreak}
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
          inTieBreak={state.inTieBreak}
        />

        <div className="score-center-wrap">
          <div className="score-timer">
            {state.inTieBreak ? `TIE BREAK · ${minutes}:${seconds}` : `${minutes}:${seconds}`}
          </div>
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
              <button className="btn" onClick={() => speakText(`Juego de ${spokenTeamName(state.team1Name)}`, true)}>Probar juego pareja 1</button>
              <button className="btn" onClick={() => speakText(`Juego, set y partido para ${spokenTeamName(state.team2Name)}`, true)}>Probar final de partido</button>
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
  if (state.matchFinished) return <WinnerScreen state={state} resetMatch={reset} />;
  if (mode === "control") return <ControlMode state={state} scorePoint={scorePoint} undo={undo} reset={reset} />;
  return <ViewMode state={state} undo={undo} scorePoint={scorePoint} resetMatch={reset} />;
}