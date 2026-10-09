/* Grok Life - careers: quick 30-second shift mini games, stars, pay, promotions, teamwork bonus */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, Snd = GL.Snd;
const GS = G.GS, sv = () => G.save(), esc = window.GrokNet.esc, money = GL.money;
const K = GL.Work = {};
// choice games: prompt -> pick the right answer
const QUIZ = {
  chef: { verb: 'Make the order!', q: [['A customer wants something sweet for breakfast', '\uD83E\uDD5E', ['\uD83E\uDD5E Pancakes', '\uD83E\uDDC5 Onion', '\uD83E\uDDC2 Salt']], ['Table 3 ordered pizza', '\uD83C\uDF55', ['\uD83C\uDF55 Pizza', '\uD83C\uDF5C Noodles', '\uD83E\uDD57 Salad']], ['A kid wants dessert', '\uD83C\uDF68', ['\uD83C\uDF68 Ice cream', '\uD83C\uDF36\uFE0F Chili', '\uD83E\uDD66 Broccoli']], ['Someone wants a hot drink', '\u2615', ['\u2615 Cocoa', '\uD83E\uDDCA Ice', '\uD83C\uDF4B Lemon']], ['Burger, please!', '\uD83C\uDF54', ['\uD83C\uDF54 Burger', '\uD83C\uDF69 Donut', '\uD83C\uDF5E Bread']], ['A healthy lunch', '\uD83E\uDD57', ['\uD83E\uDD57 Salad', '\uD83C\uDF6D Lollipop', '\uD83C\uDF5F Fries']], ['Birthday treat!', '\uD83C\uDF82', ['\uD83C\uDF82 Cake', '\uD83E\uDD54 Potato', '\uD83E\uDD5A Egg']]] },
  doctor: { verb: 'Pick the right care!', q: [['Patient has a scraped knee', '\uD83E\uDE79', ['\uD83E\uDE79 Bandage', '\uD83C\uDF6D Candy', '\uD83C\uDFB8 Guitar']], ['Patient has a fever', '\uD83C\uDF21\uFE0F', ['\uD83C\uDF21\uFE0F Thermometer', '\uD83D\uDD28 Hammer', '\uD83E\uDDF8 Teddy']], ['Patient feels very tired', '\uD83D\uDECC', ['\uD83D\uDECC Rest', '\u26BD Soccer', '\u2615 5 Coffees']], ['Check the heartbeat', '\uD83E\uDE7A', ['\uD83E\uDE7A Stethoscope', '\uD83E\uDD44 Spoon', '\uD83D\uDCF1 Phone']], ['Patient has a broken arm', '\uD83E\uDDB4', ['\uD83E\uDDB4 X-ray + cast', '\uD83C\uDF88 Balloon', '\uD83E\uDDFD Sponge']], ['Patient sneezes a lot', '\uD83E\uDD27', ['\uD83E\uDD27 Tissues', '\uD83C\uDF36\uFE0F Pepper', '\uD83E\uDEB6 Feather']]] },
  vet: { verb: 'Help the pet!', q: [['A puppy is hungry', '\uD83D\uDC36', ['\uD83E\uDDB4 Kibble', '\uD83C\uDF6B Chocolate', '\uD83E\uDDC5 Onion']], ['A tortoise wants a snack', '\uD83D\uDC22', ['\uD83C\uDF3C Dandelions', '\uD83C\uDF54 Burger', '\uD83C\uDF6D Candy']], ['A kitten is muddy', '\uD83D\uDC31', ['\uD83D\uDEC1 Gentle bath', '\uD83C\uDF0A Ocean', '\uD83C\uDFA8 Paint']], ['A rat needs a toy', '\uD83D\uDC00', ['\uD83E\uDDF6 Chew rope', '\uD83D\uDCFA TV', '\uD83E\uDDF1 Brick']], ['A bunny wants a treat', '\uD83D\uDC30', ['\uD83E\uDD55 Carrot', '\uD83C\uDF5F Fries', '\uD83C\uDF69 Donut']], ['A parrot looks bored', '\uD83E\uDD9C', ['\uD83C\uDFB5 Sing to it', '\uD83D\uDCA4 Ignore it', '\uD83E\uDDCA Ice bath']]] },
  mechanic: { verb: 'Fix the car!', q: [['Flat tire!', '\uD83D\uDEDE', ['\uD83D\uDEDE New tire', '\uD83E\uDDFB Paper', '\uD83C\uDF4C Banana']], ['Out of gas', '\u26FD', ['\u26FD Fill tank', '\uD83E\uDD64 Juice', '\uD83D\uDCA8 Blow on it']], ['Loose bolt', '\uD83D\uDD29', ['\uD83D\uDD27 Wrench', '\uD83E\uDD44 Spoon', '\uD83D\uDD8D\uFE0F Crayon']], ['Dead battery', '\uD83D\uDD0B', ['\uD83D\uDD0B New battery', '\uD83C\uDF4B Lemon', '\uD83E\uDDF2 Magnet']], ['Dirty windshield', '\uD83E\uDE9F', ['\uD83E\uDDFD Wash it', '\uD83E\uDD6B Mud', '\uD83C\uDF6F Honey']], ['Squeaky brakes', '\uD83D\uDED1', ['\uD83D\uDEE2\uFE0F Oil + new pads', '\uD83C\uDFB5 Music', '\uD83E\uDDC0 Cheese']]] },
  teacher: { verb: 'Answer the question!', q: [['What is 7 + 5?', '\u2795', ['12', '10', '13']], ['Which is a mammal?', '\uD83D\uDC2C', ['\uD83D\uDC2C Dolphin', '\uD83E\uDD88 Shark', '\uD83D\uDC19 Octopus']], ['What colour do blue + yellow make?', '\uD83C\uDFA8', ['\uD83D\uDFE2 Green', '\uD83D\uDFE3 Purple', '\uD83D\uDFE0 Orange']], ['How many legs does a spider have?', '\uD83D\uDD77\uFE0F', ['8', '6', '10']], ['What is 6 \u00d7 3?', '\u2716\uFE0F', ['18', '16', '21']], ['Which planet do we live on?', '\uD83C\uDF0D', ['\uD83C\uDF0D Earth', '\uD83D\uDD34 Mars', '\uD83E\uDE90 Saturn']], ['What do plants need?', '\uD83C\uDF31', ['\u2600\uFE0F Sunlight', '\uD83C\uDF6C Candy', '\uD83D\uDCFA TV']]] },
  clerk: { verb: 'Ring it up!', q: [['Apple $2 + Milk $3 = ?', '\uD83D\uDED2', ['$5', '$6', '$4']], ['Bread $4 + Eggs $4 = ?', '\uD83D\uDED2', ['$8', '$7', '$9']], ['Customer pays $10 for $7. Change?', '\uD83D\uDCB5', ['$3', '$2', '$4']], ['Where do bananas go?', '\uD83C\uDF4C', ['\uD83C\uDF4E Fruit aisle', '\uD83E\uDDCA Freezer', '\uD83E\uDDFB Paper aisle']], ['Cheese $5 + Juice $2 = ?', '\uD83D\uDED2', ['$7', '$8', '$6']], ['Where does ice cream go?', '\uD83C\uDF66', ['\uD83E\uDDCA Freezer', '\uD83C\uDF5E Bakery', '\uD83C\uDF3F Garden']]] }
};
// tap games: tap the good targets, skip the bad ones
const TAP = {
  popstar: { verb: 'Tap the notes, skip the boos!', good: ['\uD83C\uDFB5', '\uD83C\uDFB6', '\u2B50'], bad: ['\uD83D\uDC4E'] },
  fire: { verb: 'Spray the fires, not the kitties!', good: ['\uD83D\uDD25'], bad: ['\uD83D\uDC31'] },
  police: { verb: 'Catch the sneaky robbers!', good: ['\uD83E\uDDB9'], bad: ['\uD83E\uDDD1\u200D\uD83C\uDF3E', '\uD83D\uDC75'] }
};
let ov = null, st = null;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
K.request = function (cid) {
  const s = sv(), C = GL.CAREERS[cid]; if (!C) return;
  if (GS.work) return;
  if (s.job !== cid && cid === 'animalcontrol' && GL.Strays && GL.Strays.offer) { GL.Strays.offer(); return; }
  if (s.job !== cid) { G.toast(C.icon + ' This is where ' + C.name + 's work. Get the job at City Hall!'); if (s.tut === 2) G.guide = null; return; }
  if (GL.Cars && GL.Cars.driving()) return;
  if (G.injBlock && G.injBlock()) return;
  if (G.jailed && G.jailed()) return;
  if (s.needs.e < 12) { G.toast('\uD83D\uDE34 You\u2019re too tired to work. Get some sleep first!', true); return; }
  if (cid === 'animalcontrol' && GL.Strays) { GL.Strays.startShift(); return; }
  start(cid);
};
// results screen for shifts played out in the world (Animal Control van)
K.external = function (cid, stars, score, note) {
  const C = GL.CAREERS[cid]; if (ov) ov.remove();
  GS.work = { cid, overlay: true, spray: false };
  ov = document.createElement('div'); ov.id = 'workOv'; document.body.appendChild(ov);
  st = { cid, t: 0, score, miss: 0, done: false, mode: 'ext', targets: [], note };
  ov.innerHTML = '<div class="wTop"><b>' + C.icon + ' ' + esc(C.name) + ' shift</b><span id="wTime">0s</span><span id="wScore">\u2B50 ' + score + '</span></div><div class="wVerb">Shift over!</div><div id="wBody"></div><button class="btn small wQuit" id="wQuit">OK</button>';
  finish(stars);
};
function friendWorking() { return Object.keys(GS.pos).filter((k) => k !== GS.pid && GS.pos[k].w && GS.pos[k].a === GS.me.area); }
function start(cid) {
  const C = GL.CAREERS[cid];
  GS.work = { cid, overlay: true, spray: false }; G.closePanel(); GS.me.act = null;
  ov = document.createElement('div'); ov.id = 'workOv'; document.body.appendChild(ov);
  st = { cid, t: 30, score: 0, miss: 0, round: 0, done: false, mode: QUIZ[cid] ? 'quiz' : 'tap', spawnT: 0, targets: [] };
  ov.innerHTML = '<div class="wTop"><b>' + C.icon + ' ' + esc(C.name) + ' shift</b><span id="wTime">30</span><span id="wScore">\u2B50 0</span></div><div class="wVerb">' + esc((QUIZ[cid] || TAP[cid]).verb) + '</div><div id="wBody"></div><button class="btn small wQuit" id="wQuit">END SHIFT</button>';
  ov.querySelector('#wQuit').onclick = () => finish();
  Snd.fx('ding');
  if (st.mode === 'quiz') nextQ(); else ov.querySelector('#wBody').innerHTML = '<div class="wField" id="wField"></div>';
}
function nextQ() {
  const Q = QUIZ[st.cid]; const q = Q.q[Math.floor(Math.random() * Q.q.length)]; st.cur = q;
  const opts = shuffle(q[2]); ov.querySelector('#wBody').innerHTML = '<div class="wCard"><div class="wEmoji">' + q[1] + '</div><p>' + esc(q[0]) + '</p></div><div class="wOpts">' + opts.map((o) => '<button class="btn wOpt" data-o="' + esc(o) + '">' + esc(o) + '</button>').join('') + '</div>';
  ov.querySelectorAll('.wOpt').forEach((b) => { b.onclick = () => answer(b.dataset.o, b); });
}
function answer(o, b) {
  if (st.done || st.lock) return; const ok = o === st.cur[2][0];
  if (ok) { st.score++; Snd.fx('right'); b.classList.add('ok'); } else { st.miss++; Snd.fx('wrong'); b.classList.add('bad'); }
  st.lock = true; setTimeout(() => { if (!st || st.done) return; st.lock = false; nextQ(); }, 450); upd();
}
function upd() { if (!ov) return; ov.querySelector('#wScore').textContent = '\u2B50 ' + st.score; ov.querySelector('#wTime').textContent = Math.ceil(st.t) + 's'; }
function spawn() {
  const T = TAP[st.cid], f = ov.querySelector('#wField'); if (!f) return;
  const bad = Math.random() < 0.25, e = document.createElement('button'); e.className = 'wTgt'; e.textContent = (bad ? T.bad : T.good)[Math.floor(Math.random() * (bad ? T.bad : T.good).length)];
  e.style.left = (8 + Math.random() * 74) + '%'; e.style.top = (6 + Math.random() * 76) + '%';
  const o = { e, bad, life: 1.6 + Math.random() * 0.6 }; st.targets.push(o);
  e.onpointerdown = (ev) => { ev.preventDefault(); if (o.dead) return; o.dead = true; if (bad) { st.miss++; st.score = Math.max(0, st.score - 1); Snd.fx('wrong'); } else { st.score++; Snd.fx(st.cid === 'fire' ? 'spray' : st.cid === 'popstar' ? 'pop' : 'right'); GS.work.spray = st.cid === 'fire'; } e.classList.add(bad ? 'bad' : 'ok'); setTimeout(() => e.remove(), 200); upd(); };
  f.appendChild(e);
}
K.tick = function (dt) {
  if (!st || st.done) return;
  st.t -= dt; if (st.t <= 0) { finish(); return; }
  if (st.mode === 'tap') { st.spawnT -= dt; if (st.spawnT <= 0) { st.spawnT = Math.max(0.45, 0.9 - (30 - st.t) * 0.012); spawn(); } st.targets.forEach((o) => { o.life -= dt; if (o.life <= 0 && !o.dead) { o.dead = true; o.e.remove(); } }); st.targets = st.targets.filter((o) => !o.dead || o.e.isConnected); }
  upd();
};
K.key = function (code) {
  if (!st) return; if (code === 'Escape') { finish(); return; }
  if (st.mode === 'quiz' && !st.done) { const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(code); if (i >= 0) { const b = ov.querySelectorAll('.wOpt')[i]; if (b) answer(b.dataset.o, b); } }
  if (st.done && (code === 'Enter' || code === 'Space')) K.abort(true);
};
function finish(forceStars) {
  if (!st || st.done) return; st.done = true; const s = sv(), cid = st.cid, C = GL.CAREERS[cid], j = s.jobs[cid];
  const need = st.mode === 'quiz' ? [2, 5, 8] : [5, 12, 20], stars = typeof forceStars === 'number' ? forceStars : st.score >= need[2] ? 3 : st.score >= need[1] ? 2 : st.score >= need[0] ? 1 : 0;
  if (st.note) extraNote = st.note; else extraNote = '';
  let pay = stars ? GL.payFor(cid, j.lv, stars) : 10, extra = []; if (extraNote) extra.push(extraNote);
  const mates = friendWorking(), team = mates.length > 0; let bonus = 0; if (team && stars) { const b = Math.round(pay * 0.25); bonus = b; pay += b; extra.push('\uD83E\uDD1D Teamwork +' + money(b)); }
  if (s.workDay !== G.day() && stars) { s.workDay = G.day(); pay += 50; extra.push('\u2600\uFE0F First shift today +$50'); }
  G.addMoney(pay, 'earn'); j.stars += stars; j.shifts = (j.shifts || 0) + 1; s.stats.shifts++; if (stars === 3) s.stats.perfect++;
  G.need('e', -14); G.need('h', -8); G.need('f', stars ? 6 : -4);
  let promo = ''; const nx = GL.LEVEL_STARS[j.lv]; if (nx != null && j.lv < 5 && j.stars >= nx) { j.lv++; promo = '<div class="wPromo">\uD83C\uDF89 PROMOTED to ' + esc(C.titles[j.lv - 1]) + '!</div>'; Snd.fx('level'); } else Snd.fx(stars ? 'cash' : 'wrong');
  if (bonus && G.doAct) G.doAct({ k: 'team', cid, pids: mates, amt: Math.round(bonus / 2) });
  G.persist(); G.tutNext(3); G.checkGoals && G.checkGoals();
  ov.querySelector('#wBody').innerHTML = '<div class="wCard"><div class="wEmoji">' + ('\u2B50'.repeat(stars) || '\uD83D\uDE05') + '</div><p>' + (stars ? 'Great shift!' : 'Tough shift \u2014 try again!') + ' Score ' + st.score + '</p><div class="big">+' + money(pay) + '</div>' + extra.map((x) => '<p class="sub small">' + x + '</p>').join('') + promo + '<p class="sub small">' + esc(C.titles[j.lv - 1]) + ' \u00b7 \u2B50 ' + j.stars + (GL.LEVEL_STARS[j.lv] != null && j.lv < 5 ? ' / ' + GL.LEVEL_STARS[j.lv] : '') + '</p></div><button class="btn primary" id="wDone">DONE</button>';
  ov.querySelector('#wQuit').remove(); ov.querySelector('#wDone').onclick = () => K.abort(true);
  if (st.mode !== 'ext') st.mishap = [cid, stars, st.miss];
}
let extraNote = '';
K.abort = function (silent) { if (GS.work && GS.work.ac && GL.Strays) { GL.Strays.endShift(true); return; } if (st && !st.done && !silent) finish(); const mh = st && st.done && st.mishap; if (ov) ov.remove(); ov = null; st = null; GS.work = null; if (mh && G.onWorkDone) setTimeout(() => G.onWorkDone(mh[0], mh[1], mh[2]), 300); };
})();
