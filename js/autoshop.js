/* Grok Life - getting run over (cartoon style), car damage + breakdowns, tow trucks and two mechanics:
   Honest Hank's Auto Care (helpful) and Sketchy Steve's Fix-It-Quik (not so helpful).
   RULE: a car that BREAKS DOWN (worn out) gets towed to Honest Hank's. A car WRECKED in a crash gets towed by
   Tony, whose cousin is Sketchy Steve... so it goes to Steve's. (At Steve's you can pay $30 to re-tow it to Hank's.) */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, Snd = GL.Snd, UI = GL.UI;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money, clamp = GL.clamp;
const AS = GL.AutoShop = {};
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const C = () => GL.Cars;
G.statusParts = G.statusParts || [];
AS.rand = Math.random;
const SHOP = {
  hank: { id: 'hanks', name: 'Honest Hank\u2019s Auto Care', who: 'Hank', icon: '\uD83D\uDEE0\uFE0F', tow: 25, hours: 1 },
  steve: { id: 'steves', name: 'Sketchy Steve\u2019s Fix-It-Quik', who: 'Steve', icon: '\uD83E\uDE9B', tow: 60, hours: 3 }
};
AS.SHOP = SHOP;
const RETOW = 30;
const park = (k) => (W.shopPark && W.shopPark[SHOP[k].id]) || [0, 0, 0];

/* ---------------- car condition ---------------- */
const car = () => (C() && C().activeCar ? C().activeCar() : null);
const cond = (c) => (c && c.cond != null ? c.cond : 100);
AS.cond = () => cond(car());
AS.broken = () => { const c = car(); return c && c.broken ? c.broken : null; };
const towFor = (c) => (c && c.broken === 'crash' ? 'steve' : 'hank');
AS.towFor = () => towFor(car());
function myCarObj() { return C() && C().myCar ? C().myCar() : null; }
function setCond(c, v) { const before = cond(c); c.cond = Math.round(clamp(v, 0, 100) * 10) / 10; if (before >= 50 && c.cond < 50 && !c.broken) G.toast('\u26A0\uFE0F Your car is at ' + Math.round(c.cond) + '%. A check-up at Honest Hank\u2019s would help!'); else if (before >= 25 && c.cond < 25 && !c.broken) G.toast('\uD83D\uDCA8 Your car is smoking (' + Math.round(c.cond) + '%)! It might break down soon.', true); }
// crash damage (wraps the health crash hook)
G.onCrash = (function (prev) {
  return function (v, work) {
    if (!work) carHit(v);
    if (prev) prev(v, work);
  };
})(G.onCrash);
function carHit(v) {
  const c = car(), o = myCarObj(); if (!c || !o || !o.drive || c.broken) return;
  const dmg = Math.round((v - 4) * 2.2); if (dmg <= 0) return;
  setCond(c, cond(c) - dmg); W.fx('smoke', o.x, 1.2, o.z, 3, 0.6); if (dmg >= 12) Snd.fx('clank');
  if (cond(c) <= 0) breakdown('crash'); else G.persist();
}
AS.crash = carHit;
// weather damage (hail dents, hurricane, flood stalls) never fully wrecks the car: it stops at `floor`%
AS.damage = function (d, floor) { const c = car(); if (!c || c.broken) return false; const v = cond(c); if (v <= (floor || 0)) return false; setCond(c, Math.max(floor || 0, v - d)); G.persist(); return true; };
// wear + random breakdowns (from cars.js drive)
G.onDriven = function (o, d) {
  const c = car(); if (!c || o !== myCarObj() || c.broken) return;
  setCond(c, cond(c) - d * (c.half ? 0.03 : 0.012));
  if (c.half) { c.halfLeft = (c.halfLeft || 0) - d; if (c.halfLeft <= 0) { breakdown('wear', 'half'); return; } }
  const cc = cond(c); if (cc < 40 && AS.rand() < (40 - cc) / 40 * 0.004 * d) breakdown('wear');
};
G.carDead = (o) => { const c = car(); return !!(c && c.broken && o && o === myCarObj()); };
G.carBlock = function () {
  if (AS.suspended()) { G.toast('\uD83D\uDEAB Your driving license is SUSPENDED until tomorrow (too many bonked people!). Walk, ride with a friend or take a taxi.', true); return true; }
  if (tow) { G.toast('\uD83D\uDEFB Your car is with the tow truck.'); return true; }
  const c = car(); if (c && c.broken) { G.toast('\uD83D\uDEE0\uFE0F Your car is ' + (c.broken === 'crash' ? 'wrecked' : 'broken down') + '! Call a tow truck (phone \u2192 \uD83D\uDEFB Tow).', true); return true; }
  return false;
};
let deadT = 0;
function breakdown(why, how) {
  const c = car(); if (!c || c.broken) return;
  c.broken = why; c.half = false; c.halfLeft = 0; if (why === 'crash') c.cond = 0; else c.cond = Math.min(cond(c), 30);
  const o = myCarObj();
  Snd.fx(why === 'crash' ? 'bump' : 'sputter'); if (why === 'crash') Snd.fx('clank');
  if (o) W.fx('smoke', o.x, 1.3, o.z, 8, 0.9);
  G.persist(); deadT = 1.4; AS._how = how || null;
}
AS.breakdown = breakdown;
function breakdownPanel() {
  const c = car(); if (!c || !c.broken) return;
  const crash = c.broken === 'crash', k = towFor(c), S = SHOP[k];
  open('carbroke', head(crash ? '\uD83D\uDCA5 Car wrecked!' : '\uD83D\uDCA8 Car broke down!') + '<div class="big">' + (crash ? '\uD83D\uDE97\uD83D\uDCA5' : '\uD83D\uDE97\uD83D\uDCA8') + '</div>' +
    '<p class="sub">' + (crash ? 'KA-RUNCH! Too many bonks \u2014 your car won\u2019t move. The tow driver, Tony, says his cousin <b>Sketchy Steve</b> can fix it\u2026' : AS._how === 'half' ? 'Sputter\u2026 clunk. Whatever Steve did, it didn\u2019t last! The tow truck will take it to <b>Honest Hank</b>.' : 'Sputter\u2026 sputter\u2026 clunk. Your tired car needs a mechanic. The tow truck will take it to <b>Honest Hank</b>.') + '</p>' +
    btn('towCall', k, '\uD83D\uDCF1 CALL TOW TRUCK (' + money(S.tow) + ')', 'primary') + btn('close', null, 'LATER') + '<p class="sub small">Tow trucks take you and your car to ' + esc(S.name) + '. (Phone \u2192 \uD83D\uDEFB Tow any time.)</p>');
}
AS.breakdownPanel = breakdownPanel;

