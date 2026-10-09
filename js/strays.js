/* Grok Life - Animal Control: missing pets, stray animals, the Animal Shelter (adopt rescues / lost & found),
   the Animal Control van and the Animal Control career (drive the van, net strays, drop them at the shelter) */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd, UI = GL.UI;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money, clamp = GL.clamp;
const SY = GL.Strays = {};
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const SPS = ['schnauzer', 'retriever', 'corgi', 'pug', 'bulldog', 'tabby', 'siamese'];
const NAMES = ['Scruffy', 'Muddy', 'Patches', 'Biscuit', 'Noodle', 'Pickles', 'Sprout', 'Mittens', 'Waffles', 'Ziggy', 'Pepper', 'Tater', 'Rascal', 'Peanut'];
const SHELTER_CAP = 6, ADOPT_FEE = 25, SHIFT_SECS = 90, CARRY = 3;
G.statusParts = G.statusParts || [];
const shelterDoor = () => W.bld('shelter').out;
const park = () => W.shelterPark || [shelterDoor()[0] + 4, shelterDoor()[1] + 3, Math.PI / 2];
// wander spots for strays: park, alleys, corners (snapped to free ground)
const SPOTS = [[-24, 6], [-30, 30], [-14, 36], [-36, 20], [10, 30], [24, 10], [-10, -24], [30, -30], [-30, -30], [-40, 4], [40, 40], [-40, -40], [12, -36], [36, 12], [-6, 44], [52, 0], [-52, 14], [0, -56]];
let strays = [], nextId = 1, spawnT = 4, acv = null, acvT = 40, view = {}, vanView = null;
SY.list = () => strays;
SY.van = () => vanView;

