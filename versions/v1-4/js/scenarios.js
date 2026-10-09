/* Grok Life - Scenarios app (make things happen on purpose: get run over, catch a cold, sick pets, kitchen fires...),
   a working 9-1-1 phone app that sends the right help, and the Grokville Vet Clinic (pet health, Dr. Kiki, pet bills + Paws Protect) */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, Snd = GL.Snd, UI = GL.UI;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money;
const SC = GL.Scen = {};
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const HL = () => GL.Health, AS = () => GL.AutoShop, C = () => GL.Cars;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
G.statusParts = G.statusParts || [];
let resp = [], zoom = null, petSel = null, nagT = 0, sirenT = 0, fxT = 0;

/* ---------------- helpers ---------------- */
const em = () => sv().em || null;
const setEm = (e) => { sv().em = e; G.persist(); };
const myPets = () => sv().pets.filter((p) => !p.missing);
const petById = (id) => sv().pets.find((p) => p.id === +id);
const ill = (p) => (p && p.ill ? GL.PET_ILL[p.ill] : null);
const vetOut = () => W.bld('vet').out;
const guideVet = () => { const o = vetOut(); G.guide = { x: o[0], z: o[1], label: 'Grokville Vet Clinic' }; };
// where helpers should drive to: you (outside) or the door of the building you're in
function whereAmI() { const A = W.cur; if (!A || A.outdoor) return [GS.me.x, GS.me.z]; if (A.homeKey) return G.homeSpot(A.homeKey).door; return A.exitTo || [0, 6]; }
function busy() {
  if (!G.inGame()) return 'Start playing first!';
  if (G.jailed && G.jailed()) return 'You\u2019re in cartoon jail right now!';
  if (HL().riding()) return 'You\u2019re riding in the ambulance!';
  if (GS.work) return 'Finish your work shift first!';
  if (AS().towing && AS().towing() && AS().towing() !== 'wait') return 'Wait for the tow truck to finish!';
  return null;
}
function blocked() { const b = busy(); if (b) { G.toast(b, true); Snd.fx('no'); return true; } return false; }
function driveTo(o, tx, tz, sp, dt) { const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); if (d < 0.6) return true; o.yaw += G.ang(Math.atan2(dx, dz) - o.yaw) * Math.min(1, dt * 5); const st = Math.min(d, sp * dt); o.x += dx / d * st; o.z += dz / d * st; o.v = sp; return false; }
// emergency vehicles (fire truck, police car, animal ambulance) drive across town; you see them when you're outside
function dispatch(type, fromId, to, cb, opt) {
  opt = opt || {}; const b = W.bld(fromId), p = b ? b.out : [0, 0], sz = b && b.door === 'n' ? -1.6 : 1.6;
  const o = C().makeCar(type, null, p[0], p[1] + sz, 0);
  const r = { o, to, cb, path: W.navPath(p[0], p[1] + sz, to[0], to[1]) || [to], pi: 0, t: 0, ph: 'go', stay: opt.stay || 6, maxT: opt.maxT || 14, next: opt.next || null, fl: 0 };
  resp.push(r); return r;
}
function respTick(dt) {
  for (let i = resp.length - 1; i >= 0; i--) {
    const r = resp[i], o = r.o; r.t += dt; r.fl += dt;
    if (o.m.siren) o.m.siren.forEach((s, k) => { s.visible = Math.floor(r.fl * 5 + k) % 2 === 0; });
    if (r.ph === 'go') {
      const p = r.path[r.pi];
      if (!p || r.t > r.maxT) { o.x = r.to[0]; o.z = r.to[1]; r.ph = 'there'; r.t = 0; o.v = 0; const cb = r.cb; r.cb = null; if (cb) cb(r); }
      else if (driveTo(o, p[0], p[1], 14, dt)) r.pi++;
    } else if (r.t > r.stay) {
      if (r.next) { const n = r.next; r.next = null; r.to = n.to; r.cb = n.cb; r.path = W.navPath(o.x, o.z, n.to[0], n.to[1]) || [n.to]; r.pi = 0; r.t = 0; r.ph = 'go'; r.maxT = n.maxT || 14; r.stay = n.stay || 3; }
      else { C().killCar(o); resp.splice(i, 1); continue; }
    }
    C().placeCar(o);
  }
}