/* ---------------- tow truck ---------------- */
let tow = null;
AS.towing = () => (tow ? tow.phase : null);
function driveTo(o, tx, tz, sp, dt) { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.6) return true; o.yaw += G.ang(Math.atan2(dx, dz) - o.yaw) * Math.min(1, dt * 5); const st = Math.min(d, sp * dt); o.x += dx / d * st; o.z += dz / d * st; o.v = sp; return false; }
AS.callTow = function (k, fee) {
  const c = car(), o = myCarObj();
  if (!c || !o) { G.toast('You don\u2019t have a car to tow!'); return false; }
  if (tow) { G.toast('\uD83D\uDEFB The tow truck is already on the way!'); return false; }
  if (G.jailed && G.jailed()) return false;
  if (GL.Health && (GL.Health.riding() || GL.Health.down())) { G.toast('Get patched up first!'); return false; }
  k = SHOP[k] ? k : towFor(c);
  const p = park(k);
  if (Math.hypot(o.x - p[0], o.z - p[1]) < 8) { G.toast('Your car is already at ' + SHOP[k].name + ' \u2014 go inside!'); return false; }
  if (C().driving() && C().cur() === o) C().act({ kind: 'exit' });
  const fw = [Math.sin(o.yaw), Math.cos(o.yaw)], tx = o.x + fw[0] * 5, tz = o.z + fw[1] * 5;
  const t = C().makeCar('tow', null, p[0], p[1], p[2]);
  tow = { phase: 'coming', k, fee: fee != null ? fee : SHOP[k].tow, truck: t, path: W.navPath(p[0], p[1], tx, tz), pi: 0, t: 0, tx, tz, flash: 0 };
  G.closePanel(); Snd.fx('ding');
  G.toast('\uD83D\uDCDE ' + (k === 'steve' ? 'Tony\u2019s Towing: \u201CYeah yeah, I\u2019m comin\u2019! My cousin Steve will LOVE this.\u201D' : 'Hank\u2019s Towing: \u201CHang tight, friend! Truck\u2019s on the way.\u201D'));
  return true;
};
H.towCall = (v) => AS.callTow(v);
function towArrive() {
  const o = myCarObj(); if (!o) { endTow(); return; }
  const fw = [Math.sin(o.yaw), Math.cos(o.yaw)], g = o.m.L / 2 + tow.truck.m.L / 2 + 0.6;
  tow.truck.x = o.x + fw[0] * g; tow.truck.z = o.z + fw[1] * g; tow.truck.yaw = o.yaw; C().placeCar(tow.truck);
  tow.phase = 'wait'; tow.t = 0; Snd.fx('honk');
  G.toast('\uD83D\uDEFB The tow truck is here! Walk to your car and tap TOW ME.');
}
AS.hook = function () {
  if (!tow || tow.phase !== 'wait') return;
  const o = myCarObj(); if (!o) { endTow(); return; }
  if (GS.me.act) G.endAct(true);
  const s = sv(); let paid = '';
  if (s.money >= tow.fee) { s.money -= tow.fee; paid = 'Paid ' + money(tow.fee) + ' for the tow.'; } else { GL.Health.addBill((tow.k === 'steve' ? 'Tony\u2019s Towing' : 'Hank\u2019s Towing') + ' (tow)', tow.fee); paid = 'Tow fee (' + money(tow.fee) + ') added to your bills.'; }
  const f = document.getElementById('fade'); f.classList.add('on'); Snd.fx('clank');
  tow.phase = 'hooking';
  setTimeout(() => {
    if (!tow) { f.classList.remove('on'); return; }
    if (W.cur.id !== 'town') G.travel('town', true, [tow.truck.x, tow.truck.z]);
    const p = park(tow.k); tow.phase = 'ride'; tow.t = 0; tow.pi = 0; tow.path = W.navPath(tow.truck.x, tow.truck.z, p[0] + 2, p[1]);
    GS.goal = null; GS.me.x = tow.truck.x; GS.me.z = tow.truck.z;
    f.classList.remove('on'); G.persist();
    G.toast('\uD83D\uDEFB Car hooked up! You hop in the tow truck. ' + paid);
  }, 650);
};
function towToShop() {
  const k = tow.k, S = SHOP[k], p = park(k), o = myCarObj();
  tow.phase = 'done';
  const f = document.getElementById('fade'); f.classList.add('on');
  setTimeout(() => {
    if (o) { o.m.g.rotation.x = 0; o.x = p[0]; o.z = p[1]; o.yaw = p[2]; C().placeCar(o); }
    sv().carPos = [+p[0].toFixed(2), +p[1].toFixed(2), +p[2].toFixed(2)];
    C().killCar(tow.truck); tow = null;
    G.travel(S.id, true, [k === 'hank' ? -3.5 : -3, 0.6]);
    f.classList.remove('on'); G.persist();
    setTimeout(() => AS.mech(k), 350);
  }, 650);
}
AS._arrive = () => { if (tow && tow.phase === 'coming') towArrive(); else if (tow && tow.phase === 'ride') towToShop(); };
function endTow() { if (!tow) return; const o = myCarObj(); if (o) o.m.g.rotation.x = 0; C().killCar(tow.truck); tow = null; }
function towTick(dt) {
  const a = tow, t = a.truck; a.t += dt;
  a.flash += dt; if (t.m.siren) t.m.siren.forEach((s, i) => { s.visible = Math.floor(a.flash * 3 + i) % 2 === 0; });
  if (a.phase === 'coming') {
    const p = a.path[a.pi]; if (!p || a.t > 16) { towArrive(); C().placeCar(t); return; }
    if (driveTo(t, p[0], p[1], 14, dt)) a.pi++;
  } else if (a.phase === 'wait') {
    const o = myCarObj(); if (!o) { endTow(); return; }
  } else if (a.phase === 'ride') {
    const p = a.path[a.pi]; if (!p || a.t > 22) { towToShop(); return; }
    if (driveTo(t, p[0], p[1], 12, dt)) a.pi++;
    const o = myCarObj();
    if (o) { const g = o.m.L / 2 + t.m.L / 2 - 0.4; o.x = t.x - Math.sin(t.yaw) * g; o.z = t.z - Math.cos(t.yaw) * g; o.yaw = t.yaw; C().placeCar(o); o.m.g.rotation.x = -0.13; o.m.g.position.y = 0.45; }
    GS.me.x = t.x; GS.me.z = t.z; GS.me.area = 'town';
  }
  C().placeCar(t);
}
G.frozen = (function (prev) { return () => !!(tow && (tow.phase === 'ride' || tow.phase === 'hooking' || tow.phase === 'done')) || knockT > 0 || (prev ? prev() : false); })(G.frozen);
G.meHidden = (function (prev) { return () => !!(tow && (tow.phase === 'ride' || tow.phase === 'done')) || (prev ? prev() : false); })(G.meHidden);
G.camHook = (function (prev) { return () => { if (tow && tow.phase === 'ride') { W.camZoom = 1.35; W.camAhead = [0, 0]; return [tow.truck.x, tow.truck.z]; } return prev ? prev() : null; }; })(G.camHook);
G.carOverride = (function (prev) { return () => (tow && tow.phase === 'ride' ? ['tow', '#facc15', +tow.truck.x.toFixed(2), +tow.truck.z.toFixed(2), +tow.truck.yaw.toFixed(2), 1, 0, ''] : prev ? prev() : null); })(G.carOverride);
// ACT button: TOW ME next to the waiting tow truck / CALL TOW next to your broken car
G.actHook = (function (prev) {
  return function () {
    if (GS.me.area === 'town' && !(C() && C().driving()) && !GS.me.ride) {
      const o = myCarObj();
      if (tow && tow.phase !== 'wait' && tow.phase !== 'coming') return { custom: () => {}, label: '\uD83D\uDEFB', name: 'Towing\u2026', x: GS.me.x, z: GS.me.z, py: 2.4 };
      if (tow && tow.phase === 'wait' && o && Math.hypot(o.x - GS.me.x, o.z - GS.me.z) < 5.5) return { custom: () => AS.hook(), label: 'TOW ME', name: 'Tow truck', x: tow.truck.x, z: tow.truck.z, py: 2.8 };
      if (!tow && o && AS.broken() && Math.hypot(o.x - GS.me.x, o.z - GS.me.z) < 4) return { custom: () => breakdownPanel(), label: 'CALL TOW', name: 'Broken car', x: o.x, z: o.z, py: 2 };
    }
    return prev ? prev() : null;
  };
})(G.actHook);

