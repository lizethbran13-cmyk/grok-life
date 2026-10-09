/* Grok Life - health: health bar, cartoon injuries, phone doctor appointments, clinic visits,
   ambulance rides, hospital bills and Gary the not-so-helpful insurance agent */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, Snd = GL.Snd, UI = GL.UI;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money, clamp = GL.clamp;
const HL = GL.Health = {};
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
let cool = 30, slipT = 0, wetIn = false, fountIn = false, amb = null, lv1T = 0;
G.statusParts = G.statusParts || [];

const inj = () => sv().inj;
const lv = () => (sv().inj ? sv().inj.lv : 0);
const absNow = () => G.day() * 1440 + G.clock();
HL.cap = () => (lv() >= 3 ? 25 : lv() === 2 ? 60 : 100);
HL.lv = lv;
HL.down = () => lv() >= 3;
HL.riding = () => !!amb;

/* ---------------- getting hurt ---------------- */
const QUIPS = {
  scrape: ['Oof! You scraped your knee.', 'Owie! A scraped knee.'], bonk: ['BONK! You bumped your head.', 'Bonk! Seeing a few cartoon stars\u2026'],
  bruise: ['Whoops! Bruised elbow.', 'Ouch! That\u2019ll be a bruise.'], finger: ['Yowch! A sore finger.', 'Ow ow ow! Sore finger!'],
  sprain: ['OUCH! You sprained your ankle.', 'Yikes! Twisted ankle!'], wrist: ['OUCH! You twisted your wrist.'],
  broken: ['KER-RUNCH! That\u2019s a broken leg!'], bigbonk: ['KA-BONK!! Super-bonked noggin!']
};
G.hurt = function (id, why, force) {
  const s = sv(), I = GL.INJ[id]; if (!I || !G.inGame()) return false;
  if (!force && cool > 0) return false;
  if (amb || G.jailed && G.jailed()) return false;
  cool = 75; Snd.fx('ouch');
  const cur = lv();
  W.fx('star', GS.me.x, 2.3, GS.me.z, 6, 0.6);
  s.hp = clamp(s.hp - (I.lv === 1 ? 14 : I.lv === 2 ? 32 : 70), 5, 100);
  if (I.lv >= cur) s.inj = { id, lv: I.lv, t: absNow() };
  s.hp = Math.min(s.hp, HL.cap());
  const q = QUIPS[id]; const msg = (why ? why + ' ' : '') + q[Math.floor(Math.random() * q.length)];
  if (I.lv === 1) { G.toast('\uD83E\uDD15 ' + msg + ' (+ bandages at the clinic pharmacy help)'); lv1T = 0; }
  else if (I.lv === 2 && cur < 3) { G.toast('\uD83E\uDD15 ' + msg + ' You\u2019re limping \u2014 book a doctor appointment on your phone (\uD83E\uDE7A Health).', true); }
  else if (I.lv === 3) { goDown(msg); }
  G.persist(); return true;
};
function goDown(msg) {
  const C = GL.Cars;
  if (GS.work && GL.Work) GL.Work.abort(true);
  if (C) { const o = C.cur && C.cur(); if (o && C.workObj() === o) C.endWork(o.x, o.z); else if (o) C.act({ kind: 'exit' }); if (GS.me.ride) C.act({ kind: 'unride' }); }
  if (GS.me.act) G.endAct(true);
  G.closePanel(); GS.goal = null;
  setTimeout(() => HL.downPanel(msg), 350);
}
HL.downPanel = function (msg) {
  if (lv() < 3 || amb) return;
  open('down', head('\uD83D\uDE91 Big ouch!') + '<div class="big">' + (GL.INJ[inj().id].icon) + '</div><p class="sub">' + esc(msg || GL.INJ[inj().id].name) + ' You can\u2019t walk on that! Call an ambulance to take you to Maple Hospital.</p>' + btn('callAmb', null, '\uD83D\uDCF1 CALL AMBULANCE', 'red') + '<p class="sub small">(The ride is free. The hospital sends a bill later\u2026)</p>');
};
// crashes (from cars.js)
G.onCrash = function (v, work) {
  if (work || v < 10.5) return;
  const r = Math.random();
  if (v >= 15) { if (r < 0.14) G.hurt(Math.random() < 0.6 ? 'broken' : 'bigbonk', 'CRASH!'); else if (r < 0.4) G.hurt(Math.random() < 0.5 ? 'wrist' : 'sprain', 'CRASH!'); else if (r < 0.8) G.hurt('bonk', 'Crash!'); }
  else if (r < 0.45) G.hurt(Math.random() < 0.5 ? 'bonk' : 'bruise', 'Bump!');
};
// playground + sports
G.onPlayDone = function (play) {
  const r = Math.random();
  if (play === 'slide') { if (r < 0.04) G.hurt('sprain', 'You landed funny off the slide.'); else if (r < 0.2) G.hurt('scrape', 'Slid a bit too fast!'); }
  else if (play === 'swing') { if (r < 0.12) G.hurt('bonk', 'You let go of the swing!'); }
  else if (play === 'seesaw') { if (r < 0.1) G.hurt('bruise', 'Seesaw thump!'); }
  else if (play === 'hoops') { if (r < 0.02) G.hurt('broken', 'You tried a slam dunk\u2026'); else if (r < 0.09) G.hurt('sprain', 'You landed on the ball!'); else if (r < 0.28) G.hurt('finger', 'Jammed your finger on the ball!'); else G.toast('\uD83C\uDFC0 Swish! Nothing but net!'); }
};
// work mishaps (from work.js)
G.onWorkDone = function (cid, stars, miss) {
  const r = Math.random();
  if (miss >= 5 && stars === 0 && r < 0.15) G.hurt(cid === 'chef' || cid === 'mechanic' ? 'wrist' : 'sprain', 'Work mishap!');
  else if (miss >= 3 && r < 0.35) G.hurt(cid === 'chef' ? 'finger' : cid === 'fire' ? 'bruise' : cid === 'mechanic' ? 'finger' : 'bonk', 'Work mishap!');
};
G.injBlock = function () { if (lv() >= 2) { G.toast('\uD83E\uDD15 You\u2019re hurt! See the doctor before your next shift (phone \u2192 \uD83E\uDE7A Health).', true); return true; } return false; };

