import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Undo2, RotateCcw, Link2, Smartphone, Tv, Trophy, Settings2, Volume2, PlayCircle } from "lucide-react";

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
    overlay: "",
    lastAnnouncement: "",
    updatedAt: Date.now(),
  };
}

function buildStorageKey(matchId) {
  return `padelscore-match-${matchId}`;
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
    if (points1 <= 2) points1++;
    else if (points1 === 3 && points2 <= 2) gameWinner = 1;
    else if (points1 === 3 && points2 === 3) {
      points1 = 4;
      points2 = 3;
    } else if (points1 === 3 && points2 === 4) {
      points1 = 3;
      points2 = 3;
    } else if (points1 === 4) gameWinner = 1;
  }

  if (winner === 2) {
    if (points2 <= 2) points2++;
    else if (points2 === 3 && points1 <= 2) gameWinner = 2;
    else if (points2 === 3 && points1 === 3) {
      points2 = 4;
      points1 = 3;
    } else if (points2 === 3 && points1 === 4) {
      points2 = 3;
      points1 = 3;
    } else if (points2 === 4) gameWinner = 2;
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

  if (winner === 1) games1++;
  if (winner === 2) games2++;

  const team1WinsSet = games1 >= 6 && games1 - games2 >= 2;
  const team2WinsSet = games2 >= 6 && games2 - games1 >= 2;

  if (team1WinsSet) {
    sets1++;
    games1 = 0;
    games2 = 0;
    setWinner = 1;
  }

  if (team2WinsSet) {
    sets2++;
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

  const calls = ["Nada", "Quince", "Treinta", "Cuarenta"];
  return `${calls[Math.min(pointsServer, 3)]} ${calls[Math.min(pointsReceiver, 3)]}`;
}

function buildAnnouncement(nextState, type = "point") {
  const serverIsTeam1 = nextState.server === 1;
  const serverPoints = serverIsTeam1 ? nextState.points1 : nextState.points2;
  const receiverPoints = serverIsTeam1 ? nextState.points2 : nextState.points1;

  if (type === "match") return `Juego, set y partido para ${nextState.winnerLabel}`;
  if (type === "set") return `Set para ${nextState.lastWinner === 1 ? nextState.team1Name : nextState.team2Name}`;
  if (type === "game") return `Juego para ${nextState.lastWinner === 1 ? nextState.team1Name : nextState.team2Name}`;

  return pointCall(serverPoints, receiverPoints, nextState.goldenPoint);
}

function speakText(text, enabled = true) {
  if (!enabled || !text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function useMatchState(matchId) {
  const storageKey = useMemo(() => buildStorageKey(matchId), [matchId]);

  const [state, setState] = useState(() => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : emptyState();
  });

  const historyRef = useRef([]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const pushHistory = () => {
    historyRef.current.push(JSON.parse(JSON.stringify(state)));
  };

  const save = (next) => setState({ ...next, updatedAt: Date.now() });

  const startMatch = (config) => {
    save({ ...state, ...config, started: true });
  };

  const scorePoint = (winner) => {
    if (state.matchFinished) return;

    pushHistory();

    const pointResult = nextPointState(state.points1, state.points2, winner, state.goldenPoint);

    let next = { ...state, ...pointResult, lastWinner: winner };
    let type = "point";

    if (pointResult.gameWinner) {
      const setResult = resolveSet(state.games1, state.games2, state.sets1, state.sets2, pointResult.gameWinner);

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
        winnerLabel: setResult.matchWinner ? (setResult.matchWinner === 1 ? state.team1Name : state.team2Name) : "",
      };

      type = setResult.matchWinner ? "match" : setResult.setWinner ? "set" : "game";
    }

    next.lastAnnouncement = buildAnnouncement(next, type);

    save(next);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (prev) setState(prev);
  };

  const reset = () => save(emptyState());

  const setVoiceEnabled = (v) => save({ ...state, voiceEnabled: v });
  const setGoldenPoint = (v) => save({ ...state, goldenPoint: v });

  return { state, startMatch, scorePoint, undo, reset, setVoiceEnabled, setGoldenPoint };
}

function TeamPanel({ name, players = [], pointsSelf, pointsOther, games, sets, accent, active, goldenPoint }) {
  return (
    <div
      className={`relative flex h-full flex-col items-center justify-center rounded-[2rem] border bg-white/80
      ${active ? "border-amber-400 ring-[10px] ring-amber-300/70 shadow-2xl shadow-amber-200" : "border-slate-200"}`}
    >
      <div className="absolute top-8 flex flex-col items-center">
        <div className="text-xs tracking-[0.45em] text-slate-400">{name}</div>
        <div className="mt-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-base font-bold tracking-[0.04em] text-slate-700 shadow-sm">
          {players.filter(Boolean).join(" - ")}
        </div>
      </div>

      {active && (
        <div className="absolute top-6 left-6 rounded-full bg-amber-400 text-white px-4 py-2 text-xs font-black tracking-[0.2em] shadow-lg">
          SERVICIO
        </div>
      )}

      <div className={`text-[22rem] font-black leading-none tracking-tighter ${accent}`}>
        {pointText(pointsSelf, pointsOther, goldenPoint)}
      </div>

      <div className="absolute bottom-14 flex flex-col items-center">
        <div className="text-3xl font-black text-slate-400">{games}</div>
        <div className="text-[10px] tracking-[0.45em] text-slate-300">JUEGOS</div>
      </div>

      <div className="absolute top-10 right-10">
        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">SETS {sets}</Badge>
      </div>
    </div>
  );
}

function StartScreen({ startMatch }) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [p1a, setP1a] = useState("");
  const [p1b, setP1b] = useState("");
  const [p2a, setP2a] = useState("");
  const [p2b, setP2b] = useState("");
  const [server, setServer] = useState(1);
  const [golden, setGolden] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl rounded-3xl shadow-2xl">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3 text-2xl font-black">
            <PlayCircle /> Iniciar partido
          </div>

          

          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="Jugador 1 pareja 1" value={p1a} onChange={(e)=>setP1a(e.target.value)} />
            <Input placeholder="Jugador 2 pareja 1" value={p1b} onChange={(e)=>setP1b(e.target.value)} />
            <Input placeholder="Jugador 1 pareja 2" value={p2a} onChange={(e)=>setP2a(e.target.value)} />
            <Input placeholder="Jugador 2 pareja 2" value={p2b} onChange={(e)=>setP2b(e.target.value)} />
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button variant={server===1?"default":"outline"} onClick={()=>setServer(1)}>Saca pareja 1</Button>
            <Button variant={server===2?"default":"outline"} onClick={()=>setServer(2)}>Saca pareja 2</Button>
          </div>

          <div className="flex gap-4">
            <Button variant={golden?"default":"outline"} onClick={()=>setGolden(true)}>Punto de oro</Button>
            <Button variant={!golden?"default":"outline"} onClick={()=>setGolden(false)}>Ventaja</Button>
          </div>

          <Button
            className="w-full h-14 text-lg font-black"
            onClick={()=>startMatch({
              team1Name: (p1a || "Jugador 1") + " / " + (p1b || "Jugador 2"),
              team2Name: (p2a || "Jugador 3") + " / " + (p2b || "Jugador 4"),
              player1A:p1a,
              player1B:p1b,
              player2A:p2a,
              player2B:p2b,
              server,
              goldenPoint:golden
            })}
          >
            Comenzar partido
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ViewMode({ state, undo }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = state.updatedAt || Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startedAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.updatedAt]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="h-screen w-full bg-slate-100 p-2 md:p-3">
      <div className="relative grid h-full grid-cols-2 gap-2">

        <TeamPanel
          name={state.team1Name}
          players={[state.player1A, state.player1B]}
          pointsSelf={state.points1}
          pointsOther={state.points2}
          games={state.games1}
          sets={state.sets1}
          accent="text-slate-800"
          active={state.server===1}
          goldenPoint={state.goldenPoint}
        />

        <TeamPanel
          name={state.team2Name}
          players={[state.player2A, state.player2B]}
          pointsSelf={state.points2}
          pointsOther={state.points1}
          games={state.games2}
          sets={state.sets2}
          accent="text-rose-800"
          active={state.server===2}
          goldenPoint={state.goldenPoint}
        />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
  <div className="relative bg-white px-10 py-6 rounded-3xl shadow-xl border">
    <div className="text-center text-xs tracking-[0.4em] text-slate-400">MARCADOR</div>
    <div className="mt-2 text-center text-xs font-bold text-slate-500">TIEMPO {minutes}:{seconds}</div>
    <div className="flex justify-center gap-6 text-4xl font-black mt-3">
      <span>{state.games1}</span>
      <span>-</span>
      <span>{state.games2}</span>
    </div>
    <div className="flex justify-center gap-6 text-xl mt-2">
      <span>{state.sets1}</span>
      <span>-</span>
      <span>{state.sets2}</span>
    </div>

    <button
      onClick={undo}
      className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/90 px-4 py-2 text-sm font-semibold text-amber-800 shadow-lg backdrop-blur hover:bg-amber-200 transition"
    >
      <RotateCcw className="h-4 w-4" />
      Deshacer
    </button>
  </div>
</div>

      </div>
    </div>
  );
}

