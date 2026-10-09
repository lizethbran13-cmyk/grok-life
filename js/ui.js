/* Grok Life - UI: character creator, phone apps, shops, bank, job board, realtor, dealer, pets, decor, tutorial */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd, GN = window.GrokNet, T = window.THREE;
const $ = (id) => document.getElementById(id), esc = GN.esc, GS = G.GS, sv = () => G.save(), money = GL.money;
const UI = GL.UI = {};
const head = G.head, open = G.openPanel;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const H = UI.H = {}; // action handlers
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, v = b.dataset.v; Snd.init();
  if (a === 'close') { Snd.fx('click'); G.closePanel(); return; }
  if (H[a]) { Snd.fx('click'); H[a](v, b); }
});

/* ---------------- character creator (also boutique + wardrobe) ---------------- */
let CR = null;
UI.creator = function (mode, after) {
  const s = sv(); CR = { mode, after, look: Object.assign({}, s.look), tab: 'body', cart: 0 };
  GS.creating = true; $('creator').classList.remove('hidden');
  if (!GS.inWorld) { GS.ui = 'creating'; }
  CR.prev = MD.avatar(CR.look); W.scene.add(CR.prev.g); placePrev();
  drawCreator();
};
function placePrev() {
  const A = W.cur; let x = GS.me.x, z = GS.me.z; if (!GS.inWorld) { x = 33; z = -12; }
  CR.px = x; CR.pz = z; CR.prev.g.position.set(x, 0.05, z); CR.prev.g.rotation.y = 0.3;
  const port = innerWidth < innerHeight;
  W.camOverride = { pos: new T.Vector3(x + (port ? 0 : 1.6), 1.9, z + 4.2), look: new T.Vector3(x + (port ? 0 : 1.2), port ? 0.55 : 1.0, z) };
  void A;
}
function rebuildPrev() { const r = CR.prev.g.rotation.y; W.scene.remove(CR.prev.g); CR.prev = MD.avatar(CR.look); CR.prev.g.position.set(CR.px, 0.05, CR.pz); CR.prev.g.rotation.y = r; W.scene.add(CR.prev.g); }
function owned(kind, id) { const s = sv(); if (kind === 'top') return !GL.TOPS[id].price || s.clothes[id]; if (kind === 'hat') return !GL.HATS[id].price || s.clothes['hat_' + id]; return !GL.GLASSES[id].price || s.clothes['gl_' + id]; }
function cost() { let c = 0; const L = CR.look; if (!owned('top', L.top)) c += GL.TOPS[L.top].price; if (!owned('hat', L.hat)) c += GL.HATS[L.hat].price; if (!owned('gl', L.gl)) c += GL.GLASSES[L.gl].price; return c; }
function sw(field, cols) { return '<div class="swrow">' + cols.map((c) => '<button class="swc' + (CR.look[field] === c ? ' on' : '') + '" style="background:' + c + '" data-a="crSet" data-v="' + field + '|' + c + '"></button>').join('') + '</div>'; }
function chips(field, list, kind) { return '<div class="chiprow">' + list.map((q) => { const id = q[0], o = kind ? !owned(kind, id) : false, pr = kind ? (kind === 'top' ? GL.TOPS : kind === 'hat' ? GL.HATS : GL.GLASSES)[id].price : 0; return '<button class="chip' + (CR.look[field] === id ? ' on' : '') + '" data-a="crSet" data-v="' + field + '|' + id + '">' + esc(q[1]) + (o ? ' <small>' + money(pr) + '</small>' : '') + '</button>'; }).join('') + '</div>'; }
function drawCreator() {
  const L = CR.look, t = CR.tab, mode = CR.mode, s = sv();
  let h = '<div class="crTop"><b>' + (mode === 'new' ? 'CREATE YOUR CHARACTER' : mode === 'boutique' ? '\uD83D\uDC57 COCO\u2019S BOUTIQUE' : '\uD83D\uDC5A WARDROBE') + '</b><button class="rb" data-a="crSpin">\u21BB</button></div>';
  if (mode === 'new') h += '<input id="crName" maxlength="12" placeholder="Your name" value="' + esc(s.name || G.prof.name || '') + '">';
  h += '<div class="tabs">' + [['body', 'BODY'], ['hair', 'HAIR'], ['outfit', 'OUTFIT'], ['extras', 'EXTRAS']].map((q) => '<button class="tab' + (t === q[0] ? ' on' : '') + '" data-a="crTab" data-v="' + q[0] + '">' + q[1] + '</button>').join('') + '</div><div class="crBody">';
  if (t === 'body') h += '<h4>Skin</h4>' + sw('skin', GL.SKINS) + '<h4>Shoes</h4>' + sw('sc', ['#f8fafc', '#1f2937', '#ef4444', '#3b82f6', '#ff4fd8', '#facc15', '#a16207']);
  if (t === 'hair') h += '<h4>Style</h4>' + chips('hair', GL.HAIRS) + '<h4>Colour</h4>' + sw('hc', GL.HAIR_COLS);
  if (t === 'outfit') h += '<h4>Top</h4>' + chips('top', Object.keys(GL.TOPS).map((k) => [k, GL.TOPS[k].name]), mode === 'new' ? null : 'top') + '<h4>Top colour</h4>' + sw('tc', GL.CLOTH_COLS) + '<h4>Pants / skirt colour</h4>' + sw('bc', GL.CLOTH_COLS);
  if (t === 'extras') h += '<h4>Hat</h4>' + chips('hat', Object.keys(GL.HATS).map((k) => [k, GL.HATS[k].icon + ' ' + GL.HATS[k].name]), 'hat') + '<h4>Glasses</h4>' + chips('gl', Object.keys(GL.GLASSES).map((k) => [k, GL.GLASSES[k].icon + ' ' + GL.GLASSES[k].name]), 'gl');
  h += '</div>';
  const c = mode === 'new' ? 0 : cost();
  if (mode === 'new' && cost() > 0) h += '<p class="sub small">Fancy items can be bought later at Coco\u2019s Boutique.</p>';
  h += '<div class="btnrow">' + (mode !== 'new' ? btn('crCancel', null, 'CANCEL', 'alt small') : '') + btn('crDone', null, mode === 'new' ? 'MOVE IN! \uD83C\uDFE0' : c ? 'BUY ' + money(c) : 'DONE', 'primary') + '</div>';
  $('creator').innerHTML = h;
  const ni = $('crName'); if (ni) ni.addEventListener('input', () => { G.prof.name = ni.value.trim() ? GN.cleanName(ni.value) : ''; s.name = G.prof.name; });
}
H.crTab = (v) => { CR.tab = v; drawCreator(); };
H.crSpin = () => { CR.prev.g.rotation.y += Math.PI / 2; };
H.crSet = (v) => {
  const [f, val] = v.split('|');
  if (CR.mode === 'new' && ((f === 'top' && GL.TOPS[val].price) || (f === 'hat' && GL.HATS[val].price) || (f === 'gl' && GL.GLASSES[val].price))) { G.toast('That\u2019s sold at the boutique \u2014 come shopping later!'); return; }
  CR.look[f] = val; rebuildPrev(); drawCreator();
};
H.crCancel = () => closeCreator();
H.crDone = () => {
  const s = sv();
  if (CR.mode === 'new') { CR.look.hat = GL.HATS[CR.look.hat].price ? 'none' : CR.look.hat; CR.look.gl = GL.GLASSES[CR.look.gl].price ? 'none' : CR.look.gl; if (GL.TOPS[CR.look.top].price) CR.look.top = 'tee'; }
  const c = CR.mode === 'new' ? 0 : cost();
  if (c && !G.spend(c)) return;
  if (c) { const L = CR.look; if (!owned('top', L.top)) s.clothes[L.top] = 1; if (!owned('hat', L.hat)) s.clothes['hat_' + L.hat] = 1; if (!owned('gl', L.gl)) s.clothes['gl_' + L.gl] = 1; s.stats.clothes++; G.tutNext(4); G.toast('\uD83D\uDECD\uFE0F Darling, you look FABULOUS!'); }
  s.look = Object.assign({}, CR.look);
  if (CR.mode === 'new') { s.created = true; if (!s.name) s.name = G.prof.name || 'Lizeth'; G.prof.name = s.name; GN.saveProfile(s.name, G.prof.color); $('nameIn').value = s.name; }
  G.persist(); const after = CR.after; closeCreator(); if (after) after();
};
function closeCreator() { if (CR) W.scene.remove(CR.prev.g); CR = null; GS.creating = false; W.camOverride = null; $('creator').classList.add('hidden'); if (GS.ui === 'creating') GS.ui = 'title'; }
UI.boutique = () => UI.creator('boutique');

