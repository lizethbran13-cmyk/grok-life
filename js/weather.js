/* Grok Life - weather (sunny, cloudy, rain, thunderstorms, wind, fog, snow) + cartoon disasters:
   floods, hurricanes, hail, power outages, a money bandit on the loose, and a (totally-everyone-is-fine) plane crash.
   The HOST decides weather + disasters (GS.S.wx / GS.S.dis); everybody sees the same thing. Kid-friendly: no one ever gets badly hurt.
   Test hooks: GL.Weather.setWeather('storm'), GL.Weather.trigger('flood'|'hurricane'|'hail'|'outage'|'bandit'|'plane'), GL.Weather.resolve(). */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd, UI = GL.UI, T = window.THREE;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money, clamp = GL.clamp;
const WX = GL.Weather = {};
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
G.statusParts = G.statusParts || [];
WX.rand = Math.random;
const rnd = () => WX.rand();

/* ---------------- weather kinds ---------------- */
const KINDS = {
  sunny: { icon: '\u2600\uFE0F', night: '\uD83C\uDF19', name: 'Sunny', dark: 0, w: 4 },
  cloudy: { icon: '\u26C5', night: '\u2601\uFE0F', name: 'Cloudy', dark: 0.18, w: 3 },
  rain: { icon: '\uD83C\uDF27\uFE0F', name: 'Rainy', dark: 0.32, wet: 1, w: 2 },
  storm: { icon: '\u26C8\uFE0F', name: 'Thunderstorm', dark: 0.5, wet: 1, storm: 1, w: 1 },
  windy: { icon: '\uD83C\uDF2C\uFE0F', name: 'Windy', dark: 0.06, wind: 0.7, w: 1.4 },
  fog: { icon: '\uD83C\uDF2B\uFE0F', name: 'Foggy', dark: 0.2, fog: 1, w: 1 },
  snow: { icon: '\uD83C\uDF28\uFE0F', name: 'Snowy', dark: 0.18, snow: 1, w: 0.7 }
};
WX.KINDS = KINDS;
const TIPS = {
  sunny: 'Great day to be outside!', cloudy: 'A little gray, still nice.', rain: 'Roads are slippery \u2014 drive slow. Grab an \u2602\uFE0F umbrella at Fresh Mart!',
  storm: 'Lightning! Most people head indoors. Roads are slippery.', windy: 'Hold on to your hat! The wind gives you a little push.',
  fog: 'Hard to see far. Drive carefully!', snow: 'Snowy roads are icy \u2014 braking takes longer!'
};
const DIS = {
  flood: { icon: '\uD83C\uDF0A', name: 'FLOOD', alert: 'Flood warning! Water is rising on Lower Maple Street (south road). Stay out of the water \u2014 or help place sandbags!' },
  hurricane: { icon: '\uD83C\uDF00', name: 'HURRICANE', alert: 'Hurricane Grok is about to make landfall! Get indoors and take shelter!' },
  hail: { icon: '\uD83E\uDDCA', name: 'HAILSTORM', alert: 'Hail is falling! Take cover indoors (an umbrella helps). Cars may get dented.' },
  outage: { icon: '\uD83D\uDD0C', name: 'POWER OUTAGE', alert: 'The power is out across Grokville! Shops are closed. Help the lineworkers fix the transformer!' },
  bandit: { icon: '\uD83D\uDCB0', name: 'MONEY BANDIT', alert: 'A money bandit robbed Grok Bank and is on the loose! He\u2019s dropping cash everywhere. Catch him for a $150 reward!' },
  plane: { icon: '\u2708\uFE0F', name: 'PLANE CRASH', alert: 'A small plane made a rough landing in Maple Park! Everyone is okay but dizzy. Help the passengers!' }
};
WX.DIS = DIS;
const FREQ = { off: 0, rare: 0.03, normal: 0.07, chaos: 0.3 };
const GAP = { off: 9999, rare: 360, normal: 240, chaos: 60 };
const ESSENTIAL = { hospital: 1, clinic: 1, police: 1, fire: 1, shelter: 1, vet: 1 };
const EMERG_JOBS = { doctor: 1, fire: 1, police: 1, mechanic: 1, vet: 1, animalcontrol: 1 };
const FLOOD = { x0: -62, x1: 62, z0: 41, z1: 55 }; // Lower Maple Street (the low road in the south)
const abs = () => G.day() * 1440 + G.clock();
const S_ = () => GS.S || {};
const host = () => GS.role !== 'client';
const inTown = () => !!(W.cur && W.cur.id === 'town');
const onFoot = () => !(GL.Cars && GL.Cars.driving && GL.Cars.driving());
const has = (id) => !!(sv().bag && sv().bag[id] > 0);

/* ---------------- shared state (host decides) ---------------- */
function pick(prev) {
  const h = (G.clock() / 60) % 24, ws = {}; let tot = 0;
  for (const k in KINDS) { let w = KINDS[k].w; if (k === prev) w *= 0.5; if (k === 'fog' && (h < 6 || h > 11)) w *= 0.4; if (prev === 'storm' && k === 'rain') w += 2; if (prev === 'rain' && k === 'storm') w += 1; ws[k] = w; tot += w; }
  let r = rnd() * tot; for (const k in ws) { r -= ws[k]; if (r <= 0) return k; } return 'sunny';
}
function initWx(S) {
  const t = abs(); S.wx = { k: 'sunny', until: t + 120 + Math.floor(rnd() * 120), fc: [] };
  fillFc(S.wx);
}
function fillFc(wx) { while (wx.fc.length < 4) { const last = wx.fc.length ? wx.fc[wx.fc.length - 1] : { k: wx.k, at: wx.until - 180 }, at = wx.fc.length ? last.at + 120 + Math.floor(rnd() * 120) : wx.until; wx.fc.push({ k: pick(last.k), at }); } }
function curK() { const S = S_(), d = S.dis; if (d && (d.type === 'hurricane')) return 'storm'; if (d && d.type === 'flood' && d.ph !== 'recede' && !(S.wx && S.wx.k === 'storm')) return 'rain'; return (S.wx && KINDS[S.wx.k]) ? S.wx.k : 'sunny'; }
WX.kind = curK;
WX.dis = () => (S_().dis || null);
const freq = () => (FREQ[sv().disFreq] != null ? sv().disFreq : 'normal');
WX.freq = freq;

