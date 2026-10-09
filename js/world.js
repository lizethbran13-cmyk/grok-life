/* Grok Life - 3D world: renderer, town, interiors, homes, collisions, day/night, navigation graphs, camera, fx */
(function () {
'use strict';
const GL = window.GL, T = window.THREE, MD = GL.MD, TAU = Math.PI * 2;
const W = GL.W = {};
const { box, ell, sph, cyl, cone, grp, mesh, M, G } = MD;
const R = GL.ROADS;

/* ---------------- canvas helpers ---------------- */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
W.canvasTex = canvasTex;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
W.rr = rr;
W.textSprite = function (text, opts) {
  opts = opts || {};
  const fs = opts.size || 44, pad = 16, c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '800 ' + fs + 'px "Trebuchet MS",system-ui,sans-serif';
  g.font = font; const tw = Math.ceil(g.measureText(text).width) + pad * 2; c.width = Math.max(tw, fs * 1.4); c.height = Math.round(fs + pad * 1.4);
  g.font = font; rr(g, 3, 3, c.width - 6, c.height - 6, c.height / 2 - 3); g.fillStyle = opts.bg || 'rgba(40,20,70,.85)'; g.fill();
  g.lineWidth = 5; g.strokeStyle = opts.border || '#fff'; g.stroke();
  g.fillStyle = opts.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const hh = opts.h || 0.42; sp.scale.set(hh * c.width / c.height, hh, 1); sp.renderOrder = 20; return sp;
};
function signPlane(text, w, h, bg, fg) {
  const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => { g.fillStyle = bg; rr(g, 4, 4, cw - 8, ch - 8, 30); g.fill(); g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = fg || '#fff'; let fs = Math.round(ch * 0.5); g.font = '900 ' + fs + 'px "Trebuchet MS",sans-serif'; while (g.measureText(text).width > cw - 40 && fs > 12) { fs -= 2; g.font = '900 ' + fs + 'px "Trebuchet MS",sans-serif'; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 4); });
  const m = new T.Mesh(G.plane, new T.MeshBasicMaterial({ map: t, transparent: true })); m.scale.set(w, h, 1); return m;
}
W.signPlane = signPlane;
function tileTex(a, b, n, m) { const t = canvasTex(128, 128, (g) => { g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, m || n); return t; }
function woodTex(a, b, n, m) { const t = canvasTex(256, 256, (g) => { g.fillStyle = a; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, i * 32, 256, 30); g.fillStyle = 'rgba(80,40,10,.22)'; g.fillRect((i * 97) % 256, i * 32, 3, 30); } }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n || 4, m || n || 4); return t; }
function carpetTex(a, n, m) { const t = canvasTex(64, 64, (g) => { g.fillStyle = a; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.12) + ')'; g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, m); return t; }
W.floorTex = function (id, w, d) {
  switch (id) {
    case 'dark': return woodTex('#8b5a2b', '#7a4a20', w / 3, d / 3);
    case 'tile': return tileTex('#f8fafc', '#e2e8f0', w / 2, d / 2);
    case 'blue': return tileTex('#e0f2fe', '#bae6fd', w / 2, d / 2);
    case 'pink': return carpetTex('#f9a8d4', w / 4, d / 4);
    case 'purple': return carpetTex('#c4b5fd', w / 4, d / 4);
    case 'green': return carpetTex('#86efac', w / 4, d / 4);
    case 'check': return tileTex('#f8fafc', '#1f2937', w / 2, d / 2);
    default: return woodTex('#e2b47a', '#d9a868', w / 3, d / 3);
  }
};

/* ---------------- renderer + lights ---------------- */
W.init = function (canvas) {
  const r = W.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const sc = W.scene = new T.Scene(); sc.background = new T.Color('#a8e6ff');
  W.camera = new T.PerspectiveCamera(50, 1, 0.3, 220);
  W.hemi = new T.HemisphereLight(0xffffff, 0xa89880, 0.7); sc.add(W.hemi);
  W.sun = new T.DirectionalLight(0xffffff, 0.5); W.sun.position.set(8, 16, 10); sc.add(W.sun);
  W.areas = {}; W.cur = null; W.ray = new T.Raycaster(); W.time = 0; W.fxList = []; W.camOverride = null; W.camZoom = 1; W.camAhead = [0, 0];
  W.camPos = new T.Vector3(0, 10, 10); W.camLook = new T.Vector3();
  W.lampMat = new T.MeshLambertMaterial({ color: '#fef9c3', emissive: '#000000' });
  W.winMat = new T.MeshLambertMaterial({ color: '#bae6fd', emissive: '#000000' });
  W.glowMat = new T.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.32, depthWrite: false });
  W.glowSprites = [];
  W.resize();
};
W.resize = function () { const w = innerWidth, h = innerHeight; W.renderer.setSize(w, h, false); W.camera.aspect = w / h; W.camera.updateProjectionMatrix(); };
W.render = function () { W.renderer.render(W.scene, W.camera); };

/* day / night: clock in game minutes (0..1440) */
const DAY = new T.Color('#a8e6ff'), DUSK = new T.Color('#fdba74'), NIGHT = new T.Color('#1e1b4b'), tmpC = new T.Color();
W.daylight = function (min) { const h = (min / 60) % 24; const up = GL.clamp((h - 5.5) / 2, 0, 1), down = GL.clamp((20.5 - h) / 2, 0, 1); return Math.min(up, down); };
W.isNight = (min) => W.daylight(min) < 0.45;
W.setClock = function (min) {
  W.clock = min;
  const A = W.cur; if (!A) return;
  if (!A.outdoor) { W.hemi.intensity = 0.72; W.sun.intensity = 0.5; W.scene.background = new T.Color(A.bg); if (W.scene.fog) W.scene.fog.color.set(A.bg); return; }
  const dl = W.daylight(min), h = (min / 60) % 24, dusk = Math.max(0, 1 - Math.abs(h - 19.2) / 1.3) + Math.max(0, 1 - Math.abs(h - 6.3) / 1.0);
  W.hemi.intensity = 0.3 + 0.42 * dl; W.sun.intensity = 0.08 + 0.45 * dl;
  tmpC.copy(NIGHT).lerp(DAY, dl); if (dusk > 0) tmpC.lerp(DUSK, Math.min(0.55, dusk * 0.6));
  if (!W.scene.background || !W.scene.background.isColor) W.scene.background = new T.Color();
  W.scene.background.copy(tmpC); if (W.scene.fog) W.scene.fog.color.copy(tmpC);
  const night = dl < 0.45;
  if (night !== W._night) {
    W._night = night;
    W.lampMat.emissive.set(night ? '#fde68a' : '#000000'); W.winMat.emissive.set(night ? '#b7791f' : '#000000'); W.winMat.color.set(night ? '#fde68a' : '#bae6fd');
    W.glowMat.visible = night; W.glowSprites.forEach((s) => { s.visible = night; });
    if (W.onNight) W.onNight(night);
  }
};

/* ---------------- areas + collisions ---------------- */
function newArea(id, o) { const A = Object.assign({ id, g: new T.Group(), walk: [], obs: [], hots: [], ground: [], spawn: [0, 0], cam: { h: 9.5, d: 9 }, bg: '#f3d7ec', fog: null }, o); A.g.visible = false; W.scene.add(A.g); W.areas[id] = A; return A; }
W.newArea = newArea;
function hot(A, o) { const h = Object.assign({ reach: 1.8, h: 1.6 }, o); A.hots.push(h); return h; }
W.hot = hot;
function rect(A, x0, x1, z0, z1) { A.walk.push([x0, x1, z0, z1]); }
function obsB(A, x0, x1, z0, z1, tag) { const o = { t: 'b', x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), tag }; A.obs.push(o); A.grid = null; return o; }
function obsC(A, x, z, r, tag) { const o = { t: 'c', x, z, r, tag }; A.obs.push(o); A.grid = null; return o; }
W.obsB = obsB; W.obsC = obsC;
function ground(A, w, d, col, x, z, top, tex) {
  const m = new T.Mesh(G.box, tex ? new T.MeshLambertMaterial({ map: tex }) : M(col)); m.scale.set(w, 0.1, d); m.position.set(x, top - 0.05, z); A.g.add(m); return m;
}
function marker(A, h, text, col, y) { const s = W.textSprite(text, { size: 40, h: 0.62, bg: col || 'rgba(255,79,216,.92)' }); s.position.set(h.x, y || 4.6, h.z); A.g.add(s); h.sign = s; return s; }
const CELL = 8;
function buildGrid(A) {
  const gr = {}; A.obs.forEach((o, i) => {
    const x0 = o.t === 'b' ? o.x0 : o.x - o.r, x1 = o.t === 'b' ? o.x1 : o.x + o.r, z0 = o.t === 'b' ? o.z0 : o.z - o.r, z1 = o.t === 'b' ? o.z1 : o.z + o.r;
    for (let cx = Math.floor((x0 - 1.5) / CELL); cx <= Math.floor((x1 + 1.5) / CELL); cx++) for (let cz = Math.floor((z0 - 1.5) / CELL); cz <= Math.floor((z1 + 1.5) / CELL); cz++) { const k = cx + ',' + cz; (gr[k] || (gr[k] = [])).push(o); }
  });
  A.grid = gr;
}
const EMPTY = [];
W.isFree = function (A, x, z, r) {
  r = r || 0.35;
  let inW = false; for (const q of A.walk) if (x >= q[0] + r * 0.5 && x <= q[1] - r * 0.5 && z >= q[2] + r * 0.5 && z <= q[3] - r * 0.5) { inW = true; break; }
  if (!inW) return false;
  let list = A.obs;
  if (A.obs.length > 40) { if (!A.grid) buildGrid(A); list = A.grid[Math.floor(x / CELL) + ',' + Math.floor(z / CELL)] || EMPTY; }
  for (const o of list) { if (o.off) continue; if (o.t === 'b') { if (x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r) return false; } else if ((x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) < (o.r + r) * (o.r + r)) return false; }
  return true;
};
W.move = function (A, x, z, dx, dz, r) {
  if (W.isFree(A, x + dx, z + dz, r)) return [x + dx, z + dz];
  if (W.isFree(A, x + dx, z, r)) return [x + dx, z];
  if (W.isFree(A, x, z + dz, r)) return [x, z + dz];
  if (!W.isFree(A, x, z, r)) { for (let k = 1; k < 12; k++) for (let a = 0; a < 8; a++) { const nx = x + Math.cos(a * TAU / 8) * k * 0.3, nz = z + Math.sin(a * TAU / 8) * k * 0.3; if (W.isFree(A, nx, nz, r)) return [nx, nz]; } }
  return [x, z];
};
W.freeNear = function (A, x, z, r) { if (W.isFree(A, x, z, r)) return [x, z]; for (let k = 1; k < 30; k++) for (let a = 0; a < 12; a++) { const nx = x + Math.cos(a * TAU / 12) * k * 0.3, nz = z + Math.sin(a * TAU / 12) * k * 0.3; if (W.isFree(A, nx, nz, r)) return [nx, nz]; } return [x, z]; };
W.los = function (A, x0, z0, x1, z1, r, noRoad) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / 0.5));
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!W.isFree(A, x, z, r || 0.3)) return false; if (noRoad && W.onRoad(x, z)) return false; }
  return true;
};
W.onRoad = function (x, z, m) { m = m == null ? 4.1 : m; for (const X of R) if (Math.abs(x - X) < m && Math.abs(z) < 52) return true; for (const Z of R) if (Math.abs(z - Z) < m && Math.abs(x) < 52) return true; return false; };

W.setArea = function (id) {
  for (const k in W.areas) W.areas[k].g.visible = k === id;
  W.cur = W.areas[id]; W.scene.background = new T.Color(W.cur.bg);
  W.scene.fog = W.cur.fog ? new T.Fog(W.cur.bg, W.cur.fog[0], W.cur.fog[1]) : null;
  W.fxList.forEach((f) => W.scene.remove(f.s)); W.fxList = [];
  W._night = null; W.setClock(W.clock || 480);
};

/* merge static meshes (per material, per 32 m cell) so phones draw far fewer objects */
function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), kill = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.dyn || Array.isArray(o.material)) return;
    let p = o, skip = false; while (p && p !== root.parent) { if (!p.visible || (p !== o && p.userData.dyn)) { skip = true; break; } p = p.parent; }
    if (skip) return;
    const e = o.matrixWorld.elements, key = o.material.uuid + '|' + Math.floor(e[12] / 32) + ',' + Math.floor(e[14] / 32);
    let b = buckets.get(key); if (!b) { b = { mat: o.material, list: [] }; buckets.set(key, b); }
    b.list.push(o); kill.push(o);
  });
  kill.forEach((o) => o.parent.remove(o));
  buckets.forEach((b) => {
    let n = 0; const geos = b.list.map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); n += g.attributes.position.count; return g; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let off = 0;
    geos.forEach((g) => { P.set(g.attributes.position.array, off * 3); N.set(g.attributes.normal.array, off * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, off * 2); off += g.attributes.position.count; g.dispose(); });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3)); geo.setAttribute('uv', new T.BufferAttribute(U, 2)); geo.computeBoundingSphere();
    const m = new T.Mesh(geo, b.mat); m.matrixAutoUpdate = false; root.add(m);
  });
}
W.bake = bake;
function dyn(o) { o.userData.dyn = true; return o; }

/* street props */
function lamp(g, x, z) { const L = grp(g, x, 0, z); cyl(0.08, 3.6, '#334155', L, 0, 1.8, 0); box(0.7, 0.08, 0.1, '#334155', L, 0, 3.55, 0); mesh(G.sph, W.lampMat, L, 0, 3.75, 0, 0.26, 0.26, 0.26);
  const gl = new T.Mesh(G.circle, W.glowMat); gl.rotation.x = -Math.PI / 2; gl.position.set(x, 0.09, z); gl.scale.setScalar(2.6); g.add(gl);
  const sp = new T.Sprite(glowSpriteMat()); sp.position.set(x, 3.75, z); sp.scale.set(2.2, 2.2, 1); sp.visible = false; g.add(sp); W.glowSprites.push(sp); return L; }
let _gsm = null;
function glowSpriteMat() { if (_gsm) return _gsm; const t = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,180,.95)'); gr.addColorStop(0.4, 'rgba(255,220,120,.35)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); _gsm = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: T.AdditiveBlending }); return _gsm; }
function windowOn(g, x, y, z, w, h, ry) { const m = mesh(G.box, W.winMat, g, x, y, z, w || 1.6, h || 1.2, 0.1); if (ry) m.rotation.y = ry; return m; }
W.windowOn = windowOn;

/* ======================================================================
   TOWN
   ====================================================================== */