/* ---------------- phone ---------------- */
const APPS = [['map', '\uD83D\uDDFA\uFE0F', 'Map'], ['career', '\uD83D\uDCBC', 'Career'], ['house', '\uD83C\uDFE0', 'House'], ['cars', '\uD83D\uDE97', 'Cars'], ['pets', '\uD83D\uDC3E', 'Pets'], ['friends', '\uD83D\uDC9E', 'Friends'], ['goals', '\uD83C\uDFC6', 'Goals'], ['bag', '\uD83C\uDF92', 'Bag'], ['bank', '\uD83C\uDFE6', 'Bank'], ['health', '\uD83E\uDE7A', 'Health'], ['911', '\uD83D\uDCDE', '911'], ['scen', '\uD83C\uDFAC', 'Scenarios'], ['animal', '\uD83D\uDC3E', 'Animal Ctrl'], ['tow', '\uD83D\uDEFB', 'Tow'], ['weather', '\uD83C\uDF26\uFE0F', 'Weather'], ['settings', '\u2699\uFE0F', 'Settings']];
UI.phone = function () {
  const s = sv(); const p = $('phone');
  p.innerHTML = '<div class="phBox"><div class="phTop"><span>' + G.timeStr() + '</span><b>' + money(s.money) + '</b><button class="xbtn" data-a="phClose">\u2715</button></div><div class="apps">' + APPS.map((a) => '<button class="app' + (G.badges && G.badges[a[0]] ? ' dot' : '') + '" data-a="app" data-v="' + a[0] + '"><i>' + a[1] + '</i><span>' + a[2] + '</span></button>').join('') + '</div><p class="sub small">' + (G.online() && GS.room ? 'Room ' + GS.room.code + ' \u00b7 ' + GS.S.players.length + '/3' : 'Playing solo') + '</p></div>';
  p.classList.remove('hidden'); GS.joyReset && GS.joyReset();
};
H.phClose = () => $('phone').classList.add('hidden');
H.app = (v) => { $('phone').classList.add('hidden'); if (G.clearBadge) G.clearBadge(v); const f = UI['app_' + v]; if (f) f(); };
UI.app_map = function () {
  let h = head('\uD83D\uDDFA\uFE0F Map') + '<p class="sub small">Tap a place to set a guide arrow, or take a taxi ($5).</p><div class="list">';
  const places = W.BLD.filter((b) => b.out).map((b) => [b.id, b.icon + ' ' + b.name, b.out]);
  places.push(['park', '\uD83C\uDF33 Maple Park', [-24, 9]], ['home', '\uD83C\uDFE0 My Home', G.homeSpot().door]);
  places.forEach((p) => { const o = W.bld(p[0]) ? W.isOpen(p[0], G.clock()) : true; h += '<div class="lrow"><b>' + esc(p[1]) + (o ? '' : ' <small class="red">closed</small>') + '</b><span>' + btn('guide', p[0], '\uD83E\uDDED', 'small blue') + btn('taxi', p[0], '\uD83D\uDE95 $5', 'small') + '</span></div>'; });
  open('map', h + '</div>');
  UI._places = places;
};
H.guide = (v) => { const p = UI._places.find((q) => q[0] === v); G.guide = { x: p[2][0], z: p[2][1], label: p[1] }; G.closePanel(); G.toast('\uD83E\uDDED Follow the arrow!'); };
H.taxi = (v) => { const p = UI._places.find((q) => q[0] === v); if (GL.Cars && GL.Cars.driving()) { G.toast('Park your car first!'); return; } if (!G.spend(5)) return; G.closePanel(); GS.me.act = null; Snd.fx('honk'); G.travel('town', false, [p[2][0], p[2][1] + (p[2][1] > 0 ? 1 : -1) * 0.5]); };
UI.app_career = function () {
  const s = sv(), cid = s.job; let h = head('\uD83D\uDCBC Career');
  if (!cid) h += '<p class="sub">No job yet! Visit the <b>Job Board at City Hall</b> to pick one.</p>' + btn('guideB', 'cityhall', '\uD83E\uDDED GUIDE ME', 'primary');
  else { const C = GL.CAREERS[cid], j = s.jobs[cid], nx = GL.LEVEL_STARS[j.lv]; h += '<div class="big">' + C.icon + ' ' + esc(C.titles[j.lv - 1]) + '</div><p class="sub">' + esc(C.name) + ' \u00b7 Level ' + j.lv + '/5 \u00b7 \u2B50 ' + j.stars + (nx != null ? ' / ' + nx + ' for promotion' : ' (max!)') + '</p><p class="sub">Workplace: <b>' + esc(C.placeName) + '</b><br>Pay: about ' + money(GL.payFor(cid, j.lv, 2)) + ' per shift (more for more stars). First shift each day: +$50 bonus!</p>' + (cid === 'animalcontrol' ? btn('acStart', null, '\uD83D\uDE90 START SHIFT NOW', 'green') : '') + btn('guideB', C.place, '\uD83E\uDDED GO TO WORK', 'primary'); }
  open('career', h);
};
H.guideB = (v) => { const b = W.bld(v); const p = b ? b.out : [-32, 31.5]; G.guide = { x: p[0], z: p[1], label: b ? b.name : 'Stage' }; G.closePanel(); };
UI.app_house = function () {
  const s = sv(), Hh = GL.HOUSES[s.house]; let h = head('\uD83C\uDFE0 House') + '<div class="big">' + Hh.icon + ' ' + esc(Hh.name) + '</div><p class="sub">' + s.home.length + ' items placed \u00b7 ' + Object.values(s.inv).reduce((a, b) => a + b, 0) + ' in storage</p>';
  const canD = GL.Decor && GL.Decor.canDecorHere();
  h += '<div class="btncol">' + btn('decor', null, '\uD83D\uDECB\uFE0F DECORATE', 'primary', !canD) + btn('decorAllowP', null, s.decorAllow ? '\uD83D\uDC65 FRIENDS CAN DECORATE: ON' : '\uD83D\uDD12 FRIENDS CAN DECORATE: OFF', s.decorAllow ? 'blue' : 'alt') + btn('guideHome', null, '\uD83E\uDDED GUIDE ME HOME', 'blue') + btn('realtorP', null, '\uD83C\uDFE1 HOUSES FOR SALE', '') + '</div>' + (!canD ? '<p class="sub small">Go inside your home (or a friend\u2019s home that allows it) to decorate.</p>' : '');
  open('house', h);
};
H.decorAllowP = () => { const s = sv(); s.decorAllow = !s.decorAllow; G.persist(); G.syncMe(); UI.app_house(); };
H.guideHome = () => { const d = G.homeSpot().door; G.guide = { x: d[0], z: d[1], label: 'Home' }; G.closePanel(); };
H.realtorP = () => UI.realtor();
UI.app_cars = function () {
  const s = sv(); let h = head('\uD83D\uDE97 My Cars');
  if (!s.cars.length) h += '<p class="sub">No car yet. Visit <b>Sal\u2019s Cars</b> on Service Row!</p>' + btn('guideB', 'dealer', '\uD83E\uDDED GUIDE ME', 'primary');
  else h += '<div class="list">' + s.cars.map((c) => '<div class="lrow"><b><i class="dot" style="background:' + c.col + '"></i>' + esc(GL.CARS[c.type].name) + '</b><span>' + (s.car === c.id ? '\u2714 Using' : btn('useCar', c.id, 'USE', 'small')) + '</span></div>').join('') + '</div><div class="btncol">' + btn('bring', null, '\uD83D\uDCCD BRING MY CAR HERE', 'blue') + '</div>';
  h += '<h3>Driving</h3><p class="sub small">Drag the stick the way you want to go \u2014 the car steers and drives itself there. Let go to brake. Keyboard: WASD / arrows, H to honk.</p>';
  open('cars', h);
};
H.useCar = (v) => { sv().car = +v; G.persist(); if (GL.Cars) GL.Cars.respawn(); UI.app_cars(); };
H.bring = () => { if (GL.Cars) GL.Cars.bring(); G.closePanel(); };
UI.app_pets = () => UI.pets();
UI.app_friends = function () {
  const s = sv(); let h = head('\uD83D\uDC9E Friends');
  const fr = G.friends(); if (fr.length) { h += '<h3>Online friends</h3><div class="list">' + fr.map((p) => '<div class="lrow"><b>' + esc(p.name) + '</b><span>' + btn('giftP', p.pid, '\uD83C\uDF81 GIFT', 'small') + btn('visit', p.pid, '\uD83C\uDFE0 VISIT', 'small blue') + '</span></div>').join('') + '</div>'; }
  h += '<h3>Townsfolk</h3><div class="list">' + (GL.NPC ? GL.NPC.list.map((n) => { const f = (s.npc[n.def.id] || { fr: 0 }).fr; return '<div class="lrow"><b>' + n.def.emo + ' ' + esc(n.def.name) + ' <small>' + esc(n.def.role) + '</small></b><span class="hearts">' + '\u2764\uFE0F'.repeat(Math.floor(f / 3)) + '\uD83E\uDD0D'.repeat(5 - Math.floor(f / 3)) + '</span></div>'; }).join('') : '') + '</div>';
  open('friends', h);
};
H.visit = (pid) => { G.closePanel(); const hs = G.homeSpot(pid); G.guide = { x: hs.door[0], z: hs.door[1], label: G.playerInfo(pid).name + '\u2019s home' }; G.toast('\uD83E\uDDED Follow the arrow to your friend\u2019s home!'); };
H.giftP = (pid) => {
  const s = sv(); let h = head('\uD83C\uDF81 Gift for ' + esc(G.playerInfo(pid).name)) + '<div class="list">';
  h += '<div class="lrow"><b>\uD83D\uDCB5 $50</b><span>' + btn('giveP', pid + '|money', 'SEND', 'small', s.money < 50) + '</span></div>';
  Object.keys(s.bag).filter((k) => s.bag[k] > 0).forEach((k) => { const it = GL.ITEMS[k]; h += '<div class="lrow"><b>' + it.icon + ' ' + esc(it.name) + ' \u00d7' + s.bag[k] + '</b><span>' + btn('giveP', pid + '|' + k, 'GIVE', 'small') + '</span></div>'; });
  open('gift', h + '</div>');
};
H.giveP = (v) => { const [pid, it] = v.split('|'), s = sv(); if (it === 'money') { if (!G.spend(50)) return; G.doAct({ k: 'gift', to: pid, item: 'money', n: 50 }); } else { if (!s.bag[it]) return; s.bag[it]--; G.doAct({ k: 'gift', to: pid, item: it, n: 1 }); } s.stats.gifts++; G.persist(); G.toast('\uD83C\uDF81 Gift sent!'); G.closePanel(); };
UI.app_goals = function () {
  const s = sv(); open('goals', head('\uD83C\uDFC6 Goals') + '<p class="sub small">' + Object.keys(s.goals).length + ' / ' + GL.GOALS.length + ' complete \u00b7 Daily streak: ' + s.daily.streak + '</p><div class="list">' + GL.GOALS.map((g) => { let r = [0, 1]; try { r = g.p(s); } catch (e) { /* */ } const done = !!s.goals[g.id]; return '<div class="lrow' + (done ? ' done' : '') + '"><b>' + g.icon + ' ' + esc(g.name) + '<small>' + esc(g.desc) + '</small></b><span>' + (done ? '\u2714' : Math.min(r[0], r[1]) + '/' + r[1]) + '<small>' + money(g.r) + '</small></span></div>'; }).join('') + '</div>');
};
UI.app_bag = () => UI.bag();
UI.app_bank = () => UI.bank();
UI.app_settings = function () {
  const s = sv(); open('settings', head('\u2699\uFE0F Settings') + '<div class="btncol">' + btn('mute', null, G.prof && GL.Snd.isMuted() ? '\uD83D\uDD07 SOUND OFF' : '\uD83D\uDD0A SOUND ON', '') + btn('tutSkip', null, s.tut < 5 ? 'SKIP TUTORIAL' : 'TUTORIAL DONE \u2714', 'alt', s.tut >= 5) + (UI.disFreqBtns ? UI.disFreqBtns() : '') + btn('quit', null, 'SAVE & QUIT TO TITLE', 'blue') + btn('resetAsk', null, 'RESET SAVE', 'red') + '</div><p class="sub small">Your game saves automatically on this device.</p>');
};
H.mute = () => { G.toggleMute(); UI.app_settings(); };
H.tutSkip = () => { sv().tut = 5; G.persist(); UI.app_settings(); };
H.quit = () => { G.closePanel(); G.persist(); G.leaveSession(); };
H.resetAsk = () => open('reset', head('Reset?') + '<p class="sub">This deletes your whole Grok Life save on this device. Are you sure?</p><div class="btnrow">' + btn('close', null, 'NO', 'alt') + btn('resetYes', null, 'YES, RESET', 'red') + '</div>');
H.resetYes = () => G.resetSave();