/* ---------------- YOU ---------------- */
const ME = [
  ['runover', '\uD83D\uDE97', 'Get run over', 'Boing! \u2192 call the ambulance'],
  ['trip', '\uD83C\uDF4C', 'Trip and fall', 'Scrape or sprain'],
  ['tummy', '\uD83E\uDD22', 'Food poisoning', 'Doctor visit'],
  ['sports', '\u26BD', 'Sports injury', 'Doctor visit'],
  ['allergy', '\uD83E\uDD2F', 'Allergic reaction', 'Call the ambulance'],
  ['sunburn', '\u2600\uFE0F', 'Sunburn', 'Ointment helps'],
  ['cold', '\uD83E\uDD27', 'Catch a cold', 'Rest + sleep']
];
SC.me = function (id) {
  if (blocked()) return false;
  if (HL().down()) { G.toast('You\u2019re already badly hurt \u2014 call 911 for an ambulance first!', true); return false; }
  G.closePanel(); document.getElementById('phone').classList.add('hidden');
  if (id === 'runover') return runover();
  const r = { trip: () => G.hurt(Math.random() < 0.6 ? 'sprain' : 'scrape', '\uD83C\uDF4C Whoops! You slipped on a banana peel!', true),
    tummy: () => { G.need('h', -10); return G.hurt('tummy', '\uD83E\uDD6A That old sandwich was NOT a good idea\u2026', true); },
    sports: () => G.hurt(pick(['wrist', 'sprain']), '\u26BD Sports injury! You went for the big play\u2026', true),
    allergy: () => G.hurt('allergy', '\uD83C\uDF3C Pollen everywhere!', true),
    sunburn: () => G.hurt('sunburn', '\u2600\uFE0F You forgot your sunscreen!', true),
    cold: () => { G.need('e', -10); return G.hurt('cold', '\uD83C\uDF27\uFE0F You got caught in the rain without a jacket.', true); } }[id];
  return r ? !!r() : false;
};
function runover() {
  if (C().driving()) C().act({ kind: 'exit' });
  if (GS.me.ride) C().act({ kind: 'unride' });
  if (!W.cur || W.cur.id !== 'town') { G.exitArea(); setTimeout(() => { if (W.cur && W.cur.id === 'town') runover(); }, 700); G.toast('\uD83D\uDEB6 You step outside\u2026'); return true; }
  if (zoom) return false;
  const side = Math.random() < 0.5 ? -1 : 1, sx = GS.me.x + side * 11, sz = GS.me.z;
  const o = C().makeCar(pick(['compact', 'van', 'pickup', 'suv']), pick(GL.CAR_COLS), sx, sz, side > 0 ? -Math.PI / 2 : Math.PI / 2);
  zoom = { o, dir: -side, t: 0, hit: false };
  Snd.fx('screech'); G.toast('\uD83D\uDE97\uD83D\uDCA8 HONK HONK! A car is zooming your way!');
  return true;
}
function zoomTick(dt) {
  const z = zoom, o = z.o; z.t += dt;
  o.x += z.dir * 16 * dt; o.yaw = z.dir > 0 ? Math.PI / 2 : -Math.PI / 2; C().placeCar(o);
  if (!z.hit && (Math.abs(o.x - GS.me.x) < 1.4 || z.t > 1.2)) { z.hit = true; if (W.cur && W.cur.id === 'town') { AS()._hit(16, 'npc', z.dir); W.fx('star', GS.me.x, 2, GS.me.z, 10, 0.8); } }
  if (z.t > 2.4) { C().killCar(o); zoom = null; }
}

/* ---------------- PETS ---------------- */
const PETS = [['sick', '\uD83E\uDD12', 'Sick pet', 'Tummy bug + sniffles'], ['hurt', '\uD83E\uDE79', 'Injured pet', 'Hurt paw'], ['ate', '\uD83E\uDDE6', 'Ate something bad', 'Gobbled a sock!'], ['checkup', '\uD83D\uDCCB', 'Pet check-up', 'Time for the vet']];
SC.pet = function (kind, id) {
  if (blocked()) return false;
  const p = petById(id != null ? id : petSel) || myPets()[0], I = GL.PET_ILL[kind];
  if (!p) { G.toast('Adopt a pet first at Paws & Claws or the Animal Shelter!', true); return false; }
  if (p.missing) { G.toast(p.name + ' is missing! Find them first (phone \u2192 Animal Ctrl).', true); return false; }
  if (!I) return false;
  if (p.ill && p.ill !== 'checkup' && kind === 'checkup') { G.toast(p.name + ' is already sick \u2014 go see Dr. Kiki!'); return false; }
  p.ill = kind; p.hp = Math.min(p.hp == null ? 100 : p.hp, I.hp); G.persist();
  const S = GL.SPECIES[p.sp]; Snd.fx(S ? S.snd : 'ding');
  const say = { sick: p.name + ' is sneezing and has a grumbly tummy. Poor thing!', hurt: p.name + ' is limping on a hurt paw!', ate: p.name + ' gobbled up a SOCK! Uh-oh\u2026', checkup: p.name + ' is due for a check-up at the vet.' }[kind];
  G.closePanel(); document.getElementById('phone').classList.add('hidden');
  open('petEm', head(I.icon + ' ' + esc(p.name)) + '<img class="pic big" src="' + UI.portrait(GL.Pets.look(p)) + '">' + petBar(p) + '<p class="sub">' + esc(say) + '</p><div class="btncol">' +
    (kind === 'checkup' ? '' : btn('d911pet', p.id, '\uD83D\uDCDE CALL 911 \u2014 ANIMAL AMBULANCE', 'red')) + btn('guideVet', null, '\uD83E\uDDED GUIDE ME TO THE VET', 'blue') + '</div><p class="sub small">Grokville Vet Clinic is open 24/7 (east side of town). Bring ' + esc(p.name) + ' along, or Receptionist Ray can send the Pet Taxi.</p>');
  return true;
};
function petBar(p) { const hp = Math.round(p.hp == null ? 100 : p.hp), I = ill(p); return '<div class="hpBig"><b>\u2764\uFE0F ' + hp + ' / 100' + (I ? ' <small>' + I.icon + ' ' + esc(I.name) + '</small>' : '') + '</b><span class="meter"><em style="width:' + hp + '%;background:' + (hp < 30 ? '#ef4444' : hp < 60 ? '#f59e0b' : '#22c55e') + '"></em></span></div>'; }
UI.petHealthBar = (p) => petBar(p) + (ill(p) ? '<div class="btnrow">' + btn('guideVet', null, '\uD83E\uDDED VET', 'small blue') + (p.ill !== 'checkup' ? btn('d911pet', p.id, '\uD83D\uDCDE 911', 'small red') : '') + '</div>' : '');
H.guideVet = () => { G.closePanel(); guideVet(); G.toast('\uD83E\uDDED Follow the arrow to the Grokville Vet Clinic!'); };
// animal ambulance: drives to you, picks up your pet and takes it to the vet (free)
SC.animalAmb = function (id) {
  const p = petById(id); if (!p || p.missing) return false;
  if (!ill(p)) { G.toast(p.name + ' looks healthy! \uD83D\uDC3E'); return false; }
  if (p.atVet) { G.toast(p.name + ' is already at the vet!'); guideVet(); return false; }
  if (p.amb) { G.toast('\uD83D\uDE90 The animal ambulance is already on its way!'); return false; }
  p.amb = 1; G.closePanel(); Snd.fx('ding');
  G.toast('\uD83D\uDCDE 9-1-1: \u201CAnimal ambulance on the way for ' + p.name + '! Stay calm and keep them cozy.\u201D');
  const pickUp = () => { p.amb = 0; p.wasOut = p.out ? 1 : 0; p.out = false; p.atVet = 1; G.persist(); guideVet(); Snd.fx('wail'); G.toast('\uD83D\uDE90 ' + p.name + ' is riding to the Grokville Vet Clinic. Meet them there (follow the arrow)!'); if (GL.Pets.clear) GL.Pets.clear(); };
  const v = W.vetPark || [vetOut()[0], vetOut()[1] - 2, 0];
  dispatch('acvan', 'shelter', whereAmI(), pickUp, { stay: 1.5, maxT: 9, next: { to: [v[0], v[1]], stay: 2, maxT: 12 } });
  return true;
};

