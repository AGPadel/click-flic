import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const POINT_LABELS = ["0","15","30","40"];

function emptyState(){
return{
started:false,
team1Name:"PAREJA 1",
team2Name:"PAREJA 2",
player1A:"",
player1B:"",
player2A:"",
player2B:"",
points1:0,
points2:0,
games1:0,
games2:0,
sets1:0,
sets2:0,
server:1,
goldenPoint:true,
voiceEnabled:true,
matchFinished:false,
winnerLabel:"",
lastWinner:null,
lastAnnouncement:"",
matchStartAt:null,
updatedAt:Date.now(),
sideChangeMode:"odd-games",
sidesSwapped:false
};
}

function buildStorageKey(id){return`padelscore-match-${id}`}
function buildHistoryKey(id){return`padelscore-history-${id}`}

function parseMode(){
const params=new URLSearchParams(window.location.search)
return{
matchId:params.get("id")||"pista1",
mode:params.get("mode")||"view",
action:params.get("action")||""
}
}

function spokenTeamName(name){
return(name||"").replace(/\s*\/\s*/g," y ").trim()
}

function nextPointState(p1,p2,winner,golden=true){
let points1=p1
let points2=p2
let gameWinner=null

const atDeuce=points1===3&&points2===3

if(golden&&atDeuce){
gameWinner=winner
return{points1,points2,gameWinner}
}

if(winner===1){
if(points1<=2)points1++
else if(points1===3&&points2<=2)gameWinner=1
else if(points1===3&&points2===3){points1=4;points2=3}
else if(points1===3&&points2===4){points1=3;points2=3}
else if(points1===4)gameWinner=1
}

if(winner===2){
if(points2<=2)points2++
else if(points2===3&&points1<=2)gameWinner=2
else if(points2===3&&points1===3){points2=4;points1=3}
else if(points2===3&&points1===4){points2=3;points1=3}
else if(points2===4)gameWinner=2
}

return{points1,points2,gameWinner}
}

function resolveSet(g1,g2,s1,s2,winner){
let games1=g1
let games2=g2
let sets1=s1
let sets2=s2
let setWinner=null
let matchWinner=null

if(winner===1)games1++
if(winner===2)games2++

const team1WinsSet=games1>=6&&games1-games2>=2
const team2WinsSet=games2>=6&&games2-games1>=2

if(team1WinsSet){sets1++;games1=0;games2=0;setWinner=1}
if(team2WinsSet){sets2++;games1=0;games2=0;setWinner=2}

if(sets1===2)matchWinner=1
if(sets2===2)matchWinner=2

return{games1,games2,sets1,sets2,setWinner,matchWinner}
}

function pointText(ps,po,golden=true){
if(golden&&ps===3&&po===3)return"40"
if(ps===4&&po===3)return"AD"
if(ps===3&&po===4)return"40"
return POINT_LABELS[Math.min(ps,3)]||"0"
}

function pointCall(ps,pr){
const calls=["Nada","Quince","Treinta","Cuarenta"]
return`${calls[Math.min(ps,3)]} ${calls[Math.min(pr,3)]}`
}

function buildAnnouncement(state,type){
const team1=spokenTeamName(state.team1Name)
const team2=spokenTeamName(state.team2Name)

if(type==="match")return`Juego, set y partido para ${state.lastWinner===1?team1:team2}`
if(type==="set")return`Set para ${state.lastWinner===1?team1:team2}`
if(type==="game")return`Juego de ${state.lastWinner===1?team1:team2}`

const serverPoints=state.server===1?state.points1:state.points2
const receiverPoints=state.server===1?state.points2:state.points1

return pointCall(serverPoints,receiverPoints)
}

function speakText(text){
if(!("speechSynthesis"in window))return
window.speechSynthesis.cancel()
const u=new SpeechSynthesisUtterance(text)
u.lang="es-ES"
u.rate=0.95
window.speechSynthesis.speak(u)
}