/* ---------------- needs, bag, eat, cook ---------------- */
UI.needs = function () { const s = sv(); open('needs', head(G.moodFace() + ' How you feel') + '<div class="list"><div class="lrow"><b>\u2764\uFE0F Health' + (s.inj ? ' <small>' + GL.INJ[s.inj.id].icon + ' ' + esc(GL.INJ[s.inj.id].name) + '</small>' : '') + '</b><span class="meter"><em style="width:' + Math.round(s.hp) + '%;background:#f43f5e"></em></span></div>' + Object.keys(G.NEEDS).map((k) => '<div class="lrow"><b>' + G.NEEDS[k][1] + ' ' + G.NEEDS[k][0] + '</b><span class="meter"><em style="width:' + Math.round(s.needs[k]) + '%"></em></span></div>').join('') + '</div>' + btn('app', 'health', '\uD83E\uDE7A HEALTH APP', 'small') + '<p class="sub small">Low needs just slow you down a little. Eat food, sleep in a bed, shower, have fun and chat with people to feel great!</p>'); };
UI.bag = function (mode) {
  const s = sv(); let h = head('\uD83C\uDF92 Bag') + '<div class="list">'; const ks = Object.keys(s.bag).filter((k) => s.bag[k] > 0);
  if (!ks.length) h += '<p class="sub">Your bag is empty. Buy food at Fresh Mart or the caf\u00e9!</p>';
  ks.forEach((k) => { const it = GL.ITEMS[k]; h += '<div class="lrow"><b>' + it.icon + ' ' + esc(it.name) + ' \u00d7' + s.bag[k] + '</b><span>' + (it.cat === 'food' ? btn('eat', k, 'EAT', 'small green') : it.cat === 'med' ? btn('useMed', k, 'USE', 'small green') : it.cat === 'tech' ? btn('useTech', k, 'PLAY', 'small green') : it.cat === 'gear' ? '<small>carried \u2714</small>' : it.cat === 'cook' ? '<small>use at a stove</small>' : it.cat === 'pet' || it.cat === 'toy' ? '<small>for pets</small>' : '<small>gift</small>') + '</span></div>'; });
  open('bag', h + '</div>'); void mode;
};
H.eat = (k) => { const s = sv(), it = GL.ITEMS[k]; if (!s.bag[k]) return; s.bag[k]--; if (it.h) G.need('h', it.h); if (it.e) G.need('e', it.e); if (it.f) G.need('f', it.f); Snd.fx('eat'); W.fx('heart', GS.me.x, 2, GS.me.z, 3, 0.4); G.toast('\uD83D\uDE0B Yum! ' + it.name); G.persist(); UI.bag(); };
UI.cook = function () {
  const s = sv(); let h = head('\uD83C\uDF73 Cook') + '<p class="sub">Each meal uses 1 Grocery Bag (you have ' + (s.bag.groceries || 0) + '). Home cooking fills you up AND is fun!</p><div class="list">';
  GL.RECIPES.forEach((r) => { h += '<div class="lrow"><b>' + r[2] + ' ' + esc(r[1]) + '</b><span>' + btn('cookR', r[0], 'COOK', 'small green', !s.bag.groceries) + '</span></div>'; });
  open('cook', h + '</div>');
};
H.cookR = (id) => { const s = sv(), r = GL.RECIPES.find((q) => q[0] === id); if (!s.bag.groceries) return; s.bag.groceries--; G.closePanel(); Snd.fx('cook'); G.startAct({ kind: 'cook', act: 'cook', x: GS.me.x, z: GS.me.z, yaw: GS.me.yaw, dur: 4, name: 'Cooked ' + r[1] + '!' }); setTimeout(() => { G.need('h', r[3]); G.need('f', r[4]); s.stats.cooked++; G.persist(); W.fx('heart', GS.me.x, 2, GS.me.z, 5, 0.5); }, 4000); };
UI.sleep = function () {
  const solo = !G.online() || GS.role === 'host' && GS.S.players.length === 1;
  $('fade').classList.add('on');
  setTimeout(() => {
    if (solo) { const h = G.hour(); const target = 7 * 60; if (h >= 18 || h < 7) G.skipTo(target); else G.skipTo((G.clock() + 120) % 1440); sv().needs.e = 100; G.need('h', -8); if (G.onSleep) G.onSleep(); G.endAct(true); G.toast('\u2600\uFE0F Good morning! Fully rested.'); if (GL.Cars) GL.Cars.parkHome(); }
    else G.toast('\uD83D\uDCA4 Taking a nap\u2026 (tap to wake up)');
    $('fade').classList.remove('on');
  }, solo ? 900 : 300);
};
UI.wake = function () { };
UI.daily = function (streak, n) { open('daily', head('\uD83D\uDCC5 Daily Bonus') + '<div class="big">Day ' + streak + ' streak!</div><p class="sub">+' + money(n) + (streak % 7 === 0 ? ' and a free cake slice \uD83C\uDF70' : '') + '</p><div class="days">' + [50, 75, 100, 125, 150, 200, 300].map((v, i) => '<span class="' + (i < ((streak - 1) % 7) + 1 ? 'on' : '') + '">' + money(v) + '</span>').join('') + '</div>' + btn('close', null, 'YAY!', 'primary')); };
UI.emotes = function () { open('emote', head('Hang out!') + '<div class="btncol">' + [['wave', '\uD83D\uDC4B WAVE'], ['dance', '\uD83D\uDC83 DANCE'], ['five', '\u270B HIGH FIVE'], ['hug', '\uD83E\uDD17 HUG']].map((q) => btn('emote', q[0], q[1], 'blue')).join('') + '</div>'); };
H.emote = (e) => { G.closePanel(); GS.emote = e; GS.emoteT = e === 'dance' ? 5 : 2; let to = null, bd = 8; G.friends().forEach((p) => { const q = GS.pos[p.pid]; if (q && q.a === GS.me.area) { const d = Math.hypot(q.x - GS.me.x, q.z - GS.me.z); if (d < bd) { bd = d; to = p.pid; } } }); G.doAct({ k: 'wave', e, to }); G.need('s', 8); G.need('f', 4); W.fx('heart', GS.me.x, 2.2, GS.me.z, 4, 0.5); };

