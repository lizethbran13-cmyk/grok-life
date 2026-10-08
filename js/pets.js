/* Grok Life - pets: adopt, follow you around, wait at home, feed / pet / play / tricks (models from Grok Pets) */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd;
const GS = G.GS, sv = () => G.save(), clamp = GL.clamp;
const P = GL.Pets = {};
let p3 = {}, rp = {};
P.look = (p) => ({ sp: p.sp, col: p.col, eye: p.eye, oneEye: p.oneEye, lv: 7, acc: p.acc || {} });
GL.cleanPetLook = function (l) { if (!l || !GL.SPECIES[l.sp] || !Array.isArray(l.col)) return null; const hex = (c) => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#cccccc'; const acc = {}; if (l.acc) for (const k in l.acc) if (GL.PET_ACC[l.acc[k]]) acc[k] = l.acc[k]; return { sp: l.sp, col: [hex(l.col[0]), hex(l.col[1])], eye: /^#[0-9a-f]{6}$/i.test(l.eye || '') ? l.eye : undefined, oneEye: l.oneEye ? 1 : 0, lv: 7, acc, n: String(l.n || '').slice(0, 12) }; };
P.activeLooks = () => sv().pets.filter((p) => p.out).slice(0, 2).map((p) => Object.assign(P.look(p), { n: p.name }));
P.adopt = function (sp, name, fam) {
  const s = sv(), S = GL.SPECIES[sp];
  const p = { id: s.nextPet++, sp, name: name || S.name, col: fam ? fam.col.slice() : [S.vars[0][1], S.vars[0][2]], acc: fam ? Object.assign({}, fam.acc) : {}, n: { h: 80, f: 80 }, tricks: {}, out: s.pets.filter((q) => q.out).length < 2 };
  if (fam) { p.fam = fam.id; if (fam.eye) p.eye = fam.eye; if (fam.oneEye) p.oneEye = 1; }
  s.pets.push(p); s.bag.kibble = (s.bag.kibble || 0) + 2; G.persist(); Snd.fx(S.snd); G.toast('\uD83D\uDC96 ' + p.name + ' is part of your family! (+2 pet food)'); G.tutNext(4); return p;
};
P.toggleOut = function (id) { const s = sv(), p = s.pets.find((q) => q.id === id); if (!p) return; if (!p.out && s.pets.filter((q) => q.out).length >= 2) { G.toast('Two pets can come along at a time.'); return; } p.out = !p.out; G.persist(); };
P.care = function (id, what, arg) {
  const s = sv(), p = s.pets.find((q) => q.id === id); if (!p) return; const o = p3[id], S = GL.SPECIES[p.sp];
  if (what === 'pet') { p.n.f = clamp(p.n.f + 10, 0, 100); G.need('f', 3); Snd.fx(S.snd); if (o) { o.P.play('happy', 1.2); W.fx('heart', o.x, 1, o.z, 4, 0.5); } }
  if (what === 'play') { p.n.f = clamp(p.n.f + 20, 0, 100); p.n.h = clamp(p.n.h - 5, 0, 100); G.need('f', 8); Snd.fx('throw'); if (o) o.P.play('jump', 1); }
  if (what === 'feed') { const it = GL.ITEMS[arg]; if (!s.bag[arg]) return; s.bag[arg]--; p.n.h = clamp(p.n.h + (it.ph || 30), 0, 100); p.n.f = clamp(p.n.f + (it.pf || 0), 0, 100); Snd.fx('eat'); if (o) o.P.play('eat', 1.4); }
  if (what === 'trick') { const n = p.tricks[arg] || 0; if (o) o.P.play(arg, 1.4); if (n < GL.TRICK_NEED) { p.tricks[arg] = n + 1; if (p.tricks[arg] >= GL.TRICK_NEED) { s.stats.tricks++; Snd.fx('learn'); G.toast('\uD83C\uDF89 ' + p.name + ' learned a new trick!'); } else { Snd.fx('trick'); G.toast(p.name + ' is learning\u2026 ' + p.tricks[arg] + '/' + GL.TRICK_NEED); } } else { Snd.fx('trick'); p.n.f = clamp(p.n.f + 5, 0, 100); } }
  G.persist();
};
P.clear = function () { for (const k in p3) W.scene.remove(p3[k].P.g); p3 = {}; for (const k in rp) rp[k].forEach((o) => W.scene.remove(o.P.g)); rp = {}; };
P.onTravel = function () { P.clear(); };
function ensure(map, key, look, x, z) { let o = map[key]; const lk = JSON.stringify(look); if (o && o.lk !== lk) { W.scene.remove(o.P.g); o = null; } if (!o) { const f = W.freeNear(W.cur, x, z, 0.25); o = map[key] = { P: MD.pet(look), lk, x: f[0], z: f[1], yaw: 0, sp: 0, idle: 2, tgt: null, wait: 0 }; W.scene.add(o.P.g); } return o; }
function follow(o, tx, tz, dt, cap) {
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
  if (d > 14) { const f = W.freeNear(W.cur, tx, tz, 0.25); o.x = f[0]; o.z = f[1]; o.sp = 0; return; }
  if (d > 0.35) { const ty = Math.atan2(dx, dz); o.yaw += G.ang(ty - o.yaw) * Math.min(1, dt * 10); const face = clamp((Math.cos(G.ang(ty - o.yaw)) - 0.72) / 0.23, 0, 1); const sp = Math.min(cap, d * 2.6 + 0.6) * face; const r = W.move(W.cur, o.x, o.z, Math.sin(o.yaw) * sp * dt, Math.cos(o.yaw) * sp * dt, 0.22); o.sp = Math.hypot(r[0] - o.x, r[1] - o.z) / Math.max(dt, 1e-3); o.x = r[0]; o.z = r[1]; } else o.sp = 0;
}
let tagT = 0;
P.tick = function (dt) {
  const s = sv(), m = GS.me, live = {}, A = W.cur;
  s.pets.forEach((p) => { p.n.h = Math.max(10, p.n.h - dt * 0.03); p.n.f = Math.max(10, p.n.f - dt * 0.025); });
  const inCar = GL.Cars && (GL.Cars.driving() || m.ride);
  const atHome = A.homeKey === GS.pid;
  const list = s.pets.filter((p) => p.out || atHome);
  list.forEach((p, i) => {
    live[p.id] = 1; const o = ensure(p3, p.id, P.look(p), m.x - 1, m.z - 1);
    if (!o.tag) { o.tag = W.textSprite(p.name, { size: 30, h: 0.26, bg: 'rgba(40,20,70,.75)', border: '#ffd23f' }); o.tag.position.y = (o.P.hTop || 0.8) + 0.35; o.P.g.add(o.tag); }
    o.P.g.visible = !inCar;
    if (p.out && !atHome || p.out) {
      const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw), side = i % 2 ? 0.9 : -0.9;
      follow(o, m.x - fx * 1.4 + fz * side, m.z - fz * 1.4 - fx * side, dt, Math.max(7, m.sp * 1.4));
    } else { // wander at home
      if (!o.tgt || Math.hypot(o.tgt[0] - o.x, o.tgt[1] - o.z) < 0.4) { o.wait -= dt; if (o.wait <= 0) { o.tgt = [(Math.random() - 0.5) * (A.w - 2), (Math.random() - 0.5) * (A.d - 3)]; o.wait = 3 + Math.random() * 4; } }
      if (o.tgt) { follow(o, o.tgt[0], o.tgt[1], dt, 1.6); if (o.sp < 0.05 && Math.hypot(o.tgt[0] - o.x, o.tgt[1] - o.z) > 0.4) o.tgt = null; }
    }
    if (o.sp < 0.1) { o.idle -= dt; if (o.idle < 0 && !o.P.act) { o.idle = 4 + Math.random() * 5; o.P.play(p.n.f > 60 ? 'happy' : 'sit', 1.5); } }
    o.P.g.position.set(o.x, 0.05, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, o.sp);
  });
  for (const k in p3) if (!live[k]) { W.scene.remove(p3[k].P.g); delete p3[k]; }
  // friends' pets follow their owners
  const S = GS.S, seen = {};
  if (S) S.players.forEach((pl) => {
    if (pl.pid === GS.pid) return; const pos = GS.pos[pl.pid], av = GS.av[pl.pid], looks = (S.looks[pl.pid] && S.looks[pl.pid].pets) || [];
    if (!pos || pos.a !== m.area || !av || !av.init || (pos.c && pos.c[5]) || pos.rd) { if (rp[pl.pid]) { rp[pl.pid].forEach((o) => W.scene.remove(o.P.g)); delete rp[pl.pid]; } return; }
    seen[pl.pid] = 1; const arr = rp[pl.pid] = rp[pl.pid] || [];
    while (arr.length > looks.length) W.scene.remove(arr.pop().P.g);
    const fx = Math.sin(av.yaw), fz = Math.cos(av.yaw);
    looks.forEach((l, i) => { const holder = {}; if (arr[i]) holder.x = arr[i]; const o = ensure(holder, 'x', l, av.x - fx, av.z - fz); arr[i] = o; if (!o.tag) { o.tag = W.textSprite(l.n || 'Pet', { size: 30, h: 0.26, bg: 'rgba(40,20,70,.75)', border: '#a78bfa' }); o.tag.position.y = (o.P.hTop || 0.8) + 0.35; o.P.g.add(o.tag); } const side = i % 2 ? 0.9 : -0.9; follow(o, av.x - fx * 1.4 + fz * side, av.z - fz * 1.4 - fx * side, dt, 8); o.P.g.position.set(o.x, 0.05, o.z); o.P.g.rotation.y = o.yaw; o.P.anim(dt, o.sp); });
  });
  for (const k in rp) if (!seen[k]) { rp[k].forEach((o) => W.scene.remove(o.P.g)); delete rp[k]; }
  tagT -= dt; void tagT;
};
P.nearest = function (x, z) { let b = null, bd = 2; const s = sv(); for (const k in p3) { const o = p3[k], d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; b = s.pets.find((p) => p.id === +k); } } return b; };
P.hit = function (sx, sy) { for (const k in p3) if (W.hitObj(sx, sy, p3[k].P.g)) return +k; return null; };
})();
