import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ============ AUDIO ============
const AC = typeof AudioContext !== "undefined" ? new AudioContext() : null;
function beep(freq, dur = 0.1, vol = 0.12, type = "sine") {
  if (!AC) return; try { const o = AC.createOscillator(); const g = AC.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(AC.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur); o.stop(AC.currentTime + dur);
  } catch {} }
function chord(freqs, dur = 0.15, vol = 0.06, type = "sine") {
  freqs.forEach((f) => beep(f, dur, vol, type));
}
const SFX = {
  click: () => beep(800, 0.04, 0.06),
  build: () => { chord([440, 554, 659], 0.12, 0.05); setTimeout(() => beep(880, 0.08, 0.04), 100); },
  attack: () => { beep(120, 0.08, 0.15, "sawtooth"); beep(180, 0.12, 0.12, "square"); setTimeout(() => beep(90, 0.2, 0.1, "sawtooth"), 80); },
  win: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.15, 0.08), i * 90)); setTimeout(() => chord([523, 659, 784, 1047], 0.4, 0.06), 300); },
  lose: () => { [400, 350, 280, 200].forEach((f, i) => setTimeout(() => beep(f, 0.25, 0.08, "triangle"), i * 150)); },
  settle: () => { chord([330, 415, 523], 0.1, 0.05); setTimeout(() => chord([392, 494, 587], 0.15, 0.06), 120); },
  tech: () => { beep(600, 0.06, 0.06); setTimeout(() => beep(800, 0.06, 0.06), 80); setTimeout(() => chord([600, 800, 1000], 0.2, 0.04), 160); },
  turn: () => { beep(440, 0.04, 0.04); setTimeout(() => beep(523, 0.04, 0.04), 60); },
  conquer: () => { beep(200, 0.06, 0.1, "square"); setTimeout(() => beep(400, 0.08, 0.08, "square"), 60); setTimeout(() => chord([400, 500, 600], 0.25, 0.06), 140); },
};

// Ambient music generator
function createMusic(ac) {
  if (!ac) return null;
  const master = ac.createGain(); master.gain.value = 0.03; master.connect(ac.destination);
  let running = true; let timeout = null;
  const notes = [220, 262, 294, 330, 349, 392, 440];
  function playNote() {
    if (!running) return;
    try {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = Math.random() > 0.5 ? "sine" : "triangle";
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)] * (Math.random() > 0.3 ? 1 : 0.5);
      g.gain.value = 0.02 + Math.random() * 0.03;
      o.connect(g); g.connect(master);
      const dur = 1.5 + Math.random() * 3;
      o.start(); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur); o.stop(ac.currentTime + dur);
    } catch {}
    timeout = setTimeout(playNote, 800 + Math.random() * 2200);
  }
  // Drone
  try {
    const drone = ac.createOscillator(); const dg = ac.createGain();
    drone.type = "sine"; drone.frequency.value = 110; dg.gain.value = 0.015;
    drone.connect(dg); dg.connect(master); drone.start();
  } catch {}
  playNote();
  return { master, stop: () => { running = false; clearTimeout(timeout); master.gain.value = 0; } };
}

// ============ CIVS ============
const CIVS = {
  usa: { name: "United States", symbol: "🦅", color: "#3b82f6", accent: "#60a5fa", bonus: "+5 start gold, Financial SP 25g", home: "usa", startGold: 5, fspDisc: true },
  rome: { name: "Rome", symbol: "⚔️", color: "#dc2626", accent: "#f87171", bonus: "Soldiers cost 4g", home: "rome", solCost: 4 },
  germany: { name: "Germany", symbol: "🍺", color: "#f59e0b", accent: "#fbbf24", bonus: "Markets +10g", home: "germany", marketBonus: 5 },
  england: { name: "England", symbol: "🎩", color: "#6366f1", accent: "#818cf8", bonus: "Free Global Expansion + 2g/turn", home: "uk", freeGlobal: true, flatIncome: 2 },
  china: { name: "China", symbol: "🏯", color: "#ef4444", accent: "#fca5a5", bonus: "Markets +8g + free Economy", home: "china", marketBonus: 3, freeEcon: true },
  greece: { name: "Greece", symbol: "🏛️", color: "#06b6d4", accent: "#67e8f9", bonus: "Tech -25%", home: "greece", techDisc: 0.25 },
  japan: { name: "Japan", symbol: "🌸", color: "#e11d48", accent: "#fb7185", bonus: "Free Global Expansion + Fortification, starts walled", home: "japan", freeGlobal: true, freeFort: true, startWall: true },
  russia: { name: "Russia", symbol: "🏰", color: "#059669", accent: "#34d399", bonus: "Settle 5g", home: "russia", settleCost: 5 },
  egypt: { name: "Egypt", symbol: "☥", color: "#d97706", accent: "#fcd34d", bonus: "+3g/turn per farm", home: "egypt", farmIncome: 3, symbolStyle: { color: "#d4a843" } },
  persia: { name: "Sasanian Empire", symbol: "🌙", color: "#a855f7", accent: "#c084fc", bonus: "+2g/territory", home: "persia", extraIncome: 2 },
  france: { name: "France", symbol: "🍾", color: "#2563eb", accent: "#60a5fa", bonus: "Starts with Farm + Market", home: "franceTerr", startFarmMarket: true },
  umayyad: { name: "Umayyad", symbol: "🐪", color: "#16a34a", accent: "#4ade80", bonus: "Starts with 10 soldiers", home: "arabia", startSol: 10 },
};

const TECH_ECON = [
  { id: "economy", name: "Economy", cost: 5, icon: "🏪", desc: "Build Markets (+5g/turn)" },
  { id: "modernFarming", name: "Modern Farming", cost: 25, icon: "🌾🌾", desc: "Food output x2" },
  { id: "financialSP", name: "Financial Superpower", cost: 50, icon: "💰💰", desc: "All gold income x2" },
];
const TECH_MIL = [
  { id: "fortification", name: "Fortification", cost: 5, icon: "🏰", desc: "Build walls (15g)" },
  { id: "globalExpansion", name: "Global Expansion", cost: 25, icon: "🌍", desc: "Cross oceans to reach any territory" },
  { id: "modernMil", name: "Modern Military", cost: 50, icon: "🚀", desc: "Soldiers x2 power" },
];

const GRID_W = 21; const GRID_H = 13; const CELL = 29;

const TERR = {
  canada:{name:"Canada",cont:"nAmerica",gx:3,gy:1,ter:"snow"},usa:{name:"USA",cont:"nAmerica",gx:3,gy:3,ter:"plains"},
  mexico:{name:"Mexico",cont:"nAmerica",gx:3,gy:5,ter:"desert"},granColombia:{name:"G.Colombia",cont:"sAmerica",gx:4,gy:7,ter:"jungle"},
  peru:{name:"Peru",cont:"sAmerica",gx:4,gy:9,ter:"mountain"},argentina:{name:"Argentina",cont:"sAmerica",gx:4,gy:11,ter:"plains"},
  uk:{name:"Britain",cont:"europe",gx:7,gy:1,ter:"plains"},franceTerr:{name:"France",cont:"europe",gx:8,gy:3,ter:"plains"},
  iberia:{name:"Iberia",cont:"europe",gx:7,gy:4,ter:"hills"},germany:{name:"Germany",cont:"europe",gx:9,gy:2,ter:"forest"},
  rome:{name:"Rome",cont:"europe",gx:9,gy:4,ter:"hills"},greece:{name:"Greece",cont:"europe",gx:10,gy:5,ter:"coast"},
  russia:{name:"Russia",cont:"europe",gx:11,gy:1,ter:"snow"},morocco:{name:"Morocco",cont:"africa",gx:8,gy:7,ter:"desert"},
  egypt:{name:"Egypt",cont:"africa",gx:10,gy:7,ter:"desert"},sAfrica:{name:"S.Africa",cont:"africa",gx:9,gy:10,ter:"plains"},
  persia:{name:"Persia",cont:"asia",gx:13,gy:4,ter:"desert"},arabia:{name:"Arabia",cont:"asia",gx:12,gy:6,ter:"desert"},
  india:{name:"India",cont:"asia",gx:14,gy:7,ter:"jungle"},china:{name:"China",cont:"asia",gx:16,gy:3,ter:"mountain"},
  japan:{name:"Japan",cont:"asia",gx:18,gy:3,ter:"coast"},australia:{name:"Australia",cont:"oceania",gx:17,gy:9,ter:"desert"},
  newZealand:{name:"N.Zealand",cont:"oceania",gx:19,gy:11,ter:"coast"},
};

// Terrain visual config
const TERRAIN = {
  plains: { icon: "🌿", bg: "#1a3320" },
  desert: { icon: "🏜️", bg: "#3d2e1a" },
  snow: { icon: "❄️", bg: "#1a2a3d" },
  forest: { icon: "🌲", bg: "#14301a" },
  jungle: { icon: "🌴", bg: "#1a3825" },
  mountain: { icon: "⛰️", bg: "#2a2530" },
  hills: { icon: "🏔️", bg: "#2a2820" },
  coast: { icon: "🌊", bg: "#152838" },
};