/* ---------------- host simulation ---------------- */
function randSpot(farFrom) {
  const T = W.areas.town;
  for (let i = 0; i < 20; i++) { const s = SPOTS[Math.floor(Math.random() * SPOTS.length)], f = W.freeNear(T, s[0] + (Math.random() - 0.5) * 6, s[1] + (Math.random() - 0.5) * 6, 0.4); if (!farFrom || Math.hypot(f[0] - farFrom[0], f[1] - farFrom[1]) > 22) return f; }
  return W.freeNear(T, SPOTS[0][0], SPOTS[0][1], 0.4);
}
function newStray(o) { const sp = o && o.sp || SPS[Math.floor(Math.random() * SPS.length)], S = GL.SPECIES[sp], v = S.vars[Math.floor(Math.random() * S.vars.length)]; const p = randSpot(o && o.far); return Object.assign({ id: nextId++, sp, col: [v[1], v[2]], name: NAMES[Math.floor(Math.random() * NAMES.length)], x: p[0], z: p[1], yaw: Math.random() * 6, tgt: null, wait: 1, sp2: 0, owner: null, petId: null, held: 0 }, o || {}, { x: p[0], z: p[1] }); }
function playersInTown(S) { const out = []; S.players.forEach((pl) => { if (pl.pid === GS.pid) { if (GS.me.area === 'town') out.push({ pid: pl.pid, x: GS.me.x, z: GS.me.z, car: GL.Cars && GL.Cars.driving() }); } else { const p = GS.pos[pl.pid]; if (p && p.a === 'town') out.push({ pid: pl.pid, x: p.c && p.c[5] ? p.c[2] : p.x, z: p.c && p.c[5] ? p.c[3] : p.z, car: !!(p.c && p.c[5]) }); } }); return out; }
function shelterAdd(S, e) {
  S.shelter = S.shelter || [];
  const entry = { id: e.id, sp: e.sp, col: e.col, name: e.name, owner: e.owner || null, petId: e.petId != null ? e.petId : null };
  if (S.shelter.filter((q) => !q.owner).length >= SHELTER_CAP && !entry.owner) { const i = S.shelter.findIndex((q) => !q.owner); const gone = S.shelter.splice(i, 1)[0]; G.pushEv({ type: 'famAdopt', name: gone.name }); }
  S.shelter.push(entry);
  if (entry.owner) { G.pushEv({ type: 'atShelter', pid: entry.owner, petId: entry.petId, name: entry.name }); if (S.lost) delete S.lost[entry.owner + ':' + entry.petId]; }
  persistShelter(S); G.touch();
}
function persistShelter(S) { if (GS.role === 'client') return; sv().shelter = (S.shelter || []).filter((q) => !q.owner || q.owner === GS.pid).map((q) => Object.assign({}, q)); G.persist(); }
G.hooks.host.push(function (pid, m, S) {
  S.shelter = S.shelter || []; S.lost = S.lost || {};
  const find = (id) => strays.find((q) => q.id === +id);
  switch (m.k) {
    case 'lost': {
      const look = GL.cleanPetLook && GL.cleanPetLook(m.look); if (!look) return; const petId = +m.petId || 0, key = pid + ':' + petId;
      if (strays.some((q) => q.owner === pid && q.petId === petId) || S.shelter.some((q) => q.owner === pid && q.petId === petId)) return;
      const name = String(m.name || look.n || 'Pet').slice(0, 12);
      if (m.shelter) { shelterAdd(S, { id: nextId++, sp: look.sp, col: look.col, name, owner: pid, petId }); return; }
      const me = playersInTown(S).find((q) => q.pid === pid);
      const ns = newStray({ sp: look.sp, col: look.col, name, owner: pid, petId, far: me ? [me.x, me.z] : null });
      if (m.stolen && Number.isFinite(+m.x) && Number.isFinite(+m.z)) { const f = W.freeNear(W.areas.town, clamp(+m.x, -60, 60), clamp(+m.z, -80, 80), 0.4); ns.x = f[0]; ns.z = f[1]; ns.stay = 1; ns.stolen = 1; }
      strays.push(ns);
      S.lost[key] = { name, called: 0 }; G.touch(); break;
    }
    case 'acCall': { const key = pid + ':' + (+m.petId || 0); if (S.lost[key]) { S.lost[key].called = 1; G.touch(); } else if (m.stray) acvT = 0; acvT = Math.min(acvT, 2); break; }
    case 'reclaim': { const s = find(m.id); if (!s || s.owner !== pid || s.held) return; strays = strays.filter((q) => q !== s); delete S.lost[pid + ':' + s.petId]; G.pushEv({ type: 'petBack', pid, petId: s.petId, name: s.name, how: 'found' }); G.touch(); break; }
    case 'net': {
      const s = find(m.id); if (!s || s.held) return; strays = strays.filter((q) => q !== s);
      if (s.owner === pid) { delete S.lost[pid + ':' + s.petId]; G.pushEv({ type: 'petBack', pid, petId: s.petId, name: s.name, how: 'net' }); G.touch(); return; }
      G.pushEv({ type: 'netted', pid, s: { id: s.id, sp: s.sp, col: s.col, name: s.name, owner: s.owner, petId: s.petId } }); G.touch(); break;
    }
    case 'release': { (Array.isArray(m.list) ? m.list : []).slice(0, CARRY).forEach((e) => { if (!e || !GL.SPECIES[e.sp]) return; strays.push(newStray({ sp: e.sp, col: e.col, name: String(e.name || 'Stray').slice(0, 12), owner: e.owner || null, petId: e.petId != null ? e.petId : null })); }); break; }
    case 'dropoff': { (Array.isArray(m.list) ? m.list : []).slice(0, CARRY).forEach((e) => { if (!e || !GL.SPECIES[e.sp]) return; shelterAdd(S, { id: nextId++, sp: e.sp, col: Array.isArray(e.col) ? e.col.slice(0, 2) : ['#ccc', '#eee'], name: String(e.name || 'Stray').slice(0, 12), owner: e.owner || null, petId: e.petId }); }); break; }
    case 'adoptStray': { const i = S.shelter.findIndex((q) => q.id === +m.id && !q.owner); if (i < 0) { G.pushEv({ type: 'adoptFail', pid }); return; } const e = S.shelter.splice(i, 1)[0]; G.pushEv({ type: 'adopted', pid, sp: e.sp, col: e.col, name: e.name }); persistShelter(S); G.touch(); break; }
    case 'pickup': { const i = S.shelter.findIndex((q) => q.id === +m.id && q.owner === pid); if (i < 0) return; const e = S.shelter.splice(i, 1)[0]; G.pushEv({ type: 'petBack', pid, petId: e.petId, name: e.name, how: 'pickup' }); persistShelter(S); G.touch(); break; }
    case 'acShift': { while (strays.filter((q) => !q.owner).length < 4) strays.push(newStray()); break; }
  }
});
function strayMove(s, tx, tz, sp, dt) { const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz); if (d < 0.3) { s.sp2 = 0; return true; } s.yaw += G.ang(Math.atan2(dx, dz) - s.yaw) * Math.min(1, dt * 8); const r = W.move(W.areas.town, s.x, s.z, Math.sin(s.yaw) * sp * dt, Math.cos(s.yaw) * sp * dt, 0.25); s.sp2 = Math.hypot(r[0] - s.x, r[1] - s.z) / Math.max(dt, 1e-3); s.x = r[0]; s.z = r[1]; if (s.sp2 < sp * 0.2) s.tgt = null; return false; }
function vanTo(o, tx, tz, sp, dt) { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.8) return true; o.yaw += G.ang(Math.atan2(dx, dz) - o.yaw) * Math.min(1, dt * 5); const st = Math.min(d, sp * dt); o.x += dx / d * st; o.z += dz / d * st; return false; }
G.hooks.hostTick.push(function (dt, S) {
  if (!S || !W.areas.town) return; S.shelter = S.shelter || []; S.lost = S.lost || {};
  if (!S._shInit) { S._shInit = 1; if (!S.shelter.length && sv().shelter.length) { S.shelter = sv().shelter.filter((q) => !q.owner || q.owner === GS.pid).slice(0, SHELTER_CAP + 3); S.shelter.forEach((q) => { q.id = nextId++; }); G.touch(); } }
  // keep 2-3 strays roaming
  spawnT -= dt; if (spawnT <= 0) { spawnT = 45; if (strays.filter((q) => !q.owner).length < 3) strays.push(newStray()); }
  // owners that left: their lost pets wander back home on their own
  strays = strays.filter((q) => !q.owner || S.players.some((p) => p.pid === q.owner));
  const ps = playersInTown(S);
  strays.forEach((s) => {
    if (s.held) return;
    if (s.stay) { s.sp2 = 0; return; }
    let flee = null, fd = 4.2; ps.forEach((p) => { if (s.owner === p.pid) return; const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < fd) { fd = d; flee = p; } });
    if (flee) { const dx = s.x - flee.x, dz = s.z - flee.z, d = Math.hypot(dx, dz) || 1; strayMove(s, s.x + dx / d * 3, s.z + dz / d * 3, flee.car ? 2.4 : 3.3, dt); s.tgt = null; return; }
    if (!s.tgt) { s.wait -= dt; if (s.wait <= 0) { const a = Math.random() * 6.28, r = 2 + Math.random() * 6; const f = W.freeNear(W.areas.town, s.x + Math.cos(a) * r, s.z + Math.sin(a) * r, 0.3); s.tgt = f; s.wait = 2 + Math.random() * 4; } else s.sp2 = 0; }
    if (s.tgt && strayMove(s, s.tgt[0], s.tgt[1], 1.3, dt)) s.tgt = null;
  });
  // NPC animal control van: answers calls for lost pets, and sometimes collects a stray
  if (!acv) {
    acvT -= dt;
    const called = strays.find((q) => q.owner && S.lost[q.owner + ':' + q.petId] && S.lost[q.owner + ':' + q.petId].called && !q.held);
    const pick = called || (acvT <= 0 && strays.filter((q) => !q.owner).length >= 3 ? strays.find((q) => !q.owner && !q.held) : null);
    if (pick) { const p = park(); pick.held = 1; acv = { x: p[0], z: p[1], yaw: p[2], target: pick.id, phase: 'go', path: W.navPath(p[0], p[1], pick.x, pick.z), t: 0 }; acvT = 90; }
  } else {
    acv.t += dt; const s = strays.find((q) => q.id === acv.target);
    if (acv.phase === 'go') {
      if (!s) { acv.phase = 'back'; acv.path = W.navPath(acv.x, acv.z, park()[0], park()[1]); }
      else { const pt = acv.path[0]; if (!pt || acv.t > 25) { acv.x = s.x + 2; acv.z = s.z; acv.phase = 'net'; acv.t = 0; } else if (vanTo(acv, pt[0], pt[1], 12, dt)) acv.path.shift(); if (Math.hypot(acv.x - s.x, acv.z - s.z) < 3) { acv.phase = 'net'; acv.t = 0; } }
    } else if (acv.phase === 'net') {
      if (acv.t > 1.5) { if (s) { strays = strays.filter((q) => q !== s); acv.cargo = s; G.pushEv({ type: 'vanNet', x: s.x, z: s.z, name: s.name, owner: s.owner }); } acv.phase = 'back'; acv.t = 0; acv.path = W.navPath(acv.x, acv.z, park()[0], park()[1]); }
    } else if (acv.phase === 'back') {
      const pt = acv.path[0]; if (!pt || acv.t > 25) { if (acv.cargo) shelterAdd(S, acv.cargo); acv = null; } else if (vanTo(acv, pt[0], pt[1], 12, dt)) acv.path.shift();
    }
  }
  render(strays.map(packStray), acv ? [+acv.x.toFixed(2), +acv.z.toFixed(2), +acv.yaw.toFixed(2)] : null, dt, true);
});
const packStray = (s) => [s.id, s.sp, s.col[0], s.col[1], +s.x.toFixed(2), +s.z.toFixed(2), +s.yaw.toFixed(2), s.sp2 > 0.3 ? 1 : 0, s.owner || '', s.name, s.held ? 1 : 0];
G.hooks.mob.push((mob) => { mob.strays = strays.map(packStray); mob.acv = acv ? [+acv.x.toFixed(2), +acv.z.toFixed(2), +acv.yaw.toFixed(2)] : null; });
G.hooks.tick.push(function (dt) {
  if (GS.role === 'client') { const m = GS.mob || {}; render(Array.isArray(m.strays) ? m.strays : [], Array.isArray(m.acv) ? m.acv : null, dt, false); }
  shiftTick(dt); lostCheck(dt); shelterView();
});