/* ---------------- movement + HUD hooks ---------------- */
G.speedMul = () => (lv() === 2 ? 0.6 : sv().hp < 30 ? 0.85 : 1);
const prevFrozen = G.frozen;
G.frozen = () => HL.down() || !!amb || (prevFrozen ? prevFrozen() : false);
G.meHidden = () => !!(amb && amb.inside);
G.injIcon = () => (inj() ? GL.INJ[inj().id].icon : '');
G.statusParts.push(() => {
  const s = sv(); let o = '';
  if (s.inj) { const I = GL.INJ[s.inj.id]; o += '<button class="spill ' + (I.lv >= 2 ? 'red' : '') + '" data-a="app" data-v="health">' + I.icon + ' ' + esc(I.name) + (s.inj.lv === 2 && s.appt ? ' \u00b7 \uD83D\uDCC5 ' + G.timeStr(s.appt.min) : s.inj.lv === 2 ? ' \u00b7 book doctor' : s.inj.lv === 3 && !amb ? ' \u00b7 \uD83D\uDCDE call 911' : '') + '</button>'; }
  else if (s.appt) o += '<button class="spill" data-a="app" data-v="health">\uD83D\uDCC5 Doctor ' + G.timeStr(s.appt.min) + '</button>';
  if (amb) o += '<span class="spill red">\uD83D\uDE91 ' + (amb.phase === 'coming' ? 'Ambulance on the way\u2026' : 'Riding to the hospital') + '</span>';
  return o;
});