const LAND = new Set([
  "2,0","3,0","4,0","1,1","2,1","4,1","1,2","2,2","3,2","4,2","1,3","2,3","4,3",
  "2,4","3,4","4,4","2,5","4,5","2,6","3,6",
  "3,7","5,7","3,8","4,8","5,8","3,9","5,9","3,10","4,10","5,10","3,11","5,11","4,12","5,12",
  "9,3","10,3","11,3","8,4","10,4","11,4","9,5","11,5",
  "10,0","11,0","12,0","13,0","14,0","15,0","16,0","17,0","18,0","19,0","20,0",
  "10,1","12,1","13,1","14,1","15,1","16,1","17,1","18,1","19,1","20,1",
  "10,2","11,2","12,2","13,2","14,2","15,2","16,2",
  "7,6","8,6","9,6","10,6","11,6","7,7","9,7","11,7",
  "8,8","9,8","10,8","11,8","8,9","9,9","10,9","8,10","10,10","9,11","10,11",
  "12,3","13,3","14,3","15,3","12,4","14,4","15,4","16,4",
  "12,5","13,5","14,5","15,5","16,5","11,6","13,6","14,6",
  "13,8","14,9","13,7","15,7","14,8","15,8","15,3","15,6",
]);

// ============ LANDMASS CONNECTIVITY ============
// Flood-fill from each territory through land tiles to find connected territories
function buildLandmasses() {
  const allLand = new Set(LAND);
  for (const t of Object.values(TERR)) allLand.add(`${t.gx},${t.gy}`);
  const terrAt = {};
  for (const [id, t] of Object.entries(TERR)) terrAt[`${t.gx},${t.gy}`] = id;
  
  const masses = {}; // terrId -> set of terrIds on same landmass
  const assigned = new Set();
  for (const startId of Object.keys(TERR)) {
    if (assigned.has(startId)) continue;
    const s = TERR[startId];
    const vis = new Set(); const q = [`${s.gx},${s.gy}`]; vis.add(q[0]);
    const found = new Set();
    while (q.length) {
      const c = q.shift(); const [cx, cy] = c.split(',').map(Number);
      if (terrAt[c]) found.add(terrAt[c]);
      for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nk = `${cx+dx},${cy+dy}`;
        if (!vis.has(nk) && allLand.has(nk)) { vis.add(nk); q.push(nk); }
      }
    }
    for (const id of found) { masses[id] = found; assigned.add(id); }
  }
  return masses;
}
const LANDMASS = buildLandmasses();

// Two territories are "land connected" if on same landmass
function landConnected(a, b) { return LANDMASS[a]?.has(b) || false; }

const TOTAL = Object.keys(TERR).length;

// Ships are now just a visual naval presence, not required for crossing