/* ---------------- rendering (strays + NPC van) ---------------- */
function render(list, van, dt, local) {
  const live = {}, town = W.areas.town;
  list.forEach((q) => {
    if (!Array.isArray(q) || !GL.SPECIES[q[1]]) return; const id = q[0]; live[id] = 1; let v = view[id];
    if (!v) { const P = MD.pet({ sp: q[1], col: [q[2], q[3]], lv: 7, acc: {} }); town.g.add(P.g); v = view[id] = { P, x: q[4], z: q[5], yaw: q[6], d: q }; const own = q[8] === GS.pid; const tag = W.textSprite(own ? q[9] + ' (yours!)' : '\uD83D\uDC3E ' + q[9], { size: 28, h: 0.24, bg: own ? 'rgba(220,38,38,.85)' : 'rgba(101,163,13,.85)', border: '#fff' }); tag.position.y = (P.hTop || 0.8) + 0.35; P.g.add(tag); }
    v.d = q; const k = local ? 1 : 1 - Math.exp(-dt * 10); v.x += (q[4] - v.x) * k; v.z += (q[5] - v.z) * k; v.yaw += G.ang(q[6] - v.yaw) * k;
    v.P.g.position.set(v.x, 0.05, v.z); v.P.g.rotation.y = v.yaw; v.P.anim(dt, q[7] ? 2.5 : 0);
  });
  for (const id in view) if (!live[id]) { town.g.remove(view[id].P.g); delete view[id]; }
  if (van) { if (!vanView) vanView = GL.Cars.makeCar('acvan', null, van[0], van[1], van[2]); const k = local ? 1 : 1 - Math.exp(-dt * 10); vanView.x += (van[0] - vanView.x) * k; vanView.z += (van[1] - vanView.z) * k; vanView.yaw += G.ang(van[2] - vanView.yaw) * k; GL.Cars.placeCar(vanView); if (vanView.m.siren) vanView.m.siren.forEach((s, i) => { s.visible = Math.floor(W.time * 3 + i) % 2 === 0; }); }
  else if (vanView) { GL.Cars.killCar(vanView); vanView = null; }
}
G.extraBlockers = (function (prev) { return function (arr) { if (prev) prev(arr); if (vanView) arr.push([vanView.x, vanView.z]); }; })(G.extraBlockers);
SY.viewList = () => Object.keys(view).map((k) => ({ id: view[k].d[0], x: view[k].x, z: view[k].z, owner: view[k].d[8] }));
SY.nearest = function (r) { let b = null, bd = r; for (const id in view) { const v = view[id]; if (v.d[10]) continue; const d = Math.hypot(v.x - GS.me.x, v.z - GS.me.z); if (d < bd) { bd = d; b = v; } } return b; };

