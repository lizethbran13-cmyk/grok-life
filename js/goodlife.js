/* Grok Life - GOOD LIFE PACK (DLC #27, Mini Pack, unlock key grokDLC.life.good_life_pack)
   - Ratita Industries Gadget Shop on the east side of town (Luna, Pi-rat + Snowie run it, Torty supervises the snacks)
   - 8 gadgets + snacks that all DO something:
       Fix-It Hammer (fix your car anywhere), RatPhone 5 (Squeak Delivery drone + texting the Ratitas),
       Ratita Tablet (work your shift from anywhere), Hover-Board (zoom around), Bubble Shield (rain/hail/snow proof),
       Squeak Scanner (heals + cures small boo-boos once a day), Squeak Soda + Cheese Bites
   - 5 outfits (top + hat + extras): Luna Lab Coat, Pi-rat Captain, Snowie Frost Suit, Ratita CEO, Robo-Rat MK1
   Co-op: the host shares the pack with everyone in the room (S.glp). Models are smooth (rounded/lathe geometry, no billboards). */
(function () {
'use strict';
const GL = window.GL, G = GL.G, W = GL.W, MD = GL.MD, Snd = GL.Snd, UI = GL.UI, T = window.THREE, GN = window.GrokNet;
const GS = G.GS, sv = () => G.save(), esc = GN.esc, money = GL.money, TAU = Math.PI * 2;
const head = G.head, open = G.openPanel, H = UI.H;
const btn = (a, v, txt, cls, dis) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(String(v)) + '"' : '') + (dis ? ' disabled' : '') + '>' + txt + '</button>';
const KEY = 'grokDLC.life.good_life_pack';
const GLP = GL.GLP = {};
GLP.KEY = KEY;
GLP.localOwned = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
GLP.owned = () => GLP.localOwned() || !!(GS.role === 'client' && GS.S && GS.S.glp);
const has = (k) => !!(sv().bag && sv().bag[k] > 0);
GLP.has = has;
function gs() { const s = sv(); if (!s.glp || typeof s.glp !== 'object') s.glp = { hover: false, shield: true, scanDay: 0, textT: -999, hello: 0, orders: 0 }; return s.glp; }
const nowMin = () => G.clock() + G.day() * 1440;

/* ======================================================================
   Data: outfits (tops + hats + glasses) and items
   ====================================================================== */
Object.assign(GL.TOPS, { labcoat: { name: 'Luna Lab Coat', price: 0, dlc: 'glp' }, captain: { name: 'Pi-rat Captain Coat', price: 0, dlc: 'glp' }, frost: { name: 'Snowie Frost Suit', price: 0, dlc: 'glp' },
  ceo: { name: 'Ratita CEO Suit', price: 0, dlc: 'glp' }, mecha: { name: 'Robo-Rat MK1 Armor', price: 0, dlc: 'glp' } });
Object.assign(GL.HATS, { ratears: { name: 'Rat Ears', price: 0, icon: '\uD83D\uDC2D', dlc: 'glp' }, tricorn: { name: 'Captain Hat', price: 0, icon: '\uD83C\uDFF4\u200D\u2620\uFE0F', dlc: 'glp' },
  earmuffs: { name: 'Fluffy Earmuffs', price: 0, icon: '\u2744\uFE0F', dlc: 'glp' }, tophat: { name: 'CEO Top Hat', price: 0, icon: '\uD83C\uDFA9', dlc: 'glp' }, robohelm: { name: 'Robo-Rat Helmet', price: 0, icon: '\uD83E\uDD16', dlc: 'glp' } });
Object.assign(GL.GLASSES, { goggles: { name: 'Lab Goggles', price: 0, icon: '\uD83E\uDD7D', dlc: 'glp' }, patch: { name: 'Eye Patch', price: 0, icon: '\uD83C\uDFF4\u200D\u2620\uFE0F', dlc: 'glp' } });
GLP.OUTFITS = [
  { id: 'luna', name: 'Luna Lab Coat', who: 'Luna', icon: '\uD83E\uDD7C', blurb: 'Science time! A lab coat with a Ratita badge, pens, goggles and rat ears.', look: { top: 'labcoat', tc: '#f8fafc', bc: '#8b5cf6', hat: 'ratears', hatc: '#9ca3af', gl: 'goggles' } },
  { id: 'pirat', name: 'Pi-rat Captain', who: 'Pi-rat', icon: '\uD83C\uDFF4\u200D\u2620\uFE0F', blurb: 'Arr! Gold buttons, epaulettes, a cheese-and-crossbones hat and an eye patch, like Pi-rat.', look: { top: 'captain', tc: '#b91c1c', bc: '#1f2937', hat: 'tricorn', gl: 'patch' } },
  { id: 'snowie', name: 'Snowie Frost Suit', who: 'Snowie', icon: '\u2744\uFE0F', blurb: 'A puffy snow-white parka with a fluffy collar and pink earmuffs.', look: { top: 'frost', tc: '#f1f5f9', bc: '#f9a8d4', hat: 'earmuffs', hatc: '#f472b6', gl: 'none' } },
  { id: 'ceo', name: 'Ratita CEO', who: 'the Boss', icon: '\uD83D\uDCBC', blurb: 'Purple suit, cheese-gold tie, a gold Ratita pin and a fancy top hat. Very important.', look: { top: 'ceo', tc: '#6d28d9', bc: '#1f2937', hat: 'tophat', gl: 'none' } },
  { id: 'robo', name: 'Robo-Rat MK1', who: 'Robo-Rat', icon: '\uD83E\uDD16', blurb: 'Shiny armor with a glowing power core and a helmet with metal rat ears. Beep boop.', look: { top: 'mecha', tc: '#cbd5e1', bc: '#475569', hat: 'robohelm', gl: 'none' } }
];
/* cat 'ratita': every item has a real use (see GLP.use). tool: you keep it (buy once). */
Object.assign(GL.ITEMS, {
  rhammer: { name: 'Fix-It Hammer', icon: '\uD83D\uDD28', price: 85, where: 'ratita', cat: 'ratita', tool: 1, desc: 'Fix your car anywhere: dents, breakdowns, even wrecks (good enough to drive to Hank\u2019s).' },
  ratphone: { name: 'RatPhone 5', icon: '\uD83D\uDCF1', price: 140, where: 'ratita', cat: 'ratita', tool: 1, desc: 'Adds the \uD83D\uDC00 Ratita app: Squeak Delivery drones bring food anywhere, and you can text the Ratitas.' },
  rtablet: { name: 'Ratita Tablet', icon: '\uD83D\uDCF2', price: 220, where: 'ratita', cat: 'ratita', tool: 1, desc: 'Work your job\u2019s shift from anywhere (80% pay). No commute!' },
  rhover: { name: 'Hover-Board', icon: '\uD83D\uDEF9', price: 320, where: 'ratita', cat: 'ratita', tool: 1, desc: 'Ride it to zoom around town 60% faster. Friends see it too!' },
  rshield: { name: 'Bubble Shield', icon: '\uD83E\uDEE7', price: 110, where: 'ratita', cat: 'ratita', tool: 1, desc: 'Pops a bubble around you in rain, snow or hail: always dry, no hail bonks.' },
  rscanner: { name: 'Squeak Scanner', icon: '\uD83E\uDE7A', price: 160, where: 'ratita', cat: 'ratita', tool: 1, desc: 'Scan yourself once a day: +25 health and it cures small boo-boos and sniffles.' },
  rsoda: { name: 'Squeak Soda', icon: '\uD83E\uDD64', price: 6, where: 'ratita', cat: 'ratita', e: 30, f: 8, desc: 'Fizzy cheese-berry energy! +30 energy, +8 fun.' },
  rcheese: { name: 'Cheese Bites', icon: '\uD83E\uDDC0', price: 5, where: 'ratita', cat: 'ratita', h: 22, f: 6, desc: 'Luna\u2019s favourite snack. +22 food, +6 fun.' }
});
GLP.ITEM_ORDER = ['rhammer', 'ratphone', 'rtablet', 'rhover', 'rshield', 'rscanner', 'rsoda', 'rcheese'];

/* ======================================================================
   Smooth geometry helpers
   ====================================================================== */
const gc = {};
function rgeo(w, h, d, r) {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join('|'); if (gc[k]) return gc[k];
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001); const bs = Math.min(r * 0.75, d / 2 - 0.001), sw = w - 2 * bs, sh = h - 2 * bs, cr = Math.max(0.0005, Math.min(r - bs * 0.5, sw / 2 - 0.0005, sh / 2 - 0.0005));
  const s = new T.Shape(), x = -sw / 2, y = -sh / 2;
  s.moveTo(x + cr, y); s.lineTo(x + sw - cr, y); s.quadraticCurveTo(x + sw, y, x + sw, y + cr); s.lineTo(x + sw, y + sh - cr); s.quadraticCurveTo(x + sw, y + sh, x + sw - cr, y + sh);
  s.lineTo(x + cr, y + sh); s.quadraticCurveTo(x, y + sh, x, y + sh - cr); s.lineTo(x, y + cr); s.quadraticCurveTo(x, y, x + cr, y);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * bs), bevelEnabled: true, bevelThickness: bs, bevelSize: bs, bevelSegments: 3, curveSegments: 5 });
  g.translate(0, 0, -(d - 2 * bs) / 2); g.computeVertexNormals(); gc[k] = g; return g;
}
const mc = {};
function PM(col, o) { const k = col + JSON.stringify(o || {}); if (!mc[k]) mc[k] = new T.MeshPhongMaterial(Object.assign({ color: col, shininess: 60, specular: 0x333333 }, o || {})); return mc[k]; }
function GLOW(col) { return PM(col, { emissive: col, emissiveIntensity: 0.85, shininess: 90 }); }
function rb(w, h, d, r, mat, p, x, y, z) { const m = new T.Mesh(rgeo(w, h, d, r), typeof mat === 'string' ? PM(mat) : mat); m.position.set(x || 0, y || 0, z || 0); if (p) p.add(m); return m; }
const HTOR = new T.TorusGeometry(1, 0.28, 10, 20, Math.PI), SPH = new T.SphereGeometry(1, 20, 14), CYL = new T.CylinderGeometry(1, 1, 1, 22), TOR = new T.TorusGeometry(1, 0.28, 10, 26), HEMI = new T.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2);
function sm(geo, mat, p, x, y, z, sx, sy, sz) { const m = new T.Mesh(geo, typeof mat === 'string' ? PM(mat) : mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); if (p) p.add(m); return m; }
const sp = (r, mat, p, x, y, z) => sm(SPH, mat, p, x, y, z, r, r, r);
const sq = (m, ax, k) => { m.scale[ax] *= k; return m; };
const cy = (r, h, mat, p, x, y, z) => sm(CYL, mat, p, x, y, z, r, h, r);
const grp = (p, x, y, z) => { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (p) p.add(g); return g; };
let CANG = null; function canGeo() { if (CANG) return CANG; const pts = []; [[0, 0], [0.1, 0], [0.115, 0.012], [0.12, 0.03], [0.12, 0.27], [0.112, 0.29], [0.095, 0.305], [0.09, 0.31], [0, 0.31]].forEach((q) => pts.push(new T.Vector2(q[0], q[1]))); CANG = new T.LatheGeometry(pts, 24); CANG.computeVertexNormals(); return CANG; }
let WEDG = null; function wedgeGeo() { if (WEDG) return WEDG; const s = new T.Shape(); s.moveTo(-0.22, -0.1); s.lineTo(0.24, -0.1); s.lineTo(-0.22, 0.12); s.lineTo(-0.22, -0.1); WEDG = new T.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 4 }); WEDG.translate(0, 0, -0.08); WEDG.computeVertexNormals(); return WEDG; }
const GOLD = () => PM('#facc15', { emissive: '#7a5a00', emissiveIntensity: 0.35, shininess: 100, specular: 0x886622 });