/* ---------------- HOME + CAR ---------------- */
const HOME = [['fire', '\uD83D\uDD25', 'Kitchen fire', 'Get out + call the fire dept'], ['crash', '\uD83D\uDCA5', 'Car crash', 'Police report + tow truck'], ['breakin', '\uD83E\uDD9D', 'Break-in', 'Call the police']];
SC.home = function (kind) {
  if (blocked()) return false;
  if (em()) { G.toast('Deal with the ' + ({ fire: 'kitchen fire', breakin: 'break-in', crash: 'car crash' }[em().type]) + ' first! (phone \u2192 \uD83D\uDCDE 911)', true); return false; }
  G.closePanel(); document.getElementById('phone').classList.add('hidden');
  if (kind === 'crash') return crash();
  if (C().driving()) { G.toast('Park and go home first!', true); return false; }
  const go = () => (kind === 'fire' ? fireStart() : breakinStart());
  if (W.cur && W.cur.homeKey === GS.pid) { go(); return true; }
  G.toast('\uD83C\uDFE0 Heading home\u2026'); G.travel(G.myHomeArea(), false, null, () => setTimeout(go, 250));
  return true;
};
function stovePos() { const f = sv().home.find((q) => q.id === 'stove'); return f ? [f.x, f.z] : [0, -1.5]; }
function fireStart() {
  setEm({ type: 'fire', ph: 'wait', at: stovePos(), t: 0 }); Snd.fx('alarm');
  open('emFire', head('\uD83D\uDD25 Kitchen fire!') + '<div class="big">\uD83C\uDF73\uD83D\uDD25</div><p class="sub">Whoosh! The frying pan caught fire! <b>BEEP BEEP</b> goes the smoke alarm.</p><p class="sub"><b>Fire safety:</b> don\u2019t touch it \u2014 get outside and call 9-1-1 for the fire department!</p><div class="btncol">' + btn('d911', 'fire', '\uD83D\uDCDE CALL 911 \u2014 FIRE DEPT', 'red') + btn('emOut', null, '\uD83C\uDFC3 GET OUTSIDE', 'blue') + '</div>');
}
H.emOut = () => { G.closePanel(); if (W.cur && !W.cur.outdoor) G.exitArea(); };
function breakinStart() {
  const s = sv(), took = Math.min(80, Math.floor(s.money * 0.2)); s.money -= took;
  const items = Object.keys(s.bag).filter((k) => s.bag[k] > 0 && GL.ITEMS[k] && GL.ITEMS[k].cat === 'food'); const it = items.length ? pick(items) : null; if (it) s.bag[it]--;
  setEm({ type: 'breakin', ph: 'wait', took, item: it, t: 0 }); Snd.fx('wrong'); W.fx('dust', GS.me.x, 0.6, GS.me.z - 1.5, 10, 2.5);
  open('emBreak', head('\uD83E\uDD9D Break-in!') + '<div class="big">\uD83D\uDEAA\uD83D\uDCA8</div><p class="sub">Uh-oh! Somebody snuck in while you were out. Footprints everywhere! It looks like <b>Sneaky Sam</b>, the sock-masked burglar.</p><p class="sub">Missing: <b>' + money(took) + '</b>' + (it ? ' and your ' + GL.ITEMS[it].icon + ' ' + esc(GL.ITEMS[it].name) : '') + '.</p>' + btn('d911', 'police', '\uD83D\uDCDE CALL 911 \u2014 POLICE', 'red') + '<p class="sub small">The police can track down Sneaky Sam and get your stuff back.</p>');
  G.persist();
}
function crash() {
  const s = sv(), c = C().activeCar();
  if (!c) { G.toast('You need a car first! Visit Sal\u2019s Cars on Service Row.', true); return false; }
  if (c.broken) { G.toast('Your car is already ' + (c.broken === 'crash' ? 'wrecked' : 'broken') + '! Call a tow truck (phone \u2192 \uD83D\uDEFB Tow).', true); return false; }
  if (!W.cur || W.cur.id !== 'town') { G.exitArea(); setTimeout(() => { if (W.cur && W.cur.id === 'town') crash(); }, 700); G.toast('\uD83D\uDEB6 You head to your car\u2026'); return true; }
  let o = C().myCar();
  if (!C().driving()) { C().bring(); o = C().myCar(); }
  if (!o) return false;
  if (C().driving()) C().act({ kind: 'exit' });
  AS().breakdown('crash'); W.fx('star', o.x, 1.8, o.z, 10, 1.2); W.fx('smoke', o.x, 1.2, o.z, 8, 1);
  G.hurt('bonk', '\uD83D\uDCA5 KER-THUNK! Fender-bender!', true);
  setEm({ type: 'crash', ph: 'wait', at: [+o.x.toFixed(2), +o.z.toFixed(2)], t: 0 }); s.stats.crashes = (s.stats.crashes || 0) + 1;
  open('emCrash', head('\uD83D\uDCA5 Car crash!') + '<div class="big">\uD83D\uDE97\uD83D\uDCA5\uD83E\uDEA7</div><p class="sub">KER-THUNK! You bonked a lamp post. Everyone\u2019s okay (just a little bump on the head), but your car is wrecked.</p><div class="btncol">' + btn('d911', 'police', '\uD83D\uDCDE CALL 911 \u2014 POLICE REPORT', 'red') + btn('towCall', AS().towFor(), '\uD83D\uDEFB CALL A TOW TRUCK', 'primary') + '</div><p class="sub small">The police write a crash report. The tow truck takes your car to a mechanic.</p>');
  return true;
}
function fireOut() {
  const e = em(); if (!e || e.type !== 'fire') return;
  setEm(null); G.need('y', -12); sv().stats.fires = (sv().stats.fires || 0) + 1; Snd.fx('level');
  if (W.cur && W.cur.homeKey === GS.pid) W.fx('water', e.at[0], 1.2, e.at[1], 14, 1);
  G.closePanel();
  open('emDone', head('\uD83D\uDE92 Fire\u2019s out!') + '<div class="big">\uD83E\uDDD1\u200D\uD83D\uDE92\uD83D\uDCA6</div><p class="sub">Fire Chief Flo: \u201CPSSSHHH! All out! You did everything right \u2014 got out safe and called 9-1-1. Here\u2019s a junior firefighter sticker!\u201D \u2B50</p><p class="sub small">Your kitchen is a bit smoky (hygiene down). The fire department is always free.</p>' + btn('close', null, 'THANK YOU! \uD83D\uDE92', 'green'));
}
function policeDone() {
  const e = em(); if (!e) return; const s = sv();
  if (e.type === 'breakin') {
    s.money += e.took; if (e.item) s.bag[e.item] = (s.bag[e.item] || 0) + 1; setEm(null); Snd.fx('cash');
    G.closePanel(); open('emDone', head('\uD83D\uDE93 Case closed!') + '<div class="big">\uD83D\uDC6E\uD83E\uDD9D</div><p class="sub">Officer Penny: \u201CWe found Sneaky Sam hiding in a hedge, munching ' + (e.item ? 'your ' + esc(GL.ITEMS[e.item].name.toLowerCase()) : 'a cookie') + '! Here\u2019s your stuff back.\u201D</p><p class="sub">+' + money(e.took) + ' returned' + (e.item ? ' + ' + GL.ITEMS[e.item].icon : '') + '</p>' + btn('close', null, 'THANKS, OFFICER!', 'green'));
  } else if (e.type === 'crash') {
    setEm(null); Snd.fx('ding'); const broke = C().activeCar() && C().activeCar().broken;
    G.closePanel(); open('emDone', head('\uD83D\uDE93 Crash report done') + '<div class="big">\uD83D\uDC6E\uD83D\uDCCB</div><p class="sub">Officer Penny: \u201CReport filed! Nobody\u2019s in trouble \u2014 just drive a little slower next time, okay?\u201D</p>' + (broke && !AS().towing() ? btn('towCall', AS().towFor(), '\uD83D\uDEFB CALL A TOW TRUCK', 'primary') : '') + btn('close', null, 'OKAY!', 'green'));
  }
}