function useMatchState(matchId){

const storageKey=useMemo(()=>buildStorageKey(matchId),[matchId])
const historyKey=useMemo(()=>buildHistoryKey(matchId),[matchId])

const[state,setState]=useState(()=>{
const raw=localStorage.getItem(storageKey)
return raw?JSON.parse(raw):emptyState()
})

const historyRef=useRef([])

useEffect(()=>{
const raw=localStorage.getItem(historyKey)
historyRef.current=raw?JSON.parse(raw):[]
},[historyKey])

useEffect(()=>{
localStorage.setItem(storageKey,JSON.stringify(state))
},[state])

const persistHistory=()=>localStorage.setItem(historyKey,JSON.stringify(historyRef.current))

const pushHistory=()=>{
historyRef.current.push(JSON.parse(JSON.stringify(state)))
persistHistory()
}

const save=next=>setState({...next,updatedAt:Date.now()})

const startMatch=config=>{
historyRef.current=[]
persistHistory()
save({...emptyState(),...config,started:true,matchStartAt:Date.now()})
}

const scorePoint=winner=>{
if(state.matchFinished)return
pushHistory()

const pointResult=nextPointState(state.points1,state.points2,winner,state.goldenPoint)
let next={...state,...pointResult,lastWinner:winner}
let type="point"

if(pointResult.gameWinner){
const setResult=resolveSet(state.games1,state.games2,state.sets1,state.sets2,pointResult.gameWinner)

next={
...next,
points1:0,
points2:0,
games1:setResult.games1,
games2:setResult.games2,
sets1:setResult.sets1,
sets2:setResult.sets2,
server:state.server===1?2:1
}

type=setResult.matchWinner?"match":setResult.setWinner?"set":"game"
}

next.lastAnnouncement=buildAnnouncement(next,type)
save(next)
}

const undo=()=>{
const prev=historyRef.current.pop()
if(prev){persistHistory();setState(prev)}
}

const reset=()=>{
historyRef.current=[]
persistHistory()
save(emptyState())
}

return{state,startMatch,scorePoint,undo,reset}
}

function TeamPanel({players,pointsSelf,pointsOther,games,sets,active}){

return(
<div className={`team-panel ${active?"service-active":""}`}>

<div className="team-top">
<div className="team-players">{players.filter(Boolean).join(" - ")}</div>
</div>

<div className="big-score">{pointText(pointsSelf,pointsOther)}</div>

<div className="games-pill">JUEGOS {games}</div>

<div className="sets-pill">SETS {sets}</div>

</div>
)
}

function StartScreen({startMatch}){

const[p1a,setP1a]=useState("")
const[p1b,setP1b]=useState("")
const[p2a,setP2a]=useState("")
const[p2b,setP2b]=useState("")

return(
<div className="start-wrap">
<div className="card">

<h1>Iniciar partido</h1>

<input placeholder="Jugador 1 pareja 1" value={p1a} onChange={e=>setP1a(e.target.value)}/>
<input placeholder="Jugador 2 pareja 1" value={p1b} onChange={e=>setP1b(e.target.value)}/>
<input placeholder="Jugador 1 pareja 2" value={p2a} onChange={e=>setP2a(e.target.value)}/>
<input placeholder="Jugador 2 pareja 2" value={p2b} onChange={e=>setP2b(e.target.value)}/>

<button className="btn primary"
onClick={()=>startMatch({
team1Name:`${p1a||"Jugador1"} / ${p1b||"Jugador2"}`,
team2Name:`${p2a||"Jugador3"} / ${p2b||"Jugador4"}`,
player1A:p1a,
player1B:p1b,
player2A:p2a,
player2B:p2b
})}
>Comenzar partido</button>

</div>
</div>
)
}

function ViewMode({state,scorePoint,undo,reset}){

const leftTeam=1
const rightTeam=2

return(
<div className="view-page">

<div className="view-grid">

<div className="tap-left" onClick={()=>scorePoint(leftTeam)}></div>
<div className="tap-right" onClick={()=>scorePoint(rightTeam)}></div>

<TeamPanel
players={[state.player1A,state.player1B]}
pointsSelf={state.points1}
pointsOther={state.points2}
games={state.games1}
sets={state.sets1}
active={state.server===1}
/>

<TeamPanel
players={[state.player2A,state.player2B]}
pointsSelf={state.points2}
pointsOther={state.points1}
games={state.games2}
sets={state.sets2}
active={state.server===2}
/>

<button className="new-match-side" onClick={reset}>
<span className="new-match-plus">+</span>
<span className="new-match-text">NEW</span>
</button>

<button className="undo-bottom" onClick={undo}>Deshacer</button>

</div>
</div>
)
}

export default function App(){

const{matchId,mode,action}=parseMode()

const{state,startMatch,scorePoint,undo,reset}=useMatchState(matchId)

useEffect(()=>{
if(state.lastAnnouncement)speakText(state.lastAnnouncement)
},[state.lastAnnouncement])

useEffect(()=>{
if(!state.started||!action)return

if(action==="team1")scorePoint(1)
if(action==="team2")scorePoint(2)
if(action==="undo")undo()

const params=new URLSearchParams(window.location.search)
params.delete("action")

const next=params.toString()?`${window.location.pathname}?${params}`:window.location.pathname

setTimeout(()=>window.history.replaceState({}, "", next),10)

},[action])

if(!state.started)return<StartScreen startMatch={startMatch}/>
return<ViewMode state={state} scorePoint={scorePoint} undo={undo} reset={reset}/>

}