/* ---------------- the mechanics ---------------- */
const TIPS = ['Tip: slow down near corners \u2014 bonks wear your car out!', 'Tip: when your car hits 50%, bring it in early. Cheaper than a tow!', 'Tip: let go of the stick to brake. Easy peasy.', 'Tip: driving gently keeps your car healthy for a long time.'];
const UPSELL = [['Blinker fluid', 35], ['Premium tire air', 20], ['Engine music tune-up', 30], ['Extra-shiny cup holder', 25]];
const EXCUSES = ['The engine was haunted, so I used duct tape. Ghosts hate duct tape.', 'A squirrel was living in there. He pays rent now.', 'I fixed the noise by turning up the radio.', 'I had one bolt left over. Probably not important!'];
let mechQ = null;
function hankPrice(c) { return 20 + Math.round((100 - cond(c)) * 1.1); }
AS.price = function (k, c) { c = c || car(); const P = hankPrice(c); if (k === 'hank') return { base: P, ups: [], total: P }; const ups = (mechQ && mechQ.k === 'steve' && mechQ.ups) || UPSELL.slice(0, 2); const base = Math.round(P * 1.8); return { base, ups, total: base + ups.reduce((m, u) => m + u[1], 0) }; };
function bar(v) { const col = v >= 60 ? '#22c55e' : v >= 30 ? '#f59e0b' : '#ef4444'; return '<div class="condBar"><em style="width:' + Math.max(3, v) + '%;background:' + col + '"></em><span>' + Math.round(v) + '%</span></div>'; }
AS.mech = function (k) {
  const S = SHOP[k], s = sv(), c = car(), o = myCarObj(), steve = k === 'steve';
  const face = '<div class="big">' + (steve ? '\uD83D\uDE0E' : '\uD83D\uDC68\u200D\uD83D\uDD27') + '</div>';
  let h = head(S.icon + ' ' + S.name) + face;
  if (!c) { open('mech', h + '<p class="sub">' + S.who + ': \u201CNo car? Come back when you\u2019ve got some wheels!\u201D</p>' + btn('close', null, 'OK')); return; }
  const p = park(k), here = o && Math.hypot(o.x - p[0], o.z - p[1]) < 14, cc = cond(c), name = (GL.CARS[c.type] || { name: 'car' }).name;
  if (!here) {
    open('mech', h + '<p class="sub">' + S.who + ': \u201C' + (steve ? 'Bring that ride to my lot out front. Cash only. Mostly.' : 'Drive your car to my lot out front and I\u2019ll take a look!') + '\u201D</p>' + (c.broken ? btn('towCall', towFor(c), '\uD83D\uDEFB CALL TOW TRUCK', 'primary') : '') + btn('close', null, 'OK'));
    return;
  }
  if (cc >= 99 && !c.broken && !c.half) {
    open('mech', h + bar(cc) + '<p class="sub">' + S.who + ': \u201C' + (steve ? 'Looks fine\u2026 want some blinker fluid? No? Fine.' : 'Your ' + esc(name) + ' purrs like a kitten. Nothing to fix!') + '\u201D</p>' + btn('close', null, 'THANKS')); return;
  }
  if (steve && (!mechQ || mechQ.k !== 'steve')) { const a = UPSELL.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(AS.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } mechQ = { k: 'steve', ups: a.slice(0, 2) }; }
  if (!steve) mechQ = { k: 'hank' };
  const pr = AS.price(k, c), broke = s.money < pr.total;
  const prob = c.broken === 'crash' ? 'crunched bumper, bent axle and a very confused engine' : c.broken ? 'worn-out engine that gave up' : c.half ? 'a \u201Cmostly fixed\u201D engine held together with duct tape' : cc < 50 ? 'lots of dents and a tired engine' : 'a few dents and squeaks';
  h += bar(cc);
  if (!steve) h += '<p class="sub">Hank: \u201CI see a ' + prob + '. I\u2019ll fix it properly for <b>' + money(pr.total) + '</b> (about 1 hour).\u201D</p><p class="sub small">\uD83D\uDCA1 ' + TIPS[Math.floor(AS.rand() * TIPS.length)] + '</p>';
  else h += '<p class="sub">Steve: \u201CWhoa. ' + prob + '? That\u2019s gonna be pricey. Takes about 3 hours.\u201D</p><div class="list bill">' + '<div class="lrow"><b>Repair (sorta)</b><span>' + money(pr.base) + '</span></div>' + pr.ups.map((u) => '<div class="lrow"><b>' + esc(u[0]) + ' <small>(already done, no take-backs)</small></b><span>' + money(u[1]) + '</span></div>').join('') + '<div class="lrow tot"><b>TOTAL</b><span>' + money(pr.total) + '</span></div></div>';
  h += btn('mechFix', k + '|pay', '\u2705 FIX IT \u00b7 ' + money(pr.total), 'primary', broke);
  if (broke) h += btn('mechFix', k + '|later', '\uD83E\uDDFE PAY LATER (bill)', 'blue');
  if (steve) h += btn('mechRetow', null, '\uD83D\uDEFB Tow it to Honest Hank\u2019s instead (' + money(RETOW) + ')');
  h += btn('close', null, 'NOT NOW') + '<p class="sub small">' + money(s.money) + ' on hand' + (broke ? ' \u00b7 not enough? Pay later and settle the bill on your phone (\uD83E\uDE7A Health \u2192 bills).' : '') + '</p>';
  open('mech', h);
};
G.hooks.kinds.mech = (h) => AS.mech(h.shop === 'steve' ? 'steve' : 'hank');
H.mechRetow = () => { mechQ = null; AS.callTow('hank', RETOW); };
H.mechFix = (v) => {
  const [k, how] = String(v).split('|'); if (!SHOP[k]) return;
  const s = sv(), c = car(); if (!c) return; const pr = AS.price(k, c), S = SHOP[k];
  if (how === 'later') GL.Health.addBill(S.name + ' repair', pr.total);
  else { if (s.money < pr.total) return; s.money -= pr.total; }
  Snd.fx('cash');
  open('mech', head('\uD83D\uDD27 ' + (k === 'steve' ? 'Steve is \u201Cworking\u201D\u2026' : 'Hank is working\u2026')) + '<div class="big">\uD83D\uDD27\uD83D\uDE97</div><p class="sub">' + (k === 'steve' ? 'Bang. Clang. A long lunch break. Is that\u2026 duct tape?' : 'Clink, clank, whirrr! Hank checks everything twice.') + '</p>');
  Snd.fx('clank'); setTimeout(() => Snd.fx('clank'), 500);
  setTimeout(() => {
    if (GS.role !== 'client') G.skipTo((G.clock() + S.hours * 60) % 1440);
    c.broken = null; s.stats.repairs = (s.stats.repairs || 0) + 1;
    let msg;
    if (k === 'hank') { c.cond = 100; c.half = false; c.halfLeft = 0; msg = 'Hank: \u201CAll fixed \u2014 good as new! Drive safe, friend.\u201D \uD83D\uDE97\u2728'; }
    else if (AS.rand() < 0.5) { c.cond = 55; c.half = true; c.halfLeft = 140 + Math.round(AS.rand() * 120); msg = 'Steve: \u201CFixed! Mostly. ' + EXCUSES[Math.floor(AS.rand() * EXCUSES.length)] + '\u201D<br><small>(Hmm\u2026 it rattles. It might break again soon. Honest Hank would fix it properly.)</small>'; }
    else { c.cond = 80; c.half = false; c.halfLeft = 0; msg = 'Steve: \u201CDone! Don\u2019t ask what that leftover part is.\u201D'; }
    mechQ = null; G.persist(); Snd.fx('level');
    open('mech', head(k === 'hank' ? '\u2728 Repaired!' : '\uD83E\uDE9B \u201CRepaired\u201D') + bar(c.cond) + '<p class="sub">' + msg + '</p><p class="sub small">Your car is parked out front.' + (how === 'later' ? ' The bill (' + money(pr.total) + ') is on your phone.' : '') + '</p>' + btn('close', null, 'THANKS!', 'primary'));
  }, 1300);
};