/* ---------------- ACT button: net / drop off / call your pet / pet a stray ---------------- */
G.actHook = (function (prev) {
  return function () {
    const t = prev && prev(); if (t) return t;
    if (!W.cur || W.cur.id !== 'town') return null;
    const w = GS.work && GS.work.ac, C = GL.Cars, o = C && C.cur();
    if (w) {
      const sd = shelterDoor();
      if (w.carry.length && Math.hypot(GS.me.x - sd[0], GS.me.z - (sd[1] + 2)) < 8 && (!o || Math.abs(o.v || 0) < 4)) return { custom: dropOff, kind: 'acdrop', label: 'DROP OFF', name: w.carry.length + ' animal' + (w.carry.length > 1 ? 's' : '') + ' \u2192 shelter', x: sd[0], z: sd[1], py: 2 };
      const s = SY.nearest(o ? 4.8 : 2.6);
      if (s && (!o || Math.abs(o.v || 0) < 5)) { if (w.carry.length >= CARRY) return { custom: () => G.toast('\uD83D\uDE90 The van is full! Drop them off at the shelter.'), kind: 'acfull', label: 'FULL', name: 'Van full', x: s.x, z: s.z, py: 1.6 }; return { custom: netIt, kind: 'acnet', id: s.d[0], label: 'NET', name: s.d[9], x: s.x, z: s.z, py: 1.6 }; }
      return null;
    }
    if (o || GS.me.ride) return null;
    const s = SY.nearest(2.4); if (!s) return null;
    if (s.d[8] === GS.pid) return { custom: reclaim, kind: 'reclaim', id: s.d[0], label: 'CALL', name: s.d[9] + '!', x: s.x, z: s.z, py: 1.6 };
    return { custom: petStray, kind: 'petstray', id: s.d[0], label: 'PET', name: s.d[9] + ' (stray)', x: s.x, z: s.z, py: 1.6 };
  };
})(G.actHook);
function netIt(t) { Snd.fx('net'); W.fx('sparkle', t.x, 1, t.z, 6, 0.8); G.doAct({ k: 'net', id: t.id }); }
function reclaim(t) { Snd.fx('bark'); G.doAct({ k: 'reclaim', id: t.id }); }
function petStray(t) { const v = view[t.id]; Snd.fx(GL.SPECIES[v.d[1]].snd); W.fx('heart', v.x, 1.1, v.z, 4, 0.5); G.need('f', 3); G.toast('\uD83D\uDC3E ' + v.d[9] + ' sniffs your hand. Animal Control can bring strays to the shelter so they find a home!'); }
function dropOff() { const w = GS.work.ac; const n = w.carry.length; G.doAct({ k: 'dropoff', list: w.carry }); w.delivered += n; w.carry = []; const s = sv(); s.stats.strays = (s.stats.strays || 0) + n; Snd.fx('cheer'); G.toast('\uD83C\uDFE0 ' + n + ' animal' + (n > 1 ? 's' : '') + ' safe at the shelter! (' + w.delivered + ' today)'); G.persist(); G.checkGoals && G.checkGoals(); }

