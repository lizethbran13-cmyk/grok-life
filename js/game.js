/* Grok Life - core: save, needs, money, clock, co-op netcode (host-authoritative), travel, input, avatars, HUD, loop */
(function () {
'use strict';
const GL = window.GL, GN = window.GrokNet, W = GL.W, MD = GL.MD, Snd = GL.Snd, T = window.THREE;
const $ = (id) => document.getElementById(id);
const esc = GN.esc, clamp = GL.clamp, TAU = Math.PI * 2;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
const G = GL.G = {};
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
    stats: { shifts: 0, drive: 0, houses: 0, hangs: 0, tricks: 0, cooked: 0, earned: 0, clothes: 0, online: 0, gifts: 0, perfect: 0, walk: 0 },
    goals: {}, daily: { last: '', streak: 0, best: 0 }, workDay: 0, tut: 0, visited: {}, drive: 'easy', autogas: true, lastT: Date.now(), wish: 0 };
}
let save = freshSave();
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (s && s.v === 1) { const f = freshSave(); save = Object.assign(f, s, { stats: Object.assign(f.stats, s.stats || {}), needs: Object.assign(f.needs, s.needs || {}), look: Object.assign(f.look, s.look || {}), daily: Object.assign(f.daily, s.daily || {}) }); }
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
function newSession() { return { v: 1, players: [], looks: {}, homes: {}, assign: {}, clock: save.clock || 480, day: save.day || 1, ev: [], evId: 0 }; }
function touch() { GS.dirty = true; }
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
  setTimeout(() => { if (GL.UI && GS.inWorld) GL.UI.daily(save.daily.streak, n); }, 900);
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
    else if (d.t === 'pp' && d.p) { for (const k in d.p) if (k !== GS.pid) GS.pos[k] = cleanPos(d.p[k]); for (const k in GS.pos) if (!d.p[k]) delete GS.pos[k]; }
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
  GS.evSeen = 0; if (GL.Cars) GL.Cars.reset();
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
  Snd.music(false); lotKey = '';
  if (!silent) GS.ui = 'title';
}
function netTick(now) {
  if (!GS.room || !GS.S) return;
  if (GS.role === 'host') {
    if ((GS.dirty && now - GS.lastSend > 80) || now - GS.lastSend > 1000) { GS.room.broadcast({ t: 'st', s: GS.S }); GS.lastSend = now; GS.dirty = false; }
    if (now - GS.lastPos > 100) { GS.lastPos = now; const p = Object.assign({}, GS.pos); p[GS.pid] = myPos(); GS.room.broadcast({ t: 'pp', p }); }
  } else if (GS.role === 'client') {
    const p = myPos(), key = JSON.stringify(p);
    if (now - GS.lastPos > 100 && (key !== GS.lastPosSent || now - GS.lastPos > 900)) { GS.lastPos = now; GS.lastPosSent = key; GS.room.send(Object.assign({ t: 'pos' }, p)); }
  }
}
function myPos() {
  const m = GS.me, a = m.act, c = GL.Cars ? GL.Cars.netInfo() : null;
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
  checkDaily();
  if (save.tut === 0) { save.tut = 1; persist(); }
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
function freeToAct() { return inGame() && !GS.panel && !GS.talk && !GS.decor && !(GS.work && GS.work.overlay) && $('scrMenu').classList.contains('hidden') && $('phone').classList.contains('hidden'); }
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
    case 'play': startAct({ kind: 'play', play: h.play, pose: h.play === 'swing' ? 'sit' : null, x: h.x, z: h.z, yaw: Math.PI, dur: 6, name: h.name }); return;
    case 'fountain': if (G.spend(1)) { save.wish++; G.need('f', 6); W.fx('coin', -24, 1.6, 24, 1); W.fx('sparkle', -24, 1.5, 24, 6, 1.5); G.toast(['\u2728 You make a wish\u2026', '\u2728 Plink! A wish for good luck!', '\u2728 The fountain sparkles!'][save.wish % 3]); } return;
    case 'pond': G.need('f', 8); G.need('s', 3); W.fx('heart', -15, 0.8, 32, 4, 2); Snd.fx('tweet'); G.toast('\uD83E\uDD86 The ducks quack happily!'); return;
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
const ACT_FX = { sit: { s: 0.1, e: 0.2 }, sleep: {}, shower: { y: 14 }, tv: { f: 3.5 }, game: { f: 4.5, s: 0.5 }, computer: { f: 2.5, s: 1.5 }, read: { f: 2.5 }, piano: { f: 3.5 }, play: { f: 4, s: 0.6 } };
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
  if (a.slide) { const k = Math.min(1, a.t / 1.6); a.x = -36.5; a.z = 12.6 + k * 3.6; a.y = 2 * (1 - k); if (k >= 1) { a.slide = 0; a.y = 0; G.need('f', 10); endAct(true); G.toast('\uD83D\uDE1D Wheee!'); return; } }
  if (a.dur && a.t >= a.dur) endAct();
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