/* ---------------- getting run over ---------------- */
let invT = 0, knockT = 0, knock = null, pendT = 0;
const track = {};
AS.inv = () => invT;
function victimOk() {
  if (!G.inGame() || GS.me.area !== 'town' || !W.cur || W.cur.id !== 'town') return false;
  if (invT > 0 || knockT > 0 || pendT > 0 || GS.ovl) return false;
  if ((C() && C().driving()) || GS.me.ride || GS.me.act || tow) return false;
  if (G.meHidden && G.meHidden()) return false;
  if (GL.Health && (GL.Health.riding() || GL.Health.down())) return false;
  if (G.jailed && G.jailed()) return false;
  return true;
}
function vehicles(dt) {
  const out = [], seen = {};
  const add = (key, o, kind, by, v) => {
    if (!o || !o.m) return; seen[key] = 1;
    let sp = v;
    if (sp == null) { const tr = track[key]; if (tr) { const inst = Math.hypot(o.x - tr.x, o.z - tr.z) / Math.max(dt, 1e-3); tr.v += (Math.min(inst, 30) - tr.v) * Math.min(1, dt * 8); tr.x = o.x; tr.z = o.z; sp = tr.v; } else { track[key] = { x: o.x, z: o.z, v: 0 }; sp = 0; } }
    out.push({ key, o, kind, by, v: Math.abs(sp) });
  };
  C().traffic().forEach((o, i) => add('npc' + i, o, 'npc', null, o.v));
  const R = C().remoteCars();
  for (const pid in R) { const p = GS.pos[pid]; if (p && p.c && p.c[5]) add('p' + pid, R[pid], p.c[0] === 'police' || p.c[0] === 'firetruck' || p.c[0] === 'ambulance' || p.c[0] === 'tow' ? p.c[0] : 'player', pid); }
  const wanted = GL.Crime && GL.Crime.myWanted && GL.Crime.myWanted();
  if (GL.Crime && GL.Crime.vehicles && !wanted) GL.Crime.vehicles().forEach((q) => add(q.key, q.o, 'police', null));
  if (GL.Strays && GL.Strays.van) { const v = GL.Strays.van(); if (v) add('acv', v, 'acvan', null); }
  for (const k in track) if (!seen[k]) delete track[k];
  return out;
}
function hitTest(q) {
  const o = q.o, fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), dx = GS.me.x - o.x, dz = GS.me.z - o.z;
  const ahead = dx * fx + dz * fz, side = dx * fz - dz * fx;
  if (Math.abs(ahead) > o.m.L / 2 + 0.35 || Math.abs(side) > o.m.Wd / 2 + 0.35) return null;
  return { fx, fz, side: side >= 0 ? 1 : -1 };
}
const sevOf = (v) => (v < 4 ? 0 : v < 8.5 ? 1 : v < 13 ? 2 : 3);
AS.sevOf = sevOf;
const WHO = { npc: 'A car', player: 'A friend\u2019s car', police: 'A police car', acvan: 'The Animal Control van', ambulance: 'An ambulance', firetruck: 'A fire truck', tow: 'A tow truck' };
// apply a hit to ME (called locally for NPC traffic, or from the host-confirmed event)
function applyHit(v, fx, fz, side, kind, byName) {
  const sev = sevOf(v);
  invT = sev === 0 ? 3 : 5;
  const px = fz * side, pz = -fx * side, k = sev === 0 ? 3.2 : clamp(v * 0.55, 4, 8.5);
  knock = { vx: (fx * 0.55 + px * 0.85) * k, vz: (fz * 0.55 + pz * 0.85) * k, spin: sev === 0 ? 0 : 14 }; knockT = sev === 0 ? 0.3 : 0.6;
  GS.goal = null;
  const who = byName ? byName + '\u2019s car' : WHO[kind] || 'A car';
  W.fx('star', GS.me.x, 2.2, GS.me.z, sev === 0 ? 3 : 8, 0.7);
  if (sev === 0) { Snd.fx('honk'); Snd.fx('boing'); G.toast('\uD83D\uDCEF BEEP BEEP! ' + who + ' bumped you. Watch for traffic!'); return 0; }
  Snd.fx('screech'); Snd.fx('honk'); setTimeout(() => Snd.fx('tumble'), 180);
  const pick = (a) => a[Math.floor(AS.rand() * a.length)];
  const s = sv(); s.stats.runover = (s.stats.runover || 0) + 1;
  if (sev === 1) G.hurt(pick(['scrape', 'bruise', 'bonk']), who + ' bumped you! Boing-boing-boing!', true);
  else if (sev === 2) G.hurt(pick(['sprain', 'wrist']), who + ' ran you over! You tumble like a pinball!', true);
  else G.hurt(pick(['broken', 'bigbonk']), 'WHAM! ' + who + ' flattened you like a pancake!', true);
  return sev;
}
AS._hit = (v, kind, side) => applyHit(v, 0, 1, side || 1, kind || 'npc', null);
function npcReact(o) { o.phone = 0; o.shock = 2.6; }
// host confirms hits from friends' cars, cops and vans (one shared referee for co-op), then everybody sees it
const hostInv = {};
G.hooks.host.push(function (pid, m) {
  if (m.k !== 'runover') return;
  const now = performance.now(); if (hostInv[pid] && now < hostInv[pid]) return;
  const v = clamp(+m.v || 0, 0, 30); hostInv[pid] = now + (v < 4 ? 2800 : 4800);
  const by = m.by && GS.S && GS.S.players.some((p) => p.pid === m.by) ? m.by : null;
  G.pushEv({ type: 'runover', pid, v: +v.toFixed(2), fx: clamp(+m.fx || 0, -1, 1), fz: clamp(+m.fz || 0, -1, 1), side: m.side < 0 ? -1 : 1, kind: WHO[m.kind] ? m.kind : 'npc', by, who: G.playerInfo(pid).name, byName: by ? G.playerInfo(by).name : null });
});
G.hooks.ev.push(function (e) {
  if (e.type !== 'runover') return;
  if (e.pid === GS.pid) { pendT = 0; applyHit(e.v, e.fx, e.fz, e.side, e.kind, e.byName); return; }
  const p = GS.pos[e.pid]; if (p && W.cur && W.cur.id === 'town') W.fx('star', p.x, 2.2, p.z, 6, 0.7);
  if (e.by === GS.pid) { Snd.fx('screech'); G.toast(sevOf(e.v) === 0 ? '\uD83D\uDE2C Oops! You bumped ' + e.who + '. Careful!' : '\uD83D\uDE31 You ran over ' + e.who + '! Say sorry and drive slower!', sevOf(e.v) > 0); }
});
let ranT = 0;
function runoverTick(dt) {
  if (invT > 0) invT -= dt; if (pendT > 0) pendT -= dt;
  if (knockT > 0 && knock) {
    knockT -= dt; const A = W.areas.town, nx = GS.me.x + knock.vx * dt, nz = GS.me.z + knock.vz * dt;
    if (W.isFree(A, nx, nz, 0.3)) { GS.me.x = nx; GS.me.z = nz; } else { knock.vx *= -0.3; knock.vz *= -0.3; }
    knock.vx *= Math.pow(0.2, dt); knock.vz *= Math.pow(0.2, dt); GS.me.yaw += knock.spin * dt;
    if (knockT <= 0) { knock = null; knockT = 0; }
  }
  if (!C() || !W.cur || W.cur.id !== 'town') return;
  const list = vehicles(dt);
  ranT += dt; if (ranT < 0.03) return; ranT = 0;
  if (!victimOk()) return;
  for (const q of list) {
    if (q.v < 1.3) continue;
    const h = hitTest(q); if (!h) continue;
    if (q.kind === 'npc') { npcReact(q.o); applyHit(q.v, h.fx, h.fz, h.side, 'npc', null); }
    else { pendT = 1.2; G.doAct({ k: 'runover', v: +q.v.toFixed(2), fx: +h.fx.toFixed(3), fz: +h.fz.toFixed(3), side: h.side, kind: q.kind, by: q.by }); }
    break;
  }
}
// NPC drivers: some get distracted by their phones (and don't brake for people!), all of them say sorry after a bonk
function bubble(o, txt) {
  if (o.bubT === txt) return; if (o.bub) { o.m.g.remove(o.bub); o.bub = null; } o.bubT = txt; if (!txt) return;
  o.bub = W.textSprite(txt, { size: 34, h: 0.55, bg: txt.indexOf('SORRY') >= 0 ? 'rgba(220,38,38,.92)' : 'rgba(30,41,59,.88)' }); o.bub.position.set(0, 2.7, 0); o.m.g.add(o.bub);
}
G.trafficHook = function (o, dt) {
  if (o.shock > 0) { o.shock -= dt; o.v = 0; bubble(o, '\uD83D\uDE31 SORRY!!'); return; }
  if (o.phone > 0) { o.phone -= dt; bubble(o, '\uD83D\uDCF1'); return; }
  bubble(o, null);
  if (o.nextPh == null) o.nextPh = 6 + AS.rand() * 14;
  o.nextPh -= dt;
  if (o.nextPh <= 0) { o.nextPh = 12 + AS.rand() * 14; if (AS.rand() < 0.3) { o.phone = 9 + AS.rand() * 6; o.hurry = AS.rand() < 0.35; } }
};