/* ---------------- events ---------------- */
G.hooks.ev.push(function (e) {
  const s = sv();
  if (e.type === 'netted' && e.pid === GS.pid && GS.work && GS.work.ac) { GS.work.ac.carry.push(e.s); G.toast('\uD83E\uDD45 Got ' + e.s.name + '! (' + GS.work.ac.carry.length + '/' + CARRY + ' in the van)'); if (e.s.owner) G.toast('\uD83C\uDFF7\uFE0F This one has a name tag \u2014 its family will pick it up at the shelter.'); }
  else if (e.type === 'netted' && e.s && e.s.owner === GS.pid) G.toast('\uD83D\uDE90 Animal Control caught ' + e.s.name + '! They\u2019ll be at the shelter soon.');
  if (e.type === 'petBack' && e.pid === GS.pid) { const p = s.pets.find((q) => q.id === e.petId); if (p) { p.missing = null; p.out = s.pets.filter((q) => q.out).length < 2; } G.persist(); Snd.fx('bark'); G.need('f', 15); W.fx('heart', GS.me.x, 2, GS.me.z, 8, 0.8); G.toast(e.how === 'net' ? '\uD83E\uDD23 You netted\u2026 your own pet! ' + e.name + ' licks your face. Welcome home!' : e.how === 'pickup' ? '\uD83D\uDC96 ' + e.name + ' is so happy to see you! Back together!' : '\uD83D\uDC96 ' + e.name + ' runs into your arms! Found them!'); }
  if (e.type === 'atShelter' && e.pid === GS.pid) { const p = s.pets.find((q) => q.id === e.petId); if (p) p.missing = 'shelter'; G.persist(); Snd.fx('ding'); G.toast('\uD83D\uDCDE Animal Control: \u201CWe found ' + e.name + '! Pick them up at the Animal Shelter Lost & Found.\u201D'); }
  if (e.type === 'adopted' && e.pid === GS.pid) { s.money = Math.max(0, s.money - ADOPT_FEE); GS.moneyFlash = 1; GL.Pets.adopt(e.sp, e.name, { col: e.col, acc: {} }); G.closePanel(); }
  if (e.type === 'adoptFail' && e.pid === GS.pid) G.toast('Oh! Someone else just adopted that one.');
  if (e.type === 'famAdopt') G.toast('\uD83C\uDFE1 A nice family adopted ' + e.name + ' from the shelter!');
  if (e.type === 'vanNet' && W.cur && W.cur.id === 'town' && Math.hypot(e.x - GS.me.x, e.z - GS.me.z) < 30) { Snd.fx('net'); W.fx('sparkle', e.x, 1, e.z, 6, 0.8); }
});