// buildings: x0..x1, z0..z1 footprint, door side n/s, opening hours [open, close] (0,24 = always)
const BLD = [
  { id: 'grocery', name: 'Fresh Mart', icon: '\uD83D\uDED2', x0: -40, x1: -26, z0: -40, z1: -29, door: 'n', col: '#fef3c7', roof: '#16a34a', sign: 'FRESH MART', open: [7, 22] },
  { id: 'boutique', name: 'Coco\u2019s Boutique', icon: '\uD83D\uDC57', x0: -22, x1: -8, z0: -40, z1: -29, door: 'n', col: '#fce7f3', roof: '#db2777', sign: 'COCO\u2019S BOUTIQUE', open: [8, 21] },
  { id: 'cafe', name: 'Sunny Side Caf\u00e9', icon: '\u2615', x0: -40, x1: -26, z0: -19, z1: -8, door: 's', col: '#ffedd5', roof: '#ea580c', sign: 'SUNNY SIDE CAF\u00c9', open: [0, 24] },
  { id: 'bank', name: 'Grok Bank', icon: '\uD83C\uDFE6', x0: -22, x1: -8, z0: -19, z1: -8, door: 's', col: '#e5e7eb', roof: '#1e40af', sign: 'GROK BANK', open: [8, 19] },
  { id: 'cityhall', name: 'City Hall', icon: '\uD83C\uDFDB\uFE0F', x0: 8, x1: 24, z0: -41, z1: -27, door: 'n', col: '#f8fafc', roof: '#475569', sign: 'CITY HALL', open: [0, 24], h: 6.5 },
  { id: 'furniture', name: 'Cozy Home Furniture', icon: '\uD83D\uDECB\uFE0F', x0: 27, x1: 40, z0: -40, z1: -29, door: 'n', col: '#ede9fe', roof: '#7c3aed', sign: 'COZY HOME', open: [8, 21] },
  { id: 'petstore', name: 'Paws & Claws Pets + Vet', icon: '\uD83D\uDC3E', x0: 8, x1: 22, z0: -20, z1: -8, door: 's', col: '#fef9c3', roof: '#f59e0b', sign: 'PAWS & CLAWS', open: [8, 21] },
  { id: 'apt', name: 'Sunset Apartments', icon: '\uD83C\uDFE2', x0: 26, x1: 40, z0: -27, z1: -16, door: 's', col: '#fde68a', roof: '#b45309', sign: 'SUNSET APARTMENTS', open: [0, 24], h: 7.5, noDoor: 1 },
  { id: 'hospital', name: 'Maple Hospital', icon: '\uD83C\uDFE5', x0: 8, x1: 24, z0: 8, z1: 21, door: 'n', col: '#f8fafc', roof: '#dc2626', sign: 'HOSPITAL', open: [0, 24], h: 6.5 },
  { id: 'school', name: 'Maple School', icon: '\uD83C\uDFEB', x0: 27, x1: 40, z0: 8, z1: 21, door: 'n', col: '#fee2e2', roof: '#b91c1c', sign: 'MAPLE SCHOOL', open: [7, 20] },
  { id: 'garage', name: 'Marco\u2019s Garage', icon: '\uD83D\uDD27', x0: 8, x1: 21, z0: 28, z1: 40, door: 's', col: '#e7e5e4', roof: '#0f766e', sign: 'MARCO\u2019S GARAGE', open: [7, 21] },
  { id: 'arcade', name: 'Grok Arcade', icon: '\uD83D\uDD79\uFE0F', x0: 26, x1: 40, z0: 28, z1: 40, door: 's', col: '#312e81', roof: '#ff4fd8', sign: 'GROK ARCADE', open: [0, 24] },
  { id: 'dealer', name: 'Sal\u2019s Car Dealership', icon: '\uD83D\uDE97', x0: -40, x1: -14, z0: -72, z1: -58, door: 's', col: '#e0f2fe', roof: '#0284c7', sign: 'SAL\u2019S CARS', open: [8, 20] },
  { id: 'fire', name: 'Fire Station', icon: '\uD83D\uDE92', x0: -5, x1: 13, z0: -72, z1: -58, door: 's', col: '#fecaca', roof: '#b91c1c', sign: 'FIRE STATION 1', open: [0, 24], dx: -5 },
  { id: 'police', name: 'Police Station', icon: '\uD83D\uDE93', x0: 26, x1: 42, z0: -72, z1: -58, door: 's', col: '#dbeafe', roof: '#1e3a8a', sign: 'POLICE', open: [0, 24] },
  { id: 'museum', name: 'Grokville Museum', icon: '\uD83C\uDFDB\uFE0F', x0: -57, x1: -43, z0: -73, z1: -60, door: 's', col: '#f5f5f4', roof: '#a16207', sign: 'MUSEUM', open: [9, 20], h: 6.5 },
  { id: 'jewelry', name: 'Glitter & Gold Jewelers', icon: '\uD83D\uDC8D', x0: 15.5, x1: 24.5, z0: -72, z1: -61, door: 's', col: '#fdf4ff', roof: '#a21caf', sign: 'GLITTER & GOLD', open: [9, 20] },
  { id: 'shelter', name: 'Grokville Animal Shelter', icon: '\uD83D\uDC36', x0: 44, x1: 57, z0: -72, z1: -60, door: 's', col: '#ecfccb', roof: '#65a30d', sign: 'ANIMAL SHELTER', open: [0, 24] },
  { id: 'clinic', name: 'Maple Clinic', icon: '\uD83E\uDE7A', x0: 50, x1: 60, z0: 58, z1: 70, door: 'n', col: '#ecfeff', roof: '#0891b2', sign: 'CLINIC', open: [8, 20] },
  { id: 'pawn', name: 'Sid\u2019s Pawn & Stuff', icon: '\uD83C\uDFA9', x0: -60, x1: -50, z0: 58, z1: 69, door: 'n', col: '#e7e5e4', roof: '#44403c', sign: 'SID\u2019S PAWN', open: [0, 24] },
  { id: 'tech', name: 'Byte Buy Tech Store', icon: '\uD83D\uDCBB', x0: -62, x1: -55, z0: -26, z1: -14, door: 's', col: '#e0e7ff', roof: '#4338ca', sign: 'BYTE BUY', open: [9, 21] },
  { id: 'hanks', name: 'Honest Hank\u2019s Auto Care', icon: '\uD83D\uDEE0\uFE0F', x0: 55, x1: 62, z0: -24, z1: -12, door: 'n', col: '#dbeafe', roof: '#1d4ed8', sign: 'HONEST HANK\u2019S', open: [0, 24] },
  { id: 'steves', name: 'Sketchy Steve\u2019s Fix-It-Quik', icon: '\uD83E\uDE9B', x0: -62, x1: -55, z0: 12, z1: 24, door: 's', col: '#fde68a', roof: '#78350f', sign: 'STEVE\u2019S FIX-IT', open: [0, 24] }
];
W.BLD = BLD; W.bld = (id) => BLD.find((b) => b.id === id);
W.isOpen = function (id, min) { const b = W.bld(id); if (!b) return true; const h = (min / 60) % 24; return b.open[0] === 0 && b.open[1] === 24 ? true : h >= b.open[0] && h < b.open[1]; };
W.signs = [];
function building(A, b) {
  const g = A.g, w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, h = b.h || 5;
  const B = grp(g, cx, 0, cz), sgn = b.door === 'n' ? -1 : 1, fz = sgn * d / 2, ry = b.door === 'n' ? Math.PI : 0, dx = b.dx || 0;
  b.cx = cx; b.cz = cz; b.w = w; b.d = d;
  box(w, h, d, b.col, B, 0, h / 2, 0); box(w + 0.5, 0.45, d + 0.5, b.roof, B, 0, h + 0.2, 0); box(w + 0.1, 0.3, d + 0.1, MD.shade(b.col, -0.2), B, 0, 0.15, 0);
  for (let x = -w / 2 + 1.8; x <= w / 2 - 1.8; x += 3) { if (b.noDoor || Math.abs(x - dx) > 2.4) windowOn(B, x, 2.2, fz + sgn * 0.06, 1.7, 1.4); if (h > 6) windowOn(B, x, h - 2.0, fz + sgn * 0.06, 1.7, 1.2); }
  for (let z = -d / 2 + 2; z <= d / 2 - 2; z += 3.5) [-1, 1].forEach((s) => windowOn(B, s * (w / 2 + 0.05), 2.2, z, 1.4, 1.2, Math.PI / 2));
  const s = signPlane(b.sign, Math.min(w - 1.5, 9), 1.2, b.roof); s.position.set(dx * 0.3, h - 0.85, fz + sgn * 0.09); s.rotation.y = ry; B.add(s);
  if (!b.noDoor) {
    box(2.2, 2.9, 0.2, MD.shade(b.roof, -0.35), B, dx, 1.45, fz + sgn * 0.05); mesh(G.box, W.winMat, B, dx, 1.4, fz + sgn * 0.12, 1.7, 2.4, 0.04);
    const aw = box(Math.min(w - 2, 7), 0.14, 1.5, b.roof, B, dx, 3.35, fz + sgn * 0.8); aw.rotation.x = sgn * 0.3;
    // open / closed sign (switches with the clock)
    if (!(b.open[0] === 0 && b.open[1] === 24)) {
      const op = signPlane('OPEN', 1.2, 0.5, '#16a34a'), cl = signPlane('CLOSED', 1.2, 0.5, '#dc2626');
      [op, cl].forEach((m) => { m.position.set(dx + 1.85, 1.9, fz + sgn * 0.13); m.rotation.y = ry; dyn(m); B.add(m); }); cl.visible = false;
      W.signs.push({ id: b.id, op, cl });
    }
    const out = [cx + dx, b.door === 'n' ? b.z0 - 1.3 : b.z1 + 1.3];
    b.out = out;
    const hh = hot(A, { id: 'door_' + b.id, kind: 'door', to: b.id, x: out[0], z: out[1], reach: 2.3, name: b.name, label: 'ENTER' });
    marker(A, hh, b.icon + ' ' + b.name.toUpperCase(), 'rgba(40,20,70,.88)', h + 1.4);
  }
  obsB(A, b.x0, b.x1, b.z0, b.z1);
  return B;
}
W.updateSigns = function (min) { W.signs.forEach((s) => { const o = W.isOpen(s.id, min); s.op.visible = o; s.cl.visible = !o; }); };