/* ---------------- shops ---------------- */
UI.shop = function (w) {
  const s = sv();
  if (w === 'furn') { let h = head('\uD83D\uDECB\uFE0F Cozy Home Furniture') + '<p class="sub small">' + money(s.money) + ' \u00b7 Bought furniture goes to storage. Place it with DECORATE at home (phone \u2192 House).</p><div class="grid">'; GL.FURN_ORDER.forEach((k) => { const f = GL.FURN[k]; h += '<button class="item" data-a="buyF" data-v="' + k + '"><i>' + f.icon + '</i><b>' + esc(f.name) + '</b><small>' + money(f.price) + (s.inv[k] ? ' \u00b7 own ' + s.inv[k] : '') + '</small></button>'; }); open('shop', h + '</div>'); return; }
  const name = { grocery: '\uD83D\uDED2 Fresh Mart', cafe: '\u2615 Sunny Side Caf\u00e9', pet: '\uD83D\uDC3E Pet Supplies', pharm: '\uD83D\uDC8A Maple Clinic Pharmacy', tech: '\uD83D\uDCBB Byte Buy Tech' }[w];
  let h = head(name) + '<p class="sub small">' + money(s.money) + (w === 'cafe' ? ' \u00b7 Caf\u00e9 food is eaten right away.' : ' \u00b7 Items go in your bag.') + '</p><div class="grid">';
  GL.itemsAt(w).forEach((k) => { const it = GL.ITEMS[k]; h += '<button class="item" data-a="buyI" data-v="' + k + '|' + w + '"><i>' + it.icon + '</i><b>' + esc(it.name) + '</b><small>' + money(it.price) + (it.h ? ' \u00b7 \uD83C\uDF54+' + it.h : '') + (it.e ? ' \u26A1+' + it.e : '') + (it.hp ? ' \u2764\uFE0F+' + it.hp : '') + (it.desc ? '<br>' + esc(it.desc) : '') + '</small></button>'; });
  open('shop', h + '</div>');
};
H.buyI = (v) => { const [k, w] = v.split('|'), it = GL.ITEMS[k], s = sv(); if (!G.spend(it.price)) return; G.tutNext(4); if (w === 'cafe') { if (it.h) G.need('h', it.h); if (it.e) G.need('e', it.e); if (it.f) G.need('f', it.f); G.need('s', 3); Snd.fx('eat'); G.toast('\uD83D\uDE0B ' + it.name + ' \u2014 delicious!'); } else { s.bag[k] = (s.bag[k] || 0) + 1; G.toast('\u2714 ' + it.icon + ' ' + it.name + ' added to your bag'); } G.persist(); UI.shop(w); };
H.useTech = (k) => { const s = sv(), it = GL.ITEMS[k]; if (!s.bag[k] || !it) return; const t = G.clock() + G.day() * 1440; s.techT = s.techT || {}; if (s.techT[k] && t - s.techT[k] < 120) { G.toast(it.icon + ' You just played with that! Try again in a bit.'); return; } s.techT[k] = t; if (it.f) G.need('f', it.f); if (it.e) G.need('e', it.e); if (it.s) G.need('s', it.s); Snd.fx('sparkle'); W.fx('sparkle', GS.me.x, 2, GS.me.z, 4, 0.5); G.toast(it.icon + ' ' + ({ smartphone: 'You watched 47 cat videos. Purrfect.', laptop: 'You beat level 3 of Llama Leap!', console: 'NEW HIGH SCORE! \uD83C\uDFC6', tv: 'A cozy cartoon marathon. Ahh.', headphones: 'You dance like nobody\u2019s watching!' }[k] || 'Fun!')); G.persist(); UI.bag(); };
H.buyF = (k) => { const f = GL.FURN[k], s = sv(); if (!G.spend(f.price)) return; s.inv[k] = (s.inv[k] || 0) + 1; G.tutNext(4); G.toast('\u2714 ' + f.icon + ' ' + f.name + ' sent to your storage!'); G.persist(); UI.shop('furn'); };
UI.clinic = function () { open('clinic', head('\uD83C\uDFE5 Check-up') + '<p class="sub">A quick check-up and a nap in the ward: restores energy and hygiene.</p>' + btn('checkup', null, 'CHECK-UP \u00b7 $20', 'primary')); };
H.checkup = () => { if (!G.spend(20)) return; G.need('e', 40); G.need('y', 40); G.closePanel(); W.fx('sparkle', GS.me.x, 1.5, GS.me.z, 8, 1); G.toast('\uD83E\uDE7A Dr. Priya says you\u2019re in great shape!'); };
UI.bank = function () {
  const s = sv(); open('bank', head('\uD83C\uDFE6 Grok Bank') + '<div class="big">' + money(s.money) + '</div><p class="sub">Balance \u00b7 Savings: <b>' + money(s.savings) + '</b> (earns 1% interest every day, up to $200)</p><div class="btnrow">' + btn('dep', 100, 'SAVE $100', 'green', s.money < 100) + btn('dep', 'all', 'SAVE ALL', 'green', s.money < 1) + '</div><div class="btnrow">' + btn('wd', 100, 'TAKE $100', 'blue', s.savings < 100) + btn('wd', 'all', 'TAKE ALL', 'blue', s.savings < 1) + '</div><p class="sub small">Total earned: ' + money(s.stats.earned) + '</p>');
};
H.dep = (v) => { const s = sv(), n = v === 'all' ? s.money : 100; if (s.money < n) return; s.money -= n; s.savings += n; Snd.fx('cash'); G.persist(); UI.bank(); };
H.wd = (v) => { const s = sv(), n = v === 'all' ? s.savings : 100; if (s.savings < n) return; s.savings -= n; s.money += n; Snd.fx('cash'); G.persist(); UI.bank(); };

