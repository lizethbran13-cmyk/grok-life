/* Grok Life - core: save, needs, money, clock, co-op netcode (host-authoritative), travel, input, avatars, HUD, loop */
(function () {
'use strict';
const GL = window.GL, GN = window.GrokNet, W = GL.W, MD = GL.MD, Snd = GL.Snd, T = window.THREE;
const $ = (id) => document.getElementById(id);
const esc = GN.esc, clamp = GL.clamp, TAU = Math.PI * 2;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
const G = GL.G = {};
// feature modules (health, crime, animal control) plug in here
G.hooks = { host: [], ev: [], tick: [], hostTick: [], reset: [], newDay: [], leave: [], mob: [], kinds: {} };
G.statusParts = []; G.statusHTML = () => G.statusParts.map((f) => { try { return f() || ''; } catch (e) { return ''; } }).join('');
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
G.ang = ang;

/* ======================================================================
   Save
   ====================================================================== */
const SAVE_KEY = 'grokLife_v1';
function freshSave() {
  return { v: 1, name: '', color: GN.COLORS[0], created: false, look: GL.defaultLook(), muted: false, money: 300, savings: 0, house: 'apt', rent: 0,
    home: W.defaultLayout('apt'), wall: 0, floor: 'wood', inv: {}, bag: { sandwich: 1, apple: 2 }, clothes: { tee: 1, hoodie: 1, dress: 1, none: 1 },
    cars: [], car: null, carPos: null, jobs: {}, job: null, pets: [], nextPet: 1,
    needs: { h: 80, e: 85, f: 75, y: 80, s: 70 }, clock: 8 * 60, day: 1, npc: {},
    stats: { shifts: 0, drive: 0, houses: 0, hangs: 0, tricks: 0, cooked: 0, earned: 0, clothes: 0, online: 0, gifts: 0, perfect: 0, walk: 0, healed: 0, strays: 0 },
    goals: {}, daily: { last: '', streak: 0, best: 0 }, workDay: 0, tut: 0, visited: {}, drive: 'easy', autogas: true, lastT: Date.now(), wish: 0,
    hp: 100, inj: null, appt: null, bills: [], crime: { on: false, loot: {}, done: {}, busts: 0, escapes: 0, jail: 0 }, shelter: [], lostDay: 0 };
}
let save = freshSave();
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (s && s.v === 1) { const f = freshSave(); save = Object.assign(f, s, { stats: Object.assign(f.stats, s.stats || {}), needs: Object.assign(f.needs, s.needs || {}), look: Object.assign(f.look, s.look || {}), daily: Object.assign(f.daily, s.daily || {}), crime: Object.assign(f.crime, s.crime || {}) }); }
  // older saves (before health / crime / animal control) get safe defaults
  if (!(save.hp >= 0 && save.hp <= 100)) save.hp = 100; if (!Array.isArray(save.bills)) save.bills = []; if (!Array.isArray(save.shelter)) save.shelter = [];
  if (save.inj && !(GL.INJ && GL.INJ[save.inj.id])) save.inj = null; if (!save.crime.loot || typeof save.crime.loot !== 'object') save.crime.loot = {}; if (!save.crime.done || typeof save.crime.done !== 'object') save.crime.done = {};
  (save.pets || []).forEach((p) => { if (p.missing && p.missing !== 'lost' && p.missing !== 'shelter') p.missing = 'lost'; });
} catch (e) { /* ignore */ }
if (!save.name) { const gp = GN.savedProfile(); if (gp.hasName) { save.name = gp.name; save.color = gp.color; } }
let saveT = 0;
function persist(now) { save.lastT = Date.now(); if (GS && GS.role !== 'client' && GS.S) { save.clock = GS.S.clock; save.day = GS.S.day; } try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } saveT = now || performance.now(); }
G.save = () => save; G.persist = persist;
G.resetSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } location.reload(); };
const prof = { name: save.name, color: GN.cleanColor(save.color) };
Snd.setMuted(!!save.muted);
function myName() { return GN.cleanName(prof.name || save.name || 'Player'); }
G.myName = myName; G.prof = prof;

/* ======================================================================
   Globals
   ====================================================================== */
const GS = G.GS = { role: null, room: null, pid: GN.pid(), S: null, ui: 'title', me: { area: 'town', x: 33, z: -12, yaw: 0, sp: 0, act: null, ride: null }, pos: {}, av: {},
  panel: null, goal: null, dirty: false, lastSend: 0, lastPos: 0, lastPosSent: '', connecting: false, inWorld: false, evSeen: 0, emote: null, emoteT: 0, work: null, talk: null, decor: null };
