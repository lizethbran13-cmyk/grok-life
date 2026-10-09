/* Grok Life - cars: your car (easy phone driving), work vehicles, friends riding along, simple NPC traffic */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd;
const GS = G.GS, sv = () => G.save(), ang = G.ang, clamp = GL.clamp;
const C = GL.Cars = {};
let my = null, work = null, remote = {}, traffic = [];
function spec(type) { return GL.CARS[type] || GL.WORK_CARS[type] || { top: 16, acc: 8, seats: 2 }; }
function mk(type, col, x, z, yaw) { const m = MD.car(type, col); W.areas.town.g.add(m.g); const o = { type, col, m, x, z, yaw, v: 0, drive: false }; place(o); return o; }
function place(o) { o.m.g.position.set(o.x, 0.04, o.z); o.m.g.rotation.y = o.yaw; }
function kill(o) { if (o && o.m) W.areas.town.g.remove(o.m.g); }
function activeCar() { const s = sv(); return s.cars.find((c) => c.id === s.car) || s.cars[0] || null; }
C.reset = function () { kill(my); my = null; kill(work); work = null; for (const k in remote) kill(remote[k]); remote = {}; traffic.forEach(kill); traffic = []; };
C.respawn = function (keepPos) { const s = sv(), old = my; const c = activeCar(); if (!c) { kill(my); my = null; return; } let x, z, yaw; if (keepPos && old) { x = old.x; z = old.z; yaw = old.yaw; } else if (s.carPos) { x = s.carPos[0]; z = s.carPos[1]; yaw = s.carPos[2]; } else { const p = G.homeSpot().park; x = p[0]; z = p[1]; yaw = p[2]; } const drv = old && old.drive; kill(old); my = mk(c.type, c.col, x, z, yaw); my.id = c.id; my.drive = drv; };
C.spawnAt = function (x, z, yaw) { const s = sv(); s.carPos = [x, z, yaw]; C.respawn(); G.persist(); };
C.parkHome = function () { const s = sv(); if (my && my.drive) return; s.carPos = null; C.respawn(); };
C.homesChanged = function () { if (!sv().carPos && !(my && my.drive)) C.respawn(); };
C.bring = function () { if (!activeCar()) { G.toast('You don\u2019t have a car yet!'); return; } if (G.carBlock && G.carBlock('bring')) return; if (GS.me.area !== 'town') { G.toast('Step outside first, then call your car.'); return; } const yaw = GS.me.yaw; let p = W.freeNear(W.areas.town, GS.me.x + Math.sin(yaw) * 3, GS.me.z + Math.cos(yaw) * 3, 1.3); C.spawnAt(p[0], p[1], yaw); Snd.fx('honk'); G.toast('\uD83D\uDE97 Your car is here!'); };
C.driving = () => !!((my && my.drive) || (work && work.drive));
function cur() { return work && work.drive ? work : my && my.drive ? my : null; }
C.cur = cur;
C.honk = () => { if (C.driving()) Snd.fx(work ? 'siren' : 'honk'); };
// work vehicles (fire truck / police car)
C.workCar = function (type, x, z, yaw) { kill(work); if (my) my.drive = false; work = mk(type, null, x, z, yaw); work.drive = true; work.work = true; GS.me.act = null; return work; };
C.endWork = function (x, z) { if (!work) return; kill(work); work = null; if (x != null) { const f = W.freeNear(W.areas.town, x, z, 0.4); GS.me.x = f[0]; GS.me.z = f[1]; } };
C.workObj = () => work;
// helpers for feature modules (ambulance, police, animal control van)
C.makeCar = (type, col, x, z, yaw) => mk(type, col, x, z, yaw);
C.placeCar = (o) => place(o);
C.killCar = (o) => kill(o);
C.myCar = () => my;
C.remoteCars = () => remote;
C.activeCar = activeCar;
function seatPos(o, i) { const s = o.m.seats[Math.min(i, o.m.seats.length - 1)], c = Math.cos(o.yaw), sn = Math.sin(o.yaw); return { x: o.x + s[0] * c + s[2] * sn, z: o.z - s[0] * sn + s[2] * c, y: s[1] - 0.45, yaw: o.yaw }; }
C.mySeat = function () { const o = cur(); if (o) return seatPos(o, 0); if (GS.me.ride) { const r = remote[GS.me.ride]; if (r) { const others = Object.keys(GS.pos).filter((k) => GS.pos[k].rd === GS.me.ride && k < GS.pid).length; return seatPos(r, 1 + others); } } return null; };
C.remoteSeat = function (pid, pos) { if (pos.c && pos.c[5]) { const r = remote[pid]; if (r) return seatPos(r, 0); } if (pos.rd) { const r = pos.rd === GS.pid ? cur() : remote[pos.rd]; if (r) { const n = Object.keys(GS.pos).filter((k) => GS.pos[k].rd === pos.rd && k < pid).length + (pos.rd !== GS.pid && GS.me.ride === pos.rd && GS.pid < pid ? 1 : 0); return seatPos(r, 1 + n); } } return null; };
C.netInfo = function () { const o = cur() || (GS.me.area === 'town' ? my : null); if (!o) return null; return [o.type, o.col || '#ef4444', +o.x.toFixed(2), +o.z.toFixed(2), +o.yaw.toFixed(2), o.drive ? 1 : 0, 0, '']; };
C.camTarget = function () { const o = cur() || (GS.me.ride && remote[GS.me.ride]); W.camZoom = o ? 1.35 : 1; if (o) { const v = o.v || 0; W.camAhead = [Math.sin(o.yaw) * clamp(v * 0.35, -3, 5), Math.cos(o.yaw) * clamp(v * 0.35, -3, 5)]; return [o.x, o.z]; } W.camAhead = [0, 0]; return null; };
// ACT button
C.actTarget = function () {
  if (GS.me.area !== 'town') return null;
  const o = cur(); if (o) return { car: 1, kind: 'exit', label: work ? 'HONK' : 'EXIT', name: '', x: o.x, z: o.z };
  if (GS.me.ride) return { car: 1, kind: 'unride', label: 'GET OUT', name: '', x: GS.me.x, z: GS.me.z };
  if (GS.me.act) return null;
  if (my && Math.hypot(my.x - GS.me.x, my.z - GS.me.z) < 4) return { car: 1, kind: 'drive', label: 'DRIVE', name: GL.CARS[my.type].name, x: my.x, z: my.z, py: 2 };
  for (const pid in remote) { const r = remote[pid], pos = GS.pos[pid]; if (pos && pos.c && pos.c[5] && Math.hypot(r.x - GS.me.x, r.z - GS.me.z) < 3.6) { const seats = r.m.seats.length, used = 1 + Object.keys(GS.pos).filter((k) => GS.pos[k].rd === pid).length; if (used < seats) return { car: 1, kind: 'ride', pid, label: 'RIDE', name: 'with ' + G.playerInfo(pid).name, x: r.x, z: r.z, py: 2 }; } }
  return null;
};
C.act = function (t) {
  if (t.kind === 'drive') { if (G.carBlock && G.carBlock('drive')) return; my.drive = true; my.v = 0; GS.goal = null; Snd.fx('engine'); G.toast('\uD83D\uDE97 Drag the stick where you want to go!'); }
  else if (t.kind === 'exit') { if (work) { Snd.fx('siren'); return; } const o = my; o.drive = false; o.v = 0; const c = Math.cos(o.yaw), s = Math.sin(o.yaw); const f = W.freeNear(W.areas.town, o.x + c * 1.8, o.z - s * 1.8, 0.4); GS.me.x = f[0]; GS.me.z = f[1]; sv().carPos = [+o.x.toFixed(2), +o.z.toFixed(2), +o.yaw.toFixed(2)]; G.persist(); Snd.fx('door'); }
  else if (t.kind === 'ride') { GS.me.ride = t.pid; GS.goal = null; Snd.fx('door'); G.toast('\uD83D\uDE97 Riding with ' + G.playerInfo(t.pid).name + '!'); G.need('s', 5); }
  else if (t.kind === 'unride') unride();
};
function unride() { const r = remote[GS.me.ride]; GS.me.ride = null; if (r) { const f = W.freeNear(W.areas.town, r.x - Math.cos(r.yaw) * 1.8, r.z + Math.sin(r.yaw) * 1.8, 0.4); GS.me.x = f[0]; GS.me.z = f[1]; } Snd.fx('door'); }
// physics: easy mode = stick is the direction to go; car turns + drives itself there. Let go to brake.
function drive(o, dt) {
  const sp = spec(o.type), inp = G.input(); let mag = inp[2], thr = 0, st = 0;
  const kb = G.keys, useKb = kb.KeyW || kb.KeyS || kb.ArrowUp || kb.ArrowDown;
  if (GS.panel || GS.talk || (G.carDead && G.carDead(o))) mag = 0;
  if (useKb && !(G.carDead && G.carDead(o))) { thr = (kb.KeyW || kb.ArrowUp ? 1 : 0) - (kb.KeyS || kb.ArrowDown ? 1 : 0); st = (kb.KeyA || kb.ArrowLeft ? 1 : 0) - (kb.KeyD || kb.ArrowRight ? 1 : 0); if (o.v < -0.5) st = -st; }
  else if (mag > 0.15) {
    const want = Math.atan2(inp[0], inp[1]), d = ang(want - o.yaw);
    if (Math.abs(d) < 2.2 || o.v > 2) { thr = mag; st = clamp(d * 1.8, -1, 1); if (Math.abs(d) > 1.2) thr *= 0.55; }
    else { thr = -mag * 0.7; st = -clamp(ang(want - o.yaw - Math.PI) * 1.8, -1, 1); }
  }
  const grip = G.carGrip ? G.carGrip(o) : 1; // wet / icy roads: slower braking + a little slide
  if (thr > 0) o.v += (o.v < 0 ? 18 * grip : sp.acc) * thr * dt; else if (thr < 0) o.v += (o.v > 0 ? 18 * grip : 6) * thr * dt; else o.v -= Math.sign(o.v) * Math.min(Math.abs(o.v), 12 * grip * dt);
  if (grip < 1 && Math.abs(o.v) > 7 && Math.abs(st) > 0.3) o.yaw += (Math.random() - 0.5) * (1 - grip) * 1.6 * dt;
  o.v = clamp(o.v, -6, sp.top);
  o.yaw += st * 2.0 * clamp(o.v / 5, -1, 1) * dt;
  const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), nx = o.x + fx * o.v * dt, nz = o.z + fz * o.v * dt;
  if (blocked(o, nx, nz)) { const hv = Math.abs(o.v); if (hv > 4) Snd.fx('bump'); o.v = -o.v * 0.25; if (hv > 4 && G.onCrash) G.onCrash(hv, !!o.work); }
  else { const d = Math.hypot(nx - o.x, nz - o.z); o.x = nx; o.z = nz; sv().stats.drive += d; if (G.onDriven) G.onDriven(o, d); }
  o.m.wheels.forEach((w) => { w.children[0].rotation.x += o.v * dt / o.m.wr; });
  GS.me.x = o.x; GS.me.z = o.z; GS.me.yaw = o.yaw;
}
function blocked(o, x, z) {
  const A = W.areas.town, L = o.m.L * 0.36, fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), r = o.m.Wd * 0.45;
  for (const k of [-1, 0, 1]) if (!W.isFree(A, x + fx * L * k, z + fz * L * k, r)) return true;
  for (const t of traffic) if (Math.hypot(t.x - x, t.z - z) < 3.2 && Math.hypot(t.x - o.x, t.z - o.z) > Math.hypot(t.x - x, t.z - z)) return true;
  return false;
}
// NPC traffic: cars loop the ring road (right lane), stop at every intersection for a moment and wait for anything in front.
const RING = [[-46, -46], [46, -46], [46, 46], [-46, 46]];
function trafficInit() {
  const cols = ['#f97316', '#22c55e', '#e11d48', '#0ea5e9', '#a855f7'];
  for (let i = 0; i < 5; i++) { const seg = i % 4, k = (i * 0.37) % 1; const a = RING[seg], b = RING[(seg + 1) % 4]; const o = mk('sedan', cols[i], a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 0); o.seg = seg; o.v = 0; o.wait = 0; o.lastStop = -1; traffic.push(o); }
}
function trafficTick(dt) {
  if (!traffic.length) trafficInit();
  const blockers = []; const me = cur(); if (me) blockers.push([me.x, me.z]); if (GS.me.area === 'town' && !me && !GS.me.ride && !(G.meHidden && G.meHidden())) blockers.push([GS.me.x, GS.me.z, null, 1]);
  for (const k in remote) blockers.push([remote[k].x, remote[k].z]);
  for (const k in GS.pos) { const p = GS.pos[k]; if (p.a === 'town' && !(p.c && p.c[5]) && !p.rd) blockers.push([p.x, p.z, null, 1]); }
  if (GL.NPC) GL.NPC.list.forEach((n) => { if (n.inTown) blockers.push([n.x, n.z]); });
  if (G.extraBlockers) G.extraBlockers(blockers);
  traffic.forEach((o) => blockers.push([o.x, o.z, o]));
  traffic.forEach((o) => {
    const b = RING[(o.seg + 1) % 4], dx = b[0] - o.x, dz = b[1] - o.z, d = Math.hypot(dx, dz);
    if (d < 0.5) { o.seg = (o.seg + 1) % 4; return; }
    const fx = dx / d, fz = dz / d; o.yaw += ang(Math.atan2(fx, fz) - o.yaw) * Math.min(1, dt * 6);
    let want = o.phone > 0 ? (o.hurry ? 10.5 : 8.5) : 9;
    // stop line before each intersection along the ring (corners and middles)
    const along = Math.abs(fx) > 0.5 ? o.x : o.z, dir = Math.abs(fx) > 0.5 ? Math.sign(fx) : Math.sign(fz);
    for (const c of [-48, 0, 48]) { const gap = (c - along) * dir; if (gap > 6.5 && gap < 9.5 && o.lastStop !== c + ',' + o.seg) { want = 0; o.wait += dt; if (o.wait > 0.9) { o.lastStop = c + ',' + o.seg; o.wait = 0; } } }
    for (const q of blockers) { if (q[2] === o) continue; if (q[3] && o.phone > 0) continue; const bx = q[0] - o.x, bz = q[1] - o.z, ahead = bx * fx + bz * fz, side = Math.abs(bx * fz - bz * fx); if (ahead > 0 && ahead < (q[3] ? 6 : 7.5) && side < (q[3] ? 1.6 : 2.2)) { want = 0; o.stuckT = (o.stuckT || 0) + dt; if (o.stuckT > 6 && q[2]) want = 4; break; } }
    if (want > 0) o.stuckT = 0;
    o.v += clamp(want - o.v, -14 * dt, 5 * dt); o.x += Math.sin(o.yaw) * o.v * dt; o.z += Math.cos(o.yaw) * o.v * dt;
    place(o); o.m.wheels.forEach((w) => { w.children[0].rotation.x += o.v * dt / o.m.wr; });
    if (G.trafficHook) G.trafficHook(o, dt);
  });
}
C.traffic = () => traffic;
C.tick = function (dt) {
  const s = sv();
  if (activeCar() && (!my || my.id !== activeCar().id)) C.respawn();
  if (!activeCar() && my) { kill(my); my = null; }
  const o = cur(); if (o) { drive(o, dt); place(o); }
  if (my && my !== o) place(my);
  if (my) my.m.g.visible = true;
  // remote cars
  const live = {};
  for (const pid in GS.pos) {
    const p = GS.pos[pid]; if (!p.c || p.a !== 'town' && !p.c[5]) continue; live[pid] = 1;
    let r = remote[pid]; if (r && (r.type !== p.c[0] || r.col !== p.c[1])) { kill(r); r = null; }
    if (!r) { r = remote[pid] = mk(p.c[0], p.c[1], p.c[2], p.c[3], p.c[4]); }
    const k = 1 - Math.exp(-dt * 10), ox = r.x, oz = r.z; r.x += (p.c[2] - r.x) * k; r.z += (p.c[3] - r.z) * k; r.yaw += ang(p.c[4] - r.yaw) * k; r.v = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 1e-3); place(r);
  }
  for (const k in remote) if (!live[k]) { kill(remote[k]); delete remote[k]; }
  if (GS.me.ride) { const r = remote[GS.me.ride], p = GS.pos[GS.me.ride]; if (!r || !p || !p.c || !p.c[5]) { if (r) unride(); else GS.me.ride = null; G.toast('Your ride ended.'); } else { GS.me.x = r.x; GS.me.z = r.z; GS.me.area = 'town'; } }
  if (W.cur && W.cur.id === 'town') trafficTick(dt);
  if (work && work.m.siren) work.m.siren.forEach((sr, i) => { sr.visible = Math.floor(W.time * 4 + i) % 2 === 0; });
  void s;
};
})();