/* ---------------- tick: healing, slips, ambulance ---------------- */
G.hooks.tick.push(function (dt) {
  const s = sv(); if (!G.inGame()) return;
  if (cool > 0) cool -= dt;
  const cap = HL.cap(), a = GS.me.act;
  let rate = 0.1; if (a && (a.kind === 'sleep' || a.pose === 'lie')) rate = 0.9; else if (a && a.pose === 'sit') rate = 0.2;
  if (s.needs.h < 15) rate *= 0.3;
  if (s.hp < cap) s.hp = Math.min(cap, s.hp + rate * dt); else if (s.hp > cap) s.hp = cap;
  // minor injuries fade on their own after a while (or faster when healthy)
  if (lv() === 1) { lv1T += dt; if (s.hp >= 92 || lv1T > 200) { const I = GL.INJ[s.inj.id]; s.inj = null; lv1T = 0; G.toast('\u2728 Your ' + I.name.toLowerCase() + ' feels all better!'); G.persist(); } }
  // slippery spots: wet floor at Fresh Mart, splashy fountain in the park
  const A = W.cur, sp = GS.me.sp || 0;
  if (A && A.wet && !GS.me.act) { const w = A.wet[0], d = Math.hypot(GS.me.x - w[0], GS.me.z - w[1]), inP = d < w[2]; if (inP && !wetIn && sp > 2.5 && Math.random() < 0.5) { Snd.fx('boing'); G.hurt(Math.random() < 0.08 ? 'sprain' : 'bruise', 'SPLAT! You slipped on the wet floor!'); } wetIn = inP; }
  if (A && A.id === 'town' && !(GL.Cars && GL.Cars.driving())) { const d = Math.hypot(GS.me.x + 24, GS.me.z - 24), inF = d < 3.9; if (inF && !fountIn && sp > 5 && Math.random() < 0.25) { Snd.fx('splash'); G.hurt('scrape', 'You slipped on the splashy fountain tiles!'); } fountIn = inF; }
  slipT += dt;
  if (amb) ambTick(dt);
});
G.onSleep = function () { const s = sv(); s.hp = Math.min(HL.cap(), s.hp + 45); if (lv() === 1) { s.inj = null; G.toast('\u2728 A good sleep healed your boo-boo!'); } G.persist(); };

/* ---------------- pharmacy meds ---------------- */
H.useMed = (k) => {
  const s = sv(), it = GL.ITEMS[k]; if (!s.bag[k]) return;
  if (s.hp >= HL.cap() && !(lv() === 1)) { G.toast(lv() >= 2 ? 'That won\u2019t fix a ' + GL.INJ[s.inj.id].name.toLowerCase() + ' \u2014 you need a doctor!' : 'You\u2019re already feeling great!'); return; }
  s.bag[k]--; s.hp = Math.min(HL.cap(), s.hp + it.hp); if (it.e) G.need('e', it.e); Snd.fx('sparkle'); W.fx('heart', GS.me.x, 2, GS.me.z, 4, 0.4);
  if (lv() === 1 && it.hp >= 15) { s.inj = null; G.toast(it.icon + ' All patched up! Good as new.'); }
  else if (lv() >= 2) G.toast(it.icon + ' That helps a little\u2026 but you still need a doctor.');
  else G.toast(it.icon + ' +' + it.hp + ' health');
  G.persist(); UI.bag();
};