function buildTown() {
  const A = newArea('town', { spawn: [33, -11], cam: { h: 11, d: 12 }, fog: [55, 140], bg: '#a8e6ff', outdoor: true }), g = A.g;
  A.label = 'Town';
  const grass = new T.Mesh(G.plane, M('#7fcf6b')); grass.rotation.x = -Math.PI / 2; grass.scale.set(400, 400, 1); dyn(grass); g.add(grass); A.ground.push(grass);
  rect(A, -62, 62, -82, 82);
  // sidewalk slabs (road edge to road edge) + lawns/plazas inside blocks
  const SWC = '#d6d3d1', LAWN = '#8bd877', PLAZA = '#ecdcc0';
  [[-44, -4], [4, 44]].forEach((xr) => [[-44, -4], [4, 44]].forEach((zr) => { ground(A, 40, 40, SWC, (xr[0] + xr[1]) / 2, (zr[0] + zr[1]) / 2, 0.08); }));
  ground(A, 34, 34, PLAZA, -24, -24, 0.09); ground(A, 34, 34, PLAZA, 24, -24, 0.09); ground(A, 34, 34, '#86d86f', -24, 24, 0.09); ground(A, 34, 34, PLAZA, 24, 24, 0.09);
  // outer sidewalks around the ring
  ground(A, 110, 3, SWC, 0, -53.5, 0.08); ground(A, 110, 3, SWC, 0, 53.5, 0.08); ground(A, 3, 104, SWC, -53.5, 0, 0.08); ground(A, 3, 104, SWC, 53.5, 0, 0.08);
  // north strip apron + south (Maple Street) lots
  ground(A, 86, 3, PLAZA, -2, -56.5, 0.085);
  // roads
  const ASP = '#4b5563';
  R.forEach((X) => { ground(A, 8, 104, ASP, X, 0, 0.04); ground(A, 104, 8, ASP, 0, X, 0.041); });
  const dash = M('#facc15'), white = M('#f8fafc');
  R.forEach((C) => {
    for (let t = -50; t < 50; t += 3) { if (R.some((q) => Math.abs(t + 0.75 - q) < 5)) continue; mesh(G.box, dash, g, C, 0.05, t + 0.75, 0.16, 0.02, 1.5); mesh(G.box, dash, g, t + 0.75, 0.051, C, 1.5, 0.02, 0.16); }
  });
  // crosswalks + stop lines + stop signs
  const has = (X, Z, dx, dz) => { const nx = X + dx * 48, nz = Z + dz * 48; return Math.abs(nx) <= 48 && Math.abs(nz) <= 48; };
  R.forEach((X) => R.forEach((Z) => {
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach((dd) => {
      if (!has(X, Z, dd[0], dd[1])) return;
      if (dd[0] === 0) { const z = Z + dd[1] * 5.5; for (let i = -3; i <= 3; i++) mesh(G.box, white, g, X + i * 1.1, 0.055, z, 0.6, 0.02, 1.8); mesh(G.box, white, g, X - dd[1] * 2, 0.055, Z + dd[1] * 7, 4, 0.02, 0.3); MD.stopSign(g, X - dd[1] * 4.6, Z + dd[1] * 7.3, dd[1] > 0 ? 0 : Math.PI); }
      else { const x = X + dd[0] * 5.5; for (let i = -3; i <= 3; i++) mesh(G.box, white, g, x, 0.055, Z + i * 1.1, 1.8, 0.02, 0.6); mesh(G.box, white, g, X + dd[0] * 7, 0.055, Z + dd[0] * 2, 0.3, 0.02, 4); MD.stopSign(g, X + dd[0] * 7.3, Z + dd[0] * 4.6, dd[0] > 0 ? Math.PI / 2 : -Math.PI / 2); }
    });
  }));
  // buildings
  BLD.forEach((b) => building(A, b));
  decorateBuildings(A);
  buildPark(A);
  buildMaple(A);
  // apartments: 3 unit doors + parking
  const ap = W.bld('apt'); W.aptDoors = [];
  [29.5, 33, 36.5].forEach((x, i) => {
    box(1.5, 2.5, 0.2, '#7c2d12', g, x, 1.25, ap.z1 + 0.06); const n = signPlane('APT ' + (i + 1), 1.2, 0.45, '#b45309'); n.position.set(x, 2.85, ap.z1 + 0.12); g.add(n);
    const hh = hot(A, { id: 'apt' + i, kind: 'apt', unit: i, x, z: ap.z1 + 1.2, reach: 1.4, name: 'Apartment ' + (i + 1), label: 'ENTER' }); W.aptDoors.push(hh);
  });
  marker(A, { x: 33, z: ap.z1 + 1 }, '\uD83C\uDFE2 SUNSET APARTMENTS', 'rgba(180,83,9,.9)', 9);
  ground(A, 14, 6, '#6b7280', 33, -11, 0.095); ground(A, 3, 3.4, '#6b7280', 33, -6.3, 0.092);
  for (let i = 0; i < 5; i++) mesh(G.box, white, g, 26.5 + i * 3.2, 0.1, -10.5, 0.15, 0.02, 4.4);
  W.aptParking = [[28.1, -10.8, 0], [31.3, -10.8, 0], [34.5, -10.8, 0], [37.7, -10.8, 0]];
  // welcome sign
  const wsg = grp(g, 47, 0, -10); [-2, 2].forEach((x) => cyl(0.12, 2.6, '#7c2d12', wsg, 0, 1.3, x)); const wp = signPlane('WELCOME TO GROK LIFE!', 5, 1.2, '#ff4fd8'); wp.position.set(-0.15, 2.4, 0); wp.rotation.y = -Math.PI / 2; wsg.add(wp);
  // streetlights along every road segment (both sides) + hydrants/benches/bins
  R.forEach((C) => {
    for (let t = -42; t <= 42; t += 12) {
      if (R.some((q) => Math.abs(t - q) < 8)) continue;
      [-1, 1].forEach((s) => {
        const o = s * 6.4;
        const p1 = [C + o, t], p2 = [t, C + o];
        [p1, p2].forEach((p) => { if (W.isFree(A, p[0], p[1], 0.5) && !nearDrive(p[0], p[1])) { lamp(g, p[0], p[1]); obsC(A, p[0], p[1], 0.18); } });
      });
    }
  });
  [[-20, -43.6], [20, -43.6], [-43.6, 20], [43.6, -20], [-20, 43.6], [20, 4.4]].forEach((q, i) => { if (i % 2) { MD.hydrant(g, q[0], q[1]); obsC(A, q[0], q[1], 0.2); } else { MD.trash(g, q[0], q[1]); obsC(A, q[0], q[1], 0.32); } });
  // trees: block edges + town border
  const treeAt = (x, z, s, col) => { if (!W.isFree(A, x, z, 1.3) || nearDoor(x, z) || nearDrive(x, z)) return; MD.tree(g, x, z, s || 1.1, col); obsC(A, x, z, 0.45); };
  [[-41, -7], [7, 41]].forEach((xr) => [[-41, -7], [7, 41]].forEach((zr) => {
    for (let t = xr[0] + 1; t <= xr[1] - 1; t += 5.5) { treeAt(t, zr[0] + 0.9); treeAt(t, zr[1] - 0.9); }
    for (let t = zr[0] + 1; t <= zr[1] - 1; t += 5.5) { treeAt(xr[0] + 0.9, t); treeAt(xr[1] - 0.9, t); }
  }));
  for (let t = -78; t <= 78; t += 6) { treeAt(59 + (t % 4 === 0 ? 1.5 : 0), t, 1.3, t % 12 ? '#16a34a' : '#15803d'); treeAt(-59 - (t % 4 === 0 ? 1.5 : 0), t, 1.3, t % 12 ? '#22c55e' : '#15803d'); }
  for (let t = -56; t <= 56; t += 6) { treeAt(t, -78, 1.4, '#15803d'); treeAt(t + 3, 81, 1.3, '#16a34a'); }
  [[-46, -60], [-10, -64], [18, -64], [46, -64], [22, -76], [-46, -72], [48, -76]].forEach((q) => treeAt(q[0], q[1], 1.2));
  for (let x = 56; x <= 60; x += 2) for (let z = -50; z <= 50; z += 2.2) if ((x + z) % 3 < 1) MD.flowers(g, x, z);
  A.zone = function (x, z) {
    if (z > 55) return 'Maple Street'; if (z < -55) return 'Service Row';
    if (x < -7 && x > -41 && z > 7 && z < 41) return 'Maple Park';
    if (x < -4 && z < -4 && x > -44 && z > -44) return 'Downtown';
    if (x > 4 && z < -4 && x < 44) return 'Civic Center'; if (x > 4 && z > 4 && x < 44 && z < 44) return 'Hospital Hill';
    return 'Grokville';
  };
}
let DOORS = null, DRIVES = null;
function nearDoor(x, z) { if (!DOORS) DOORS = BLD.filter((b) => b.out).map((b) => b.out); return DOORS.some((p) => Math.hypot(p[0] - x, p[1] - z) < 3.6) || (x > 25 && x < 41 && z > -16 && z < -3.5); }
function nearDrive(x, z) {
  if (!DRIVES) { DRIVES = GL.LOTS.map((lx) => [lx + 4.5, 54]); DRIVES.push([33, -6], [14.5, 44.5], [-27, -54], [-5, -54.5], [34, -54.5], [-24, -4.6]); }
  return DRIVES.some((p) => Math.abs(p[0] - x) < 3 && Math.abs(p[1] - z) < 3.4);
}
function decorateBuildings(A) {
  const g = A.g;
  // City Hall: columns, steps, dome, flag
  { const b = W.bld('cityhall'); for (let i = -3; i <= 3; i++) if (i) cyl(0.35, 5.6, '#f1f5f9', g, b.cx + i * 2, 2.8, b.z0 - 1.0); box(14, 0.4, 2.4, '#e2e8f0', g, b.cx, 5.8, b.z0 - 1.0); mesh(G.hemi, '#94a3b8', g, b.cx, 6.9, b.cz, 3.4, 2.6, 3.4); cyl(0.06, 3, '#e5e7eb', g, b.cx, 10.5, b.cz); const fl = box(1.4, 0.8, 0.05, '#ff4fd8', g, b.cx + 0.7, 11.5, b.cz); void fl;
    for (let i = 0; i < 3; i++) box(10 - i, 0.15, 0.9, '#e2e8f0', g, b.cx, 0.08 + i * 0.12, b.z0 - 0.4 - i * 0.6); }
  // Bank columns
  { const b = W.bld('bank'); [-4.5, -2.5, 2.5, 4.5].forEach((x) => cyl(0.3, 4.6, '#f8fafc', g, b.cx + x, 2.3, b.z1 + 0.7)); box(11, 0.4, 1.6, '#cbd5e1', g, b.cx, 4.8, b.z1 + 0.7);
    const atm = grp(g, b.x0 + 2.2, 0, b.z1 + 0.5); box(1, 2, 0.6, '#1e40af', atm, 0, 1, 0); box(0.7, 0.5, 0.05, M('#38bdf8', { emissive: '#0c4a6e' }), atm, 0, 1.4, 0.31);
    hot(A, { id: 'atm', kind: 'atm', x: b.x0 + 2.2, z: b.z1 + 1.6, reach: 1.6, name: 'ATM', label: 'ATM' }); }
  // Hospital cross + ambulance bay
  { const b = W.bld('hospital'); const c1 = box(2.4, 0.7, 0.2, M('#ef4444', { emissive: '#7f1d1d' }), g, b.cx + 5, 5.3, b.z0 - 0.15); void c1; box(0.7, 2.4, 0.2, M('#ef4444', { emissive: '#7f1d1d' }), g, b.cx + 5, 5.3, b.z0 - 0.15); }
  // School clock + bell
  { const b = W.bld('school'); box(3, 3, 3, '#fca5a5', g, b.cx, 6.4, b.cz); const cr = mesh(G.cone4, '#7f1d1d', g, b.cx, 8.6, b.cz, 2.5, 1.6, 2.5); cr.rotation.y = Math.PI / 4; cyl(0.9, 0.1, '#f8fafc', g, b.cx, 6.6, b.z0 + 4.95).rotation.x = Math.PI / 2;
    const yel = grp(g, b.x1 - 3, 0, b.z0 - 2.4); void yel; }
  // Fire station: big garage doors + red light
  { const b = W.bld('fire'); [2, 7.5].forEach((x) => { box(4.2, 4, 0.2, '#f8fafc', g, b.x0 + x + 2.5, 2, b.z1 + 0.06); for (let i = 0; i < 6; i++) box(4.2, 0.06, 0.25, '#cbd5e1', g, b.x0 + x + 2.5, 0.5 + i * 0.6, b.z1 + 0.1); });
    ground(A, 14, 6, '#9ca3af', b.cx + 2, b.z1 + 2.5, 0.095); }
  // Police: blue light bar + flag
  { const b = W.bld('police'); box(1.6, 0.4, 0.4, M('#3b82f6', { emissive: '#1e3a8a' }), g, b.cx, 5.6, b.z1 - 0.5); const st = signPlane('\u2605', 1, 1, '#facc15', '#1e3a8a'); st.position.set(b.cx + 4.5, 3.6, b.z1 + 0.1); g.add(st); }
  // Dealer: lot with display cars out front + flags
  { const b = W.bld('dealer'); ground(A, 26, 3.5, '#e5e7eb', b.cx, b.z1 + 1.9, 0.095); for (let i = 0; i < 6; i++) { const f = cone(0.3, 0.6, ['#ef4444', '#facc15', '#3b82f6'][i % 3], g, b.x0 + 2 + i * 4.4, 4.3, b.z1 + 0.4); f.rotation.x = Math.PI; }
    const big = mesh(G.box, W.winMat, g, b.cx + 6, 2.4, b.z1 + 0.07, 9, 3.4, 0.08); void big; }
  // Garage: roll door + tyres
  { const b = W.bld('garage'); box(4.5, 3.4, 0.2, '#94a3b8', g, b.x0 + 3.5, 1.7, b.z1 + 0.05); for (let i = 0; i < 3; i++) { const t = cyl(0.45, 0.3, '#1f2937', g, b.x1 - 1.4, 0.2 + i * 0.3, b.z1 + 1.1); void t; } obsC(A, b.x1 - 1.4, b.z1 + 1.1, 0.5); ground(A, 6, 4, '#9ca3af', b.x0 + 3.5, b.z1 + 2, 0.095); }
  // Arcade neon + link
  { const b = W.bld('arcade'); for (let i = 0; i < 6; i++) box(0.3, 0.3, 0.1, M(['#ff4fd8', '#22d3ee', '#facc15'][i % 3], { emissive: ['#9d174d', '#0e7490', '#a16207'][i % 3] }), g, b.x0 + 2 + i * 2, 4.2, b.z1 + 0.1); }
  // Cafe patio
  { const b = W.bld('cafe'); [[-35.5, -4.9], [-31, -4.9]].forEach((q) => { void q; });
    [[b.x0 + 2.5, b.z1 + 2.2], [b.x1 - 2.5, b.z1 + 2.2]].forEach((q) => { const t = grp(g, q[0], 0, q[1]); cyl(0.5, 0.06, '#f8fafc', t, 0, 0.75, 0); cyl(0.05, 0.75, '#374151', t, 0, 0.37, 0); cyl(0.05, 2.2, '#9ca3af', t, 0, 1.1, 0); const u = mesh(G.cone, '#f97316', t, 0, 2.3, 0, 1.3, 0.5, 1.3); void u; obsC(A, q[0], q[1], 0.6); }); }
  // Grocery fruit stands
  { const b = W.bld('grocery'); [b.x0 + 2.5, b.x1 - 2.5].forEach((x, i) => { const s = grp(g, x, 0, b.z0 - 1.3); box(2, 0.8, 1, '#a16207', s, 0, 0.4, 0); for (let k = 0; k < 8; k++) sph(0.15, i ? '#ef4444' : '#facc15', s, -0.75 + (k % 4) * 0.5, 0.9, (k > 3 ? 0.2 : -0.2)); obsB(A, x - 1, x + 1, b.z0 - 1.8, b.z0 - 0.8); }); }
  // Boutique mannequins in window
  { const b = W.bld('boutique'); [b.x0 + 2.4, b.x1 - 2.4].forEach((x, i) => { const m = MD.avatar({ skin: '#f5f5f4', hair: 'buzz', hc: '#f5f5f4', top: i ? 'dress' : 'jacket', tc: i ? '#f472b6' : '#8b5cf6', bc: '#1f2937' }); m.g.position.set(x, 0, b.z0 - 0.7); m.g.rotation.y = Math.PI; g.add(m.g); obsC(A, x, b.z0 - 0.7, 0.4); }); }
  // Pet store paw
  { const b = W.bld('petstore'); const p = signPlane('\uD83D\uDC3E', 1.4, 1.4, '#f59e0b'); p.position.set(b.x1 - 1.4, 3.6, b.z1 + 0.1); g.add(p); }
  // Museum columns + steps
  { const b = W.bld('museum'); for (let i = -2; i <= 2; i++) if (i) cyl(0.32, 5.4, '#e7e5e4', g, b.cx + i * 2.4, 2.7, b.z1 + 0.9); box(13, 0.4, 2.2, '#d6d3d1', g, b.cx, 5.6, b.z1 + 0.9); ground(A, 12, 3, '#e7e5e4', b.cx, b.z1 + 1.6, 0.1); const gm = signPlane('\uD83D\uDC8E', 1.3, 1.3, '#a16207'); gm.position.set(b.cx, 7.4, b.z1 + 0.1); g.add(gm); }
  // Jeweler sparkle sign
  { const b = W.bld('jewelry'); const r = signPlane('\uD83D\uDC8D', 1.2, 1.2, '#a21caf'); r.position.set(b.x1 - 1.2, 3.6, b.z1 + 0.1); g.add(r); }
  // Shelter: fenced yard + van parking
  { const b = W.bld('shelter'); const p = signPlane('\uD83D\uDC3E', 1.4, 1.4, '#65a30d'); p.position.set(b.x0 + 1.4, 3.6, b.z1 + 0.1); g.add(p); ground(A, 7, 4, '#9ca3af', b.x1 - 3.5, b.z1 + 2.4, 0.095); W.shelterPark = [b.x1 - 3.5, b.z1 + 2.6, Math.PI / 2]; const vk = hot(A, { id: 'acstart', kind: 'work', career: 'animalcontrol', x: b.x1 - 3.5, z: b.z1 + 2.6, reach: 2.6, name: 'Animal Control Van', label: 'START SHIFT' }); marker(A, vk, '\uD83D\uDE90 ANIMAL CONTROL \u00b7 START SHIFT', 'rgba(77,124,15,.92)', 2.6); }
  // Clinic: red cross
  { const b = W.bld('clinic'); box(1.8, 0.5, 0.2, M('#ef4444', { emissive: '#7f1d1d' }), g, b.cx + 3, 3.8, b.z0 - 0.15); box(0.5, 1.8, 0.2, M('#ef4444', { emissive: '#7f1d1d' }), g, b.cx + 3, 3.8, b.z0 - 0.15); }
  // Pawn: neon hat + shady awning
  { const b = W.bld('hanks'); const t = signPlane('\u2B50 5 STARS', 2.2, 0.6, '#1d4ed8'); t.position.set(b.cx, 4.2, b.z0 - 0.12); t.rotation.y = Math.PI; g.add(t); ground(A, 6, 4.5, '#6b7280', b.cx, b.z0 - 3.4, 0.095); W.shopPark = W.shopPark || {}; W.shopPark.hanks = [b.cx - 1.5, b.z0 - 3.6, -Math.PI / 2]; }
  { const b = W.bld('steves'); const t = signPlane('MOSTLY FIXED!', 2.6, 0.6, '#b45309'); t.position.set(b.cx, 4.2, b.z1 + 0.12); g.add(t); ground(A, 6, 4.5, '#78716c', b.cx, b.z1 + 3.4, 0.095); for (let i = 0; i < 3; i++) cyl(0.42, 0.28, '#1f2937', g, b.x0 + 0.8, 0.15 + i * 0.28, b.z1 + 1.6); obsC(A, b.x0 + 0.8, b.z1 + 1.6, 0.45); W.shopPark = W.shopPark || {}; W.shopPark.steves = [b.cx + 1.5, b.z1 + 3.6, Math.PI / 2]; }
  { const b = W.bld('pawn'); const ht = signPlane('\uD83C\uDFA9', 1.2, 1.2, '#44403c'); ht.position.set(b.x0 + 1.4, 3.6, b.z0 - 0.1); ht.rotation.y = Math.PI; g.add(ht); }
  // hiding spots: big leafy hedges you can duck into when you\u2019re in trouble (also fun for hide & seek)
  W.hides = [];
  [[-24, -24, 'Alley Hedge'], [16, -24, 'Civic Hedge'], [-9.5, 17, 'Park Hedge'], [-41.5, 41.5, 'Corner Hedge'], [25.5, 24.5, 'Hospital Hedge'], [-57.5, -30, 'West Hedge'], [57.5, 30, 'East Hedge'], [2, -76.5, 'Back Lot Hedge'], [-55, 73.5, 'Pawn Shop Hedge'], [36, -2.5, 'Parking Hedge']].forEach((q, i) => {
    const f = W.freeNear(A, q[0], q[1], 1.1); MD.bush(g, f[0], f[1], 1.5); obsC(A, f[0], f[1], 0.8);
    const h = hot(A, { id: 'hide' + i, kind: 'hide', x: f[0], z: f[1] + 1.4, hx: f[0], hz: f[1], reach: 1.6, name: q[2], label: 'HIDE' }); W.hides.push(h);
  });
  // basketball hoop in the park
  { const hp = grp(g, -17, 0, 10); cyl(0.09, 3, '#64748b', hp, 0, 1.5, 0); box(1.4, 0.9, 0.08, '#f8fafc', hp, 0, 3.1, 0.25); const rg = mesh(G.torus || G.ring || G.cyl, '#f97316', hp, 0, 2.75, 0.55, 0.28, 0.28, 0.28); rg.rotation.x = Math.PI / 2; obsC(A, -17, 10, 0.25); ground(A, 6, 5, '#f59e0b', -17, 12.6, 0.105);
    hot(A, { id: 'hoops', kind: 'play', play: 'hoops', x: -17, z: 13.2, reach: 1.8, name: 'Basketball Hoop', label: 'SHOOT' }); }
}
function buildPark(A) {
  const g = A.g;
  // paths
  ground(A, 34, 3, '#e7d7b5', -24, 24, 0.1); ground(A, 3, 34, '#e7d7b5', -24, 24, 0.101);
  const gate = signPlane('MAPLE PARK', 4.5, 1, '#16a34a'); gate.position.set(-24, 3.2, 7.2); gate.rotation.y = Math.PI; g.add(gate); [-26.5, -21.5].forEach((x) => { cyl(0.2, 3.6, '#166534', g, x, 1.8, 7.2); obsC(A, x, 7.2, 0.25); });
  // fountain
  const fo = grp(g, -24, 0, 24); cyl(2.6, 0.6, '#94a3b8', fo, 0, 0.3, 0); const wt = cyl(2.25, 0.08, '#60a5fa', fo, 0, 0.58, 0); dyn(wt); W.fountainWater = wt; cyl(0.35, 1.5, '#cbd5e1', fo, 0, 0.8, 0); cyl(0.9, 0.18, '#94a3b8', fo, 0, 1.5, 0);
  obsC(A, -24, 24, 2.6); hot(A, { id: 'fountain', kind: 'fountain', x: -24, z: 27.3, reach: 1.8, name: 'Wishing Fountain', label: 'WISH' });
  // playground
  ground(A, 13, 10, '#f2d59a', -33, 14.5, 0.105);
  MD.slide(g, -36.5, 14, 0); obsB(A, -37.1, -35.9, 12.3, 16.3);
  const sw = MD.swings(g, -30, 11.5, 0); dyn(sw); W.swings = sw; obsB(A, -31.8, -28.2, 11.2, 11.8);
  const ss = MD.seesaw(g, -30, 17.5); dyn(ss); W.seesaw = ss; obsB(A, -31.7, -28.3, 17.3, 17.7);
  hot(A, { id: 'slide', kind: 'play', play: 'slide', x: -36.5, z: 17.2, reach: 1.8, name: 'Slide', label: 'SLIDE' });
  hot(A, { id: 'swing', kind: 'play', play: 'swing', x: -30, z: 13.2, reach: 1.8, name: 'Swings', label: 'SWING' });
  hot(A, { id: 'seesaw', kind: 'play', play: 'seesaw', x: -30, z: 19.2, reach: 1.8, name: 'Seesaw', label: 'PLAY' });
  // pond with ducks
  const pond = cyl(5.2, 0.06, '#38bdf8', g, -15, 0.12, 33); pond.scale.z = 0.72; cyl(5.7, 0.05, '#a3a38a', g, -15, 0.1, 33).scale.z = 0.76; obsB(A, -19.8, -10.2, 29.8, 36.2);
  W.ducks = []; for (let i = 0; i < 3; i++) { const d = grp(g, -15 + i, 0.15, 33); dyn(d); ell(0.22, 0.16, 0.3, '#fef08a', d, 0, 0.12, 0); sph(0.12, '#fef08a', d, 0, 0.3, 0.2); cone(0.05, 0.12, '#f97316', d, 0, 0.28, 0.34).rotation.x = Math.PI / 2; W.ducks.push(d); }
  hot(A, { id: 'pond', kind: 'pond', x: -15, z: 28.4, reach: 2, name: 'Duck Pond', label: 'FEED' });
  // stage
  const st = grp(g, -36.5, 0, 31.5); box(6, 1, 10, '#7c3aed', st, 0, 0.5, 0); box(0.4, 5, 10, '#4c1d95', st, -3, 2.5, 0); box(6.4, 0.4, 10.4, '#ff4fd8', st, 0, 5.1, 0);
  [-4, 0, 4].forEach((z) => sph(0.3, M('#fde047', { emissive: '#a16207' }), st, 2.6, 4.8, z)); const sg = signPlane('STARLIGHT STAGE', 6, 1, '#ff4fd8'); sg.position.set(-2.75, 4.2, 0); sg.rotation.y = Math.PI / 2; st.add(sg);
  obsB(A, -39.5, -33.5, 26.5, 36.5); hot(A, { id: 'stage', kind: 'work', career: 'popstar', x: -32, z: 31.5, reach: 2.2, name: 'Starlight Stage', label: 'PERFORM' });
  marker(A, { x: -36.5, z: 31.5 }, '\uD83C\uDFA4 STARLIGHT STAGE', 'rgba(124,58,237,.92)', 7);
  // benches + flowers
  W.benches = [];
  [[-29, 27.5, Math.PI], [-19, 27.5, Math.PI], [-29, 20.5, 0], [-19, 20.5, 0], [-12, 14, -Math.PI / 2]].forEach((q, i) => { MD.bench(g, q[0], q[1], q[2]); const fz = Math.cos(q[2]), fx = Math.sin(q[2]); obsB(A, q[0] - (Math.abs(fx) > 0.5 ? 0.3 : 0.9), q[0] + (Math.abs(fx) > 0.5 ? 0.3 : 0.9), q[1] - (Math.abs(fz) > 0.5 ? 0.3 : 0.9), q[1] + (Math.abs(fz) > 0.5 ? 0.3 : 0.9));
    hot(A, { id: 'bench' + i, kind: 'sit', x: q[0] + fx * 0.9, z: q[1] + fz * 0.9, sx: q[0] + fx * 0.15, sz: q[1] + fz * 0.15, yaw: q[2], reach: 1.4, name: 'Park Bench', label: 'SIT' }); W.benches.push(q); });
  [[-37, 9], [-12, 9], [-12, 22], [-37, 23], [-26, 38], [-9, 39]].forEach((q) => MD.flowers(g, q[0], q[1]));
}