const S_ = () => GS.S;
function newSession() { return { v: 1, players: [], looks: {}, homes: {}, assign: {}, clock: save.clock || 480, day: save.day || 1, ev: [], evId: 0, strays: [], shelter: [], cops: [], wanted: {}, acvan: null, vans: {}, sid: 1 }; }
function touch() { GS.dirty = true; }
G.pushEv = (e) => pushEv(e); G.touch = () => touch();
function pushEv(e) { const S = S_(); S.evId++; e.id = S.evId; S.ev.push(e); if (S.ev.length > 30) S.ev.shift(); touch(); }
function playerInfo(pid) { const S = S_(); const p = S && S.players.find((q) => q.pid === pid); return p || { pid, name: pid === GS.pid ? myName() : 'Friend', color: '#ffffff' }; }
G.playerInfo = playerInfo;
G.online = () => GS.role === 'host' || GS.role === 'client';
G.friends = () => { const S = S_(); return S ? S.players.filter((p) => p.pid !== GS.pid) : []; };
G.clock = () => (GS.S ? GS.S.clock : save.clock) || 480;
G.day = () => (GS.S ? GS.S.day : save.day) || 1;
G.hour = () => (G.clock() / 60) % 24;
G.timeStr = function (min) { min = min == null ? G.clock() : min; const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM'); };

/* ======================================================================
   Money, needs, goals
   ====================================================================== */
G.addMoney = function (n, why) { n = Math.round(n); save.money = Math.max(0, save.money + n); if (n > 0 && why === 'earn') save.stats.earned += n; GS.moneyFlash = 1; if (n > 0) Snd.fx('coin'); };
G.spend = function (n) { n = Math.round(n); if (save.money < n) { G.toast('Not enough money! ' + (save.savings >= n - save.money ? 'Take some out of savings at the bank.' : 'Work a shift to earn more.'), true); Snd.fx('no'); return false; } save.money -= n; GS.moneyFlash = 1; Snd.fx('cash'); persist(); return true; };
const NEED_KEYS = ['h', 'e', 'f', 'y', 's'];
G.NEEDS = { h: ['Hunger', '\uD83C\uDF54'], e: ['Energy', '\u26A1'], f: ['Fun', '\uD83C\uDF88'], y: ['Hygiene', '\uD83E\uDDFC'], s: ['Social', '\uD83D\uDCAC'] };
G.need = function (k, d) { save.needs[k] = clamp(save.needs[k] + d, 3, 100); };
const DECAY = { h: 0.06, e: 0.042, f: 0.05, y: 0.038, s: 0.045 };
function decayNeeds(dt) {
  const act = GS.me.act ? GS.me.act.kind : null;
  NEED_KEYS.forEach((k) => {
    let r = -DECAY[k];
    if (act === 'sleep' && k === 'e') r = 2.2; else if (act === 'sleep' && k === 'h') r = -0.02;
    if (k === 's' && friendNear(6)) r = 0.5;
    if (GS.work && k !== 'e') r *= 0.3;
    save.needs[k] = clamp(save.needs[k] + r * dt, 3, 100);
  });
}
G.lowNeed = function () { let lo = null, v = 25; NEED_KEYS.forEach((k) => { if (save.needs[k] < v) { v = save.needs[k]; lo = k; } }); return lo; };
G.mood = () => NEED_KEYS.reduce((a, k) => a + save.needs[k], 0) / 5;
G.moodFace = () => { const m = G.mood(); return m >= 75 ? '\uD83D\uDE04' : m >= 55 ? '\uD83D\uDE42' : m >= 35 ? '\uD83D\uDE10' : '\uD83E\uDD7A'; };
function checkGoals() {
  for (const gl of GL.GOALS) {
    if (save.goals[gl.id]) continue; let r; try { r = gl.p(save); } catch (e) { continue; }
    if (r[0] >= r[1]) { save.goals[gl.id] = Date.now(); G.addMoney(gl.r); G.toast('\uD83C\uDFC6 Goal complete: ' + gl.name + '! +' + GL.money(gl.r)); Snd.fx('level'); persist(); return; }
  }
}
G.checkGoals = checkGoals;
function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
G.today = today;
const DAILY = [50, 75, 100, 125, 150, 200, 300];
function checkDaily() {
  const t = today(); if (save.daily.last === t) return;
  const y = new Date(Date.now() - 864e5), ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
  save.daily.streak = save.daily.last === ys ? save.daily.streak + 1 : 1; save.daily.last = t; save.daily.best = Math.max(save.daily.best || 0, save.daily.streak);
  const n = DAILY[Math.min(6, save.daily.streak - 1)]; G.addMoney(n); if (save.daily.streak % 7 === 0) save.bag.cake = (save.bag.cake || 0) + 1;
  persist();
  dailyQ = { streak: save.daily.streak, n, t: 0, tut: -1 }; // shown by tickDaily() once nothing else is on screen
}
// Daily bonus popup waits its turn: never on top of another panel/phone/talk, and not over an active tutorial step
// (it waits until that step closes, or ~45s of free play as a fallback).
let dailyQ = null;
function tickDaily(dt) {
  const q = dailyQ; if (!q || !GL.UI) return;
  if (q.tut < 0) q.tut = save.tut >= 1 && save.tut < 5 ? save.tut : 0;
  if (!freeToAct() || GS.me.act || (GL.Cars && GL.Cars.driving())) return;
  q.t += dt; if (q.t < 0.9) return;
  if (q.tut && save.tut === q.tut && q.t < 45) return;
  dailyQ = null; GL.UI.daily(q.streak, q.n);
}

/* ======================================================================
   Looks + homes
   ====================================================================== */
G.curLook = function () { const L = Object.assign({}, save.look); if (GS.work && GL.CAREERS[GS.work.cid]) Object.assign(L, GL.CAREERS[GS.work.cid].uni); return L; };
G.homeData = function () { return { type: save.house, layout: save.home.map((f) => Object.assign({}, f)), wall: save.wall, floor: save.floor, owner: myName(), pid: GS.pid }; };
function syncMe() { // send my look / home / pets to the session
  const S = S_(); if (!S) return;
  const look = G.curLook(), pets = GL.Pets ? GL.Pets.activeLooks() : [];
  const k = JSON.stringify([look, pets]); if (k !== GS.lookKey || !S.looks[GS.pid]) { GS.lookKey = k; doAct({ k: 'look', look, pets }); }
  const hk = JSON.stringify(G.homeData()); if (hk !== GS.homeKey || !S.homes[GS.pid]) { GS.homeKey = hk; doAct({ k: 'home', home: G.homeData() }); }
}
G.syncMe = syncMe;
function cleanLook(l) {
  if (!l || typeof l !== 'object') return GL.defaultLook();
  const hex = (c, d) => /^#[0-9a-f]{6}$/i.test(c || '') ? c : d; const d = GL.defaultLook();
  return { skin: hex(l.skin, d.skin), hair: GL.HAIRS.some((h) => h[0] === l.hair) ? l.hair : d.hair, hc: hex(l.hc, d.hc), top: typeof l.top === 'string' ? l.top.slice(0, 10) : 'tee', tc: hex(l.tc, d.tc), bc: hex(l.bc, d.bc), sc: hex(l.sc, d.sc),
    hat: typeof l.hat === 'string' ? l.hat.slice(0, 12) : 'none', hatc: l.hatc ? hex(l.hatc, undefined) : undefined, gl: typeof l.gl === 'string' ? l.gl.slice(0, 10) : 'none', apron: l.apron ? hex(l.apron, undefined) : undefined };
}
function cleanHome(h) {
  if (!h || !GL.HOUSES[h.type]) return { type: 'apt', layout: [], wall: 0, floor: 'wood' };
  const layout = (Array.isArray(h.layout) ? h.layout : []).slice(0, 80).filter((f) => f && GL.FURN[f.id]).map((f) => ({ id: f.id, x: clamp(+f.x || 0, -14, 14), z: clamp(+f.z || 0, -8, 8), r: (+f.r || 0) & 3 }));
  return { type: h.type, layout, wall: clamp(+h.wall || 0, 0, GL.WALLS.length - 1), floor: GL.FLOORS.some((f) => f[0] === h.floor) ? h.floor : 'wood', owner: GN.cleanName(h.owner || ''), pid: String(h.pid || '').slice(0, 40) };
}
// which lot / apartment each player's home uses in this town (host decides)
function assignHomes() {
  const S = S_(); if (!S) return; const out = {}, usedLot = {}, usedUnit = {};
  S.players.forEach((p) => {
    const h = S.homes[p.pid]; if (!h) return;
    if (h.type === 'apt') { let u = 0; while (usedUnit[u] && u < 2) u++; usedUnit[u] = 1; out[p.pid] = { unit: u }; }
    else { let l = GL.HOUSES[h.type].lot; if (usedLot[l]) l = GL.SALE_LOTS.find((q) => !usedLot[q]); if (l == null) l = GL.HOUSES[h.type].lot; usedLot[l] = 1; out[p.pid] = { lot: l }; }
  });
  const k = JSON.stringify(out); if (k !== JSON.stringify(S.assign)) { S.assign = out; touch(); }
}
let lotKey = '';
function applyHomes() { // rebuild the street + apartment doors from session homes
  const S = S_(); if (!S) return;
  const k = JSON.stringify([S.assign, Object.keys(S.homes).map((p) => [p, S.homes[p].type, S.homes[p].owner])]); if (k === lotKey) return; lotKey = k;
  const lotOwner = {}, unitOwner = {};
  for (const pid in S.assign) { const a = S.assign[pid]; if (a.lot != null) lotOwner[a.lot] = pid; if (a.unit != null) unitOwner[a.unit] = pid; }
  GL.SALE_LOTS.forEach((i) => { const pid = lotOwner[i], h = pid && S.homes[pid]; W.setLot(i, h ? { type: h.type, label: h.owner || playerInfo(pid).name, npc: false } : null); W.lots[i].owner = pid || null; });
  W.aptDoors.forEach((hd, u) => { const pid = unitOwner[u]; hd.owner = pid || null; hd.name = pid ? (S.homes[pid].owner || playerInfo(pid).name) + '\u2019s Apartment' : 'Apartment ' + (u + 1) + ' (locked)'; hd.label = pid ? 'ENTER' : 'LOCKED'; });
  if (GL.Cars) GL.Cars.homesChanged();
}
G.homeOf = function (pid) { const S = S_(); if (pid === GS.pid) return Object.assign(G.homeData(), S && S.assign[pid] ? S.assign[pid] : {}); const h = S && S.homes[pid]; return h ? Object.assign({}, h, S.assign[pid] || {}) : null; };
// where my car parks + where I appear when I leave home
G.homeSpot = function (pid) {
  pid = pid || GS.pid; const S = S_(), a = S && S.assign[pid];
  if (a && a.lot != null) { const L = W.lots[a.lot]; return { park: L.drive, door: [L.x - 1.5, 58.4], lot: a.lot }; }
  const u = a && a.unit != null ? a.unit : 0; return { park: W.aptParking[u], door: [W.aptDoors[u].x, W.aptDoors[u].z + 0.4], unit: u };
};

/* ======================================================================
   Host authority
   ====================================================================== */
function hostAct(pid, m) {
  const S = S_(); if (!S || !m) return;
  switch (m.k) {
    case 'look': S.looks[pid] = { av: cleanLook(m.look), pets: (Array.isArray(m.pets) ? m.pets : []).slice(0, 3).map(GL.cleanPetLook || ((x) => x)).filter(Boolean) }; touch(); break;
    case 'home': S.homes[pid] = cleanHome(m.home); S.homes[pid].pid = pid; if (!S.homes[pid].owner) S.homes[pid].owner = playerInfo(pid).name; assignHomes(); touch(); break;
    case 'gift': { const to = S.players.find((p) => p.pid === m.to); if (!to || to.pid === pid) return; const it = m.item === 'money' ? 'money' : GL.ITEMS[m.item] ? m.item : null; if (!it) return; pushEv({ type: 'gift', to: to.pid, from: pid, by: playerInfo(pid).name, item: it, n: clamp(Math.round(+m.n || 1), 1, 5000) }); break; }
    case 'team': { const pids = (Array.isArray(m.pids) ? m.pids : []).filter((q) => q !== pid && S.players.some((p) => p.pid === q)); if (pids.length) pushEv({ type: 'teampay', pids, by: playerInfo(pid).name, cid: String(m.cid || '').slice(0, 12), amt: clamp(Math.round(+m.amt || 0), 0, 400) }); break; }
    case 'wave': pushEv({ type: 'emote', from: pid, by: playerInfo(pid).name, e: ['wave', 'dance', 'five', 'hug'].indexOf(m.e) >= 0 ? m.e : 'wave', to: m.to ? String(m.to).slice(0, 40) : null }); break;
    case 'nap': break;
    default: for (const fn of G.hooks.host) fn(pid, m, S);
  }
}
function doAct(m) { if (!GS.S) return; if (GS.role === 'client') { if (GS.room) GS.room.send(Object.assign({ t: 'act' }, m)); } else hostAct(GS.pid, m); }
G.doAct = doAct;

/* ======================================================================
   Sessions & networking
   ====================================================================== */
function playersFromRoom() {
  const S = S_(), r = GS.room; if (!S) return;
  S.players = r ? r.players().map((p) => ({ pid: p.pid, name: p.name, color: p.color, host: p.host })) : [{ pid: GS.pid, name: myName(), color: prof.color, host: true }];
  for (const k in S.looks) if (!S.players.some((p) => p.pid === k)) delete S.looks[k];
  for (const k in S.homes) if (!S.players.some((p) => p.pid === k)) delete S.homes[k];
  if (GS.role !== 'client') G.hooks.leave.forEach((fn) => fn(S));
  assignHomes(); touch();
}
function startSolo() { leaveSession(true); GS.role = 'solo'; GS.S = newSession(); playersFromRoom(); GS.lookKey = ''; GS.homeKey = ''; syncMe(); enterWorld(); }
function hostOnline(code) {
  leaveSession(true);
  GS.role = 'host'; GS.connecting = true; GS.ui = 'online'; setOnlineMsg('Opening a room\u2026', true);
  const room = GS.room = GN.createRoom({ role: 'host', code: code || undefined, name: myName(), color: prof.color, autoCode: !code, rejoin: !!code, max: 3, pid: GS.pid });
  room.on('status', (t) => { if (GS.connecting) setOnlineMsg(t, true); });
  room.on('open', () => { if (GS.room !== room) return; GS.connecting = false; GS.S = newSession(); GS.evSeen = 0; playersFromRoom(); GS.lookKey = ''; GS.homeKey = ''; syncMe(); enterWorld(); Snd.fx('join'); G.toast('Room ' + room.code + ' is open! Friends join with this code.'); });
  room.on('players', () => { if (GS.room === room) playersFromRoom(); });
  room.on('join', (p) => { if (GS.room !== room || !GS.S) return; G.toast(p.name + ' moved into town!'); Snd.fx('join'); GS.lastSend = 0; save.stats.online = (save.stats.online || 0) + 1; });
  room.on('leave', (p) => { if (GS.room !== room || !GS.S) return; G.toast(p.name + ' went home', true); Snd.fx('leave'); delete GS.pos[p.pid]; playersFromRoom(); if (GS.me.area === 'h_' + p.pid) { G.toast('Your friend left, so you walked outside.'); exitHouseTo(p.pid); } });
  room.on('message', (d, from) => {
    if (!d || typeof d !== 'object' || GS.room !== room) return;
    if (d.t === 'act') hostAct(from, d);
    else if (d.t === 'pos') GS.pos[from] = cleanPos(d);
  });
  room.on('error', (e) => { if (GS.room !== room) return; GS.connecting = false; if (!GS.S) { GS.ui = 'online'; setOnlineMsg(e.title + ': ' + e.message); GS.role = null; GS.room = null; } else G.toast(e.title, true); });
  room.start();
}
function joinOnline(code) {
  code = GN.normalizeCode(code);
  if (!GN.validCode(code)) { GS.ui = 'online'; setOnlineMsg('Enter the 5-letter room code.'); return; }
  leaveSession(true);
  GS.role = 'client'; GS.connecting = true; GS.ui = 'online'; setOnlineMsg('Joining room ' + code + '\u2026', true);
  const room = GS.room = GN.createRoom({ role: 'join', code, name: myName(), color: prof.color, pid: GS.pid, rejoin: !!GS.fromHub });
  room.on('status', (t) => { if (GS.connecting) setOnlineMsg(t, true); });
  room.on('open', () => { setOnlineMsg('Connected! Driving over\u2026', true); Snd.fx('join'); });
  room.on('message', (d) => {
    if (!d || GS.room !== room) return;
    if (d.t === 'st' && d.s) applyState(d.s);
    else if (d.t === 'pp' && d.p) { GS.mob = d.mob && typeof d.mob === 'object' ? d.mob : {}; for (const k in d.p) if (k !== GS.pid) GS.pos[k] = cleanPos(d.p[k]); for (const k in GS.pos) if (!d.p[k]) delete GS.pos[k]; }
  });
  room.on('join', (p) => { if (GS.S) { G.toast(p.name + ' joined!'); Snd.fx('join'); } });
  room.on('leave', (p) => { if (GS.S && !p.host) { G.toast(p.name + ' went home', true); Snd.fx('leave'); if (GS.me.area === 'h_' + p.pid) exitHouseTo(p.pid); } });
  room.on('reconnecting', () => G.toast('Lost the host \u2014 reconnecting\u2026', true));
  room.on('reconnected', () => { G.toast('Reconnected!'); GS.lookKey = ''; GS.homeKey = ''; });
  room.on('error', (e) => {
    if (GS.room !== room) return; GS.connecting = false;
    if (e.code === 'hostleft' && GS.S) { takeOver(); return; }
    leaveSession(true); GS.ui = 'online'; setOnlineMsg(e.title + ': ' + e.message);
  });
  room.start();
}
function cleanPos(d) {
  const c = Array.isArray(d.c) ? [String(d.c[0]).slice(0, 12), /^#[0-9a-f]{6}$/i.test(d.c[1]) ? d.c[1] : '#ef4444', +d.c[2] || 0, +d.c[3] || 0, +d.c[4] || 0, d.c[5] ? 1 : 0, +d.c[6] || 0, String(d.c[7] || '').slice(0, 12)] : null;
  return { a: String(d.a || '').slice(0, 48), x: +d.x || 0, z: +d.z || 0, r: +d.r || 0, m: d.m ? 1 : 0, act: d.act ? String(d.act).slice(0, 10) : null, ax: +d.ax || 0, az: +d.az || 0, ay: +d.ay || 0, c, rd: d.rd ? String(d.rd).slice(0, 40) : null, w: d.w ? String(d.w).slice(0, 12) : null, e: d.e ? String(d.e).slice(0, 6) : null };
}
function applyState(s) {
  const first = !GS.S;
  GS.S = s; GS.connecting = false;
  if (first) { GS.evSeen = s.evId; GS.lookKey = ''; GS.homeKey = ''; save.stats.online = (save.stats.online || 0) + 1; enterWorld(true); }
  if (!s.looks[GS.pid]) GS.lookKey = ''; if (!s.homes[GS.pid]) GS.homeKey = '';
  syncMe();
}
function takeOver() {
  const r = GS.room; GS.room = null; GS.role = 'solo'; try { if (r) r.leave(); } catch (e) { /* ignore */ }
  GS.S = newSession(); GS.pos = {}; playersFromRoom(); GS.lookKey = ''; GS.homeKey = ''; syncMe(); lotKey = '';
  if (GS.me.ride) { GS.me.ride = null; }
  GS.evSeen = 0; if (GL.Cars) GL.Cars.reset(); G.hooks.reset.forEach((fn) => fn());
  G.toast('The host left. You\u2019re back in your own town \u2014 everything is saved!', true); Snd.fx('leave');
  if (GS.work) GL.Work.abort(true);
  closePanel();
  const sp = G.homeSpot(); travel('town', true, sp.door);
}
function leaveSession(silent) {
  const r = GS.room; GS.room = null;
  if (r) { try { r.leave(); } catch (e) { /* ignore */ } }
  if (GS.work && GL.Work) GL.Work.abort(true);
  if (GL.NPC) GL.NPC.abort();
  if (GS.decor && GL.UI) GL.UI.decorEnd();
  GS.S = null; GS.role = null; GS.connecting = false; GS.pos = {}; GS.goal = null; GS.inWorld = false; GS.me.act = null; GS.me.ride = null;
  closePanel(); $('scrMenu').classList.add('hidden'); $('phone').classList.add('hidden');
  for (const k in GS.av) W.scene.remove(GS.av[k].ch.g); GS.av = {};
  if (GL.Cars) GL.Cars.reset(); if (GL.Pets) GL.Pets.clear();
  G.hooks.reset.forEach((fn) => fn()); GS.ovl = null;
  Snd.music(false); lotKey = '';
  if (!silent) GS.ui = 'title';
}
function netTick(now) {
  if (!GS.room || !GS.S) return;
  if (GS.role === 'host') {
    if ((GS.dirty && now - GS.lastSend > 80) || now - GS.lastSend > 1000) { GS.room.broadcast({ t: 'st', s: GS.S }); GS.lastSend = now; GS.dirty = false; }
    if (now - GS.lastPos > 100) { GS.lastPos = now; const p = Object.assign({}, GS.pos); p[GS.pid] = myPos(); const mob = {}; G.hooks.mob && G.hooks.mob.forEach((fn) => fn(mob)); GS.room.broadcast({ t: 'pp', p, mob }); }
  } else if (GS.role === 'client') {
    const p = myPos(), key = JSON.stringify(p);
    if (now - GS.lastPos > 100 && (key !== GS.lastPosSent || now - GS.lastPos > 900)) { GS.lastPos = now; GS.lastPosSent = key; GS.room.send(Object.assign({ t: 'pos' }, p)); }
  }
}
function myPos() {
  const m = GS.me, a = m.act, c = (G.carOverride && G.carOverride()) || (GL.Cars ? GL.Cars.netInfo() : null);
  return { a: m.area, x: +m.x.toFixed(2), z: +m.z.toFixed(2), r: +m.yaw.toFixed(2), m: m.sp > 0.1 ? 1 : 0, act: a ? a.pose || a.kind : null, ax: a ? +(+a.x || 0).toFixed(2) : 0, az: a ? +(+a.z || 0).toFixed(2) : 0, ay: a ? +(+a.yaw || 0).toFixed(2) : 0,
    c, rd: m.ride, w: GS.work ? GS.work.cid : null, e: GS.emoteT > 0 ? GS.emote : null };
}
G.netTick = netTick;

/* ======================================================================
   World flow + travel
   ====================================================================== */
function enterWorld(asGuest) {
  GS.ui = 'game'; GS.inWorld = true; lotKey = '';
  applyHomes();
  if (GL.Cars) GL.Cars.reset();
  const sp = G.homeSpot();
  if (asGuest) travel('town', true, [GL.LOTS[3] + 2, 52.6]);
  else travel(myHomeArea(), true);
  Snd.music(true);
  if (save.tut === 0) { save.tut = 1; persist(); }
  checkDaily();
  void sp;
}
function myHomeArea() { const A = W.homeArea(GS.pid, G.homeData()); return A.id; }
G.myHomeArea = myHomeArea;
function exitHouseTo(pid) { const sp = G.homeSpot(pid); travel('town', true, sp.door); }
function travel(area, instant, at, cb) {
  if (area.indexOf('h_') === 0) { const pid = area.slice(2), h = pid === GS.pid ? G.homeData() : G.homeOf(pid); if (!h) { G.toast('Nobody lives there right now.'); return; } W.homeArea(pid, h); }
  const A = W.areas[area]; if (!A) return;
  const go = () => {
    const sp = at || A.spawn; const f = W.freeNear(A, sp[0], sp[1], 0.4);
    GS.me.area = area; GS.me.x = f[0]; GS.me.z = f[1]; GS.me.yaw = A.outdoor ? GS.me.yaw : Math.PI; GS.goal = null; GS.me.act = null;
    W.setArea(area); W.updateCamera(GS.me.x, GS.me.z, 0, true); GS.lastPos = 0;
    if (!A.outdoor) { save.visited[area.indexOf('h_') === 0 ? 'home' : area] = 1; }
    if (GL.Pets) GL.Pets.onTravel(); if (GL.NPC) GL.NPC.onTravel();
    if (save.tut === 1 && W.bld(area) && area !== 'apt') G.tutNext(1);
    if (cb) cb();
  };
  if (instant) { go(); return; }
  Snd.fx('door'); $('fade').classList.add('on');
  setTimeout(() => { go(); $('fade').classList.remove('on'); G.toast('\u2192 ' + (A.label || area)); }, 260);
}
G.travel = travel;
G.exitArea = function () { const A = W.cur; if (!A) return; let to = A.exitTo; if (A.homeKey) to = G.homeSpot(A.homeKey).door; travel('town', false, to || [0, 6]); };

/* ======================================================================
   Events
   ====================================================================== */
function processEvents() {
  const S = S_(); if (!S) return;
  for (const e of S.ev) {
    if (e.id <= GS.evSeen) continue; GS.evSeen = e.id;
    if (e.type === 'gift' && e.to === GS.pid) {
      if (e.item === 'money') { G.addMoney(e.n); G.toast('\uD83C\uDF81 ' + e.by + ' sent you ' + GL.money(e.n) + '!'); }
      else { save.bag[e.item] = (save.bag[e.item] || 0) + e.n; G.toast('\uD83C\uDF81 ' + e.by + ' gave you ' + GL.ITEMS[e.item].icon + ' ' + GL.ITEMS[e.item].name + '!'); }
      G.need('s', 15); Snd.fx('buy'); persist();
    } else if (e.type === 'teampay' && e.pids.indexOf(GS.pid) >= 0) {
      G.addMoney(e.amt, 'earn'); G.need('s', 10); G.toast('\uD83E\uDD1D Teamwork! You helped ' + e.by + ' \u2014 +' + GL.money(e.amt)); persist();
    } else if (e.type !== 'gift' && e.type !== 'teampay' && e.type !== 'emote') { for (const fn of G.hooks.ev) fn(e);
    } else if (e.type === 'emote' && e.from !== GS.pid && (!e.to || e.to === GS.pid)) {
      const n = { wave: 'waves at you \uD83D\uDC4B', dance: 'is dancing! \uD83D\uDC83', five: 'high-fives you! \u270B', hug: 'hugs you \uD83E\uDD17' }[e.e];
      G.toast(e.by + ' ' + n); if (e.to === GS.pid) { G.need('s', 12); G.need('f', 4); const a = GS.av[GS.pid]; if (a) W.fx('heart', GS.me.x, 2.3, GS.me.z, 4, 0.5); }
    }
  }
}

/* ======================================================================
   Interaction
   ====================================================================== */
function inGame() { return GS.ui === 'game' && GS.inWorld && GS.S; }
G.inGame = inGame;
function freeToAct() { return inGame() && !GS.panel && !GS.talk && !GS.decor && !(GS.work && GS.work.overlay) && !GS.ovl && $('scrMenu').classList.contains('hidden') && $('phone').classList.contains('hidden'); }
G.freeToAct = freeToAct;
function nearestHot() {
  if (!W.cur) return null; let best = null, bd = 1e9;
  for (const h of W.cur.hots) { if (h.hidden) continue; const d = Math.hypot(h.x - GS.me.x, h.z - GS.me.z); if (d <= h.reach && d < bd) { bd = d; best = h; } }
  return best;
}
G.nearestHot = nearestHot;
function workerOf(place) { return save.job && GL.CAREERS[save.job].place === place; }
function interact(h) {
  if (!h) return; GS.goal = null; Snd.fx('click');
  const UI = GL.UI;
  switch (h.kind) {
    case 'door': {
      if (h.to === 'arcade') { UI.arcade(); return; }
      if (!W.isOpen(h.to, G.clock()) && !workerOf(h.to) && save.crime.on && (h.to === 'museum' || h.to === 'jewelry' || h.to === 'bank')) { G.toast('\uD83E\uDD77 You tiptoe in through the back window\u2026'); travel(h.to); return; }
      if (!W.isOpen(h.to, G.clock()) && !workerOf(h.to)) { const b = W.bld(h.to); G.toast(b.name + ' is closed right now. Open ' + G.timeStr(b.open[0] * 60) + ' \u2013 ' + G.timeStr(b.open[1] * 60) + '.', true); Snd.fx('no'); return; }
      travel(h.to); return;
    }
    case 'exit': G.exitArea(); return;
    case 'apt': { if (!h.owner) { G.toast('That apartment is locked.', true); return; } travel('h_' + h.owner); return; }
    case 'house': { const L = W.lots[h.lot]; if (L.owner) travel('h_' + L.owner); else UI.realtor(GL.HOUSE_ORDER.find((k) => GL.HOUSES[k].lot === h.lot)); return; }
    case 'knock': if (GL.NPC) GL.NPC.knock(h.npc); return;
    case 'shop': UI.shop(h.shop); return;
    case 'boutique': UI.boutique(); return;
    case 'bank': case 'atm': UI.bank(); return;
    case 'jobs': UI.jobs(); return;
    case 'realtor': UI.realtor(); return;
    case 'paint': UI.paint(); return;
    case 'adopt': UI.adopt(); return;
    case 'dealer': UI.dealer(h.car); return;
    case 'repaint': UI.repaint(); return;
    case 'clinic': UI.clinic(); return;
    case 'work': GL.Work.request(h.career); return;
    case 'sit': startAct({ kind: 'sit', pose: 'sit', x: h.sx, z: h.sz, yaw: h.yaw, name: h.name }); return;
    case 'furn': useFurn(h); return;
    case 'play': startAct({ kind: 'play', play: h.play, pose: h.play === 'swing' ? 'sit' : null, x: h.x, z: h.z, yaw: Math.PI, dur: h.play === 'hoops' ? 5 : 6, name: h.play === 'hoops' ? 'Shooting hoops' : h.name, act: h.play === 'hoops' ? 'game' : null }); return;
    case 'fountain': if (G.spend(1)) { save.wish++; G.need('f', 6); W.fx('coin', -24, 1.6, 24, 1); W.fx('sparkle', -24, 1.5, 24, 6, 1.5); G.toast(['\u2728 You make a wish\u2026', '\u2728 Plink! A wish for good luck!', '\u2728 The fountain sparkles!'][save.wish % 3]); } return;
    case 'pond': G.need('f', 8); G.need('s', 3); W.fx('heart', -15, 0.8, 32, 4, 2); Snd.fx('tweet'); G.toast('\uD83E\uDD86 The ducks quack happily!'); return;
    default: if (G.hooks.kinds[h.kind]) G.hooks.kinds[h.kind](h);
  }
}
G.interact = interact;
function useFurn(h) {
  const u = h.use, fx = h.fx, fz = h.fz, yaw = h.yaw;
  const mine = W.cur.homeKey === GS.pid;
  switch (u) {
    case 'sleep': startAct({ kind: 'sleep', pose: 'lie', x: fx, z: fz + 0.2, yaw: yaw + Math.PI, name: 'Sleeping' }); return;
    case 'sit': case 'eat': startAct({ kind: 'sit', pose: 'sit', x: fx + Math.sin(yaw) * 0.1, z: fz + Math.cos(yaw) * 0.1, yaw, name: h.name }); if (u === 'eat') GL.UI.bag('eat'); return;
    case 'cook': GL.UI.cook(); return;
    case 'fridge': GL.UI.bag('eat'); return;
    case 'shower': case 'bath': startAct({ kind: 'shower', pose: u === 'bath' ? 'sit' : null, x: fx, z: fz, yaw: yaw + Math.PI, dur: 5, name: u === 'bath' ? 'Bubble bath' : 'Shower' }); Snd.fx('shower'); return;
    case 'tv': startAct({ kind: 'tv', pose: null, x: h.x + Math.sin(yaw) * 1.2, z: h.z + Math.cos(yaw) * 1.2, yaw: yaw + Math.PI, dur: 7, name: 'Watching TV' }); return;
    case 'game': startAct({ kind: 'game', pose: null, act: 'game', x: h.x + Math.sin(yaw) * 0.6, z: h.z + Math.cos(yaw) * 0.6, yaw: yaw + Math.PI, dur: 7, name: 'Playing games' }); return;
    case 'computer': startAct({ kind: 'computer', pose: null, act: 'work', x: h.x, z: h.z, yaw: yaw + Math.PI, dur: 6, name: 'On the computer' }); return;
    case 'read': startAct({ kind: 'read', x: h.x, z: h.z, yaw: yaw + Math.PI, dur: 6, name: 'Reading' }); return;
    case 'piano': startAct({ kind: 'piano', act: 'work', x: h.x, z: h.z, yaw: yaw + Math.PI, dur: 7, name: 'Playing piano' }); return;
    case 'wardrobe': if (mine) GL.UI.creator('wardrobe'); else G.toast('That\u2019s not your wardrobe!'); return;
    case 'petbed': if (GL.UI.pets) GL.UI.pets(); return;
    case 'look': G.need('f', 4); W.fx('sparkle', fx, 1.2, fz, 5, 1); G.toast(h.fid === 'aquarium' ? '\uD83D\uDC20 The fish wiggle hello.' : '\uD83D\uDD25 So cozy\u2026'); return;
  }
}
// activities: sit, sleep, shower, tv, games...
const ACT_FX = { hide: {}, sit: { s: 0.1, e: 0.2 }, sleep: {}, shower: { y: 14 }, tv: { f: 3.5 }, game: { f: 4.5, s: 0.5 }, computer: { f: 2.5, s: 1.5 }, read: { f: 2.5 }, piano: { f: 3.5 }, play: { f: 4, s: 0.6 } };
function startAct(a) {
  if (GS.me.act) endAct(true);
  a.t = 0; a.px = GS.me.x; a.pz = GS.me.z; GS.me.act = a; GS.goal = null;
  if (a.kind === 'sleep') { GL.UI.sleep(); }
  if (a.kind === 'play') { if (a.play === 'swing') { W.swingT = [6, 0]; a.x = -30.7; a.z = 11.6; a.pose = 'sit'; a.yaw = 0; } if (a.play === 'seesaw') W.seesawT = 6; if (a.play === 'slide') { a.slide = 1; } Snd.fx('jump'); }
}
G.startAct = startAct;
function endAct(silent) {
  const a = GS.me.act; if (!a) return; GS.me.act = null;
  const A = W.cur, f = W.freeNear(A, a.px != null ? a.px : GS.me.x, a.pz != null ? a.pz : GS.me.z, 0.36); GS.me.x = f[0]; GS.me.z = f[1];
  if (a.kind === 'sleep') GL.UI.wake();
  if (!silent && a.kind !== 'sit') G.toast('\u2714 ' + (a.name || 'Done'));
}
G.endAct = endAct;
function tickAct(dt) {
  const a = GS.me.act; if (!a) return;
  a.t += dt; const fx = ACT_FX[a.kind] || {};
  for (const k in fx) G.need(k, fx[k] * dt);
  if (a.kind === 'sleep' && Math.random() < dt * 1.5) W.fx('zzz', a.x, 1.2, a.z, 1, 0.2);
  if (a.kind === 'shower' && Math.random() < dt * 12) W.fx('drop', a.x, 2.4, a.z, 1, 0.6);
  if ((a.kind === 'tv' || a.kind === 'game' || a.kind === 'piano') && Math.random() < dt * 1.5) W.fx(a.kind === 'piano' ? 'note' : 'sparkle', a.x, 2.1, a.z, 1, 0.4);
  if (a.slide) { const k = Math.min(1, a.t / 1.6); a.x = -36.5; a.z = 12.6 + k * 3.6; a.y = 2 * (1 - k); if (k >= 1) { a.slide = 0; a.y = 0; G.need('f', 10); endAct(true); G.toast('\uD83D\uDE1D Wheee!'); if (G.onPlayDone) G.onPlayDone('slide'); return; } }
  if (a.play === 'hoops' && Math.random() < dt * 2) W.fx('star', a.x, 2.8, a.z - 1.4, 1, 0.4);
  if (a.dur && a.t >= a.dur) { const pl = a.kind === 'play' ? a.play : null; endAct(); if (pl === 'hoops') { G.need('f', 8); G.need('e', -4); } if (pl && G.onPlayDone) G.onPlayDone(pl); }
}

/* ======================================================================
   Panels + toasts
   ====================================================================== */
function openPanel(name, html) { GS.panel = name; $('pnlCard').innerHTML = html; $('pnl').classList.remove('hidden'); $('pnlCard').scrollTop = 0; GS.joyReset && GS.joyReset(); }
function closePanel() { const was = GS.panel; GS.panel = null; $('pnl').classList.add('hidden'); if (was && G.onPanelClose) G.onPanelClose(was); }
function head(title) { return '<div class="pnlHead"><h2>' + title + '</h2><button class="xbtn" data-a="close" aria-label="Close">\u2715</button></div>'; }
G.openPanel = openPanel; G.closePanel = closePanel; G.head = head;
G.toast = function (msg, bad) {
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; $('toasts').appendChild(t);
  while ($('toasts').children.length > 3) $('toasts').removeChild($('toasts').firstChild);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2800);
};
function setOnlineMsg(t, ok) { const m = $('onlineMsg'); m.textContent = t || ''; m.className = 'msg' + (ok ? ' ok' : ''); }
G.setOnlineMsg = setOnlineMsg;

/* ======================================================================
   Input
   ====================================================================== */
const keys = Object.create(null);
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
G.keys = keys; G.joy = joy;
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (!inGame()) return;
  if (GS.work && GS.work.overlay) { if (GL.Work.key) GL.Work.key(e.code); return; }
  if (GS.ovl) return;
  if (e.code === 'Escape') { if (GS.panel) closePanel(); else if (!$('phone').classList.contains('hidden')) $('phone').classList.add('hidden'); else if (GS.talk) GL.NPC.close(); else $('scrMenu').classList.toggle('hidden'); return; }
  if (e.repeat || GS.panel || GS.talk) return;
  if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); pressAct(); }
  else if (e.code === 'KeyP' || e.code === 'Tab') { e.preventDefault(); GL.UI.phone(); }
  else if (e.code === 'KeyH' && GL.Cars) GL.Cars.honk();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