/* ---------------- phone: Health app ---------------- */
function slots() {
  const out = []; let t = Math.ceil((G.clock() + 20) / 30) * 30, d = G.day();
  for (let i = 0; i < 200 && out.length < 3; i++) {
    if (t >= 1440) { t -= 1440; d++; }
    if (t >= 8 * 60 && t <= 19 * 60 + 30) out.push({ day: d, min: t }); else if (t > 19 * 60 + 30) { t = 1440 + 8 * 60; continue; } else if (t < 8 * 60) { t = 8 * 60; continue; }
    t += 30;
  }
  return out;
}
HL.slots = slots;
const dayWord = (d) => (d === G.day() ? 'Today' : d === G.day() + 1 ? 'Tomorrow' : 'Day ' + d);
UI.app_health = function () {
  const s = sv(), I = s.inj ? GL.INJ[s.inj.id] : null, hp = Math.round(s.hp);
  let h = head('\uD83E\uDE7A Health') + '<div class="hpBig"><b>\u2764\uFE0F ' + hp + ' / 100</b><span class="meter"><em style="width:' + hp + '%;background:' + (hp < 30 ? '#ef4444' : hp < 60 ? '#f59e0b' : '#f43f5e') + '"></em></span></div>';
  if (!I) h += '<p class="sub">No injuries! ' + (hp < 100 ? 'Rest, sleep or grab a bandage to top up.' : 'Feeling great \uD83D\uDCAA') + '</p>';
  else if (I.lv === 1) h += '<p class="sub">' + I.icon + ' <b>' + esc(I.name) + '</b> \u2014 a minor ouchie. It heals with rest or sleep, or use a bandage / ice pack from the Maple Clinic pharmacy.</p>';
  else if (I.lv === 2) {
    h += '<p class="sub">' + I.icon + ' <b>' + esc(I.name) + '</b> \u2014 a serious injury. You\u2019re limping and can\u2019t work until a doctor fixes it.</p>';
    if (s.appt) { h += '<div class="appt">\uD83D\uDCC5 Appointment: <b>' + dayWord(s.appt.day) + ' ' + G.timeStr(s.appt.min) + '</b> with Dr. Priya at Maple Clinic.<br><small>Check in at the front desk up to 30 min early (or up to 1 hour late).</small></div>' + '<div class="btnrow">' + btn('guideClinic', null, '\uD83E\uDDED GUIDE ME', 'blue') + btn('cancelAppt', null, 'CANCEL', 'alt small') + '</div>'; }
    else { h += '<h3>\uD83D\uDCC5 Book a doctor appointment</h3><p class="sub small">Maple Clinic \u00b7 Dr. Priya \u00b7 visit fee ' + money(GL.CLINIC_FEE) + '</p><div class="btncol">' + slots().map((q) => btn('book', q.day + '|' + q.min, dayWord(q.day) + ' \u00b7 ' + G.timeStr(q.min), 'green small')).join('') + '</div>'; }
  } else {
    h += '<p class="sub">' + I.icon + ' <b>' + esc(I.name) + '</b> \u2014 very serious! ' + (amb ? 'The ambulance is on its way.' : 'Call an ambulance.') + '</p>' + (amb ? '' : btn('callAmb', null, '\uD83D\uDE91 CALL AMBULANCE', 'red'));
  }
  const unpaid = s.bills.filter((b) => b.amt > 0);
  if (unpaid.length) {
    h += '<h3>\uD83E\uDDFE Bills</h3><div class="list">' + unpaid.map((b) => '<div class="lrow"><b>' + esc(b.what) + '<small>' + money(b.amt) + ' left' + (b.ins ? ' \u00b7 insurance paid ' + money(b.ins) : '') + '</small></b><span>' + btn('payBill', b.id + '|50', 'PAY $50', 'small', s.money < Math.min(50, b.amt)) + btn('payBill', b.id + '|all', 'PAY ALL', 'small green', s.money < b.amt) + '</span></div>').join('') + '</div>';
    if (unpaid.some((b) => b.ins == null)) h += btn('callIns', unpaid.find((b) => b.ins == null).id, '\uD83D\uDCDE CALL GROKCARE INSURANCE', 'blue');
  }
  open('health', h);
};
H.guideClinic = () => { const b = W.bld('clinic'); G.guide = { x: b.out[0], z: b.out[1], label: 'Maple Clinic' }; G.closePanel(); G.toast('\uD83E\uDDED Follow the arrow to Maple Clinic!'); };
H.book = (v) => { const [d, m] = v.split('|').map(Number), s = sv(); s.appt = { day: d, min: m }; G.persist(); Snd.fx('ding'); G.toast('\uD83D\uDCC5 Booked! Dr. Priya will see you ' + dayWord(d).toLowerCase() + ' at ' + G.timeStr(m) + '.'); UI.app_health(); };
H.cancelAppt = () => { sv().appt = null; G.persist(); UI.app_health(); };
H.payBill = (v) => { const [id, how] = v.split('|'), s = sv(), b = s.bills.find((q) => q.id === +id); if (!b) return; const n = how === 'all' ? b.amt : Math.min(50, b.amt); if (!G.spend(n)) return; b.amt -= n; if (b.amt <= 0) { s.bills = s.bills.filter((q) => q.amt > 0); G.toast('\u2705 Bill paid off! The hospital sends a smiley sticker.'); } G.persist(); if (GS.panel === 'billing') HL.billing(); else UI.app_health(); };
H.callAmb = () => { G.closePanel(); HL.callAmbulance(); };
H.callIns = (id) => { G.closePanel(); HL.insurance(+id); };
function addBill(what, amt) { const s = sv(); const id = (s.bills.reduce((m, b) => Math.max(m, b.id), 0) || 0) + 1; s.bills.push({ id, what, amt, ins: null }); G.persist(); return id; }
HL.addBill = addBill;