/* ---------------- job board ---------------- */
UI.jobs = function () {
  const s = sv(); let h = head('\uD83D\uDCCB Job Board') + '<p class="sub small">Pick any job \u2014 switch any time. Your level in each career is kept!</p><div class="list">';
  GL.CAREER_ORDER.forEach((cid) => { const C = GL.CAREERS[cid], j = s.jobs[cid]; h += '<div class="lrow job"><b>' + C.icon + ' ' + esc(C.name) + '<small>' + esc(C.desc) + '<br>\uD83D\uDCCD ' + esc(C.placeName) + ' \u00b7 from ' + money(GL.payFor(cid, j ? j.lv : 1, 1)) + '/shift' + (j ? ' \u00b7 Lv ' + j.lv : '') + '</small></b><span>' + (s.job === cid ? '\u2714 YOUR JOB' : btn('takeJob', cid, 'TAKE', 'small primary')) + '</span></div>'; });
  open('jobs', h + '</div>');
};
H.takeJob = (cid) => { const s = sv(); s.job = cid; if (!s.jobs[cid]) s.jobs[cid] = { lv: 1, stars: 0, shifts: 0 }; G.persist(); G.closePanel(); Snd.fx('level'); const C = GL.CAREERS[cid]; G.toast('\uD83C\uDF89 You\u2019re hired as a ' + C.titles[0] + '! Work at ' + C.placeName + '.'); const b = W.bld(C.place); const p = b ? b.out : [-32, 31.5]; G.guide = { x: p[0], z: p[1], label: C.placeName }; G.tutNext(2); };