/* ---------------- Maple Street: 8 lots (4 for sale, 4 neighbours) ---------------- */
const ROOF = new T.ConeGeometry(Math.SQRT2, 1, 4); ROOF.rotateY(Math.PI / 4);
function roofOn(g, w, d, rh, y, col) { const m = mesh(ROOF, col, g, 0, y + rh / 2, 0, w / 2 + 0.45, rh, d / 2 + 0.45); return m; }
function houseModel(type, wall, roof) {
  const g = new T.Group(); let w, d;
  const front = (dd) => -dd / 2 - 0.06;
  switch (type) {
    case 'villa': {
      w = 9.5; d = 8;
      box(w, 3.2, d, wall || '#f8fafc', g, 0, 1.6, 0); box(w + 0.4, 0.25, d + 0.4, '#334155', g, 0, 3.3, 0);
      box(6.5, 3, 6, '#e5e7eb', g, -1.3, 4.9, 0.6); box(6.9, 0.25, 6.4, '#334155', g, -1.3, 6.5, 0.6);
      mesh(G.box, W.winMat, g, 2.1, 1.7, front(d), 4.2, 2.4, 0.08); mesh(G.box, W.winMat, g, -1.3, 4.9, -2.45, 5.8, 1.6, 0.08);
      box(5, 0.1, 2.8, '#38bdf8', g, 0, 0.14, d / 2 + 2.6); box(5.6, 0.12, 3.4, '#e5e7eb', g, 0, 0.1, d / 2 + 2.6);
      box(1.3, 2.4, 0.15, '#1f2937', g, -2.5, 1.2, front(d)); break;
    }
    case 'family': {
      w = 8.5; d = 7; box(w, 6, d, wall || '#bfdbfe', g, 0, 3, 0); roofOn(g, w, d, 2.6, 6, roof || '#1e40af');
      [-2.6, 2.6].forEach((x) => { windowOn(g, x, 1.8, front(d), 1.5, 1.2); windowOn(g, x, 4.5, front(d), 1.5, 1.2); }); windowOn(g, 0, 4.5, front(d), 1.2, 1.1);
      box(0.8, 2, 0.8, '#7f1d1d', g, 2.6, 7.6, 1.5); box(1.3, 2.3, 0.15, '#7c2d12', g, 0, 1.15, front(d)); box(3, 0.15, 1.4, roof || '#1e40af', g, 0, 2.7, -d / 2 - 0.7); break;
    }
    case 'bungalow': {
      w = 8; d = 6.5; box(w, 3, d, wall || '#fef08a', g, 0, 1.5, 0); roofOn(g, w, d, 1.7, 3, roof || '#c2410c');
      [-2.6, 2.6].forEach((x) => windowOn(g, x, 1.7, front(d), 1.6, 1.1)); box(w, 0.18, 1.8, roof || '#c2410c', g, 0, 2.9, -d / 2 - 0.9);
      [-3.6, 3.6].forEach((x) => cyl(0.1, 2.9, '#fff', g, x, 1.45, -d / 2 - 1.6)); box(1.3, 2.3, 0.15, '#7c2d12', g, 0, 1.15, front(d)); break;
    }
    case 'grump': {
      w = 6.5; d = 5.5; box(w, 3, d, wall || '#a8a29e', g, 0, 1.5, 0); roofOn(g, w, d, 1.8, 3, roof || '#57534e');
      windowOn(g, -1.8, 1.7, front(d), 1.3, 1); box(1.5, 0.15, 0.08, '#78350f', g, -1.8, 1.7, front(d) - 0.05).rotation.z = 0.3; box(1.2, 2.2, 0.15, '#44403c', g, 1, 1.1, front(d)); break;
    }
    default: { // cottage
      w = 7; d = 6; box(w, 3.2, d, wall || '#fbcfe8', g, 0, 1.6, 0); roofOn(g, w, d, 2.4, 3.2, roof || '#db2777');
      [-2.2, 2.2].forEach((x) => { windowOn(g, x, 1.8, front(d), 1.4, 1.1); box(1.5, 0.3, 0.35, '#a16207', g, x, 1.1, front(d) - 0.15); for (let i = 0; i < 4; i++) sph(0.1, ['#f472b6', '#facc15'][i % 2], g, x - 0.5 + i * 0.33, 1.3, front(d) - 0.15); });
      box(0.7, 1.6, 0.7, '#9a3412', g, -2, 5.0, 1); box(1.3, 2.3, 0.15, '#7c2d12', g, 0, 1.15, front(d)); break;
    }
  }
  return { g, w, d };
}
W.houseModel = houseModel;
const NPC_LOTS = { 1: { type: 'cottage', npc: 'gladys', wall: '#ddd6fe', roof: '#7c3aed', name: 'Gladys' }, 3: { type: 'bungalow', npc: 'rosa', wall: '#fef3c7', roof: '#ea580c', name: 'Rosa' },
  4: { type: 'grump', npc: 'grumble', name: 'Grumbleton' }, 6: { type: 'cottage', npc: 'joe', wall: '#bbf7d0', roof: '#15803d', name: 'Grandpa Joe' } };