/* ---------------- clinic visit ---------------- */
G.hooks.kinds.checkin = function () {
  const s = sv(), L = lv();
  if (!s.appt) {
    if (L === 2) { open('checkin', head('\uD83E\uDE7A Front Desk') + '<p class="sub">Nurse Jo: \u201COh no, that looks sore! Do you have an appointment? Book one on your phone \u2014 it\u2019s the \uD83E\uDE7A Health app.\u201D</p>' + btn('openHealth', null, '\uD83D\uDCF1 OPEN HEALTH APP', 'green')); return; }
    if (L === 1) { G.toast('Nurse Jo: \u201CJust a little ouchie! Grab a bandage from the pharmacy.\u201D'); return; }
    G.toast('Nurse Jo: \u201CYou look healthy as a horse! \uD83D\uDC34\u201D'); return;
  }
  const now = absNow(), at = s.appt.day * 1440 + s.appt.min;
  if (now > at + 60) { s.appt = null; G.persist(); open('checkin', head('\uD83E\uDE7A Front Desk') + '<p class="sub">Nurse Jo: \u201CHmm, you missed your appointment! No worries, just book a new one.\u201D</p>' + btn('openHealth', null, '\uD83D\uDCF1 BOOK AGAIN', 'green')); return; }
  if (now < at - 30) {
    const canSkip = GS.role !== 'client';
    open('checkin', head('\uD83E\uDE7A Front Desk') + '<p class="sub">Nurse Jo: \u201CYou\u2019re early! Your appointment is ' + dayWord(s.appt.day).toLowerCase() + ' at ' + G.timeStr(s.appt.min) + '. Have a seat in the waiting room.\u201D</p>' + (canSkip ? btn('waitAppt', null, '\uD83E\uDE91 WAIT UNTIL ' + G.timeStr(s.appt.min), 'green') : '<p class="sub small">Sit in a waiting room chair until it\u2019s time (the host controls the clock).</p>'));
    return;
  }
  HL.visit();
};
H.openHealth = () => { G.closePanel(); UI.app_health(); };
H.waitAppt = () => { const s = sv(); if (!s.appt) return; G.closePanel(); document.getElementById('fade').classList.add('on'); setTimeout(() => { G.skipTo(s.appt.min); document.getElementById('fade').classList.remove('on'); G.toast('\u23F0 \u201C' + G.myName() + '? The doctor will see you now!\u201D'); HL.visit(); }, 700); };
const DOC = [['\uD83D\uDDE3\uFE0F', 'Dr. Priya: \u201CSay AHHH!\u201D', 'AHHHH!'], ['\uD83E\uDE7B', 'Dr. Priya: \u201CLet\u2019s take an X-ray. Hold still\u2026\u201D', 'HOLD STILL \uD83D\uDDBC\uFE0F'], ['\uD83E\uDE79', 'Dr. Priya: \u201CJust needs a wrap and some rest!\u201D', 'WRAP IT UP']];
HL.visit = function (step) {
  step = step || 0; const s = sv();
  if (step < DOC.length) { const d = DOC[step]; open('docVisit', head('\uD83E\uDE7A Dr. Priya') + '<div class="big">' + d[0] + '</div><p class="sub">' + d[1] + '</p>' + btn('docStep', step + 1, d[2], 'primary')); Snd.fx(step === 1 ? 'beep' : 'click'); return; }
  const I = s.inj ? GL.INJ[s.inj.id] : null; s.inj = null; s.appt = null; s.hp = Math.max(s.hp, 90); s.stats.healed = (s.stats.healed || 0) + 1;
  let paid = '';
  if (s.money >= GL.CLINIC_FEE) { G.spend(GL.CLINIC_FEE); paid = 'Visit fee: ' + money(GL.CLINIC_FEE) + ' paid.'; } else { addBill('Maple Clinic visit', GL.CLINIC_FEE); paid = 'Short on cash? We sent you a bill for ' + money(GL.CLINIC_FEE) + '.'; }
  Snd.fx('level'); W.fx('sparkle', GS.me.x, 1.8, GS.me.z, 10, 1);
  open('docVisit', head('\u2728 All better!') + '<div class="big">\uD83E\uDDB5\u2728</div><p class="sub">' + (I ? 'Your ' + esc(I.name.toLowerCase()) + ' is fixed! ' : '') + 'Dr. Priya gives you a lollipop \uD83C\uDF6D</p><p class="sub small">' + paid + '</p>' + btn('close', null, 'THANKS, DOC!', 'green'));
  G.persist(); G.checkGoals && G.checkGoals();
};
H.docStep = (v) => HL.visit(+v);