G.hooks.hostTick.push(function (dt, S) {
  if (!S.wx || !KINDS[S.wx.k]) initWx(S);
  const t = abs(), wx = S.wx;
  if (t >= wx.until && !wx.hold) {
    const n = wx.fc.shift() || { k: pick(wx.k) }; wx.k = n.k; wx.until = wx.fc.length ? wx.fc[0].at : t + 180; if (wx.until <= t) wx.until = t + 120; fillFc(wx); G.touch();
    G.pushEv({ type: 'wxChange', k: wx.k });
  }
  if (wx.hold && t >= wx.until) { wx.hold = 0; }
  S.disFreq = freq();
  if (S.disNext == null) S.disNext = t + 180;
  if (S.dis) disHost(dt, S);
  else if (S.disFreq !== 'off') {
    const hr = Math.floor(t / 60);
    if (S.disHr == null) S.disHr = hr;
    if (hr !== S.disHr) { S.disHr = hr; if (t >= S.disNext && rnd() < FREQ[S.disFreq]) startDis(S, randomDis(S)); }
  }
});
function randomDis() {
  const k = curK(), list = ['outage', 'bandit', 'plane', 'hail'];
  if (k === 'rain' || k === 'storm') list.push('flood', 'flood', 'hurricane', 'hail'); else list.push('flood', 'hurricane');
  if (k === 'storm' || k === 'windy') list.push('outage', 'hurricane');
  return list[Math.floor(rnd() * list.length)];
}
const free = (x, z, r) => { const f = W.freeNear(W.areas.town, x, z, r || 0.8); return [+f[0].toFixed(2), +f[1].toFixed(2)]; };
function startDis(S, type) {
  if (!DIS[type]) return false;
  const d = { type, ph: '', t: 0, id: (S.disId = (S.disId || 0) + 1) };
  if (type === 'flood') { d.ph = 'rise'; d.bags = [[-40, 42.4], [-15, 42.4], [15, 42.4], [40, 42.4]].map((q) => free(q[0], q[1], 0.6).concat(0)); }
  else if (type === 'hurricane') { d.ph = 'warn'; d.piles = [[-30, -23], [20, -4], [-10, 44], [44, 24], [-50, 2]].map((q) => free(q[0], q[1], 1).concat(0)); }
  else if (type === 'hail') d.ph = 'hit';
  else if (type === 'outage') { d.ph = 'out'; d.fix = 0; d.tf = free(4, -48, 1); }
  else if (type === 'bandit') { const b = W.bld('bank'), o = b ? b.out : [-15, -4]; d.ph = 'run'; d.cash = []; d.cid = 0; bandit = { x: o[0], z: o[1], yaw: 0, path: null, pi: 0, dropT: 2, restT: 6, stuck: 0 }; }
  else if (type === 'plane') { d.ph = 'fly'; d.site = free(-34, 38, 3); d.pax = [[-3, 2], [3, 2.5], [-2.5, -3], [3, -3]].map((q) => free(d.site[0] + q[0], d.site[1] + q[1], 0.5).concat(0)); }
  S.dis = d; G.pushEv({ type: 'disStart', kind: type }); G.touch(); return true;
}
function phase(S, ph, ev) { S.dis.ph = ph; S.dis.t = 0; G.pushEv(Object.assign({ type: 'disPhase', kind: S.dis.type, ph }, ev || {})); G.touch(); }
function endDis(S, ok, msg) {
  const d = S.dis; if (!d) return; S.dis = null; S.disLast = { type: d.type, at: abs() }; S.disNext = abs() + GAP[S.disFreq || 'normal']; bandit = null;
  G.pushEv({ type: 'disEnd', kind: d.type, ok: ok ? 1 : 0, msg: msg || '' }); G.touch();
}
let bandit = null, syncT = 0;
const pay = (pid, amt, msg) => G.pushEv({ type: 'wxPay', pid, amt, msg });
function disHost(dt, S) {
  const d = S.dis; d.t += dt; syncT -= dt; if (syncT <= 0) { syncT = 1; G.touch(); }
  if (d.type === 'flood') {
    const bags = d.bags.filter((b) => b[2]).length;
    if (d.ph === 'rise' && d.t > 15) phase(S, 'peak');
    else if (d.ph === 'peak' && d.t > 75 - bags * 15) phase(S, 'recede');
    else if (d.ph === 'recede' && d.t > 12) endDis(S, 1, bags ? 'The flood water drained away. Thanks for the sandbags, heroes! \uD83E\uDDF1' : 'The flood water drained away. Phew!');
  } else if (d.type === 'hurricane') {
    if (d.ph === 'warn' && d.t > 20) phase(S, 'hit');
    else if (d.ph === 'hit' && d.t > 45) phase(S, 'after');
    else if (d.ph === 'after' && (d.piles.every((p) => p[2]) || d.t > 150)) endDis(S, 1, 'Hurricane Grok is gone and the town is cleaned up. Great teamwork! \uD83E\uDDF9');
  } else if (d.type === 'hail') { if (d.t > 45) endDis(S, 1, 'The hail stopped. Check your car for dents!'); }
  else if (d.type === 'outage') { if (d.fix >= 3 || d.t > 100) endDis(S, 1, d.fix >= 3 ? 'Power is back on! You helped fix the transformer. \uD83D\uDCA1' : 'The lineworkers got the power back on! \uD83D\uDCA1'); }
  else if (d.type === 'bandit') { banditHost(dt, S); if (S.dis && d.t > 110) endDis(S, 0, 'The money bandit got away\u2026 this time! \uD83D\uDCA8'); }
  else if (d.type === 'plane') {
    if (d.ph === 'fly' && d.t > 7) phase(S, 'down');
    else if (d.ph === 'down' && (d.pax.every((p) => p[2]) || d.t > 130)) endDis(S, 1, 'Everyone from Grok Air flight 7 is safe and sound! \uD83E\uDDE1');
  }
}
function banditHost(dt, S) {
  const d = S.dis, b = bandit || (bandit = { x: -15, z: -4, yaw: 0, path: null, pi: 0, dropT: 2, restT: 6, stuck: 0 }), A = W.areas.town;
  b.restT -= dt;
  if (b.restT < 0) { if (b.restT < -1.6) b.restT = 5 + rnd() * 3; b.sp = 0; } // stops to count his cash (your chance!)
  else {
    if (!b.path || b.pi >= b.path.length || b.stuck > 0.8) { const R = GL.ROADS, tx = R[Math.floor(rnd() * 3)] + (rnd() - 0.5) * 6, tz = (rnd() - 0.5) * 90; b.path = W.navPath(b.x, b.z, tx, tz) || [[tx, tz]]; b.pi = 0; b.stuck = 0; }
    const p = b.path[b.pi], dx = p[0] - b.x, dz = p[1] - b.z, dd = Math.hypot(dx, dz);
    if (dd < 0.8) b.pi++;
    else { const sp = 5.0, r = W.move(A, b.x, b.z, dx / dd * sp * dt, dz / dd * sp * dt, 0.35); const mv = Math.hypot(r[0] - b.x, r[1] - b.z); b.stuck = mv < sp * dt * 0.3 ? b.stuck + dt : 0; b.x = r[0]; b.z = r[1]; b.yaw = Math.atan2(dx, dz); b.sp = sp; }
  }
  b.dropT -= dt;
  if (b.dropT <= 0) { b.dropT = 4; if (d.cash.length < 10) { d.cash.push([++d.cid, +b.x.toFixed(2), +b.z.toFixed(2)]); G.touch(); } }
}
WX.bandit = () => { const S = S_(); if (!S.dis || S.dis.type !== 'bandit') return null; if (host()) return bandit; const m = GS.mob && GS.mob.bandit; return Array.isArray(m) ? { x: m[0], z: m[1], yaw: m[2], sp: m[3] } : null; };
G.hooks.mob.push((mob) => { if (bandit) mob.bandit = [+bandit.x.toFixed(2), +bandit.z.toFixed(2), +bandit.yaw.toFixed(2), bandit.sp ? 1 : 0]; });