W.NPC_LOTS = NPC_LOTS;
function buildMaple(A) {
  const g = A.g; W.lots = [];
  ground(A, 104, 26, '#86d86f', 0, 67.5, 0.06);
  GL.LOTS.forEach((lx, i) => {
    // driveway + path + mailbox + fences
    ground(A, 2.8, 12, '#6b7280', lx + 4.5, 58.5, 0.097); ground(A, 1.4, 5, '#e7d7b5', lx - 1.5, 57.5, 0.095);
    MD.mailbox(g, lx - 4.5, 56.2, ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'][i % 4]); obsC(A, lx - 4.5, 56.2, 0.2);
    MD.fence(g, lx + 6, 63, lx + 6, 79); obsB(A, lx + 5.9, lx + 6.1, 63, 79);
    if (i === 0) { MD.fence(g, lx - 6, 63, lx - 6, 79); obsB(A, lx - 6.1, lx - 5.9, 63, 79); }
    MD.fence(g, lx - 6, 79, lx + 6, 79); obsB(A, lx - 6, lx + 6, 78.9, 79.1);
    MD.tree(g, lx - 4.5, 75, 1.1); obsC(A, lx - 4.5, 75, 0.45); MD.flowers(g, lx + 2.5, 57); MD.flowers(g, lx - 4, 59);
    const L = { i, x: lx, g: dyn(grp(g)), obs: obsB(A, 0, 0, 0, 0, 'house'), npc: NPC_LOTS[i] ? NPC_LOTS[i].npc : null, info: null };
    L.hot = hot(A, { id: 'lot' + i, kind: L.npc ? 'knock' : 'house', lot: i, npc: L.npc, x: lx - 1.5, z: 58.6, reach: 2.0, name: L.npc ? NPC_LOTS[i].name + '\u2019s House' : 'House', label: L.npc ? 'KNOCK' : 'LOOK' });
    L.drive = [lx + 4.5, 60.5, Math.PI];
    W.lots.push(L);
    if (L.npc) W.setLot(i, { type: NPC_LOTS[i].type, wall: NPC_LOTS[i].wall, roof: NPC_LOTS[i].roof, label: NPC_LOTS[i].name });
    else W.setLot(i, null);
  });
  // Grumbleton's KEEP OUT sign + Joe's rocking chair
  const ko = signPlane('KEEP OUT!', 2, 0.6, '#dc2626'); ko.position.set(GL.LOTS[4] + 2.6, 1.3, 56.5); ko.rotation.y = Math.PI; g.add(ko); cyl(0.05, 1, '#78350f', g, GL.LOTS[4] + 2.6, 0.5, 56.55);
  const bw = signPlane('BEWARE OF BRUTUS', 2.4, 0.5, '#ea580c'); bw.position.set(GL.LOTS[4] - 4, 1.2, 62.8); bw.rotation.y = Math.PI; g.add(bw);
}
// info: null (vacant, for sale) | { type, owner name, wall, roof, label }
W.setLot = function (i, info) {
  const L = W.lots[i]; if (!L) return; L.info = info;
  while (L.g.children.length) L.g.remove(L.g.children[0]);
  const saleType = Object.keys(GL.HOUSES).find((k) => GL.HOUSES[k].lot === i);
  const type = info ? info.type : saleType;
  const hm = houseModel(type, info && info.wall, info && info.roof); hm.g.position.set(L.x - 1.5, 0, 60 + hm.d / 2); L.g.add(hm.g);
  L.obs.x0 = L.x - 1.5 - hm.w / 2; L.obs.x1 = L.x - 1.5 + hm.w / 2; L.obs.z0 = 60; L.obs.z1 = 60 + hm.d; W.areas.town.grid = null;
  L.type = type;
  const post = grp(L.g, L.x + 1.4, 0, 56.4); cyl(0.06, 1.6, '#78350f', post, 0, 0.8, 0);
  let txt, col;
  if (!info) { const H = GL.HOUSES[saleType]; txt = 'FOR SALE ' + GL.money(H.price) + (H.rent ? ' / RENT' : ''); col = '#dc2626'; L.hot.label = 'LOOK'; L.hot.name = H.name + ' (for sale)'; }
  else { txt = info.label ? info.label + '\u2019s' : 'Home'; col = info.npc === false ? '#7c3aed' : '#0f766e'; L.hot.label = L.npc ? 'KNOCK' : 'ENTER'; L.hot.name = info.label ? info.label + '\u2019s House' : 'House'; }
  const s = signPlane(txt, 2.6, 0.62, col); s.position.set(0, 1.75, 0); s.rotation.y = Math.PI; post.add(s);
};

/* ======================================================================
   Interiors
   ====================================================================== */
function room(id, w, d, floorTex, wallCol, o) {
  const A = newArea(id, Object.assign({ cam: { h: 9.5, d: 9 }, bg: '#2a1838' }, o)), g = A.g;
  const fl = new T.Mesh(G.box, new T.MeshLambertMaterial({ map: floorTex })); fl.scale.set(w, 0.1, d); fl.position.y = -0.05; g.add(fl); A.floorMesh = fl;
  A.wallMats = [M(wallCol), M(MD.shade(wallCol, -0.08))];
  A.wallMat = new T.MeshLambertMaterial({ color: wallCol }); A.wallMat2 = new T.MeshLambertMaterial({ color: MD.shade(wallCol, -0.08) });
  mesh(G.box, A.wallMat, g, 0, 1.6, -d / 2 - 0.15, w + 0.6, 3.2, 0.3);
  [-1, 1].forEach((s) => mesh(G.box, A.wallMat2, g, s * (w / 2 + 0.15), 1.6, 0, 0.3, 3.2, d + 0.3));
  box(w + 0.6, 0.3, 0.3, MD.shade(wallCol, -0.2), g, 0, 0.15, d / 2 + 0.15);
  box(w + 0.6, 0.2, 0.32, '#ffffff', g, 0, 3.2, -d / 2 - 0.15);
  rect(A, -w / 2, w / 2, -d / 2, d / 2 - 0.1);
  const mat = box(2, 0.03, 1, '#16a34a', g, 0, 0.015, d / 2 - 0.55); void mat;
  hot(A, { id: 'exit', kind: 'exit', x: 0, z: d / 2 - 0.6, reach: 1.4, name: 'Outside', label: 'EXIT' });
  const es = W.textSprite('\u2B07 EXIT', { size: 36, h: 0.48, bg: 'rgba(22,163,74,.95)' }); es.position.set(0, 1.2, d / 2 - 0.5); g.add(es);
  A.spawn = [0, d / 2 - 1.6]; A.w = w; A.d = d;
  for (let x = -w / 2 + 2.5; x < w / 2 - 1.5; x += 4.5) windowOn(g, x, 1.9, -d / 2 + 0.02, 1.6, 1.1);
  return A;
}
W.room = room;
function counter(A, x, z, w, d, col, top) { const g = A.g; box(w, 1.05, d, col, g, x, 0.53, z); box(w + 0.1, 0.08, d + 0.1, top || '#f8fafc', g, x, 1.09, z); obsB(A, x - w / 2, x + w / 2, z - d / 2, z + d / 2); }
function shelfUnit(A, x, z, w, ry, cols, solid) {
  const s = grp(A.g, x, 0, z); s.rotation.y = ry || 0;
  box(w, 2.1, 0.7, '#e5e7eb', s, 0, 1.05, 0);
  for (let r = 0; r < 3; r++) for (let i = 0; i < Math.floor(w / 0.42); i++) box(0.3, 0.38, 0.25, cols[(i + r) % cols.length], s, -w / 2 + 0.3 + i * 0.42, 0.45 + r * 0.62, 0.3);
  if (solid !== false) { const sw = Math.abs(Math.sin(ry || 0)) > 0.5; obsB(A, x - (sw ? 0.4 : w / 2), x + (sw ? 0.4 : w / 2), z - (sw ? w / 2 : 0.4), z + (sw ? w / 2 : 0.4)); }
  return s;
}
function furnAt(A, id, x, z, ry, sc, solid) { const m = MD.furn(id); m.position.set(x, 0, z); m.rotation.y = ry || 0; if (sc) m.scale.setScalar(sc); A.g.add(m); const f = GL.FURN[id]; if (f && solid !== false && f.solid) { const s = sc || 1, sw = Math.abs(Math.sin(ry || 0)) > 0.5, ww = (sw ? f.d : f.w) * s, dd = (sw ? f.w : f.d) * s; obsB(A, x - ww / 2, x + ww / 2, z - dd / 2, z + dd / 2); } return m; }
function seatHot(A, id, x, z, yaw, name) { const fx = Math.sin(yaw), fz = Math.cos(yaw); hot(A, { id, kind: 'sit', x: x + fx * 0.8, z: z + fz * 0.8, sx: x, sz: z, yaw, reach: 1.3, name: name || 'Chair', label: 'SIT' }); }
function label(A, text, x, y, z, col) { const s = W.textSprite(text, { size: 34, h: 0.45, bg: col || 'rgba(124,58,237,.9)' }); s.position.set(x, y, z); A.g.add(s); return s; }
const FOODCOLS = ['#ef4444', '#facc15', '#22c55e', '#f97316', '#3b82f6', '#a855f7', '#f472b6'];
function buildInteriors() {
  let A;
  // grocery
  A = room('grocery', 18, 12, tileTex('#f8fafc', '#dcfce7', 9, 6), '#ecfccb'); A.label = 'Fresh Mart';
  shelfUnit(A, -6, -5.4, 4, 0, FOODCOLS); shelfUnit(A, -1.5, -5.4, 4, 0, FOODCOLS.slice(2));
  shelfUnit(A, -6, -1.5, 4, 0, FOODCOLS); shelfUnit(A, -1.5, -1.5, 4, Math.PI, FOODCOLS);
  { const p = grp(A.g, 5, 0, -4.6); box(3, 0.8, 1.6, '#a16207', p, 0, 0.4, 0); for (let i = 0; i < 18; i++) sph(0.16, ['#ef4444', '#facc15', '#22c55e'][Math.floor(i / 6)], p, -1.2 + (i % 6) * 0.48, 0.9, -0.5 + Math.floor(i / 6) * 0.5); obsB(A, 3.5, 6.5, -5.4, -3.8); }
  counter(A, 6, 1.6, 1, 3, '#16a34a'); box(0.5, 0.4, 0.5, '#1f2937', A.g, 6, 1.3, 0.6);
  hot(A, { id: 'buy', kind: 'shop', shop: 'grocery', x: 4.6, z: 1.6, reach: 1.8, name: 'Checkout', label: 'BUY' });
  hot(A, { id: 'aisle', kind: 'shop', shop: 'grocery', x: -3.75, z: -3.5, reach: 2, name: 'Food Aisle', label: 'SHOP' });
  hot(A, { id: 'work', kind: 'work', career: 'clerk', x: 4.6, z: 4.2, reach: 1.6, name: 'Register (Shop Clerk)', label: 'WORK' });
  label(A, '\uD83D\uDED2 FRESH MART', 0, 3.0, -5.6, 'rgba(22,163,74,.92)');
  // boutique
  A = room('boutique', 16, 11, carpetTex('#fbcfe8', 4, 3), '#fdf2f8'); A.label = 'Coco\u2019s Boutique';
  [[-5, -0.5], [-1, -0.5], [-3, 2.5]].forEach((q, k) => { const r = grp(A.g, q[0], 0, q[1]); [-1.1, 1.1].forEach((x) => cyl(0.05, 1.7, '#9ca3af', r, x, 0.85, 0)); cyl(0.04, 2.3, '#9ca3af', r, 0, 1.65, 0).rotation.z = Math.PI / 2; for (let i = 0; i < 7; i++) box(0.12, 0.8, 0.5, GL.CLOTH_COLS[(i + k * 3) % 14], r, -0.9 + i * 0.3, 1.2, 0); obsB(A, q[0] - 1.2, q[0] + 1.2, q[1] - 0.35, q[1] + 0.35); });
  { const mr = grp(A.g, -5, 0, -5.3); box(1.6, 2.4, 0.12, '#facc15', mr, 0, 1.4, 0); box(1.4, 2.2, 0.05, M('#e0f2fe', { emissive: '#334155' }), mr, 0, 1.4, 0.07); obsB(A, -5.8, -4.2, -5.5, -5.1); }
  { const bo = grp(A.g, 6, 0, 2.5); box(2, 2.6, 0.1, '#db2777', bo, 0, 1.3, -1); box(0.1, 2.6, 2, '#db2777', bo, 1, 1.3, 0); box(0.08, 2.2, 1.8, '#f9a8d4', bo, -1, 1.4, 0); obsB(A, 5, 7.05, 1.5, 3.5); }
  counter(A, 4, -3.6, 3, 1, '#db2777');
  hot(A, { id: 'change', kind: 'boutique', x: -5, z: -4.1, reach: 1.8, name: 'Mirror & Fitting', label: 'TRY ON' });
  hot(A, { id: 'buy', kind: 'boutique', x: 4, z: -2.4, reach: 1.7, name: 'Boutique Counter', label: 'SHOP' });
  label(A, '\uD83D\uDC57 COCO\u2019S BOUTIQUE', 0, 3.0, -5.1, 'rgba(219,39,119,.92)');
  // cafe
  A = room('cafe', 16, 11, tileTex('#fff7ed', '#7c2d12', 8, 5.5), '#ffedd5'); A.label = 'Sunny Side Caf\u00e9';
  counter(A, 2, -2.8, 6, 1, '#ea580c', '#fde68a'); box(0.6, 0.7, 0.5, '#374151', A.g, 4.2, 1.45, -2.9); box(1.4, 0.5, 0.7, M('#e0f2fe', { transparent: true, opacity: 0.6 }), A.g, 0.6, 1.35, -2.8);
  for (let i = 0; i < 4; i++) sph(0.12, ['#f472b6', '#a16207', '#facc15', '#fb923c'][i], A.g, 0.1 + i * 0.32, 1.25, -2.8);
  furnAt(A, 'stove', -5.5, -5, 0); furnAt(A, 'fridge', -3.8, -5, 0); box(1.5, 0.9, 0.8, '#d6d3d1', A.g, -6.9, 0.45, -5); obsB(A, -7.7, -6.1, -5.4, -4.6);
  [[-4.5, 2], [0, 2.6], [4.5, 2]].forEach((q, i) => { const t = grp(A.g, q[0], 0, q[1]); cyl(0.6, 0.06, '#f8fafc', t, 0, 0.78, 0); cyl(0.07, 0.78, '#374151', t, 0, 0.39, 0); obsC(A, q[0], q[1], 0.65); furnAt(A, 'chair', q[0] - 1.1, q[1], Math.PI / 2, 0.9, false); furnAt(A, 'chair', q[0] + 1.1, q[1], -Math.PI / 2, 0.9, false); seatHot(A, 'seat' + i + 'a', q[0] - 1.1, q[1], Math.PI / 2, 'Caf\u00e9 Chair'); seatHot(A, 'seat' + i + 'b', q[0] + 1.1, q[1], -Math.PI / 2, 'Caf\u00e9 Chair'); });
  hot(A, { id: 'order', kind: 'shop', shop: 'cafe', x: 2, z: -1.6, reach: 1.8, name: 'Caf\u00e9 Counter', label: 'ORDER' });
  hot(A, { id: 'work', kind: 'work', career: 'chef', x: -4.6, z: -3.4, reach: 1.6, name: 'Kitchen (Chef)', label: 'WORK' });
  label(A, '\u2615 SUNNY SIDE CAF\u00c9', 2, 3.0, -5.1, 'rgba(234,88,12,.92)');
  // bank
  A = room('bank', 14, 10, tileTex('#f1f5f9', '#e2e8f0', 7, 5), '#e2e8f0'); A.label = 'Grok Bank';
  counter(A, 0, -2.6, 8, 1.1, '#1e40af', '#f8fafc'); mesh(G.box, M('#bae6fd', { transparent: true, opacity: 0.4 }), A.g, 0, 1.8, -2.6, 8, 1.3, 0.05);
  { const v = cyl(1.3, 0.3, '#94a3b8', A.g, 4.5, 1.6, -4.85); v.rotation.x = Math.PI / 2; cyl(0.3, 0.4, '#64748b', A.g, 4.5, 1.6, -4.7).rotation.x = Math.PI / 2; }
  { const atm = grp(A.g, -5.6, 0, -4.4); box(1, 2, 0.6, '#1e40af', atm, 0, 1, 0); box(0.7, 0.5, 0.05, M('#38bdf8', { emissive: '#0c4a6e' }), atm, 0, 1.4, 0.31); obsB(A, -6.1, -5.1, -4.7, -4.1); }
  hot(A, { id: 'bank', kind: 'bank', x: 0, z: -1.3, reach: 1.8, name: 'Bank Teller', label: 'BANK' });
  label(A, '\uD83C\uDFE6 GROK BANK', 0, 3.0, -4.6, 'rgba(30,64,175,.92)');
  // city hall
  A = room('cityhall', 18, 12, tileTex('#f8fafc', '#cbd5e1', 9, 6), '#f1f5f9'); A.label = 'City Hall';
  { const jb = grp(A.g, -5, 0, -5.85); box(4.4, 2.4, 0.15, '#a16207', jb, 0, 1.7, 0); box(4.1, 2.1, 0.05, '#fde68a', jb, 0, 1.7, 0.08); for (let i = 0; i < 9; i++) box(0.8, 0.55, 0.03, GL.CAREERS[GL.CAREER_ORDER[i]].col, jb, -1.5 + (i % 3) * 1.5, 2.35 - Math.floor(i / 3) * 0.65, 0.12); }
  hot(A, { id: 'jobs', kind: 'jobs', x: -5, z: -4.4, reach: 2, name: 'Job Board', label: 'JOBS' });
  counter(A, 1.5, -3.6, 2.8, 1, '#7c2d12', '#a16207'); [-0.6, 3.6].forEach((x) => { cyl(0.04, 2.6, '#d4d4d8', A.g, x, 1.3, -5.3); box(0.9, 0.6, 0.03, x < 0 ? '#ff4fd8' : '#38bdf8', A.g, x + 0.45, 2.3, -5.3); });
  box(2.2, 0.02, 8, '#dc2626', A.g, 1.5, 0.012, 1.2);
  counter(A, 7, -0.5, 1, 2.8, '#0f766e'); const ho = signPlane('HOUSING OFFICE', 2.6, 0.5, '#0f766e'); ho.position.set(8.84, 2.3, -0.5); ho.rotation.y = -Math.PI / 2; A.g.add(ho);
  hot(A, { id: 'realtor', kind: 'realtor', x: 5.6, z: -0.5, reach: 1.8, name: 'Housing Office', label: 'HOMES' });
  furnAt(A, 'plant', -8.2, -5.3, 0); furnAt(A, 'plant', 8.2, -5.3, 0);
  label(A, '\uD83C\uDFDB\uFE0F CITY HALL', 1.5, 3.0, -5.6, 'rgba(71,85,105,.92)'); label(A, '\uD83D\uDCCB JOB BOARD', -5, 3.3, -5.4, 'rgba(161,98,7,.92)');
  // furniture store
  A = room('furniture', 18, 12, woodTex('#e2b47a', '#d9a868', 6, 4), '#ede9fe'); A.label = 'Cozy Home Furniture';
  furnAt(A, 'sofa', -5.5, -4.6, 0); furnAt(A, 'tv', -5.5, -1.6, Math.PI); furnAt(A, 'bed', 0.5, -4.4, 0); furnAt(A, 'piano', -6, 2.4, Math.PI / 2); furnAt(A, 'lamp', -2.5, -5.2, 0); furnAt(A, 'plant', 2.6, 1.6, 0); furnAt(A, 'aquarium', 1, 0.8, 0); furnAt(A, 'rug', -5.5, -3, 0, 1, false);
  counter(A, 5.5, -4, 3, 1, '#7c3aed');
  { const pw = grp(A.g, 7.5, 0, 1.5); box(0.15, 2.4, 3.6, '#f8fafc', pw, 0.9, 1.4, 0); GL.WALLS.forEach((c, i) => box(0.05, 0.5, 0.5, c, pw, 0.8, 0.8 + Math.floor(i / 5) * 0.7, -1.2 + (i % 5) * 0.6)); }
  hot(A, { id: 'buy', kind: 'shop', shop: 'furn', x: 5.5, z: -2.7, reach: 1.8, name: 'Furniture Counter', label: 'SHOP' });
  hot(A, { id: 'paint', kind: 'paint', x: 7, z: 1.5, reach: 1.8, name: 'Paint & Floors', label: 'PAINT' });
  label(A, '\uD83D\uDECB\uFE0F COZY HOME', 0, 3.0, -5.6, 'rgba(124,58,237,.92)');
  // pet store + vet
  A = room('petstore', 16, 12, tileTex('#fefce8', '#fef3c7', 8, 6), '#fef9c3'); A.label = 'Paws & Claws';
  counter(A, 3.5, -4, 3, 1, '#f59e0b'); shelfUnit(A, -4.5, -5.5, 4, 0, ['#a16207', '#f97316', '#22c55e', '#38bdf8']);
  { const pen = grp(A.g, 5.2, 0, 2.2); box(4.6, 0.04, 3.6, '#bbf7d0', pen, 0, 0.02, 0); MD.fence(pen, -2.3, -1.8, 2.3, -1.8, '#fbcfe8'); MD.fence(pen, -2.3, -1.8, -2.3, 1.8, '#fbcfe8'); MD.fence(pen, -2.3, 1.8, 2.3, 1.8, '#fbcfe8'); obsB(A, 2.9, 7.5, 0.4, 4.0); A.pen = dyn(grp(A.g, 5.2, 0, 2.2)); label(A, 'ADOPT ME!', 5.2, 1.8, 0.3, 'rgba(245,158,11,.92)'); }
  { const vt = grp(A.g, -4.5, 0, 2.5); box(2.2, 0.9, 1.1, '#e0f2fe', vt, 0, 0.45, 0); box(2.3, 0.08, 1.2, '#38bdf8', vt, 0, 0.92, 0); obsB(A, -5.6, -3.4, 1.95, 3.05); const cr = signPlane('VET', 1.2, 0.5, '#0ea5e9'); cr.position.set(0, 2.4, 1.5); vt.add(cr); }
  hot(A, { id: 'adopt', kind: 'adopt', x: 3.5, z: -2.7, reach: 1.8, name: 'Adoption Counter', label: 'ADOPT' });
  hot(A, { id: 'shop', kind: 'shop', shop: 'pet', x: -4.5, z: -4.2, reach: 1.8, name: 'Pet Supplies', label: 'SHOP' });
  hot(A, { id: 'work', kind: 'work', career: 'vet', x: -4.5, z: 1.1, reach: 1.6, name: 'Exam Table (Vet)', label: 'WORK' });
  label(A, '\uD83D\uDC3E PAWS & CLAWS', 0, 3.0, -5.6, 'rgba(245,158,11,.92)');
  // hospital
  A = room('hospital', 18, 12, tileTex('#f8fafc', '#e0f2fe', 9, 6), '#f0f9ff'); A.label = 'Maple Hospital';
  counter(A, 0, -3, 4, 1, '#38bdf8');
  [-3, 0, 3].forEach((z) => { const b = furnAt(A, 'bed', 7.3, z, -Math.PI / 2, 0.9); void b; });
  [-7.5, -6.5, -5.5].forEach((x) => { furnAt(A, 'chair', x, 2.5, 0, 1, false); }); obsB(A, -7.9, -5.1, 2.1, 2.9);
  hot(A, { id: 'clinic', kind: 'clinic', x: 0, z: -1.8, reach: 1.8, name: 'Check-up Desk', label: 'CHECK-UP' });
  hot(A, { id: 'work', kind: 'work', career: 'doctor', x: 4.8, z: 0, reach: 1.7, name: 'Patient Ward (Doctor)', label: 'WORK' });
  label(A, '\uD83C\uDFE5 MAPLE HOSPITAL', 0, 3.0, -5.6, 'rgba(220,38,38,.92)');
  // school
  A = room('school', 18, 12, woodTex('#e8c592', '#ddb57c', 6, 4), '#fef3c7'); A.label = 'Maple School';
  { box(6, 2, 0.1, '#14532d', A.g, 0.5, 1.7, -5.92); box(6.3, 2.3, 0.08, '#a16207', A.g, 0.5, 1.7, -5.96); const t = signPlane('2 + 2 = 4 \u2713', 3, 0.7, '#14532d'); t.position.set(0.5, 1.9, -5.85); A.g.add(t); }
  counter(A, -5, -3.6, 2.4, 1, '#a16207');
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const x = -2.5 + c * 3.5, z = 0 + r * 2.6; box(1.2, 0.08, 0.8, '#d97706', A.g, x, 0.72, z); [-0.5, 0.5].forEach((q) => box(0.06, 0.7, 0.7, '#78350f', A.g, x + q, 0.36, z)); furnAt(A, 'chair', x, z + 0.8, Math.PI, 0.8, false); obsB(A, x - 0.65, x + 0.65, z - 0.45, z + 1.1); }
  hot(A, { id: 'work', kind: 'work', career: 'teacher', x: 0.5, z: -4.2, reach: 1.8, name: 'Blackboard (Teacher)', label: 'WORK' });
  label(A, '\uD83C\uDFEB MAPLE SCHOOL', 0.5, 3.1, -5.5, 'rgba(185,28,28,.92)');
  // garage
  A = room('garage', 16, 12, tileTex('#d6d3d1', '#a8a29e', 8, 6), '#e7e5e4'); A.label = 'Marco\u2019s Garage';
  { const lift = grp(A.g, -0.5, 0, -1.5); box(0.4, 1.2, 0.4, '#facc15', lift, -1.2, 0.6, 0); box(0.4, 1.2, 0.4, '#facc15', lift, 1.2, 0.6, 0); box(2.8, 0.15, 4.4, '#ca8a04', lift, 0, 1.2, 0); const car = MD.car('compact', '#38bdf8'); car.g.position.y = 1.27; lift.add(car.g); obsB(A, -2, 1, -3.8, 0.8); }
  { box(1.6, 1.2, 0.7, '#dc2626', A.g, -6.6, 0.6, -5.3); for (let i = 0; i < 3; i++) box(1.5, 0.05, 0.6, '#991b1b', A.g, -6.6, 0.4 + i * 0.35, -4.94); obsB(A, -7.4, -5.8, -5.7, -4.9); for (let i = 0; i < 4; i++) cyl(0.45, 0.3, '#1f2937', A.g, 6.8, 0.15 + i * 0.3, -5); obsC(A, 6.8, -5, 0.5); }
  hot(A, { id: 'work', kind: 'work', career: 'mechanic', x: 2.4, z: 1.6, reach: 1.7, name: 'Car Lift (Mechanic)', label: 'WORK' });
  hot(A, { id: 'repaint', kind: 'repaint', x: -5, z: -3.6, reach: 1.8, name: 'Paint Shop', label: 'REPAINT' });
  label(A, '\uD83D\uDD27 MARCO\u2019S GARAGE', 0, 3.0, -5.6, 'rgba(15,118,110,.92)');
  // car dealership
  A = room('dealer', 22, 14, tileTex('#f8fafc', '#e0f2fe', 11, 7), '#e0f2fe', { cam: { h: 11, d: 10.5 } }); A.label = 'Sal\u2019s Cars'; A.disp = [];
  const spots = [[-7.5, -3.6], [-2.5, -3.6], [2.5, -3.6], [7.5, -3.6], [-5, 2.0], [0, 2.0], [5, 2.0]];
  GL.CAR_ORDER.forEach((id, i) => { const p = spots[i], pl = cyl(2.1, 0.15, '#cbd5e1', A.g, p[0], 0.075, p[1]); void pl; const holder = dyn(grp(A.g, p[0], 0.15, p[1])); const car = MD.car(id, GL.CAR_COLS[(i * 3) % 12]); car.g.rotation.y = 0.6; holder.add(car.g); A.disp.push(holder); obsC(A, p[0], p[1], 2.1);
    hot(A, { id: 'car_' + id, kind: 'dealer', car: id, x: p[0], z: p[1] + 2.6, reach: 1.4, name: GL.CARS[id].name, label: 'LOOK' }); });
  hot(A, { id: 'buy', kind: 'dealer', x: 8.5, z: 5.2, reach: 1.8, name: 'Sales Desk', label: 'BUY CAR' }); counter(A, 9.8, 5.0, 1, 2.2, '#0284c7');
  label(A, '\uD83D\uDE97 SAL\u2019S CARS', 0, 3.0, -6.6, 'rgba(2,132,199,.92)');
  // fire station
  A = room('fire', 18, 12, tileTex('#e5e7eb', '#d1d5db', 9, 6), '#fee2e2'); A.label = 'Fire Station';
  { const t = MD.car('firetruck'); t.g.position.set(-3, 0, -2.5); t.g.rotation.y = Math.PI / 2; A.g.add(t.g); obsB(A, -6.3, 0.3, -3.7, -1.3); }
  for (let i = 0; i < 5; i++) { box(0.8, 2, 0.6, '#b91c1c', A.g, 2.5 + i * 0.9, 1, -5.6); } obsB(A, 2.1, 6.6, -5.9, -5.3);
  cyl(0.06, 3.2, '#d4d4d8', A.g, 7.6, 1.6, -2); obsC(A, 7.6, -2, 0.15);
  hot(A, { id: 'work', kind: 'work', career: 'fire', x: 4.5, z: -3.4, reach: 1.8, name: 'Gear Lockers (Firefighter)', label: 'WORK' });
  label(A, '\uD83D\uDE92 FIRE STATION 1', 0, 3.0, -5.6, 'rgba(185,28,28,.92)');
  // police
  A = room('police', 16, 11, tileTex('#e0e7ff', '#c7d2fe', 8, 5.5), '#dbeafe'); A.label = 'Police Station';
  counter(A, 0, -2.6, 4, 1, '#1e3a8a');
  { for (let i = 0; i < 8; i++) cyl(0.04, 2.6, '#6b7280', A.g, 4.2 + i * 0.5, 1.3, -2.2); box(4, 0.1, 0.1, '#6b7280', A.g, 5.95, 2.6, -2.2); obsB(A, 4, 8, -5.5, -2.1); }
  furnAt(A, 'computer', -5, -4.8, 0); furnAt(A, 'computer', -5, -1.5, 0);
  hot(A, { id: 'work', kind: 'work', career: 'police', x: 0, z: -1.4, reach: 1.8, name: 'Front Desk (Police)', label: 'WORK' });
  label(A, '\uD83D\uDE93 POLICE STATION', 0, 3.0, -5.1, 'rgba(30,58,138,.92)');
  // museum (look at the treasures \u2014 or plan a cartoon caper if you\u2019ve turned to crime)
  A = room('museum', 20, 13, tileTex('#f5f5f4', '#e7e5e4', 10, 6.5), '#fef3c7', { cam: { h: 10.5, d: 10 } }); A.label = 'Grokville Museum'; A.loot = {};
  { const pd = grp(A.g, -5, 0, -3.2); cyl(0.7, 1.0, '#e7e5e4', pd, 0, 0.5, 0); const gem = dyn(grp(A.g, -5, 1.45, -3.2)); const gm = mesh(G.sph, M('#3b82f6', { emissive: '#1d4ed8' }), gem, 0, 0, 0, 0.42, 0.42, 0.42); void gm; mesh(G.cone, M('#facc15', { emissive: '#a16207' }), gem, 0.9, -0.2, 0, 0.3, 0.3, 0.3);
    box(1.7, 1.2, 1.7, M('#bae6fd', { transparent: true, opacity: 0.35 }), A.g, -5, 1.6, -3.2); obsB(A, -5.9, -4.1, -4.1, -2.3); A.loot.gems = gem; }
  { const pd = grp(A.g, 5, 0, -3.2); box(2.4, 0.9, 1.4, '#a16207', pd, 0, 0.45, 0); const rel = dyn(grp(A.g, 5, 0.9, -3.2)); box(0.35, 0.5, 0.6, M('#facc15', { emissive: '#a16207' }), rel, -0.5, 0.35, 0); sph(0.16, M('#facc15', { emissive: '#a16207' }), rel, -0.5, 0.72, 0.25); ell(0.25, 0.34, 0.25, '#fef3c7', rel, 0.55, 0.3, 0); obsB(A, 3.7, 6.3, -4, -2.4); A.loot.relics = rel; }
  { const dino = grp(A.g, 0, 0, -5.2); for (let i = 0; i < 5; i++) sph(0.32 - i * 0.03, '#e7e5e4', dino, -1.4 + i * 0.6, 2.0 + Math.sin(i) * 0.3, 0); cyl(0.12, 1.8, '#e7e5e4', dino, -0.6, 0.9, 0); cyl(0.12, 1.8, '#e7e5e4', dino, 0.8, 0.9, 0); sph(0.45, '#e7e5e4', dino, 1.7, 2.6, 0); obsB(A, -2, 2.4, -5.8, -4.6); }
  [-7.5, 7.5].forEach((x) => { for (let i = 0; i < 3; i++) cyl(0.05, 0.9, '#a16207', A.g, x, 0.45, -1 + i); });
  { const gd = MD.avatar({ skin: GL.SKINS[2], hair: 'short', hc: '#4b5563', top: 'jacket', tc: '#1e3a8a', bc: '#1f2937', hat: 'police', gl: 'none' }); gd.g.position.set(7.6, 0, 3.2); gd.g.rotation.y = -Math.PI / 2; A.g.add(gd.g); furnAt(A, 'chair', 7.9, 3.2, -Math.PI / 2, 1, false); obsC(A, 7.6, 3.2, 0.5); label(A, '\uD83D\uDCA4 Guard Gus', 7.6, 2.5, 3.2, 'rgba(30,58,138,.9)'); }
  hot(A, { id: 'h_gems', kind: 'heist', heist: 'gems', x: -5, z: -1.6, reach: 1.8, name: 'Big Blue Gem', label: 'LOOK' });
  hot(A, { id: 'h_relics', kind: 'heist', heist: 'relics', x: 5, z: -1.6, reach: 1.8, name: 'Ancient Relics', label: 'LOOK' });
  hot(A, { id: 'dino', kind: 'exhibit', x: 0, z: -3.6, reach: 1.8, name: 'Dino Skeleton', label: 'LOOK' });
  label(A, '\uD83C\uDFDB\uFE0F GROKVILLE MUSEUM', 0, 3.0, -6.1, 'rgba(161,98,7,.92)');
  // jewelry store
  A = room('jewelry', 14, 10, carpetTex('#f5d0fe', 4, 3), '#fdf4ff'); A.label = 'Glitter & Gold'; A.loot = {};
  { counter(A, -3, -2.6, 4, 1, '#a21caf', '#bae6fd'); counter(A, 3, -2.6, 4, 1, '#a21caf', '#bae6fd'); const jw = dyn(grp(A.g, 0, 1.15, -2.6)); for (let i = 0; i < 10; i++) { const x = (i < 5 ? -4.6 : 1.4) + (i % 5) * 0.8; mesh(G.torus || G.sph, M(['#facc15', '#f472b6', '#e5e7eb', '#38bdf8'][i % 4], { emissive: '#713f12' }), jw, x, 0, 0, 0.14, 0.14, 0.14); } A.loot.jewels = jw; }
  { const jl = MD.avatar({ skin: GL.SKINS[4], hair: 'bun', hc: '#e5e7eb', top: 'suit', tc: '#a21caf', bc: '#1f2937', gl: 'round' }); jl.g.position.set(0, 0, -4.4); A.g.add(jl.g); obsC(A, 0, -4.4, 0.4); }
  hot(A, { id: 'h_jewels', kind: 'heist', heist: 'jewels', x: 0, z: -1.4, reach: 1.9, name: 'Jewelry Cases', label: 'LOOK' });
  label(A, '\uD83D\uDC8D GLITTER & GOLD', 0, 3.0, -4.6, 'rgba(162,28,175,.92)');
  // animal shelter
  A = room('shelter', 18, 12, tileTex('#ecfccb', '#d9f99d', 9, 6), '#f7fee7'); A.label = 'Animal Shelter'; A.kennels = [];
  for (let i = 0; i < 6; i++) { const x = -7.5 + i * 3, k = grp(A.g, x, 0, -4.6); box(2.6, 0.05, 2, '#d9f99d', k, 0, 0.03, 0); for (let j = 0; j < 6; j++) box(0.05, 1.1, 0.05, '#94a3b8', k, -1.3 + j * 0.52, 0.55, 1); box(2.6, 0.05, 0.05, '#94a3b8', k, 0, 1.1, 1); A.kennels.push([x, -4.8]); }
  obsB(A, -9, 9, -6, -3.5); A.petsG = dyn(grp(A.g));
  counter(A, -4, -0.6, 3.4, 1, '#65a30d'); counter(A, 4.5, -0.6, 3, 1, '#f59e0b');
  { const st = MD.avatar({ skin: GL.SKINS[1], hair: 'ponytail', hc: '#a16207', top: 'jacket', tc: '#65a30d', bc: '#1f2937', hat: 'cap', hatc: '#f59e0b' }); st.g.position.set(-4, 0, -1.6); A.g.add(st.g); }
  hot(A, { id: 'adopt', kind: 'shelter', x: -4, z: 0.6, reach: 1.8, name: 'Adopt a Rescue', label: 'ADOPT' });
  hot(A, { id: 'lost', kind: 'lostfound', x: 4.5, z: 0.6, reach: 1.8, name: 'Lost & Found Pets', label: 'LOST PETS' });
  { const vk = hot(A, { id: 'work', kind: 'work', career: 'animalcontrol', x: 7.2, z: 2.6, reach: 1.7, name: 'Van Keys (Animal Control)', label: 'START SHIFT' }); marker(A, vk, '\uD83D\uDD11 START SHIFT', 'rgba(77,124,15,.92)', 2.2); }
  label(A, '\uD83D\uDC36 GROKVILLE ANIMAL SHELTER', 0, 3.0, -5.6, 'rgba(101,163,13,.92)');
  // clinic
  A = room('clinic', 16, 11, tileTex('#f0fdfa', '#ccfbf1', 8, 5.5), '#ecfeff'); A.label = 'Maple Clinic';
  counter(A, -3, -2.8, 3.4, 1, '#0891b2'); counter(A, 4.6, -3.4, 3, 1, '#16a34a'); shelfUnit(A, 4.6, -5.0, 3, 0, ['#f472b6', '#38bdf8', '#facc15', '#22c55e']);
  { const bd = furnAt(A, 'bed', -6.4, -3.2, 0, 0.9); void bd; box(0.05, 2.2, 3, '#a5f3fc', A.g, -5.2, 1.1, -3.6); }
  [-2, -1, 0, 1].forEach((x, i) => { furnAt(A, 'chair', x * 1.1 - 1, 2.6, Math.PI, 1, false); seatHot(A, 'wait' + i, x * 1.1 - 1, 2.6, Math.PI, 'Waiting Room Chair'); }); obsB(A, -3.6, 0.6, 2.25, 2.95);
  { const nr = MD.avatar({ skin: GL.SKINS[5], hair: 'bun', hc: '#1f2937', top: 'coat', tc: '#f8fafc', bc: '#0891b2' }); nr.g.position.set(-3, 0, -3.8); A.g.add(nr.g); }
  hot(A, { id: 'checkin', kind: 'checkin', x: -3, z: -1.6, reach: 1.8, name: 'Front Desk', label: 'CHECK IN' });
  hot(A, { id: 'pharm', kind: 'shop', shop: 'pharm', x: 4.6, z: -2.2, reach: 1.8, name: 'Pharmacy', label: 'PHARMACY' });
  label(A, '\uD83E\uDE7A MAPLE CLINIC', 0, 3.0, -5.1, 'rgba(8,145,178,.92)');
  // pawn shop
  A = room('pawn', 14, 10, woodTex('#a8a29e', '#9a948f', 5, 4), '#e7e5e4'); A.label = 'Sid\u2019s Pawn & Stuff';
  counter(A, 0, -2.6, 5, 1, '#44403c', '#a8a29e'); shelfUnit(A, -4.5, -4.6, 4, 0, ['#f59e0b', '#94a3b8', '#ef4444', '#22c55e']); shelfUnit(A, 4.5, -4.6, 4, 0, ['#a16207', '#64748b', '#fde047']);
  { const sid = MD.avatar({ skin: GL.SKINS[2], hair: 'short', hc: '#1f2937', top: 'jacket', tc: '#57534e', bc: '#1f2937', hat: 'cowboy', hatc: '#1f2937', gl: 'shades' }); sid.g.position.set(0, 0, -3.7); A.g.add(sid.g); }
  hot(A, { id: 'fence', kind: 'fence', x: 0, z: -1.4, reach: 1.9, name: 'Shady Sid', label: 'TALK' });
  label(A, '\uD83C\uDFA9 SID\u2019S PAWN & STUFF', 0, 3.0, -4.6, 'rgba(68,64,60,.92)');
  // Byte Buy tech store (normal shop; a heist target when the crime path is on)
  A = room('tech', 14, 10, tileTex('#eef2ff', '#e0e7ff', 7, 5), '#eef2ff'); A.label = 'Byte Buy'; A.loot = {};
  { counter(A, 3.5, -2.4, 4.5, 1, '#4338ca', '#c7d2fe'); const wall = grp(A.g, -3, 0, -4.7); box(5.2, 2.4, 0.2, '#1e1b4b', wall, 0, 1.6, 0);
    const scr = ['#38bdf8', '#f472b6', '#facc15', '#22c55e', '#a78bfa', '#fb923c']; for (let i = 0; i < 6; i++) { const x = -1.8 + (i % 3) * 1.8, y = i < 3 ? 2.2 : 1.2; box(1.5, 0.8, 0.06, '#0f172a', wall, x, y, 0.14); box(1.36, 0.66, 0.02, M(scr[i], { emissive: MD.shade(scr[i], -0.5) }), wall, x, y, 0.18); }
    box(5.2, 0.9, 0.9, '#c7d2fe', A.g, -3, 0.45, -3.4); const gad = dyn(grp(A.g, -3, 0, -3.4)); [['#111827', -1.8], ['#9ca3af', -0.6], ['#f8fafc', 0.6], ['#111827', 1.8]].forEach((q, i) => { box(i % 2 ? 0.7 : 0.35, i % 2 ? 0.05 : 0.6, i % 2 ? 0.5 : 0.05, q[0], gad, q[1], 1.0 + (i % 2 ? 0 : 0.3), 0); }); A.loot.tech = gad; obsB(A, -5.7, -0.3, -5, -2.9); }
  { const tc = MD.avatar({ skin: GL.SKINS[2], hair: 'short', hc: '#111827', top: 'tee', tc: '#4338ca', bc: '#1f2937', gl: 'round' }); tc.g.position.set(3.5, 0, -3.5); A.g.add(tc.g); }
  hot(A, { id: 'buy', kind: 'shop', shop: 'tech', x: 3.5, z: -1.2, reach: 1.9, name: 'Tech Counter', label: 'SHOP' });
  hot(A, { id: 'h_tech', kind: 'heist', heist: 'tech', x: -3, z: -2.1, reach: 1.9, name: 'Gadget Wall', label: 'LOOK' });
  label(A, '\uD83D\uDCBB BYTE BUY TECH', 0, 3.0, -4.6, 'rgba(67,56,202,.92)');
  // Honest Hank's Auto Care (the helpful mechanic)
  A = room('hanks', 14, 10, tileTex('#e0f2fe', '#bae6fd', 7, 5), '#eff6ff'); A.label = 'Honest Hank\u2019s';
  { const lift = grp(A.g, 3.2, 0, -2.4); box(0.35, 1.1, 0.35, '#facc15', lift, -1.1, 0.55, 0); box(0.35, 1.1, 0.35, '#facc15', lift, 1.1, 0.55, 0); box(2.6, 0.14, 4, '#ca8a04', lift, 0, 1.1, 0); const car = MD.car('sedan', '#22c55e'); car.g.position.y = 1.17; lift.add(car.g); obsB(A, 1.8, 4.6, -4.6, -0.3); }
  counter(A, -3.5, -2.6, 4, 1, '#1d4ed8'); shelfUnit(A, -3.5, -4.4, 4, 0, ['#ef4444', '#facc15', '#22c55e', '#38bdf8']);
  { const hk = MD.avatar({ skin: GL.SKINS[3], hair: 'short', hc: '#9ca3af', top: 'overalls', tc: '#1d4ed8', bc: '#1e3a8a', hat: 'cap', hatc: '#1d4ed8', gl: 'round' }); hk.g.position.set(-3.5, 0, -3.6); A.g.add(hk.g); }
  { const tb = signPlane('TIP: Slow down = fewer bonks!', 3.2, 0.7, '#0f766e'); tb.position.set(-3.5, 2.6, -4.88); A.g.add(tb); }
  hot(A, { id: 'mech', kind: 'mech', shop: 'hank', x: -3.5, z: -1.4, reach: 1.9, name: 'Hank (helpful mechanic)', label: 'REPAIR' });
  label(A, '\uD83D\uDEE0\uFE0F HONEST HANK\u2019S AUTO CARE', 0, 3.0, -4.6, 'rgba(29,78,216,.92)');
  // Sketchy Steve's Fix-It-Quik (the not-so-helpful mechanic)
  A = room('steves', 14, 10, woodTex('#a8a29e', '#8b8580', 5, 4), '#fef3c7'); A.label = 'Sketchy Steve\u2019s';
  { const car = MD.car('compact', '#a16207'); car.g.position.set(3.4, 0.35, -2.4); car.g.rotation.z = 0.08; A.g.add(car.g); [-1, 1].forEach((s) => box(0.5, 0.35, 0.5, '#78716c', A.g, 3.4 + s * 0.7, 0.17, -2.4 - 1.2)); [-1, 1].forEach((s) => box(0.5, 0.35, 0.5, '#78716c', A.g, 3.4 + s * 0.7, 0.17, -2.4 + 1.2)); obsB(A, 2.3, 4.5, -4.4, -0.4);
    for (let i = 0; i < 4; i++) cyl(0.4, 0.26, '#1f2937', A.g, -6, 0.13 + i * 0.27, 3.4 - (i % 2) * 0.1); obsC(A, -6, 3.4, 0.45); box(0.6, 0.6, 0.6, '#9ca3af', A.g, 5.8, 0.3, 3.6); }
  counter(A, -3, -2.6, 4, 1, '#78350f', '#d6d3d1');
  { const st = MD.avatar({ skin: GL.SKINS[1], hair: 'long', hc: '#a16207', top: 'tee', tc: '#f97316', bc: '#1f2937', hat: 'cap', hatc: '#78350f', gl: 'shades' }); st.g.position.set(-3, 0, -3.6); A.g.add(st.g); }
  { const tb = signPlane('NO REFUNDS \u00b7 NO PROBLEMS', 3.4, 0.7, '#b45309'); tb.position.set(-3, 2.6, -4.88); A.g.add(tb); }
  hot(A, { id: 'mech', kind: 'mech', shop: 'steve', x: -3, z: -1.4, reach: 1.9, name: 'Steve (not-so-helpful mechanic)', label: 'REPAIR' });
  label(A, '\uD83E\uDE9B SKETCHY STEVE\u2019S FIX-IT-QUIK', 0, 3.0, -4.6, 'rgba(120,53,15,.92)');
  // bank vault + hospital billing / ER (extras)
  { const B = W.areas.bank; A = B; const vd = dyn(grp(B.g, 4.5, 1.6, -4.7)); B.loot = { vault: vd }; for (let i = 0; i < 3; i++) box(0.5, 0.2, 0.25, M('#facc15', { emissive: '#a16207' }), vd, -0.6 + i * 0.6, -1.3, 0.2);
    hot(B, { id: 'h_vault', kind: 'heist', heist: 'vault', x: 5.6, z: -3.7, reach: 1.7, name: 'Bank Vault', label: 'LOOK' }); }
  { const Hs = W.areas.hospital; counter(Hs, -6, -4.4, 2.6, 1, '#dc2626'); hot(Hs, { id: 'billing', kind: 'billing', x: -6, z: -3.2, reach: 1.7, name: 'Billing Desk', label: 'BILLS' }); Hs.erBed = [7.3, 0]; }
  // wet floor at Fresh Mart (slippery!)
  { const Gm = W.areas.grocery; const pz = cyl(0.9, 0.02, M('#7dd3fc', { transparent: true, opacity: 0.6 }), Gm.g, 0.5, 0.02, 2.6); void pz; const sg = grp(Gm.g, 1.6, 0, 2.2); const a = box(0.5, 0.8, 0.04, '#facc15', sg, 0, 0.4, 0.12); a.rotation.x = 0.25; const b2 = box(0.5, 0.8, 0.04, '#facc15', sg, 0, 0.4, -0.12); b2.rotation.x = -0.25; Gm.wet = [[0.5, 2.6, 1.0]]; label(Gm, '\u26A0\uFE0F WET FLOOR', 1.6, 1.3, 2.2, 'rgba(202,138,4,.92)'); }
  // neighbours' homes
  const NH = {
    gladys: { wall: '#ede9fe', floor: 'purple', items: [['bed', -4.5, -3.3, 0], ['armchair', 2, -3.6, 0], ['tv', 2, -0.6, Math.PI], ['bookshelf', -1, -4.3, 0], ['plant', 5.8, -4.0, 0], ['painting', 4.5, -4.5, 0], ['rug', 2, -2.2, 0]] },
    rosa: { wall: '#fef3c7', floor: 'wood', items: [['sofa', 2, -3.8, 0], ['table', -3.5, 0, 0], ['chair', -4.7, 0, Math.PI / 2], ['stove', -4.5, -4.2, 0], ['fridge', -2.8, -4.2, 0], ['petbed', 4.5, 1.5, 0], ['plant', 5.8, -4, 0], ['rug', 2, -1.5, 0]] },
    grumble: { wall: '#d6d3d1', floor: 'dark', items: [['armchair', -3, -3.5, 0], ['tv', -3, -0.8, Math.PI], ['petbed', 3, -3.5, 0], ['bookshelf', 2.5, -4.4, 0], ['lamp', -5.2, -4, 0], ['painting', 5, -4.5, 0]] },
    joe: { wall: '#dcfce7', floor: 'green', items: [['armchair', -3, -3.5, 0.3], ['fireplace', 2, -4.4, 0], ['bookshelf', -0.5, -4.4, 0], ['aquarium', 5, -1.5, -Math.PI / 2], ['rug', 1.5, -2, 0], ['plant', -5.8, -4, 0]] }
  };
  Object.keys(NH).forEach((id) => { const h = NH[id]; A = room('nh_' + id, 14, 10, W.floorTex(h.floor, 14, 10), h.wall); A.label = NPC_LOTS[Object.keys(NPC_LOTS).find((k) => NPC_LOTS[k].npc === id)].name + '\u2019s House'; A.npcHome = id; h.items.forEach((q) => furnAt(A, q[0], q[1], q[2], q[3], 1, q[0] !== 'rug')); });
  { const A2 = W.areas.nh_grumble; const ks = signPlane('NO VISITORS (mostly)', 2.6, 0.5, '#dc2626'); ks.position.set(-1, 2.4, -4.83); A2.g.add(ks); }
  { const A2 = W.areas.nh_gladys; const bn = grp(A2.g, 5.5, 0, 2); box(0.12, 0.12, 0.3, '#111827', bn, -0.1, 1.5, 0); box(0.12, 0.12, 0.3, '#111827', bn, 0.1, 1.5, 0); cyl(0.04, 1.4, '#78350f', bn, 0, 0.7, 0); }
  ['grocery', 'boutique', 'cafe', 'bank', 'cityhall', 'furniture', 'petstore', 'hospital', 'school', 'garage', 'dealer', 'fire', 'police', 'museum', 'jewelry', 'shelter', 'clinic', 'pawn', 'tech', 'hanks', 'steves', 'nh_gladys', 'nh_rosa', 'nh_grumble', 'nh_joe'].forEach((id) => { const a = W.areas[id]; const b = W.bld(id); a.exitTo = b ? b.out : null; if (id.indexOf('nh_') === 0) { const li = +Object.keys(NPC_LOTS).find((k) => NPC_LOTS[k].npc === id.slice(3)); a.exitTo = [GL.LOTS[li] - 1.5, 58.4]; } bake(a.g); });
}