/* ---------------- realtor ---------------- */
UI.realtor = function (focus) {
  const s = sv(); let h = head('\uD83C\uDFE1 Houses on Maple Street') + '<p class="sub small">You live in: <b>' + esc(GL.HOUSES[s.house].name) + '</b>. Moving keeps all your furniture (extra pieces go to storage).</p><div class="list">';
  GL.HOUSE_ORDER.forEach((k) => { const Hh = GL.HOUSES[k]; if (k === 'apt') return; const mine = s.house === k; h += '<div class="lrow' + (focus === k ? ' hl' : '') + '"><b>' + Hh.icon + ' ' + esc(Hh.name) + '<small>' + esc(Hh.desc) + ' (' + Hh.w + '\u00d7' + Hh.d + ' m)</small></b><span>' + (mine ? '\u2714 HOME' : btn('buyH', k, 'BUY ' + money(Hh.price), 'small primary') + (Hh.rent ? btn('rentH', k, 'RENT ' + money(Hh.rent) + '/day', 'small') : '')) + '</span></div>'; });
  if (s.house !== 'apt') h += '<div class="lrow"><b>\uD83C\uDFE2 Starter Apartment</b><span>' + btn('moveApt', null, 'MOVE BACK (free)', 'small alt') + '</span></div>';
  open('realtor', h + '</div>');
};
function moveTo(k) {
  const s = sv(), Hh = GL.HOUSES[k]; s.house = k; s.stats.houses++;
  const keep = []; s.home.forEach((f) => { const it = GL.FURN[f.id]; if (Math.abs(f.x) + it.w / 2 < Hh.w / 2 - 0.2 && Math.abs(f.z) + it.d / 2 < Hh.d / 2 - 1.6) keep.push(f); else s.inv[f.id] = (s.inv[f.id] || 0) + 1; }); s.home = keep;
  s.carPos = null; G.persist(); G.syncMe(); G.closePanel(); Snd.fx('level'); G.toast('\uD83C\uDF89 Welcome to your ' + Hh.name + '!'); G.tutNext(4);
  setTimeout(() => { const d = G.homeSpot().door; G.guide = { x: d[0], z: d[1], label: 'New home!' }; if (GL.Cars) GL.Cars.parkHome(); }, 400);
}
H.buyH = (k) => { if (!G.spend(GL.HOUSES[k].price)) return; sv().rent = 'own'; moveTo(k); };
H.rentH = (k) => { if (!G.spend(GL.HOUSES[k].rent)) return; sv().rent = 1; moveTo(k); };
H.moveApt = () => { sv().rent = 0; moveTo('apt'); };
UI.paint = function () {
  const s = sv(); let h = head('\uD83C\uDFA8 Paint & Floors') + '<p class="sub small">$25 per change. Applies to your home.</p><h3>Walls</h3><div class="swrow">' + GL.WALLS.map((c, i) => '<button class="swc' + (s.wall === i ? ' on' : '') + '" style="background:' + c + '" data-a="setWall" data-v="' + i + '"></button>').join('') + '</div><h3>Floors</h3><div class="chiprow">' + GL.FLOORS.map((f) => '<button class="chip' + (s.floor === f[0] ? ' on' : '') + '" data-a="setFloor" data-v="' + f[0] + '">' + esc(f[1]) + '</button>').join('') + '</div>';
  open('paint', h);
};
H.setWall = (i) => { const s = sv(); if (s.wall === +i || !G.spend(25)) return; s.wall = +i; G.persist(); G.syncMe(); UI.paint(); G.toast('\uD83C\uDFA8 Walls repainted!'); };
H.setFloor = (f) => { const s = sv(); if (s.floor === f || !G.spend(25)) return; s.floor = f; G.persist(); G.syncMe(); UI.paint(); G.toast('\uD83E\uDEB5 New floors!'); };