/* ---------------- 9-1-1 ---------------- */
UI.app_911 = function () {
  const s = sv(), e = em(), L = HL().lv(), sickPets = myPets().filter((p) => ill(p) && p.ill !== 'checkup');
  const row = (k, ic, name, why, hot) => '<div class="lrow' + (hot ? ' hl' : '') + '"><b>' + ic + ' ' + name + '<small>' + why + '</small></b><span>' + btn('d911', k, 'CALL', 'small ' + (hot ? 'red' : 'blue')) + '</span></div>';
  open('911', head('\uD83D\uDCDE 9-1-1') + '<p class="sub">Dispatcher Dot: \u201CGrokville 9-1-1, what\u2019s your emergency?\u201D</p><div class="list">' +
    row('amb', '\uD83D\uDE91', 'Ambulance', L >= 3 ? 'You need help now!' : L === 2 ? 'Serious ouch \u2014 ride to the ER' : 'For big injuries + sickness', L >= 2) +
    row('fire', '\uD83D\uDE92', 'Fire Department', e && e.type === 'fire' ? (e.ph === 'wait' ? 'KITCHEN FIRE!' : 'On the way\u2026') : 'Fires + smoke', e && e.type === 'fire' && e.ph === 'wait') +
    row('police', '\uD83D\uDE93', 'Police', e && (e.type === 'breakin' || e.type === 'crash') ? (e.ph === 'wait' ? (e.type === 'breakin' ? 'BREAK-IN!' : 'Crash report') : 'On the way\u2026') : 'Break-ins, crashes, trouble', e && (e.type === 'breakin' || e.type === 'crash') && e.ph === 'wait') +
    row('pet', '\uD83D\uDE90', 'Animal Ambulance', sickPets.length ? sickPets.map((p) => esc(p.name)).join(', ') + ' needs the vet!' : 'Takes sick pets to the vet', sickPets.some((p) => !p.atVet && !p.amb)) +
    row('tow', '\uD83D\uDEFB', 'Tow Truck', 'Broken or crashed car', !!(C().activeCar() && C().activeCar().broken)) +
    '</div><p class="sub small">9-1-1 is for real emergencies. In Grokville, help is always on the way! ' + money(s.money) + '</p>');
};
SC.call = function (k) {
  const e = em(); G.closePanel(); document.getElementById('phone').classList.add('hidden'); Snd.fx('ding');
  if (k === 'amb') {
    const L = HL().lv();
    if (L >= 3) { if (HL().riding()) { G.toast('\uD83D\uDE91 The ambulance is already on the way!'); return 'riding'; } HL().callAmbulance(); return 'amb'; }
    if (L === 2) { open('911amb', head('\uD83D\uDE91 9-1-1') + '<p class="sub">Dot: \u201CThat sounds sore! I can send an ambulance to take you to the Maple Hospital ER, or you can book Dr. Priya at the clinic (cheaper!).\u201D</p><div class="btncol">' + btn('ambYes', null, '\uD83D\uDE91 SEND THE AMBULANCE', 'red') + btn('app', 'health', '\uD83D\uDCC5 BOOK DR. PRIYA', 'blue') + '</div>'); return 'ask'; }
    G.toast(L === 1 ? 'Dot: \u201CA little ouchie? A bandage from the Maple Clinic pharmacy will fix that right up!\u201D' : 'Dot: \u201CNo emergency? Phew! Thanks for checking. Call back any time you need us.\u201D'); return 'none';
  }
  if (k === 'fire') {
    if (e && e.type === 'fire') { if (e.ph !== 'wait') { G.toast('\uD83D\uDE92 The fire truck is already on the way!'); return 'coming'; } sendFire(); return 'fire'; }
    G.toast('Dot: \u201CNo fire? Great! The firefighters say hi \uD83D\uDC4B\u201D'); return 'none';
  }
  if (k === 'police') {
    if (e && (e.type === 'breakin' || e.type === 'crash')) { if (e.ph !== 'wait') { G.toast('\uD83D\uDE93 Officer Penny is already on the way!'); return 'coming'; } sendPolice(); return 'police'; }
    if (GL.Crime && GL.Crime.myWanted && GL.Crime.myWanted()) { G.toast('Officer Penny: \u201CHmm\u2026 isn\u2019t that YOUR face on our wanted poster?\u201D', true); return 'wanted'; }
    G.toast('Dot: \u201CNothing wrong? Officer Penny says stay safe and have a great day!\u201D'); return 'none';
  }
  if (k === 'pet') {
    const list = myPets().filter((p) => ill(p) && p.ill !== 'checkup' && !p.atVet);
    if (!list.length) { G.toast(myPets().some((p) => p.ill === 'checkup') ? 'Dot: \u201CA check-up isn\u2019t an emergency \u2014 just pop over to the vet!\u201D' : myPets().some((p) => p.atVet) ? 'Your pet is already at the vet!' : 'Dot: \u201CAll your pets look healthy and happy! \uD83D\uDC3E\u201D'); return 'none'; }
    if (list.length === 1) { SC.animalAmb(list[0].id); return 'pet'; }
    open('911pet', head('\uD83D\uDE90 Animal Ambulance') + '<p class="sub">Dot: \u201CWhich pet needs help?\u201D</p><div class="list">' + list.map((p) => '<div class="lrow"><b>' + ill(p).icon + ' ' + esc(p.name) + '<small>' + esc(ill(p).name) + '</small></b><span>' + btn('d911pet', p.id, 'SEND', 'small red') + '</span></div>').join('') + '</div>'); return 'ask';
  }
  if (k === 'tow') { if (UI.app_tow) UI.app_tow(); return 'tow'; }
  return 'none';
};
H.d911 = (k) => SC.call(k);
H.d911pet = (id) => SC.animalAmb(+id);
H.ambYes = () => { G.closePanel(); if (!HL().callAmbulance(true)) G.toast('The ambulance can\u2019t come right now.', true); };
function sendFire() {
  const e = em(); e.ph = 'coming'; G.persist(); Snd.fx('wail');
  G.toast('\uD83D\uDCDE Dot: \u201CThe fire truck is on its way! Get outside and wait by the curb.\u201D');
  const d = G.homeSpot().door; dispatch('firetruck', 'fire', [d[0], d[1] - 3], () => { const q = em(); if (q && q.type === 'fire') { q.ph = 'spray'; q.t = 0; G.toast('\uD83D\uDE92 The firefighters rush inside with the hose! PSSSHHH!'); } }, { stay: 8, maxT: 13 });
}
function sendPolice() {
  const e = em(); e.ph = 'coming'; G.persist(); Snd.fx('siren');
  G.toast('\uD83D\uDCDE Dot: \u201COfficer Penny is on the way!\u201D');
  const to = e.type === 'crash' ? [e.at[0] + 2.5, e.at[1] + 2.5] : (() => { const d = G.homeSpot().door; return [d[0], d[1] - 3]; })();
  dispatch('police', 'police', to, () => policeDone(), { stay: 6, maxT: 13 });
}