/* ---------------- player homes ---------------- */
W.homeArea = function (key, home) {
  const id = 'h_' + key, H = GL.HOUSES[home.type] || GL.HOUSES.apt;
  let A = W.areas[id];
  if (A && A.htype !== home.type) { W.scene.remove(A.g); delete W.areas[id]; A = null; }
  if (!A) {
    A = room(id, H.w, H.d, W.floorTex(home.floor || 'wood', H.w, H.d), GL.WALLS[home.wall || 0], { cam: { h: 9.5 + H.w * 0.08, d: 9 + H.w * 0.06 } });
    A.htype = home.type; A.homeKey = key; A.furn = dyn(grp(A.g)); A.label = (home.owner ? home.owner + '\u2019s ' : '') + H.name;
    bake(A.g); A.floorId = home.floor || 'wood'; A.wallId = home.wall || 0;
  }
  if ((home.floor || 'wood') !== A.floorId) { A.floorId = home.floor || 'wood'; A.floorMesh.material.map = W.floorTex(A.floorId, H.w, H.d); A.floorMesh.material.needsUpdate = true; }
  if ((home.wall || 0) !== A.wallId) { A.wallId = home.wall || 0; A.wallMat.color.set(GL.WALLS[A.wallId]); A.wallMat2.color.set(MD.shade(GL.WALLS[A.wallId], -0.08)); }
  A.label = (home.owner ? home.owner + '\u2019s ' : '') + H.name; A.owner = home.owner; A.ownerPid = home.pid;
  const lk = JSON.stringify(home.layout || []);
  if (lk !== A.layoutKey) { A.layoutKey = lk; W.placeHome(A, home.layout || []); }
  return A;
};
W.placeHome = function (A, layout) {
  while (A.furn.children.length) A.furn.remove(A.furn.children[0]);
  A.obs = A.obs.filter((o) => o.tag !== 'furn'); A.grid = null; A.furnMeshes = []; A.hots = A.hots.filter((h) => h.kind !== 'furn');
  (layout || []).forEach((f, i) => {
    const it = GL.FURN[f.id]; if (!it) return;
    const m = MD.furn(f.id, f.c); m.position.set(f.x, 0, f.z); m.rotation.y = (f.r || 0) * Math.PI / 2; m.userData.fi = i; A.furn.add(m); A.furnMeshes.push(m);
    const sw = (f.r || 0) % 2 ? it.d : it.w, sd = (f.r || 0) % 2 ? it.w : it.d;
    if (it.solid) obsB(A, f.x - sw / 2, f.x + sw / 2, f.z - sd / 2, f.z + sd / 2, 'furn');
    if (it.use) { // hot spot in front of the item
      const yaw = (f.r || 0) * Math.PI / 2, fx = Math.sin(yaw), fz = Math.cos(yaw), off = ((f.r || 0) % 2 ? sw : sd) / 2 + 0.55;
      const lbl = { sleep: 'SLEEP', cook: 'COOK', fridge: 'SNACK', shower: 'SHOWER', bath: 'BATH', sit: 'SIT', eat: 'EAT', tv: 'WATCH', game: 'PLAY', computer: 'USE', read: 'READ', wardrobe: 'CHANGE', piano: 'PLAY', petbed: 'PETS', look: 'LOOK' }[it.use] || 'USE';
      A.hots.push({ id: 'f' + i, kind: 'furn', use: it.use, fid: f.id, fi: i, x: f.x + fx * off, z: f.z + fz * off, fx: f.x, fz: f.z, yaw, reach: 1.3, h: 1.6, name: it.name, label: lbl });
    }
  });
};
W.canPlace = function (A, id, x, z, r, layout, skip, px, pz) {
  const it = GL.FURN[id], sw = r % 2 ? it.d : it.w, sd = r % 2 ? it.w : it.d, hw = A.w / 2 - 0.1, hd = A.d / 2 - 0.1;
  if (x - sw / 2 < -hw || x + sw / 2 > hw || z - sd / 2 < -hd || z + sd / 2 > hd) return false;
  if (z + sd / 2 > A.d / 2 - 1.6 && Math.abs(x) < 1.6 + sw / 2) return false; // keep the exit clear
  if (!it.flat && px != null && Math.abs(px - x) < sw / 2 + 0.4 && Math.abs(pz - z) < sd / 2 + 0.4) return false;
  for (let i = 0; i < layout.length; i++) {
    if (i === skip) continue; const f = layout[i], o = GL.FURN[f.id]; if (!o) continue;
    if (!!o.flat !== !!it.flat) continue;
    const ow = f.r % 2 ? o.d : o.w, od = f.r % 2 ? o.w : o.d;
    if (Math.abs(f.x - x) < (ow + sw) / 2 - 0.05 && Math.abs(f.z - z) < (od + sd) / 2 - 0.05) return false;
  }
  return true;
};
// default furniture layout for a new home of this type (starter furniture)
W.defaultLayout = function (type) {
  const H = GL.HOUSES[type] || GL.HOUSES.apt, w = H.w / 2, d = H.d / 2;
  return [{ id: 'bed', x: -w + 1.2, z: -d + 1.4, r: 0 }, { id: 'stove', x: w - 1, z: -d + 0.65, r: 0 }, { id: 'shower', x: w - 2.8, z: -d + 0.85, r: 0 }, { id: 'wardrobe', x: -w + 3.4, z: -d + 0.55, r: 0 },
    { id: 'armchair', x: -1.2, z: -d + 1.2, r: 0 }, { id: 'table', x: w - 1.6, z: 0.6, r: 0 }, { id: 'chair', x: w - 3.0, z: 0.6, r: 1 }];
};