/* ---------------- missing pets ---------------- */
let hourSeen = -1, sentKey = '';
function lostCheck() {
  const s = sv(), S = GS.S; if (!S || !G.inGame()) return;
  // (re)report missing pets to whoever is hosting this town (once per session)
  const key = (GS.role || '') + ':' + (GS.room ? GS.room.code : 'solo');
  if (sentKey !== key) { sentKey = key; s.pets.filter((p) => p.missing).forEach((p) => G.doAct({ k: 'lost', petId: p.id, look: Object.assign(GL.Pets.look(p), { n: p.name }), name: p.name, shelter: p.missing === 'shelter' ? 1 : 0, stolen: p.missing === 'stolen' ? 1 : 0, x: p.spot ? p.spot[0] : null, z: p.spot ? p.spot[1] : null })); }
  const hr = Math.floor(G.clock() / 60); if (hr === hourSeen) return; const first = hourSeen < 0; hourSeen = hr; if (first) return;
  if (GS.me.area !== 'town' || s.lostDay === G.day() || GS.work) return;
  const out = s.pets.filter((p) => p.out && !p.missing); if (!out.length) return;
  const p = out[Math.floor(Math.random() * out.length)], chance = p.n.f < 35 ? 0.3 : 0.12;
  if (Math.random() >= chance) return;
  SY.loseMe(p, Math.random() < (p.n.f < 35 ? 0.2 : 0.4));
}
// pet thief hideouts: behind these buildings (the clue says which one)
const HIDEOUTS = ['museum', 'pawn', 'school', 'grocery', 'fire', 'arcade', 'steves'];
const CLUES = ['a trail of fishy-smelling paw prints leads behind ', 'a dropped sack of dog treats was found behind ', 'someone heard a muffled \u201Cwoof\u201D behind ', 'a sneaky footprint + a feather point behind '];
function hideout(id) { id = id || HIDEOUTS[Math.floor(Math.random() * HIDEOUTS.length)]; const b = W.bld(id); const z = b.door === 'n' ? b.z1 + 2.2 : b.z0 - 2.2; const f = W.freeNear(W.areas.town, (b.x0 + b.x1) / 2, z, 0.5); return { id, name: b.name, x: f[0], z: f[1] }; }
let thief = null;
function thiefRun(x, z) {
  if (thief) W.areas.town.g.remove(thief.ch.g);
  const ch = MD.avatar({ skin: GL.SKINS[2], hair: 'short', hc: '#111827', top: 'tee', tc: '#111827', bc: '#111827', hat: 'cap', hatc: '#111827', gl: 'shades' }); ch.g.position.set(x, 0, z); W.areas.town.g.add(ch.g);
  MD.sph(0.32, '#a16207', ch.g, -0.25, 1.1, -0.25); const tag = W.textSprite('\uD83E\uDDB9 PAWS McGEE', { size: 30, h: 0.4, bg: 'rgba(17,24,39,.9)' }); tag.position.set(0, 2.4, 0); ch.g.add(tag);
  const a = Math.atan2(x - GS.me.x, z - GS.me.z); thief = { ch, x, z, yaw: a, t: 3.2 };
}
SY.thief = () => !!thief;
G.hooks.tick.push((dt) => { if (!thief) return; thief.t -= dt; const r = W.move(W.areas.town, thief.x, thief.z, Math.sin(thief.yaw) * 7 * dt, Math.cos(thief.yaw) * 7 * dt, 0.3); thief.x = r[0]; thief.z = r[1]; thief.ch.g.position.set(thief.x, 0, thief.z); thief.ch.g.rotation.y = thief.yaw; thief.ch.anim(dt, 7); if (thief.t <= 0) { W.fx('smoke', thief.x, 1, thief.z, 6, 0.6); W.areas.town.g.remove(thief.ch.g); thief = null; } });
SY.loseMe = function (p, stolen, hid) {
  const s = sv(); s.lostDay = G.day(); p.out = false;
  const px = GS.me.x, pz = GS.me.z;
  if (stolen) {
    const h = hideout(hid); p.missing = 'stolen'; p.spot = [+h.x.toFixed(1), +h.z.toFixed(1)]; p.clue = 'Clue: ' + CLUES[Math.floor(Math.random() * CLUES.length)] + 'the ' + h.name + '!'; G.persist();
    G.doAct({ k: 'lost', petId: p.id, look: Object.assign(GL.Pets.look(p), { n: p.name }), name: p.name, stolen: 1, x: h.x, z: h.z });
    if (W.cur && W.cur.id === 'town') thiefRun(px + 1.5, pz + 1);
    Snd.fx('no'); G.toast('\uD83E\uDDB9 HEY! Paws McGee, the cartoon pet-napper, swiped ' + p.name + '! \uD83D\uDD75\uFE0F ' + p.clue, true);
    G.notify && G.notify('animal', '\uD83E\uDDB9', 'Animal Control', p.name + ' was STOLEN! ' + p.clue + ' Tap for help.');
  } else {
    p.missing = 'lost'; p.spot = null; p.clue = null; G.persist();
    G.doAct({ k: 'lost', petId: p.id, look: Object.assign(GL.Pets.look(p), { n: p.name }), name: p.name });
    Snd.fx('no'); G.toast('\uD83D\uDE31 Oh no! ' + p.name + ' chased a squirrel and ran off! Look around town or call Animal Control (phone \u2192 \uD83D\uDC3E).', true);
    G.notify && G.notify('animal', (GL.SPECIES[p.sp] || {}).icon || '\uD83D\uDC3E', 'Animal Control', p.name + ' is MISSING! They ran off chasing a squirrel. Tap for help.');
  }
};
G.statusParts.push(() => {
  const s = sv(); let o = '';
  const w = GS.work && GS.work.ac; if (w) o += '<button class="spill green" data-a="acEnd">\uD83D\uDE90 ' + Math.ceil(w.t) + 's \u00b7 \uD83E\uDD45 ' + w.carry.length + '/' + CARRY + ' \u00b7 \u2705 ' + w.delivered + ' \u00b7 END</button>';
  const miss = s.pets.filter((p) => p.missing); if (miss.length) o += '<button class="spill red petAlert" data-a="app" data-v="animal"><em>' + ((GL.SPECIES[miss[0].sp] || {}).icon || '\uD83D\uDC3E') + '</em> ' + esc(miss[0].name) + (miss[0].missing === 'stolen' ? ' was STOLEN! \uD83E\uDDB9' : miss[0].missing === 'shelter' ? ' is at the shelter!' : ' is missing!') + '</button>';
  return o;
});