/* ======================================================================
   Item models (shop displays, icons, in-hand)
   ====================================================================== */
function ratBadge(p, x, y, z, s) { const b = grp(p, x, y, z); b.scale.setScalar(s || 1); sq(sp(0.05, '#9ca3af', b, 0, 0, 0), 'z', 0.4); [-1, 1].forEach((q) => { sq(sp(0.025, '#9ca3af', b, q * 0.04, 0.04, 0), 'z', 0.4); sq(sp(0.014, '#f9a8d4', b, q * 0.04, 0.04, 0.008), 'z', 0.3); }); sp(0.008, '#ec4899', b, 0, -0.015, 0.022); return b; }
MD.glpItem = function (id) {
  const g = new T.Group();
  switch (id) {
    case 'rhammer': { const h = grp(g, 0, 0, 0); h.rotation.z = -0.35; cy(0.035, 0.62, '#a16207', h, 0, 0.31, 0); rb(0.09, 0.2, 0.09, 0.03, '#7c3aed', h, 0, 0.12, 0); rb(0.34, 0.13, 0.13, 0.045, PM('#e5e7eb', { shininess: 120, specular: 0x999999 }), h, 0.03, 0.66, 0); cy(0.068, 0.04, GOLD(), h, 0.2, 0.66, 0).rotation.z = Math.PI / 2; rb(0.05, 0.14, 0.14, 0.02, '#7c3aed', h, -0.08, 0.66, 0); sq(sp(0.03, GLOW('#22d3ee'), h, 0.03, 0.66, 0.066), 'z', 0.4); break; }
    case 'ratphone': { const p = grp(g, 0, 0.25, 0); rb(0.24, 0.46, 0.035, 0.04, '#ec4899', p, 0, 0, 0); rb(0.21, 0.4, 0.01, 0.03, GLOW('#38bdf8'), p, 0, 0, 0.018); [-1, 1].forEach((q) => { sq(sp(0.045, '#ec4899', p, q * 0.08, 0.235, 0), 'z', 0.35); sq(sp(0.025, '#fbcfe8', p, q * 0.08, 0.237, 0.01), 'z', 0.3); });
      for (let i = 0; i < 6; i++) rb(0.045, 0.045, 0.006, 0.012, GLOW(['#facc15', '#22c55e', '#f97316', '#a78bfa', '#f43f5e', '#ffffff'][i]), p, -0.055 + (i % 3) * 0.055, 0.1 - Math.floor(i / 3) * 0.06, 0.025); sm(TOR, '#111827', p, 0.06, 0.17, -0.02, 0.022, 0.022, 0.02); break; }
    case 'rtablet': { const p = grp(g, 0, 0.3, 0); p.rotation.x = -0.15; rb(0.62, 0.46, 0.035, 0.05, '#334155', p, 0, 0, 0); rb(0.56, 0.4, 0.01, 0.03, GLOW('#a78bfa'), p, 0, 0, 0.018); rb(0.2, 0.12, 0.008, 0.02, GLOW('#facc15'), p, -0.12, 0.07, 0.026); rb(0.2, 0.12, 0.008, 0.02, GLOW('#22d3ee'), p, 0.12, 0.07, 0.026); rb(0.44, 0.09, 0.008, 0.02, GLOW('#f9a8d4'), p, 0, -0.08, 0.026); rb(0.12, 0.012, 0.01, 0.005, '#94a3b8', p, 0, -0.2, 0.02); break; }
    case 'rhover': { const p = grp(g, 0, 0.12, 0); rb(1.0, 0.34, 0.07, 0.16, PM('#7c3aed', { shininess: 110 }), p, 0, 0.03, 0).rotation.x = Math.PI / 2; rb(0.86, 0.24, 0.02, 0.11, '#111827', p, 0, 0.07, 0).rotation.x = Math.PI / 2;
      [-0.32, 0.32].forEach((x) => { cy(0.1, 0.06, '#334155', p, x, -0.03, 0); cy(0.075, 0.02, GLOW('#22d3ee'), p, x, -0.065, 0); }); rb(0.8, 0.03, 0.03, 0.012, GLOW('#22d3ee'), p, 0, 0.035, 0.168); rb(0.8, 0.03, 0.03, 0.012, GLOW('#f472b6'), p, 0, 0.035, -0.168); ratBadge(p, 0.38, 0.085, 0, 1.2).rotation.x = -Math.PI / 2; break; }
    case 'rshield': { cy(0.2, 0.08, '#334155', g, 0, 0.04, 0); cy(0.15, 0.02, GLOW('#22d3ee'), g, 0, 0.09, 0); sm(SPH, PM('#7dd3fc', { transparent: true, opacity: 0.32, shininess: 140, specular: 0xffffff, depthWrite: false }), g, 0, 0.32, 0, 0.3, 0.3, 0.3); sm(TOR, GOLD(), g, 0, 0.09, 0, 0.2, 0.2, 0.25).rotation.x = Math.PI / 2; break; }
    case 'rscanner': { const p = grp(g, 0, 0.2, 0); rb(0.2, 0.36, 0.08, 0.04, '#f8fafc', p, 0, 0, 0); rb(0.16, 0.13, 0.01, 0.02, GLOW('#4ade80'), p, 0, 0.07, 0.042); sm(TOR, '#0d9488', p, 0, -0.08, 0.04, 0.045, 0.045, 0.04); sq(sp(0.035, GLOW('#f43f5e'), p, 0, -0.08, 0.042), 'z', 0.4); rb(0.08, 0.16, 0.05, 0.02, '#0d9488', p, 0, -0.24, 0); break; }
    case 'rsoda': { const c = new T.Mesh(canGeo(), PM('#ec4899', { shininess: 120 })); g.add(c); cy(0.122, 0.12, PM('#facc15', { shininess: 80 }), g, 0, 0.15, 0); cy(0.012, 0.18, '#f8fafc', g, 0.03, 0.38, 0).rotation.z = 0.2; ratBadge(g, 0, 0.15, 0.12, 0.9); break; }
    case 'rcheese': { cy(0.3, 0.03, PM('#f8fafc', { shininess: 90 }), g, 0, 0.015, 0); [[-0.1, -0.06], [0.1, -0.05], [0, 0.1], [0.02, 0.0, 1]].forEach((q, i) => { const c = rb(0.15, 0.15, 0.15, 0.045, PM('#fbbf24', { shininess: 35 }), g, q[0], q[2] ? 0.2 : 0.105, q[1]); c.rotation.y = i * 0.7; sq(sp(0.03, '#d97706', c, 0.03, 0.02, 0.075), 'z', 0.35); sq(sp(0.02, '#d97706', c, -0.04, -0.03, 0.075), 'z', 0.35); sq(sp(0.025, '#d97706', c, 0.0, 0.076, 0.02), 'y', 0.35); }); cy(0.006, 0.2, '#a16207', g, 0.02, 0.33, 0); break; }
    default: sp(0.2, '#a78bfa', g, 0, 0.2, 0);
  }
  return g;
};

/* ======================================================================
   Outfits on the avatar (wraps MD.avatar; the base model gives a long-sleeve top in tc)
   ====================================================================== */
