/* Grok Life - OPTIONAL cartoon crime: Shady Sid, museum / jewelry / bank heists, wanted stars,
   police chases (host-authoritative in co-op), hiding in bushes, cartoon jail, fencing loot */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd, UI = GL.UI;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money, clamp = GL.clamp;
const CR = GL.Crime = {};
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const COOL = (lv) => 8 + 6 * lv;
const STARS = (lv) => '\u2605'.repeat(lv) + '\u2606'.repeat(3 - lv);
const PSTATION = () => W.bld('police').out;
G.statusParts = G.statusParts || [];
const crime = () => sv().crime;
let jail = null, heist = null;
CR.jailed = () => !!jail;
const prevJ = G.jailed; G.jailed = () => !!jail || (prevJ ? prevJ() : false);
const prevF = G.frozen; G.frozen = () => !!jail || (prevF ? prevF() : false);

/* ---------------- Shady Sid (opt-in + fence) ---------------- */
G.hooks.kinds.fence = function () {
  const c = crime();
  if (!c.on) {
    open('sid', head('\uD83C\uDFA9 Shady Sid') + '<p class="sub">\u201CPsst\u2026 Hey kid. Ever wanted to try a life of <b>cartoon crime</b>? Sneak into the museum, the jewelry store or the bank vault, grab the shiny stuff and bring it to me.\u201D</p><p class="sub small">\u26A0\uFE0F Totally optional and silly! The police will chase you. If they catch you, it\u2019s cartoon jail and a fine, and you lose the loot. You can quit any time here.</p><div class="btnrow">' + btn('crimeOn', null, '\uD83D\uDE0E I\u2019M IN', 'red') + btn('close', null, 'NO THANKS', 'alt') + '</div>');
    return;
  }
  const L = c.loot, ks = Object.keys(L).filter((k) => L[k] > 0), wanted = CR.myWanted();
  let h = head('\uD83C\uDFA9 Shady Sid') + '<p class="sub small">' + (wanted ? '\u201CWhoa, you\u2019re HOT right now! Lose the cops first, then come back.\u201D' : '\u201CWhatcha got for me?\u201D') + '</p>';
  h += ks.length ? '<div class="list">' + ks.map((k) => { const it = GL.LOOT[k]; return '<div class="lrow"><b>' + it.icon + ' ' + esc(it.name) + ' \u00d7' + L[k] + '</b><span>' + btn('fenceSell', k, 'SELL ' + money(it.price), 'small green', !!wanted) + '</span></div>'; }).join('') + '</div>' + (ks.length > 1 ? btn('fenceAll', null, 'SELL EVERYTHING', 'green', !!wanted) : '') : '<p class="sub">No loot yet. Heists:</p>';
  h += '<div class="list">' + Object.keys(GL.HEISTS).map((id) => { const q = GL.HEISTS[id], b = W.bld(q.area); return '<div class="lrow"><b>' + q.icon + ' ' + esc(q.name) + '<small>' + esc(b.name) + ' \u00b7 ' + STARS(q.stars) + (c.done[id] === G.day() ? ' \u00b7 done today' : '') + '</small></b><span>' + btn('guideB', q.area, '\uD83E\uDDED', 'small blue') + '</span></div>'; }).join('') + '</div>';
  h += '<p class="sub small">Tip: hide in bushes (\uD83C\uDF3F HIDE) or duck into a building to lose the cops. Busted ' + (c.busts || 0) + ' \u00b7 Escaped ' + (c.escapes || 0) + '</p>' + btn('crimeOff', null, '\uD83D\uDE07 GO STRAIGHT (crime off)', 'alt small');
  open('sid', h);
};
H.crimeOn = () => { crime().on = true; G.persist(); Snd.fx('sparkle'); G.closePanel(); G.toast('\uD83D\uDE0E Crime mode ON. Exhibits now say HEIST. Good luck\u2026 and stay cartoony!'); };
H.crimeOff = () => { crime().on = false; G.persist(); G.closePanel(); G.toast('\uD83D\uDE07 You went straight! Sid sniffles a little.'); };
function sell(k) { const c = crime(), it = GL.LOOT[k]; if (!c.loot[k]) return 0; c.loot[k]--; if (!c.loot[k]) delete c.loot[k]; G.addMoney(it.price); return it.price; }
H.fenceSell = (k) => { if (CR.myWanted()) return; const n = sell(k); if (n) G.toast('\uD83D\uDCB0 Sid: \u201CPleasure doin\u2019 business!\u201D +' + money(n)); G.persist(); G.hooks.kinds.fence(); };
H.fenceAll = () => { if (CR.myWanted()) return; let t = 0; const c = crime(); Object.keys(c.loot).forEach((k) => { while (c.loot[k]) t += sell(k); }); if (t) G.toast('\uD83D\uDCB0 Sold everything! +' + money(t)); G.persist(); G.hooks.kinds.fence(); };