/* ---------------- phone app: Animal Control ---------------- */
UI.app_animal = function () {
  const s = sv(), S = GS.S || {}, miss = s.pets.filter((p) => p.missing);
  let h = head('\uD83D\uDC3E Animal Control') + '<p class="sub small">Grokville Animal Control \u00b7 open 24/7 \u00b7 \u201CWe bring every tail home.\u201D</p>';
  if (miss.length) h += '<div class="list">' + miss.map((p) => { const called = S.lost && S.lost[GS.pid + ':' + p.id] && S.lost[GS.pid + ':' + p.id].called; return '<div class="lrow"><b>' + esc(p.name) + '<small>' + (p.missing === 'shelter' ? 'Safe at the Animal Shelter \u2014 go pick them up!' : (p.missing === 'stolen' ? '\uD83E\uDDB9 STOLEN by Paws McGee! ' + esc(p.clue || '') + ' ' : '') + (called ? 'Search in progress\u2026 \uD83D\uDE90' : p.missing === 'stolen' ? '' : 'Missing in town \u2014 wandering around.')) + '</small></b><span>' + (p.missing === 'shelter' ? btn('guideB', 'shelter', '\uD83E\uDDED GO', 'small blue') : btn('acCall', p.id, called ? '\uD83D\uDCDE CALLED' : '\uD83D\uDCDE REPORT', 'small red', !!called)) + '</span></div>'; }).join('') + '</div>';
  else h += '<p class="sub">All your pets are safe at home \uD83D\uDC96</p>';
  const n = (GS.role === 'client' ? ((GS.mob && GS.mob.strays) || []).filter((q) => !q[8]).length : strays.filter((q) => !q.owner).length);
  if (miss.some((p) => p.missing === 'stolen' && p.spot)) h += btn('petGuide', miss.find((p) => p.missing === 'stolen' && p.spot).id, '\uD83E\uDDED FOLLOW THE CLUE', 'blue');
  h += '<div class="acJob"><h3>\uD83D\uDE90 Animal Control job</h3>' + (s.job === 'animalcontrol' ? '<p class="sub small">Drive the van, net strays, drop them at the shelter (90 seconds).</p>' + btn('acStart', null, '\uD83D\uDE90 START SHIFT', 'green', !!GS.work) : '<p class="sub small">Want to catch strays yourself? It\u2019s a real job!</p>' + btn('acHire', null, '\uD83D\uDCBC GET THE ANIMAL CONTROL JOB', 'green')) + '</div>';
  h += '<h3>Strays around town: ' + n + '</h3>' + btn('acStray', null, '\uD83D\uDCDE REPORT A STRAY', 'blue', !n) + '<p class="sub small">Strays get taken to the shelter, where anyone can adopt them. Want to catch them yourself? Get the Animal Control job at City Hall!</p>' + btn('guideB', 'shelter', '\uD83E\uDDED GUIDE TO SHELTER', 'small');
  open('animal', h);
};
H.acCall = (id) => { G.doAct({ k: 'acCall', petId: +id }); Snd.fx('ding'); G.toast('\uD83D\uDCDE Animal Control: \u201COn it! Our van is heading out to find them.\u201D'); setTimeout(() => { if (GS.panel === 'animal') UI.app_animal(); }, 300); };
H.acStray = () => { G.doAct({ k: 'acCall', stray: 1 }); Snd.fx('ding'); G.closePanel(); G.toast('\uD83D\uDCDE Animal Control: \u201CThanks! We\u2019ll send the van.\u201D'); };

/* ---------------- the shelter ---------------- */
G.hooks.kinds.shelter = function () {
  const s = sv(), S = GS.S || {}, list = (S.shelter || []).filter((q) => !q.owner);
  let h = head('\uD83D\uDC36 Adopt a Rescue') + '<p class="sub small">Every rescue was caught by Animal Control. Adoption fee ' + money(ADOPT_FEE) + ' \u00b7 you have ' + money(s.money) + '</p>';
  h += list.length ? '<div class="grid">' + list.map((q) => '<button class="item" data-a="adoptStray" data-v="' + q.id + '"' + (s.money < ADOPT_FEE ? ' disabled' : '') + '><img class="pic" src="' + UI.portrait({ sp: q.sp, col: q.col }) + '"><b>' + esc(q.name) + '</b><small>' + esc(GL.SPECIES[q.sp].name) + ' \u00b7 ' + money(ADOPT_FEE) + '</small></button>').join('') + '</div>' : '<p class="sub">No rescues right now! When Animal Control brings strays in, they\u2019ll be here waiting for a family.</p>';
  open('shelter', h);
};
H.adoptStray = (id) => { if (sv().money < ADOPT_FEE) { G.toast('Not enough money!', true); return; } G.doAct({ k: 'adoptStray', id: +id }); Snd.fx('buy'); };
G.hooks.kinds.lostfound = function () {
  const S = GS.S || {}, mine = (S.shelter || []).filter((q) => q.owner === GS.pid), s = sv();
  let h = head('\uD83C\uDFF7\uFE0F Lost & Found Pets');
  if (mine.length) h += '<div class="grid">' + mine.map((q) => '<button class="item" data-a="pickupPet" data-v="' + q.id + '"><img class="pic" src="' + UI.portrait({ sp: q.sp, col: q.col }) + '"><b>' + esc(q.name) + '</b><small>PICK UP \u2764\uFE0F</small></button>').join('') + '</div>';
  else if (s.pets.some((p) => p.missing)) h += '<p class="sub">Your pet isn\u2019t here yet. Report them on your phone (\uD83D\uDC3E Animal Ctrl) and the van will go look!</p>';
  else h += '<p class="sub">Nobody from your family is here \u2014 all paws accounted for! \uD83D\uDC3E</p>';
  open('lostfound', h);
};
H.pickupPet = (id) => { G.doAct({ k: 'pickup', id: +id }); G.closePanel(); };
// show shelter animals in the kennels
let kenKey = '';
function shelterView() {
  const A = W.cur; if (!A || A.id !== 'shelter' || !A.petsG) { kenKey = ''; return; }
  const list = ((GS.S && GS.S.shelter) || []).slice(0, A.kennels.length), key = JSON.stringify(list.map((q) => [q.id, q.sp]));
  if (key === kenKey) { A.petsG.children.forEach((c, i) => { if (c.userData.P) c.userData.P.anim(1 / 60, 0); void i; }); return; }
  kenKey = key; while (A.petsG.children.length) A.petsG.remove(A.petsG.children[0]);
  list.forEach((q, i) => { const P = MD.pet({ sp: q.sp, col: q.col, lv: 7, acc: {} }); const k = A.kennels[i]; P.g.position.set(k[0], 0.05, k[1] + 0.6); P.g.userData.P = P; A.petsG.add(P.g); const tag = W.textSprite(q.owner ? q.name + ' \uD83C\uDFF7\uFE0F' : q.name, { size: 28, h: 0.24, bg: q.owner ? 'rgba(220,38,38,.85)' : 'rgba(101,163,13,.85)', border: '#fff' }); tag.position.y = (P.hTop || 0.8) + 0.35; P.g.add(tag); });
}