(function joystick() {
  if (!IS_TOUCH) document.body.classList.add('kbd');
  const zone = $('joyzone'), base = $('joybase'), knob = $('joyknob'), R = 52;
  const home = () => { base.style.left = ''; base.style.top = ''; knob.style.transform = ''; };
  zone.addEventListener('pointerdown', (e) => {
    Snd.init(); if (joy.id !== null) return; joy.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const r = zone.getBoundingClientRect(); joy.ox = e.clientX; joy.oy = e.clientY; base.style.left = (e.clientX - r.left) + 'px'; base.style.top = (e.clientY - r.top) + 'px'; joy.x = joy.y = 0; $('joyhint').classList.add('hidden'); e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    joy.x = dx / R; joy.y = dy / R; if (Math.hypot(joy.x, joy.y) < 0.12) { joy.x = joy.y = 0; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  const up = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; home(); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
  GS.joyReset = () => { joy.id = null; joy.x = joy.y = 0; home(); };
})();
G.input = function () { // world-space move input (-1..1)
  let ix = joy.x, iz = joy.y;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1;
  const m = Math.hypot(ix, iz); if (m > 1) { ix /= m; iz /= m; } return [ix, iz, Math.min(1, m)];
};
(function taps() {
  const cv = $('c'); let down = null;
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; Snd.init(); });
  cv.addEventListener('pointerup', (e) => { if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null; if (d < 16 && dt < 600) tapAt(e.clientX, e.clientY); });
})();
function tapAt(x, y) {
  if (GS.decor && GL.UI.decorTap) { GL.UI.decorTap(x, y); return; }
  if (!freeToAct() || (GL.Cars && GL.Cars.driving())) return;
  if (GS.me.act) { endAct(); return; }
  const tn = GL.NPC && GL.NPC.hit(x, y);
  if (tn) { const d = Math.hypot(tn.x - GS.me.x, tn.z - GS.me.z); if (d <= 2.6) GL.NPC.talk(tn); else GS.goal = { x: tn.x, z: tn.z, npc: tn, best: 1e9, stuck: 0 }; return; }
  let best = null, bd = 50;
  for (const h of W.cur.hots) { const p = W.project(h.x, 0.8, h.z), d = Math.hypot(p.x - x, p.y - y); if (p.vis && d < bd) { bd = d; best = h; } }
  if (best) { const d = Math.hypot(best.x - GS.me.x, best.z - GS.me.z); if (d <= best.reach) interact(best); else GS.goal = { x: best.x, z: best.z, hot: best, best: 1e9, stuck: 0 }; return; }
  const p = W.rayPlane(x, y, 0.08); if (p) GS.goal = { x: p.x, z: p.z, best: 1e9, stuck: 0 };
}
function actTarget() {
  if (!freeToAct()) return null;
  if (G.actHook && !GS.me.act) { const t = G.actHook(); if (t) return t; }
  if (GL.Cars) { const c = GL.Cars.actTarget(); if (c) return c; }
  if (GS.me.act) return { kind: 'stop', label: GS.me.act.stopLabel || 'STOP', name: GS.me.act.name || '', x: GS.me.x, z: GS.me.z };
  const h = nearestHot(), nn = GL.NPC ? GL.NPC.nearest(GS.me.x, GS.me.z) : null;
  const dh = h ? Math.hypot(h.x - GS.me.x, h.z - GS.me.z) : 1e9;
  let pick = null, pd = 1e9;
  if (nn && nn.d < dh) { pick = nn.n; pd = nn.d; } else if (h) { pick = h; pd = dh; }
  // hysteresis: keep the current target while it's still roughly in range, unless something is clearly closer.
  // Stops the button/prompt flickering between two targets (or on/off at the edge of reach) every frame.
  const s = stickT;
  if (s && s !== pick) {
    const ds = Math.hypot(s.x - GS.me.x, s.z - GS.me.z);
    const ok = s.def ? (s.area === W.cur.id && ds < 2.4 + 0.6) : (!s.hidden && W.cur.hots.indexOf(s) >= 0 && ds <= s.reach + 0.6);
    if (ok && (!pick || pd > ds - 0.5)) { pick = s; pd = ds; }
  }
  stickT = pick;
  if (!pick) return null;
  if (pick.def) return { kind: 'npc', n: pick, label: 'TALK', name: pick.def.name, x: pick.x, z: pick.z, py: 2.4 };
  return pick;
}
let stickT = null;
function pressAct() {
  Snd.init(); const t = actTarget(); if (!t) return;
  if (t.kind === 'stop') { endAct(); return; }
  if (t.kind === 'npc') { GL.NPC.talk(t.n); return; }
  if (t.car) { GL.Cars.act(t); return; }
  if (t.custom) { t.custom(t); return; }
  interact(t);
}
G.pressAct = pressAct;
function holdBtn(el, fn) { el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }); }
holdBtn($('bAct'), pressAct);
$('bPhone').onclick = () => { Snd.init(); Snd.fx('click'); if (inGame()) GL.UI.phone(); };
$('bMute').onclick = () => { Snd.init(); toggleMute(); };
$('bEmote').onclick = () => { Snd.init(); if (freeToAct()) GL.UI.emotes(); };
$('needsBar').onclick = () => { if (freeToAct()) GL.UI.needs(); };
function toggleMute() { const m = !Snd.isMuted(); Snd.setMuted(m); save.muted = m; persist(); $('bMute').innerHTML = m ? '\uD83D\uDD07' : '\uD83D\uDD0A'; }
G.toggleMute = toggleMute;
$('bMute').innerHTML = Snd.isMuted() ? '\uD83D\uDD07' : '\uD83D\uDD0A';