/* ---------------- exhibits / heists ---------------- */
const robbed = (id) => { const S = GS.S; return (S && S.robbed && S.robbed[id] === S.day) || crime().done[id] === G.day(); };
G.hooks.kinds.exhibit = function () { G.need('f', 5); W.fx('sparkle', GS.me.x, 2, GS.me.z - 1, 5, 1); G.toast('\uD83E\uDD95 RAWR! The dino skeleton is 66 million years old (and still smiling).'); };
G.hooks.kinds.heist = function (h) {
  const q = GL.HEISTS[h.heist], c = crime();
  if (!c.on) { G.need('f', 5); W.fx('sparkle', h.x, 1.8, h.z - 1.2, 6, 1); G.toast(q.icon + ' Ooh, the ' + q.name + ' sparkle! (Sid at the pawn shop has\u2026 ideas.)'); return; }
  if (robbed(h.heist)) { G.toast('\uD83D\uDE45 Already cleaned out! New treasures arrive tomorrow.'); return; }
  if (CR.myWanted()) { G.toast('\uD83D\uDEA8 Too hot right now \u2014 lose the cops first!', true); return; }
  if (GL.Health && GL.Health.lv() >= 2) { G.toast('\uD83E\uDD15 You\u2019re too hurt for sneaky stuff. See a doctor!', true); return; }
  startHeist(h.heist);
};
function ovl(html) { let o = document.getElementById('crOv'); if (!o) { o = document.createElement('div'); o.id = 'crOv'; o.className = 'ovl crime'; document.body.appendChild(o); } o.innerHTML = html; GS.ovl = 'crime'; GS.joyReset && GS.joyReset(); return o; }
function ovlClose() { const o = document.getElementById('crOv'); if (o) o.remove(); GS.ovl = null; }
CR.ovlClose = ovlClose;
function startHeist(id) {
  const q = GL.HEISTS[id], stages = q.diff >= 2 ? ['laser', 'lock', 'grab'] : ['lock', 'grab'];
  heist = { id, q, stages, si: -1, alarm: 0, got: {}, t: 0 };
  G.closePanel(); if (GS.me.act) G.endAct(true);
  Snd.fx('lock'); nextStage();
}
function nextStage() {
  const hz = heist; hz.si++; const st = hz.stages[hz.si];
  if (!st) { endHeist(); return; }
  hz.st = st; hz.t = 0; hz.n = 0; hz.lock = 0;
  const top = '<div class="wTop"><b>' + hz.q.icon + ' ' + esc(hz.q.name) + '</b><span id="hzAlarm">\uD83D\uDEA8 ' + '\u25CF'.repeat(hz.alarm) + '\u25CB'.repeat(3 - hz.alarm) + '</span></div>';
  if (st === 'laser') { hz.need = 3; hz.p = 0; hz.dir = 1; hz.sp = 0.55 + hz.q.diff * 0.12; ovl(top + '<div class="wVerb">Sneak past the lasers! Tap SNEAK when the laser is far away.</div><div class="hzBox"><div class="hzLane"><i id="hzLaser"></i><b id="hzMe">\uD83E\uDD77</b></div><p class="sub" id="hzN">Steps: 0 / 3</p></div><button class="btn primary hzBig" id="hzTap">SNEAK \uD83D\uDC63</button>'); }
  if (st === 'lock') { hz.need = hz.q.diff >= 3 ? 3 : 2; hz.a = 0; hz.sp = 2.4 + hz.q.diff * 0.5; hz.notch = 1 + Math.random() * 4; ovl(top + '<div class="wVerb">Crack the lock! Tap when the needle hits the gold notch.</div><div class="hzBox"><div class="hzDial"><em id="hzNotch"></em><i id="hzNeedle"></i></div><p class="sub" id="hzN">Clicks: 0 / ' + hz.need + '</p></div><button class="btn primary hzBig" id="hzTap">CLICK \uD83D\uDD13</button>'); }
  if (st === 'grab') {
    hz.t = 0; hz.left = hz.alarm >= 3 ? 3.5 : 6; const items = []; Object.keys(hz.q.loot).forEach((k) => { for (let i = 0; i < hz.q.loot[k]; i++) items.push(k); });
    ovl(top + '<div class="wVerb">GRAB THE LOOT! Tap every treasure before time runs out!</div><div class="wField" id="hzField">' + items.map((k, i) => '<button class="wTgt hzLoot" data-k="' + k + '" style="left:' + (8 + ((i * 37) % 74)) + '%;top:' + (10 + ((i * 53) % 70)) + '%">' + GL.LOOT[k].icon + '</button>').join('') + '</div><p class="sub" id="hzN"></p>');
    document.querySelectorAll('.hzLoot').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); if (b.dataset.done) return; b.dataset.done = 1; b.classList.add('ok'); hz.got[b.dataset.k] = (hz.got[b.dataset.k] || 0) + 1; Snd.fx('treasure'); setTimeout(() => b.remove(), 180); if (!document.querySelector('.hzLoot:not(.ok)')) setTimeout(() => { if (heist === hz && hz.st === 'grab') nextStage(); }, 250); }; });
  }
  const tb = document.getElementById('hzTap'); if (tb) tb.onpointerdown = (e) => { e.preventDefault(); tap(); };
}
function alarmUp() { const hz = heist; hz.alarm = Math.min(3, hz.alarm + 1); Snd.fx('wrong'); const e = document.getElementById('hzAlarm'); if (e) e.textContent = '\uD83D\uDEA8 ' + '\u25CF'.repeat(hz.alarm) + '\u25CB'.repeat(3 - hz.alarm); if (hz.alarm >= 3) { Snd.fx('alarm'); G.toast('\uD83D\uDEA8 ALARM! Grab what you can and RUN!', true); hz.si = hz.stages.length - 2; nextStage(); } }
function tap() {
  const hz = heist; if (!hz || hz.lock > 0) return;
  if (hz.st === 'laser') { const safe = Math.abs(hz.p - 0.5) > 0.3; if (safe) { hz.n++; Snd.fx('click'); } else alarmUp(); hz.lock = 0.25; }
  else if (hz.st === 'lock') { const d = Math.abs(G.ang(hz.a - hz.notch)); if (d < 0.38) { hz.n++; Snd.fx('lock'); hz.notch = hz.a + 1.5 + Math.random() * 3; hz.sp *= 1.12; } else alarmUp(); hz.lock = 0.2; }
  if (heist !== hz || hz.st === 'grab') return;
  const e = document.getElementById('hzN'); if (e) e.textContent = (hz.st === 'laser' ? 'Steps: ' : 'Clicks: ') + hz.n + ' / ' + hz.need;
  if (hz.n >= hz.need) setTimeout(() => { if (heist === hz) nextStage(); }, 200);
}
CR.tap = tap;
function heistTick(dt) {
  const hz = heist; if (!hz) return; hz.t += dt; if (hz.lock > 0) hz.lock -= dt;
  if (hz.st === 'laser') { hz.p += hz.dir * hz.sp * dt; if (hz.p > 1) { hz.p = 1; hz.dir = -1; } if (hz.p < 0) { hz.p = 0; hz.dir = 1; } const l = document.getElementById('hzLaser'); if (l) { l.style.left = (hz.p * 100) + '%'; l.classList.toggle('near', Math.abs(hz.p - 0.5) <= 0.3); } const m = document.getElementById('hzMe'); if (m) m.style.left = (50) + '%'; }
  if (hz.st === 'lock') { hz.a += hz.sp * dt; const n = document.getElementById('hzNeedle'), o = document.getElementById('hzNotch'); if (n) n.style.transform = 'rotate(' + hz.a + 'rad)'; if (o) o.style.transform = 'rotate(' + hz.notch + 'rad)'; }
  if (hz.st === 'grab') { hz.left -= dt; const e = document.getElementById('hzN'); if (e) e.textContent = '\u23F1\uFE0F ' + Math.max(0, hz.left).toFixed(1) + 's'; if (hz.left <= 0) nextStage(); }
}
function endHeist() {
  const hz = heist; heist = null; const c = crime();
  let n = 0, val = 0; for (const k in hz.got) { c.loot[k] = (c.loot[k] || 0) + hz.got[k]; n += hz.got[k]; val += GL.LOOT[k].price * hz.got[k]; }
  c.done[hz.id] = G.day(); const lv = clamp(hz.q.stars + (hz.alarm >= 3 ? 1 : 0), 1, 3);
  G.persist();
  G.doAct({ k: 'heist', id: hz.id, lv, x: GS.me.x, z: GS.me.z });
  Snd.fx('alarm');
  ovl('<div class="insBox"><div class="insFace">\uD83D\uDEA8</div><h2>' + (n ? 'You got ' + n + ' treasure' + (n > 1 ? 's' : '') + '!' : 'Empty-handed!') + '</h2><p>' + Object.keys(hz.got).map((k) => GL.LOOT[k].icon + '\u00d7' + hz.got[k]).join(' ') + (n ? ' \u00b7 worth ~' + money(val) + ' at Sid\u2019s' : '') + '</p><div class="big wantedBig">' + STARS(lv) + '</div><p class="sub"><b>The alarm is ringing! WANTED!</b> Get out of the building, then lose the cops: run, drive, hide in a bush \uD83C\uDF3F or lay low inside another building.</p><button class="btn red" data-a="crRun">RUN! \uD83C\uDFC3</button></div>');
}
H.crRun = () => { ovlClose(); };