const baseAvatar = MD.avatar;
function addTop(ch, L) {
  const b = ch.body, tc = L.tc, bc = L.bc, A = ch.arms;
  switch (L.top) {
    case 'labcoat': {
      rb(0.56, 0.6, 0.34, 0.07, tc, b, 0, 0.84, 0); rb(0.2, 0.5, 0.02, 0.02, bc, b, 0, 0.88, 0.17);
      [-1, 1].forEach((s) => { const f = rb(0.27, 0.36, 0.3, 0.06, tc, b, s * 0.15, 0.42, 0.01); f.rotation.z = s * 0.05; });
      rb(0.12, 0.1, 0.02, 0.02, '#e0e7ff', b, -0.15, 0.95, 0.178); [0, 1].forEach((i) => cy(0.012, 0.09, ['#f43f5e', '#3b82f6'][i], b, -0.17 + i * 0.03, 1.0, 0.18)); ratBadge(b, 0.15, 0.98, 0.18, 0.75);
      sm(TOR, PM(bc), b, 0, 1.12, 0, 0.17, 0.17, 0.24).rotation.x = Math.PI / 2; A.forEach((a) => rb(0.17, 0.08, 0.19, 0.03, bc, a, 0, -0.4, 0)); break; }
    case 'captain': {
      rb(0.56, 0.56, 0.34, 0.07, tc, b, 0, 0.86, 0); rb(0.58, 0.08, 0.36, 0.035, '#1f2937', b, 0, 0.66, 0); rb(0.11, 0.09, 0.03, 0.02, GOLD(), b, 0, 0.66, 0.185);
      for (let i = 0; i < 3; i++) [-1, 1].forEach((s) => sp(0.022, GOLD(), b, s * 0.09, 0.78 + i * 0.1, 0.175));
      for (let i = 0; i < 4; i++) sp(0.045 - i * 0.006, '#f8fafc', b, 0, 1.06 - i * 0.06, 0.18);
      [-1, 1].forEach((s) => { const e = sm(HEMI, GOLD(), b, s * 0.31, 1.12, 0, 0.13, 0.06, 0.15); void e; for (let i = 0; i < 5; i++) cy(0.008, 0.07, GOLD(), b, s * 0.31 + (i - 2) * 0.022 * s, 1.08, 0.08 - i * 0.04); });
      A.forEach((a) => rb(0.17, 0.09, 0.19, 0.03, '#facc15', a, 0, -0.38, 0)); rb(0.5, 0.36, 0.06, 0.04, tc, b, 0, 0.5, -0.17); break; }
    case 'frost': {
      for (let i = 0; i < 4; i++) { const r = sm(TOR, PM(tc, { shininess: 25 }), b, 0, 0.66 + i * 0.13, 0, 0.27, 0.19, 0.39); r.rotation.x = Math.PI / 2; r.scale.set(0.27, 0.17, 0.39); }
      rb(0.5, 0.5, 0.3, 0.12, PM(tc, { shininess: 25 }), b, 0, 0.86, 0);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; sp(0.075, PM('#ffffff', { shininess: 5 }), b, Math.cos(a) * 0.22, 1.13, Math.sin(a) * 0.16); }
      cy(0.012, 0.42, PM(bc), b, 0, 0.86, 0.19); A.forEach((a) => { for (let i = 0; i < 3; i++) sp(0.095, PM(tc, { shininess: 25 }), a, 0, -0.06 - i * 0.13, 0); sm(TOR, PM('#ffffff', { shininess: 5 }), a, 0, -0.4, 0, 0.08, 0.08, 0.1).rotation.x = Math.PI / 2; }); break; }
    case 'ceo': {
      rb(0.56, 0.56, 0.34, 0.07, tc, b, 0, 0.86, 0); rb(0.18, 0.4, 0.02, 0.03, '#f8fafc', b, 0, 0.93, 0.172);
      [-1, 1].forEach((s) => { const l = rb(0.08, 0.3, 0.02, 0.02, PM(tc, { shininess: 90 }), b, s * 0.11, 0.98, 0.18); l.rotation.z = s * 0.35; });
      const tie = grp(b, 0, 0.92, 0.185); const w = new T.Mesh(wedgeGeo(), GOLD()); w.scale.set(0.28, 0.9, 0.12); w.rotation.z = -Math.PI / 2 - 0.05; tie.add(w); sp(0.03, GOLD(), tie, 0, 0.13, 0);
      ratBadge(b, -0.17, 1.0, 0.185, 0.7); A.forEach((a, i) => { rb(0.16, 0.06, 0.18, 0.025, '#f8fafc', a, 0, -0.41, 0); if (i) cy(0.07, 0.04, GOLD(), a, 0, -0.38, 0); }); break; }
    case 'mecha': {
      const steel = PM(tc, { shininess: 130, specular: 0xaaaaaa });
      rb(0.58, 0.56, 0.36, 0.1, steel, b, 0, 0.86, 0); rb(0.4, 0.3, 0.04, 0.06, PM('#475569', { shininess: 90 }), b, 0, 0.92, 0.17);
      sp(0.075, GLOW('#22d3ee'), b, 0, 0.92, 0.2); sm(TOR, steel, b, 0, 0.92, 0.19, 0.085, 0.085, 0.08);
      [-1, 1].forEach((s) => { sm(HEMI, steel, b, s * 0.33, 1.1, 0, 0.17, 0.12, 0.18); rb(0.06, 0.04, 0.02, 0.01, GLOW('#22d3ee'), b, s * 0.15, 0.72, 0.18); });
      rb(0.6, 0.08, 0.38, 0.035, '#334155', b, 0, 0.62, 0); A.forEach((a) => { cy(0.09, 0.2, steel, a, 0, -0.32, 0); cy(0.093, 0.025, GLOW('#22d3ee'), a, 0, -0.27, 0); }); break; }
    default: return false;
  }
  return true;
}
function addHat(h, hat, col) {
  switch (hat) {
    case 'ratears': { const c = col || '#9ca3af'; sm(HTOR, PM('#7c3aed'), h, 0, 0.05, 0.02, 0.32, 0.33, 0.14);
      [-1, 1].forEach((s) => { const e = sp(0.16, PM(c, { shininess: 20 }), h, s * 0.24, 0.38, -0.02); e.scale.set(0.16, 0.16, 0.06); const i2 = sp(0.11, PM('#f9a8d4', { shininess: 20 }), h, s * 0.24, 0.38, 0.01); i2.scale.set(0.11, 0.11, 0.04); }); return true; }
    case 'tricorn': { const c = '#1f2937'; sm(HEMI, c, h, 0, 0.2, -0.02, 0.32, 0.2, 0.32); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + Math.PI / 2; const br = rb(0.5, 0.06, 0.16, 0.03, c, h, Math.cos(a) * 0.2, 0.25, Math.sin(a) * 0.2); br.rotation.y = -a + Math.PI / 2; br.rotation.x = -0.45; }
      sm(TOR, GOLD(), h, 0, 0.22, -0.02, 0.32, 0.32, 0.1).rotation.x = Math.PI / 2; const ch = new T.Mesh(wedgeGeo(), PM('#fbbf24')); ch.scale.setScalar(0.32); ch.position.set(0, 0.32, 0.3); h.add(ch); [-1, 1].forEach((s) => { const bn = cy(0.012, 0.16, '#f8fafc', h, 0, 0.32, 0.33); bn.rotation.z = s * 0.8; }); return true; }
    case 'earmuffs': { const c = col || '#f472b6'; sm(HTOR, PM('#e5e7eb'), h, 0, 0.0, 0, 0.33, 0.34, 0.12); [-1, 1].forEach((s) => { sq(sp(0.12, PM(c, { shininess: 5 }), h, s * 0.31, -0.02, 0), 'x', 0.7); }); return true; }
    case 'tophat': { cy(0.36, 0.03, '#111827', h, 0, 0.24, 0); cy(0.24, 0.36, PM('#111827', { shininess: 80 }), h, 0, 0.42, 0); cy(0.245, 0.07, PM('#7c3aed'), h, 0, 0.29, 0); ratBadge(h, 0, 0.3, 0.25, 0.8); return true; }
    case 'robohelm': { const steel = PM('#cbd5e1', { shininess: 130, specular: 0xaaaaaa }); sm(HEMI, steel, h, 0, 0.05, -0.02, 0.36, 0.38, 0.36); rb(0.42, 0.12, 0.04, 0.05, PM('#0f172a', { shininess: 140, specular: 0x6688aa }), h, 0, 0.08, 0.31);
      [-1, 1].forEach((s) => { sq(sp(0.12, steel, h, s * 0.26, 0.38, -0.04), 'z', 0.05); sq(sp(0.07, GLOW('#22d3ee'), h, s * 0.26, 0.38, -0.03), 'z', 0.04); }); cy(0.012, 0.18, '#475569', h, 0.12, 0.48, -0.05); sp(0.035, GLOW('#f43f5e'), h, 0.12, 0.58, -0.05); return true; }
    default: return false;
  }
}
function addGlasses(h, gl) {
  if (gl === 'goggles') { [-1, 1].forEach((s) => { sm(TOR, PM('#7c3aed'), h, s * 0.1, 0.03, 0.29, 0.07, 0.07, 0.1); sq(sp(0.06, PM('#a5f3fc', { transparent: true, opacity: 0.6, shininess: 140 }), h, s * 0.1, 0.03, 0.29), 'z', 0.25); }); const st = sm(TOR, PM('#7c3aed'), h, 0, 0.03, 0, 0.31, 0.31, 0.07); st.rotation.x = Math.PI / 2; return true; }
  if (gl === 'patch') { sq(sp(0.06, '#111827', h, 0.1, 0.02, 0.285), 'z', 0.25); const st = sm(TOR, PM('#111827'), h, 0, 0.06, 0, 0.31, 0.31, 0.04); st.rotation.x = Math.PI / 2; st.rotation.z = -0.25; return true; }
  return false;
}
let BUBM = null;
function bubbleMat() { if (!BUBM) BUBM = new T.MeshPhongMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.22, shininess: 160, specular: 0xffffff, depthWrite: false, side: T.DoubleSide }); return BUBM; }
MD.avatar = function (L) {
  L = L || {};
  const isDT = GL.TOPS[L.top] && GL.TOPS[L.top].dlc, isDH = GL.HATS[L.hat] && GL.HATS[L.hat].dlc, isDG = GL.GLASSES[L.gl] && GL.GLASSES[L.gl].dlc;
  const ch = baseAvatar(Object.assign({}, L, isDH ? { hat: 'none' } : {}, isDG ? { gl: 'none' } : {}));
  if (isDT) addTop(ch, Object.assign({ tc: '#ff4fd8', bc: '#334155' }, L));
  if (isDH) addHat(ch.head, L.hat, L.hatc);
  if (isDG) addGlasses(ch.head, L.gl);
  if (L.hb) { const bd = MD.glpItem('rhover'); bd.position.set(0, -0.06, 0); bd.rotation.y = Math.PI / 2; ch.g.add(bd); ch.board = bd; }
  if (L.bub) { const bb = sm(SPH, bubbleMat(), ch.g, 0, 1.05, 0, 0.95, 1.15, 0.95); bb.renderOrder = 5; ch.bubble = bb; }
  if (L.hb) {
    const a0 = ch.anim;
    ch.anim = function (dt, s, wave, act) {
      a0(dt, s, wave, act); const posed = !!ch.posed;
      if (ch.board) ch.board.visible = !posed;
      if (!posed) { ch.hbT = (ch.hbT || 0) + dt; ch.body.position.y = 0.24 + Math.sin(ch.hbT * 3) * 0.025; ch.legs.forEach((l) => { l.rotation.x = 0; }); ch.body.rotation.z = Math.sin(ch.hbT * 2) * 0.04; if (ch.board) { ch.board.position.y = 0.12 + Math.sin(ch.hbT * 3) * 0.025; ch.board.rotation.z = (s > 0.5 ? 0.06 : 0); } }
    };
  }
  return ch;
};