/* ======================================================================
   Me + avatars
   ====================================================================== */
function updateMe(dt) {
  const m = GS.me;
  if (GL.Cars && (GL.Cars.driving() || m.ride)) { m.sp = 0; return; }
  if (m.act) { m.sp = 0; return; }
  if (G.frozen && G.frozen()) { m.sp = 0; GS.goal = null; return; }
  let [ix, iz, mag] = (GS.panel || GS.talk || GS.decor || GS.ovl || (GS.work && GS.work.overlay)) ? [0, 0, 0] : G.input();
  if (mag > 0.05) GS.goal = null;
  else if (GS.goal) {
    const g = GS.goal; if (g.npc) { g.x = g.npc.x; g.z = g.npc.z; }
    const dx = g.x - m.x, dz = g.z - m.z, d = Math.hypot(dx, dz), stop = g.npc ? 2.0 : g.hot ? Math.max(0.6, g.hot.reach - 0.3) : 0.2;
    if (d <= stop) { const h = g.hot, n = g.npc; GS.goal = null; if (n) GL.NPC.talk(n); else if (h) interact(h); }
    else { ix = dx / d; iz = dz / d; mag = 1; if (d < g.best - 0.05) { g.best = d; g.stuck = 0; } else { g.stuck += dt; if (g.stuck > 0.6) GS.goal = null; } }
  }
  const slow = (G.lowNeed() ? 0.8 : 1) * (G.speedMul ? G.speedMul() : 1), sp = (W.cur.outdoor ? 6.4 : 4.6) * mag * slow;
  if (mag > 0.05) {
    const r = W.move(W.cur, m.x, m.z, ix * sp * dt, iz * sp * dt, 0.36), moved = Math.hypot(r[0] - m.x, r[1] - m.z);
    m.x = r[0]; m.z = r[1]; m.sp = moved / Math.max(dt, 1e-3); save.stats.walk += moved;
    m.yaw += ang(Math.atan2(ix, iz) - m.yaw) * Math.min(1, dt * 12);
  } else m.sp = 0;
}
function lookKey(l) { return JSON.stringify(l); }
function ensureAvatar(pid, look, name, color, isMe) {
  let a = GS.av[pid]; const lk = lookKey(look);
  if (a && a.lk !== lk) { const keep = a; W.scene.remove(a.ch.g); a = null; GS.av[pid] = null; void keep; }
  if (!a) { const ch = MD.avatar(look); W.scene.add(ch.g); a = GS.av[pid] = { ch, lk, x: 0, z: 0, yaw: 0, init: false, tag: null, name: null }; }
  if (a.name !== name) { if (a.tag) a.ch.g.remove(a.tag); a.tag = W.textSprite(isMe ? name + ' (you)' : name, { size: 36, h: isMe ? 0.32 : 0.42, bg: 'rgba(40,20,70,.85)', border: color }); a.tag.position.set(0, 2.3, 0); a.ch.g.add(a.tag); a.name = name; }
  return a;
}
function moodTag(a, icon) {
  if (a.moodI === icon) return; if (a.mood) a.ch.g.remove(a.mood); a.mood = null; a.moodI = icon;
  if (icon) { a.mood = W.textSprite(icon, { size: 40, h: 0.42, bg: 'rgba(255,255,255,.92)', border: '#ff6b86' }); a.mood.position.y = 2.75; a.ch.g.add(a.mood); }
}
function placeAvatar(a, x, z, yaw, dt, sp, act, actYaw, ay) {
  const g = a.ch.g;
  if (act && act.pose) { g.position.set(act.x, 0.05 + (act.y || 0), act.z); g.rotation.y = act.yaw; a.ch.pose(act.pose); a.ch.anim(dt, 0, false, act.act); return; }
  a.ch.pose(null); g.position.set(x, 0.05 + (act && act.y ? act.y : 0), z); g.rotation.y = act ? act.yaw : yaw;
  a.ch.anim(dt, sp, a.waveT > 0, act ? (act.act || (act.kind === 'shower' ? 'shower' : act.kind === 'dance' ? 'dance' : null)) : (a.emote === 'dance' ? 'dance' : GS.work && a.isMe && GS.work.spray ? 'spray' : null));
  void actYaw; void ay;
}
function updateAvatars(dt) {
  const S = S_(), TC = teamColors(S), mates = S.players.filter((p) => p.pid !== GS.pid);
  const me = ensureAvatar(GS.pid, G.curLook(), myName(), TC[GS.pid] || prof.color, true); me.isMe = true;
  me.tag.visible = mates.length > 0;
  const car = GL.Cars ? GL.Cars.mySeat() : null;
  me.waveT = (me.waveT || 0) - dt; me.emote = GS.emoteT > 0 ? GS.emote : null; GS.emoteT -= dt; if (GS.emoteT > 0 && GS.emote === 'wave') me.waveT = 0.2;
  if (car) { me.ch.g.visible = true; placeAvatar(me, 0, 0, 0, dt, 0, { pose: 'drive', x: car.x, z: car.z, y: car.y, yaw: car.yaw }); }
  else { me.ch.g.visible = !(GS.me.act && GS.me.act.kind === 'hide') && !(G.meHidden && G.meHidden()); placeAvatar(me, GS.me.x, GS.me.z, GS.me.yaw, dt, GS.me.sp, GS.me.act); }
  const ii = G.injIcon ? G.injIcon() : '';
  moodTag(me, GS.me.act && GS.me.act.kind === 'sleep' ? '' : ii || (G.lowNeed() ? G.NEEDS[G.lowNeed()][1] : ''));
  const live = {}; live[GS.pid] = 1;
  mates.forEach((p) => {
    live[p.pid] = 1; const pos = GS.pos[p.pid], lk = S.looks[p.pid]; const a = ensureAvatar(p.pid, lk ? lk.av : GL.defaultLook(), p.name, TC[p.pid] || p.color, false);
    if (!pos || pos.a !== GS.me.area) { a.ch.g.visible = false; a.init = false; return; }
    if (!a.init) { a.x = pos.x; a.z = pos.z; a.yaw = pos.r; a.init = true; }
    const k = 1 - Math.exp(-dt * 12), ox = a.x, oz = a.z;
    a.x += (pos.x - a.x) * k; a.z += (pos.z - a.z) * k; a.yaw += ang(pos.r - a.yaw) * k;
    a.ch.g.visible = true; a.emote = pos.e; a.waveT = pos.e === 'wave' ? 0.2 : 0;
    const seat = GL.Cars ? GL.Cars.remoteSeat(p.pid, pos) : null;
    if (seat) placeAvatar(a, 0, 0, 0, dt, 0, { pose: 'drive', x: seat.x, z: seat.z, y: seat.y, yaw: seat.yaw });
    else if (pos.act === 'hide') a.ch.g.visible = false;
    else if (pos.act) placeAvatar(a, a.x, a.z, a.yaw, dt, 0, { pose: pos.act === 'sit' || pos.act === 'lie' ? pos.act : null, kind: pos.act, act: pos.act === 'game' ? 'game' : pos.act === 'work' ? 'work' : null, x: pos.ax, z: pos.az, yaw: pos.ay });
    else placeAvatar(a, a.x, a.z, a.yaw, dt, pos.m ? 4 : Math.hypot(a.x - ox, a.z - oz) / Math.max(dt, 1e-3));
  });
  for (const k in GS.av) if (!live[k] && GS.av[k]) { W.scene.remove(GS.av[k].ch.g); delete GS.av[k]; }
}
function teamColors(S) { const out = {}, used = {}; S.players.forEach((p) => { let c = GN.cleanColor(p.pid === GS.pid ? prof.color : p.color); if (used[c]) c = GN.COLORS.find((q) => !used[q]) || c; used[c] = 1; out[p.pid] = c; }); return out; }
G.teamColors = () => teamColors(S_());
function friendNear(r) { const S = S_(); if (!S) return false; return S.players.some((p) => { if (p.pid === GS.pid) return false; const q = GS.pos[p.pid]; return q && q.a === GS.me.area && Math.hypot(q.x - GS.me.x, q.z - GS.me.z) < (r || 6); }); }
G.friendNear = friendNear;