/* ---------------- wanted + cops (host simulates; clients render) ---------------- */
CR.myWanted = () => { const S = GS.S; return S && S.wanted && S.wanted[GS.pid] ? S.wanted[GS.pid].lv : 0; };
let cops = [], copView = {}, nextCop = 1;
const copLook = (i) => ({ skin: GL.SKINS[(i * 3) % GL.SKINS.length], hair: i % 2 ? 'bun' : 'short', hc: ['#1f2937', '#a16207', '#4b5563'][i % 3], top: 'jacket', tc: '#1e3a8a', bc: '#1f2937', hat: 'police', gl: i % 3 === 2 ? 'shades' : 'none' });
G.hooks.host.push(function (pid, m, S) {
  if (m.k === 'heist') {
    const q = GL.HEISTS[m.id]; if (!q) return;
    S.robbed = S.robbed || {}; S.robbed[m.id] = S.day; S.wanted = S.wanted || {};
    const lv = clamp(Math.round(+m.lv) || 1, 1, 3), b = W.bld(q.area);
    S.wanted[pid] = { lv, cool: COOL(lv), area: q.area, t: 0, seen: 1, lx: b.out[0], lz: b.out[1] + (b.door === 'n' ? -5 : 5), spawn: 3, grace: 0, wasIn: 1 };
    G.pushEv({ type: 'alarm', pid, area: q.area, lv, by: G.playerInfo(pid).name, heist: m.id }); G.touch();
  } else if (m.k === 'gotout') { /* reserved */ }
});
function posOf(pid) {
  if (pid === GS.pid) { const C = GL.Cars, o = C && C.cur(); return { a: GS.me.area, x: GS.me.x, z: GS.me.z, car: !!o, v: o ? Math.abs(o.v || 0) : 0, hide: !!(GS.me.act && GS.me.act.kind === 'hide') }; }
  const p = GS.pos[pid]; if (!p) return null;
  const car = !!(p.c && p.c[5]) || !!p.rd; return { a: p.a, x: car && p.c ? p.c[2] : p.x, z: car && p.c ? p.c[3] : p.z, car, v: p.m ? 8 : 0, hide: p.act === 'hide' };
}
function spawnCop(pid, car) { const ps = PSTATION(); const o = { id: nextCop++, pid, car, x: car ? 34 : ps[0] + (Math.random() - 0.5) * 2, z: car ? -48 : ps[1] + 0.6, yaw: Math.PI, path: null, rp: 0, near: 0, sp: 0 }; cops.push(o); return o; }
// roads: N-S at x = R, E-W at z = R. Snap to nearest road point; path along intersections.
const R = GL.ROADS;
function roadSnap(x, z) { let b = null, bd = 1e9; R.forEach((X) => { const zz = clamp(z, -48, 48), d = Math.hypot(x - X, z - zz); if (d < bd) { bd = d; b = [X, zz]; } }); R.forEach((Z) => { const xx = clamp(x, -48, 48), d = Math.hypot(x - xx, z - Z); if (d < bd) { bd = d; b = [xx, Z]; } }); return b; }
function sameRoad(a, b) { return (Math.abs(a[0] - b[0]) < 0.5 && R.some((X) => Math.abs(a[0] - X) < 0.5)) || (Math.abs(a[1] - b[1]) < 0.5 && R.some((Z) => Math.abs(a[1] - Z) < 0.5)); }
function roadPath(x0, z0, x1, z1) {
  const s = roadSnap(x0, z0), e = roadSnap(x1, z1); if (sameRoad(s, e)) return [e];
  // via intersections: s -> corner of its segment -> ... -> e (BFS over 9 nodes)
  const nodes = W.roadNodes, segEnds = (p) => nodes.map((n, i) => i).filter((i) => sameRoad(p, [nodes[i].x, nodes[i].z]) && Math.hypot(nodes[i].x - p[0], nodes[i].z - p[1]) <= 48.1);
  const st = segEnds(s), en = new Set(segEnds(e)); const prev = {}, dist = {}; const q = [];
  st.forEach((i) => { dist[i] = Math.hypot(nodes[i].x - s[0], nodes[i].z - s[1]); prev[i] = -1; q.push(i); });
  for (let k = 0; k < 200 && q.length; k++) { q.sort((a, b) => dist[a] - dist[b]); const u = q.shift(); W.roadNbrs(u).forEach((v) => { const nd = dist[u] + 48; if (dist[v] == null || nd < dist[v]) { dist[v] = nd; prev[v] = u; q.push(v); } }); }
  let best = -1, bt = 1e9; en.forEach((i) => { if (dist[i] != null) { const t = dist[i] + Math.hypot(nodes[i].x - e[0], nodes[i].z - e[1]); if (t < bt) { bt = t; best = i; } } });
  const out = [e]; let u = best; while (u >= 0) { out.unshift([nodes[u].x, nodes[u].z]); u = prev[u]; }
  return out;
}
function stepTo(o, tx, tz, sp, dt, collide) {
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.3) { o.sp = 0; return true; }
  o.yaw += G.ang(Math.atan2(dx, dz) - o.yaw) * Math.min(1, dt * 8);
  const st = Math.min(d, sp * dt);
  if (collide) { const r = W.move(W.areas.town, o.x, o.z, dx / d * st, dz / d * st, 0.3); o.sp = Math.hypot(r[0] - o.x, r[1] - o.z) / Math.max(dt, 1e-3); o.x = r[0]; o.z = r[1]; }
  else { o.x += dx / d * st; o.z += dz / d * st; o.sp = sp; }
  return d < 0.6;
}
const PLAYER_SP = 6.4;
G.hooks.hostTick.push(function (dt, S) {
  if (!S) return; S.wanted = S.wanted || {};
  const ids = Object.keys(S.wanted);
  // remove wanted for players who left
  ids.forEach((pid) => { if (!S.players.some((p) => p.pid === pid)) delete S.wanted[pid]; });
  for (const pid of Object.keys(S.wanted)) {
    const w = S.wanted[pid], p = posOf(pid); if (!p) continue;
    // keep the right number of cops
    const mine = cops.filter((c) => c.pid === pid), foot = mine.filter((c) => !c.car).length, cars = mine.filter((c) => c.car).length;
    if (w.spawn > 0) w.spawn -= dt; else { if (foot < Math.min(w.lv, 2)) spawnCop(pid, false); if (cars < (w.lv >= 2 ? 1 : 0)) spawnCop(pid, true); }
    const inTown = p.a === 'town';
    if (inTown && w.wasIn) w.grace = 2.2; w.wasIn = inTown ? 0 : 1; if (w.grace > 0) w.grace -= dt;
    let seen = false, bust = false;
    if (inTown) {
      for (const c of mine) {
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (p.hide) { if (d < 2.6) { c.near += dt; if (c.near > 2) { bust = true; c.found = 1; } } else c.near = 0; continue; }
        if (d < (c.car ? 24 : 20) && W.los(W.areas.town, c.x, c.z, p.x, p.z, 0.25)) seen = true;
        const reach = c.car ? 3.4 : (p.car ? 2.2 : 1.35), need = c.car ? 1.2 : p.car ? 1.0 : 0.35;
        if (d < reach && w.grace <= 0 && (!p.car || p.v < 9 || c.car)) { c.near += dt; if (c.near > need) bust = true; } else c.near = Math.max(0, c.near - dt);
      }
      w.t = 0;
    } else {
      if (p.a === w.area) { w.t += dt; if (w.t > 20) bust = true; }
      else w.t = 0;
    }
    if (seen) { w.cool = COOL(w.lv); w.lx = p.x; w.lz = p.z; w.seen = 1; } else { w.seen = 0; w.cool -= dt * (inTown ? 1 : p.a === w.area ? 0 : 1.5) * (p.hide ? 1.4 : 1); }
    if (bust) { delete S.wanted[pid]; G.pushEv({ type: 'busted', pid, lv: w.lv, by: G.playerInfo(pid).name, found: mine.some((c) => c.found) ? 1 : 0 }); G.touch(); continue; }
    if (w.cool <= 0) { delete S.wanted[pid]; G.pushEv({ type: 'escaped', pid, lv: w.lv, by: G.playerInfo(pid).name }); G.touch(); continue; }
    // move cops
    const lvSp = [0, 0.86, 0.9, 0.94][w.lv] * PLAYER_SP;
    for (const c of mine) {
      const tx = inTown && seen ? p.x : w.lx, tz = inTown && seen ? p.z : w.lz;
      c.rp -= dt;
      if (c.car) {
        if (c.rp <= 0 || !c.path) { c.rp = 1; c.path = roadPath(c.x, c.z, tx, tz); const sn = roadSnap(tx, tz); if (Math.hypot(sn[0] - tx, sn[1] - tz) < 9) c.path.push([tx, tz]); }
        const pt = c.path[0]; if (pt) { const close = Math.hypot(c.x - p.x, c.z - p.z) < 10; if (stepTo(c, pt[0], pt[1], close ? 9 : 14.5, dt, false)) c.path.shift(); }
      } else {
        const d = Math.hypot(tx - c.x, tz - c.z);
        if (c.rp <= 0 || !c.path) { c.rp = 0.9; c.path = d < 12 && W.los(W.areas.town, c.x, c.z, tx, tz, 0.3) ? [[tx, tz]] : W.navPath(c.x, c.z, tx, tz); }
        const pt = c.path[0]; if (pt) { if (stepTo(c, pt[0], pt[1], d < 2 && !seen ? 2 : lvSp, dt, true)) c.path.shift(); }
        else if (!seen) { c.path = [[w.lx + (Math.random() - 0.5) * 10, w.lz + (Math.random() - 0.5) * 10]]; }
      }
    }
  }
  // cops whose target is gone walk off
  cops = cops.filter((c) => S.wanted[c.pid]);
  render(cops.map((c) => [c.id, +c.x.toFixed(2), +c.z.toFixed(2), +c.yaw.toFixed(2), c.car ? 1 : 0, c.sp > 0.3 ? 1 : 0]), dt, true);
});
G.hooks.mob.push((mob) => { const S = GS.S; mob.cops = cops.map((c) => [c.id, +c.x.toFixed(2), +c.z.toFixed(2), +c.yaw.toFixed(2), c.car ? 1 : 0, c.sp > 0.3 ? 1 : 0]); mob.w = {}; if (S && S.wanted) for (const k in S.wanted) { const w = S.wanted[k]; mob.w[k] = [w.lv, Math.ceil(w.cool), w.seen, Math.ceil(20 - w.t)]; } });
G.hooks.tick.push(function (dt) {
  heistTick(dt);
  if (jail) jailTick(dt);
  if (GS.role === 'client') { const m = GS.mob || {}; render(Array.isArray(m.cops) ? m.cops : [], dt, false); }
  // heist labels + robbed displays
  const A = W.cur; if (!A) return;
  if (A.loot) for (const id in A.loot) A.loot[id].visible = !robbed(id);
  for (const h of A.hots) { if (h.kind === 'heist') h.label = crime().on && !robbed(h.heist) ? 'HEIST' : 'LOOK'; }
});
function render(list, dt, local) {
  const live = {}, town = W.areas.town;
  list.forEach((q) => {
    if (!Array.isArray(q)) return; const id = q[0]; live[id] = 1; let v = copView[id];
    if (!v) { if (q[4]) { const m = GL.Cars.makeCar('police', null, q[1], q[2], q[3]); v = copView[id] = { car: m, x: q[1], z: q[2], yaw: q[3] }; } else { const ch = MD.avatar(copLook(id)); town.g.add(ch.g); v = copView[id] = { ch, x: q[1], z: q[2], yaw: q[3] }; } }
    const k = local ? 1 : 1 - Math.exp(-dt * 10); v.x += (q[1] - v.x) * k; v.z += (q[2] - v.z) * k; v.yaw += G.ang(q[3] - v.yaw) * k;
    if (v.car) { v.car.x = v.car.x != null ? v.x : v.x; v.car.z = v.z; v.car.yaw = v.yaw; GL.Cars.placeCar(v.car); if (v.car.m.siren) v.car.m.siren.forEach((s, i) => { s.visible = Math.floor(W.time * 4 + i) % 2 === 0; }); }
    else { v.ch.g.position.set(v.x, 0, v.z); v.ch.g.rotation.y = v.yaw; v.ch.anim(dt, q[5] ? 5.5 : 0); }
  });
  for (const id in copView) if (!live[id]) { const v = copView[id]; if (v.car) GL.Cars.killCar(v.car); else town.g.remove(v.ch.g); delete copView[id]; }
}
G.extraBlockers = (function (prev) { return function (arr) { if (prev) prev(arr); for (const id in copView) { const v = copView[id]; arr.push([v.x, v.z]); } }; })(G.extraBlockers);
let sirenT = 0;
G.hooks.tick.push((dt) => { sirenT -= dt; if (sirenT <= 0) { sirenT = 1.2; if (W.cur && W.cur.id === 'town' && Object.values(copView).some((v) => v.car && Math.hypot(v.x - GS.me.x, v.z - GS.me.z) < 40)) Snd.fx('siren'); } });

