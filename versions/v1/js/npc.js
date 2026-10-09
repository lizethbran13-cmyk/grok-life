/* Grok Life - townsfolk: daily routines (work / park / home), walk the sidewalks, talk + friendship hearts */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd;
const GS = G.GS, sv = () => G.save(), ang = G.ang, esc = window.GrokNet.esc;
const N = GL.NPC = { list: [] };
// work: [area, hot kind/id to stand near]; home: nh_ area or null (goes "home" off-screen)
const DEFS = [
  { id: 'maxine', name: 'Mayor Maxine', role: 'Mayor', emo: '\uD83C\uDF96\uFE0F', work: ['cityhall', 'jobs'], look: { skin: 2, hair: 'bob', hairCol: '#9ca3af', top: 'suit', topCol: '#7c3aed', pants: '#1f2937', hat: 'none', glasses: 'round' }, lines: ['Welcome to Maple Town! Need a job? Talk to me at City Hall.', 'Every citizen makes this town brighter!', 'Have you visited the pond? The ducks are my favourite.'] },
  { id: 'rosa', name: 'Rosa', role: 'Grocer', emo: '\uD83E\uDD6C', work: ['grocery', 'shop'], home: 'nh_rosa', look: { skin: 3, hair: 'bun', hairCol: '#1f2937', top: 'apron', topCol: '#16a34a', pants: '#334155' }, lines: ['Fresh apples today, mija!', 'A full tummy is a happy tummy.', 'My bungalow is the orange one, come knock sometime!'] },
  { id: 'priya', name: 'Dr. Priya', role: 'Doctor', emo: '\uD83E\uDE7A', work: ['hospital', 'clinic'], look: { skin: 3, hair: 'long', hairCol: '#111827', top: 'coat', topCol: '#f8fafc', pants: '#1e3a8a', glasses: 'round' }, lines: ['Remember to sleep and drink water!', 'Feeling tired? A check-up helps.', 'Laughter is good medicine. So is a nap.'] },
  { id: 'bo', name: 'Chef Bo', role: 'Chef', emo: '\uD83D\uDC68\u200D\uD83C\uDF73', work: ['cafe', 'shop'], look: { skin: 1, hair: 'short', hairCol: '#78350f', top: 'tee', topCol: '#f8fafc', pants: '#111827', hat: 'chef' }, lines: ['Try the pancakes, they\u2019re fluffy like clouds!', 'Cooking is just love you can eat.', 'You can cook at home with groceries, you know!'] },
  { id: 'dee', name: 'Officer Dee', role: 'Police', emo: '\uD83D\uDC6E', work: ['police', 'work'], look: { skin: 4, hair: 'pony', hairCol: '#111827', top: 'tee', topCol: '#1e40af', pants: '#1e3a8a', hat: 'police' }, lines: ['Look both ways at the crosswalk!', 'Maple Town is the safest town around.', 'Want to join the force? Ask at City Hall!'] },
  { id: 'blaze', name: 'Captain Blaze', role: 'Firefighter', emo: '\uD83D\uDE92', work: ['fire', 'work'], look: { skin: 2, hair: 'short', hairCol: '#b45309', top: 'tee', topCol: '#dc2626', pants: '#1f2937', hat: 'helmet' }, lines: ['Stop, drop and roll!', 'Our truck is the shiniest in the county.', 'Heroes come in all sizes!'] },
  { id: 'lily', name: 'Ms. Lily', role: 'Teacher', emo: '\uD83D\uDCDA', work: ['school', 'work'], look: { skin: 0, hair: 'curly', hairCol: '#facc15', top: 'sweater', topCol: '#f472b6', pants: '#475569', glasses: 'round' }, lines: ['Reading is a superpower!', 'Did you know a group of flamingos is a flamboyance?', 'Never stop learning!'] },
  { id: 'pawla', name: 'Dr. Pawla', role: 'Vet', emo: '\uD83D\uDC3E', work: ['petstore', 'adopt'], look: { skin: 1, hair: 'pony', hairCol: '#a16207', top: 'coat', topCol: '#a7f3d0', pants: '#0f766e' }, lines: ['Every pet deserves a loving home.', 'Rats are super smart, they can learn tricks!', 'Tortoises love dandelions.'] },
  { id: 'coco', name: 'Coco', role: 'Fashion Designer', emo: '\uD83D\uDC57', work: ['boutique', 'boutique'], look: { skin: 4, hair: 'long', hairCol: '#ec4899', top: 'sparkle', topCol: '#f472b6', pants: '#111827', glasses: 'star' }, lines: ['Darling, that outfit is iconic!', 'Pink is always in season.', 'Come try on hats, they\u2019re fabulous!'] },
  { id: 'vance', name: 'Mr. Vance', role: 'Banker', emo: '\uD83C\uDFE6', work: ['bank', 'bank'], look: { skin: 2, hair: 'short', hairCol: '#4b5563', top: 'suit', topCol: '#1f2937', pants: '#111827', glasses: 'square' }, lines: ['Savings grow a little every day.', 'A penny saved is a penny earned!', 'Numbers are beautiful, don\u2019t you think?'] },
  { id: 'sal', name: 'Sal', role: 'Car Dealer', emo: '\uD83D\uDE97', work: ['dealer', 'dealer'], look: { skin: 1, hair: 'short', hairCol: '#111827', top: 'shirt', topCol: '#f59e0b', pants: '#1f2937', glasses: 'shades' }, lines: ['Have I got a deal for you!', 'The sports car? Zoom zoom!', 'Golf carts are great for beginners.'] },
  { id: 'marco', name: 'Marco', role: 'Mechanic', emo: '\uD83D\uDD27', work: ['garage', 'repaint'], look: { skin: 3, hair: 'short', hairCol: '#1f2937', top: 'overalls', topCol: '#2563eb', pants: '#1e3a8a', hat: 'cap' }, lines: ['Want a fresh paint job?', 'Engines are like puzzles.', 'Keep your tires happy!'] },
  { id: 'gladys', name: 'Gladys', role: 'Retired Baker', emo: '\uD83E\uDDC1', home: 'nh_gladys', town: 1, look: { skin: 0, hair: 'bun', hairCol: '#e5e7eb', top: 'sweater', topCol: '#a78bfa', pants: '#4c1d95', glasses: 'round' }, lines: ['I baked cookies! Well, I will tomorrow.', 'Back in my day, we walked uphill both ways.', 'You remind me of my granddaughter!'] },
  { id: 'joe', name: 'Grandpa Joe', role: 'Gardener', emo: '\uD83C\uDF3B', home: 'nh_joe', town: 1, look: { skin: 2, hair: 'bald', hairCol: '#e5e7eb', top: 'shirt', topCol: '#16a34a', pants: '#78350f', hat: 'straw' }, lines: ['Sunflowers always face the sun.', 'Plant a seed, grow a friend.', 'The pond ducks know me by name.'] },
  { id: 'grumble', name: 'Old Man Grumbleton', role: 'Grump', emo: '\uD83D\uDE24', home: 'nh_grumble', town: 1, look: { skin: 1, hair: 'bald', hairCol: '#9ca3af', top: 'sweater', topCol: '#57534e', pants: '#292524' }, lines: ['Hmph.', 'Kids these days and their phones\u2026', 'Get off my lawn! \u2026 Oh, it\u2019s you. Fine.'], nice: ['Well\u2026 I suppose you\u2019re alright.', 'Don\u2019t tell anyone, but I like you.', 'Here, have a butterscotch.'] },
  { id: 'frank', name: 'Frank', role: 'Jogger', emo: '\uD83C\uDFC3', town: 1, fast: 1, look: { skin: 4, hair: 'short', hairCol: '#111827', top: 'tank', topCol: '#22c55e', pants: '#1f2937', hat: 'band' }, lines: ['Can\u2019t stop, gotta keep moving!', 'Three laps around town before breakfast!', 'Stretch, hydrate, smile!'] },
  { id: 'penny', name: 'Penny', role: 'Kid', emo: '\uD83C\uDF88', town: 1, kid: 1, look: { skin: 3, hair: 'pigtails', hairCol: '#7c2d12', top: 'tee', topCol: '#facc15', pants: '#2563eb' }, lines: ['Wanna race to the slide?!', 'I saw a dog that looked like a mop!', 'When I grow up I wanna be a pop star!'] },
  { id: 'stella', name: 'Stella', role: 'Pop Star', emo: '\uD83C\uDFA4', town: 1, look: { skin: 0, hair: 'long', hairCol: '#a855f7', top: 'sparkle', topCol: '#c084fc', pants: '#111827', glasses: 'star' }, lines: ['La la laaa! Oh, hi!', 'Come watch me on the park stage!', 'Music makes everything better.'] }
];
N.DEFS = DEFS;
function fr(id) { const s = sv(); return (s.npc[id] = s.npc[id] || { fr: 0, day: -1, gift: -1 }); }
function hearts(f) { return Math.min(5, Math.floor(f / 3)); }
function heartStr(f) { const h = hearts(f); return '\u2764\uFE0F'.repeat(h) + '\uD83E\uDD0D'.repeat(5 - h); }
function cleanLook(l) {
  const HM = { pony: 'ponytail', bald: 'buzz' }, TM = { apron: 'tee', shirt: 'tee', tank: 'tee' }, HT = { straw: 'sunhat', band: 'headphones' }, GM = { star: 'stars', square: 'round' };
  const d = GL.defaultLook(); d.skin = GL.SKINS[l.skin || 0]; d.hair = HM[l.hair] || l.hair || 'short'; d.hc = l.hairCol || d.hc; d.top = TM[l.top] || l.top || 'tee'; d.tc = l.topCol || d.tc; d.bc = l.pants || d.bc; d.hat = HT[l.hat] || l.hat || 'none'; d.gl = GM[l.glasses] || l.glasses || 'none';
  if (!GL.HAIRS.some((q) => q[0] === d.hair)) d.hair = 'short'; if (!GL.TOPS[d.top] && d.top !== 'coat') d.top = 'tee'; if (!GL.HATS[d.hat] && !['chef', 'helmet', 'police'].includes(d.hat)) d.hat = 'none'; if (!GL.GLASSES[d.gl]) d.gl = 'none'; return d;
}
function workSpot(n) { const A = W.areas[n.def.work[0]]; if (!A) return null; const h = A.hots.find((q) => q.kind === n.def.work[1] || q.id === n.def.work[1]) || A.hots[0]; const f = W.freeNear(A, h.x, h.z - 1.3, 0.3); return [f[0], f[1]]; }
const POIS = [[-24, 20], [-32, 26], [-14, 28], [-30, 14], [-20, 34], [10, 10], [-10, -10], [20, -26], [-20, -26], [24, 22], [-36, 36]];
N.init = function () {
  N.list.forEach((n) => W.scene.remove(n.ch.g)); N.list = [];
  DEFS.forEach((def, i) => {
    let ch; try { ch = MD.avatar(cleanLook(def.look)); } catch (e) { ch = MD.avatar(GL.defaultLook()); }
    if (def.kid) ch.g.scale.setScalar(0.78);
    const tag = W.textSprite(def.emo + ' ' + def.name, { size: 30, h: 0.3, bg: 'rgba(15,60,90,.8)', border: '#7dd3fc' }); tag.position.y = 2.45; ch.g.add(tag);
    W.scene.add(ch.g);
    const p = POIS[i % POIS.length], f = W.freeNear(W.areas.town, p[0], p[1], 0.3);
    N.list.push({ def, ch, area: 'town', x: f[0], z: f[1], yaw: 0, sp: 0, path: null, want: null, idle: Math.random() * 3, talkT: 0 });
  });
};
// where should n be at minute m?  returns {area, x, z} or {town:true}
function plan(n, m) {
  const h = m / 60, d = n.def;
  if (d.work && h >= 8 && h < 18) return { area: d.work[0] };
  if (h >= 7 && h < 21.5) return { town: 1 };
  return { area: d.home || 'home' };
}
function setArea(n, area) { n.area = area; n.path = null; if (area === 'home') return; const A = W.areas[area]; if (!A) return; if (area === 'town') return; if (area.startsWith('nh_')) { const f = W.freeNear(A, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, 0.3); n.x = f[0]; n.z = f[1]; } else { const s = workSpot(n); n.x = s[0]; n.z = s[1]; n.yaw = 0; } }
function walk(n, dt, tx, tz, spd) { // reused Grok Pets steering: face the way you walk
  const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz); if (d < 0.25) { n.sp = 0; return true; }
  const ty = Math.atan2(dx, dz); n.yaw += ang(ty - n.yaw) * Math.min(1, dt * 7);
  const face = Math.max(0, Math.cos(ang(ty - n.yaw))), sp = spd * face, st = Math.min(d, sp * dt);
  const r = W.move(W.areas[n.area], n.x, n.z, Math.sin(n.yaw) * st, Math.cos(n.yaw) * st, 0.3); const moved = Math.hypot(r[0] - n.x, r[1] - n.z);
  n.x = r[0]; n.z = r[1]; n.sp = moved / Math.max(dt, 1e-3);
  if (st > 0.01 && moved < st * 0.2) { n.stuck = (n.stuck || 0) + dt; if (n.stuck > 1.5) { n.stuck = 0; return true; } } else n.stuck = 0;
  return false;
}
function busy(n) { return GS.talk === n; }
N.tick = function (dt) {
  const m = G.clock ? G.clock() : 600;
  N.list.forEach((n) => {
    const p = plan(n, m);
    if (!busy(n)) {
      if (p.town) {
        if (n.area !== 'town') { // come out the door
          const b = n.area.startsWith('nh_') ? W.lots.find((L) => L.npc === n.def.id) : W.bld(n.area);
          const out = b ? (b.out || [b.x - 1.5, 57]) : POIS[0]; const f = W.freeNear(W.areas.town, out[0], out[1], 0.3); n.area = 'town'; n.x = f[0]; n.z = f[1]; n.path = null;
        }
        if (!n.path || !n.path.length) { n.idle -= dt; n.sp = 0; if (n.idle <= 0) { const q = POIS[Math.floor(Math.random() * POIS.length)]; n.path = W.navPath(n.x, n.z, q[0], q[1]) || [[q[0], q[1]]]; n.idle = 2 + Math.random() * 6; } }
        else { const w = n.path[0]; if (walk(n, dt, w[0], w[1], n.def.fast ? 4.2 : n.def.kid ? 3 : 2.2)) n.path.shift(); }
      } else if (n.area !== p.area) {
        if (n.area === 'town') { // walk to the door first
          const b = p.area.startsWith('nh_') ? W.lots.find((L) => L.npc === n.def.id) : p.area === 'home' ? null : W.bld(p.area);
          const out = b ? (b.out || [b.x - 1.5, 57]) : null;
          if (!out || Math.hypot(out[0] - n.x, out[1] - n.z) < 1.2 || !n.def.work && p.area === 'home') setArea(n, p.area);
          else { if (!n.path || !n.path.goal) { n.path = W.navPath(n.x, n.z, out[0], out[1]) || [[out[0], out[1]]]; n.path.goal = 1; } if (n.path.length) { const w = n.path[0]; if (walk(n, dt, w[0], w[1], 2.6)) n.path.shift(); } else setArea(n, p.area); }
        } else setArea(n, p.area);
      } else n.sp = 0;
    } else { n.sp = 0; n.yaw += ang(Math.atan2(GS.me.x - n.x, GS.me.z - n.z) - n.yaw) * Math.min(1, dt * 6); }
    const vis = !!W.cur && n.area === W.cur.id; n.ch.g.visible = vis;
    if (vis) { n.ch.g.position.set(n.x, 0, n.z); n.ch.g.rotation.y = n.yaw; n.ch.anim(dt, n.sp, n.talkT > 0, null); }
    n.inTown = n.area === 'town';
    if (n.talkT > 0) n.talkT -= dt;
  });
};
N.nearest = function (x, z) { let b = null, bd = 2.4; if (!W.cur) return null; N.list.forEach((n) => { if (n.area !== W.cur.id) return; const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; b = n; } }); return b ? { n: b, d: bd } : null; };
N.hit = function (sx, sy) { if (!W.cur) return null; for (const n of N.list) if (n.area === W.cur.id && W.hitObj(sx, sy, n.ch.g)) return n; return null; };
N.onTravel = function () { if (GS.talk) N.close(); };
N.abort = function () { GS.talk = null; };
N.newDay = function () {};
function line(n) { const f = fr(n.def.id).fr, d = n.def; const pool = d.nice && f >= 9 ? d.nice : d.lines; return pool[Math.floor(Math.random() * pool.length)]; }
function render(n, say) {
  const f = fr(n.def.id), s = sv(), today = G.day(), gifts = Object.keys(s.bag).filter((k) => s.bag[k] > 0 && GL.ITEMS[k]);
  let h = G.head(esc(n.def.emo + ' ' + n.def.name)) + '<p class="sub">' + esc(n.def.role) + ' \u00b7 ' + heartStr(f.fr) + '</p><div class="say">\u201c' + esc(say) + '\u201d</div><div class="btncol">';
  h += '<button class="btn primary" data-a="npcDo" data-v="chat">\uD83D\uDCAC CHAT</button><button class="btn blue" data-a="npcDo" data-v="comp">\u2728 COMPLIMENT</button>';
  h += '<button class="btn green" data-a="npcDo" data-v="gift"' + (gifts.length ? '' : ' disabled') + '>\uD83C\uDF81 GIVE A GIFT' + (gifts.length ? ' (' + esc(GL.ITEMS[gifts[0]].name) + ')' : ' (buy snacks first)') + '</button>';
  h += '<button class="btn" data-a="npcDo" data-v="wave">\uD83D\uDC4B WAVE</button><button class="btn" data-a="close">BYE</button></div>';
  void today; G.openPanel('talk', h);
}
N.talk = function (n) { if (!n) return; GS.goal = null; GS.talk = n; n.talkT = 1.5; Snd.fx('pop'); render(n, line(n)); const v = sv().visited; if (v && !v['npc_' + n.def.id]) v['npc_' + n.def.id] = 1; };
N.close = function () { if (GS.panel === 'talk') G.closePanel(); GS.talk = null; };
const prevClose = G.onPanelClose; G.onPanelClose = function (w) { if (w === 'talk') GS.talk = null; if (prevClose) prevClose(w); };
GL.UI.H.npcDo = function (what) {
  const n = GS.talk; if (!n) return; const f = fr(n.def.id), today = G.day(); let say, gain = 0;
  if (what === 'chat') { gain = f.day === today ? 0 : 1; f.day = today; say = line(n); G.need('s', 10); }
  else if (what === 'comp') { if (f.comp === today) { say = 'You already said that today, silly! \uD83D\uDE0A'; } else { f.comp = today; gain = 1; say = n.def.id === 'grumble' && f.fr < 9 ? 'Hmph. \u2026Thanks, I guess.' : 'Aww, you\u2019re so sweet!'; G.need('s', 8); } }
  else if (what === 'gift') { const s = sv(), k = Object.keys(s.bag).find((q) => s.bag[q] > 0 && GL.ITEMS[q]); if (!k) return; s.bag[k]--; s.stats.gifts = (s.stats.gifts || 0) + 1; if (f.gift === today) { say = 'Another gift? You spoil me!'; gain = 1; } else { f.gift = today; gain = 2; say = 'For me?! Thank you so much!'; } Snd.fx('cash'); W.fx('heart', n.x, 2.3, n.z, 5, 0.6); G.need('s', 12); }
  else if (what === 'wave') { n.talkT = 2; say = 'Hiya! \uD83D\uDC4B'; G.need('s', 4); }
  if (gain) { const before = hearts(f.fr); f.fr = Math.min(15, f.fr + gain); if (hearts(f.fr) > before) { Snd.fx('star'); G.toast('\u2764\uFE0F ' + n.def.name + ' likes you more! (' + hearts(f.fr) + '/5 hearts)'); W.fx('heart', n.x, 2.3, n.z, 6, 0.6); } }
  G.persist(); G.checkGoals && G.checkGoals(); render(n, say);
};
N.knock = function (id) {
  const n = N.list.find((q) => q.def.id === id); Snd.fx('knock');
  if (!n) return; const f = fr(id), home = n.area === n.def.home;
  if (!home) { G.toast(n.def.name + ' isn\u2019t home right now.'); return; }
  if (id === 'grumble' && f.fr < 6) { G.toast('\uD83D\uDE24 \u201cGo away!\u201d (Be nicer to Grumbleton first)', true); return; }
  if (f.fr < 3 && id !== 'grumble') { G.toast('\u201cWho is it? Oh! Come say hi in town first, dear.\u201d'); return; }
  G.toast('\uD83D\uDEAA ' + n.def.name + ': \u201cCome on in!\u201d'); G.travel(n.def.home);
};
})();