/* ======================================================================
   Clock
   ====================================================================== */
function tickClock(dt) {
  const S = S_(); if (!S) return;
  if (GS.role !== 'client') {
    const before = S.clock; S.clock += dt; // 1 real second = 1 game minute
    if (S.clock >= 1440) { S.clock -= 1440; S.day++; newDay(); }
    if (Math.floor(before / 10) !== Math.floor(S.clock / 10)) touch();
  } else S.clock = (S.clock + dt) % 1440;
}
function newDay() {
  if (save.rent && save.house === 'bungalow' && save.rent !== 'own') { if (save.money >= GL.HOUSES.bungalow.rent) { save.money -= GL.HOUSES.bungalow.rent; G.toast('\uD83C\uDFE0 Rent paid: ' + GL.money(GL.HOUSES.bungalow.rent)); } else G.toast('\uD83C\uDFE0 Rent is due! The landlord will wait a bit.', true); }
  if (save.savings > 0) { const i = Math.min(200, Math.round(save.savings * 0.01)); save.savings += i; if (i) G.toast('\uD83C\uDFE6 Savings interest: +' + GL.money(i)); }
  if (GL.NPC && GL.NPC.newDay) GL.NPC.newDay();
  G.hooks.newDay.forEach((fn) => fn());
  persist();
}
G.skipTo = function (min) { const S = S_(); if (!S || GS.role === 'client') return; if (min <= S.clock) { S.day++; newDay(); } S.clock = min; touch(); };
G.tutNext = function (step) { if (save.tut !== step) return; save.tut++; persist(); Snd.fx('sparkle'); if (save.tut === 5) { G.addMoney(100); G.toast('\uD83C\uDF89 Tutorial complete! +$100. Enjoy Grok Life!'); } };