/* ---------------- car dealer + repaint ---------------- */
let DL = { car: 'golf', col: GL.CAR_COLS[0] };
UI.dealer = function (car) {
  if (car) DL.car = car; const s = sv(), C = GL.CARS[DL.car];
  let h = head('\uD83D\uDE97 Sal\u2019s Cars') + '<p class="sub small">\u201cEvery car comes with a free air freshener and my winning smile!\u201d \u2014 Sal</p><div class="chiprow">' + GL.CAR_ORDER.map((k) => '<button class="chip' + (DL.car === k ? ' on' : '') + '" data-a="dlCar" data-v="' + k + '">' + esc(GL.CARS[k].name) + '</button>').join('') + '</div>';
  h += '<div class="big">' + esc(C.name) + '</div><p class="sub">' + money(C.price) + ' \u00b7 Top speed ' + C.top + ' \u00b7 ' + C.seats + ' seats</p><h3>Colour</h3><div class="swrow">' + GL.CAR_COLS.map((c) => '<button class="swc' + (DL.col === c ? ' on' : '') + '" style="background:' + c + '" data-a="dlCol" data-v="' + c + '"></button>').join('') + '</div>';
  const has = s.cars.filter((c) => c.type === DL.car).length;
  h += '<div class="btnrow">' + btn('dlBuy', null, 'BUY ' + money(C.price), 'primary') + '</div>' + (has ? '<p class="sub small">You already own ' + has + ' of these.</p>' : '');
  open('dealer', h);
};
H.dlCar = (v) => { DL.car = v; UI.dealer(); };
H.dlCol = (v) => { DL.col = v; UI.dealer(); };
H.dlBuy = () => { const s = sv(), C = GL.CARS[DL.car]; if (!G.spend(C.price)) return; const id = (s.cars.reduce((a, c) => Math.max(a, c.id), 0) || 0) + 1; s.cars.push({ id, type: DL.car, col: DL.col }); s.car = id; s.carPos = null; G.persist(); G.closePanel(); Snd.fx('honk'); G.tutNext(4); G.toast('\uD83D\uDE97 Your new ' + C.name + ' is parked right outside!'); if (GL.Cars) GL.Cars.spawnAt(W.bld('dealer').out[0] + 4, -53.8, Math.PI / 2); };
UI.repaint = function () { const s = sv(), c = s.cars.find((q) => q.id === s.car); if (!c) { open('rp', head('\uD83C\uDFA8 Paint Shop') + '<p class="sub">You need a car first!</p>'); return; } open('rp', head('\uD83C\uDFA8 Paint Shop') + '<p class="sub">Repaint your ' + esc(GL.CARS[c.type].name) + ' for $80.</p><div class="swrow">' + GL.CAR_COLS.map((cc) => '<button class="swc' + (c.col === cc ? ' on' : '') + '" style="background:' + cc + '" data-a="rpCol" data-v="' + cc + '"></button>').join('') + '</div>'); };
H.rpCol = (v) => { const s = sv(), c = s.cars.find((q) => q.id === s.car); if (!c || c.col === v || !G.spend(80)) return; c.col = v; G.persist(); if (GL.Cars) GL.Cars.respawn(true); UI.repaint(); G.toast('\u2728 Fresh paint!'); };