/* ---------------- events: alarm / busted / escaped ---------------- */
G.hooks.ev.push(function (e) {
  if (e.type === 'alarm') { if (e.pid === GS.pid) G.toast('\uD83D\uDEA8 WANTED ' + STARS(e.lv) + ' \u2014 get out and lose the cops!', true); else G.toast('\uD83D\uDEA8 Alarm at the ' + W.bld(e.area).name + '! ' + e.by + ' is on the run!'); }
  if (e.type === 'busted') { if (e.pid === GS.pid) busted(e.lv, e.found); else G.toast('\uD83D\uDE94 ' + e.by + ' got busted! Off to cartoon jail.'); }
  if (e.type === 'escaped') { if (e.pid === GS.pid) { const c = crime(); c.escapes = (c.escapes || 0) + 1; G.persist(); Snd.fx('cheer'); G.toast('\uD83D\uDE0E You lost the cops! Wanted level cleared. Sell your loot to Sid.'); } else G.toast('\uD83D\uDE0E ' + e.by + ' got away!'); }
});
function busted(lv, found) {
  const c = crime(), s = sv();
  if (GS.work && GL.Work) GL.Work.abort(true);
  const C = GL.Cars; if (C) { const o = C.cur(); if (o && C.workObj() === o) C.endWork(o.x, o.z); else if (o) C.act({ kind: 'exit' }); if (GS.me.ride) C.act({ kind: 'unride' }); }
  if (GS.me.act) G.endAct(true); G.closePanel(); if (heist) { heist = null; } ovlClose();
  const lost = Object.keys(c.loot).reduce((m, k) => m + c.loot[k], 0); c.loot = {}; c.busts = (c.busts || 0) + 1;
  const fine = GL.FINE * lv; let fineTxt;
  if (s.money >= fine) { s.money -= fine; fineTxt = 'Fine: ' + money(fine) + ' paid.'; } else { GL.Health.addBill('Police fine', fine - s.money); fineTxt = 'Fine: ' + money(fine) + ' (' + money(s.money) + ' paid, the rest became a bill).'; s.money = 0; }
  G.persist(); Snd.fx('siren');
  jail = { t: GL.JAIL_SECS * lv, fish: 0 };
  G.travel('police', true, [-5, 1]);
  ovl('<div class="insBox jail"><div class="bars"></div><div class="insFace">\uD83D\uDE94</div><h2>BUSTED!</h2><p>' + (found ? 'Officer Penny: \u201CNice bush. I could see your shoes.\u201D' : 'Officer Penny: \u201CGotcha! Nice try, sneaky.\u201D') + '</p><p class="sub">' + (lost ? 'Your loot (' + lost + ') went back where it belongs. ' : '') + esc(fineTxt) + '</p><div class="big" id="jailT">' + Math.ceil(jail.t) + 's</div><p class="sub small">Cartoon jail time! Pass the time with a round of Go Fish:</p><button class="btn blue" data-a="goFish">\uD83C\uDCCF GO FISH! (<span id="fishN">0</span>)</button></div>');
}
CR.busted = busted;
H.goFish = () => { if (!jail) return; jail.fish++; const e = document.getElementById('fishN'); if (e) e.textContent = jail.fish; Snd.fx(Math.random() < 0.3 ? 'catch' : 'click'); if (Math.random() < 0.3) G.toast(['\uD83D\uDC1F Officer Penny: \u201CGot any 7s?\u201D', '\uD83C\uDCCF \u201CGo fish!\u201D', '\uD83D\uDE04 You win a round!'][Math.floor(Math.random() * 3)]); jail.t = Math.max(0, jail.t - 0.4); G.need('f', 1); };
function jailTick(dt) {
  jail.t -= dt; const e = document.getElementById('jailT'); if (e) e.textContent = Math.ceil(Math.max(0, jail.t)) + 's';
  if (jail.t <= 0) { jail = null; ovlClose(); G.travel('town', false, PSTATION()); setTimeout(() => G.toast('\uD83D\uDEB6 You\u2019re free! Maybe stick to the legal stuff\u2026 or not. Your call!'), 600); }
}
G.statusParts.push(() => {
  const S = GS.S; let w = S && S.wanted && S.wanted[GS.pid]; if (!w && !jail) return '';
  if (jail) return '<span class="spill red">\uD83D\uDE94 Jail ' + Math.ceil(jail.t) + 's</span>';
  const m = GS.role === 'client' ? (GS.mob && GS.mob.w && GS.mob.w[GS.pid]) : [w.lv, Math.ceil(w.cool), w.seen, Math.ceil(20 - w.t)];
  if (!m) return '<span class="spill red wanted">\uD83D\uDEA8 ' + STARS(w.lv) + '</span>';
  const inRobbed = GS.me.area === w.area;
  return '<span class="spill red wanted">\uD83D\uDEA8 ' + STARS(m[0]) + ' ' + (inRobbed ? '\u23F1\uFE0F GET OUT! ' + Math.max(0, m[3]) + 's' : m[2] ? '\uD83D\uDC40 SPOTTED' : '\uD83E\uDD2B ' + m[1] + 's') + '</span>';
});

/* ---------------- hiding ---------------- */
G.hooks.kinds.hide = function (h) {
  G.startAct({ kind: 'hide', x: h.hx, z: h.hz, yaw: 0, name: 'Hiding in the ' + h.name, stopLabel: 'COME OUT' });
  W.fx('sparkle', h.hx, 1.2, h.hz, 1, 0.6); Snd.fx('scrub');
  G.toast(CR.myWanted() ? '\uD83C\uDF3F Shhh\u2026 you\u2019re hiding. Wait for the cops to give up!' : '\uD83C\uDF3F You hide in the bush. Shhh! (Great for hide & seek.)');
};
CR.vehicles = () => Object.keys(copView).filter((id) => copView[id].car).map((id) => ({ key: 'cop' + id, o: copView[id].car }));
CR._st = () => ({ heist, jail, cops: cops.length, view: Object.keys(copView).length });
G.hooks.reset.push(() => { cops = []; render([], 0, true); heist = null; jail = null; ovlClose(); });
})();