/* ---------------- SCENARIOS APP ---------------- */
UI.app_scen = function () {
  const pets = myPets(); if (petSel == null || !pets.some((p) => p.id === petSel)) petSel = pets.length ? (pets.find((p) => p.out) || pets[0]).id : null;
  const it = (a, q) => '<button class="item" data-a="' + a + '" data-v="' + q[0] + '"><i>' + q[1] + '</i><b>' + esc(q[2]) + '</b><small>' + esc(q[3]) + '</small></button>';
  let h = head('\uD83C\uDFAC Scenarios') + '<p class="sub small">Make something happen on purpose! It uses the real ambulance, hospital, vet, police, fire trucks and bills \u2014 so be ready to call 9-1-1. \uD83D\uDCDE</p>';
  h += '<h3>\uD83E\uDDCD You</h3><div class="grid">' + ME.map((q) => it('scMe', q)).join('') + '</div>';
  h += '<h3>\uD83D\uDC3E Your pets</h3>' + (pets.length ? '<div class="chiprow">' + pets.map((p) => '<button class="chip' + (p.id === petSel ? ' on' : '') + '" data-a="scPetSel" data-v="' + p.id + '">' + (ill(p) ? ill(p).icon + ' ' : '') + esc(p.name) + '</button>').join('') + '</div><div class="grid">' + PETS.map((q) => it('scPet', q)).join('') + '</div>' : '<p class="sub small">No pets yet \u2014 adopt one at Paws & Claws or the Animal Shelter.</p>');
  h += '<h3>\uD83C\uDFE0 Home + car</h3><div class="grid">' + HOME.map((q) => it('scHome', q)).join('') + '</div>';
  h += '<div class="btnrow">' + btn('app', '911', '\uD83D\uDCDE OPEN 9-1-1', 'red') + btn('guideVet', null, '\uD83E\uDDB4 VET CLINIC', 'blue') + '</div>';
  open('scen', h);
};
H.scMe = (v) => SC.me(v);
H.scPet = (v) => SC.pet(v);
H.scHome = (v) => SC.home(v);
H.scPetSel = (v) => { petSel = +v; UI.app_scen(); };