/* ---------------- ambulance ---------------- */
const HOSP = () => W.bld('hospital').out;
HL.callAmbulance = function () {
  if (amb || lv() < 3) return;
  Snd.fx('ding'); G.toast('\uD83D\uDCDE 9-1-1: \u201CHelp is on the way! Stay right there!\u201D');
  const A = W.cur; let px = GS.me.x, pz = GS.me.z, inside = false;
  if (!A.outdoor) { inside = true; const o = A.homeKey ? G.homeSpot(A.homeKey).door : A.exitTo || HOSP(); px = o[0]; pz = o[1]; }
  const hs = HOSP(), car = GL.Cars.makeCar('ambulance', null, hs[0], hs[1] + 2, 0);
  amb = { phase: 'coming', car, path: W.navPath(hs[0], hs[1] + 2, px, pz), pi: 0, t: 0, px, pz, inside: false, wasInside: inside, sirenT: 0 };
};
function driveTo(o, tx, tz, sp, dt) { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.6) return true; const want = Math.atan2(dx, dz); o.yaw += G.ang(want - o.yaw) * Math.min(1, dt * 5); const st = Math.min(d, sp * dt); o.x += dx / d * st; o.z += dz / d * st; o.v = sp; return false; }
function ambTick(dt) {
  const a = amb, o = a.car; a.t += dt; a.sirenT -= dt;
  if (a.sirenT <= 0) { a.sirenT = 1.1; if (W.cur && W.cur.id === 'town' || a.phase === 'ride') Snd.fx('wail'); }
  if (o.m.siren) o.m.siren.forEach((s, i) => { s.visible = Math.floor(W.time * 5 + i) % 2 === 0; });
  if (a.phase === 'coming') {
    const p = a.path[a.pi]; if (!p) { arrive(); return; }
    if (driveTo(o, p[0], p[1], 13, dt)) a.pi++;
    if (a.t > 22) arrive();
  } else if (a.phase === 'ride') {
    const p = a.path[a.pi]; if (!p || a.t > 20) { toHospital(); return; }
    if (driveTo(o, p[0], p[1], 15, dt)) a.pi++;
    GS.me.x = o.x; GS.me.z = o.z; GS.me.area = 'town';
  }
  GL.Cars.placeCar(o);
}
function arrive() {
  const a = amb; const f = document.getElementById('fade');
  f.classList.add('on'); Snd.fx('door');
  setTimeout(() => {
    a.car.x = a.px; a.car.z = a.pz; GL.Cars.placeCar(a.car);
    if (W.cur.id !== 'town') G.travel('town', true, [a.px, a.pz]);
    a.phase = 'ride'; a.inside = true; a.t = 0; a.pi = 0; const hs = HOSP(); a.path = W.navPath(a.px, a.pz, hs[0], hs[1] + 1.5);
    GS.me.x = a.px; GS.me.z = a.pz;
    f.classList.remove('on'); G.toast('\uD83D\uDE91 The paramedics lift you in. Wee-ooo wee-ooo!');
  }, 700);
  a.phase = 'loading';
}
function toHospital() {
  const a = amb; a.phase = 'done';
  const f = document.getElementById('fade'); f.classList.add('on');
  setTimeout(() => {
    GL.Cars.killCar(a.car); amb = null;
    G.travel('hospital', true, [5.8, 0]);
    G.startAct({ kind: 'er', pose: 'lie', x: 7.3, z: 0.1, yaw: -Math.PI / 2, name: 'In the ER', stopLabel: '\u2026' });
    f.classList.remove('on'); HL.er(0);
  }, 700);
}
G.camHook = () => { if (!amb || amb.phase !== 'ride') return null; W.camZoom = 1.35; W.camAhead = [0, 0]; return [amb.car.x, amb.car.z]; };
G.carOverride = () => (amb && amb.phase === 'ride' ? ['ambulance', '#ffffff', +amb.car.x.toFixed(2), +amb.car.z.toFixed(2), +amb.car.yaw.toFixed(2), 1, 0, ''] : null);
const ER = [['\uD83E\uDE7B', 'Dr. Priya: \u201CLet\u2019s get some X-rays\u2026 yep, that\u2019s definitely the problem!\u201D', 'OKAY'], ['\uD83E\uDDB4', 'Dr. Priya: \u201CA big cartoon cast, coming right up! Want stickers on it?\u201D', 'YES PLEASE \u2B50'], ['\uD83D\uDECC', 'You rest in the hospital bed for a while. The jello is surprisingly good.', 'YUM \uD83C\uDF6E']];
HL.er = function (step) {
  const s = sv();
  if (step < ER.length) { const d = ER[step]; open('er', head('\uD83C\uDFE5 Maple Hospital ER') + '<div class="big">' + d[0] + '</div><p class="sub">' + d[1] + '</p>' + btn('erStep', step + 1, d[2], 'primary')); return; }
  s.inj = null; s.appt = null; s.hp = 75; s.stats.healed = (s.stats.healed || 0) + 1;
  if (GS.role !== 'client') G.skipTo((G.clock() + 120) % 1440);
  const id = addBill('Maple Hospital ER visit', GL.HOSPITAL_BILL);
  if (GS.me.act) G.endAct(true);
  Snd.fx('level'); G.checkGoals && G.checkGoals();
  open('er', head('\u2728 Patched up!') + '<div class="big">\uD83E\uDDBF\u2728</div><p class="sub">You\u2019re back on your feet! (Health 75 \u2014 rest to fill it up.)</p><div class="appt">\uD83E\uDDFE <b>Hospital bill: ' + money(GL.HOSPITAL_BILL) + '</b></div><p class="sub small">\uD83D\uDCF1 Your phone is ringing\u2026 it\u2019s your insurance company!</p>' + btn('callIns', id, '\uD83D\uDCDE ANSWER', 'green'));
};
H.erStep = (v) => HL.er(+v);