/* ---------------- pets ---------------- */
UI.adopt = function () {
  const s = sv(); let h = head('\uD83D\uDC3E Adopt a Pet') + '<p class="sub small">Every pet comes home with you right away. ' + money(s.money) + '</p><h3>\u2764\uFE0F Family</h3><div class="grid">';
  GL.FAMILY.forEach((f) => { const has = s.pets.some((p) => p.fam === f.id); h += '<button class="item" data-a="adoptF" data-v="' + f.id + '"' + (has ? ' disabled' : '') + '><img class="pic" src="' + UI.portrait({ sp: f.sp, col: f.col, eye: f.eye, oneEye: f.oneEye, acc: f.acc }) + '"><b>' + esc(f.name) + '</b><small>' + (has ? 'home \u2714' : money(GL.FAMILY_PRICE)) + '<br>' + esc(f.blurb) + '</small></button>'; });
  h += '</div><h3>Pets</h3><div class="grid">';
  GL.PET_ORDER.forEach((sp) => { const S = GL.SPECIES[sp]; h += '<button class="item" data-a="adoptS" data-v="' + sp + '"><img class="pic" src="' + UI.portrait({ sp, col: [S.vars[0][1], S.vars[0][2]] }) + '"><b>' + esc(S.name) + '</b><small>' + money(S.price) + '</small></button>'; });
  open('adopt', h + '</div>');
};
H.adoptF = (fid) => { const f = GL.familyById(fid); if (!G.spend(GL.FAMILY_PRICE)) return; GL.Pets.adopt(f.sp, f.name, f); G.closePanel(); };
H.adoptS = (sp) => { const S = GL.SPECIES[sp]; if (!G.spend(S.price)) return; GL.Pets.adopt(sp, null, null); G.closePanel(); };
UI.pets = function () {
  const s = sv(); let h = head('\uD83D\uDC3E My Pets');
  if (!s.pets.length) h += '<p class="sub">No pets yet! Adopt one at <b>Paws & Claws</b> (or bring your family pets home there!).</p>' + btn('guideB', 'petstore', '\uD83E\uDDED GUIDE ME', 'primary');
  else h += '<div class="list">' + s.pets.map((p) => '<div class="lrow"><b><img class="pic sm" src="' + UI.portrait(GL.Pets.look(p)) + '">' + esc(p.name) + '<small>' + (p.ill && GL.PET_ILL[p.ill] ? '<span class="red">' + GL.PET_ILL[p.ill].icon + ' ' + esc(GL.PET_ILL[p.ill].name) + '</span><br>' : '') + '\u2764\uFE0F ' + Math.round(p.hp == null ? 100 : p.hp) + ' \u00b7 \uD83C\uDF56 ' + Math.round(p.n.h) + ' \u00b7 \uD83C\uDF88 ' + Math.round(p.n.f) + ' \u00b7 tricks: ' + (Object.keys(p.tricks).filter((k) => p.tricks[k] >= GL.TRICK_NEED).join(', ') || 'none') + '</small></b><span>' + (p.missing ? '<small class="red">' + (p.missing === 'shelter' ? 'AT THE SHELTER' : p.missing === 'stolen' ? 'STOLEN!' : 'MISSING!') + (p.missing === 'stolen' && p.clue ? '<br>\uD83D\uDD75\uFE0F ' + esc(p.clue) : '') + '</small>' + btn('app', 'animal', '\uD83D\uDC3E ANIMAL CONTROL', 'small red') : btn('petOut', p.id, p.out ? '\uD83C\uDFE0 STAY HOME' : '\uD83D\uDEB6 COME ALONG', 'small') + btn('petCare', p.id, '\u2764\uFE0F CARE', 'small primary')) + '</span></div>').join('') + '</div>';
  open('pets', h);
};
H.petOut = (id) => { GL.Pets.toggleOut(+id); UI.pets(); };
H.petCare = (id) => UI.petCare(+id);
UI.petCare = function (id) {
  const s = sv(), p = s.pets.find((q) => q.id === id); if (!p) return;
  const food = ['kibble', 'treat', 'veggies', 'seeds'].filter((k) => s.bag[k] > 0);
  let h = head('\u2764\uFE0F ' + esc(p.name)) + '<img class="pic big" src="' + UI.portrait(GL.Pets.look(p)) + '">' + (UI.petHealthBar ? UI.petHealthBar(p) : '') + '<p class="sub">\uD83C\uDF56 Food ' + Math.round(p.n.h) + '% \u00b7 \uD83C\uDF88 Happy ' + Math.round(p.n.f) + '%</p><div class="btnrow">' + btn('pPet', id, '\u270B PET', 'primary') + btn('pPlay', id, '\uD83C\uDFBE PLAY', 'blue', !s.bag.ball) + '</div>';
  h += '<h3>Feed</h3><div class="btnrow">' + (food.length ? food.map((k) => btn('pFeed', id + '|' + k, GL.ITEMS[k].icon + ' ' + GL.ITEMS[k].name + ' \u00d7' + s.bag[k], 'small green')).join('') : '<p class="sub small">No pet food \u2014 buy some at Paws & Claws!</p>') + '</div>';
  h += '<h3>Tricks</h3><div class="btnrow">' + GL.TRICKS.map((t) => btn('pTrick', id + '|' + t[0], t[2] + ' ' + t[1] + ((p.tricks[t[0]] || 0) >= GL.TRICK_NEED ? ' \u2714' : ' ' + (p.tricks[t[0]] || 0) + '/' + GL.TRICK_NEED), 'small')).join('') + '</div>';
  open('petcare', h);
};
H.pPet = (id) => { GL.Pets.care(+id, 'pet'); UI.petCare(+id); };
H.pPlay = (id) => { GL.Pets.care(+id, 'play'); UI.petCare(+id); };
H.pFeed = (v) => { const [id, k] = v.split('|'); GL.Pets.care(+id, 'feed', k); UI.petCare(+id); };
H.pTrick = (v) => { const [id, t] = v.split('|'); GL.Pets.care(+id, 'trick', t); UI.petCare(+id); };
let PR = null; const pcache = {};
UI.portrait = function (look) {
  const key = JSON.stringify(look); if (pcache[key]) return pcache[key];
  if (!PR) { try { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setClearColor(0x000000, 0); const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0x9a8a70, 1)); const d = new T.DirectionalLight(0xffffff, 0.5); d.position.set(2, 3, 4); sc.add(d); PR = { r, sc, cam: new T.PerspectiveCamera(30, 1, 0.05, 50), cv }; } catch (e) { PR = false; } }
  if (!PR) return '';
  const P = MD.pet(Object.assign({ lv: 7, acc: {} }, look)); P.g.rotation.y = 0.55; P.anim(0.01, 0); PR.sc.add(P.g); P.g.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(P.g), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), R = Math.max(sz.x, sz.y, sz.z) * 0.62;
  const dist = R / Math.tan(15 * Math.PI / 180) * 1.05; PR.cam.position.set(c.x + dist * 0.12, c.y + dist * 0.22, c.z + dist); PR.cam.lookAt(c);
  PR.r.render(PR.sc, PR.cam); PR.sc.remove(P.g); let url = ''; try { url = PR.cv.toDataURL('image/png'); } catch (e) { /* */ } pcache[key] = url; return url;
};

/* decorating lives in js/decor.js */

/* ---------------- tutorial + arcade ---------------- */
const TUT = ['', '\uD83D\uDC4B Welcome to Grokville! Walk into any store to explore.', '\uD83D\uDCCB Get a job at the Job Board in City Hall.', '\uD83D\uDCBC Go to your workplace and press WORK to do a shift.', '\uD83D\uDECD\uFE0F Spend your paycheck! Buy food, clothes, furniture\u2026'];
UI.tutHud = function () {
  const s = sv(), el = $('tut'); if (s.tut < 1 || s.tut >= 5 || GS.panel) { G.setHidden(el, true); return; }
  const h = '<b>' + s.tut + '/4</b> ' + TUT[s.tut]; if (el.dataset.k !== h) { el.dataset.k = h; el.innerHTML = h; } G.setHidden(el, false);
  if (!G.guide) { if (s.tut === 2) { const b = W.bld('cityhall'); G.guide = { x: b.out[0], z: b.out[1], label: 'City Hall', tut: 1 }; } if (s.tut === 3 && s.job) { const C = GL.CAREERS[s.job], b = W.bld(C.place), p = b ? b.out : [-32, 31.5]; G.guide = { x: p[0], z: p[1], label: C.placeName, tut: 1 }; } }
};
UI.arcade = function () { open('arc', head('\uD83D\uDD79\uFE0F Grok Arcade') + '<p class="sub">Head to the Grok Arcade? Your Grok Life game is saved.</p><div class="btnrow">' + btn('close', null, 'STAY', 'alt') + '<a class="btn primary" href="' + esc(GN.hubUrl()) + '">GO!</a></div>'); };
UI.init = function () { };
})();