/* ---------------- GROKVILLE VET CLINIC ---------------- */
const insured = () => { const pi = sv().petIns; return !!(pi && pi.until >= G.day()); };
const withMe = (p) => !p.missing && (p.out || p.atVet);
SC.desk = function () {
  const s = sv(), pets = myPets();
  let h = head('\uD83E\uDDB4 Grokville Vet Clinic') + '<p class="sub">Receptionist Ray: \u201CHi there! Who are we seeing today?\u201D</p>';
  if (!pets.length) h += '<p class="sub">You don\u2019t have any pets yet! Adopt one at Paws & Claws or the Animal Shelter.</p>';
  else h += '<div class="list">' + pets.map((p) => { const I = ill(p), fee = (I || GL.PET_ILL.checkup).fee; return '<div class="lrow"><b>' + (I ? I.icon + ' ' : '\uD83D\uDC3E ') + esc(p.name) + '<small>\u2764\uFE0F ' + Math.round(p.hp == null ? 100 : p.hp) + ' \u00b7 ' + (I ? esc(I.name) : 'Healthy \u2014 check-up') + ' \u00b7 ' + money(fee) + (p.atVet ? ' \u00b7 in the waiting room' : '') + '</small></b><span>' + (withMe(p) ? btn('vetSee', p.id, '\uD83E\uDE7A SEE DR. KIKI', 'small green') : btn('vetTaxi', p.id, '\uD83D\uDE95 PET TAXI ' + money(GL.PET_TAXI), 'small', s.money < GL.PET_TAXI)) + '</span></div>'; }).join('') + '</div>';
  h += '<p class="sub small">' + (insured() ? '\uD83D\uDEE1\uFE0F Paws Protect is active until Day ' + s.petIns.until + ' \u2014 it pays ' + Math.round(GL.PET_INS.cover * 100) + '% of vet bills!' : 'No pet insurance. Paws Protect (counter on the right) pays ' + Math.round(GL.PET_INS.cover * 100) + '% of vet bills.') + ' Pets at home? The Pet Taxi brings them here.</p>' + (insured() ? '' : btn('vetIns', null, '\uD83D\uDEE1\uFE0F PAWS PROTECT INSURANCE', 'blue'));
  open('vetdesk', h);
};
G.hooks.kinds.vetdesk = () => SC.desk();
G.hooks.kinds.vetexam = () => { const p = myPets().find((q) => withMe(q) && ill(q)); if (p) SC.visit(p.id, 0); else SC.desk(); };
G.hooks.kinds.petins = () => SC.ins();
H.vetSee = (id) => SC.visit(+id, 0);
H.vetTaxi = (id) => { const p = petById(id); if (!p || p.missing || !G.spend(GL.PET_TAXI)) return; p.atVet = 1; p.wasOut = 0; G.persist(); Snd.fx('honk'); G.toast('\uD83D\uDE95 Beep beep! The Pet Taxi dropped ' + p.name + ' off in the waiting room.'); if (W.cur && W.cur.id === 'vet') SC.desk(); else G.closePanel(); };
H.vetIns = () => SC.ins();
SC.ins = function () {
  const s = sv(), P = GL.PET_INS;
  open('petins', head('\uD83D\uDEE1\uFE0F Paws Protect') + '<div class="big">\uD83D\uDC69\u200D\uD83D\uDCBC\uD83D\uDC36</div><p class="sub">Wendy: \u201CHi! Paws Protect pays <b>' + Math.round(P.cover * 100) + '%</b> of your vet bills for ' + P.days + ' days. No hold music, no potato questions. Promise!\u201D</p>' +
    (insured() ? '<div class="appt">\u2714 Your pets are covered until <b>Day ' + s.petIns.until + '</b>.</div>' : btn('petInsBuy', null, 'GET COVERED \u00b7 ' + money(P.price), 'green', s.money < P.price)) + '<p class="sub small">(Your own doctor bills still go through Gary at GrokCare\u2026 good luck.)</p>');
};
H.petInsBuy = () => { const s = sv(), P = GL.PET_INS; if (insured() || !G.spend(P.price)) return; s.petIns = { until: G.day() + P.days }; G.persist(); Snd.fx('cash'); G.toast('\uD83D\uDEE1\uFE0F Your pets are covered by Paws Protect!'); SC.ins(); };
SC.visit = function (id, step) {
  const s = sv(), p = petById(id); if (!p || p.missing) return;
  if (!withMe(p)) { G.toast(p.name + ' isn\u2019t here! Bring them along or use the Pet Taxi.', true); SC.desk(); return; }
  const I = ill(p) || GL.PET_ILL.checkup;
  if (step === 0 && W.cur && W.cur.id === 'vet') { const f = W.freeNear(W.cur, 4.2, -1.5, 0.36); GS.me.x = f[0]; GS.me.z = f[1]; GS.me.yaw = Math.PI; }
  const STEPS = [['\uD83E\uDE7A', 'Dr. Kiki lifts ' + esc(p.name) + ' onto the exam table and listens with her stethoscope\u2026 thump-thump, thump-thump!', 'NEXT'], I.fix, ['\uD83E\uDDB4', 'Dr. Kiki: \u201CAll done! Here\u2019s a treat for being SO brave.\u201D ' + esc(p.name) + ' wags happily!', 'YAY! \uD83C\uDF89']];
  if (step < STEPS.length) { const d = STEPS[step]; open('vetVisit', head('\uD83E\uDE7A Dr. Kiki') + '<img class="pic big" src="' + UI.portrait(GL.Pets.look(p)) + '"><div class="big">' + d[0] + '</div><p class="sub">' + d[1] + '</p>' + btn('vetStep', id + '|' + (step + 1), d[2], 'primary')); Snd.fx(step === 1 ? 'beep' : 'click'); return; }
  // done: healed, bill, insurance
  const fee = I.fee, cover = insured() ? Math.round(fee * GL.PET_INS.cover) : 0, due = fee - cover;
  p.ill = null; p.hp = 100; p.n.f = Math.min(100, p.n.f + 20); s.stats.vet = (s.stats.vet || 0) + 1;
  let paid;
  if (s.money >= due) { s.money -= due; paid = 'You paid ' + money(due) + '.'; } else { const bid = HL().addBill('Grokville Vet: ' + p.name, due); const b = s.bills.find((q) => q.id === bid); if (b) b.ins = cover; paid = 'Short on cash? ' + money(due) + ' was added to your bills (phone \u2192 \uD83E\uDE7A Health).'; }
  let home = '';
  if (p.atVet) { p.atVet = 0; if (p.wasOut && s.pets.filter((q) => q.out && !q.missing).length < 2) { p.out = true; } else if (!p.out) home = ' Ray drives ' + esc(p.name) + ' home in the Pet Taxi (free!).'; p.wasOut = 0; }
  G.persist(); Snd.fx('level'); W.fx('heart', GS.me.x, 2, GS.me.z, 8, 1); G.checkGoals && G.checkGoals();
  open('vetVisit', head('\u2728 ' + esc(p.name) + ' is all better!') + '<img class="pic big" src="' + UI.portrait(GL.Pets.look(p)) + '">' + petBar(p) + '<div class="appt">\uD83E\uDDFE <b>Vet bill: ' + money(fee) + '</b>' + (cover ? '<br>\uD83D\uDEE1\uFE0F Paws Protect paid ' + money(cover) + '!' : '') + '<br><small>' + paid + home + '</small></div>' + (cover ? '' : '<p class="sub small">Tip: Paws Protect pet insurance pays ' + Math.round(GL.PET_INS.cover * 100) + '% next time.</p>') + btn('close', null, 'THANKS, DR. KIKI!', 'green'));
};
H.vetStep = (v) => { const [id, st] = v.split('|').map(Number); SC.visit(id, st); };