// player actions -> host
G.hooks.host.push(function (pid, m, S) {
  if (m.k !== 'wx') return; const d = S.dis, w = m.what;
  if (w === 'freq') { return; }
  if (!d) return;
  const i = Math.floor(+m.i);
  if (w === 'sand' && d.type === 'flood' && d.bags[i] && !d.bags[i][2] && d.ph !== 'recede') { d.bags[i][2] = 1; pay(pid, 40, '\uD83E\uDDF1 Sandbags placed! The town pays you ' + money(40) + '.'); G.touch(); }
  else if (w === 'pile' && d.type === 'hurricane' && d.ph === 'after' && d.piles[i] && !d.piles[i][2]) { d.piles[i][2] = 1; pay(pid, 30, '\uD83E\uDDF9 Debris cleaned up! +' + money(30)); G.touch(); }
  else if (w === 'fix' && d.type === 'outage' && d.fix < 3) { d.fix++; pay(pid, 25, '\uD83D\uDD27 You helped the lineworkers (' + d.fix + '/3)! +' + money(25)); G.touch(); }
  else if (w === 'cash' && d.type === 'bandit') { const k = d.cash.findIndex((c) => c[0] === i); if (k >= 0) { d.cash.splice(k, 1); pay(pid, 10, '\uD83D\uDCB5 You returned dropped cash \u2014 Grok Bank tips you ' + money(10) + '!'); G.touch(); } }
  else if (w === 'catch' && d.type === 'bandit') { const nm = G.playerInfo(pid).name; pay(pid, 150, '\uD83D\uDC6E You caught the money bandit! Reward: ' + money(150) + '!'); endDis(S, 1, nm + ' caught the money bandit! \uD83C\uDF89'); }
  else if (w === 'team' && d.type === 'bandit') {
    const nm = G.playerInfo(pid).name; pay(pid, 120, '\uD83D\uDE0E You split the loot with the bandit: +' + money(120) + '. The cops saw that\u2026');
    S.wanted = S.wanted || {}; const W_ = S.wanted[pid], x = clamp(+m.x || 0, -62, 62), z = clamp(+m.z || 0, -82, 82);
    if (W_) { W_.lv = Math.min(3, W_.lv + 1); W_.cool = 8 + 6 * W_.lv; W_.lx = x; W_.lz = z; W_.seen = 1; } else S.wanted[pid] = { lv: 1, cool: 14, area: 'town', t: 0, seen: 1, lx: x, lz: z, spawn: 3, grace: 0, wasIn: 0 };
    G.pushEv({ type: 'hitrun', pid, lv: S.wanted[pid].lv, by: nm }); endDis(S, 0, 'The money bandit vanished with a partner in crime\u2026 \uD83D\uDE0E');
  }
  else if (w === 'pax' && d.type === 'plane' && d.ph === 'down' && d.pax[i] && !d.pax[i][2]) { d.pax[i][2] = 1; pay(pid, 50, '\uD83E\uDDE1 You helped a dizzy passenger to the ambulance! +' + money(50)); G.touch(); }
});

/* ---------------- events (everyone) ---------------- */
let alertT = 0;
G.hooks.ev.push(function (e) {
  if (e.type === 'disStart' && DIS[e.kind]) {
    const D = DIS[e.kind]; Snd.fx('eas'); setTimeout(() => Snd.fx('siren'), 1400); alertT = 6;
    if (G.notify) G.notify('weather', '\uD83D\uDEA8', 'EMERGENCY ALERT \u00b7 ' + D.name, D.alert); else G.toast('\uD83D\uDEA8 ' + D.alert, true);
    if (e.kind === 'outage') Snd.fx('clank');
  } else if (e.type === 'disPhase') {
    if (e.kind === 'hurricane' && e.ph === 'hit') { Snd.fx('wind'); G.toast('\uD83C\uDF00 Hurricane Grok made LANDFALL! Get inside! Outside, the wind will push you around.', true); }
    if (e.kind === 'hurricane' && e.ph === 'after') {
      G.toast('\uD83C\uDF00 The hurricane passed. Tap the debris piles to CLEAN UP (+$30 each).');
      if (G.inGame && G.inGame() && GL.Health && GL.Health.addBill) { GL.Health.addBill('\uD83C\uDF00 Hurricane repairs (roof shingles + fence)', 50); setTimeout(() => G.toast('\uD83D\uDCEC Storm damage at home: $50 repair bill. Call Gary in \uD83E\uDE7A Health \u2192 bills (insurance might help!).'), 2600); }
    }
    if (e.kind === 'flood' && e.ph === 'recede') G.toast('\uD83C\uDF0A The flood water is going down!');
    if (e.kind === 'plane' && e.ph === 'down') { Snd.fx('bump'); setTimeout(() => Snd.fx('siren'), 600); G.toast('\u2708\uFE0F BUMP! The plane landed rough in Maple Park. Fire truck + ambulance on the way!', true); }
  } else if (e.type === 'disEnd') { Snd.fx(e.ok ? 'level' : 'no'); G.toast((DIS[e.kind] ? DIS[e.kind].icon + ' ' : '') + (e.msg || 'All clear!')); if (G.notify) G.notify('weather', '\u2705', 'ALL CLEAR', e.msg || 'The emergency is over.'); }
  else if (e.type === 'wxPay' && e.pid === GS.pid) { G.addMoney(e.amt, 'earn'); Snd.fx('cash'); G.toast(e.msg); }
  else if (e.type === 'wxChange' && KINDS[e.k]) { if (e.k === 'storm' || e.k === 'snow' || e.k === 'rain') G.toast(KINDS[e.k].icon + ' Weather: ' + KINDS[e.k].name + '. ' + TIPS[e.k]); }
});