/* ---------------- pedestrian navigation graph ---------------- */
function buildNav() {
  const A = W.areas.town, nodes = [], adj = [];
  const add = (x, z, poi) => { nodes.push({ x, z, poi }); adj.push([]); return nodes.length - 1; };
  const link = (a, b, cross) => { const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z); adj[a].push({ j: b, d, cross }); adj[b].push({ j: a, d, cross }); };
  const C = {};
  const has = (X, Z, dx, dz) => Math.abs(X + dx * 48) <= 48 && Math.abs(Z + dz * 48) <= 48;
  R.forEach((X) => R.forEach((Z) => [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { C[X + ',' + Z + ',' + sx + ',' + sz] = add(X + sx * 5.5, Z + sz * 5.5); }))));
  R.forEach((X) => R.forEach((Z) => {
    [-1, 1].forEach((s) => {
      // along the sidewalks to the next intersection
      if (X + 48 <= 48) link(C[X + ',' + Z + ',1,' + s], C[(X + 48) + ',' + Z + ',-1,' + s]);
      if (Z + 48 <= 48) link(C[X + ',' + Z + ',' + s + ',1'], C[X + ',' + (Z + 48) + ',' + s + ',-1']);
      // around the corner: crosswalk if a road arm is there
      link(C[X + ',' + Z + ',-1,' + s], C[X + ',' + Z + ',1,' + s], has(X, Z, 0, s));
      link(C[X + ',' + Z + ',' + s + ',-1'], C[X + ',' + Z + ',' + s + ',1'], has(X, Z, s, 0));
    });
  }));
  const ncorner = nodes.length;
  W.navNodes = nodes; W.navAdj = adj; W.navCorner = ncorner;
  const pois = [];
  BLD.forEach((b) => { if (b.out) pois.push(b.out); });
  W.aptDoors.forEach((h) => pois.push([h.x, h.z + 0.4]));
  W.lots.forEach((L) => pois.push([L.x - 1.5, 57.8]));
  [[-24, 9], [-24, 21], [-30, 14.5], [-31, 31.5], [-15, 27.5], [-24, 38], [-12, 24], [-36, 24]].forEach((p) => pois.push(p));
  pois.forEach((p) => {
    const f = W.freeNear(A, p[0], p[1], 0.35), i = add(f[0], f[1], true);
    const cand = nodes.map((n, j) => ({ j, d: Math.hypot(n.x - f[0], n.z - f[1]) })).filter((c) => c.j !== i).sort((a, b) => a.d - b.d);
    let k = 0; for (const c of cand) { if (k >= 4 || c.d > 60) break; if (W.los(A, f[0], f[1], nodes[c.j].x, nodes[c.j].z, 0.3, true)) { link(i, c.j); k++; } }
  });
}
W.navPath = function (x0, z0, x1, z1) {
  const A = W.areas.town, nodes = W.navNodes, adj = W.navAdj;
  if (Math.hypot(x1 - x0, z1 - z0) < 40 && W.los(A, x0, z0, x1, z1, 0.3, true)) return [[x1, z1]];
  const near = (x, z) => nodes.map((n, j) => ({ j, d: Math.hypot(n.x - x, n.z - z) })).sort((a, b) => a.d - b.d).slice(0, 8).filter((c) => W.los(A, x, z, nodes[c.j].x, nodes[c.j].z, 0.3, true)).slice(0, 4);
  let s = near(x0, z0), e = near(x1, z1);
  if (!s.length) s = nodes.map((n, j) => ({ j, d: Math.hypot(n.x - x0, n.z - z0) })).sort((a, b) => a.d - b.d).slice(0, 1);
  if (!e.length) e = nodes.map((n, j) => ({ j, d: Math.hypot(n.x - x1, n.z - z1) })).sort((a, b) => a.d - b.d).slice(0, 1);
  const N = nodes.length, dist = new Float64Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  s.forEach((c) => { dist[c.j] = c.d; });
  const endD = {}; e.forEach((c) => { endD[c.j] = c.d; });
  for (;;) {
    let u = -1, bd = 1e9; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
    if (u < 0) break; done[u] = 1;
    for (const ed of adj[u]) { const nd = dist[u] + ed.d; if (nd < dist[ed.j]) { dist[ed.j] = nd; prev[ed.j] = u; } }
  }
  let best = -1, bt = 1e9; for (const k in endD) { const t = dist[k] + endD[k]; if (t < bt) { bt = t; best = +k; } }
  if (best < 0) return [[x1, z1]];
  const out = [[x1, z1]]; let u = best; while (u >= 0) { out.push([nodes[u].x, nodes[u].z]); u = prev[u]; }
  return out.reverse();
};