export default function Game() {
  const [screen, setScreen] = useState("title");
  const [mode, setMode] = useState("ai"); // "ai" or "2p"
  const [civId, setCivId] = useState(null);
  const [p2CivId, setP2CivId] = useState(null);
  const [hovCiv, setHovCiv] = useState(null);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState("p1"); // "p1", "p2", "ai"
  const [p1Regs, setP1Regs] = useState([]);
  const [p2Regs, setP2Regs] = useState([]);
  const [nRegs, setNRegs] = useState([]);
  const [p1Gold, setP1Gold] = useState(5);
  const [p2Gold, setP2Gold] = useState(5);
  const [soldiers, setSoldiers] = useState({});
  const [food, setFood] = useState({});
  const [walls, setWalls] = useState({});
  const [markets, setMarkets] = useState({});
  const [farms, setFarms] = useState({});
  const [ships, setShips] = useState({}); // ships[terrId] = count (naval units)
  const [p1Tech, setP1Tech] = useState([]);
  const [p2Tech, setP2Tech] = useState([]);
  const [selReg, setSelReg] = useState(null);
  const [log, setLog] = useState([]);
  const [acts, setActs] = useState(0);
  const [maxActs, setMaxActs] = useState(3);
  const [gameOver, setGameOver] = useState(null);
  const [panel, setPanel] = useState("military");
  const [atkModal, setAtkModal] = useState(null);
  const [atkCount, setAtkCount] = useState(1);
  const [mvModal, setMvModal] = useState(null);
  const [mvCount, setMvCount] = useState(1);
  const [moved, setMoved] = useState(false);
  const [flash, setFlash] = useState(null); // { terrId, color }
  const [tut, setTut] = useState(-1); // tutorial step, -1 = off
  const [musicOn, setMusicOn] = useState(true);
  const [vol, setVol] = useState(0.5);
  const logRef = useRef(null);
  const musicRef = useRef(null);

  const is2P = mode === "2p";
  const curPlayer = phase === "p1" ? 1 : 2;
  const curCivId = curPlayer === 1 ? civId : (is2P ? p2CivId : p2CivId);
  const civ = curCivId ? CIVS[curCivId] : null;
  const p1Civ = civId ? CIVS[civId] : null;
  const p2Civ = (is2P ? p2CivId : p2CivId) ? CIVS[is2P ? p2CivId : p2CivId] : null;
  const myRegs = curPlayer === 1 ? p1Regs : p2Regs;
  const oppRegs = curPlayer === 1 ? p2Regs : p1Regs;
  const myGold = curPlayer === 1 ? p1Gold : p2Gold;
  const setMyGold = curPlayer === 1 ? setP1Gold : setP2Gold;
  const myTech = curPlayer === 1 ? p1Tech : p2Tech;
  const setMyTech = curPlayer === 1 ? setP1Tech : setP2Tech;

  const addLog = useCallback((m) => setLog((p) => [...p.slice(-60), `[T${turn}] ${m}`]), [turn]);
  const doFlash = useCallback((terrId, color, type = "pulse") => { setFlash({ terrId, color, type }); setTimeout(() => setFlash(null), 600); }, []);

  const hasTech = useCallback((p, id) => (p === 1 ? p1Tech : p2Tech).includes(id), [p1Tech, p2Tech]);
  // Global Expansion tech unlocks ocean crossing
  const canCrossOcean = useCallback((p) => {
    return hasTech(p, "globalExpansion");
  }, [hasTech]);

  const canReach = useCallback((from, to, p) => {
    if (from === to) return false;
    if (landConnected(from, to)) return true;
    if (canCrossOcean(p)) return true;
    return false;
  }, [canCrossOcean]);

  const getSolCost = (cv) => cv?.solCost || 5;
  const getWallCost = (cv) => cv?.wallCost || 15;
  const getSettleCost = (cv) => cv?.settleCost || 10;
  const getTechCost = (cv, base, tid) => {
    let cost = cv?.techDisc ? Math.floor(base * (1 - cv.techDisc)) : base;
    if (tid === "financialSP" && cv?.fspDisc) cost = 25;
    return cost;
  };

  const calcIncome = useCallback((p) => {
    const regs = p === 1 ? p1Regs : p2Regs;
    const cv = p === 1 ? p1Civ : p2Civ;
    const techs = p === 1 ? p1Tech : p2Tech;
    let g = 5 + (cv?.extraIncome || 0) * regs.length + (cv?.flatIncome || 0);
    for (const r of regs) {
      if (markets[r]) g += 5 + (cv?.marketBonus || 0);
      if (farms[r] && cv?.farmIncome) g += cv.farmIncome;
    }
    if (techs.includes("financialSP")) g *= 2;
    return g;
  }, [p1Regs, p2Regs, p1Civ, p2Civ, p1Tech, p2Tech, markets, farms]);

  const p1Income = useMemo(() => calcIncome(1), [calcIncome]);
  const p2Income = useMemo(() => calcIncome(2), [calcIncome]);
  const myIncome = curPlayer === 1 ? p1Income : p2Income;

  const totalSol = useCallback((p) => {
    return (p === 1 ? p1Regs : p2Regs).reduce((s, r) => s + (soldiers[r] || 0), 0);
  }, [p1Regs, p2Regs, soldiers]);

  const totalShips = useCallback((p) => {
    return (p === 1 ? p1Regs : p2Regs).reduce((s, r) => s + (ships[r] || 0), 0);
  }, [p1Regs, p2Regs, ships]);

  // ======== START ========
  const startGame = useCallback(() => {
    if (!civId) return;
    const cv1 = CIVS[civId];
    let cv2Id;
    if (is2P) { cv2Id = p2CivId; if (!cv2Id) return; }
    else { const opts = Object.keys(CIVS).filter((c) => c !== civId); cv2Id = opts[Math.floor(Math.random() * opts.length)]; }
    setP2CivId(cv2Id);
    const cv2 = CIVS[cv2Id];
    const h1 = cv1.home; const h2 = cv2.home;
    const rest = Object.keys(TERR).filter((t) => t !== h1 && t !== h2);
    const iS = {}; const iF = {}; const iSh = {};
    Object.keys(TERR).forEach((r) => { iS[r] = 0; iF[r] = 0; iSh[r] = 0; });
    iS[h1] = cv1.startSol || 5; iS[h2] = cv2.startSol || 5;
    iF[h1] = cv1.startSol || 5; iF[h2] = cv2.startSol || 5;
    const t1 = []; const t2 = [];
    const iFa = {}; const iMa = {};
    // England: free Global Expansion
    if (cv1.freeGlobal) t1.push("globalExpansion");
    if (cv2.freeGlobal) t2.push("globalExpansion");
    // Japan: free Fortification
    if (cv1.freeFort) t1.push("fortification");
    if (cv2.freeFort) t2.push("fortification");
    if (cv1.freeEcon) t1.push("economy");
    if (cv2.freeEcon) t2.push("economy");
    // France: start with Farm + Market on home
    if (cv1.startFarmMarket) { iFa[h1] = true; iMa[h1] = true; if (!t1.includes("economy")) t1.push("economy"); }
    if (cv2.startFarmMarket) { iFa[h2] = true; iMa[h2] = true; if (!t2.includes("economy")) t2.push("economy"); }
    const iW = {};
    if (cv1.startWall) iW[h1] = true;
    if (cv2.startWall) iW[h2] = true;
    setP1Regs([h1]); setP2Regs([h2]); setNRegs(rest);
    setP1Gold(5 + (cv1.startGold || 0)); setP2Gold(5 + (cv2.startGold || 0));
    setSoldiers(iS); setFood(iF); setShips(iSh);
    setWalls(iW); setMarkets(iMa); setFarms(iFa);
    setP1Tech(t1); setP2Tech(t2);
    setTurn(1); setPhase("p1"); setSelReg(h1); setActs(0);
    setMaxActs(3 + (cv1.extraAct || 0));
    setLog([`${cv1.symbol} ${cv1.name} vs ${cv2.symbol} ${cv2.name}!`, is2P ? "Player 1's turn!" : `💡 Build a Farm, then recruit soldiers!`]);
    setGameOver(null); setPanel("military"); setAtkModal(null); setMvModal(null); setMoved(false);
    setScreen("game"); SFX.settle();
    // Show tutorial on first AI game
    if (!is2P && !window._tutDone) { setTut(0); window._tutDone = true; }
  }, [civId, p2CivId, is2P]);

  const canAct = (phase === "p1" || (is2P && phase === "p2")) && !gameOver && !atkModal && !mvModal;

  // ======== ACTIONS ========
  const buyTech = useCallback((tid) => {
    if (!canAct) return;
    const all = [...TECH_ECON, ...TECH_MIL]; const t = all.find((x) => x.id === tid);
    if (!t || myTech.includes(tid)) return;
    const branch = TECH_ECON.find((x) => x.id === tid) ? TECH_ECON : TECH_MIL;
    const idx = branch.findIndex((x) => x.id === tid);
    if (idx > 0 && !myTech.includes(branch[idx - 1].id)) return;
    const cost = getTechCost(civ, t.cost, t.id);
    if (myGold < cost) return;
    setMyGold((g) => g - cost); setMyTech((p) => [...p, tid]); setActs((a) => a + 1);
    addLog(`🔬 ${civ?.symbol} researched ${t.icon} ${t.name}`); SFX.tech();
  }, [canAct, myGold, myTech, civ, setMyGold, setMyTech, addLog]);

  const MAX_SOL = 25;
  const buySoldier = useCallback((rId) => {
    if (!canAct || !myRegs.includes(rId)) return;
    if ((soldiers[rId]||0) >= MAX_SOL) { addLog(`❌ Max ${MAX_SOL} soldiers per territory`); return; }
    const cost = getSolCost(civ); if (myGold < cost) return;
    if ((food[rId] || 0) < (soldiers[rId] || 0) + 1) { addLog(`❌ Need more food in ${TERR[rId].name}`); return; }
    setMyGold((g) => g - cost); setSoldiers((s) => ({ ...s, [rId]: (s[rId]||0) + 1 }));
    addLog(`⚔️ +1 soldier in ${TERR[rId].name}`); SFX.click(); doFlash(rId, "#e07a5f");
  }, [canAct, myRegs, myGold, civ, food, soldiers, setMyGold, addLog, doFlash]);

  const buyWall = useCallback((rId) => {
    if (!canAct || !myRegs.includes(rId) || !myTech.includes("fortification") || walls[rId]) return;
    const cost = getWallCost(civ); if (myGold < cost) return;
    setMyGold((g) => g - cost); setWalls((w) => ({ ...w, [rId]: true })); setActs((a) => a + 1);
    addLog(`🏰 Walls in ${TERR[rId].name}`); SFX.build(); doFlash(rId, "#a8dadc");
  }, [canAct, myRegs, myTech, myGold, civ, walls, setMyGold, addLog, doFlash]);

  const buyFarm = useCallback((rId) => {
    if (!canAct || !myRegs.includes(rId) || farms[rId]) return;
    if (myGold < 5) return;
    setMyGold((g) => g - 5); setFarms((f) => ({ ...f, [rId]: true })); setActs((a) => a + 1);
    addLog(`🌾 Farm in ${TERR[rId].name}`); SFX.build(); doFlash(rId, "#81b29a");
  }, [canAct, myRegs, myGold, farms, setMyGold, addLog, doFlash]);

  const buyMarket = useCallback((rId) => {
    if (!canAct || !myRegs.includes(rId) || !farms[rId] || markets[rId]) return;
    if (!myTech.includes("economy")) return;
    if (myGold < 10) return;
    setMyGold((g) => g - 10); setMarkets((m) => ({ ...m, [rId]: true })); setActs((a) => a + 1);
    addLog(`🏪 Market in ${TERR[rId].name}`); SFX.build(); doFlash(rId, "#e9c46a");
  }, [canAct, myRegs, myTech, myGold, farms, markets, setMyGold, addLog, doFlash]);

  const settle = useCallback((rId) => {
    if (!canAct || !nRegs.includes(rId)) return;
    const src = myRegs.find((pr) => canReach(pr, rId, curPlayer) && (soldiers[pr]||0) >= 2);
    if (!src) return;
    const cost = getSettleCost(civ); if (myGold < cost) return;
    setMyGold((g) => g - cost);
    setSoldiers((s) => ({ ...s, [src]: (s[src]||0) - 1, [rId]: 1 }));
    if (curPlayer === 1) setP1Regs((p) => [...p, rId]); else setP2Regs((p) => [...p, rId]);
    setNRegs((p) => p.filter((r) => r !== rId));
    setFood((f) => ({ ...f, [rId]: 1 })); setActs((a) => a + 1);
    addLog(`🏴 ${civ?.symbol} settled ${TERR[rId].name}`); SFX.settle(); doFlash(rId, civ?.color, "conquer");
  }, [canAct, nRegs, myRegs, myGold, civ, soldiers, ships, curPlayer, canReach, setMyGold, addLog, doFlash]);

  const startMove = useCallback((from, to) => {
    if (!canAct || moved || !myRegs.includes(from) || !myRegs.includes(to)) return;
    const mx = (soldiers[from]||0) - 1; if (mx <= 0) return;
    let ok = hasTech(curPlayer, "modernMil") || canCrossOcean(curPlayer);
    if (!ok) {
      // Can move through any owned territory on same landmass
      ok = myRegs.includes(to) && landConnected(from, to);
      // Or if connected through owned territory chain across landmasses (already has nav)
    }
    if (!ok) return; setMvModal({ from, to, max: mx }); setMvCount(mx);
  }, [canAct, moved, myRegs, soldiers, curPlayer, hasTech, canReach]);

  const confirmMove = useCallback(() => {
    if (!mvModal) return; const { from, to } = mvModal;
    const space = 25 - (soldiers[to]||0);
    const cnt = Math.min(mvCount, (soldiers[from]||0) - 1, space); if (cnt <= 0) { setMvModal(null); addLog(`❌ Destination at max capacity`); return; }
    const fm = Math.min(food[from]||0, cnt);
    setSoldiers((s) => ({ ...s, [from]: (s[from]||0)-cnt, [to]: (s[to]||0)+cnt }));
    setFood((f) => ({ ...f, [from]: Math.max(0,(f[from]||0)-fm), [to]: (f[to]||0)+fm }));
    setMoved(true); addLog(`🚚 ${cnt} soldiers: ${TERR[from].name} → ${TERR[to].name}`); setMvModal(null); SFX.click();
  }, [mvModal, mvCount, soldiers, food, addLog]);

  const startAttack = useCallback((from, to) => {
    if (!canAct || !myRegs.includes(from) || myRegs.includes(to)) return;
    if (!canReach(from, to, curPlayer)) return;
    const mx = (soldiers[from]||0) - 1; if (mx <= 0) return;
    setAtkModal({ from, to, max: mx, def: soldiers[to]||0, walled: !!walls[to] }); setAtkCount(mx);
  }, [canAct, myRegs, soldiers, walls, curPlayer, canReach]);

  const confirmAttack = useCallback(() => {
    if (!atkModal) return; const { from, to, walled } = atkModal;
    const cnt = Math.min(atkCount, (soldiers[from]||0) - 1); if (cnt <= 0) { setAtkModal(null); return; }
    let pw = cnt; if (myTech.includes("modernMil")) pw *= 2; if (walled) pw = Math.floor(pw * 0.5);
    const dp = soldiers[to]||0;
    const aR = pw * (0.6 + Math.random() * 0.8); const dR = dp * (0.6 + Math.random() * 0.8);
    setSoldiers((s) => ({ ...s, [from]: (s[from]||0)-cnt }));
    if (aR > dR) {
      const sv = Math.max(1, Math.floor(cnt * (1 - dp/(pw+dp+1))));
      const isOpp = oppRegs.includes(to);
      if (isOpp) { if (curPlayer===1) setP2Regs((p) => p.filter((r) => r!==to)); else setP1Regs((p) => p.filter((r) => r!==to)); }
      else setNRegs((p) => p.filter((r) => r!==to));
      if (curPlayer===1) setP1Regs((p) => [...p, to]); else setP2Regs((p) => [...p, to]);
      setSoldiers((s) => ({ ...s, [to]: sv })); setFood((f) => ({ ...f, [to]: Math.max(sv, f[to]||0) }));
      setWalls((w) => { const n={...w}; delete n[to]; return n; });
      addLog(`⚔️ ${civ?.symbol} TOOK ${TERR[to].name}! (${sv} survived)`); SFX.win(); doFlash(to, civ?.color, "conquer");
    } else {
      const dl = Math.floor(cnt * 0.4);
      setSoldiers((s) => ({ ...s, [to]: Math.max(0, (s[to]||0)-dl) }));
      addLog(`⚔️ REPELLED at ${TERR[to].name} (-${cnt} atk, -${dl} def)`); SFX.attack(); doFlash(to, "#e07a5f", "shake");
    }
    setActs((a) => a+1); setAtkModal(null);
  }, [atkModal, atkCount, soldiers, myTech, ships, oppRegs, curPlayer, civ, addLog, doFlash]);

  // ======== END TURN / AI ========
  const applyIncome = useCallback((p) => {
    const inc = p === 1 ? p1Income : p2Income;
    const setG = p === 1 ? setP1Gold : setP2Gold;
    setG((g) => g + inc);
    const regs = p === 1 ? p1Regs : p2Regs;
    const cv = p === 1 ? p1Civ : p2Civ;
    const techs = p === 1 ? p1Tech : p2Tech;
    setFood((prev) => {
      const n = {...prev};
      for (const r of regs) { if (farms[r]) { let fp = 1 + (cv?.farmBonus||0); if (techs.includes("modernFarming")) fp*=2; n[r]=(n[r]||0)+fp; } }
      return n;
    });
  }, [p1Income, p2Income, p1Regs, p2Regs, p1Civ, p2Civ, p1Tech, p2Tech, farms]);

  const checkStarve = useCallback(() => {
    setSoldiers((prev) => {
      const n = {...prev};
      for (const r of [...p1Regs, ...p2Regs]) {
        const fd = food[r]||0; const sol = n[r]||0;
        if (sol > fd && fd >= 0) { const die = sol - Math.max(fd,1); if (die > 0) { n[r]=sol-die; addLog(`💀 ${die} starved in ${TERR[r].name}`); } }
      }
      return n;
    });
  }, [p1Regs, p2Regs, food, addLog]);

  // Smart AI
  const runAI = useCallback(() => {
    let g = p2Gold + p2Income;
    const techs = [...p2Tech]; const nS = {...soldiers}; const nF = {...food};
    const nW = {...walls}; const nFa = {...farms}; const nMa = {...markets};
    const cv = p2Civ;
    const myR = [...p2Regs]; const oppR = [...p1Regs];
    const canNav = techs.includes("globalExpansion");

    // Can AI reach a target territory?
    const aiCanReach = (tgt) => {
      if (myR.some((r) => landConnected(r, tgt))) return true;
      if (canNav) return true;
      return false;
    };

    const buyT = (branch) => { for (const t of branch) { if (techs.includes(t.id)) continue; const i=branch.indexOf(t); if(i>0&&!techs.includes(branch[i-1].id)) break; const c=getTechCost(cv,t.cost,t.id); if(g>=c){g-=c;techs.push(t.id);addLog(`🤖 ${cv?.symbol} researched ${t.icon} ${t.name}`);} break; } };

    // Threat: does opponent have territory on same landmass?
    const threatLevel = oppR.some((r) => myR.some((m) => landConnected(m, r))) ? "high" : "low";

    // AI tech priorities: economy early, fort if threatened, global expansion mid-game
    if (Math.random() > 0.3) buyT(TECH_ECON);
    if (threatLevel === "high" && Math.random() > 0.3) buyT(TECH_MIL);
    if (Math.random() > 0.5) buyT(TECH_MIL);
    if (g > 60) buyT(TECH_ECON);

    // Build farms on all territories (always available)
    for (const r of myR) {
      if (!nFa[r] && g >= 5) { nFa[r]=true; g-=5; }
      if (nFa[r] && !nMa[r] && techs.includes("economy") && g >= 10) { nMa[r]=true; g-=10; }
    }
    for (const r of myR) { if (nFa[r]) { let fp=1+(cv?.farmBonus||0); if(techs.includes("modernFarming")) fp*=2; nF[r]=(nF[r]||0)+fp; } }

    // Buy soldiers — always available (no mining needed)
    {
      const safeBudget = Math.min(Math.floor(g * 0.7), 80);
      const solCost = getSolCost(cv);
      let remaining = Math.floor(safeBudget / solCost);
      const sorted = [...myR].sort((a,b) => (nF[b]||0)-(nS[b]||0) - ((nF[a]||0)-(nS[a]||0)));
      for (const r of sorted) {
        while (remaining > 0 && g >= solCost && (nF[r]||0) > (nS[r]||0) && (nS[r]||0) < 25) { nS[r]=(nS[r]||0)+1; g-=solCost; remaining--; }
      }
    }

    // Walls on territories that share landmass with enemy
    if (techs.includes("fortification")) {
      for (const r of myR) {
        if (!nW[r] && oppR.some((o) => landConnected(r, o)) && g >= getWallCost(cv)) { nW[r]=true; g-=getWallCost(cv); }
      }
    }

    // Attack — try multiple attacks per turn, prioritize player territories
    const attackFrom = [...myR].sort((a,b) => (nS[b]||0)-(nS[a]||0));
    let attacks = 0;
    for (const from of attackFrom) {
      if (attacks >= 3) break; // max 3 attacks per turn
      if ((nS[from]||0) <= 2) continue;
      const reachable = [...oppR, ...nRegs].filter((t) => aiCanReach(t));
      if (!reachable.length) continue;
      // Prioritize player territories over neutrals
      const playerTgts = reachable.filter((t) => oppR.includes(t)).sort((a,b) => (nS[a]||0)-(nS[b]||0));
      const neutralTgts = reachable.filter((t) => !oppR.includes(t)).sort((a,b) => (nS[a]||0)-(nS[b]||0));
      const tgt = playerTgts[0] || neutralTgts[0];
      if (!tgt) continue;
      const defStr = nS[tgt]||0; const myStr = nS[from]||0;
      let effStr = Math.floor(myStr * 0.7);
      if (nW[tgt]) effStr = Math.floor(effStr * 0.5);
      if (techs.includes("modernMil")) effStr *= 2;
      if (effStr > defStr * 1.2) { // slightly more aggressive threshold
        const ac = Math.floor(myStr * 0.7);
        let pw = ac; if(techs.includes("modernMil")) pw*=2; if(nW[tgt]) pw=Math.floor(pw*0.5);
        const aRoll = pw*(0.6+Math.random()*0.8); const dRoll = defStr*(0.6+Math.random()*0.8);
        nS[from]-=ac;
        if (aRoll > dRoll) {
          const sv = Math.max(1, Math.floor(ac*0.5));
          setP1Regs((p) => p.filter((r) => r!==tgt));
          setP2Regs((p) => [...p, tgt]); setNRegs((p) => p.filter((r) => r!==tgt));
          nS[tgt]=sv; nF[tgt]=Math.max(sv,nF[tgt]||0); delete nW[tgt];
          addLog(`🤖 ${cv?.symbol} conquered ${TERR[tgt].name}!`); doFlash(tgt, cv?.color, "conquer");
        } else {
          nS[tgt]=Math.max(0,(nS[tgt]||0)-Math.floor(ac*0.3));
          addLog(`🤖 ${cv?.symbol} failed at ${TERR[tgt].name}`);
        }
        attacks++;
      }
    }

    // Expand — settle multiple reachable neutral territories
    for (let ei = 0; ei < 2 && g >= getSettleCost(cv); ei++) {
      const expandable = nRegs.filter((nr) => aiCanReach(nr) && myR.some((ar) => (nS[ar]||0) >= 2));
      if (expandable.length > 0) {
        const tgt = expandable[Math.floor(Math.random() * expandable.length)];
        const src = myR.find((ar) => (nS[ar]||0) >= 2);
        if (src) {
          g -= getSettleCost(cv); nS[src]--; nS[tgt]=1; nF[tgt]=1;
          myR.push(tgt);
          setP2Regs((p) => [...p, tgt]); setNRegs((p) => p.filter((r) => r!==tgt));
          addLog(`🤖 ${cv?.symbol} settled ${TERR[tgt].name}`);
        }
      }
    }

    setSoldiers(nS); setFood(nF); setWalls(nW); setFarms(nFa); setMarkets(nMa);
    setP2Gold(g); setP2Tech(techs);
  }, [p2Gold, p2Income, p2Tech, soldiers, food, walls, farms, markets, p2Civ, p2Regs, p1Regs, nRegs, addLog, doFlash]);

  const endTurn = useCallback(() => {
    SFX.turn();
    if (phase === "p1") {
      applyIncome(1);
      if (is2P) {
        const cv2 = CIVS[p2CivId];
        setPhase("p2"); setActs(0); setMaxActs(3 + (cv2?.extraAct || 0)); setMoved(false);
        setSelReg(p2Regs[0]||null); addLog(`━━━ Player 2's Turn ━━━`);
      } else {
        setPhase("ai");
      }
    } else if (phase === "p2") {
      applyIncome(2); checkStarve();
      const nt = turn + 1; setTurn(nt); setPhase("p1"); setActs(0);
      setMaxActs(3 + (p1Civ?.extraAct || 0)); setMoved(false);
      setSelReg(p1Regs[0]||null); addLog(`━━━ Turn ${nt} ━━━`);
    }
  }, [phase, is2P, p2CivId, applyIncome, checkStarve, turn, p1Civ, p1Regs, p2Regs]);

  // AI phase
  useEffect(() => {
    if (phase !== "ai") return;
    const tmr = setTimeout(() => {
      runAI(); applyIncome(2); checkStarve();
      const nt = turn + 1; setTurn(nt); setPhase("p1"); setActs(0);
      setMaxActs(3 + (p1Civ?.extraAct || 0)); setMoved(false);
      setSelReg(p1Regs[0]||null); addLog(`━━━ Turn ${nt} ━━━`); SFX.turn();
    }, 800);
    return () => clearTimeout(tmr);
  }, [phase]);

  // Victory — win if opponent has no territory
  useEffect(() => {
    if (screen !== "game") return;
    if (p2Regs.length === 0 && turn > 1) { setGameOver("p1"); SFX.win(); }
    else if (p1Regs.length === 0) { setGameOver("p2"); SFX.lose(); }
  }, [screen, p1Regs, p2Regs, turn]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  // Music lifecycle
  useEffect(() => {
    if (screen === "game" && musicOn && !musicRef.current) {
      musicRef.current = createMusic(AC);
    }
    if ((!musicOn || screen !== "game") && musicRef.current) {
      musicRef.current.stop(); musicRef.current = null;
    }
    return () => { if (musicRef.current) { musicRef.current.stop(); musicRef.current = null; } };
  }, [screen, musicOn]);

  // Tutorial steps
  const TUT_STEPS = [
    { title: "Welcome to Expand or Die! ⚔️", text: "Your goal: conquer all 23 territories on the map. You start with 1 territory, 5 soldiers, 5 food, and 5 gold.", highlight: "map", pos: "center" },
    { title: "Step 1: Build a Farm 🌿", text: "Farms produce food every turn. Soldiers need food to survive — no food = starvation! Click the ⚔️ tab and build a Farm (5💰).", highlight: "mil", pos: "right" },
    { title: "Step 2: Recruit Soldiers ⚔️", text: "Recruit soldiers (5💰 each). Each soldier needs 1 food. Build farms first, then recruit up to your food supply.", highlight: "mil", pos: "right" },
    { title: "Step 3: Research Tech 🔬", text: "Economy (5💰) unlocks Markets for +5💰/turn. Fortification (5💰) unlocks Walls for defense. Click the 🔬 tab.", highlight: "tech", pos: "right" },
    { title: "Step 4: Expand! 🏴", text: "Settle neutral territories (10💰 + 1 soldier). You can reach any territory on the same landmass. Click 🏴 to expand.", highlight: "expand", pos: "right" },
    { title: "Step 5: Attack! 💥", text: "Select a territory with 2+ soldiers to see attack options. Walls cut attacker strength in half. Bring overwhelming force!", highlight: "mil", pos: "right" },
    { title: "Crossing Oceans 🌍", text: "To reach other landmasses, research Global Expansion (⚔️ branch, 50💰). This unlocks ocean crossing so you can attack and settle anywhere!", highlight: "tech", pos: "right" },
    { title: "You're Ready! 🎯", text: "Build farms, raise armies, expand fast, and crush the AI. Unlimited actions per turn — spend wisely! Good luck, commander.", highlight: null, pos: "center" },
  ];

  const ow = (r) => p1Regs.includes(r) ? "p1" : p2Regs.includes(r) ? "p2" : "neutral";
  const P1COL = "#3b82f6", P2COL = "#dc2626";
  const rc = (r) => { const o = ow(r); return o === "p1" ? P1COL : o === "p2" ? P2COL : "#2a3545"; };
  const terrGrid = useMemo(() => { const g = {}; for (const [id,t] of Object.entries(TERR)) g[`${t.gx},${t.gy}`]=id; return g; }, []);

  // ====== TITLE ======
  if (screen === "title") return (
    <div style={{ background: "radial-gradient(ellipse at 50% 30%, #111827, #070b12)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#e8e8e8" }}>
      <div style={{ textAlign: "center", animation: "fi 1s ease" }}>
        <div style={{ fontSize: 56, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(233,196,106,.3))" }}>⚔️</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: 4, margin: "0 0 4px", background: "linear-gradient(135deg,#e9c46a,#f4a261,#e07a5f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EXPAND OR DIE</h1>
        <p style={{ color: "#64748b", fontSize: 12, letterSpacing: 6, marginBottom: 36, fontWeight: 300 }}>CONQUER OR BE CONQUERED</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => { setMode("ai"); setScreen("select"); SFX.click(); }} style={{ background: "linear-gradient(135deg,#e9c46a,#f4a261)", border: "none", color: "#0a1118", padding: "14px 40px", borderRadius: 28, fontSize: 14, fontWeight: 700, letterSpacing: 4, cursor: "pointer", boxShadow: "0 4px 24px rgba(233,196,106,.3)", transition: "transform .15s" }}>VS AI</button>
          <button onClick={() => { setMode("2p"); setScreen("select"); SFX.click(); }} style={{ background: "transparent", border: "2px solid #e9c46a44", color: "#e9c46a", padding: "14px 40px", borderRadius: 28, fontSize: 14, fontWeight: 700, letterSpacing: 4, cursor: "pointer", transition: "all .15s" }}>2 PLAYER</button>
        </div>
        <button onClick={() => { setMode("ai"); setScreen("select"); SFX.click(); window._tutDone = false; }} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer", marginTop: 16, letterSpacing: 2, transition: "color .15s" }}>📖 HOW TO PLAY</button>
      </div>
      <style>{`@keyframes fi{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );

  // ====== SELECT ======
  if (screen === "select") {
    const selecting = is2P && civId && !p2CivId ? 2 : 1;
    const selCid = selecting === 1 ? civId : p2CivId;
    const hd = hovCiv ? CIVS[hovCiv] : selCid ? CIVS[selCid] : null;
    return (
      <div style={{ background: "radial-gradient(ellipse at 50% 20%, #111827, #070b12)", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#e8e8e8", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 12px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: 6, margin: "0 0 2px", background: "linear-gradient(135deg,#e9c46a,#f4a261)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {is2P ? `PLAYER ${selecting} — CHOOSE CIV` : "CHOOSE YOUR CIVILIZATION"}
        </h1>
        <p style={{ color: "#64748b", fontSize: 10, letterSpacing: 3, marginBottom: 16 }}>{is2P ? `${selecting === 1 ? "You go first" : "Choose wisely"}` : "Start: 1 territory, 5 soldiers, 5 gold"}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, maxWidth: 640, width: "100%", marginBottom: 12 }}>
          {Object.entries(CIVS).filter(([id]) => selecting === 2 ? id !== civId : true).map(([id, c]) => {
            const sel = selecting === 1 ? civId === id : p2CivId === id;
            return (
              <div key={id} onClick={() => { if(selecting===1) setCivId(id); else setP2CivId(id); SFX.click(); }}
                onMouseEnter={() => setHovCiv(id)} onMouseLeave={() => setHovCiv(null)}
                style={{ padding: "8px", borderRadius: 8, cursor: "pointer", background: sel ? `linear-gradient(145deg, ${c.color}25, ${c.color}10)` : "linear-gradient(145deg, #111827, #0c1119)", border: sel ? `2px solid ${c.color}` : "2px solid #1e293b", transition: "all 0.2s", boxShadow: sel ? `0 4px 16px ${c.color}22` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 18, ...(c.symbolStyle||{}), filter: sel ? `drop-shadow(0 0 4px ${c.color})` : "none" }}>{c.symbol}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: sel ? c.color : "#e2e8f0" }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 7.5, color: "#94a3b8", lineHeight: 1.4 }}>{c.bonus}</div>
              </div>
            );
          })}
        </div>
        {hd && <div style={{ maxWidth: 640, width: "100%", padding: "10px 14px", background: "linear-gradient(145deg, #111827, #0c1119)", borderRadius: 8, border: `1px solid ${hd.color}33`, marginBottom: 12, fontSize: 11, animation: "fi .15s ease", boxShadow: `0 4px 20px ${hd.color}11` }}>
          <span style={{ fontSize: 24, ...(hd.symbolStyle||{}) }}>{hd.symbol}</span> <span style={{ fontWeight: 700, color: hd.color, fontSize: 13 }}>{hd.name}</span>
          <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{hd.bonus}</div>
          <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>Home: {TERR[hd.home]?.name} {TERRAIN[TERR[hd.home]?.ter]?.icon}</div>
        </div>}
        <button onClick={() => { if (is2P && selecting === 1 && civId) { setHovCiv(null); } else startGame(); }}
          disabled={selecting === 1 ? !civId : !p2CivId}
          style={{ background: (selecting===1?civId:p2CivId) ? `linear-gradient(135deg,${CIVS[selecting===1?civId:p2CivId]?.color},${CIVS[selecting===1?civId:p2CivId]?.accent})` : "#1e293b",
            border: "none", color: (selecting===1?civId:p2CivId) ? "#fff" : "#475569", padding: "12px 40px", borderRadius: 28, fontSize: 13, fontWeight: 700, letterSpacing: 4,
            cursor: (selecting===1?civId:p2CivId) ? "pointer" : "default", opacity: (selecting===1?civId:p2CivId) ? 1 : 0.4,
            boxShadow: (selecting===1?civId:p2CivId) ? `0 4px 20px ${CIVS[selecting===1?civId:p2CivId]?.color}33` : "none", transition: "all .2s" }}>
          {is2P && selecting === 1 ? "NEXT →" : "⚔️ START CONQUEST"}
        </button>
      </div>
    );
  }

  // ====== GAME ======
  const so = selReg ? ow(selReg) : null;
  const sr = selReg ? TERR[selReg] : null;
  const isMine = so === (curPlayer === 1 ? "p1" : "p2");
  return (
    <div style={{ background: "#070b12", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: "#e8e8e8", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 12px", background: "linear-gradient(180deg, #0f1520, #0a0e16)", borderBottom: "1px solid #1e293b55", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ ...(civ?.symbolStyle||{}), fontSize: 13 }}>{civ?.symbol}</span>
          <span style={{ color: "#e9c46a", letterSpacing: 2, fontWeight: 800, fontSize: 10 }}>EXPAND OR DIE</span>
          <span style={{ color: "#475569", fontSize: 10 }}>T{turn}</span>
          {is2P && <span style={{ color: curPlayer === 1 ? P1COL : P2COL, fontWeight: 700, background: `${curPlayer === 1 ? P1COL : P2COL}20`, padding: "1px 6px", borderRadius: 8, fontSize: 9 }}>P{curPlayer}</span>}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 11 }}>
          <span style={{ color: "#e9c46a", fontWeight: 600 }}>💰 {myGold}<span style={{ fontSize: 8, color: "#64748b", fontWeight: 400 }}> +{myIncome}</span></span>
          <span style={{ color: "#e07a5f", fontWeight: 600 }}>⚔️ {totalSol(curPlayer)}</span>
          <span style={{ color: "#64748b", fontSize: 10 }}>{myRegs.length}/{TOTAL}</span>
          {canAct && <button onClick={endTurn} style={{ background: "linear-gradient(135deg,#e9c46a22,#f4a26122)", border: "1px solid #e9c46a44", color: "#e9c46a", padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontSize: 9, fontWeight: 600, letterSpacing: 1, transition: "all .15s" }}>END TURN →</button>}
          {phase === "ai" && <span style={{ color: "#64748b", fontSize: 9 }}>🤖 thinking...</span>}
          <button onClick={() => { setScreen("title"); setGameOver(null); setCivId(null); setP2CivId(null); }} style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", padding: "2px 7px", borderRadius: 8, cursor: "pointer", fontSize: 9, transition: "all .15s" }}>✕</button>
          <button onClick={() => setMusicOn(!musicOn)} style={{ background: "transparent", border: "1px solid #334155", color: musicOn ? "#e9c46a" : "#475569", padding: "2px 7px", borderRadius: 8, cursor: "pointer", fontSize: 9 }}>{musicOn ? "🔊" : "🔇"}</button>
          <button onClick={() => setTut(0)} style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", padding: "2px 7px", borderRadius: 8, cursor: "pointer", fontSize: 9 }}>❓</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: window.innerWidth < 700 ? "column" : "row" }}>
        <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID_W}, ${window.innerWidth < 700 ? 22 : CELL}px)`, gridTemplateRows: `repeat(${GRID_H}, ${window.innerWidth < 700 ? 22 : CELL}px)`, gap: 1 }}>
            {Array.from({ length: GRID_H }, (_, gy) =>
              Array.from({ length: GRID_W }, (_, gx) => {
                const key = `${gx},${gy}`;
                const tId = terrGrid[key];
                const isL = LAND.has(key);
                if (tId) {
                  const t = TERR[tId]; const o = ow(tId); const sel = selReg === tId;
                  const c = rc(tId); const sol = soldiers[tId]||0; const fd = food[tId]||0;
                  const hw = !!walls[tId]; const hf = !!farms[tId]; const hm = !!markets[tId];
                  const fl = flash?.terrId === tId;
                  const flClass = fl ? flash.type === "conquer" ? "t-conq" : flash.type === "shake" ? "t-shake" : "t-pulse" : "";
                  const CZ = window.innerWidth < 700 ? 22 : CELL;
                  const ter = TERRAIN[t.ter] || TERRAIN.plains;
                  return (
                    <div key={key} className={flClass} onClick={() => { setSelReg(tId); SFX.click(); }} style={{
                      width: CZ, height: CZ,
                      background: o === "neutral" ? `linear-gradient(145deg, ${ter.bg}, ${ter.bg}dd)` : `linear-gradient(145deg, ${c}cc, ${c}88)`,
                      opacity: sel ? 1 : o === "neutral" ? 0.5 : 0.82,
                      border: sel ? "2px solid #e9c46a" : `1px solid ${o === "neutral" ? "#334155" : c+"55"}`,
                      borderRadius: 3, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      position: "relative", boxSizing: "border-box",
                      boxShadow: sel ? `0 0 12px #e9c46a55, inset 0 0 6px #ffffff0a` : o !== "neutral" ? "inset 0 1px 2px #ffffff0a" : "none",
                      transition: "opacity .2s, box-shadow .25s, border .15s",
                      "--gc": fl ? flash.color : c,
                    }}>
                      <div style={{ fontSize: CZ < 25 ? 4.5 : 5.5, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #000", textAlign: "center", lineHeight: 1 }}>{t.name}</div>
                      <div style={{ fontSize: CZ < 25 ? 5 : 6, color: "#fff", display: "flex", gap: 1, alignItems: "center" }}>
                        {o === "neutral" && <span style={{ fontSize: CZ < 25 ? 6 : 8, opacity: 0.6 }}>{ter.icon}</span>}
                        {o !== "neutral" && <span style={{ fontSize: 7, ...(o === "p1" ? (p1Civ?.symbolStyle||{}) : (p2Civ?.symbolStyle||{})) }}>{o === "p1" ? p1Civ?.symbol : p2Civ?.symbol}</span>}
                        <span>⚔️{sol}</span>
                        <span>🌾{fd}</span>
                      </div>
                      <div style={{ position: "absolute", top: -1, right: 0, fontSize: 5, display: "flex", gap: 0 }}>
                        {hw && "🏰"}{hf && "🌿"}{hm && "🏪"}
                      </div>
                    </div>
                  );
                }
                return <div key={key} style={{ width: window.innerWidth < 700 ? 22 : CELL, height: window.innerWidth < 700 ? 22 : CELL, background: isL ? "linear-gradient(170deg, #1a3828, #152e20)" : `linear-gradient(${135 + (gx*17+gy*31)%60}deg, #0a1a30, #061525, #0d2040)`, borderRadius: 2, border: `1px solid ${isL ? "#1e4030" : "#0c2040"}`, opacity: isL ? 1 : 0.7 }} />;
              })
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ width: window.innerWidth < 700 ? "100%" : 220, background: "#0c1119", borderLeft: window.innerWidth < 700 ? "none" : "1px solid #1e293b", borderTop: window.innerWidth < 700 ? "1px solid #1e293b" : "none", display: "flex", flexDirection: "column", fontSize: 10, maxHeight: window.innerWidth < 700 ? 250 : "none" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1e293b" }}>
            {[{id:"military",l:"⚔️"},{id:"tech",l:"🔬"},{id:"expand",l:"🏴"},{id:"stats",l:"📊"},{id:"settings",l:"⚙️"}].map((t) => (
              <button key={t.id} onClick={() => setPanel(t.id)} style={{ flex: 1, padding: "5px", background: panel===t.id ? "#1e293b" : "transparent", border: "none", borderBottom: panel===t.id ? `2px solid ${curPlayer === 1 ? P1COL : P2COL}` : "2px solid transparent", color: panel===t.id ? (curPlayer === 1 ? P1COL : P2COL) : "#64748b", cursor: "pointer", fontSize: 11, fontWeight: panel===t.id ? 700 : 400, transition: "all .15s" }}>{t.l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 5 }}>
            {panel === "military" && selReg && sr && (
              <div>
                <div style={{ fontSize: 12, color: rc(selReg), fontWeight: 700, marginBottom: 1 }}>{sr.name} <span style={{ fontSize: 9, opacity: 0.7 }}>{TERRAIN[sr.ter]?.icon}</span></div>
                <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 5, lineHeight: 1.5 }}>
                  ⚔️{soldiers[selReg]||0} 🌾{food[selReg]||0} {walls[selReg]?"🏰":""}
                </div>
                {isMine && <>
                  <div style={{ fontSize: 8, color: "#567", letterSpacing: 1, marginBottom: 2 }}>BUILD</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 5 }}>
                    <Btn ok={canAct && myGold >= getSolCost(civ) && (food[selReg]||0) >= (soldiers[selReg]||0)+1 && (soldiers[selReg]||0) < MAX_SOL} onClick={() => buySoldier(selReg)} label={`+1⚔️ (${getSolCost(civ)}💰) [${soldiers[selReg]||0}/${MAX_SOL}]${(soldiers[selReg]||0)>=MAX_SOL?" MAX":(food[selReg]||0)<(soldiers[selReg]||0)+1?" ❌food":""}`} c="#e07a5f" />
                    {!farms[selReg] && <Btn ok={canAct && myGold >= 5} onClick={() => buyFarm(selReg)} label="🌿 Farm (5💰)" c="#81b29a" />}
                    {farms[selReg] && !markets[selReg] && myTech.includes("economy") && <Btn ok={canAct && myGold >= 10} onClick={() => buyMarket(selReg)} label={`🏪 Market (10💰) +${5+(civ?.marketBonus||0)}/t`} c="#e9c46a" />}
                    {farms[selReg] && !markets[selReg] && !myTech.includes("economy") && <div style={{ fontSize: 8, color: "#554" }}>Need Economy tech for Markets</div>}
                    {myTech.includes("fortification") && !walls[selReg] && <Btn ok={canAct && myGold >= getWallCost(civ)} onClick={() => buyWall(selReg)} label={`🏰 Walls (${getWallCost(civ)}💰)`} c="#a8dadc" />}
                  </div>
                  {(soldiers[selReg]||0) > 1 && <>
                    <div style={{ fontSize: 8, color: "#567", letterSpacing: 1, marginBottom: 2 }}>ATTACK</div>
                    {oppRegs.filter((n) => canReach(selReg, n, curPlayer)).map((tgt) => (
                      <Btn key={tgt} ok={(soldiers[selReg]||0)>1} onClick={() => startAttack(selReg, tgt)}
                        label={`⚔️${TERR[tgt]?.name} (${soldiers[tgt]||0}def${walls[tgt]?"🏰":""})`} c="#e07a5f" />
                    ))}
                    {!canCrossOcean(curPlayer) && Object.keys(TERR).some((n) => !myRegs.includes(n) && !canReach(selReg, n, curPlayer)) &&
                      <div style={{ fontSize: 7, color: "#554", marginTop: 2 }}>🌍 Global Expansion unlocks overseas targets</div>}
                  </>}
                  {!moved && (soldiers[selReg]||0) > 1 && <>
                    <div style={{ fontSize: 8, color: "#567", letterSpacing: 1, marginBottom: 2, marginTop: 4 }}>MOVE</div>
                    {myRegs.filter((r) => r !== selReg).slice(0, 5).map((tgt) => (
                      <Btn key={tgt} ok={true} onClick={() => startMove(selReg, tgt)} label={`🚚→${TERR[tgt]?.name} (⚔️${soldiers[tgt]||0})`} c="#81b29a" />
                    ))}
                  </>}
                </>}
              </div>
            )}
            {panel === "military" && !selReg && <div style={{ color: "#567", fontSize: 9, padding: 6, textAlign: "center" }}>Click a territory</div>}

            {panel === "tech" && (
              <div>
                <div style={{ fontSize: 8, color: "#567", letterSpacing: 1, marginBottom: 3 }}>💰 ECONOMIC</div>
                {TECH_ECON.map((t, i) => {
                  const owned = myTech.includes(t.id); const unlocked = i===0||myTech.includes(TECH_ECON[i-1].id);
                  const cost = getTechCost(civ, t.cost, t.id); const ok = canAct && !owned && unlocked && myGold >= cost;
                  return <TechRow key={t.id} t={t} owned={owned} ok={ok} unlocked={unlocked} cost={cost} onClick={() => ok && buyTech(t.id)} c="#81b29a" />;
                })}
                <div style={{ fontSize: 8, color: "#567", letterSpacing: 1, marginBottom: 3, marginTop: 6 }}>⚔️ MILITARY</div>
                {TECH_MIL.map((t, i) => {
                  const owned = myTech.includes(t.id); const unlocked = i===0||myTech.includes(TECH_MIL[i-1].id);
                  const cost = getTechCost(civ, t.cost, t.id); const ok = canAct && !owned && unlocked && myGold >= cost;
                  return <TechRow key={t.id} t={t} owned={owned} ok={ok} unlocked={unlocked} cost={cost} onClick={() => ok && buyTech(t.id)} c="#e07a5f" />;
                })}
                <div style={{ marginTop: 6, padding: "5px", background: "#111820", borderRadius: 4, fontSize: 7.5, color: "#667", lineHeight: 1.5 }}>
                  💡 Farms + Soldiers available from start<br/>
                  💡 Economy → Markets (+5💰/turn)<br/>
                  💡 Fortification → Walls (defense)<br/>
                  💡 Global Expansion → cross oceans<br/>
                  💡 Same landmass = free access
                </div>
              </div>
            )}

            {panel === "expand" && (
              <div>
                <div style={{ fontSize: 8, color: "#567", letterSpacing: 1, marginBottom: 3 }}>SETTLE ({getSettleCost(civ)}💰 + 1⚔️)</div>
                {nRegs.filter((rId) => myRegs.some((pr) => canReach(pr, rId, curPlayer) && (soldiers[pr]||0) >= 2)).map((rId) => {
                  const ok = canAct && myGold >= getSettleCost(civ);
                  return <Btn key={rId} ok={ok} onClick={() => settle(rId)} label={`🏴 ${TERR[rId]?.name}`} c={civ?.color} />;
                })}
                {nRegs.filter((rId) => myRegs.some((pr) => canReach(pr, rId, curPlayer) && (soldiers[pr]||0) >= 2)).length === 0 &&
                  <div style={{ color: "#556", fontSize: 8, padding: 4 }}>Need 2+ soldiers on any territory{!canCrossOcean(curPlayer)?" (Global Expansion for overseas)":""}</div>}
                <div style={{ marginTop: 8, padding: "5px", background: "#111820", borderRadius: 4, fontSize: 8, color: "#667", lineHeight: 1.5 }}>
                  {p1Civ?.symbol} P1: {p1Regs.length}t ⚔️{totalSol(1)}<br/>
                  {p2Civ?.symbol} {is2P?"P2":"AI"}: {p2Regs.length}t ⚔️{totalSol(2)}<br/>
                  Neutral: {nRegs.length}
                </div>
                <div style={{ marginTop: 3, height: 4, background: "#1a2535", borderRadius: 2, overflow: "hidden", display: "flex" }}>
                  <div style={{ height: "100%", width: `${p1Regs.length/TOTAL*100}%`, background: P1COL, transition: "width 0.5s" }} />
                  <div style={{ height: "100%", width: `${p2Regs.length/TOTAL*100}%`, background: P2COL, transition: "width 0.5s" }} />
                </div>
              </div>
            )}

            {panel === "stats" && (
              <div style={{ animation: "fi .15s ease" }}>
                <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>📊 GAME STATS</div>
                {[
                  { label: "Turn", val: turn },
                  { label: "Your Territories", val: `${myRegs.length} / ${TOTAL}`, c: P1COL },
                  { label: `${is2P?"P2":"AI"} Territories`, val: `${oppRegs.length} / ${TOTAL}`, c: P2COL },
                  { label: "Neutral", val: nRegs.length },
                  { label: "Your Soldiers", val: totalSol(curPlayer), c: "#e07a5f" },
                  { label: `${is2P?"P2":"AI"} Soldiers`, val: totalSol(curPlayer === 1 ? 2 : 1), c: "#e07a5f" },
                  { label: "Your Income", val: `${myIncome}💰/turn`, c: "#e9c46a" },
                  { label: "Your Tech", val: `${myTech.length} / 8` },
                  { label: "Farms Built", val: myRegs.filter((r) => farms[r]).length },
                  { label: "Markets Built", val: myRegs.filter((r) => markets[r]).length },
                  { label: "Walls Built", val: myRegs.filter((r) => walls[r]).length },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 4px", borderBottom: "1px solid #1e293b22", fontSize: 9 }}>
                    <span style={{ color: "#94a3b8" }}>{s.label}</span>
                    <span style={{ color: s.c || "#e2e8f0", fontWeight: 700 }}>{s.val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 9, color: "#64748b", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>💰 INCOME BREAKDOWN</div>
                <div style={{ padding: "3px 4px", fontSize: 8, color: "#94a3b8", lineHeight: 1.7 }}>
                  Base: 5💰<br/>
                  {civ?.extraIncome ? <>Territory bonus: +{civ.extraIncome * myRegs.length}💰 ({civ.extraIncome}×{myRegs.length})<br/></> : null}
                  {civ?.flatIncome ? <>Civ bonus: +{civ.flatIncome}💰/turn<br/></> : null}
                  Markets: +{myRegs.filter((r) => markets[r]).length * (5 + (civ?.marketBonus||0))}💰
                  ({myRegs.filter((r) => markets[r]).length}×{5 + (civ?.marketBonus||0)})<br/>
                  {civ?.farmIncome ? <>Farms: +{myRegs.filter((r) => farms[r]).length * civ.farmIncome}💰 ({myRegs.filter((r) => farms[r]).length}×{civ.farmIncome})<br/></> : null}
                  {myTech.includes("financialSP") && <span style={{ color: "#e9c46a" }}>Financial Superpower: ×2!</span>}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  <div style={{ flex: 1, background: `${P1COL}18`, border: `1px solid ${P1COL}33`, borderRadius: 5, padding: 4, textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: P1COL }}>{totalSol(1)}</div>
                    <div style={{ fontSize: 7, color: "#94a3b8" }}>Your Army</div>
                  </div>
                  <div style={{ flex: 1, background: `${P2COL}18`, border: `1px solid ${P2COL}33`, borderRadius: 5, padding: 4, textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: P2COL }}>{totalSol(curPlayer === 1 ? 2 : 1)}</div>
                    <div style={{ fontSize: 7, color: "#94a3b8" }}>{is2P ? "P2" : "AI"} Army</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 9, color: "#64748b", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>🗺️ YOUR TERRITORIES</div>
                <div style={{ maxHeight: 100, overflowY: "auto", borderRadius: 4, border: "1px solid #1e293b22" }}>
                  {myRegs.map((r) => {
                    const fp = farms[r] ? (1 + (civ?.farmBonus||0)) * (myTech.includes("modernFarming") ? 2 : 1) : 0;
                    const gp = 5 + (civ?.extraIncome||0) + (markets[r] ? 5 + (civ?.marketBonus||0) : 0) + (farms[r] && civ?.farmIncome ? civ.farmIncome : 0);
                    return <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px", fontSize: 8, borderBottom: "1px solid #1e293b11" }}>
                      <span style={{ color: "#cbd5e1" }}>{TERR[r]?.name}</span>
                      <span style={{ color: "#94a3b8" }}>⚔️{soldiers[r]||0} 🌾{food[r]||0}{fp>0?`+${fp}`:""} 💰{gp}</span>
                    </div>;
                  })}
                </div>
                <div style={{ marginTop: 6, fontSize: 9, color: "#64748b", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>🔴 {is2P?"P2":"AI"} TERRITORIES</div>
                <div style={{ maxHeight: 80, overflowY: "auto", borderRadius: 4, border: "1px solid #1e293b22" }}>
                  {oppRegs.map((r) => (
                    <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px", fontSize: 8, borderBottom: "1px solid #1e293b11" }}>
                      <span style={{ color: "#fca5a5" }}>{TERR[r]?.name}</span>
                      <span style={{ color: "#94a3b8" }}>⚔️{soldiers[r]||0} 🌾{food[r]||0}{walls[r]?" 🏰":""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "settings" && (
              <div style={{ animation: "fi .15s ease" }}>
                <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>⚙️ SETTINGS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>🔊 Music</span>
                    <button onClick={() => setMusicOn(!musicOn)} style={{ background: musicOn ? "#e9c46a33" : "#1e293b", border: `1px solid ${musicOn ? "#e9c46a66" : "#334155"}`, color: musicOn ? "#e9c46a" : "#64748b", padding: "3px 10px", borderRadius: 8, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>{musicOn ? "ON" : "OFF"}</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>📖 Tutorial</span>
                    <button onClick={() => setTut(0)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "3px 10px", borderRadius: 8, cursor: "pointer", fontSize: 9, fontWeight: 600 }}>Replay</button>
                  </div>
                  <div style={{ borderTop: "1px solid #1e293b", marginTop: 2, paddingTop: 6 }}>
                    <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>🎮 GAME INFO</div>
                    <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.7 }}>
                      {p1Civ?.symbol} <span style={{ color: P1COL }}>{p1Civ?.name}</span><br/>
                      <span style={{ color: "#64748b" }}>Bonus: {p1Civ?.bonus}</span><br/>
                      {p2Civ?.symbol} <span style={{ color: P2COL }}>{p2Civ?.name}</span><br/>
                      <span style={{ color: "#64748b" }}>Bonus: {p2Civ?.bonus}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #1e293b", marginTop: 2, paddingTop: 6 }}>
                    <button onClick={() => { setScreen("title"); setGameOver(null); setCivId(null); setP2CivId(null); }}
                      style={{ width: "100%", background: "#e07a5f18", border: "1px solid #e07a5f33", color: "#e07a5f", padding: "6px", borderRadius: 8, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>{"🚪"} Return to Menu</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={logRef} style={{ height: 75, borderTop: "1px solid #1a2535", padding: "3px 5px", overflowY: "auto", fontSize: 8, color: "#678", lineHeight: 1.4 }}>
            {log.map((l, i) => <div key={i} style={{ opacity: i === log.length-1 ? 1 : 0.55 }}>{l}</div>)}
          </div>
        </div>
      </div>

      {atkModal && <Modal title={`⚔️ ATTACK ${TERR[atkModal.to]?.name}`} sub={`${atkModal.def}⚔️ def ${atkModal.walled?"🏰 walled":""}`}
        val={atkCount} max={atkModal.max} setVal={setAtkCount}
        onCancel={() => setAtkModal(null)} onConfirm={confirmAttack} confirmLabel={`ATTACK ${atkCount}`} c="#e07a5f" />}
      {mvModal && <Modal title={`🚚 MOVE → ${TERR[mvModal.to]?.name}`} sub="Soldiers + food"
        val={mvCount} max={mvModal.max} setVal={setMvCount}
        onCancel={() => setMvModal(null)} onConfirm={confirmMove} confirmLabel={`MOVE ${mvCount}`} c="#81b29a" />}

      {gameOver && (
        <div style={{ position: "fixed", inset: 0, background: "#070b12ee", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}>
          <div style={{ textAlign: "center", animation: "fi 0.6s ease" }}>
            <div style={{ fontSize: 52, marginBottom: 12, ...(gameOver === "p1" ? (p1Civ?.symbolStyle||{}) : gameOver === "p2" && is2P ? (p2Civ?.symbolStyle||{}) : {}), filter: "drop-shadow(0 0 20px rgba(233,196,106,.4))" }}>{gameOver === "p1" ? p1Civ?.symbol : gameOver === "p2" && is2P ? p2Civ?.symbol : "💀"}</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: gameOver === "p1" ? "#e9c46a" : gameOver === "p2" && is2P ? p2Civ?.color : "#e07a5f", margin: "0 0 4px" }}>
              {gameOver === "p1" ? (is2P ? "PLAYER 1 WINS!" : "WORLD CONQUERED!") : gameOver === "p2" ? (is2P ? "PLAYER 2 WINS!" : "DEFEAT") : "DRAW"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>Turn {turn} · {p1Regs.length} territories</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setScreen("title"); setGameOver(null); setCivId(null); setP2CivId(null); }} style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", padding: "10px 20px", borderRadius: 18, fontSize: 11, cursor: "pointer" }}>MENU</button>
              <button onClick={startGame} style={{ background: `linear-gradient(135deg,${p1Civ?.color},${p1Civ?.accent})`, border: "none", color: "#fff", padding: "10px 28px", borderRadius: 18, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${p1Civ?.color}44` }}>PLAY AGAIN</button>
            </div>
          </div>
        </div>
      )}

      {/* TUTORIAL OVERLAY */}
      {tut >= 0 && tut < TUT_STEPS.length && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,11,18,.75)", display: "flex", alignItems: tut === 0 || TUT_STEPS[tut].pos === "center" ? "center" : "flex-start", justifyContent: TUT_STEPS[tut].pos === "right" ? "flex-end" : "center", zIndex: 200, backdropFilter: "blur(2px)", padding: TUT_STEPS[tut].pos === "right" ? "80px 240px 0 0" : "0" }}>
          <div style={{ background: "#111827", border: "1px solid #e9c46a44", borderRadius: 14, padding: "20px 24px", maxWidth: 340, textAlign: "center", animation: "fi .3s ease", boxShadow: "0 8px 40px rgba(0,0,0,.8), 0 0 30px rgba(233,196,106,.1)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#e9c46a", marginBottom: 8, letterSpacing: 1 }}>{TUT_STEPS[tut].title}</div>
            <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 16 }}>{TUT_STEPS[tut].text}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#64748b" }}>{tut + 1}/{TUT_STEPS.length}</span>
              {tut > 0 && <button onClick={() => setTut(tut - 1)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "6px 14px", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>← Back</button>}
              {tut < TUT_STEPS.length - 1
                ? <button onClick={() => { setTut(tut + 1); SFX.click(); if (TUT_STEPS[tut + 1]?.highlight === "tech") setPanel("tech"); if (TUT_STEPS[tut + 1]?.highlight === "mil") setPanel("military"); if (TUT_STEPS[tut + 1]?.highlight === "expand") setPanel("expand"); }} style={{ background: "linear-gradient(135deg,#e9c46a,#f4a261)", border: "none", color: "#0a1118", padding: "6px 18px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Next →</button>
                : <button onClick={() => { setTut(-1); SFX.conquer(); }} style={{ background: "linear-gradient(135deg,#e9c46a,#f4a261)", border: "none", color: "#0a1118", padding: "6px 18px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Let's Go! 🎯</button>
              }
              {tut === 0 && <button onClick={() => { setTut(-1); }} style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", padding: "6px 14px", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>Skip</button>}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fi{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes conq{0%{transform:scale(1);filter:brightness(1)}30%{transform:scale(1.3);filter:brightness(1.8)}100%{transform:scale(1);filter:brightness(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-4px)}30%{transform:translateX(4px)}45%{transform:translateX(-3px)}60%{transform:translateX(3px)}75%{transform:translateX(-1px)}}
@keyframes bpulse{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes glow{0%{box-shadow:0 0 4px var(--gc)}50%{box-shadow:0 0 16px var(--gc)}100%{box-shadow:0 0 4px var(--gc)}}
.t-conq{animation:conq .5s ease!important}.t-shake{animation:shake .4s ease!important}.t-pulse{animation:bpulse .3s ease!important}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:#334155}`}</style>
    </div>
  );
}

// Reusable UI components
function Btn({ ok, onClick, label, c }) {
  return <div onClick={() => ok && onClick()} style={{ padding: "4px 6px", marginBottom: 2, borderRadius: 5, cursor: ok ? "pointer" : "default", background: ok ? "#111827" : "#0c1119", border: `1px solid ${ok ? c+"44" : "#1e293b"}`, opacity: ok ? 1 : 0.3, fontSize: 9, color: ok ? "#e2e8f0" : "#475569", transition: "all .15s", fontWeight: 500 }}>{label}</div>;
}
function TechRow({ t, owned, ok, unlocked, cost, onClick, c }) {
  return <div onClick={onClick} style={{ padding: "5px 6px", marginBottom: 3, borderRadius: 5, cursor: ok ? "pointer" : "default", background: owned ? `${c}12` : ok ? "#111827" : "#0c1119", border: owned ? `1px solid ${c}33` : "1px solid #1e293b", opacity: owned ? 0.8 : unlocked ? (ok?1:0.5) : 0.2, transition: "all .15s" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 10, fontWeight: 600 }}>{t.icon} {t.name}</span>
      <span style={{ color: owned ? c : "#e9c46a", fontSize: 9, fontWeight: 700 }}>{owned ? "✓" : `${cost}💰`}</span>
    </div>
    <div style={{ fontSize: 8, color: "#64748b", marginTop: 1 }}>{t.desc}</div>
  </div>;
}
function Modal({ title, sub, val, max, setVal, onCancel, onConfirm, confirmLabel, c }) {
  return <div style={{ position: "fixed", inset: 0, background: "rgba(7,11,18,.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
    <div style={{ background: "#111827", border: "1px solid #334155", borderRadius: 12, padding: 20, width: 280, textAlign: "center", animation: "fi 0.2s ease", boxShadow: "0 8px 40px rgba(0,0,0,.6)" }}>
      <div style={{ fontSize: 15, marginBottom: 6, color: c, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 10 }}>{sub}</div>
      <div style={{ fontSize: 28, color: "#e2e8f0", marginBottom: 4, fontWeight: 800 }}>{val}</div>
      <input type="range" min={1} max={max} value={val} onChange={(e) => setVal(+e.target.value)} style={{ width: "85%", marginBottom: 12, accentColor: c }} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={onCancel} style={{ padding: "8px 18px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: "8px 18px", borderRadius: 8, background: `${c}22`, border: `1px solid ${c}55`, color: c, cursor: "pointer", fontSize: 10, fontWeight: 700, boxShadow: `0 2px 12px ${c}22` }}>{confirmLabel}</button>
      </div>
    </div>
  </div>;
}