/* ---------------- bonking civilians with your car (cartoon only) ---------------- */
// Every bonk: the person tumbles + yells, Officer Pat writes a ticket ($40, $80...). 3rd strike = license suspended until tomorrow + $150.
// Crime path ON makes it worse: you also get wanted stars and a police chase (host-authoritative in co-op).
const drv = () => { const s = sv(); s.drv = s.drv || { strikes: 0, tickets: 0, suspUntil: 0 }; return s.drv; };
AS.suspended = () => { const d = sv().drv; return !!(d && d.suspUntil > G.day()); };
let civT = 0;
function civTick(dt) {
  if (civT > 0) civT -= dt;
  const N = GL.NPC; if (!N || !C() || !C().driving() || !W.cur || W.cur.id !== 'town') return;
  const o = C().cur(); if (!o || Math.abs(o.v) < 2.5) return;
  const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw);
  for (const n of N.list) {
    if (!n.inTown || n.hitT > 0) continue;
    const dx = n.x - o.x, dz = n.z - o.z, ah = dx * fx + dz * fz, sd = dx * fz - dz * fx;
    if (Math.abs(ah) > o.m.L / 2 + 0.3 || Math.abs(sd) > o.m.Wd / 2 + 0.3) continue;
    AS.bonkCiv(n, Math.abs(o.v), fx, fz, sd >= 0 ? 1 : -1);
    break;
  }
}
AS.bonkCiv = function (n, v, fx, fz, side) {
  const k = Math.min(9, 3 + v * 0.5), px = fz * side, pz = -fx * side;
  const yells = ['\uD83D\uDE20 HEY!! WATCH IT!', '\uD83D\uDE21 MY GROCERIES!', '\uD83D\uDE24 I\u2019M CALLING THE COPS!', '\uD83E\uDD2C LEARN TO DRIVE!'];
  if (!GL.NPC.bonk(n, (fx * 0.5 + px) * k, (fz * 0.5 + pz) * k, yells[Math.floor(AS.rand() * yells.length)])) return false;
  Snd.fx('screech'); Snd.fx('boing'); setTimeout(() => Snd.fx('honk'), 150);
  const s = sv(); s.stats.bonked = (s.stats.bonked || 0) + 1;
  if (civT > 0) return true; civT = 3;
  const d = drv(); d.strikes++; d.tickets++;
  const third = d.strikes >= 3, fine = third ? 150 : 40 * d.strikes, crimeOn = !!(s.crime && s.crime.on);
  let paid; if (s.money >= fine) { s.money -= fine; GS.moneyFlash = 1; paid = 'Paid ' + money(fine) + '.'; } else { GL.Health.addBill('Traffic ticket (bonked ' + n.def.name + ')', fine); paid = 'The ' + money(fine) + ' fine was added to your bills.'; }
  if (third) { d.suspUntil = G.day() + 1; d.strikes = 0; const o = C().cur(); if (o && o === C().myCar()) C().act({ kind: 'exit' }); }
  if (crimeOn) { const lv = v >= 10 ? 2 : 1; G.doAct({ k: 'hitrun', lv, x: +GS.me.x.toFixed(1), z: +GS.me.z.toFixed(1) }); }
  G.persist();
  const msg = 'You bonked ' + n.def.name + ' with your car! ' + paid + (third ? ' \uD83D\uDEAB 3 strikes: license SUSPENDED until tomorrow!' : ' Strike ' + d.strikes + ' of 3.');
  if (crimeOn) G.toast('\uD83D\uDEA8 ' + msg + ' The cops are after you!', true);
  else open('ticket', head('\uD83D\uDE93 TICKET!') + '<div class="big">\uD83D\uDC6E\u200D\u2640\uFE0F\uD83D\uDCDD</div><p class="sub">Officer Pat: \u201C' + esc(msg) + '\u201D</p><p class="sub small">' + (third ? 'No driving your car until tomorrow. Walk, take a taxi or ride with a friend.' : 'Drive slower near people! 3 strikes = no driving for a day.') + '</p>' + btn('close', null, third ? 'OK\u2026 \uD83D\uDE14' : 'SORRY! \uD83D\uDE4F', 'primary'));
  return true;
};
G.hooks.host.push(function (pid, m, S) {
  if (m.k !== 'hitrun') return;
  S.wanted = S.wanted || {}; const w = S.wanted[pid], lv = clamp(Math.round(+m.lv) || 1, 1, 3), x = clamp(+m.x || 0, -62, 62), z = clamp(+m.z || 0, -82, 82);
  if (w) { w.lv = Math.min(3, w.lv + 1); w.cool = 8 + 6 * w.lv; w.lx = x; w.lz = z; w.seen = 1; }
  else S.wanted[pid] = { lv, cool: 8 + 6 * lv, area: 'town', t: 0, seen: 1, lx: x, lz: z, spawn: 3, grace: 0, wasIn: 0 };
  G.pushEv({ type: 'hitrun', pid, lv: S.wanted[pid].lv, by: G.playerInfo(pid).name }); G.touch();
});
G.hooks.ev.push(function (e) { if (e.type === 'hitrun' && e.pid === GS.pid) { Snd.fx('alarm'); G.toast('\uD83D\uDEA8 WANTED ' + '\u2605'.repeat(e.lv) + ' \u2014 hide or outrun the cops!', true); } });