/* ======================================================================
   HUD
   ====================================================================== */
let promptKey = '', hudT = 0;
function updateHUD(dt) {
  GS.moneyFlash = Math.max(0, (GS.moneyFlash || 0) - dt * 2);
  $('moneyN').textContent = GL.money(save.money); $('moneyPill').style.transform = GS.moneyFlash > 0 ? 'scale(' + (1 + GS.moneyFlash * 0.15) + ')' : '';
  $('clockN').textContent = (W.isNight(G.clock()) ? '\uD83C\uDF19 ' : '\u2600\uFE0F ') + G.timeStr() + ' \u00b7 Day ' + G.day();
  const t = actTarget(), act = $('bAct'), pr = $('prompt');
  const label = t ? t.label : (GL.Cars && GL.Cars.driving() ? 'EXIT' : '\u2022');
  if ($('actT').textContent !== label) $('actT').textContent = label;
  const cls = t ? (t.kind === 'door' || t.kind === 'exit' || t.kind === 'apt' || t.kind === 'house' ? 'door' : t.kind === 'npc' ? 'talk' : '') : 'dim';
  if (act.className !== cls) act.className = cls;
  if (t && t.name && !(GL.Cars && GL.Cars.driving())) { const p = W.project(t.x, t.py || 1.9, t.z), k = (t.id || t.kind) + label + t.name; if (k !== promptKey) { promptKey = k; pr.innerHTML = (t.kind === 'npc' ? '\uD83D\uDCAC ' : '') + '<b>' + esc(label) + '</b> ' + esc(t.name); } const l = Math.round(p.x) + 'px', tp = Math.round(p.y) + 'px'; if (pr.style.left !== l) pr.style.left = l; if (pr.style.top !== tp) pr.style.top = tp; setHidden(pr, false); }
  else { setHidden(pr, true); promptKey = ''; }
  setHidden($('bEmote'), !(G.online() && friendNear(8)));
  hudT -= dt; if (hudT <= 0) {
    hudT = 0.3;
    const hp = Math.round(save.hp), hpc = hp < 30 ? '#ef4444' : hp < 60 ? '#f59e0b' : '#f43f5e';
    const nb = '<span class="nd hp' + (hp < 30 ? ' low' : '') + '" id="hpBar"><i>\u2764\uFE0F<small>' + hp + '</small></i><em><b style="width:' + hp + '%;background:' + hpc + '"></b></em></span>' + NEED_KEYS.map((k) => { const v = save.needs[k]; return '<span class="nd' + (v < 25 ? ' low' : '') + '"><i>' + G.NEEDS[k][1] + '</i><em><b style="width:' + Math.round(v) + '%;background:' + (v < 25 ? '#ef4444' : v < 50 ? '#f59e0b' : '#22c55e') + '"></b></em></span>'; }).join('') + '<span class="moodF">' + G.moodFace() + '</span>';
    if (nb !== GS.nbKey) { GS.nbKey = nb; $('needsBar').innerHTML = nb; }
    const st = G.statusHTML ? G.statusHTML() : ''; if (st !== GS.stKey) { GS.stKey = st; $('status').innerHTML = st; document.body.classList.toggle('hasStatus', !!st); }
    const A = W.cur; $('areaN').textContent = A.zone ? A.zone(GS.me.x, GS.me.z) : (A.label || '');
    const online = G.online() && GS.room, S = S_(); setHidden($('roomPill'), !online); if (online) $('roomN').textContent = GS.room.code + ' \u00b7 ' + S.players.length + '/3';
    const TC = teamColors(S); $('mates').innerHTML = S.players.filter((p) => p.pid !== GS.pid).map((p) => '<div class="mate" style="--c:' + esc(TC[p.pid] || p.color) + '">' + esc(p.name) + ' \u00b7 ' + esc(GS.pos[p.pid] ? areaLabel(GS.pos[p.pid]) : '\u2026') + '</div>').join('');
    if (GL.UI && GL.UI.tutHud) GL.UI.tutHud();
  }
}
function areaLabel(q) { const A = W.areas[q.a]; if (!A) return q.a.indexOf('h_') === 0 ? 'at a house' : '\u2026'; return A.zone ? A.zone(q.x, q.z) : A.label; }
G.areaLabel = areaLabel;
// screen-edge guide arrow toward a town spot
G.guide = null;
function updateGuide() {
  const el = $('guide'), g = G.guide;
  if (!g || !inGame() || W.cur.id !== (g.area || 'town')) { setHidden(el, true); return; }
  const p = W.project(g.x, 1, g.z), m = 50, w = innerWidth, h = innerHeight;
  const on = p.vis && p.x > m && p.x < w - m && p.y > 90 && p.y < h - 140;
  let x = p.x, y = p.y; if (!p.vis) { x = w - x; y = h - y; }
  const cx = w / 2, cy = h / 2, dx = x - cx, dy = y - cy, a = Math.atan2(dy, dx);
  if (!on) { const s = Math.min((w / 2 - m) / Math.abs(dx || 1e-3), (h / 2 - 120) / Math.abs(dy || 1e-3)); x = cx + dx * s; y = cy + dy * s; }
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.querySelector('i').style.transform = on ? 'rotate(90deg)' : 'rotate(' + a + 'rad)'; const gb = el.querySelector('b'), gl = g.label || ''; if (gb.textContent !== gl) gb.textContent = gl;
  setHidden(el, false);
}