/* ---------------- HUD status, ticks, cleanup ---------------- */
G.statusParts.push(() => {
  const e = em(); let o = '';
  if (e) {
    const t = e.type === 'fire' ? (e.ph === 'wait' ? '\uD83D\uDD25 Kitchen fire! Call 911' : e.ph === 'coming' ? '\uD83D\uDE92 Fire truck on the way\u2026' : '\uD83D\uDE92 Firefighters spraying!') : e.type === 'breakin' ? (e.ph === 'wait' ? '\uD83E\uDD9D Break-in! Call 911' : '\uD83D\uDE93 Police on the way\u2026') : (e.ph === 'wait' ? '\uD83D\uDCA5 Crash! Call 911 for a report' : '\uD83D\uDE93 Police on the way\u2026');
    o += '<button class="spill red" data-a="app" data-v="911">' + t + '</button>';
  }
  const sick = myPets().filter((p) => ill(p) && p.ill !== 'checkup');
  if (sick.length) o += '<button class="spill red" data-a="guideVet">' + ill(sick[0]).icon + ' ' + esc(sick[0].name) + (sick.length > 1 ? ' +' + (sick.length - 1) : '') + (sick.some((p) => p.amb) ? ' \u00b7 \uD83D\uDE90 coming' : sick.some((p) => p.atVet) ? ' \u00b7 at the vet' : ' \u00b7 needs the vet') + '</button>';
  return o;
});
G.hooks.tick.push(function (dt) {
  if (!G.inGame()) return;
  if (zoom) zoomTick(dt);
  if (resp.length) respTick(dt);
  sirenT -= dt; if (sirenT <= 0) { sirenT = 1.2; if (W.cur && W.cur.id === 'town' && resp.some((r) => r.ph === 'go' && Math.hypot(r.o.x - GS.me.x, r.o.z - GS.me.z) < 45)) Snd.fx('siren'); }
  const e = em(); if (!e) return;
  e.t = (e.t || 0) + dt;
  const home = W.cur && W.cur.homeKey === GS.pid;
  if (e.type === 'fire') {
    fxT -= dt;
    if (home && fxT <= 0) { fxT = 0.16; if (e.ph === 'spray') { W.fx('water', e.at[0] + 0.8, 1.6, e.at[1] + 1, 3, 0.5); W.fx('smoke', e.at[0], 1.4, e.at[1], 1, 0.6); } else { W.fx('fire', e.at[0], 0.9, e.at[1], 1, 0.7); if (Math.random() < 0.4) W.fx('smoke', e.at[0], 1.8, e.at[1], 1, 0.8); } }
    if (e.ph === 'spray') { if (e.t > 3) fireOut(); }
    else if (e.ph === 'wait') {
      if (home && !GS.panel) { nagT += dt; if (nagT > 9) { nagT = 0; G.toast('\uD83D\uDEA8 BEEP BEEP! Get outside and call 9-1-1! (phone \u2192 \uD83D\uDCDE)', true); } }
      if (e.t > 75) { G.toast('\uD83D\uDC75 Your neighbour saw the smoke and called 9-1-1 for you!'); sendFire(); }
    }
  } else if (e.type === 'crash' && e.ph === 'wait' && e.t > 240) setEm(null);
});
// resuming a save mid-emergency: helpers that were driving need to be called again
{ const e = em(); if (e && e.ph !== 'wait') { e.ph = 'wait'; e.t = 0; } sv().pets.forEach((p) => { p.amb = 0; }); }
G.hooks.reset.push(() => { resp.forEach((r) => C().killCar(r.o)); resp = []; if (zoom) { C().killCar(zoom.o); zoom = null; } const e = em(); if (e && e.ph !== 'wait') e.ph = 'wait'; sv().pets.forEach((p) => { if (p.amb) { p.amb = 0; } }); });
SC._st = () => ({ em: em(), resp: resp.length, zoom: !!zoom, pets: sv().pets.map((p) => ({ id: p.id, ill: p.ill || null, hp: p.hp, atVet: !!p.atVet, out: !!p.out, amb: !!p.amb })) });
SC._fast = () => { resp.forEach((r) => { r.t = 999; }); };
})();