/* ---------------- ticks, HUD, phone app ---------------- */
let smokeT = 0;
G.hooks.tick.push(function (dt) {
  runoverTick(dt); civTick(dt);
  if (tow) towTick(dt);
  if (deadT > 0) { deadT -= dt; if (deadT <= 0) { const o = myCarObj(); if (o && C().cur() === o) C().act({ kind: 'exit' }); if (!GS.panel) breakdownPanel(); } }
  smokeT -= dt;
  if (smokeT <= 0) { smokeT = 0.45; const o = myCarObj(), c = car(); if (o && c && W.cur && W.cur.id === 'town' && (c.broken || (o.drive && cond(c) < 25))) W.fx('smoke', o.x + Math.sin(o.yaw) * o.m.L * 0.35, 1.2, o.z + Math.cos(o.yaw) * o.m.L * 0.35, 1, 0.3); }
});
G.hooks.reset.push(() => { if (tow) endTow(); invT = 0; knockT = 0; knock = null; pendT = 0; deadT = 0; mechQ = null; });
G.hooks.leave && G.hooks.leave.push(() => { if (tow) endTow(); });
G.statusParts.push(() => {
  const c = car(), o = myCarObj(); let h = '';
  if (tow) h += '<span class="spill">\uD83D\uDEFB ' + (tow.phase === 'coming' ? 'Tow truck on the way\u2026' : tow.phase === 'wait' ? 'Tow truck is here!' : 'Towing to ' + (tow.k === 'steve' ? 'Steve\u2019s' : 'Hank\u2019s')) + '</span>';
  if (AS.suspended() && !tow) h += '<span class="spill red">\uD83D\uDEAB License suspended</span>';
  else if (!tow && c && c.broken) h += '<button class="spill red" data-a="app" data-v="tow">\uD83D\uDEE0\uFE0F Car ' + (c.broken === 'crash' ? 'wrecked' : 'broken') + ' \u00b7 call tow</button>';
  else if (c && o && o.drive) { const v = Math.round(cond(c)); h += '<span class="spill ' + (v < 25 ? 'red' : v < 50 ? 'warn' : '') + '">\uD83D\uDE97 ' + v + '%' + (c.half ? ' \uD83E\uDE79' : '') + '</span>'; }
  return h;
});
UI.app_tow = function () {
  const c = car(), s = sv();
  let h = head('\uD83D\uDEFB Tow & Repair');
  if (!c) { open('tow', h + '<p class="sub">You don\u2019t have a car yet. Buy one at the car lot!</p>'); return; }
  const cc = cond(c), k = towFor(c), name = (GL.CARS[c.type] || { name: 'Car' }).name;
  h += '<p class="sub"><b>' + esc(name) + '</b>' + (c.broken ? ' \u2014 <b style="color:#dc2626">' + (c.broken === 'crash' ? 'WRECKED' : 'BROKEN DOWN') + '</b>' : c.half ? ' \u2014 \u201Cmostly fixed\u201D \uD83E\uDE79' : '') + '</p>' + bar(cc);
  if (tow) h += '<p class="sub">\uD83D\uDEFB ' + (tow.phase === 'coming' ? 'The tow truck is on the way!' : tow.phase === 'wait' ? 'The tow truck is waiting by your car.' : 'Towing\u2026') + '</p>';
  else if (c.broken) h += btn('towCall', k, '\uD83D\uDCF1 CALL TOW TRUCK (' + money(SHOP[k].tow) + ')', 'primary');
  else h += btn('towCall', 'hank', '\uD83D\uDEFB Tow to Hank\u2019s for a check-up (' + money(SHOP.hank.tow) + ')');
  h += '<div class="list"><div class="lrow"><b>\uD83D\uDEE0\uFE0F Honest Hank\u2019s<small>Breakdowns go here. Fair price, fixed right.</small></b></div><div class="lrow"><b>\uD83E\uDE9B Sketchy Steve\u2019s<small>Crash wrecks go here (the tow driver is his cousin). Pricey\u2026 and sometimes only half-fixed!</small></b></div></div>';
  const owe = (s.bills || []).reduce((m, b) => m + b.amt, 0);
  h += '<p class="sub small">' + money(s.money) + ' on hand' + (owe ? ' \u00b7 bills: ' + money(owe) + ' (pay in \uD83E\uDE7A Health)' : '') + '</p>';
  open('tow', h);
};
})();