/* ======================================================================
   The Ratita Industries Gadget Shop (building + interior)
   ====================================================================== */
const BLD = { id: 'ratita', name: 'Ratita Industries Gadgets', icon: '\uD83D\uDC00', x0: 53.5, x1: 62, z0: 32, z1: 43, door: 's', col: '#ede9fe', roof: '#7c3aed', sign: 'RATITA INDUSTRIES', open: [8, 22] };
W.BLD.push(BLD);
let shop = null; // interior refs (displays + rats)
function buildExterior() {
  const A = W.areas.town, g = A.g, b = W.bld('ratita'); if (!b || b.cx == null) return;
  // roof logo: a big smooth rat head with ears + a cheese wedge
  const lg = grp(g, b.cx - 1.6, (b.h || 5) + 0.45, b.cz + 1.5); lg.userData.dyn = true;
  sp(0.9, PM('#9ca3af', { shininess: 40 }), lg, 0, 0.8, 0).scale.set(0.9, 0.8, 0.75); [-1, 1].forEach((s) => { sq(sp(0.5, PM('#9ca3af', { shininess: 40 }), lg, s * 0.75, 1.5, 0), 'z', 0.25); sq(sp(0.34, PM('#f9a8d4'), lg, s * 0.75, 1.5, 0.08), 'z', 0.2); sp(0.1, '#111827', lg, s * 0.3, 0.95, 0.62); });
  sp(0.12, '#ec4899', lg, 0, 0.6, 0.72); for (let i = 0; i < 3; i++) [-1, 1].forEach((s) => { const wk = cy(0.012, 0.6, '#f8fafc', lg, s * 0.4, 0.58 - i * 0.07, 0.66); wk.rotation.z = Math.PI / 2 + s * (i - 1) * 0.15; });
  const ch = new T.Mesh(wedgeGeo(), PM('#fbbf24', { shininess: 40 })); ch.scale.setScalar(3.6); ch.position.set(b.cx + 2.2, (b.h || 5) + 0.62, b.cz + 1.5); ch.rotation.y = -0.4; ch.userData.dyn = true; g.add(ch); [[0.0, 0.0, 0.32], [-0.35, -0.12, 0.32], [-0.5, 0.2, 0.32]].forEach((q) => { const hl = sp(0.11, '#d97706', ch, q[0] / 3.6 * 3.6 * 0.28, q[1] * 0.28, 0.105); hl.scale.set(0.035, 0.035, 0.012); });
  // neon trim + welcome mat + a planter of sunflowers for Torty
  const trim = rb(b.w + 0.2, 0.12, 0.08, 0.04, GLOW('#22d3ee'), g, b.cx, (b.h || 5) - 0.05, b.z1 + 0.3); trim.userData.dyn = true;
  { const pl = grp(g, b.x0 + 1.4, 0, b.z1 + 0.9); rb(1.6, 0.5, 0.7, 0.12, '#a16207', pl, 0, 0.25, 0); for (let i = 0; i < 3; i++) { cy(0.03, 0.9, '#16a34a', pl, -0.5 + i * 0.5, 0.9, 0); sq(sp(0.16, '#facc15', pl, -0.5 + i * 0.5, 1.38, 0.05), 'z', 0.4); sq(sp(0.07, '#78350f', pl, -0.5 + i * 0.5, 1.38, 0.1), 'z', 0.4); } W.obsB(A, b.x0 + 0.5, b.x0 + 2.3, b.z1 + 0.5, b.z1 + 1.3); }
}
function tilesTex() { const t = W.canvasTex(128, 128, (c) => { c.fillStyle = '#ede9fe'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#ddd6fe'; c.fillRect(0, 0, 64, 64); c.fillRect(64, 64, 64, 64); c.fillStyle = 'rgba(34,211,238,.35)'; c.fillRect(0, 62, 128, 4); c.fillRect(62, 0, 4, 128); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(10, 6); return t; }
function buildInterior() {
  const A = W.room('ratita', 20, 12, tilesTex(), '#e0e7ff', { cam: { h: 11.5, d: 11 } }); A.label = 'Ratita Industries'; A.exitTo = BLD.out;
  const g = A.g, dynG = grp(g); dynG.userData.dyn = true; shop = { A, disp: [], rats: [], torty: null, t: 0 };
  // back wall: neon + logo + banner
  rb(19.6, 0.14, 0.1, 0.05, GLOW('#22d3ee'), g, 0, 3.0, -5.9); rb(19.6, 0.1, 0.1, 0.04, GLOW('#f472b6'), g, 0, 0.35, -5.9);
  const ban = W.signPlane('RATITA INDUSTRIES \u00b7 GADGET SHOP', 7.5, 0.8, '#7c3aed'); ban.position.set(0, 2.55, -5.82); g.add(ban);
  { const lg = grp(g, 0, 1.75, -5.8); sp(0.42, PM('#9ca3af', { shininess: 40 }), lg, 0, 0, 0).scale.set(0.42, 0.36, 0.12); [-1, 1].forEach((s) => { sq(sp(0.22, PM('#9ca3af'), lg, s * 0.34, 0.32, 0), 'z', 0.08); sq(sp(0.14, PM('#f9a8d4'), lg, s * 0.34, 0.32, 0.03), 'z', 0.05); sp(0.05, '#111827', lg, s * 0.13, 0.05, 0.1); }); sp(0.06, '#ec4899', lg, 0, -0.08, 0.13); }
  // counter (rounded) with the three Ratitas on top
  rb(5.2, 1.05, 1.1, 0.14, PM('#7c3aed', { shininess: 70 }), g, 0, 0.53, -4.1); rb(5.4, 0.1, 1.3, 0.05, PM('#f8fafc', { shininess: 90 }), g, 0, 1.1, -4.1); rb(5.0, 0.08, 0.04, 0.02, GLOW('#22d3ee'), g, 0, 0.75, -3.53); W.obsB(A, -2.7, 2.7, -4.8, -3.45);
  rb(0.6, 0.4, 0.45, 0.06, '#1f2937', g, 1.7, 1.35, -4.2); rb(0.5, 0.28, 0.02, 0.03, GLOW('#4ade80'), g, 1.7, 1.38, -3.97);
  [['luna', -0.6], ['pirat', -1.7], ['snowie', 0.5]].forEach((q) => { const f = GL.familyById(q[0]); const P = MD.pet({ sp: f.sp, col: f.col, eye: f.eye, oneEye: f.oneEye, acc: f.acc || {}, lv: 7 }); P.g.position.set(q[1], 1.15, -4.15); P.g.rotation.y = 0; P.g.scale.multiplyScalar(1.6); dynG.add(P.g); shop.rats.push(P); });
  W.hot(A, { id: 'glpShop', kind: 'glpShop', x: -0.6, z: -2.75, reach: 1.9, name: 'Luna (Gadget Counter)', label: 'SHOP' });
  W.hot(A, { id: 'glpPirat', kind: 'glpRat', rat: 'pirat', x: -2.2, z: -2.85, reach: 0.9, name: 'Pi-rat', label: 'TALK' });
  W.hot(A, { id: 'glpSnowie', kind: 'glpRat', rat: 'snowie', x: 1.0, z: -2.85, reach: 0.9, name: 'Snowie', label: 'TALK' });
  // gadget pedestals (2 columns on the right): glass domes with slowly turning gadgets
  const cols = [5.0, 8.3], rows = [-3.4, -1.2, 1.0, 3.2];
  GLP.ITEM_ORDER.forEach((id, i) => {
    const x = cols[i % 2], z = rows[Math.floor(i / 2)];
    cy(0.48, 0.9, PM('#f8fafc', { shininess: 80 }), g, x, 0.45, z); cy(0.5, 0.06, GLOW(['#22d3ee', '#f472b6'][i % 2]), g, x, 0.92, z); W.obsC(A, x, z, 0.55);
    const dome = sm(SPH, PM('#e0f2fe', { transparent: true, opacity: 0.18, shininess: 160, specular: 0xffffff, depthWrite: false }), dynG, x, 0.95, z, 0.45, 0.6, 0.45); dome.renderOrder = 4;
    const it = MD.glpItem(id); const s = id === 'rhover' ? 0.62 : id === 'rtablet' ? 0.95 : 1.15; it.scale.setScalar(s); it.position.set(x, 0.98 + (id === 'rhover' ? 0.15 : 0), z); dynG.add(it); shop.disp.push(it);
    const lb = W.textSprite(GL.ITEMS[id].icon + ' ' + GL.ITEMS[id].name, { size: 30, h: 0.3, bg: 'rgba(124,58,237,.9)' }); lb.position.set(x, 1.85, z); g.add(lb);
    W.hot(A, { id: 'glpI_' + id, kind: 'glpItem', item: id, x: x - 0.95, z, reach: 0.95, name: GL.ITEMS[id].name, label: 'LOOK' });
  });
  // outfit runway on the left: 5 mannequins in the new outfits
  rb(1.8, 0.24, 10.2, 0.08, PM('#c4b5fd', { shininess: 50 }), g, -8.6, 0.12, -0.5); rb(0.06, 0.05, 10.2, 0.02, GLOW('#f472b6'), g, -7.68, 0.22, -0.5); W.obsB(A, -10, -7.6, -5.6, 4.6);
  GLP.OUTFITS.forEach((o, i) => {
    const z = -4.4 + i * 1.95, mk = baseAvatarLook(o, i); mk.g.position.set(-8.6, 0.24, z); mk.g.rotation.y = Math.PI / 2; mk.anim(0.01, 0, false, null); g.add(mk.g);
    const lb = W.textSprite(o.icon + ' ' + o.name, { size: 28, h: 0.28, bg: 'rgba(236,72,153,.9)' }); lb.position.set(-8.4, 2.45, z); g.add(lb);
    W.hot(A, { id: 'glpO_' + o.id, kind: 'glpOutfit', outfit: o.id, x: -7.0, z, reach: 0.95, name: o.name, label: 'TRY ON' });
  });
  // Torty's sunny window nook (she's the Head Snack Tester)
  { const nx = -3.6, nz = 3.6; cy(0.95, 0.14, PM('#fde68a', { shininess: 10 }), g, nx, 0.07, nz); const lamp = grp(g, nx + 1.1, 0, nz - 0.4); cy(0.04, 2.2, '#334155', lamp, 0, 1.1, 0); const sh = sm(HEMI, PM('#f59e0b'), lamp, -0.4, 2.15, 0.2, 0.28, 0.2, 0.28); sh.rotation.x = Math.PI; sp(0.1, GLOW('#fde047'), lamp, -0.4, 2.1, 0.2); W.obsC(A, nx + 1.1, nz - 0.4, 0.2);
    const bowl = grp(g, nx - 0.75, 0.14, nz + 0.2); sm(HEMI, PM('#38bdf8'), bowl, 0, 0.12, 0, 0.2, 0.12, 0.2).rotation.x = Math.PI; for (let i = 0; i < 5; i++) sp(0.05, ['#22c55e', '#f97316', '#facc15'][i % 3], bowl, Math.cos(i) * 0.09, 0.13, Math.sin(i) * 0.09);
    const f = GL.familyById('martina'); const P = MD.pet({ sp: f.sp, col: f.col, acc: f.acc || {}, lv: 7 }); P.g.position.set(nx, 0.14, nz); P.g.rotation.y = 0.6; dynG.add(P.g); shop.torty = P; W.obsC(A, nx, nz, 0.75);
    const lb = W.textSprite('\uD83D\uDC22 Torty \u00b7 Head Snack Tester', { size: 28, h: 0.3, bg: 'rgba(22,163,74,.92)' }); lb.position.set(nx, 1.5, nz); g.add(lb);
    W.hot(A, { id: 'glpTorty', kind: 'glpTorty', x: nx + 0.6, z: nz - 1.1, reach: 1.2, name: 'Martina (\u201CTorty\u201D)', label: 'TALK' }); }
  // cheese stools + a vending fridge of Squeak Soda
  [[-1.2, 1.4], [0.6, 1.9], [2.2, 1.2]].forEach((q) => { cy(0.42, 0.5, PM('#fbbf24', { shininess: 30 }), g, q[0], 0.25, q[1]); for (let i = 0; i < 5; i++) { const a = i * 1.3 + q[0]; sp(0.07, '#d97706', g, q[0] + Math.cos(a) * 0.41, 0.15 + (i % 3) * 0.14, q[1] + Math.sin(a) * 0.41).scale.set(0.07, 0.07, 0.07); } sq(sp(0.09, '#d97706', g, q[0] + 0.12, 0.5, q[1] - 0.1), 'y', 0.2); W.obsC(A, q[0], q[1], 0.45); });
  { const vf = grp(g, 3.2, 0, -5.3); rb(1.2, 2.2, 0.8, 0.12, PM('#ec4899', { shininess: 80 }), vf, 0, 1.1, 0); rb(0.9, 1.5, 0.04, 0.06, PM('#a5f3fc', { transparent: true, opacity: 0.55, shininess: 140 }), vf, 0, 1.25, 0.41); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const cn = new T.Mesh(canGeo(), PM(['#ec4899', '#facc15', '#22d3ee'][c], { shininess: 120 })); cn.scale.setScalar(0.9); cn.position.set(-0.28 + c * 0.28, 0.62 + r * 0.45, 0.2); vf.add(cn); } W.obsB(A, 2.55, 3.85, -5.75, -4.85);
    W.hot(A, { id: 'glpSoda', kind: 'glpItem', item: 'rsoda', x: 3.2, z: -4.3, reach: 0.9, name: 'Squeak Soda Fridge', label: 'LOOK' }); }
  W.bake(g);
  return A;
}
function baseAvatarLook(o, i) { return MD.avatar(Object.assign({ skin: GL.SKINS[[1, 5, 0, 3, 6][i] || 1], hair: ['bun', 'spiky', 'long', 'short', 'buzz'][i] || 'short', hc: ['#1b1210', '#a0622d', '#e5e7eb', '#3b2414', '#1b1210'][i], sc: '#1f2937' }, o.look)); }
const build0 = W.build;
W.build = function () { build0(); try { buildExterior(); buildInterior(); } catch (e) { console.warn('Good Life Pack build', e); } };

/* ======================================================================
   Icons for the shop (rendered from the 3D models)
   ====================================================================== */
let IR = null; const icache = {};
function iconOf(key, makeObj, opts) {
  if (icache[key]) return icache[key]; const IW = (opts && opts.w) || 160, IH = (opts && opts.h) || 160;
  if (IR === null) { try { const cv = document.createElement('canvas'); cv.width = cv.height = 160; const r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setClearColor(0x000000, 0); const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0x8a7aa0, 0.95)); const d = new T.DirectionalLight(0xffffff, 0.7); d.position.set(2, 4, 5); sc.add(d); IR = { r, sc, cam: new T.PerspectiveCamera(28, 1, 0.02, 60), cv }; } catch (e) { IR = false; } }
  if (!IR) return '';
  IR.r.setSize(IW, IH, false); IR.cam.aspect = IW / IH; IR.cam.updateProjectionMatrix();
  const o = makeObj(); o.rotation.y = (opts && opts.ry) != null ? opts.ry : 0.5; IR.sc.add(o); o.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(o), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), R = Math.max(sz.x, sz.y, sz.z) * 0.6;
  const dist = R / Math.tan(14 * Math.PI / 180) * 1.05 * (IW < IH ? 0.8 : 1); IR.cam.position.set(c.x + dist * 0.15, c.y + dist * ((opts && opts.up) != null ? opts.up : 0.3), c.z + dist); IR.cam.lookAt(c);
  IR.r.render(IR.sc, IR.cam); IR.sc.remove(o); let url = ''; try { url = IR.cv.toDataURL('image/png'); } catch (e) { /* */ } icache[key] = url; return url;
}
GLP.itemIcon = (id) => iconOf('i_' + id, () => MD.glpItem(id), { ry: id === 'rhover' ? 0.6 : 0.45 });
GLP.outfitIcon = (oid) => { const i = GLP.OUTFITS.findIndex((o) => o.id === oid); return iconOf('o_' + oid, () => baseAvatarLook(GLP.OUTFITS[i], i).g, { ry: 0.35, up: 0.12, w: 120, h: 168 }); };