/* ---------------- gameplay hooks ---------------- */
G.stormy = () => { const k = curK(), d = S_().dis; return k === 'storm' || !!(d && (d.type === 'hail' || (d.type === 'hurricane' && d.ph !== 'after') || d.type === 'flood')); };
G.wxIcon = () => { const K = KINDS[curK()]; return W.isNight(G.clock()) && K.night ? K.night : K.icon; };
const inFlood = (x, z) => x > FLOOD.x0 && x < FLOOD.x1 && z > FLOOD.z0 && z < FLOOD.z1;
let lvl = 0; // local flood water level 0..1
WX.level = () => lvl;
function floodTarget() { const d = S_().dis; if (!d || d.type !== 'flood') return 0; return d.ph === 'rise' ? clamp(d.t / 15, 0, 1) : d.ph === 'peak' ? 1 : clamp(1 - d.t / 12, 0, 1); }
WX.wading = () => inTown() && lvl > 0.25 && inFlood(GS.me.x, GS.me.z);
G.speedMul = (function (prev) { return () => (prev ? prev() : 1) * (WX.wading() && onFoot() ? 0.5 : 1); })(G.speedMul);
G.carGrip = (function (prev) {
  return function (o) {
    let g = prev ? prev(o) : 1; const k = curK();
    if (k === 'rain' || k === 'storm') g *= 0.6; else if (k === 'snow') g *= 0.45;
    if (inTown() && lvl > 0.3 && inFlood(o.x, o.z)) { g *= 0.5; if (Math.abs(o.v) > 4) o.v = Math.sign(o.v) * 4; }
    return g;
  };
})(G.carGrip);
WX.grip = () => (G.carGrip ? G.carGrip({ x: 999, z: 999, v: 0 }) : 1);
G.emergencyBonus = (cid) => { const S = S_(); if (!EMERG_JOBS[cid]) return false; return !!(S.dis || (S.disLast && abs() - S.disLast.at < 120)); };
G.closedWhy = (id) => (WX.outage() && !ESSENTIAL[id] ? '\uD83D\uDD0C Power outage! ' + ((W.bld(id) || {}).name || 'This place') + ' is closed until the power comes back.' : null);
WX.outage = () => { const d = S_().dis; return !!(d && d.type === 'outage'); };
const isOpen0 = W.isOpen;
W.isOpen = function (id, min) { if (WX.outage() && !ESSENTIAL[id] && W.bld(id)) return false; return isOpen0(id, min); };