/* ---------------- Animal Control career shift ---------------- */
// how to start: phone -> Animal Ctrl (or Career) -> START SHIFT, or walk to the van outside the shelter / van keys inside and tap START SHIFT
H.acStart = () => { G.closePanel(); if (sv().job !== 'animalcontrol') { SY.offer(); return; } GL.Work.request('animalcontrol'); };
H.acHire = () => { UI.H.takeJob('animalcontrol'); G.guide = null; setTimeout(() => SY.offer(), 250); };
H.petGuide = (id) => { const p = sv().pets.find((q) => q.id === +id); if (!p || !p.spot) return; G.guide = { x: p.spot[0], z: p.spot[1], label: p.name + '?' }; G.closePanel(); G.toast('\uD83D\uDD75\uFE0F Follow the arrow to the hideout. Tap CALL when you see ' + p.name + '!'); };
SY.offer = function () {
  const s = sv(), hired = s.job === 'animalcontrol';
  open('acjob', head('\uD83D\uDE90 Animal Control') + '<div class="big">\uD83D\uDC15\u200D\uD83E\uDDBA\uD83D\uDE90</div><p class="sub">' + (hired ? 'You\u2019re on the team! Drive the van, tap <b>NET</b> next to strays (\uD83D\uDC3E green tags), then <b>DROP OFF</b> at the shelter. 90 seconds per shift.' : 'Catch strays, reunite lost pets with their families and earn money! Take the job to start driving the van.') + '</p>' + (hired ? btn('acStart', null, '\uD83D\uDE90 START SHIFT', 'green', !!GS.work) : btn('acHire', null, '\uD83D\uDCBC TAKE THE JOB', 'green')) + btn('close', null, 'LATER'));
};
SY.startShift = function () {
  const p = park();
  G.closePanel(); GS.me.act = null;
  G.travel('town', true, [p[0], p[1]]);
  const car = GL.Cars.workCar('acvan', p[0], p[1], p[2]); void car;
  GS.work = { cid: 'animalcontrol', overlay: false, spray: false, ac: { t: SHIFT_SECS, carry: [], delivered: 0 } };
  G.doAct({ k: 'acShift' });
  Snd.fx('engine'); G.toast('\uD83D\uDE90 Shift started! Find strays (\uD83D\uDC3E green tags), tap NET, then DROP OFF at the shelter. ' + SHIFT_SECS + ' seconds!');
};
function shiftTick(dt) { const w = GS.work && GS.work.ac; if (!w || w.ending) return; w.t -= dt; if (w.t <= 0) SY.endShift(); }
SY.endShift = function (silent) {
  const w = GS.work && GS.work.ac; if (!w || w.ending) return; w.ending = true;
  if (w.carry.length) G.doAct({ k: 'release', list: w.carry });
  const C = GL.Cars, o = C.workObj(); if (o) C.endWork(o.x, o.z);
  const stars = w.delivered >= 5 ? 3 : w.delivered >= 3 ? 2 : w.delivered >= 1 ? 1 : 0;
  GS.work = null;
  if (silent) return;
  GL.Work.external('animalcontrol', stars, w.delivered, w.carry.length ? '\uD83D\uDC3E ' + w.carry.length + ' undelivered animal' + (w.carry.length > 1 ? 's' : '') + ' hopped out of the van' : '');
};
H.acEnd = () => SY.endShift();
G.hooks.reset.push(() => { strays = []; acv = null; render([], null, 0, true); if (GS.work && GS.work.ac) GS.work = null; hourSeen = -1; sentKey = ''; });
})();