/* ---------------- Gary from GrokCare Insurance(tm) ---------------- */
let ins = null;
function ovl(html) { let o = document.getElementById('insOv'); if (!o) { o = document.createElement('div'); o.id = 'insOv'; o.className = 'ovl'; document.body.appendChild(o); } o.innerHTML = html; GS.ovl = 'ins'; GS.joyReset && GS.joyReset(); return o; }
function ovlClose() { const o = document.getElementById('insOv'); if (o) o.remove(); GS.ovl = null; ins = null; }
const INSQ = [
  { q: 'Was your injury caused by a llama?', o: ['\uD83E\uDD99 Yes', '\u274C No', '\uD83E\uDD14 Not sure'], ok: 1, say: ['Hmm, llamas aren\u2019t covered.', 'Great, llamas would\u2019ve been a problem.', 'I\u2019ll write down \u201Cmaybe llama.\u201D'] },
  { q: 'Please spell \u201CBROKEN LEG\u201D backwards for our records.', o: ['GEL NEKORB', 'LEG BROKEN', 'BKN LG'], ok: 0, say: ['Wow. Impressive.', 'That\u2019s\u2026 forwards.', 'I\u2019ll allow it. Barely.'] },
  { q: 'Which of these is a potato? (Form 27-B requires it.)', o: ['\uD83E\uDD54', '\uD83E\uDEA8', '\uD83C\uDF60'], ok: 0, say: ['Correct! Very potato.', 'That\u2019s a rock. I\u2019m writing \u201Crock.\u201D', 'Close! That\u2019s a sweet potato.'] },
  { q: 'Did you try turning your leg off and on again?', o: ['\uD83D\uDD0C Yes', '\uD83D\uDE10 That\u2019s not a thing', '\uD83E\uDDB5 It\u2019s off now'], ok: 1, say: ['Hmm, that voids the warranty.', 'Fair point. I\u2019ll check the box anyway.', 'Oh no.'] }
];
HL.insurance = function (billId) {
  const s = sv(), b = s.bills.find((q) => q.id === billId); if (!b) return;
  if (b.ins != null) { G.toast('GrokCare already \u201Chelped\u201D with that bill.'); return; }
  ins = { billId, step: -1, good: 0, hold: 0 };
  Snd.fx('ding');
  ovl('<div class="insBox"><div class="insFace">\uD83E\uDDD1\u200D\uD83D\uDCBC</div><h2>GrokCare Insurance\u2122</h2><p>\u201CHi, this is <b>Gary</b>! Thanks for calling GrokCare, where we care\u2026 a little.\u201D</p><p class="sub">\u201CPlease hold.\u201D \uD83C\uDFB5</p><div class="holdBar"><em id="holdBar"></em></div><p class="sub small" id="holdTxt">You are caller number 47.</p></div>');
  Snd.fx('holdmusic');
  let n = 0; const tick = () => { if (!ins) return; n++; const e = document.getElementById('holdBar'); if (e) e.style.width = Math.min(100, n * 12.5) + '%'; const t = document.getElementById('holdTxt'); if (t) t.textContent = ['You are caller number 47.', 'You are caller number 46.', 'Your call is very important to us.', 'You are caller number 3!', 'You are caller number 2!!', '\u2026caller number 1!'][Math.min(5, n - 1)] || ''; if (n === 4) Snd.fx('holdmusic'); if (n >= 8) { ins.step = 0; insQ(); } else setTimeout(tick, 450); };
  setTimeout(tick, 450);
};
function insQ() {
  if (!ins) return;
  if (ins.step >= INSQ.length) { insDone(); return; }
  const q = INSQ[ins.step];
  ovl('<div class="insBox"><div class="insFace">\uD83E\uDDD1\u200D\uD83D\uDCBC</div><h2>Question ' + (ins.step + 1) + ' of ' + INSQ.length + '</h2><p>Gary: \u201C' + q.q + '\u201D</p><div class="btncol">' + q.o.map((o, i) => '<button class="btn blue" data-a="insA" data-v="' + i + '">' + o + '</button>').join('') + '</div><p class="sub small" id="insSay"></p></div>');
}
H.insA = (v) => {
  if (!ins || ins.lock) return; const q = INSQ[ins.step], i = +v; if (i === q.ok) { ins.good++; Snd.fx('right'); } else Snd.fx('wrong');
  const e = document.getElementById('insSay'); if (e) e.textContent = 'Gary: \u201C' + q.say[i] + '\u201D';
  ins.lock = true; setTimeout(() => { if (!ins) return; ins.lock = false; ins.step++; insQ(); }, 1100);
};
function insDone() {
  const s = sv(), b = s.bills.find((q) => q.id === ins.billId); if (!b) { ovlClose(); return; }
  const pct = 8 + ins.good * 3, cover = Math.round(b.amt * pct / 100); b.amt -= cover; b.ins = cover; G.persist();
  Snd.fx('cash');
  ovl('<div class="insBox"><div class="insFace">\uD83E\uDDD1\u200D\uD83D\uDCBC</div><h2>Great news!*</h2><p>Gary: \u201CAfter careful review of your potato, GrokCare will cover <b>' + pct + '%</b>! That\u2019s <b>' + money(cover) + '</b>!\u201D</p><p class="sub">You still owe <b>' + money(b.amt) + '</b>. Pay it on your phone (\uD83E\uDE7A Health) or at the hospital Billing Desk.</p><p class="sub small">*Great news not guaranteed. Have a GrokCare day!</p><button class="btn green" data-a="insClose">THANKS\u2026 I GUESS?</button></div>');
}
H.insClose = () => { ovlClose(); G.closePanel(); };
HL.billing = function () {
  const s = sv(), unpaid = s.bills.filter((b) => b.amt > 0);
  let h = head('\uD83E\uDDFE Billing Desk') + (unpaid.length ? '<p class="sub small">' + money(s.money) + ' on hand</p><div class="list">' + unpaid.map((b) => '<div class="lrow"><b>' + esc(b.what) + '<small>' + money(b.amt) + ' left</small></b><span>' + btn('payBill', b.id + '|50', 'PAY $50', 'small', s.money < Math.min(50, b.amt)) + btn('payBill', b.id + '|all', 'PAY ALL', 'small green', s.money < b.amt) + '</span></div>').join('') + '</div>' : '<p class="sub">No bills! The clerk gives you a thumbs up \uD83D\uDC4D</p>');
  open('billing', h);
};
G.hooks.kinds.billing = () => HL.billing();
G.hooks.newDay.push(() => { const s = sv(), owe = s.bills.reduce((m, b) => m + b.amt, 0); if (owe > 0) setTimeout(() => G.toast('\uD83D\uDCEC Reminder: you owe ' + money(owe) + ' in bills (phone \u2192 \uD83E\uDE7A Health to pay).'), 2500); });
G.hooks.reset.push(() => { if (amb) { GL.Cars.killCar(amb.car); amb = null; } ovlClose(); });
// resuming a save while badly hurt: show the "call ambulance" prompt again once in town
let downNag = 0; G.hooks.tick.push((dt) => { if (!HL.down() || amb || GS.panel || GS.ovl || !document.getElementById('phone').classList.contains('hidden')) { downNag = 0; return; } downNag += dt; if (downNag > 1.5) { downNag = 0; HL.downPanel(); } });
})();