/* ======================================================================
   Loop
   ====================================================================== */
let last = performance.now(), titleT = 0, slowT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const S = S_();
  renderScreens();
  W.tickFx(dt);
  if (inGame()) {
    processEvents(); tickClock(dt); decayNeeds(dt); tickAct(dt);
    if (GS.role !== 'client') assignHomes(); applyHomes();
    updateMe(dt);
    if (GL.Cars) GL.Cars.tick(dt);
    if (GL.NPC) GL.NPC.tick(dt);
    if (GL.Pets) GL.Pets.tick(dt);
    if (GL.Work) GL.Work.tick(dt);
    for (const fn of G.hooks.tick) fn(dt);
    if (GS.role !== 'client') for (const fn of G.hooks.hostTick) fn(dt, S);
    updateAvatars(dt); updateHUD(dt); updateGuide(); tickDaily(dt);
    W.setClock(G.clock()); W.updateSigns(G.clock());
    const fp = (G.camHook && G.camHook()) || (GL.Cars && GL.Cars.camTarget()); W.updateCamera(fp ? fp[0] : GS.me.x, fp ? fp[1] : GS.me.z, dt);
    slowT -= dt; if (slowT <= 0) { slowT = 2; checkGoals(); syncMe(); }
    if (now - saveT > 6000) persist(now);
  } else {
    titleT += dt;
    if (!W.cur || W.cur.id !== 'town') W.setArea('town');
    W.setClock(600); W.camZoom = 1.4;
    W.updateCamera(Math.sin(titleT * 0.1) * 30, Math.cos(titleT * 0.08) * 26, dt);
    if (GL.NPC) GL.NPC.tick(dt);
  }
  netTick(now);
  W.render();
}
// Only touch the DOM when visibility actually changes, and always with a real boolean.
// (classList.toggle(c, undefined) TOGGLES instead of setting, which made the whole HUD blink every frame
// for returning players, where GS.creating was never set.)
function setHidden(el, hide) { hide = !!hide; if (el.classList.contains('hidden') !== hide) el.classList.toggle('hidden', hide); return hide; }
G.setHidden = setHidden;
let hudHidden = null;
function renderScreens() {
  const ui = GS.ui;
  setHidden($('scrTitle'), ui !== 'title');
  setHidden($('scrOnline'), ui !== 'online');
  const hide = ui !== 'game' || !!(GS.work && GS.work.overlay) || !!GS.ovl || !!GS.creating;
  document.body.classList.toggle('inOvl', !!GS.ovl || !!(GS.work && GS.work.overlay));
  if (hide !== hudHidden) { hudHidden = hide; setHidden($('hud'), hide); if (hide && GS.joyReset) GS.joyReset(); }
}