/* ---------------- visuals ---------------- */
let tex = null;
function dropTex() { if (tex) return tex; const c = document.createElement('canvas'); c.width = 16; c.height = 64; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(6, 0, 4, 64); tex = new T.CanvasTexture(c); return tex; }
function pts(n, col, size, op, streak) {
  const g = new T.BufferGeometry(), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - 0.5) * 60; a[i * 3 + 1] = Math.random() * 24; a[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  g.setAttribute('position', new T.BufferAttribute(a, 3));
  const p = new T.Points(g, new T.PointsMaterial({ color: col, size, transparent: true, opacity: op, depthWrite: false, map: streak && dropTex() })); p.frustumCulled = false; p.visible = false; W.scene.add(p); return p;
}
let PT = null;
function particles() { if (!PT) PT = { rain: pts(1800, '#e0ecff', 0.55, 0.85, true), snow: pts(900, '#ffffff', 0.22, 0.9), hail: pts(500, '#e0f2fe', 0.2, 0.95), debris: pts(160, '#7c4a1d', 0.35, 1) }; return PT; }
function fall(p, vy, vx, dt) {
  const a = p.geometry.attributes.position.array, c = W.camLook || { x: 0, z: 0 };
  for (let i = 0; i < a.length; i += 3) { a[i + 1] -= vy * dt * (0.8 + (i % 7) * 0.05); a[i] += vx * dt; if (a[i + 1] < 0) { a[i + 1] = 18 + Math.random() * 6; a[i] = (Math.random() - 0.5) * 60; a[i + 2] = (Math.random() - 0.5) * 60; } if (a[i] > 30) a[i] -= 60; else if (a[i] < -30) a[i] += 60; }
  p.position.set(c.x, 0, c.z); p.geometry.attributes.position.needsUpdate = true;
}
let flashEl = null, flashT = 0, boltT = 8, rainT = 0, soakT = 0, soakTold = false;
function flash() { if (!flashEl) { flashEl = document.createElement('div'); flashEl.id = 'wxFlash'; document.body.appendChild(flashEl); } flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on'); flashT = 0.25; setTimeout(() => Snd.fx('thunder'), 300 + Math.random() * 900); }
WX.flash = flash;
// tint the sky + lights after the normal day/night clock
const GREY = new T.Color('#64748b'), NGREY = new T.Color('#0f172a');
const setClock0 = W.setClock;
let wasOut = false;
W.setClock = function (min) {
  setClock0(min);
  const A = W.cur; if (!A) return;
  const out = WX.outage();
  if (!A.outdoor) { if (out && !ESSENTIAL[A.id]) { W.hemi.intensity = 0.38; W.sun.intensity = 0.22; } return; }
  const k = curK(), K = KINDS[k], d = S_().dis, dark = clamp(K.dark + (d && d.type === 'hurricane' && d.ph !== 'after' ? 0.2 : 0) + (d && d.type === 'hail' ? 0.15 : 0), 0, 0.75), night = W.isNight(min);
  if (dark > 0) { W.hemi.intensity *= 1 - dark * 0.75; W.sun.intensity *= 1 - dark * 0.9; if (W.scene.background && W.scene.background.isColor) { W.scene.background.lerp(night ? NGREY : GREY, dark); if (W.scene.fog) W.scene.fog.color.copy(W.scene.background); } }
  if (flashT > 0) { W.hemi.intensity += flashT * 4; }
  if (W.scene.fog && A.fog) { const fogNow = k === 'fog' || (d && d.type === 'hurricane' && d.ph === 'hit'); W.scene.fog.near = fogNow ? 4 : A.fog[0]; W.scene.fog.far = fogNow ? 34 : (k === 'rain' || k === 'storm' || k === 'snow') ? 95 : A.fog[1]; }
  if (out && night) { W.lampMat.emissive.set('#000000'); W.winMat.emissive.set('#000000'); W.winMat.color.set('#334155'); W.glowMat.visible = false; W.glowSprites.forEach((s) => { s.visible = false; }); W.hemi.intensity *= 0.7; wasOut = true; }
  else if (wasOut) { wasOut = false; W._night = null; setClock0(min); }
};

/* ---------------- disaster props (built locally from the synced state) ---------------- */
let props = null; // {id, type, g, ...}
function clearProps() {
  if (!props) return; W.areas.town.g.remove(props.g);
  if (props.cars) props.cars.forEach((c) => c && c.o && GL.Cars.killCar(c.o));
  if (props.cop) GL.Cars.killCar(props.cop);
  props = null;
}
function label(txt, bg) { return W.textSprite(txt, { size: 30, h: 0.42, bg: bg || 'rgba(17,24,39,.88)' }); }
function buildProps(d) {
  clearProps(); const g = new T.Group(); W.areas.town.g.add(g); props = { id: d.id, type: d.type, g, items: [] };
  if (d.type === 'flood') {
    const m = new T.Mesh(new T.PlaneGeometry(FLOOD.x1 - FLOOD.x0, FLOOD.z1 - FLOOD.z0), new T.MeshLambertMaterial({ color: '#3b82f6', transparent: true, opacity: 0.6, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.05, (FLOOD.z0 + FLOOD.z1) / 2); g.add(m); props.water = m;
    d.bags.forEach((b) => { const s = MD.grp(g, b[0], 0, b[1]); const pile = MD.grp(s); for (let i = 0; i < 5; i++) MD.ell(0.42, 0.2, 0.28, '#d6b981', pile, (i % 3 - 1) * 0.75, 0.2 + (i > 2 ? 0.36 : 0), 0); const mk = label('\uD83E\uDDF1 SANDBAGS'); mk.position.set(0, 1.6, 0); s.add(mk); props.items.push({ s, pile, mk }); });
  } else if (d.type === 'hurricane') {
    d.piles.forEach((p) => { const s = MD.grp(g, p[0], 0, p[1]); MD.box(1.6, 0.3, 0.5, '#92400e', s, 0, 0.2, 0).rotation.y = 0.5; MD.box(1.3, 0.25, 0.4, '#a16207', s, 0.2, 0.45, 0.2).rotation.y = -0.7; MD.sph(0.45, '#15803d', s, -0.5, 0.4, 0.3); MD.box(0.7, 0.05, 0.7, '#64748b', s, 0.4, 0.15, -0.4); const mk = label('\uD83E\uDDF9 DEBRIS'); mk.position.set(0, 1.6, 0); s.add(mk); props.items.push({ s, mk }); });
  } else if (d.type === 'outage') {
    const s = MD.grp(g, d.tf[0], 0, d.tf[1]); MD.box(1.4, 1.4, 1.1, '#4b5563', s, 0, 0.7, 0); MD.box(1.45, 0.15, 1.15, '#facc15', s, 0, 1.2, 0); MD.cyl(0.08, 4.5, '#78350f', s, 1.2, 2.25, 0);
    const mk = label('\u26A1 TRANSFORMER'); mk.position.set(0, 2.4, 0); s.add(mk); props.tf = s; props.tfMk = mk;
    const ln = MD.avatar({ skin: GL.SKINS[3], hair: 'short', hc: '#3f2a14', top: 'jacket', tc: '#f97316', bc: '#1e3a8a', hat: 'helmet', hatc: '#facc15' }); ln.g.position.set(d.tf[0] - 1.6, 0, d.tf[1] + 0.8); ln.g.rotation.y = 1.2; g.add(ln.g); props.crew = ln;
    const tg = label('\uD83D\uDC77 Lineworker Lou'); tg.position.set(0, 2.4, 0); ln.g.add(tg);
  } else if (d.type === 'bandit') {
    const ch = MD.avatar({ skin: GL.SKINS[1], hair: 'short', hc: '#111827', top: 'tee', tc: '#e5e7eb', bc: '#111827', hat: 'beanie', hatc: '#111827', gl: 'shades' });
    MD.sph(0.38, '#65a30d', ch.g, 0, 1.15, -0.32); const tg = label('\uD83D\uDCB0 MONEY BANDIT', 'rgba(22,101,52,.92)'); tg.position.set(0, 2.5, 0); ch.g.add(tg); g.add(ch.g); props.bandit = ch; props.bx = null; props.cash = {};
  } else if (d.type === 'plane') {
    const p = MD.grp(g, d.site[0], 0, d.site[1]); const body = MD.grp(p); props.plane = p;
    MD.cyl(0.9, 9, '#f8fafc', body, 0, 0, 0).rotation.x = Math.PI / 2; MD.cone(0.9, 1.6, '#ef4444', body, 0, 0, 5.3).rotation.x = Math.PI / 2; MD.box(11, 0.18, 1.8, '#e2e8f0', body, 0, 0, 0.6); MD.box(0.18, 1.8, 1.4, '#ef4444', body, 0, 1.1, -4); MD.box(3.6, 0.15, 1, '#e2e8f0', body, 0, 0.2, -4);
    for (let i = -2; i <= 2; i++) MD.box(0.05, 0.4, 0.5, '#60a5fa', body, 0.88, 0.25, i * 1.2); MD.box(9, 0.18, 0.06, '#ef4444', body, 0, -0.2, 0).rotation.y = Math.PI / 2;
    const tg = label('\u2708\uFE0F GROK AIR 7'); tg.position.set(0, 3, 0); p.add(tg); props.body = body;
    props.pax = d.pax.map((q, i) => { const ch = MD.avatar({ skin: GL.SKINS[(i * 2 + 1) % 8], hair: i % 2 ? 'long' : 'short', hc: ['#3f2a14', '#f59e0b', '#111827', '#9a3412'][i], top: 'tee', tc: ['#22c55e', '#a855f7', '#0ea5e9', '#f97316'][i], bc: '#1f2937' }); ch.g.position.set(q[0], 0, q[1]); ch.g.rotation.y = i; g.add(ch.g); const mk = label('\uD83D\uDCAB HELP'); mk.position.set(0, 2.4, 0); ch.g.add(mk); return { ch, mk, x: q[0], z: q[1], gone: 0 }; });
    props.cars = [];
  }
}
function driveTo(o, tx, tz, sp, dt) { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.8) return true; const want = Math.atan2(dx, dz); o.yaw += G.ang(want - o.yaw) * Math.min(1, dt * 5); const st = Math.min(d, sp * dt); o.x += dx / d * st; o.z += dz / d * st; o.v = sp; return false; }
function responder(type, from, to) { const b = W.bld(from), p = b ? b.out : [0, 0]; const o = GL.Cars.makeCar(type, null, p[0], p[1], 0); return { o, path: W.navPath(p[0], p[1], to[0], to[1]) || [to], pi: 0, t: 0, done: false }; }
let fxT = 0, sirenT = 0;
function propsTick(dt, d) {
  if (!props || props.id !== d.id) buildProps(d);
  const town = inTown(); fxT -= dt; sirenT -= dt; const doFx = fxT <= 0 && town; if (doFx) fxT = 0.35;
  if (d.type === 'flood') {
    props.water.position.y = 0.04 + lvl * 0.5; props.water.visible = lvl > 0.02; props.water.material.opacity = 0.35 + lvl * 0.3;
    d.bags.forEach((b, i) => { const it = props.items[i]; it.pile.visible = !!b[2]; it.mk.visible = !b[2] && d.ph !== 'recede'; });
  } else if (d.type === 'hurricane') d.piles.forEach((p, i) => { props.items[i].s.visible = d.ph === 'after' && !p[2]; });
  else if (d.type === 'outage') { props.tfMk.visible = d.fix < 3; if (doFx && Math.random() < 0.5) W.fx('sparkle', d.tf[0], 1.6, d.tf[1], 2, 0.4); props.crew.anim(dt, 0, true); }
  else if (d.type === 'bandit') {
    const b = WX.bandit(); props.bandit.g.visible = !!b;
    if (b) { if (props.bx == null) { props.bx = b.x; props.bz = b.z; } const k = 1 - Math.exp(-dt * 10); props.bx += (b.x - props.bx) * k; props.bz += (b.z - props.bz) * k; props.bandit.g.position.set(props.bx, 0, props.bz); props.bandit.g.rotation.y = b.yaw; props.bandit.anim(dt, b.sp ? 5 : 0, !b.sp); if (doFx && b.sp && Math.random() < 0.3) W.fx('sparkle', props.bx, 1.2, props.bz, 1, 0.3);
      if (!props.cop && town) props.cop = GL.Cars.makeCar('police', null, props.bx, props.bz - 10, 0);
      if (props.cop) { const o = props.cop, dd = Math.hypot(props.bx - o.x, props.bz - o.z); if (dd > 14) { o.x = props.bx - 8; o.z = props.bz - 8; } else if (dd > 7) driveTo(o, props.bx, props.bz, 6.5, dt); else o.v = 0; if (o.m && o.m.siren) o.m.siren.forEach((s, i) => { s.visible = Math.floor(W.time * 5 + i) % 2 === 0; }); }
    }
    const seen = {}; (d.cash || []).forEach((c) => { seen[c[0]] = 1; if (!props.cash[c[0]]) { const s = MD.grp(props.g, c[1], 0, c[2]); MD.box(0.5, 0.12, 0.3, '#16a34a', s, 0, 0.12, 0); MD.box(0.4, 0.13, 0.08, '#fef08a', s, 0, 0.13, 0); props.cash[c[0]] = { s, x: c[1], z: c[2], asked: 0 }; } const it = props.cash[c[0]]; it.s.rotation.y += dt * 2; it.s.position.y = 0.1 + Math.sin(W.time * 4 + c[0]) * 0.08;
      if (town && onFoot() && !it.asked && Math.hypot(GS.me.x - it.x, GS.me.z - it.z) < 1.4) { it.asked = 1; Snd.fx('coin'); G.doAct({ k: 'wx', what: 'cash', i: c[0] }); } });
    for (const id in props.cash) if (!seen[id]) { props.g.remove(props.cash[id].s); delete props.cash[id]; }
  } else if (d.type === 'plane') {
    const s = d.site;
    if (d.ph === 'fly') { const f = clamp(d.t / 7, 0, 1); props.plane.position.set(s[0] + 70 * (1 - f), 30 * (1 - f) * (1 - f) + 0.9, s[1] - 60 * (1 - f)); props.plane.rotation.set(0, Math.atan2(-70, 60), 0); props.body.rotation.z = Math.sin(W.time * 6) * 0.15; props.pax.forEach((p) => { p.ch.g.visible = false; }); if (doFx) W.fx('smoke', props.plane.position.x, props.plane.position.y, props.plane.position.z, 1, 0.3); }
    else {
      props.plane.position.set(s[0], 0.75, s[1]); props.plane.rotation.set(0, Math.atan2(-70, 60), 0); props.body.rotation.set(0.05, 0, 0.18);
      if (doFx) W.fx('smoke', s[0] + (Math.random() - 0.5) * 2, 2, s[1] + (Math.random() - 0.5) * 2, 1, 0.5);
      if (!props.cars.length && town) props.cars = [responder('firetruck', 'fire', [s[0] + 6, s[1] - 7]), responder('ambulance', 'hospital', [s[0] - 6, s[1] - 7])];
      props.cars.forEach((c) => { c.t += dt; if (!c.done) { const p = c.path[c.pi]; if (!p || c.t > 25) { c.done = true; c.o.x = p ? p[0] : c.o.x; } else if (driveTo(c.o, p[0], p[1], 12, dt)) c.pi++; } else c.o.v = 0; if (c.o.m && c.o.m.siren) c.o.m.siren.forEach((q, i) => { q.visible = Math.floor(W.time * 5 + i) % 2 === 0; }); });
      if (props.cars[0] && props.cars[0].done && doFx) W.fx('water', s[0] + 2, 1.5, s[1], 2, 0.6);
      if (sirenT <= 0 && town && props.cars.some((c) => !c.done)) { sirenT = 1.2; Snd.fx('wail'); }
      props.pax.forEach((p, i) => { p.ch.g.visible = !p.gone; if (d.pax[i][2] && !p.gone) { p.walk = (p.walk || 0) + dt; const amb = props.cars[1] ? props.cars[1].o : null; if (amb) { const dx = amb.x - p.x, dz = amb.z - p.z, dd = Math.hypot(dx, dz); if (dd > 1.5) { p.x += dx / dd * 3 * dt; p.z += dz / dd * 3 * dt; p.ch.g.rotation.y = Math.atan2(dx, dz); } else p.gone = 1; } if (p.walk > 6) p.gone = 1; p.ch.g.position.set(p.x, 0, p.z); p.ch.anim(dt, 3); p.mk.visible = false; }
        else if (!d.pax[i][2]) { p.ch.anim(dt, 0, false); if (doFx && Math.random() < 0.25) W.fx('star', p.x, 2.1, p.z, 1, 0.3); } });
    }
  }
}

/* ---------------- per-frame (everyone) ---------------- */
let umb = null, torch = null, windT = 0, hailT = 0, debT = 0, dentT = 0, stallT = 0, wadeT = 0, lastDis = 0;
G.hooks.tick.push(function (dt) {
  const S = S_(), d = S.dis, k = curK(), K = KINDS[k], town = inTown(), outside = town && !(GL.Health && GL.Health.riding && GL.Health.riding());
  if (alertT > 0) alertT -= dt;
  if (flashT > 0) flashT = Math.max(0, flashT - dt);
  // flood level eases toward target
  const tgt = floodTarget(); lvl += (tgt - lvl) * Math.min(1, dt * 1.5); if (tgt === 0 && lvl < 0.01) lvl = 0;
  if (d) propsTick(dt, d); else if (props) clearProps();
  if (!d && lastDis) lastDis = 0; else if (d) lastDis = d.id;
  // particles
  const P = particles(), hail = !!(d && d.type === 'hail'), hur = !!(d && d.type === 'hurricane' && d.ph === 'hit');
  const wetK = K.wet || hur;
  P.rain.visible = town && !!wetK; P.snow.visible = town && !!K.snow && !hail; P.hail.visible = town && hail; P.debris.visible = town && hur;
  const wind = hur ? 14 : K.wind ? 4 : k === 'storm' ? 3 : 1;
  if (P.rain.visible) fall(P.rain, hur ? 26 : 20, wind, dt); if (P.snow.visible) fall(P.snow, 2.2, wind * 0.4, dt); if (P.hail.visible) fall(P.hail, 16, 1, dt); if (P.debris.visible) fall(P.debris, 3, 18, dt);
  if (!town || !G.inGame || !G.inGame()) { if (umb) umb.visible = false; if (torch) torch.visible = false; return; }
  // sounds + lightning
  rainT -= dt; if ((wetK || hail) && rainT <= 0) { rainT = 1; Snd.fx(hail ? 'tink' : 'rain'); if (hail) Snd.fx('tink'); }
  windT -= dt; if ((K.wind || hur) && windT <= 0) { windT = hur ? 1.4 : 4; Snd.fx('wind'); }
  if (k === 'storm' || hur) { boltT -= dt; if (boltT <= 0) { boltT = 6 + Math.random() * 9; flash(); } }
  // umbrella in your hand
  const me = GS.av && GS.av[GS.pid];
  if (me && !umb && has('umbrella')) { umb = MD.grp(null); MD.cyl(0.03, 1.3, '#1f2937', umb, 0, 0.65, 0); const top = MD.mesh(MD.G.hemi, '#ec4899', umb, 0, 1.3, 0, 0.85, 0.4, 0.85); void top; umb.position.set(0.32, 1.0, 0.1); }
  if (umb && me) { if (umb.parent !== me.ch.g) me.ch.g.add(umb); umb.visible = has('umbrella') && (wetK || hail || !!K.snow) && onFoot(); }
  // flashlight in an outage at night
  if (WX.outage() && W.isNight(G.clock()) && has('flashlight')) { if (!torch) { torch = new T.PointLight('#fff7c2', 1.6, 16, 1.4); W.scene.add(torch); } torch.visible = true; torch.position.set(GS.me.x + Math.sin(GS.me.yaw || 0) * 1.5, 2.2, GS.me.z + Math.cos(GS.me.yaw || 0) * 1.5); }
  else if (torch) torch.visible = false;
  const foot = onFoot() && outside && !(GS.me.act && GS.me.act.kind === 'hide');
  // getting soaked without an umbrella
  if (wetK && foot && !has('umbrella')) { soakT += dt; if (soakT > 25) { soakT = 0; G.need && G.need('f', -2); if (!soakTold) { soakTold = true; G.toast('\uD83D\uDCA6 You\u2019re soaked! An \u2602\uFE0F umbrella from Fresh Mart keeps you dry.'); } } } else soakT = Math.max(0, soakT - dt);
  // wind push on foot
  if (foot && (hur || K.wind)) { const f = hur ? 1.8 : 0.45, a = W.time * 0.3, r = W.move(W.cur, GS.me.x, GS.me.z, Math.cos(a) * f * dt, Math.sin(a) * f * dt * 0.6 + f * dt * 0.8, 0.36); GS.me.x = r[0]; GS.me.z = r[1]; }
  // flood: wading + cars stalling
  if (lvl > 0.25 && foot && inFlood(GS.me.x, GS.me.z)) { wadeT -= dt; if (wadeT <= 0) { wadeT = 0.7; W.fx('water', GS.me.x, 0.4, GS.me.z, 2, 0.4); Snd.fx('splash'); } }
  const co = GL.Cars && GL.Cars.cur && GL.Cars.driving() ? GL.Cars.cur() : null;
  stallT -= dt;
  if (co && lvl > 0.4 && inFlood(co.x, co.z) && stallT <= 0 && Math.abs(co.v) > 2) { stallT = 8; co.v = 0; Snd.fx('sputter'); G.toast('\uD83C\uDF0A Your car stalled in the flood water! Drive out slowly (or walk around).', true); if (GL.AutoShop && GL.AutoShop.damage) GL.AutoShop.damage(4, 10); }
  // hail: dents + bonks
  if (hail) {
    hailT -= dt; if (foot && hailT <= 0) { hailT = 9; if (!has('umbrella') && Math.random() < 0.45) G.hurt && G.hurt('bonk', 'A hailstone!'); }
    dentT += dt; if (dentT >= 2) { dentT = 0; const o = GL.Cars && GL.Cars.myCar && GL.Cars.myCar(); if (o && GL.AutoShop && GL.AutoShop.damage) GL.AutoShop.damage(1.5, 15); }
  }
  // hurricane: flying debris + car damage
  if (hur) {
    debT -= dt; if (foot && debT <= 0) { debT = 8; if (Math.random() < 0.3) G.hurt && G.hurt('bruise', 'Flying debris!'); }
    dentT += dt; if (dentT >= 2) { dentT = 0; const o = GL.Cars && GL.Cars.myCar && GL.Cars.myCar(); if (o && GL.AutoShop && GL.AutoShop.damage) GL.AutoShop.damage(2, 10); }
  }
});
G.hooks.reset.push(() => { clearProps(); lvl = 0; bandit = null; if (torch) torch.visible = false; });

/* ---------------- ACT button ---------------- */
G.actHook = (function (prev) {
  return function () {
    const d = S_().dis;
    if (d && inTown() && onFoot() && !GS.me.ride) {
      const near = (x, z, r) => Math.hypot(GS.me.x - x, GS.me.z - z) < r;
      if (d.type === 'flood' && d.ph !== 'recede') for (let i = 0; i < d.bags.length; i++) { const b = d.bags[i]; if (!b[2] && near(b[0], b[1], 2.6)) return { custom: () => { Snd.fx('clank'); G.doAct({ k: 'wx', what: 'sand', i }); }, label: 'SANDBAGS', name: 'Place sandbags', x: b[0], z: b[1], py: 1.8 }; }
      if (d.type === 'hurricane' && d.ph === 'after') for (let i = 0; i < d.piles.length; i++) { const p = d.piles[i]; if (!p[2] && near(p[0], p[1], 2.6)) return { custom: () => { Snd.fx('pop'); W.fx('dust', p[0], 0.6, p[1], 6, 0.6); G.doAct({ k: 'wx', what: 'pile', i }); }, label: 'CLEAN UP', name: 'Storm debris', x: p[0], z: p[1], py: 1.8 }; }
      if (d.type === 'outage' && d.fix < 3 && near(d.tf[0], d.tf[1], 3)) return { custom: () => { Snd.fx('clank'); W.fx('sparkle', d.tf[0], 1.5, d.tf[1], 6, 0.6); G.doAct({ k: 'wx', what: 'fix' }); }, label: 'HELP FIX', name: 'Transformer', x: d.tf[0], z: d.tf[1], py: 2.6 };
      if (d.type === 'bandit') { const b = props && props.bx != null ? { x: props.bx, z: props.bz } : WX.bandit(); if (b && near(b.x, b.z, 2.6)) return { custom: () => banditChoice(), label: 'CATCH!', name: 'Money bandit', x: b.x, z: b.z, py: 2.6 }; }
      if (d.type === 'plane' && d.ph === 'down' && props && props.pax) for (let i = 0; i < d.pax.length; i++) { const p = d.pax[i]; if (!p[2] && near(p[0], p[1], 2.2)) return { custom: () => { Snd.fx('sparkle'); W.fx('heart', p[0], 2, p[1], 4, 0.5); G.doAct({ k: 'wx', what: 'pax', i }); }, label: 'HELP', name: 'Dizzy passenger', x: p[0], z: p[1], py: 2.4 }; }
    }
    return prev ? prev() : null;
  };
})(G.actHook);
function banditChoice() {
  const s = sv();
  if (!(s.crime && s.crime.on)) { Snd.fx('boing'); G.doAct({ k: 'wx', what: 'catch' }); return; }
  open('bandit', head('\uD83D\uDCB0 The Money Bandit') + '<p class="sub">\u201CPsst! Don\u2019t turn me in\u2026 help me get away and we split the loot!\u201D</p>' +
    btn('wxCatch', null, '\uD83D\uDC6E CATCH HIM (' + money(150) + ' reward)', 'primary') + btn('wxTeam', null, '\uD83D\uDE0E TEAM UP (+' + money(120) + ', cops chase you \u2605)', 'alt'));
}
H.wxCatch = () => { G.closePanel(); Snd.fx('boing'); G.doAct({ k: 'wx', what: 'catch' }); };
H.wxTeam = () => { G.closePanel(); G.doAct({ k: 'wx', what: 'team', x: +GS.me.x.toFixed(1), z: +GS.me.z.toFixed(1) }); };

/* ---------------- HUD pill + phone Weather app + settings ---------------- */
const HOWTO = {
  flood: (d) => d.ph === 'recede' ? 'water going down' : 'place sandbags (' + d.bags.filter((b) => b[2]).length + '/4)',
  hurricane: (d) => d.ph === 'warn' ? 'get indoors!' : d.ph === 'hit' ? 'stay inside!' : 'clean up debris (' + d.piles.filter((p) => p[2]).length + '/5)',
  hail: () => 'take cover!', outage: (d) => 'help fix transformer (' + d.fix + '/3)', bandit: () => 'catch him! \uD83C\uDFC3', plane: (d) => d.ph === 'fly' ? 'mayday!' : 'help passengers (' + d.pax.filter((p) => p[2]).length + '/4)'
};
G.statusParts.push(() => { const d = S_().dis; if (!d || !DIS[d.type]) return ''; return '<button class="spill red wxPill" data-a="app" data-v="weather">' + DIS[d.type].icon + ' ' + DIS[d.type].name + ' \u00b7 ' + HOWTO[d.type](d) + '</button>'; });
const fmtAt = (at) => G.timeStr(((at % 1440) + 1440) % 1440);
UI.app_weather = function () {
  const S = S_(), k = curK(), K = KINDS[k], d = S.dis, wx = S.wx || { fc: [] };
  let h = head('\uD83C\uDF26\uFE0F Weather');
  h += '<div class="wxNow"><div class="wxBig">' + (W.isNight(G.clock()) && K.night ? K.night : K.icon) + '</div><div><b>' + K.name + '</b><small>' + esc(TIPS[k]) + '</small></div></div>';
  if (d && DIS[d.type]) h += '<div class="wxAlert">\uD83D\uDEA8 <b>' + DIS[d.type].name + '</b><small>' + esc(DIS[d.type].alert) + '</small><small><b>Now:</b> ' + esc(HOWTO[d.type](d)) + '</small></div>';
  h += '<p class="sub"><b>Forecast</b></p><div class="list">' + (wx.fc || []).slice(0, 4).map((f) => { const F = KINDS[f.k] || KINDS.sunny; return '<div class="lrow"><b>' + fmtAt(f.at) + '<small>' + F.name + '</small></b><span class="wxFc">' + F.icon + '</span></div>'; }).join('') + '</div>';
  h += '<p class="sub small">Rain + snow make roads slippery. Storms send people indoors. \u2602\uFE0F Umbrellas + \uD83D\uDD26 flashlights at Fresh Mart.</p>';
  h += UI.disFreqBtns();
  if (/debug|test/.test(location.search)) h += '<div class="row wrap">' + Object.keys(DIS).map((t) => btn('wxTest', t, DIS[t].icon, 'small')).join('') + btn('wxTest', 'end', '\u2705', 'small') + '</div>';
  open('weather', h);
};
UI.disFreqBtns = function () {
  const client = GS.role === 'client', f = client ? (S_().disFreq || 'normal') : freq();
  return '<p class="sub small"><b>\uD83C\uDF2A\uFE0F Disasters:</b> ' + (client ? 'the host decides (' + f + ')' : 'how often should they happen?') + '</p><div class="row wrap freqRow">' +
    ['off', 'rare', 'normal', 'chaos'].map((k) => btn('disFreq', k, (k === f ? '\u2714 ' : '') + k.toUpperCase(), 'small' + (k === f ? ' blue' : ''), client)).join('') + '</div>';
};
H.disFreq = (v) => { if (GS.role === 'client' || FREQ[v] == null) return; sv().disFreq = v; G.persist(); Snd.fx('click'); if (v === 'off' && S_().dis && host()) endDis(S_(), 1, 'Disasters turned off. All clear!'); if (GS.panel === 'weather') UI.app_weather(); else if (GS.panel === 'settings' && UI.app_settings) UI.app_settings(); };
H.wxTest = (v) => { if (v === 'end') WX.resolve(); else WX.trigger(v); G.closePanel(); };

/* ---------------- test / debug hooks ---------------- */
WX.setWeather = function (k, hold) { if (!host() || !KINDS[k]) return false; const S = GS.S; if (!S.wx) initWx(S); S.wx.k = k; S.wx.until = abs() + (hold || 180); S.wx.hold = 1; S.wx.fc = []; fillFc(S.wx); G.touch(); return true; };
WX.trigger = function (type) { if (!host() || !GS.S) return false; if (GS.S.dis) endDis(GS.S, 1, ''); return startDis(GS.S, type); };
WX.resolve = function () { if (!host() || !GS.S || !GS.S.dis) return false; endDis(GS.S, 1, 'All clear! (drill over)'); return true; };
WX.phase = function (ph) { if (!host() || !GS.S || !GS.S.dis) return false; phase(GS.S, ph); return true; };
WX.setFreq = function (f) { if (FREQ[f] == null) return false; sv().disFreq = f; return true; };
WX._st = () => ({ k: curK(), dis: S_().dis ? S_().dis.type : null, ph: S_().dis ? S_().dis.ph : null, lvl, props: props ? props.type : null, outage: WX.outage(), grip: WX.grip(), bandit: !!WX.bandit(), particles: PT ? { rain: PT.rain.visible, snow: PT.snow.visible, hail: PT.hail.visible, debris: PT.debris.visible } : null });
})();