/* ======================================================================
   Shop panels
   ====================================================================== */
const LINES = {
  luna: ['Welcome to Ratita Industries! Everything here is tested. Mostly by Pi-rat. \uD83D\uDD2C', 'Squeak! Every gadget really works. I checked the math twice.', 'Torty taste-tests all our snacks. She says the Cheese Bites need more lettuce.'],
  pirat: ['Arr! The Fix-It Hammer fixed me ship AND me car. Ye need one, matey! \uD83C\uDFF4\u200D\u2620\uFE0F', 'One eye, zero problems. Want to try on the Captain Coat?', 'I tested the Hover-Board. Into a wall. Twice. It works great now!'],
  snowie: ['The Bubble Shield keeps me fur snowy white in the rain. \u2744\uFE0F', 'Hi hi! The Frost Suit is SO puffy. Like a cloud!', 'I helped build the RatPhone 5. The ears are my idea. \uD83D\uDC97'],
  torty: ['Torty munches a lettuce leaf. Slowly. Very slowly. \uD83E\uDD6C', 'Martina (everyone here calls her Torty) gives the Cheese Bites a sniff\u2026 and goes back to her veggies.', 'Torty blinks at you in the warm lamp light. That means \u201Chello.\u201D \uD83D\uDC22', 'Torty is the Head Snack Tester. Her review of Squeak Soda: one slow nod.']
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function lockedPanel() {
  open('glp', head('\uD83D\uDC00 Ratita Industries') + '<div class="glpHero"><img src="' + GLP.itemIcon('ratphone') + '" alt=""><img src="' + GLP.itemIcon('rhammer') + '" alt=""><img src="' + GLP.itemIcon('rhover') + '" alt=""></div>' +
    '<p class="sub">Luna: \u201CSqueak! The gadget shop is part of the <b>Good Life Pack</b>. Hammers, tablets, phones, a hover-board, outfits and more!\u201D</p>' +
    '<p class="sub small">\uD83D\uDD12 Unlock the <b>Good Life Pack</b> (Mini Pack, 25 tickets) at the DLC Machine 3000 in the Grok Arcade\u2019s Hall of Game Records. Playing with a friend who has it? Join their town and you can shop here too!</p>' +
    '<div class="btnrow">' + btn('close', null, 'OK', 'alt') + '<a class="btn primary" href="' + esc(GN.hubUrl()) + '">\uD83D\uDD79\uFE0F GROK ARCADE</a></div>');
}
GLP.shop = function (tab, focus) {
  if (!GLP.owned()) { lockedPanel(); return; }
  const s = sv(); tab = tab || 'gadgets'; GLP._tab = tab;
  let h = head('\uD83D\uDC00 Ratita Industries') + '<p class="sub small">' + money(s.money) + ' \u00b7 ' + esc(pick(LINES.luna)) + '</p><div class="tabs">' + [['gadgets', '\uD83D\uDD27 GADGETS'], ['outfits', '\uD83D\uDC54 OUTFITS']].map((q) => '<button class="tab' + (tab === q[0] ? ' on' : '') + '" data-a="glpTab" data-v="' + q[0] + '">' + q[1] + '</button>').join('') + '</div>';
  if (tab === 'gadgets') {
    h += '<div class="grid glpGrid">' + GLP.ITEM_ORDER.map((k) => { const it = GL.ITEMS[k], own = it.tool && has(k); return '<button class="item' + (focus === k ? ' glpFocus' : '') + '" data-a="glpView" data-v="' + k + '"><img src="' + GLP.itemIcon(k) + '" alt=""><b>' + esc(it.name) + '</b><small>' + (own ? 'OWNED \u2714' : money(it.price)) + (!it.tool && s.bag[k] ? ' \u00b7 have ' + s.bag[k] : '') + '</small></button>'; }).join('') + '</div>';
  } else {
    h += '<p class="sub small">All 5 outfits are FREE with the Good Life Pack. They also show up in your wardrobe and at Coco\u2019s Boutique.</p><div class="grid glpGrid">' + GLP.OUTFITS.map((o) => '<button class="item' + (focus === o.id ? ' glpFocus' : '') + '" data-a="glpOutfit" data-v="' + o.id + '"><img class="tall" src="' + GLP.outfitIcon(o.id) + '" alt=""><b>' + esc(o.name) + '</b><small>' + (wearing(o) ? 'WEARING \u2714' : 'TRY ON') + '</small></button>').join('') + '</div>';
  }
  open('glp', h);
};
function wearing(o) { const L = sv().look; return L.top === o.look.top && L.hat === o.look.hat; }
H.glpTab = (v) => GLP.shop(v);
H.glpView = (k) => {
  const it = GL.ITEMS[k], s = sv(); if (!it || it.where !== 'ratita') return;
  if (!GLP.owned()) { lockedPanel(); return; }
  const own = it.tool && has(k);
  open('glp', head(it.icon + ' ' + esc(it.name)) + '<div class="glpBig"><img src="' + GLP.itemIcon(k) + '" alt=""></div><p class="sub">' + esc(it.desc) + '</p>' + (USE_HELP[k] ? '<p class="sub small">' + USE_HELP[k] + '</p>' : '') +
    '<div class="btnrow">' + btn('glpTab', 'gadgets', '\u2190 BACK', 'alt small') + (own ? '<span class="sub">OWNED \u2714</span>' : btn('glpBuy', k, 'BUY ' + money(it.price), 'primary', s.money < it.price)) + '</div><p class="sub small">' + money(s.money) + ' on hand</p>');
};
const USE_HELP = {
  rhammer: 'How to use: phone \u2192 \uD83C\uDF92 Bag \u2192 FIX CAR next to your car. Broken down? Stand next to it and press \uD83D\uDD28 FIX.',
  ratphone: 'How to use: phone \u2192 \uD83D\uDC00 Ratita app.',
  rtablet: 'How to use: phone \u2192 \uD83C\uDF92 Bag (or the \uD83D\uDC00 Ratita app) \u2192 WORK.',
  rhover: 'How to use: phone \u2192 \uD83C\uDF92 Bag \u2192 RIDE. Tap again to step off.',
  rshield: 'Works by itself whenever it rains, snows or hails. You can switch it off in your Bag.',
  rscanner: 'How to use: phone \u2192 \uD83C\uDF92 Bag \u2192 SCAN (once a day).'
};
H.glpBuy = (k) => {
  const it = GL.ITEMS[k], s = sv(); if (!it || it.where !== 'ratita' || !GLP.owned()) return;
  if (it.tool && has(k)) return;
  if (!G.spend(it.price)) return;
  s.bag[k] = (s.bag[k] || 0) + 1; G.tutNext && G.tutNext(4); s.stats.glpBuys = (s.stats.glpBuys || 0) + 1;
  Snd.fx('cash'); G.toast('\u2714 ' + it.icon + ' ' + it.name + ' added to your bag! ' + (it.tool ? 'Squeak!' : ''));
  if (k === 'ratphone') G.toast('\uD83D\uDC00 New app on your phone: Ratita!'); if (k === 'rhover') G.toast('\uD83D\uDEF9 Phone \u2192 Bag \u2192 RIDE to hop on!');
  G.persist(); H.glpView(k);
};
H.glpOutfit = (oid) => {
  const o = GLP.OUTFITS.find((q) => q.id === oid); if (!o) return; if (!GLP.owned()) { lockedPanel(); return; }
  const w = wearing(o);
  open('glp', head(o.icon + ' ' + esc(o.name)) + '<div class="glpBig"><img class="tall" src="' + GLP.outfitIcon(o.id) + '" alt=""></div><p class="sub">' + esc(o.blurb) + '</p><p class="sub small">FREE with the Good Life Pack. Change colours any time at your wardrobe.</p>' +
    '<div class="btnrow">' + btn('glpTab', 'outfits', '\u2190 BACK', 'alt small') + (w ? btn('glpUnwear', null, 'TAKE OFF', 'small') : btn('glpWear', o.id, 'WEAR IT!', 'primary')) + '</div>');
};
H.glpWear = (oid) => {
  const o = GLP.OUTFITS.find((q) => q.id === oid); if (!o || !GLP.owned()) return; const s = sv();
  if (!gs().prevLook && !GLP.OUTFITS.some(wearing)) gs().prevLook = { top: s.look.top, tc: s.look.tc, bc: s.look.bc, hat: s.look.hat, hatc: s.look.hatc, gl: s.look.gl };
  Object.assign(s.look, o.look); s.stats.glpWear = (s.stats.glpWear || 0) + 1; G.persist(); if (G.syncMe) G.syncMe(); Snd.fx('sparkle'); W.fx('sparkle', GS.me.x, 1.6, GS.me.z, 10, 0.8);
  G.toast(o.icon + ' ' + (o.id === 'pirat' ? 'Arr! Lookin\u2019 sharp, Captain!' : o.id === 'robo' ? 'BEEP BOOP. Looking awesome.' : 'Squeak! You look amazing!')); H.glpOutfit(oid);
};
H.glpUnwear = () => { const s = sv(), p = gs().prevLook || { top: 'tee', hat: 'none', gl: 'none' }; Object.assign(s.look, p); if (!s.look.hatc) delete s.look.hatc; gs().prevLook = null; G.persist(); if (G.syncMe) G.syncMe(); GLP.shop('outfits'); };
G.hooks.kinds.glpShop = () => { Snd.fx('squeak'); GLP.shop('gadgets'); };
G.hooks.kinds.glpItem = (h) => { if (!GLP.owned()) { lockedPanel(); return; } H.glpView(h.item); };
G.hooks.kinds.glpOutfit = (h) => { if (!GLP.owned()) { lockedPanel(); return; } H.glpOutfit(h.outfit); };
G.hooks.kinds.glpRat = (h) => { Snd.fx('squeak'); const f = GL.familyById(h.rat); G.toast((h.rat === 'pirat' ? '\uD83C\uDFF4\u200D\u2620\uFE0F ' : '\u2744\uFE0F ') + f.name + ': \u201C' + pick(LINES[h.rat]) + '\u201D'); G.need('s', 4); const P = shop && shop.rats.find((r) => r.look && r.look.oneEye === f.oneEye && r.look.col[0] === f.col[0]); if (P) P.play('jump', 0.8); };
G.hooks.kinds.glpTorty = () => { Snd.fx('chirp'); G.toast(pick(LINES.torty)); G.need('s', 5); G.need('f', 3); if (shop && shop.torty) { shop.torty.play('happy', 1.2); W.fx('heart', shop.torty.g.position.x, 1.2, shop.torty.g.position.z, 3, 0.4); } };

/* ======================================================================
   Using the items
   ====================================================================== */
GLP.bagBtn = function (k) {
  const g = gs();
  switch (k) {
    case 'rhammer': return btn('glpUse', k, 'FIX CAR', 'small green');
    case 'ratphone': return btn('glpUse', k, 'OPEN', 'small green');
    case 'rtablet': return btn('glpUse', k, 'WORK', 'small green');
    case 'rhover': return btn('glpUse', k, g.hover ? 'STEP OFF' : 'RIDE', 'small ' + (g.hover ? 'blue' : 'green'));
    case 'rshield': return btn('glpUse', k, g.shield !== false ? 'AUTO: ON' : 'AUTO: OFF', 'small ' + (g.shield !== false ? 'green' : 'alt'));
    case 'rscanner': return btn('glpUse', k, 'SCAN', 'small green');
    case 'rsoda': return btn('glpUse', k, 'DRINK', 'small green');
    case 'rcheese': return btn('glpUse', k, 'EAT', 'small green');
    default: return '';
  }
};
H.glpUse = (k) => { const r = GLP.use(k); if (r !== 'keep' && GS.panel === 'bag') UI.bag(); };
GLP.use = function (k) {
  const s = sv(), it = GL.ITEMS[k], g = gs(); if (!it || !has(k)) return 'none';
  switch (k) {
    case 'rsoda': case 'rcheese': s.bag[k]--; if (it.h) G.need('h', it.h); if (it.e) G.need('e', it.e); if (it.f) G.need('f', it.f); Snd.fx(k === 'rsoda' ? 'bubble' : 'eat'); W.fx(k === 'rsoda' ? 'bubble' : 'heart', GS.me.x, 2, GS.me.z, 4, 0.4); G.toast(k === 'rsoda' ? '\uD83E\uDD64 FIZZ! Cheese-berry power! +30 energy' : '\uD83E\uDDC0 Mmm, cheesy! Luna would approve.'); G.persist(); return 'ok';
    case 'rhover': g.hover = !g.hover; if (g.hover && GL.Cars && GL.Cars.driving()) { g.hover = false; G.toast('Park your car first!'); return 'ok'; } Snd.fx(g.hover ? 'boing' : 'click'); G.toast(g.hover ? '\uD83D\uDEF9 WHOOSH! You hop on the Hover-Board. Zoom zoom!' : 'You step off the Hover-Board.'); s.stats.glpHover = (s.stats.glpHover || 0) + (g.hover ? 1 : 0); G.persist(); if (G.syncMe) G.syncMe(); return 'ok';
    case 'rshield': g.shield = g.shield === false; Snd.fx('bubble'); G.toast(g.shield ? '\uD83E\uDEE7 Bubble Shield: AUTO ON (pops up in rain, snow and hail)' : '\uD83E\uDEE7 Bubble Shield switched off.'); G.persist(); return 'ok';
    case 'rscanner': return scan();
    case 'rtablet': G.closePanel(); if (GL.Work && GL.Work.remote && GL.Work.remote()) { s.stats.glpRemote = (s.stats.glpRemote || 0) + 1; Snd.fx('beep'); } return 'keep';
    case 'ratphone': G.closePanel(); GLP.app(); return 'keep';
    case 'rhammer': return GLP.hammer() ? 'keep' : 'ok';
    default: return 'none';
  }
};
function scan() {
  const s = sv(), g = gs(), d = G.day();
  if (g.scanDay === d) { G.toast('\uD83E\uDE7A The Squeak Scanner is recharging. Try again tomorrow!', true); return 'ok'; }
  g.scanDay = d; const cap = GL.Health && GL.Health.cap ? GL.Health.cap() : 100; const before = s.hp; s.hp = Math.min(cap, s.hp + 25);
  let msg = '\uD83E\uDE7A BEEP-BOOP! Scan complete: ' + Math.round(s.hp) + ' health (+' + Math.round(s.hp - before) + ').';
  if (s.inj && GL.INJ[s.inj.id] && GL.INJ[s.inj.id].lv === 1) { msg += ' Your ' + GL.INJ[s.inj.id].name.toLowerCase() + ' is all better!'; s.inj = null; }
  else if (s.inj && GL.INJ[s.inj.id]) msg += ' That ' + GL.INJ[s.inj.id].name.toLowerCase() + ' needs a real doctor (phone \u2192 \uD83E\uDE7A Health).';
  s.stats.healed = (s.stats.healed || 0); s.stats.glpScans = (s.stats.glpScans || 0) + 1;
  Snd.fx('beep'); W.fx('sparkle', GS.me.x, 1.4, GS.me.z, 10, 0.7); G.toast(msg); G.persist(); return 'ok';
}
/* Fix-It Hammer: car repairs anywhere */
let fixing = null;
function myCarObj() { return GL.Cars && GL.Cars.myCar ? GL.Cars.myCar() : null; }
function myCarData() { return GL.Cars && GL.Cars.activeCar ? GL.Cars.activeCar() : null; }
GLP.hammer = function () {
  const c = myCarData(), o = myCarObj();
  if (!c || !o) { G.toast('\uD83D\uDD28 You don\u2019t have a car to fix yet! (Pi-rat says it fixes ships too.)', true); return false; }
  if (GL.Cars.driving()) { G.toast('Hop out of the car first, then swing the hammer!', true); return false; }
  if (GS.me.area !== 'town' || Math.hypot(o.x - GS.me.x, o.z - GS.me.z) > 5) { G.toast('\uD83D\uDD28 Walk up to your car first (phone \u2192 Cars \u2192 BRING MY CAR HERE).', true); return false; }
  const cond = c.cond != null ? c.cond : 100;
  if (!c.broken && cond >= 90 && !c.half) { G.toast('\uD83D\uDD28 Tap tap\u2026 your car is already in great shape (' + Math.round(cond) + '%)!'); return false; }
  G.closePanel(); const yaw = Math.atan2(o.x - GS.me.x, o.z - GS.me.z);
  G.startAct({ kind: 'glpfix', act: 'work', x: GS.me.x, z: GS.me.z, yaw, dur: 2.6, name: 'Ratita Hammer', stopLabel: 'STOP' }); fixing = { t: 0, clank: 0 }; Snd.fx('clank'); return true;
};
function finishFix() {
  const c = myCarData(), s = sv(); if (!c) return; const cond = c.cond != null ? c.cond : 100, was = c.broken;
  if (c.broken === 'crash') c.cond = 60; else c.cond = Math.min(90, Math.max(cond + 45, 70));
  c.broken = null; c.half = false; c.halfLeft = 0; s.stats.glpFix = (s.stats.glpFix || 0) + 1; s.stats.repairs = (s.stats.repairs || 0) + 1;
  G.persist(); Snd.fx('level'); const o = myCarObj(); if (o) W.fx('sparkle', o.x, 1.4, o.z, 14, 1.2);
  G.toast('\uD83D\uDD28 CLANG CLANG! Your car is at ' + Math.round(c.cond) + '%' + (was === 'crash' ? '. Good enough to drive. Honest Hank can make it 100%.' : was ? ' and running again!' : '!'));
}
G.actHook = (function (prev) {
  return function () {
    if (GS.me.area === 'town' && has('rhammer') && !(GL.Cars && GL.Cars.driving()) && !GS.me.ride) {
      const c = myCarData(), o = myCarObj();
      if (c && o && c.broken && Math.hypot(o.x - GS.me.x, o.z - GS.me.z) < 4) return { custom: () => GLP.hammer(), label: '\uD83D\uDD28 FIX', name: 'Your car (Ratita Hammer)', x: o.x, z: o.z, py: 2 };
    }
    return prev ? prev() : null;
  };
})(G.actHook);
/* Hover-Board speed + Bubble Shield */
G.speedMul = (function (prev) { return () => (prev ? prev() : 1) * (GLP.hovering() ? (W.cur && W.cur.outdoor ? 1.6 : 1.25) : 1); })(G.speedMul);
GLP.hovering = () => !!(gs().hover && has('rhover') && !(GL.Cars && GL.Cars.driving()) && !GS.me.ride && !(GS.work && GS.work.cid));
GLP.shield = () => !!(has('rshield') && gs().shield !== false);
const curLook0 = G.curLook;
G.curLook = function () { const L = curLook0(); if (GLP.hovering() && !GS.me.act) L.hb = 1; if (GLP.shield() && GL.Weather && GL.Weather.cover && W.cur && W.cur.outdoor && !(GL.Cars && GL.Cars.driving()) && !GS.me.ride) L.bub = 1; return L; };

/* ======================================================================
   RatPhone 5: the Ratita app (Squeak Delivery drone + texting the Ratitas)
   ====================================================================== */
UI.APPS.splice(UI.APPS.length - 1, 0, ['rat', '\uD83D\uDC00', 'Ratita', () => has('ratphone')]);
UI.app_rat = () => GLP.app();
const DELIV = 4;
GLP.app = function (tab) {
  const s = sv(); tab = tab || 'menu';
  if (!has('ratphone')) { G.toast('You need a RatPhone 5 from the Ratita Industries shop!', true); return; }
  let h = head('\uD83D\uDC00 Ratita') + '<p class="sub small">' + money(s.money) + ' \u00b7 RatPhone 5</p>';
  if (tab === 'menu') {
    h += '<div class="btncol">' + btn('glpApp', 'deliv', '\uD83D\uDE81 SQUEAK DELIVERY', 'primary') + btn('glpText', null, '\uD83D\uDCAC TEXT THE RATITAS', 'blue') + (has('rtablet') ? btn('glpUse', 'rtablet', '\uD83D\uDCF2 WORK FROM TABLET', '') : '') + (has('rhover') ? btn('glpUse', 'rhover', gs().hover ? '\uD83D\uDEF9 STEP OFF THE BOARD' : '\uD83D\uDEF9 RIDE HOVER-BOARD', '') : '') + (has('rscanner') ? btn('glpUse', 'rscanner', '\uD83E\uDE7A SQUEAK SCAN', '') : '') + btn('guideB', 'ratita', '\uD83E\uDDED GUIDE ME TO THE SHOP', 'alt') + '</div>';
  } else {
    h += '<p class="sub small">A Ratita drone flies it to you in seconds, anywhere in Grokville (even inside!). +' + money(DELIV) + ' delivery.</p><div class="grid">';
    Object.keys(GL.ITEMS).filter((k) => { const it = GL.ITEMS[k]; return (it.cat === 'food' || it.cat === 'pet' || it.cat === 'med' || k === 'groceries') && it.where !== 'ratita' || k === 'rsoda' || k === 'rcheese'; }).forEach((k) => { const it = GL.ITEMS[k]; h += '<button class="item" data-a="glpOrder" data-v="' + k + '"><i>' + it.icon + '</i><b>' + esc(it.name) + '</b><small>' + money(it.price + DELIV) + '</small></button>'; });
    h += '</div>' + btn('glpApp', 'menu', '\u2190 BACK', 'alt small');
  }
  open('glpapp', h);
};
H.glpApp = (v) => GLP.app(v);
H.glpText = () => {
  const g = gs(), t = nowMin();
  const who = pick(['luna', 'pirat', 'snowie']), f = GL.familyById(who);
  if (t - g.textT < 60) { G.toast('\uD83D\uDCAC ' + f.name + ' is busy in the lab. Text again in a bit!'); return; }
  g.textT = t; G.need('s', 12); G.need('f', 4); Snd.fx('squeak');
  G.toast('\uD83D\uDCAC ' + f.name + ': \u201C' + pick(LINES[who]) + '\u201D'); G.persist(); G.closePanel();
};
H.glpOrder = (k) => {
  const it = GL.ITEMS[k]; if (!it || !has('ratphone')) return;
  if (drone) { G.toast('\uD83D\uDE81 A drone is already on the way!'); return; }
  if (!G.spend(it.price + DELIV)) return;
  G.closePanel(); gs().orders++; Snd.fx('beep'); G.toast('\uD83D\uDE81 Order placed! A Ratita drone is on the way with your ' + it.name + '\u2026'); spawnDrone(k); G.persist();
};
/* the delivery drone (smooth model, flies in, lowers a box, flies away) */
let drone = null;
function droneModel() {
  const g = new T.Group(); rb(0.6, 0.22, 0.6, 0.1, PM('#7c3aed', { shininess: 100 }), g, 0, 0, 0); sq(sp(0.14, GLOW('#22d3ee'), g, 0, -0.08, 0.26), 'z', 0.5);
  [-1, 1].forEach((a) => [-1, 1].forEach((b) => { const arm = rb(0.5, 0.05, 0.06, 0.02, '#334155', g, a * 0.32, 0.05, b * 0.32); arm.rotation.y = a * b * Math.PI / 4; const r = grp(g, a * 0.48, 0.1, b * 0.48); cy(0.04, 0.08, '#111827', r, 0, 0, 0); const bl = rb(0.42, 0.015, 0.06, 0.007, PM('#e5e7eb'), r, 0, 0.05, 0); void bl; g.userData.rot = (g.userData.rot || []).concat([r]); }));
  [-1, 1].forEach((s) => { sq(sp(0.09, PM('#9ca3af'), g, s * 0.14, 0.16, -0.2), 'z', 0.3); });
  const pk = grp(g, 0, -0.45, 0); rb(0.34, 0.3, 0.34, 0.05, PM('#d97706', { shininess: 20 }), pk, 0, 0, 0); rb(0.36, 0.06, 0.08, 0.02, '#f8fafc', pk, 0, 0.0, 0); cy(0.006, 0.3, '#111827', g, 0, -0.18, 0); g.userData.pk = pk;
  return g;
}
function spawnDrone(k) {
  const m = droneModel(); W.scene.add(m); const area = GS.me.area;
  drone = { m, k, t: 0, area, from: new T.Vector3(GS.me.x + 14, 12, GS.me.z - 10), done: false };
  m.position.copy(drone.from);
}
function tickDrone(dt) {
  if (!drone) return; const d = drone, m = d.m; d.t += dt;
  m.visible = GS.me.area === d.area;
  (m.userData.rot || []).forEach((r) => { r.rotation.y += dt * 40; });
  const tgt = new T.Vector3(GS.me.x + 0.9, 2.7, GS.me.z + 0.6);
  if (d.t < 2.6) { const k = d.t / 2.6, e = k * k * (3 - 2 * k); m.position.lerpVectors(d.from, tgt, e); m.rotation.z = Math.sin(d.t * 3) * 0.08; }
  else if (d.t < 3.4) { m.position.copy(tgt); m.position.y += Math.sin(d.t * 6) * 0.04; m.userData.pk.position.y = -0.45 - Math.min(1, (d.t - 2.6) / 0.6) * 1.6; }
  else if (!d.done) { d.done = true; const s = sv(); s.bag[d.k] = (s.bag[d.k] || 0) + 1; m.userData.pk.visible = false; Snd.fx('ding'); W.fx('sparkle', tgt.x, 1, tgt.z, 8, 0.6); G.toast('\uD83D\uDCE6 Delivered! ' + GL.ITEMS[d.k].icon + ' ' + GL.ITEMS[d.k].name + ' is in your bag.'); G.persist(); d.from2 = m.position.clone(); }
  else { const k = Math.min(1, (d.t - 3.4) / 2); m.position.set(d.from2.x - k * 14, d.from2.y + k * 12, d.from2.z - k * 10); if (k >= 1) { W.scene.remove(m); drone = null; } }
}
GLP._drone = () => drone;

/* ======================================================================
   Per-frame: displays turn, rats wiggle, hammer in hand, co-op sharing, hello toast
   ====================================================================== */
let ham = null, hello = false;
G.hooks.tick.push(function (dt) {
  tickDrone(dt);
  if (shop && W.cur === shop.A) { shop.t += dt; shop.disp.forEach((d, i) => { d.rotation.y += dt * 0.7; d.position.y = 0.98 + (i === 3 ? 0.15 : 0) + Math.sin(shop.t * 1.6 + i) * 0.04; }); shop.rats.forEach((P) => P.anim(dt, 0)); if (shop.torty) shop.torty.anim(dt, 0); }
  if (fixing) { const a = GS.me.act; if (!a || a.kind !== 'glpfix') { const fin = fixing.t >= 2.4; fixing = null; if (fin) finishFix(); } else { fixing.t += dt; fixing.clank -= dt; if (fixing.clank <= 0) { fixing.clank = 0.55; Snd.fx('clank'); const o = myCarObj(); if (o) W.fx('sparkle', o.x, 1.0, o.z, 3, 0.6); } } }
  if (!hello && GLP.owned() && GS.inWorld) { hello = true; const g = gs(); if (!g.hello) { g.hello = 1; G.persist(); setTimeout(() => G.toast('\uD83D\uDC00 GOOD LIFE PACK: the Ratita Industries Gadget Shop is open on the east side of town! (phone \u2192 Map)'), 2500); } }
});
G.hooks.hostTick.push(function (dt, S) { if (S && GLP.localOwned() && !S.glp) { S.glp = 1; G.touch(); } });
const render0 = W.render;
W.render = function () {
  const me = GS.av && GS.av[GS.pid];
  if (me && GS.me.act && GS.me.act.kind === 'glpfix') { if (!ham) { ham = MD.glpItem('rhammer'); ham.scale.setScalar(0.85); ham.rotation.set(-1.4, 0, 0.3); ham.position.set(0, -0.48, 0.12); } if (ham.parent !== me.ch.arms[1]) me.ch.arms[1].add(ham); ham.visible = true; }
  else if (ham && ham.parent) ham.parent.remove(ham);
  render0();
};
GLP.wearing = () => GLP.OUTFITS.filter(wearing).map((o) => o.id);
GLP._shop = () => shop;
})();