/* ======================================================================
   Title
   ====================================================================== */
(function titleUI() {
  const ni = $('nameIn'); ni.value = prof.name;
  ni.addEventListener('input', () => { prof.name = ni.value.trim() ? GN.cleanName(ni.value) : ''; save.name = prof.name; persist(); });
  const row = $('colorRow');
  const draw = () => { row.innerHTML = GN.COLORS.map((c) => '<button type="button" data-c="' + c + '" style="background:' + c + '" class="' + (c === prof.color ? 'on' : '') + '" aria-label="color"></button>').join(''); };
  draw(); row.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; prof.color = b.dataset.c; save.color = prof.color; persist(); draw(); Snd.init(); Snd.fx('click'); });
  const need = () => { if (!prof.name) { prof.name = 'Lizeth'; ni.value = prof.name; save.name = prof.name; persist(); } GN.saveProfile(prof.name, prof.color); };
  const then = (fn) => { if (!save.created) { GL.UI.creator('new', fn); } else fn(); };
  $('bSolo').onclick = () => { Snd.init(); need(); then(startSolo); };
  $('bOnline').onclick = () => { Snd.init(); need(); then(() => { GS.ui = 'online'; setOnlineMsg(''); }); };
  $('bOnlineBack').onclick = () => { leaveSession(); GS.ui = 'title'; };
  $('bHost').onclick = () => { Snd.init(); need(); hostOnline(); };
  const ci = $('codeIn'); ci.addEventListener('input', () => { ci.value = GN.normalizeCode(ci.value); });
  ci.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('bJoin').click(); });
  $('bJoin').onclick = () => { Snd.init(); need(); joinOnline(ci.value); };
  $('bResume').onclick = () => $('scrMenu').classList.add('hidden');
  $('bQuit').onclick = () => { persist(); leaveSession(); };
  $('arcadeLink').href = GN.hubUrl();
})();

/* ---------------- boot ---------------- */
G.boot = function () {
  W.init($('c')); W.build(); W.setArea('town');
  if (GL.NPC) GL.NPC.init(); if (GL.UI && GL.UI.init) GL.UI.init();
  addEventListener('resize', () => W.resize());
  addEventListener('pagehide', () => persist());
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  requestAnimationFrame(frame);
  (function fromHub() {
    const prm = GN.params(); if (!prm) return;
    GS.fromHub = true; prof.name = prm.name; prof.color = prm.color; $('nameIn').value = prm.name;
    const go = () => { if (prm.mode === 'host') hostOnline(prm.code); else { $('codeIn').value = prm.code; joinOnline(prm.code); } };
    if (!save.created) GL.UI.creator('new', go); else go();
  })();
};
G.startSolo = startSolo; G.hostOnline = hostOnline; G.joinOnline = joinOnline; G.leaveSession = leaveSession;

/* test hooks */
window.__gl = {
  G, GS, W, GL, save: () => save, state: () => GS.S,
  tp(x, z) { GS.me.x = x; GS.me.z = z; GS.goal = null; },
  go(area, at) { closePanel(); travel(area, true, at); },
  hot(id) { const h = W.cur.hots.find((q) => q.id === id); if (!h) return 'nohot'; const f = W.freeNear(W.cur, h.x, h.z, 0.36); GS.me.x = f[0]; GS.me.z = f[1]; interact(h); return GS.panel || 'none'; },
  panel: () => GS.panel,
  net: () => ({ role: GS.role, code: GS.room && GS.room.code, players: GS.S ? GS.S.players.map((p) => p.name) : [], area: GS.me.area, pos: GS.pos, assign: GS.S && GS.S.assign })
};
})();