/* ---------------- road network (traffic + chases) ---------------- */
W.roadNodes = []; R.forEach((X) => R.forEach((Z) => W.roadNodes.push({ x: X, z: Z })));
W.roadNbrs = function (i) { const n = W.roadNodes[i], out = []; W.roadNodes.forEach((m, j) => { if (j !== i && ((m.x === n.x && Math.abs(m.z - n.z) === 48) || (m.z === n.z && Math.abs(m.x - n.x) === 48))) out.push(j); }); return out; };
W.nearestRoadNode = function (x, z) { let b = 0, bd = 1e9; W.roadNodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; b = i; } }); return b; };
// fire spots: building fronts
W.fireSpots = function () { const out = BLD.filter((b) => b.out && b.id !== 'fire').map((b) => ({ id: b.id, name: b.name, x: b.out[0] + 2.5, z: b.out[1] + (b.door === 'n' ? 0.4 : -0.4), fz: b.door === 'n' ? b.z0 : b.z1 })); W.lots.forEach((L) => out.push({ id: 'lot' + L.i, name: L.hot.name, x: L.x - 1.5, z: 58.2, fz: 60 })); return out; };

/* ---------------- build all ---------------- */
W.build = function () {
  buildTown(); buildInteriors();
  bake(W.areas.town.g);
  buildNav();
};

/* ---------------- camera ---------------- */
W.updateCamera = function (x, z, dt, snap) {
  const A = W.cur, c = W.camera;
  if (W.camOverride) { const o = W.camOverride; const k = snap ? 1 : 1 - Math.exp(-dt * 6); W.camPos.lerp(o.pos, k); W.camLook.lerp(o.look, k); c.position.copy(W.camPos); c.lookAt(W.camLook); return; }
  const pf = c.aspect < 0.8 ? 1.22 : 1, zm = A.outdoor ? W.camZoom : 1, h = A.cam.h * pf * zm, d = A.cam.d * pf * zm;
  let tx = x + (A.outdoor ? W.camAhead[0] : 0), tz = z + (A.outdoor ? W.camAhead[1] : 0);
  if (A.w) { tx = GL.clamp(x, -Math.max(0, A.w / 2 - 4), Math.max(0, A.w / 2 - 4)); tz = Math.min(z, A.d / 2 - 2.5); }
  const uz = W.camUZ || 1, tl = W.camTilt || 1; let yw = W.camYaw || 0; if (!A.outdoor) yw = GL.clamp(yw, -0.5, 0.5);
  const hh = h * uz * tl, dd = d * uz / Math.sqrt(tl), sy = Math.sin(yw), cy = Math.cos(yw);
  const want = new T.Vector3(tx + sy * dd, hh, tz + cy * dd), look = new T.Vector3(tx - sy * 0.5, 0.6, tz - cy * 0.5);
  const k = snap ? 1 : 1 - Math.exp(-dt * 5);
  W.camPos.lerp(want, k); W.camLook.lerp(look, k); c.position.copy(W.camPos); c.lookAt(W.camLook);
};

/* ---------------- picking ---------------- */
const v2 = new T.Vector2();
W.rayPlane = function (sx, sy, y) { v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); W.ray.setFromCamera(v2, W.camera); const p = new T.Plane(new T.Vector3(0, 1, 0), -(y || 0)), out = new T.Vector3(); return W.ray.ray.intersectPlane(p, out) ? out : null; };
W.hitObj = function (sx, sy, obj) { v2.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); W.ray.setFromCamera(v2, W.camera); const h = W.ray.intersectObject(obj, true).filter((q) => !q.object.isSprite && !q.object.userData.noHit && q.object.visible); return h.length ? h[0] : null; };
W.project = function (x, y, z) { const v = new T.Vector3(x, y, z).project(W.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, vis: v.z < 1 && v.z > -1 }; };

/* ---------------- fx sprites ---------------- */
const fxTex = {};
function fxTexture(kind) {
  if (fxTex[kind]) return fxTex[kind];
  const t = canvasTex(64, 64, (g) => {
    g.translate(32, 32);
    if (kind === 'heart') { g.fillStyle = '#ff4f8b'; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-34, -2, -18, -30, 0, -12); g.bezierCurveTo(18, -30, 34, -2, 0, 22); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); }
    else if (kind === 'bubble') { g.fillStyle = 'rgba(200,240,255,.5)'; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -8, 6, 0, TAU); g.fill(); }
    else if (kind === 'sparkle' || kind === 'star') { g.fillStyle = kind === 'star' ? '#ffd23f' : '#fff7ae'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 9 : 28; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }
    else if (kind === 'zzz') { g.fillStyle = '#c7d2fe'; g.font = '900 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = '#312e81'; g.lineWidth = 6; g.strokeText('Z', 0, 0); g.fillText('Z', 0, 0); }
    else if (kind === 'coin') { g.fillStyle = '#facc15'; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill(); g.strokeStyle = '#a16207'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#a16207'; g.font = '900 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 2); }
    else if (kind === 'note') { g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(-6, 14, 10, 0, TAU); g.fill(); g.fillRect(2, -22, 6, 38); g.fillRect(2, -22, 18, 8); }
    else if (kind === 'dust' || kind === 'smoke') { g.fillStyle = kind === 'smoke' ? 'rgba(120,120,130,.75)' : 'rgba(214,180,120,.85)'; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill(); }
    else if (kind === 'drop' || kind === 'water') { g.fillStyle = '#7dd3fc'; g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(20, 6, 0, 22); g.quadraticCurveTo(-20, 6, 0, -24); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
    else if (kind === 'fire') { const gr = g.createRadialGradient(0, 8, 2, 0, 0, 28); gr.addColorStop(0, '#fef08a'); gr.addColorStop(0.45, '#f97316'); gr.addColorStop(1, 'rgba(220,38,38,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(26, 0, 14, 22); g.quadraticCurveTo(0, 30, -14, 22); g.quadraticCurveTo(-26, 0, 0, -30); g.fill(); }
  });
  t.minFilter = T.LinearFilter; fxTex[kind] = t; return t;
}
W.fxTexture = fxTexture;
W.fx = function (kind, x, y, z, n, spread, vel) {
  n = n || 1; spread = spread == null ? 0.4 : spread;
  for (let i = 0; i < n; i++) {
    if (W.fxList.length > 140) { const o = W.fxList.shift(); W.scene.remove(o.s); o.s.material.dispose(); }
    const s = new T.Sprite(new T.SpriteMaterial({ map: fxTexture(kind), transparent: true, depthWrite: false })); s.renderOrder = 15;
    const sz = kind === 'zzz' ? 0.35 : kind === 'smoke' ? 0.9 : kind === 'fire' ? 1.1 : kind === 'dust' ? 0.4 : 0.3; s.scale.set(sz, sz, 1);
    s.position.set(x + (Math.random() - 0.5) * spread, y + Math.random() * spread * 0.5, z + (Math.random() - 0.5) * spread);
    W.scene.add(s);
    const up = kind === 'dust' ? 0.6 : kind === 'drop' ? -1.5 : kind === 'smoke' ? 1.6 : kind === 'fire' ? 1.4 : 1.1;
    const f = { s, t: 0, life: kind === 'zzz' ? 1.6 : kind === 'smoke' ? 1.8 : kind === 'water' ? 0.7 : 1.1, vx: (Math.random() - 0.5) * 0.6, vy: up * (0.7 + Math.random() * 0.6), vz: (Math.random() - 0.5) * 0.6, sz, kind };
    if (vel) { f.vx = vel[0] + (Math.random() - 0.5) * 1.2; f.vy = vel[1] + (Math.random() - 0.5) * 0.6; f.vz = vel[2] + (Math.random() - 0.5) * 1.2; f.grav = 9; }
    W.fxList.push(f);
  }
};
W.tickFx = function (dt) {
  W.time += dt;
  for (let i = W.fxList.length - 1; i >= 0; i--) {
    const f = W.fxList[i]; f.t += dt;
    if (f.t >= f.life) { W.scene.remove(f.s); f.s.material.dispose(); W.fxList.splice(i, 1); continue; }
    if (f.grav) f.vy -= f.grav * dt;
    f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt;
    if (f.kind === 'zzz') f.s.position.x += Math.sin(f.t * 4) * dt * 0.3;
    const k = f.t / f.life; f.s.material.opacity = k > 0.6 ? (1 - k) / 0.4 : 1; const sc = f.sz * (f.kind === 'bubble' || f.kind === 'smoke' ? 0.7 + k * 0.8 : 1); f.s.scale.set(sc, sc, 1);
  }
  if (W.cur && W.cur.id === 'town') {
    if (W.fountainWater) W.fountainWater.rotation.y += dt * 0.5;
    if (W.ducks) W.ducks.forEach((d, i) => { const a = W.time * 0.25 + i * 2.1; d.position.set(-15 + Math.cos(a) * 3.2, 0.12 + Math.sin(W.time * 3 + i) * 0.02, 33 + Math.sin(a) * 1.9); d.rotation.y = -a; });
    if (W.swings) W.swings.userData.seats.forEach((s, i) => { s.rotation.x = Math.sin(W.time * 1.6 + i * 1.3) * (W.swingT && W.swingT[i] > 0 ? 0.7 : 0.08); });
    if (W.seesaw) W.seesaw.userData.board.rotation.z = Math.sin(W.time * 1.2) * (W.seesawT > 0 ? 0.25 : 0.05);
  }
  if (W.cur && W.cur.disp) W.cur.disp.forEach((d, i) => { d.rotation.y += dt * 0.25 * (i % 2 ? 1 : -1); });
};
})();