function ControlMode({ state, scorePoint, undo }) {
  const action1Url = `${window.location.origin}${window.location.pathname}?id=pista1&mode=control&action=team1`;
  const action2Url = `${window.location.origin}${window.location.pathname}?id=pista1&mode=control&action=team2`;
  const actionUndoUrl = `${window.location.origin}${window.location.pathname}?id=pista1&mode=control&action=undo`;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-6">
            <div className="mb-4 text-2xl font-black">Control del partido</div>
            <div className="flex flex-wrap gap-6">
              <Button className="h-32 w-56 text-2xl" onClick={()=>scorePoint(1)}>+ Punto {state.team1Name}</Button>
              <Button className="h-32 w-56 text-2xl" onClick={()=>scorePoint(2)}>+ Punto {state.team2Name}</Button>
              <Button className="h-32 w-40" variant="secondary" onClick={undo}><Undo2/></Button>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-lg font-black"><Volume2 className="h-5 w-5" /> Demo de audio</div>
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" onClick={()=>speakText("Quince nada", true)}>Probar "Quince nada"</Button>
                <Button variant="outline" onClick={()=>speakText("Treinta iguales", true)}>Probar "Treinta iguales"</Button>
                <Button variant="outline" onClick={()=>speakText("Ventaja servicio", true)}>Probar "Ventaja servicio"</Button>
                <Button variant="outline" onClick={()=>speakText("Punto de oro", true)}>Probar "Punto de oro"</Button>
                <Button variant="outline" onClick={()=>speakText(`Juego para ${state.team1Name}`, true)}>Probar juego pareja 1</Button>
                <Button variant="outline" onClick={()=>speakText(`Juego, set y partido para ${state.team2Name}`, true)}>Probar final de partido</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-6">
            <div className="mb-4 text-2xl font-black">Conexión Flic</div>
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <div className="mb-1 font-bold">1 clic - suma punto pareja 1</div>
                <div className="rounded-xl bg-slate-50 p-3 break-all">{action1Url}</div>
              </div>
              <div>
                <div className="mb-1 font-bold">2 clics - suma punto pareja 2</div>
                <div className="rounded-xl bg-slate-50 p-3 break-all">{action2Url}</div>
              </div>
              <div>
                <div className="mb-1 font-bold">Pulsación larga - deshacer</div>
                <div className="rounded-xl bg-slate-50 p-3 break-all">{actionUndoUrl}</div>
              </div>
              <div className="rounded-2xl border border-dashed p-4 text-slate-600">
                Para que el botón Flic funcione de verdad, el siguiente paso es publicar esta app online y sustituir el guardado local por sincronización en tiempo real. Entonces esas URL podrán dispararse desde el móvil con Flic y el marcador se actualizará al instante.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PadelScorePrototype() {
  const { matchId, mode, action } = parseMode();
  const { state, startMatch, scorePoint, undo } = useMatchState(matchId);

  useEffect(()=>{
    if(state.lastAnnouncement) speakText(state.lastAnnouncement,state.voiceEnabled);
  },[state.lastAnnouncement]);

  useEffect(() => {
    if (!state.started || !action) return;
    if (action === "team1") scorePoint(1);
    if (action === "team2") scorePoint(2);
    if (action === "undo") undo();

    const params = new URLSearchParams(window.location.search);
    params.delete("action");
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  }, [action, state.started]);

  if(!state.started) return <StartScreen startMatch={startMatch}/>;

  if(mode==="control") return <ControlMode state={state} scorePoint={scorePoint} undo={undo}/>;

  return <ViewMode state={state} undo={undo}/>;
}
